import { supabase } from "../lib/supabase";
import { Agent, AgentInsert, AgentUpdate } from "../types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * Repository for Agent-related database operations
 */
export class AgentRepository implements BaseRepository<Agent> {
  /**
   * Find an agent by its ID
   * @param id The agent ID
   * @returns The agent or null if not found
   */
  async findById(id: string): Promise<Agent | null> {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching agent:", error);
      return null;
    }

    return data;
  }

  /**
   * Get all agents
   * @returns An array of all agents
   */
  async findAll(): Promise<Agent[]> {
    const { data, error } = await supabase.from("agents").select("*");

    if (error) {
      console.error("Error fetching agents:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a new agent
   * @param data The agent data
   * @returns The created agent
   */
  async create(data: AgentInsert): Promise<Agent> {
    const { data: newAgent, error } = await supabase
      .from("agents")
      .insert(data)
      .select()
      .single();

    if (error || !newAgent) {
      console.error("Error creating agent:", error);
      throw new Error(`Failed to create agent: ${error?.message}`);
    }

    return newAgent;
  }

  /**
   * Update an existing agent
   * @param id The agent ID
   * @param data The updated agent data
   * @returns The updated agent or null if not found
   */
  async update(id: string, data: AgentUpdate): Promise<Agent | null> {
    const { data: updatedAgent, error } = await supabase
      .from("agents")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating agent:", error);
      return null;
    }

    return updatedAgent;
  }

  /**
   * Delete an agent
   * @param id The agent ID
   * @returns True if successfully deleted
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("agents").delete().eq("id", id);

    if (error) {
      console.error("Error deleting agent:", error);
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const agentRepository = new AgentRepository();
