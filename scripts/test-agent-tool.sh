#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_BASE_URL="http://localhost:3800"

echo -e "${BLUE}===== Testing Agent with HelloWorld Tool =====${NC}"

# Test the agent endpoint with a message asking to use the helloWorld tool
echo -e "${YELLOW}Sending a chat message to the agent that should trigger the HelloWorld tool...${NC}"
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/agents/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Please greet someone named John with a 5 second delay using the helloWorld tool."
      }
    ]
  }')

echo -e "${GREEN}Agent Response:${NC}"
echo $RESPONSE | jq .

# Extract job ID if it's in the response
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JOB_ID" ]; then
  echo -e "${YELLOW}Job ID found: ${JOB_ID}${NC}"
  
  # Wait for a moment to allow the job to be processed
  echo -e "${YELLOW}Waiting for job to be processed...${NC}"
  sleep 2
  
  # Check the job status
  echo -e "${YELLOW}Checking job status...${NC}"
  curl -s -X GET "${API_BASE_URL}/api/jobs/${JOB_ID}" | jq .
fi

echo ""
echo -e "${BLUE}===== Simulating Job Completion Webhook Callback =====${NC}"

# Simulate a webhook callback for the HelloWorld tool
echo -e "${YELLOW}Simulating webhook callback for the HelloWorld tool...${NC}"
curl -s -X POST "${API_BASE_URL}/api/agent/ai-sdk-agent/webhook/helloworld-callback" \
  -H "Content-Type: application/json" \
  -d '{
    "success": true,
    "data": {
      "type": "text",
      "text": "Hello, John! (after waiting 5 seconds)",
      "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }' | jq .

echo ""
echo -e "${GREEN}Test complete! Check the server logs for more details.${NC}" 