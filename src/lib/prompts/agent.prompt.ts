import { ToolSet } from "ai";
import { AgentType } from "../../constants/agents";
import {
  getSubtasksTool,
  getTasksByTeamMemberTool,
  removeTeamMemberTool,
  updateTaskContextTool,
} from "../../tools";
import { getWriteToLogsTool } from "../../tools/agent";
import { toolRegistry } from "../../tools/async-tools";
import {
  // appendToContextTool,
  deleteContextTool,
  getContextByTaskIdTool,
  getContextTool,
  getCreateContextTool,
  getGatherFullContextTool,
  getShareTaskContextTool,
  updateAgentContextTool,
  updateContextTool,
} from "../../tools/context";
import {
  deleteTaskTool,
  getCreateTaskTool,
  getTaskTool,
  updateTaskTool,
} from "../../tools/task-management";
import {
  getMessageTeamMemberTool,
  getRecruitTeamMemberTool,
} from "../../tools/team-members";
import { getWriteReportTool } from "../../tools/write-report";
import { Agent, AgentWithTasks } from "../../types/database";

export const getBaseSystemPrompt = (agent: AgentWithTasks) => {
  return `
<Team Member>
  <Team Member ID>${agent.id}</Team Member ID>
  <Name>${agent.title}</Name>
  <Role>${agent.agent_type}</Role>
  <Goal>${agent.goal}</Goal>
  <Background>${agent.background}</Background>
</Team Member>

<Tasks>
${agent.tasks
  .map(
    (task) => `
  <Task>
    <Task ID>${task.id}</Task ID>
    <Title>${task.title}</Title>
    <Description>${task.description}</Description>
    <Complexity>${task.complexity}</Complexity>
    <Context ID>${task.context_id}</Context ID>
    ${task.sub_tasks
      .map(
        (subTask) => `
      <SubTask>
        <SubTask ID>${subTask.id}</SubTask ID>
        <Title>${subTask.title}</Title>
        <Description>${subTask.description}</Description>
      </SubTask>
    `
      )
      .join("\n")}
  </Task>
`
  )
  .join("\n")}
</Tasks>

<Memory>
  ${agent.logs}
</Memory>

<Agent Instructions>
${getAgentTemplate(agent.agent_type as AgentType)}

## Context
- Each task has a context ID. This is the ID of the context that the task is associated with. You can use the getContext tool to get the context of a task. 
- If tasks are complex, create more tasks to break down the complexity.
- When working on a specific task, append to the context of the task to keep track of your progress.

## Communication
- You report to the team leader. When you have completed all of your tasks, report back to them.


</Agent Instructions>
  `;
};

export const getAgentTemplate = (agentType: AgentType) => {
  switch (agentType) {
    case AgentType.RESEARCH_ASSISTANT:
      return researchAssistantTemplate;
    case AgentType.PROJECT_MANAGER:
      return projectManagerTemplate;
    default:
      return projectManagerTemplate;
  }
};

const defaultAgentTools = (agentId: string) => ({
  messageTeamMember: getMessageTeamMemberTool(agentId),
  getContextByContextId: getContextTool,
  getContextByTaskId: getContextByTaskIdTool,
  updateContext: updateContextTool,
  // appendToContext: appendToContextTool,
  createTask: getCreateTaskTool(agentId),
  getTaskByTaskId: getTaskTool,
  updateTask: updateTaskTool,
  deleteTask: deleteTaskTool,
  getTasksByTeamMember: getTasksByTeamMemberTool,
  getSubtasks: getSubtasksTool,
  shareTaskContextTool: getShareTaskContextTool(agentId),
  gatherFullContext: getGatherFullContextTool(agentId),
  writeToMemory: getWriteToLogsTool(agentId),
});

export const getAgentTools = (agent: Agent): ToolSet => {
  switch (agent.agent_type) {
    case AgentType.RESEARCH_ASSISTANT:
      return {
        ...defaultAgentTools(agent.id),
        deepSearch: toolRegistry
          .getTool("deepSearch")!
          .getSynchronousTool(agent.id),
        writeReport: getWriteReportTool(agent.id),
      };
    case AgentType.PROJECT_MANAGER:
      return {
        ...defaultAgentTools(agent.id),
        recruitTeamMember: getRecruitTeamMemberTool(agent.owner, agent.id),
        messageTeamMember: getMessageTeamMemberTool(agent.id),
        removeTeamMember: removeTeamMemberTool,
        // Context management tools
        createContext: getCreateContextTool(agent.owner, agent.id),
        getContext: getContextTool,
        updateContext: updateContextTool,
        deleteContext: deleteContextTool,
        updateTaskContext: updateTaskContextTool,
        updateAgentContext: updateAgentContextTool,
      };
    default:
      return defaultAgentTools(agent.id);
  }
};
const researchAssistantTemplate = `
You are a research assistant, capable of performing extremely deep research on a given topic.

You have access to the deepSearch tool, which can perform an asynchronous search on the internet. You can use it to trigger multiple searches at the same time and it will return the results as soon as they are available. Results of this research will be added to context.

When tasked with a research project, you should use the deepSearch tool to perform the research. Continue researching until you have enough information to make a comprehensive report.
`;

const projectManagerTemplate = `
You have access to a variety of both synchronous and asynchronous tools. The asynchronous tools will return a task ID that you can use to check the status of the task. When one of the asynchronous tools is complete, it will respond as a user message with a message that the task is complete, in the format of:

[ToolName: ToolId: ##] Completed. Result: {result}

The asynchronous tools will always notify you when they are complete—until then, you can assume that they are still running.
`;

export const getInitializationPrompt = (agent: Agent) => {
  return `You are the new member of the team. 

You have been tasked with the following goal:
${agent.goal}

You have the following background:
${agent.background} 

Think about your goal and break it down into smaller steps. Then create a task for each step. If tasks are complex, create more tasks to break down the complexity.

${getAdditionalInstructions(agent)}
  `;
};

export const getAdditionalInstructions = (agent: Agent) => {
  switch (agent.agent_type) {
    case AgentType.RESEARCH_ASSISTANT:
      return `
      Based off your goal, set a target depth of research to perform, and save it to your memory.
      `;
    default:
      return "";
  }
};
