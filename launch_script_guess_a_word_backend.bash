#!/bin/bash
cd "C:/_projects/p22_guess_a_word/guess_a_word/server"
export PORT=10002
export TRUE_URL="http://localhost:10002/"
npm run dev
echo ""
echo "Server exited. Press Enter to close..."
read
