#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_BASE_URL="http://localhost:3800"
AGENT_ID="test-agent-id"

# Create a test agent if needed
create_agent() {
  echo -e "${BLUE}===== Creating a test agent =====${NC}"
  curl -s -X POST "${API_BASE_URL}/api/agents" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Webhook Test Agent",
      "description": "Agent for testing webhook batching",
      "agentType": "ai-sdk-agent"
    }' | jq .
}

# Send multiple webhooks in quick succession
send_webhooks() {
  echo -e "${BLUE}===== Sending multiple webhooks in rapid succession =====${NC}"
  
  for i in {1..5}; do
    echo -e "${YELLOW}Sending webhook #${i}...${NC}"
    curl -s -X POST "${API_BASE_URL}/api/agents/${AGENT_ID}/webhook/test-tool/test-call-${i}" \
      -H "Content-Type: application/json" \
      -d '{
        "success": true,
        "data": {
          "type": "text",
          "text": "Test webhook result #'"${i}"'",
          "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
        }
      }' | jq .
    
    # No sleep between requests - we want them to arrive quickly
  done
}

# Check the agent's message history to see if webhooks were processed in batches
check_message_history() {
  echo -e "${BLUE}===== Checking agent message history =====${NC}"
  sleep 2 # Give time for webhooks to be processed
  curl -s -X GET "${API_BASE_URL}/api/agents/${AGENT_ID}/messages" | jq .
}

# Main execution
echo -e "${BLUE}===== Testing Webhook Batching =====${NC}"

# Uncomment to create a test agent
# create_agent

# Replace AGENT_ID with the actual agent ID if you created one
# AGENT_ID="the-agent-id-from-create_agent"

# Send webhooks and check history
send_webhooks
check_message_history

echo -e "${GREEN}Test complete! Check the server logs for detailed information.${NC}" 