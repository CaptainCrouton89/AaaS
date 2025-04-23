import { ToolSet } from "ai";
import { AgentType } from "../../constants/agents";
import { getSubtasksTool, updateTaskContextTool } from "../../tools";
import { getWriteToLogsTool } from "../../tools/agent";
import {
  getMessageAgentTool,
  getSpawnAgentTool,
  removeAgentTool,
} from "../../tools/agent-management";
import { getAddNewNoteTool } from "../../tools/alaria";
import { toolRegistry } from "../../tools/async-tools";
import {
  // appendToContextTool,
  deleteContextTool,
  getCondenseMemoryTool,
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
import { getTasksByAgentTool } from "../../tools/task-queries";
import { Agent } from "../../types/database";
import { alariaWikiEditorSystemPrompt } from "./alariaWikiEditor.system.prompt";
import { programmingSystemTemplate } from "./programmer.system.prompt";
import { projectManagerTemplate } from "./projectManager.system.prompt";
import { researchAssistantTemplate } from "./researcher.system.prompt";
export const getAgentTemplate = (agentType: AgentType) => {
  switch (agentType) {
    case AgentType.RESEARCH_ASSISTANT:
      return researchAssistantTemplate;
    case AgentType.PROJECT_MANAGER:
      return projectManagerTemplate;
    case AgentType.ALARIA_WIKI_EDITOR:
      return alariaWikiEditorSystemPrompt;
    case AgentType.PROGRAMMER:
      return programmingSystemTemplate;
    default:
      return projectManagerTemplate;
  }
};

const defaultAgentTools = (agentId: string) => ({
  messageAgent: getMessageAgentTool(agentId),
  getContextByContextId: getContextTool,
  getContextByTaskId: getContextByTaskIdTool,
  createTask: getCreateTaskTool(agentId),
  getTaskByTaskId: getTaskTool,
  updateTask: updateTaskTool,
  deleteTask: deleteTaskTool,
  getTasksByAgent: getTasksByAgentTool,
  getSubtasks: getSubtasksTool,
  shareTaskContextTool: getShareTaskContextTool(agentId),
  gatherFullContext: getGatherFullContextTool(agentId),
  writeToMemory: getWriteToLogsTool(agentId),
  waitForDuration: toolRegistry.getTool("wait")!.getSynchronousTool(agentId),
  condenseMemory: getCondenseMemoryTool(agentId),
});

export const getAgentTools = (agent: Agent): ToolSet => {
  switch (agent.agent_type) {
    case AgentType.PROGRAMMER:
      return {
        ...defaultAgentTools(agent.id),
        writeCode: toolRegistry // !not done yet
          .getTool("writeCode")!
          .getSynchronousTool(agent.id),
      };
    // case AgentType.ARCHITECT:
    //   return {
    //     ...defaultAgentTools(agent.id),
    //     designArchitecture: toolRegistry // !not done yet
    //       .getTool("designArchitecture")!
    //       .getSynchronousTool(agent.id),
    //   };
    case AgentType.RESEARCH_ASSISTANT:
      return {
        ...defaultAgentTools(agent.id),
        deepSearch: toolRegistry
          .getTool("deepSearch")!
          .getSynchronousTool(agent.id),
        writeReport: toolRegistry
          .getTool("writeReport")!
          .getSynchronousTool(agent.id),
        crawl: toolRegistry.getTool("crawl")!.getSynchronousTool(agent.id),
        scrape: toolRegistry.getTool("scrape")!.getSynchronousTool(agent.id),
      };
    case AgentType.PROJECT_MANAGER:
      return {
        ...defaultAgentTools(agent.id),
        spawnAgent: getSpawnAgentTool(agent.owner, agent.id),
        messageAgent: getMessageAgentTool(agent.id),
        removeAgent: removeAgentTool,
        // Context management tools
        createContext: getCreateContextTool(agent.owner, agent.id),
        getContext: getContextTool,
        updateContext: updateContextTool,
        deleteContext: deleteContextTool,
        updateTaskContext: updateTaskContextTool,
        updateAgentContext: updateAgentContextTool,
      };
    case AgentType.ALARIA_WIKI_EDITOR:
      return {
        ...defaultAgentTools(agent.id),
        addNewNote: getAddNewNoteTool(),
      };
    default:
      return defaultAgentTools(agent.id);
  }
};

export const getInitializationPrompt = (agent: Agent) => {
  return `
<Identity>
  <Role>${agent.title}</Role>
  <AgentID>${agent.id}</AgentID>
  <Goal>${agent.goal}</Goal>
  <Background>${agent.background}</Background>
</Identity>

<PlannerModule>
  1. Analyze your goal and current context.
  2. Break down the goal into smaller, actionable tasks.
  3. Use createTask to create a task for each action.
  4. If tasks are complex, further decompose into subtasks.
</PlannerModule>

<ToolUseRules>
  - Use only the provided tools for operations.
  - For asynchronous tools, wait for notifications before proceeding.
  - Use messageAgent for communications with other agents.
</ToolUseRules>

<AgentLoop>
  - Plan tasks iteratively and monitor their status.
  - Append progress to task contexts using updateTaskContext.
  - Use waitForDuration to coordinate with other agents if needed.
</AgentLoop>

${getAdditionalInstructions(agent)}
  `;
};

export const getAdditionalInstructions = (agent: Agent) => {
  switch (agent.agent_type) {
    case AgentType.RESEARCH_ASSISTANT:
      return `
<AdditionalInstructions>
  <TargetDepth>Set a target depth of research based on your goal and save it to memory.</TargetDepth>
</AdditionalInstructions>
      `;
    default:
      return "";
  }
};
