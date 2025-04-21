import { openai } from "@ai-sdk/openai";
import { generateObject, tool } from "ai";
import { z } from "zod";
import { agentService, contextService, taskService } from "../../services";
import { Agent, Task } from "../../types/database";
import { JobResponse } from "../utils";
import { BaseAsyncJobTool, ToolResult, toolRegistry } from "./baseTool";

const outlineSystemPrompt = (agent: Agent, tasks: Task[]) => `
You are a research paper writer, tasked with outlining a research paper based on the following goal and tasks:

<Goal>
${agent.goal}
</Goal>

<Tasks>
${tasks
  .map((task) => `<${task.title}> \n${task.description}</${task.title}>`)
  .join("\n")}
</Tasks>

<Instructions>
  Outline a research paper based on the tasks and the full context of the tasks. If you think there's not enough information in a section, mark it as false.

  Your research paper outline should look like this, where the number of sections and subSections is based on the depth of the research paper:

  {
    "title": "Research Paper Title",
    "sections": [
      {
        "title": "Section Title",
        "description": "Section Description",
        "enoughInformation": true,
        "subSections": [
          {
            "title": "SubSection Title",
            "description": "SubSection Description",
            "enoughInformation": true,
          },
        ]
      },
    ]
  }

Your primary goal is quality. If you think there's not enough information in a section, mark it as false. Be picky. If you think there need to be more sections or subsections, add them and mark them as needing information.

The user will give you all of their research and notes. Use this to write the outline.
</Instructions>`;

const introPrompt = (markdown: string, reportTitle: string) => `
<ResearchBody>
${markdown}
</ResearchBody>

Write an overall introduction for the research paper titled "${reportTitle}".
`;

const conclusionPrompt = (markdown: string, reportTitle: string) => `
<ResearchBody>
${markdown}
</ResearchBody>

Write a conclusion for the research paper titled "${reportTitle}".
`;

const citationsPrompt = (markdown: string) => `
Here is the research paper body:
<ResearchBody>
${markdown}
</ResearchBody>

Write citations for the research paper. Use the following format:

[1](url of the source) Title of the source
[2](url of the source) Title of the source
[3](url of the source) Title of the source
`;

const sectionPrompt = (
  allData: string,
  reportOutline: any,
  sectionTitle: string,
  sectionDescription: string,
  writtenSubSections: any[]
) => `
<Research Data>
${allData}
</Research Data>

<Research Paper Outline>
${JSON.stringify(reportOutline, null, 2)}
</Research Paper Outline>

Write the header section for the following section:
Title: ${sectionTitle}
Description: ${sectionDescription}
SubSections contained within this section: 
<SubSections>
${writtenSubSections.map((r) => r.object.subSectionContent).join(", ")}
</SubSections>

Be concise and formal.
`;

const subSectionPrompt = (
  allData: string,
  reportOutline: any,
  subSectionTitle: string,
  subSectionDescription: string,
  researchDepth: number
) => `
<Research Data>
${allData}
</Research Data>

<Research Paper Outline>
${JSON.stringify(reportOutline, null, 2)}
</Research Paper Outline>

Write the actual content for the following subSection:
Title: ${subSectionTitle}
Description: ${subSectionDescription}

The detail level is ${researchDepth}, where a depth of 1 is a high level overview and a depth of 10 means this section is part of a 20 page report. Write in a formal manner, and use citations when possible.
`;

type WriteReportToolArgs = {
  researchDepth: number;
};

export class WriteReportTool extends BaseAsyncJobTool<WriteReportToolArgs> {
  readonly name = "writeReport";
  readonly description =
    "Writes a comprehensive report based on task research and context";

  async execute(
    agentId: string,
    { researchDepth }: WriteReportToolArgs
  ): Promise<ToolResult> {
    try {
      console.log(`writeReportTool executing with depth: ${researchDepth}`);

      const agent = await agentService.getAgentById(agentId);
      const tasks = await taskService.getTasksByOwnerId(agentId);
      const allData = await contextService.getAllContextsByAgentId(agentId);

      const result = await generateObject({
        model: openai("gpt-4.1-mini"),
        system: outlineSystemPrompt(agent!, tasks),
        prompt: `${allData}
        
        Write a report with a depth of ${researchDepth}, where a depth of 1 is a high level overview and a depth of 10 is a 20 page report. Focus on outlining just the content, skipping the introduction and conclusion.`,
        schema: z.object({
          report: z.object({
            title: z.string().describe("The title of the report"),
            sections: z.array(
              z.object({
                title: z.string().describe("The title of the section"),
                description: z
                  .string()
                  .describe("The description of the content of the section"),
                enoughInformation: z
                  .boolean()
                  .describe(
                    "Whether there is enough information to write this section at a depth of ${researchDepth}"
                  ),
                subSections: z.array(
                  z.object({
                    title: z.string().describe("The title of the subSection"),
                    description: z
                      .string()
                      .describe(
                        "The description of the content of the subSection"
                      ),
                    enoughInformation: z
                      .boolean()
                      .describe(
                        "Whether there is enough information to write this subSection at a depth of ${researchDepth}"
                      ),
                  })
                ),
              })
            ),
          }),
        }),
      });

      if (!result.object.report) {
        throw new Error("No report outline found");
      }

      const missingInformationSections = result.object.report.sections.filter(
        (section) => !section.enoughInformation
      );

      const missingInformationSubSections =
        result.object.report.sections.flatMap((section) =>
          section.subSections.filter(
            (subSection) => !subSection.enoughInformation
          )
        );

      if (
        missingInformationSections.length > 0 ||
        missingInformationSubSections.length > 0
      ) {
        return {
          success: false,
          data: `
Not enough information to write the report.

Missing information in sections:
${missingInformationSections.map((section) => section.title).join(", ")}

Missing information in subSections:
${missingInformationSubSections
  .map((subSection) => subSection.title)
  .join(", ")}
        `,
          type: "markdown",
          nextSteps: "Continue researching.",
        };
      }

      const allSections = result.object.report.sections.map(async (section) => {
        const subSections: Promise<any>[] = section.subSections.map(
          async (subSection) => {
            const writtenSubSection = generateObject({
              model: openai("gpt-4.1-nano"),
              system: `You write subsections for a research paper.`,
              prompt: subSectionPrompt(
                allData,
                result.object.report,
                subSection.title,
                subSection.description,
                researchDepth
              ),
              schema: z.object({
                subSectionContent: z
                  .string()
                  .describe("The content of the subSection"),
              }),
            });

            return writtenSubSection;
          }
        );

        const writtenSubSections = await Promise.all(subSections);

        const sectionRes = await generateObject({
          model: openai("gpt-4.1-nano"),
          system: `You write headers for sections in a research paper.`,
          prompt: sectionPrompt(
            allData,
            result.object.report,
            section.title,
            section.description,
            writtenSubSections
          ),
          schema: z.object({
            sectionIntroduction: z
              .string()
              .describe("The introduction of the section"),
          }),
        });

        return {
          title: section.title,
          introduction: sectionRes.object.sectionIntroduction,
          subSections: writtenSubSections.map((r, idx) => ({
            title: section.subSections[idx].title,
            content: r.object.subSectionContent,
          })),
        };
      });

      const writtenSections = await Promise.all(allSections);

      // Return the final report in markdown format with introduction, sections, and conclusion
      let markdown = "";
      writtenSections.forEach((section) => {
        markdown += `## ${section.title}\n\n`;
        markdown += `${section.introduction}\n\n`;
        section.subSections.forEach((subSection) => {
          markdown += `### ${subSection.title}\n\n`;
          markdown += `${subSection.content}\n\n`;
        });
      });

      const citationsResult = generateObject({
        model: openai("gpt-4.1-nano"),
        system: `You write citations for research papers.`,
        prompt: citationsPrompt(markdown),
        schema: z.object({
          citations: z
            .array(z.string())
            .describe(
              "The citations for the research paper in the format [1](url of the source) Title of the source"
            ),
        }),
      });
      // Generate overall introduction for the report
      const introResult = generateObject({
        model: openai("gpt-4.1-nano"),
        system: `You write introductions for research papers.`,
        prompt: introPrompt(markdown, result.object.report.title),
        schema: z.object({
          introductionTitle: z
            .string()
            .describe("The title of the research paper introduction"),
          introduction: z.string().describe("The research paper introduction"),
        }),
      });

      // Generate conclusion for the report
      const conclusionResult = generateObject({
        model: openai("gpt-4.1-nano"),
        system: `You write conclusions for research papers. Write in a formal manner`,
        prompt: conclusionPrompt(markdown, result.object.report.title),
        schema: z.object({
          conclusion: z.string().describe("The research paper conclusion"),
        }),
      });

      const [citations, intro, conclusion] = await Promise.all([
        citationsResult,
        introResult,
        conclusionResult,
      ]);

      const report = `# ${result.object.report.title.trim()}

## ${intro.object.introductionTitle.trim()}

${intro.object.introduction.trim()}

${markdown.trim()}

## Conclusion

${conclusion.object.conclusion.trim()}

--- 

### Citations:
${citations.object.citations.join("\n")}
`;
      return {
        success: true,
        data: report,
        type: "markdown",
      };
    } catch (error) {
      console.error("Error in writeReportTool:", error);
      return {
        success: false,
        type: "markdown",
        data: `Error in writeReportTool: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  getSynchronousTool(agentId: string) {
    return tool({
      description: "Write a report based on your research and tasks completed",
      parameters: z.object({
        researchDepth: z
          .number()
          .describe("The depth of research report to write")
          .max(10)
          .min(1),
      }),
      execute: async ({ researchDepth }): Promise<ToolResult> => {
        try {
          const response: JobResponse = await this.callAsyncTool(
            {
              researchDepth,
            },
            agentId
          );

          if (response.success) {
            return {
              success: true,
              data: "Your report is being generated and will be available when processing is complete.",
              type: "markdown",
            };
          } else {
            throw new Error(
              `Failed to queue report generation job: ${response.message}`
            );
          }
        } catch (error) {
          console.error("Error submitting writeReport job:", error);
          throw new Error(
            `Failed to process report request: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
  }
}

// Register the tool
const writeReportTool = new WriteReportTool();
toolRegistry.registerTool(writeReportTool);

// Export the tool instance
export { writeReportTool };
