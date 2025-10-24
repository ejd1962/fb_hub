#!/bin/bash
cd "C:/_projects/p27_wordguess/wordguess"
export PORT=11001
export VITE_BASE_PATH="/localhost_11001/"
npm run dev
echo ""
echo "Server exited. Press Enter to close..."
read
