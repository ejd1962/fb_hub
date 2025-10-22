#!/bin/bash
cd "C:/_projects/p21_testgame/testgame/server"
export PORT=10001
export TRUE_URL="http://localhost:10001/"
npm run dev
echo ""
echo "Server exited. Press Enter to close..."
read
