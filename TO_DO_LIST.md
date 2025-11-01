# TO_DO_LIST.md
# Eric's Pre-Departure Triage and Task Tracking
========================================================================

**Created:** 2025-11-02 03:30 AM (Saturday)
**Purpose:** Master triage list for all tasks between NOW and O-time (and beyond)
**Maintained by:** Claude Code (CC) with Eric's input

---

## Timeline - Critical Deadlines

- **NOW:** Saturday Nov 2, 3:30 AM
- **O-TIME (Otter Lake Departure):** Sunday Nov 3, 3:00 PM (35 hours from now)
- **S-TIME (Stittsville/Ottawa Departure):** Monday Nov 4, 11:00 AM
- **B-TIME (Boston Departure/Flight):** Tuesday Nov 5, 4:00 PM
- **Trip Duration:** 6 months (returning end of April 2026)

---

## Triage Categories

### 🔴 RED - MUST DO BEFORE O-TIME
Tasks that CANNOT be delayed or done remotely. If these don't get done, there are serious consequences (cottage damage, can't access servers remotely, trip is blocked, etc.)

### 🟡 YELLOW - SHOULD DO IF TIME PERMITS
Important tasks that would be beneficial to complete, but can be worked around or delayed if time runs short.

### 🟢 GREEN - CAN DO REMOTELY AFTER O-TIME
Tasks that can be completed from anywhere with internet access (Portugal, Vietnam, etc.) via remote access to Furnace Server.

---

## Documentation Standards

**Task Format:**
```
- [ ] Task description
  - **Deadline:** [O-time | S-time | B-time | Remote OK]
  - **Time estimate:** [X minutes/hours]
  - **Why critical:** [Explanation]
  - **Blocker for:** [What depends on this]
  - **Status:** [Not started | In progress | Blocked | Complete]
```

**Update Protocol:**
- CC updates this file as tasks are completed or status changes
- Eric provides brain dumps of new tasks or priority changes
- CC sorts tasks into RED/YELLOW/GREEN categories
- Tasks move from pending → in progress → complete

---

## 🔴 RED PRIORITY - MUST DO BEFORE O-TIME

### Laptop B (Furnace Server) - Remote Access Foundation
**If these fail, Eric cannot access Furnace Server remotely for 6 months**

- [ ] Install AnyDesk and configure auto-start on boot
  - **Deadline:** O-time (Sunday 3 PM)
  - **Time estimate:** 30 minutes
  - **Why critical:** Cannot access server remotely without this
  - **Blocker for:** All remote TGP work, all remote server management
  - **Status:** Not started

- [ ] Configure Windows to never sleep/hibernate (power settings)
  - **Deadline:** O-time (Sunday 3 PM)
  - **Time estimate:** 10 minutes
  - **Why critical:** Server must stay awake for AnyDesk access
  - **Blocker for:** Remote access reliability
  - **Status:** Not started

- [ ] Enable Windows auto-login (no password required on boot)
  - **Deadline:** O-time (Sunday 3 PM)
  - **Time estimate:** 10 minutes
  - **Why critical:** Reboots must not strand at password screen
  - **Blocker for:** Recovery from power outages
  - **Status:** Not started

- [ ] Configure BIOS auto-restart after power loss
  - **Deadline:** O-time (Sunday 3 PM)
  - **Time estimate:** 5 minutes
  - **Why critical:** Survives power outages at Shelly's basement
  - **Blocker for:** 6-month unattended operation
  - **Status:** Not started

- [ ] Transport Furnace Server (Laptop B) to Shelly's basement
  - **Deadline:** Sunday Nov 3, 3 PM (O-time)
  - **Time estimate:** 90 minute drive + 30 min setup
  - **Why critical:** Server must be physically at Shelly's before departure
  - **Blocker for:** Everything else
  - **Status:** Not started

- [ ] Verify remote access via AnyDesk from Laptop A at Shelly's
  - **Deadline:** Sunday evening (after setup at Shelly's)
  - **Time estimate:** 15 minutes
  - **Why critical:** Confirm remote access works before leaving Canada
  - **Blocker for:** Peace of mind for 6-month trip
  - **Status:** Not started

### Laptop A (Travel Laptop) - Eric's 6-Month Companion
**Details to be filled in by Eric**

- [ ] [PENDING ERIC'S INPUT: Repairs needed for Laptop A]
  - **Deadline:** TBD
  - **Time estimate:** TBD
  - **Why critical:** TBD
  - **Status:** Not started

- [ ] [PENDING ERIC'S INPUT: Configuration needed for Laptop A]
  - **Deadline:** TBD
  - **Time estimate:** TBD
  - **Why critical:** TBD
  - **Status:** Not started

- [ ] [PENDING ERIC'S INPUT: Testing needed for Laptop A]
  - **Deadline:** TBD
  - **Time estimate:** TBD
  - **Why critical:** TBD
  - **Status:** Not started

### Cottage Winterization
**Prevents freeze damage and costly repairs**

- [ ] [PENDING ERIC'S INPUT: Specific winterization tasks]
  - **Deadline:** O-time (Sunday 3 PM)
  - **Time estimate:** TBD
  - **Why critical:** Prevent freeze damage, burst pipes, etc.
  - **Status:** Not started

### Packing and Travel Prep

- [ ] [PENDING ERIC'S INPUT: Essential items to pack]
  - **Deadline:** O-time (Sunday 3 PM)
  - **Time estimate:** TBD
  - **Why critical:** Can't travel without passport, tickets, essentials
  - **Status:** Not started

---

## 🟡 YELLOW PRIORITY - SHOULD DO IF TIME PERMITS

### Documentation for Shelly

- [ ] Create simple instructions for Shelly (physical reboot, emergency contacts)
  - **Deadline:** O-time (Sunday 3 PM) - but can send via email later if needed
  - **Time estimate:** 30 minutes
  - **Why useful:** Helps Shelly help Eric if physical intervention needed
  - **Status:** Not started

### [Additional YELLOW tasks to be added as Eric identifies them]

---

## 🟢 GREEN PRIORITY - CAN DO REMOTELY AFTER O-TIME

### Laptop B (Furnace Server) - TGP Deployment
**All of these can be done remotely via AnyDesk once RED tasks are complete**

- [ ] Install Node.js, Git Bash, development tools on Laptop B
  - **Deadline:** Remote OK (anytime after O-time)
  - **Time estimate:** 1 hour
  - **Why deferred:** Can be done via AnyDesk from anywhere
  - **Status:** Not started

- [ ] Deploy TGP stack (fb_hub, wordguess, shared_components) to Laptop B
  - **Deadline:** Remote OK (anytime after O-time)
  - **Time estimate:** 2 hours
  - **Why deferred:** Can be done via AnyDesk from anywhere
  - **Status:** Not started

- [ ] Configure auto-start for TGP services on boot
  - **Deadline:** Remote OK (anytime after O-time)
  - **Time estimate:** 1 hour
  - **Why deferred:** Can be done via AnyDesk from anywhere
  - **Status:** Not started

- [ ] Set up monitoring and alerts (email/SMS for failures)
  - **Deadline:** Remote OK (anytime after O-time)
  - **Time estimate:** 2 hours
  - **Why deferred:** Can be done via AnyDesk from anywhere
  - **Status:** Not started

- [ ] Test complete TGP functionality
  - **Deadline:** Remote OK (anytime after O-time)
  - **Time estimate:** 2 hours
  - **Why deferred:** Can be done via AnyDesk from anywhere
  - **Status:** Not started

### TransVerse Passion Projects
**Code improvements, features, bug fixes - all can wait**

- [ ] [PENDING ERIC'S INPUT: Specific TransVerse items Eric is tempted to work on]
  - **Deadline:** Remote OK (can work on during 6-month trip)
  - **Why deferred:** These are passion projects, not blockers

---

## Completed Tasks ✓

### Friday Nov 1
- [x] Select hardware for Furnace Server (Laptop B chosen over desktops)
- [x] Diagnose Laptop B power issue (unreliable jack + wrong voltage brick)
- [x] Find working voltmeter and verify brick voltage (~20.5V)
- [x] Open Laptop B case and assess power jack (7-wire with LED)
- [x] Identify power wires via continuity test (RED = +20V, BLACK = ground)
- [x] Solder 20cm bypass wires to red/black power wires
- [x] Reassemble Laptop B with extension wires through jack hole
- [x] Test Laptop B - successfully boots to Windows 11
- [x] Verify login access (password: 1793)
- [x] Add password to CLAUDE_COMMON.md for future reference

---

## Brain Dump Section
**Eric uses this section to dump tasks/thoughts. CC will sort into categories above.**

[Empty - awaiting Eric's input]

---

## Time Tracking

**Total time available until O-time:** ~35 hours (as of Saturday 3:30 AM)

**Time budget estimates:**
- Cottage winterization: TBD (Eric to estimate)
- Laptop B RED tasks: ~1.5 hours
- Laptop A tasks: TBD (Eric to provide details)
- Packing/travel prep: TBD (Eric to estimate)
- Sleep/meals/breaks: ~12 hours (across 2 days)
- Buffer for unexpected issues: ~4 hours

**Remaining flexible time:** TBD (will calculate after Eric provides estimates)

---

**Last Updated:** 2025-11-02 03:35 AM by CC
