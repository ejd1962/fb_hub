#!/bin/bash
cd "C:/_projects/p27_wordguess/wordguess"
export PORT=11001
export PROXY_ENABLED="true"
export PROXY_INFO_PATH="C:\_projects\p23_fb_hub\fb_hub\command_line_scripts\reverse_proxy.json"
export MSYS_NO_PATHCONV=1
export VITE_BASE_PATH="/localhost_11001"
npm run dev
EXIT_CODE=$?
echo ""
echo "Server exited with code $EXIT_CODE"

# Only auto-close on clean shutdown or intentional kill
# Exit codes that trigger auto-close:
#   0 = clean exit
#   1 = taskkill force termination (from launch_servers.js killing the process tree)
#   130 = SIGINT (Ctrl+C)
#   143 = SIGTERM (graceful shutdown)
# Any other exit code = unexpected crash, keep tab open
if [ $EXIT_CODE -eq 0 ] || [ $EXIT_CODE -eq 1 ] || [ $EXIT_CODE -eq 130 ] || [ $EXIT_CODE -eq 143 ]; then
    echo "Tab will auto-close in 5 seconds (or press Enter to close now)..."
    read -t 5 || true
else
    echo "⚠️  Server crashed or exited with error!"
    echo "Tab will remain open. Press Enter to close and review the error above..."
    read
fi
exit $EXIT_CODE
