#!/bin/bash
cd "C:/_projects/p23_fb_hub/fb_hub"
export PORT=11000
export VITE_BASE_PATH="/localhost_11000/"
npm run dev
echo ""
echo "Server exited. Press Enter to close..."
read
