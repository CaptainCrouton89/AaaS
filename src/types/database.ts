import { Database } from "./database.types";

// Define Json type
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Entity types
export type Agent = Database["public"]["Tables"]["agents"]["Row"];
export type Context = Database["public"]["Tables"]["contexts"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type ProgrammingTask =
  Database["public"]["Tables"]["programming_tasks"]["Row"];

export type AgentInsert = Database["public"]["Tables"]["agents"]["Insert"];
export type AgentUpdate = Database["public"]["Tables"]["agents"]["Update"];

export type ContextInsert = Database["public"]["Tables"]["contexts"]["Insert"];
export type ContextUpdate = Database["public"]["Tables"]["contexts"]["Update"];

export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type ProgrammingTaskInsert =
  Database["public"]["Tables"]["programming_tasks"]["Insert"];
export type ProgrammingTaskUpdate =
  Database["public"]["Tables"]["programming_tasks"]["Update"];

export type AgentWithTasks = Agent & {
  tasks: TaskWithSubTasks[];
};

export type TaskWithSubTasks = Task & {
  sub_tasks: TaskWithSubTasks[];
};

export type TaskWithContext = Task & {
  context: Context;
};

export type InsertProgrammingTask =
  Database["public"]["Tables"]["programming_tasks"]["Insert"];
export type UpdateProgrammingTask =
  Database["public"]["Tables"]["programming_tasks"]["Update"];

export type InsertTask = Database["public"]["Tables"]["tasks"]["Insert"];
