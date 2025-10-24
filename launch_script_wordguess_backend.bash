#!/bin/bash
cd "C:/_projects/p27_wordguess/wordguess/server"
export PORT=10001
export TRUE_URL="http://localhost:10001/"
npm run dev
echo ""
echo "Server exited. Press Enter to close..."
read
