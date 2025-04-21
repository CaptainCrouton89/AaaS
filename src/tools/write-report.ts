import { openai } from "@ai-sdk/openai";
import { generateObject, tool } from "ai";
import { z } from "zod";
import { agentService, contextService, taskService } from "../services";
import { ToolResult } from "./async-tools/baseTool";

export const getWriteReportTool = (agentId: string) =>
  tool({
    description: "Write a report about the tasks you have completed",
    parameters: z.object({
      researchDepth: z
        .number()
        .describe("The depth of research report to write")
        .max(10)
        .min(1),
    }),

    execute: async ({ researchDepth }): Promise<ToolResult> => {
      const agent = await agentService.getAgentById(agentId);
      const tasks = await taskService.getTasksByOwnerId(agentId);
      const allData = await contextService.getAllContextsByAgentId(agentId);

      const result = await generateObject({
        model: openai("gpt-4.1-mini"),
        system: `
You are a report writer, tasked with outlining a report based on the following goal and tasks:

<Goal>
${agent!.goal}
</Goal>

<Tasks>
${tasks
  .map((task) => `<${task.title}> \n${task.description}</${task.title}>`)
  .join("\n")}
</Tasks>

<Instructions>
  Outline a report based on the tasks and the full context of the tasks. If you think there's not enough information in a section, mark it as false.

  Your report outline should look like this:

  {
    "title": "Report Title",
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

Your primary goal is quality. If you think there's not enough information in a section, mark it as false. Be picky.

The user will give you all of their research and notes. Use this to write the outline.
</Instructions>`,
        prompt: `${allData}
        
        Write a report with a depth of ${researchDepth}, where a depth of 1 is a high level overview and a depth of 10 is a 20 page report.`,
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

        Continue researching.
        `,
          type: "markdown",
        };
      }

      const allSections = result.object.report.sections.map(async (section) => {
        const subSections: Promise<any>[] = section.subSections.map(
          async (subSection) => {
            const writtenSubSection = generateObject({
              model: openai("gpt-4.1-nano"),
              system: `You write subsections for a report.`,
              prompt: `
            <Research Data>
            ${allData}
            </Research Data>

            <Report Outline>
              ${JSON.stringify(result.object.report, null, 2)}
            </Report Outline>

            Write the actual content for the following subSection:
            Title: ${subSection.title}
            Description: ${subSection.description}

            The detail level is ${researchDepth}, where a depth of 1 is a high level overview and a depth of 10 means this section is part ofa 20 page report.
            `,
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
          system: `You write introductions for sections in a report.`,
          prompt: `
          <Research Data>
          ${allData}
          </Research Data>

          <Report Outline>
            ${JSON.stringify(result.object.report, null, 2)}
          </Report Outline>

          Write the introduction for the following section:
          Title: ${section.title}
          Description: ${section.description}
          SubSections: ${writtenSubSections
            .map((r) => r.object.subSectionContent)
            .join(", ")}
          `,
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

      // Generate overall introduction for the report
      const introResult = await generateObject({
        model: openai("gpt-4.1-nano"),
        system: `You write introductions for reports.`,
        prompt: `
<ReportBody>
${markdown}
</ReportBody>

Write an overall introduction for the report titled "${result.object.report.title}".
`,
        schema: z.object({
          introductionTitle: z
            .string()
            .describe("The title of the overall report introduction"),
          introduction: z.string().describe("The overall report introduction"),
        }),
      });
      const reportIntroduction = introResult.object.introduction;
      const reportIntroductionTitle = introResult.object.introductionTitle;
      // Generate conclusion for the report
      const conclusionResult = await generateObject({
        model: openai("gpt-4.1-nano"),
        system: `You write conclusions for reports.`,
        prompt: `
<ReportBody>
${markdown}
</ReportBody>

Write a conclusion for the report titled "${result.object.report.title}".
`,
        schema: z.object({
          conclusion: z.string().describe("The report conclusion"),
          conclusionTitle: z
            .string()
            .describe("The title of the report conclusion"),
        }),
      });
      const reportConclusion = conclusionResult.object.conclusion;
      const reportConclusionTitle = conclusionResult.object.conclusionTitle;

      const report = `# ${result.object.report.title.trim()}

${reportIntroductionTitle.trim()}

${reportIntroduction.trim()}

${markdown.trim()}

${reportConclusionTitle.trim()}

${reportConclusion.trim()}`;

      return {
        success: true,
        data: report,
        type: "markdown",
      };
    },
  });
