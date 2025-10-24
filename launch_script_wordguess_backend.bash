#!/bin/bash
cd "C:/_projects/p27_wordguess/wordguess/server"
export PORT=10002
export TRUE_URL="http://localhost:10002/"
npm run dev
echo ""
echo "Server exited. Press Enter to close..."
read
