#!/bin/bash
cd "C:/_projects/p25_chateasy/chateasy/server"
export PORT=10004
export TRUE_URL="http://localhost:10004/"
npm run dev
echo ""
echo "Server exited. Press Enter to close..."
read
