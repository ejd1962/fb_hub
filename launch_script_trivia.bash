#!/bin/bash
cd "C:/_projects/p26_trivia/trivia/server"
export PORT=10003
export TRUE_URL="http://localhost:10003/"
npm run dev
echo ""
echo "Server exited. Press Enter to close..."
read
