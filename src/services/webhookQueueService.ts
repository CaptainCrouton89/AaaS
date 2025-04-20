import {
  WebhookQueueItem,
  webhookQueueRepository,
} from "../repositories/WebhookQueueRepository";
import { ToolResult } from "../tools/async-tools/baseTool";
import agentService from "./agentService";

/**
 * Service to handle webhook queue operations
 */
export class WebhookQueueService {
  /**
   * Queue a webhook for an agent and process it if the agent is available
   * @param agentId The agent ID
   * @param toolName The tool name
   * @param toolCallId The tool call ID
   * @param body The webhook body
   * @returns True if successfully queued
   */
  public async handleWebhook(
    agentId: string,
    toolName: string,
    toolCallId: string,
    body: ToolResult
  ): Promise<boolean> {
    try {
      console.log(
        `[WebhookQueueService] Queueing webhook for agent: ${agentId}`
      );

      // Create the webhook queue item
      const webhookItem: WebhookQueueItem = {
        toolName,
        toolCallId,
        body,
        timestamp: new Date().toISOString(),
      };

      // Queue the webhook
      const queueResult = await webhookQueueRepository.queueWebhook(
        agentId,
        webhookItem
      );

      if (!queueResult) {
        console.error(
          `[WebhookQueueService] Failed to queue webhook for agent: ${agentId}`
        );
        return false;
      }

      // Try to acquire the agent lock
      const lockAcquired = await webhookQueueRepository.acquireAgentLock(
        agentId
      );

      if (lockAcquired) {
        console.log(
          `[WebhookQueueService] Lock acquired for agent: ${agentId}, processing webhook queue`
        );

        // Process the webhook queue in the background
        this.processAgentQueue(agentId).catch((error) => {
          console.error(
            `[WebhookQueueService] Error processing webhook queue for agent: ${agentId}`,
            error
          );
        });
      } else {
        console.log(
          `[WebhookQueueService] Lock not acquired for agent: ${agentId}, webhook queued for later processing`
        );
      }

      return true;
    } catch (error) {
      console.error(
        `[WebhookQueueService] Error handling webhook for agent: ${agentId}`,
        error
      );
      return false;
    }
  }

  /**
   * Process all webhooks in the agent's queue
   * @param agentId The agent ID
   */
  private async processAgentQueue(agentId: string): Promise<void> {
    try {
      // Get the current queue length to process exactly that many webhooks
      const queueLength = await webhookQueueRepository.getQueueLength(agentId);
      console.log(
        `[WebhookQueueService] Processing ${queueLength} webhooks for agent: ${agentId}`
      );

      // Collect all webhook items to process them together
      const webhookJobs = [];
      for (let i = 0; i < queueLength; i++) {
        try {
          const webhookItem = await webhookQueueRepository.dequeueWebhook(
            agentId
          );

          if (!webhookItem) {
            console.log(
              `[WebhookQueueService] No more webhooks in queue for agent: ${agentId}`
            );
            break;
          }

          console.log(
            `[WebhookQueueService] Collected webhook ${
              i + 1
            }/${queueLength} for agent: ${agentId}`,
            webhookItem.toolName
          );

          webhookJobs.push({
            toolName: webhookItem.toolName,
            toolCallId: webhookItem.toolCallId,
            body: webhookItem.body,
          });
        } catch (error) {
          console.error(
            `[WebhookQueueService] Error collecting webhook for agent: ${agentId}`,
            error
          );
          // Continue processing other webhooks even if one fails
        }
      }

      // Process all webhooks together if there are any
      if (webhookJobs.length > 0) {
        console.log(
          `[WebhookQueueService] Processing ${webhookJobs.length} collected webhooks for agent: ${agentId}`
        );

        await agentService.handleWebhooks(agentId, webhookJobs);

        console.log(
          `[WebhookQueueService] Successfully processed ${webhookJobs.length} webhooks for agent: ${agentId}`
        );
      } else {
        console.log(
          `[WebhookQueueService] No webhooks to process for agent: ${agentId}`
        );
      }
    } catch (error) {
      console.error(
        `[WebhookQueueService] Error processing webhook queue for agent: ${agentId}`,
        error
      );
    } finally {
      // Always release the lock, even if an error occurred
      try {
        await webhookQueueRepository.releaseAgentLock(agentId);
        console.log(
          `[WebhookQueueService] Released lock for agent: ${agentId}`
        );
      } catch (lockError) {
        console.error(
          `[WebhookQueueService] Error releasing lock for agent: ${agentId}`,
          lockError
        );
      }
    }
  }
}

// Export singleton instance
const webhookQueueService = new WebhookQueueService();
export default webhookQueueService;
