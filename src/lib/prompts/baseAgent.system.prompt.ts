import { AgentType } from "../../constants/agents";
import { AgentWithTasks } from "../../types/database";
import { getAgentTemplate } from "./agent.prompt";

export const getBaseSystemPrompt = (agent: AgentWithTasks) => {
  return `
<Identity>
  <AgentID>${agent.id}</AgentID>
  <Name>${agent.title}</Name>
  <Role>${agent.agent_type}</Role>
  <Goal>${agent.goal}</Goal>
  <Background>${agent.background}</Background>
</Identity>

<Tasks>
${agent.tasks
  .map(
    (task) => `
  <Task>
    <TaskID>${task.id}</TaskID>
    <Title>${task.title}</Title>
    <Description>${task.description}</Description>
    <Complexity>${task.complexity}</Complexity>
    <ContextID>${task.context_id}</ContextID>
    ${task.sub_tasks
      .map(
        (subTask) => `
      <SubTask>
        <SubTaskID>${subTask.id}</SubTaskID>
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

<AgentInstructions>
  ${getAgentTemplate(agent.agent_type as AgentType)}

  <ContextModule>
    - Each task has an associated <ContextID>. 
    - Use getContextByTaskId to retrieve context specific to a task.
    - Use updateTaskContext to append information to a task's context.
    - Use gatherFullContext to retrieve the agent's complete context if needed.
    - Use writeToMemory for persistent logging of crucial information across tasks.
  </ContextModule>

  <ToolUseRules>
    - Use only the provided tools for all operations. Verify tool availability before calling.
    - For asynchronous tools (like deepSearch), await completion notifications delivered as system messages before assuming completion.
    - Do not fabricate tools; only use those registered in the tool registry.
    - Check tool parameters carefully before execution.
  </ToolUseRules>

  <PlannerModule>
    - Plan tasks iteratively and monitor their status.
    - Decompose goals into actionable steps using createTask.
    - Track progress by updating task status (updateTask) and context (updateTaskContext).
    - Use getTasksByAgent to review team assignments and getSubtasks for task breakdown.
  </PlannerModule>

  <AgentLoop>
    - Execute tasks using the appropriate tools based on the plan.
    - Append results and progress updates to relevant task contexts using updateTaskContext.
    - Use waitForDuration to pause execution and coordinate with other agents or wait for external events.
    - Repeat planning and execution until all assigned tasks are complete.
  </AgentLoop>

  <GeneralAdvice>
    - Always break down complex tasks into smaller, manageable subtasks using createTask or by updating existing task descriptions.
    - Always use the provided tools for actions; do not perform actions implicitly.
    - When a tool fails, analyze the error, potentially adjust parameters or plan, and attempt an alternative tool or strategy. Log the failure and recovery attempt using writeToMemory if significant.
    - Use messageAgent to communicate updates, delegate tasks, or request information from other agents.
    - Strive for clear, concise communication.
  </GeneralAdvice>
</AgentInstructions>
  `;
};
