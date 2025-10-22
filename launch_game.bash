#!/bin/bash
# Universal game launcher for TransVerse Hub
# Usage: ./launch_game.bash <game_identifier> [prod|dev|dev-vite]
#
# Port scheme:
#   Production:     9000 + game_number
#   Dev Backend:    10000 + game_number
#   Dev Frontend:   11000 + game_number
#
# Examples:
#   ./launch_game.bash p22 dev
#   ./launch_game.bash guess_a_word dev
#   ./launch_game.bash /c/_projects/p22_guess_a_word/guess_a_word dev

if [ -z "$1" ]; then
  echo "ERROR: Game identifier required"
  echo ""
  echo "Usage: $0 <game_identifier> [prod|dev|dev-vite]"
  echo ""
  echo "Game identifier can be:"
  echo "  - Project number (e.g., p22)"
  echo "  - Project with game name (e.g., p22_guess_a_word)"
  echo "  - Game name (e.g., guess_a_word)"
  echo "  - Full path (e.g., /c/_projects/p22_guess_a_word/guess_a_word)"
  echo ""
  echo "Examples:"
  echo "  $0 p22 dev"
  echo "  $0 p22_guess_a_word dev"
  echo "  $0 guess_a_word dev"
  echo "  $0 /c/_projects/p22_guess_a_word/guess_a_word dev"
  echo ""
  echo "Modes:"
  echo "  prod      - Production mode (port 9000+game#)"
  echo "  dev       - Dev backend only (port 10000+game#, serves built frontend)"
  echo "  dev-vite  - Dev with Vite (backend 10000+game#, frontend 11000+game#)"
  exit 1
fi

GAME_IDENTIFIER="$1"
MODE=${2:-dev}

# Function to find game directory from identifier
find_game_directory() {
  local identifier="$1"

  # If it's already a full path, use it
  if [[ "$identifier" = /* ]] && [ -d "$identifier" ]; then
    echo "$identifier"
    return 0
  fi

  # If it's a relative path, resolve it
  if [[ "$identifier" = */* ]] && [ -d "$identifier" ]; then
    cd "$identifier" 2>/dev/null && pwd
    return 0
  fi

  # Search in /c/_projects/ for matching directories
  # Pattern 1: pNN (e.g., p22) -> find /c/_projects/p22_*/
  if [[ "$identifier" =~ ^p[0-9]+$ ]]; then
    for dir in /c/_projects/${identifier}_*/; do
      if [ -d "$dir" ]; then
        # Get the inner directory (e.g., p22_guess_a_word/guess_a_word)
        local game_name=$(basename "$dir" | sed "s/^${identifier}_//")
        local full_path="${dir}${game_name}"
        if [ -d "$full_path" ]; then
          echo "$full_path"
          return 0
        fi
      fi
    done
  fi

  # Pattern 2: pNN_game_name (e.g., p22_guess_a_word) -> find /c/_projects/p22_guess_a_word/guess_a_word
  if [[ "$identifier" =~ ^p[0-9]+_.+$ ]]; then
    local game_name=$(echo "$identifier" | sed 's/^p[0-9]*_//')
    local full_path="/c/_projects/${identifier}/${game_name}"
    if [ -d "$full_path" ]; then
      echo "$full_path"
      return 0
    fi
  fi

  # Pattern 3: game_name (e.g., guess_a_word) -> find /c/_projects/p*_guess_a_word/guess_a_word
  for dir in /c/_projects/p*_${identifier}/${identifier}; do
    if [ -d "$dir" ]; then
      echo "$dir"
      return 0
    fi
  done

  # Not found
  return 1
}

# Find the game directory
GAME_PATH=$(find_game_directory "$GAME_IDENTIFIER")

if [ -z "$GAME_PATH" ] || [ ! -d "$GAME_PATH" ]; then
  echo "ERROR: Could not find game directory for identifier: $GAME_IDENTIFIER"
  echo ""
  echo "Searched patterns:"
  echo "  - Direct path: $GAME_IDENTIFIER"
  echo "  - Project pattern: /c/_projects/${GAME_IDENTIFIER}_*/"
  echo "  - Game name pattern: /c/_projects/p*_${GAME_IDENTIFIER}/"
  exit 1
fi

# Read game info from JSON file
GAMEINFO_FILE="$GAME_PATH/public/fb_hub_data/game_info.json"
if [ ! -f "$GAMEINFO_FILE" ]; then
  echo "ERROR: game_info.json not found at $GAMEINFO_FILE"
  echo ""
  echo "Each game must have public/fb_hub_data/game_info.json with game_number field"
  exit 1
fi

# Extract game_number and game_name from JSON using grep and sed
GAME_NUMBER=$(grep -o '"game_number"[[:space:]]*:[[:space:]]*[0-9]*' "$GAMEINFO_FILE" | grep -o '[0-9]*')
GAME_NAME=$(grep -o '"game_name"[[:space:]]*:[[:space:]]*"[^"]*"' "$GAMEINFO_FILE" | sed 's/"game_name"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')

if [ -z "$GAME_NUMBER" ]; then
  echo "ERROR: game_number not found in $GAMEINFO_FILE"
  exit 1
fi

if [ -z "$GAME_NAME" ]; then
  echo "ERROR: game_name not found in $GAMEINFO_FILE"
  exit 1
fi

# Calculate ports
PROD_PORT=$((9000 + GAME_NUMBER))
DEV_BACKEND_PORT=$((10000 + GAME_NUMBER))
DEV_FRONTEND_PORT=$((11000 + GAME_NUMBER))

echo "========================================"
echo "TransVerse Hub - Game Launcher"
echo "========================================"
echo "Game: $GAME_NAME (#$GAME_NUMBER)"
echo "Path: $GAME_PATH"
echo "Mode: $MODE"
echo ""

case "$MODE" in
  prod)
    echo "Launching in PRODUCTION mode"
    echo "Port: $PROD_PORT"
    echo "URL: http://localhost:$PROD_PORT/"
    echo ""
    cd "$GAME_PATH/server"
    PORT=$PROD_PORT TRUE_URL="http://localhost:$PROD_PORT/" node index.js
    ;;

  dev)
    echo "Launching in DEV mode (backend only)"
    echo "Backend Port: $DEV_BACKEND_PORT"
    echo "Backend URL: http://localhost:$DEV_BACKEND_PORT/"
    echo ""
    echo "NOTE: Serving pre-built frontend from dist/"
    echo "      To rebuild frontend, run: cd $GAME_PATH && PORT=$DEV_BACKEND_PORT npm run build:dev"
    echo ""
    cd "$GAME_PATH/server"
    PORT=$DEV_BACKEND_PORT TRUE_URL="http://localhost:$DEV_BACKEND_PORT/" npm run dev
    ;;

  dev-vite)
    echo "Launching in DEV mode with Vite"
    echo "Backend Port: $DEV_BACKEND_PORT"
    echo "Frontend Port: $DEV_FRONTEND_PORT"
    echo ""
    echo "Backend URL: http://localhost:$DEV_BACKEND_PORT/"
    echo "Frontend URL: http://localhost:$DEV_FRONTEND_PORT/"
    echo ""
    echo "NOTE: In dev-vite mode, access the game via the FRONTEND URL"
    echo ""

    # Launch backend in background
    echo "[1/2] Starting backend server on port $DEV_BACKEND_PORT..."
    cd "$GAME_PATH/server"
    PORT=$DEV_BACKEND_PORT TRUE_URL="http://localhost:$DEV_BACKEND_PORT/" npm run dev &
    BACKEND_PID=$!
    cd "$GAME_PATH"

    # Wait for backend to start
    echo "Waiting for backend to initialize..."
    sleep 3

    # Launch frontend
    echo "[2/2] Starting Vite dev server on port $DEV_FRONTEND_PORT..."
    echo ""
    PORT=$DEV_FRONTEND_PORT npm run dev

    # When frontend exits (Ctrl+C), kill backend
    echo ""
    echo "Shutting down backend server..."
    kill $BACKEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    echo "Backend stopped."
    ;;

  *)
    echo "ERROR: Invalid mode: $MODE"
    echo ""
    echo "Valid modes:"
    echo "  prod      - Production mode (port $PROD_PORT)"
    echo "  dev       - Dev backend only (port $DEV_BACKEND_PORT, serves built frontend)"
    echo "  dev-vite  - Dev with Vite (backend $DEV_BACKEND_PORT, frontend $DEV_FRONTEND_PORT)"
    exit 1
    ;;
esac
