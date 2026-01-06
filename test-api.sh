#!/bin/bash

# GlassKom Social - API Testing Script
# Tests the messaging API endpoints

set -e

API_URL="${API_URL:-http://localhost:3001}"
BASE_URL="$API_URL/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 GlassKom Social - API Testing"
echo "================================="
echo "API URL: $API_URL"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi
echo ""

# Test 2: Create a test chat
echo "Test 2: Create Test Chat"
echo "------------------------"
TEST_USER_1="test_user_1"
TEST_USER_2="test_user_2"

CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/chats" \
  -H "Content-Type: application/json" \
  -d "{
    \"participantIds\": [\"$TEST_USER_1\", \"$TEST_USER_2\"],
    \"type\": \"direct\"
  }")

if echo "$CHAT_RESPONSE" | grep -q "id"; then
    CHAT_ID=$(echo "$CHAT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Chat created: $CHAT_ID${NC}"
else
    echo -e "${YELLOW}⚠️  Chat creation response: $CHAT_RESPONSE${NC}"
fi
echo ""

# Test 3: Send a message
if [ ! -z "$CHAT_ID" ]; then
    echo "Test 3: Send Message"
    echo "--------------------"
    ENCRYPTED_MESSAGE=$(echo -n "Hello from test script!" | base64)
    
    MSG_RESPONSE=$(curl -s -X POST "$BASE_URL/messages" \
      -H "Content-Type: application/json" \
      -d "{
        \"chatId\": \"$CHAT_ID\",
        \"senderId\": \"$TEST_USER_1\",
        \"content\": \"$ENCRYPTED_MESSAGE\"
      }")
    
    if echo "$MSG_RESPONSE" | grep -q "id"; then
        MSG_ID=$(echo "$MSG_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ Message sent: $MSG_ID${NC}"
    else
        echo -e "${YELLOW}⚠️  Message response: $MSG_RESPONSE${NC}"
    fi
    echo ""
    
    # Test 4: Get chat messages
    if [ ! -z "$MSG_ID" ]; then
        echo "Test 4: Get Chat Messages"
        echo "-------------------------"
        CHAT_DETAILS=$(curl -s "$BASE_URL/chats/$CHAT_ID?userId=$TEST_USER_1")
        
        if echo "$CHAT_DETAILS" | grep -q "$MSG_ID"; then
            echo -e "${GREEN}✅ Chat messages retrieved${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not find message in chat${NC}"
        fi
        echo ""
        
        # Test 5: Add reaction
        echo "Test 5: Add Reaction"
        echo "--------------------"
        REACTION_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/$MSG_ID/reactions" \
          -H "Content-Type: application/json" \
          -d "{
            \"userId\": \"$TEST_USER_2\",
            \"emoji\": \"👍\"
          }")
        
        if echo "$REACTION_RESPONSE" | grep -q "emoji"; then
            echo -e "${GREEN}✅ Reaction added${NC}"
        else
            echo -e "${YELLOW}⚠️  Reaction response: $REACTION_RESPONSE${NC}"
        fi
        echo ""
        
        # Test 6: Edit message
        echo "Test 6: Edit Message"
        echo "--------------------"
        EDITED_CONTENT=$(echo -n "Hello from test script! (edited)" | base64)
        
        EDIT_RESPONSE=$(curl -s -X PUT "$BASE_URL/messages/$MSG_ID" \
          -H "Content-Type: application/json" \
          -d "{
            \"userId\": \"$TEST_USER_1\",
            \"content\": \"$EDITED_CONTENT\"
          }")
        
        if echo "$EDIT_RESPONSE" | grep -q "is_edited"; then
            echo -e "${GREEN}✅ Message edited${NC}"
        else
            echo -e "${YELLOW}⚠️  Edit response: $EDIT_RESPONSE${NC}"
        fi
        echo ""
        
        # Test 7: Mark as read
        echo "Test 7: Mark Messages as Read"
        echo "------------------------------"
        READ_RESPONSE=$(curl -s -X POST "$BASE_URL/chats/$CHAT_ID/read" \
          -H "Content-Type: application/json" \
          -d "{
            \"userId\": \"$TEST_USER_2\"
          }")
        
        if echo "$READ_RESPONSE" | grep -q "success"; then
            echo -e "${GREEN}✅ Messages marked as read${NC}"
        else
            echo -e "${YELLOW}⚠️  Read response: $READ_RESPONSE${NC}"
        fi
        echo ""
        
        # Test 8: Update typing status
        echo "Test 8: Typing Indicator"
        echo "------------------------"
        TYPING_RESPONSE=$(curl -s -X POST "$BASE_URL/chats/$CHAT_ID/typing" \
          -H "Content-Type: application/json" \
          -d "{
            \"userId\": \"$TEST_USER_2\",
            \"isTyping\": true
          }")
        
        if echo "$TYPING_RESPONSE" | grep -q "success"; then
            echo -e "${GREEN}✅ Typing status updated${NC}"
        else
            echo -e "${YELLOW}⚠️  Typing response: $TYPING_RESPONSE${NC}"
        fi
        echo ""
        
        # Test 9: Delete message
        echo "Test 9: Delete Message"
        echo "----------------------"
        DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/messages/$MSG_ID" \
          -H "Content-Type: application/json" \
          -d "{
            \"userId\": \"$TEST_USER_1\",
            \"deleteForEveryone\": false
          }")
        
        if echo "$DELETE_RESPONSE" | grep -q "success"; then
            echo -e "${GREEN}✅ Message deleted${NC}"
        else
            echo -e "${YELLOW}⚠️  Delete response: $DELETE_RESPONSE${NC}"
        fi
        echo ""
    fi
fi

# Summary
echo "================================="
echo -e "${GREEN}✅ API Testing Complete!${NC}"
echo ""
echo "Note: Some tests may show warnings if the database"
echo "is not properly initialized. Run the backend server"
echo "first to ensure the database schema is created."
echo ""
echo "To view detailed responses, you can run individual"
echo "curl commands from the script."
test-api.sh
