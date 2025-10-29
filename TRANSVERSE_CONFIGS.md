# TransVerse Platform Configuration

## Overview

`transverse_configs.json` is the **single source of truth** for all TransVerse platform-wide configuration settings. This file centralizes timing, port ranges, and other constants that affect the entire platform, eliminating hardcoded values scattered across multiple files.

**Location**: `C:\_projects\p23_fb_hub\fb_hub\transverse_configs.json`

## Why Centralized Configuration?

Before this system, port numbers, timing values, and other constants were hardcoded in multiple places:
- `launch_servers.js` had hardcoded `server_setup_delay=10`
- `launch_proxy.js` had hardcoded `num_ports=5` and port ranges `9000`, `10000`, `11000`
- `clone_project.js` had hardcoded port calculations
- `wordguess/server/index.js` had hardcoded `10000` and `11000` for Vite detection

Changing any of these values required editing multiple files, increasing the risk of inconsistencies.

**Now**: Change one value in `transverse_configs.json`, and the entire platform automatically adapts.

---

## Configuration Fields

### Timing Configuration

#### `server_setup_delay`
- **Type**: Integer (seconds)
- **Default**: `15`
- **Purpose**: Time to wait before proxy scans for active servers, allowing all servers to finish startup
- **Used by**:
  - `launch_servers.js` - Passes to `launch_proxy.js` via `--server_setup_delay` argument
  - `launch_proxy.js` - DEFAULT_SERVER_SETUP_DELAY
- **Impact**: If servers take longer to start, increase this value

#### `max_proxy_setup_buffer`
- **Type**: Integer (seconds)
- **Default**: `10`
- **Purpose**: Additional time buffer for proxy file creation and propagation
- **Used by**:
  - `launch_servers.js` - Computes `MAX_PROXY_SETUP_SECONDS = server_setup_delay + max_proxy_setup_buffer`
- **Impact**: Total wait time for proxy = `server_setup_delay` + `max_proxy_setup_buffer` = 25 seconds

#### `status_report_interval_minutes`
- **Type**: Integer (minutes)
- **Default**: `1`
- **Purpose**: Interval for periodic status reports printed to console showing server health (active sessions, rooms, etc.)
- **Used by**:
  - `fb_hub/server/index.js` - STATUS_REPORT_INTERVAL_MINUTES
  - `wordguess/server/index.js` - STATUS_REPORT_INTERVAL_MINUTES
- **Behavior**:
  - First report always appears at 1 minute mark (to avoid mixing with startup splash)
  - If set to `0`: Prints one report at 1 minute mark and never again
  - If set to `>0`: Repeats every N minutes after the first report
- **Example**: Value of `1` = reports at 1min, 2min, 3min... | Value of `5` = reports at 1min, 6min, 11min... | Value of `0` = one report at 1min only

### Port Configuration

#### `proxy_port`
- **Type**: Integer
- **Default**: `8999`
- **Purpose**: Port where reverse proxy (ngrok/localtunnel) listens
- **Used by**:
  - `launch_proxy.js` - PROXY_PORT_FROM_CONFIG
  - `launch_servers.js` - Included in cleanup list
- **Constraint**: Must not conflict with hub/game ports (9000-11005 range)

#### `max_ports_in_each_range`
- **Type**: Integer
- **Default**: `5`
- **Purpose**: Maximum number of game ports to scan in each range (PROD, DEV, DEV-VITE)
- **Used by**:
  - `launch_proxy.js` - NUM_PORTS (generates port arrays)
  - `launch_servers.js` - NUM_PORTS (cleanup port list)
  - `clone_project.js` - (implicitly, through game numbering)
- **Impact**: Controls how many games can run simultaneously
  - Value `5` = Support games 1-5 (plus hub=0)
  - Value `10` = Support games 1-10 (plus hub=0)

#### `first_port_in_prod_range`
- **Type**: Integer
- **Default**: `9000`
- **Purpose**: Starting port for PROD range (production backend + frontend)
- **Used by**:
  - `launch_proxy.js` - FIRST_PORT_PROD (hub port + game ports 9001-9005)
  - `launch_servers.js` - FIRST_PORT_PROD (cleanup list)
  - `clone_project.js` - FIRST_PORT_PROD (port calculations)
- **Port allocation**:
  - Hub: `9000` (game_number = 0)
  - Games: `9001-9005` (game_number = 1-5)

#### `first_port_in_dev_range`
- **Type**: Integer
- **Default**: `10000`
- **Purpose**: Starting port for DEV range (backend dev mode)
- **Used by**:
  - `launch_proxy.js` - FIRST_PORT_DEV (hub port + game ports 10001-10005)
  - `launch_servers.js` - FIRST_PORT_DEV (cleanup list)
  - `clone_project.js` - FIRST_PORT_DEV (port calculations)
  - `wordguess/server/index.js` - FIRST_PORT_DEV (Vite detection)
- **Port allocation**:
  - Hub backend: `10000` (game_number = 0)
  - Game backends: `10001-10005` (game_number = 1-5)

#### `first_port_in_dev_vite_range`
- **Type**: Integer
- **Default**: `11000`
- **Purpose**: Starting port for DEV-VITE range (frontend dev-vite mode with HMR)
- **Used by**:
  - `launch_proxy.js` - FIRST_PORT_DEV_VITE (hub port + game ports 11001-11005)
  - `launch_servers.js` - FIRST_PORT_DEV_VITE (cleanup list)
  - `clone_project.js` - FIRST_PORT_DEV_VITE (port calculations)
  - `wordguess/server/index.js` - FIRST_PORT_DEV_VITE (Vite detection)
- **Port allocation**:
  - Hub frontend: `11000` (game_number = 0)
  - Game frontends: `11001-11005` (game_number = 1-5)

---

## Files That Read This Configuration

### Command Line Scripts

1. **`launch_servers.js`**
   - Reads: All fields
   - Purpose: Launches all servers with correct timing and port cleanup
   - Line: ~94-103

2. **`launch_proxy.js`**
   - Reads: All port fields + `server_setup_delay`
   - Purpose: Scans correct port ranges for active servers
   - Line: ~14-22

3. **`clone_project.js`**
   - Reads: All port range fields
   - Purpose: Assigns correct ports to newly cloned game projects
   - Line: ~31-36

### Server Code

4. **`wordguess/server/index.js`**
   - Reads: `first_port_in_dev_range`, `first_port_in_dev_vite_range`
   - Purpose: Dynamically computes Vite frontend port from backend port
   - Line: ~29-33

---

## Port Range Architecture

### Three Tiers of Deployment

| Tier | Range Start | Purpose | Example Ports |
|------|-------------|---------|---------------|
| **PROD** | 9000 | Production backend + frontend (built) | Hub: 9000<br>Games: 9001-9005 |
| **DEV** | 10000 | Development backend (nodemon) | Hub: 10000<br>Games: 10001-10005 |
| **DEV-VITE** | 11000 | Development frontend (Vite HMR) | Hub: 11000<br>Games: 11001-11005 |

### Port Calculation Formula

```javascript
// Hub (game_number = 0)
prodPort    = first_port_in_prod_range + 0        // 9000
devPort     = first_port_in_dev_range + 0         // 10000
devVitePort = first_port_in_dev_vite_range + 0    // 11000

// Game N (game_number = 1 to max_ports_in_each_range)
prodPort    = first_port_in_prod_range + N        // 9001-9005
devPort     = first_port_in_dev_range + N         // 10001-10005
devVitePort = first_port_in_dev_vite_range + N    // 11001-11005
```

---

## Common Configuration Changes

### Scenario 1: Support More Games (10 instead of 5)

**Change**:
```json
"max_ports_in_each_range": 10
```

**Effect**:
- Proxy will scan ports 9001-9010, 10001-10010, 11001-11010
- `launch_servers.js` will clean up ports 9001-9010, 10001-10010, 11001-11010
- Can now create games numbered 1-10

### Scenario 2: Servers Need More Startup Time

**Change**:
```json
"server_setup_delay": 20
```

**Effect**:
- Proxy waits 20 seconds (instead of 15) before scanning
- Total wait time becomes 20 + 10 = 30 seconds
- Reduces risk of proxy missing slow-starting servers

### Scenario 3: Use Different Port Ranges (Avoid Conflicts)

**Problem**: Ports 9000-11005 conflict with another service

**Change**:
```json
"first_port_in_prod_range": 12000,
"first_port_in_dev_range": 13000,
"first_port_in_dev_vite_range": 14000
```

**Effect**:
- PROD: 12000-12005
- DEV: 13000-13005
- DEV-VITE: 14000-14005
- All scripts automatically use new ranges

### Scenario 4: Change Proxy Port

**Problem**: Port 8999 conflicts with another service

**Change**:
```json
"proxy_port": 7999
```

**Effect**:
- Reverse proxy listens on port 7999 instead of 8999
- All scripts automatically use new proxy port

---

## Best Practices

### 1. **Always Edit This File, Never Hardcode**
If you're tempted to hardcode a port number or timing value, ask: "Should this be in `transverse_configs.json`?"

### 2. **Restart After Changes**
Changes to `transverse_configs.json` require restarting all servers:
```bash
# Kill all servers
launch_servers.js --deployment=ngrok --mode=dev-vite wordguess
```

### 3. **Validate Port Ranges**
Ensure no overlap between ranges:
- PROD range: `first_port_in_prod_range` to `first_port_in_prod_range + max_ports_in_each_range`
- DEV range: `first_port_in_dev_range` to `first_port_in_dev_range + max_ports_in_each_range`
- DEV-VITE range: `first_port_in_dev_vite_range` to `first_port_in_dev_vite_range + max_ports_in_each_range`
- Proxy port must be outside all ranges

### 4. **Document Why You Changed Something**
If you change a value from its default, add a comment explaining why:
```json
{
  "server_setup_delay": 25,
  "comments": {
    "server_setup_delay": "Increased to 25s because WordGuess backend takes 18s to initialize Firebase Admin SDK on slow VPS"
  }
}
```

---

## Troubleshooting

### Problem: Proxy Only Sees Some Servers

**Possible Cause**: `server_setup_delay` too short

**Solution**:
1. Check server logs to see how long each server takes to start
2. Increase `server_setup_delay` to exceed slowest server's startup time
3. Add buffer of +5 seconds for safety

### Problem: Port Conflict Errors

**Possible Cause**: Another service using TransVerse ports

**Solution**:
1. Identify which ports are in use: `netstat -ano | findstr :9000` (Windows) or `lsof -i :9000` (macOS/Linux)
2. Change `first_port_in_*_range` values to unused ranges
3. Ensure `proxy_port` doesn't conflict with new ranges

### Problem: Game Doesn't Appear in Proxy

**Possible Cause**: Game number exceeds `max_ports_in_each_range`

**Solution**:
1. Check game's `game_number` in `public/fb_hub_data/game_info.json`
2. If game_number > `max_ports_in_each_range`, increase the limit
3. Restart all servers

---

## Related Documentation

- **`CLAUDE.md`**: Development commands and project overview
- **`command_line_scripts/launch_servers.js`**: Server launch orchestration
- **`command_line_scripts/launch_proxy.js`**: Reverse proxy management
- **`command_line_scripts/clone_project.js`**: Game project cloning utility

---

## Implementation History

**Date**: October 2024
**Motivation**: Proxy was missing WordGuess backend due to hardcoded `server_setup_delay=10` being too short. User suggested centralizing all timing and port configuration.

**Files Modified**:
1. `transverse_configs.json` - Created with all configuration fields
2. `launch_servers.js` - Replaced 6 hardcoded values
3. `launch_proxy.js` - Replaced 5 hardcoded values
4. `clone_project.js` - Replaced 9 hardcoded port calculations
5. `wordguess/server/index.js` - Replaced 2 hardcoded port values

**Result**: Successfully detected all 4 servers (hub backend, hub frontend, WordGuess backend, WordGuess frontend) after increasing `server_setup_delay` from 10 to 15.
