import { supabase } from "../lib/supabase";
import { AgentMessageHistory } from "../types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * Repository for AgentMessageHistory-related database operations
 */
export class AgentMessageHistoryRepository
  implements BaseRepository<AgentMessageHistory>
{
  /**
   * Find a message by its ID
   * @param id The message ID
   * @returns The message or null if not found
   */
  async findById(id: string): Promise<AgentMessageHistory | null> {
    const { data, error } = await supabase
      .from("agent_message_history")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching message:", error);
      return null;
    }

    return data;
  }

  /**
   * Get all messages
   * @returns An array of all messages
   */
  async findAll(): Promise<AgentMessageHistory[]> {
    const { data, error } = await supabase
      .from("agent_message_history")
      .select("*");

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a new message
   * @param data The message data
   * @returns The created message
   */
  async create(
    data: Partial<AgentMessageHistory>
  ): Promise<AgentMessageHistory> {
    const { data: newMessage, error } = await supabase
      .from("agent_message_history")
      .insert(data)
      .select()
      .single();

    if (error || !newMessage) {
      console.error("Error creating message:", error);
      throw new Error(`Failed to create message: ${error?.message}`);
    }

    return newMessage;
  }

  /**
   * Update an existing message
   * @param id The message ID
   * @param data The updated message data
   * @returns The updated message or null if not found
   */
  async update(
    id: string,
    data: Partial<AgentMessageHistory>
  ): Promise<AgentMessageHistory | null> {
    const { data: updatedMessage, error } = await supabase
      .from("agent_message_history")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating message:", error);
      return null;
    }

    return updatedMessage;
  }

  /**
   * Delete a message
   * @param id The message ID
   * @returns True if successfully deleted
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("agent_message_history")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting message:", error);
      return false;
    }

    return true;
  }

  /**
   * Find message history by agent ID
   * @param agentId The agent ID
   * @returns Array of messages for the specified agent
   */
  async findByAgentId(agentId: string): Promise<AgentMessageHistory[]> {
    const { data, error } = await supabase
      .from("agent_message_history")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching message history by agent:", error);
      return [];
    }

    return data || [];
  }

  async createMany(
    data: Partial<AgentMessageHistory>[]
  ): Promise<AgentMessageHistory[]> {
    const { data: newMessages, error } = await supabase
      .from("agent_message_history")
      .insert(data)
      .select();

    if (error) {
      console.error("Error creating messages:", error);
      throw new Error(`Failed to create messages: ${error?.message}`);
    }

    return newMessages || [];
  }
}

// Export singleton instance
export const agentMessageHistoryRepository =
  new AgentMessageHistoryRepository();
