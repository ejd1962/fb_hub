# COMPUTE_INFRASTRUCTURE.md
# TransVerse Platform - Compute Infrastructure Documentation
========================================================================

**Created:** 2025-11-02
**Purpose:** Document all computers, servers, credentials, configurations, and workarounds
**Maintained by:** Claude Code (CC) with Eric's input
**Synced to:** Google Drive at `/My Drive/CLAUDE_GEN_MD/COMPUTE_INFRASTRUCTURE.md`

**SECURITY NOTE:** This file contains passwords and access credentials. Keep private.

---

## Current Infrastructure (Nov 2025)

### Laptop A - "Eric's Traveling Laptop"
**Role:** Primary development machine, travels with Eric on 6-month trip

**Specifications:**
- OS: Windows 11
- Status: Fully functional

**Software Installed:**
- AnyDesk 9.6 (client mode - connects TO other machines)
- Node.js development environment
- TransVerse platform development tools
- Claude Code interface

**Notes:**
- Main machine for coding, communication, remote management
- Will be used to remotely manage Furnace Server during travel

---

### Laptop B - "erics_hp_laptop" (Furnace Server)
**Role:** 24/7 server hosting TransVerse hub and game servers at Shelly's house

**Location:** Shelly's basement furnace room (Nov 2025 - Apr 2026)

**Specifications:**
- Model: HP laptop (specific model TBD)
- OS: Windows 11
- Battery: REMOVED (runs on AC brick only)
- Power brick: 20 VDC output

**KNOWN ISSUES:**
- **Dim screen bug:** Physical screen stuck in power-save dim mode
  - **Cause:** Sense wire not detecting AC power (voltage divider wrong value)
  - **Current workaround:** 3x 47K resistors from RED wire to TAN/YELLOW-GREEN/WHITE wires
  - **Result:** Laptop boots and runs, but Windows thinks it's on dying battery
  - **Impact:** Screen physically dim, BUT AnyDesk shows full brightness remotely
  - **Future fix (May 2026):** Replace 47K resistors with 10K-22K resistors to properly trigger AC detection

**Power Configuration:**
- DC Jack wiring: 2x RED (20V), 2x BLACK (ground), TAN, YELLOW/GREEN, WHITE
- Sense wire: Unknown which of TAN/YELLOW-GREEN/WHITE (to be determined)
- Battery removed: Laptop MUST have brick plugged in to run
- Power settings: Never sleep, never hibernate, never shut down
- Lid behavior: Close lid = do nothing (server runs with lid closed)
- Power button: Press = display off only (does not shutdown)

**Remote Access - AnyDesk:**
- **AnyDesk ID:** 1 403 512 953
- **AnyDesk password:** 123Any456!
- **Unattended access:** ENABLED (can connect remotely without user confirmation)
- **Version:** AnyDesk 9.6 (free mode)

**Network:**
- Will be on Shelly's home WiFi
- Static IP or dynamic: TBD (Stage 2 setup)
- Port forwarding: TBD (Stage 2 setup)

**Server Software (to be installed in Stage 2/3):**
- Node.js
- TransVerse hub server (front and back)
- TransVerse game servers (wordguess, etc.)
- Proxy manager
- PM2 or similar for process management
- Auto-start on boot: TBD (Stage 3)

**BIOS Settings (to configure in Stage 2):**
- AC Power Recovery: Power On (auto-boot after power failure)
- Boot order: TBD

**Stage 1 Setup (COMPLETE - Nov 2, 2025):**
- ✓ AnyDesk installed and configured
- ✓ Unattended access enabled
- ✓ Power settings: never sleep/hibernate
- ✓ Lid close behavior: do nothing
- ✓ Tested remote connection from Laptop A

**Stage 2 Setup (at Shelly's - Nov 3, 2025):**
- [ ] Test remote connection from outside network
- [ ] Configure BIOS auto-boot on power restore
- [ ] Verify WiFi connection stable
- [ ] Document local IP address
- [ ] Test clipboard copy/paste via AnyDesk
- [ ] Install secondary remote access tool (backup)

**Stage 3 Setup (remote - weeks later):**
- [ ] Install Node.js and development tools
- [ ] Clone TransVerse repositories
- [ ] Configure auto-start for servers on boot
- [ ] Set up PM2 or similar process manager
- [ ] Configure firewall/port forwarding if needed
- [ ] Deploy alpha version of TransVerse platform
- [ ] Test with alpha testers

**Maintenance Notes:**
- Runs 24/7 with no battery (dependent on stable AC power at Shelly's)
- If power fails, will auto-boot when power restored (pending BIOS config)
- If completely non-functional, backup plan: cloud hosting (DigitalOcean, Heroku, Render, etc.)

---

## Future Infrastructure (Planned)

### Cloud Hosting (Backup/Expansion Plan)
**Purpose:** Backup if Furnace Server fails, or primary hosting for production

**Options being considered:**
- **DigitalOcean** - $5-10/month for basic VPS
- **Heroku** - Simple Node.js deployment
- **Render** - Modern Heroku alternative
- **Railway** - ~$5/month Node.js hosting
- **AWS Lightsail** - ~$5/month basic instance
- **Vercel** - Good for Node.js apps
- **Fly.io** - Good performance, simple deployment

**Decision:** TBD based on Furnace Server reliability and alpha testing needs

---

## TransVerse Platform Architecture (Current Design)

### Hub Server
- Front-end: React + Vite
- Back-end: Node.js + Express (TBD)
- Authentication: Firebase (Google OAuth + Email/Password)
- Routing: React Router v7

### Game Servers (e.g., wordguess)
- Front-end: React + Vite
- Back-end: Node.js + Express (TBD)
- Communication: Socket.io or WebSockets (TBD)

### Proxy Manager
- Routes traffic between hub and game servers
- Deployment modes: dev-vite, ngrok, localtunnel, portforward

### Launch Tools
- `launch_servers.js` - Main orchestrator
- `launch_proxy.js` - Proxy management
- See CLAUDE.md for full list of command-line tools

---

## Network Configuration

### Development (Local)
- Hub: localhost:5173 (Vite dev server)
- Game servers: Various ports (TBD)
- Proxy: Routes between services

### Production (Furnace Server or Cloud)
- External access: TBD (ngrok tunnel, port forwarding, or cloud URL)
- Domain names: TBD
- SSL certificates: TBD

---

## Access Credentials

### AnyDesk (Furnace Server)
- **ID:** 1 403 512 953
- **Password:** 123Any456!

### Firebase (Hub Authentication)
- **Config location:** `src/firebase.ts` (in p23_fb_hub repository)
- **API keys:** Committed to repository (public, but protected by Firebase security rules)
- **Google OAuth Client ID:** Hardcoded in login.tsx

### GitHub Repositories
- **Main repo:** p23_fb_hub (fb_hub)
- **Access:** Eric's GitHub account (credentials in password manager)

### Google Drive Sync
- **CLAUDE_TOOLS_MD:** `/g/My Drive/CLAUDE_TOOLS_MD/`
- **CLAUDE_GEN_MD:** `/g/My Drive/CLAUDE_GEN_MD/` (includes this file)
- **Auto-sync:** Git pre-push hook

---

## Troubleshooting

### Laptop B (Furnace Server) Won't Boot
1. Check brick is plugged in (no battery = needs brick)
2. Press power button once (don't hold, don't pump)
3. Wait 10 seconds
4. If no response, unplug brick, hold power 30 sec, replug, try again
5. Check bright white LED on side - if lit, power is flowing
6. If still no boot, battery may need reinstallation (Stage 2 decision)

### Laptop B Screen is Dim
- **This is expected** - sense wire detection not working
- Use AnyDesk to connect remotely (screen will be full brightness in AnyDesk)
- Physical screen dimness does not affect server functionality

### Cannot Connect via AnyDesk
1. Check Furnace Server is powered on (ask Shelly to check LED)
2. Check WiFi connection (may need Shelly to reconnect)
3. Try backup remote access tool (to be installed in Stage 2)
4. Last resort: Ask Shelly to plug in monitor/keyboard

### Future Fix for Dim Screen (May 2026)
1. Remove back panel from Laptop B
2. Locate three 47K resistors (RED to TAN, RED to YELLOW/GREEN, RED to WHITE)
3. Test voltage at each resistor end (sense wire reads ~20V)
4. Replace 47K on sense wire with 10K or 22K resistor
5. Remove other two resistors (LED wires don't need them)
6. Reinstall battery
7. Test - Windows should now detect AC power and run full brightness

---

## Emergency Contacts

### Shelly (Furnace Server Host)
- **Location:** Stittsville/Ottawa area
- **Role:** Physical access to Furnace Server if needed
- **Contact:** Facebook Messenger (primary)

### Eric (Owner/Developer)
- **During trip (Nov 2025 - Apr 2026):**
  - Facebook Messenger: www.facebook.com/ericdormer1962
  - WhatsApp: +66 93 752 8306
  - Email: EricDormer1962@gmail.com

---

## Maintenance Log

**2025-11-02 (Stage 1 Setup):**
- Laptop B battery removed due to boot issues
- Discovered dim screen bug (sense wire detection failure)
- Attempted fix with 3x 47K resistors (partial success - boots but still dim)
- Installed AnyDesk 9.6 with unattended access
- Configured power settings: never sleep/hibernate
- Tested remote connection from Laptop A
- READY FOR DEPLOYMENT to Shelly's furnace room

**Future entries to be added as infrastructure evolves...**

---

**For cottage/property info, see OTTER_LAKE_COTTAGE_COMPOUND_INFO.md**
**For family/friends, see FAMILY_AND_FRIENDS.md**
**For personal health, see PERSONAL_INFO.md**
**For trip details, see TRIP_WINTER_2025_2026.md**
