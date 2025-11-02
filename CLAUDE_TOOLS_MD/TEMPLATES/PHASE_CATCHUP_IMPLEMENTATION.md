# Phase Catchup Implementation Template

Use this template when implementing a late-join catchup system for a phase-based multiplayer game.

---

## Planning Template

### Game Information

**Game Name:** [e.g., "WordGuess", "TicTacToe", "DrawAndGuess"]

**Phase Sequence:** [List in order, separated by →]
- Example: `welcome → waiting → guessing → reveal → celebrate`

**Essential Messages Per Phase:** [For EACH phase, list messages needed]

```
Phase 1 ([phase name]):
  - [message name] with [required data fields]
  - [additional message] with [data]

Phase 2 ([phase name]):
  - [message name] with [required data fields]
  - [additional message] with [data]

Phase 3 ([phase name]):
  - [message name] with [required data fields]

... continue for all phases
```

**State to Store for Catchup:** [List roomState fields needed]

```javascript
// Phase 1 data
roomState.[field1]
roomState.[field2]

// Phase 2 data
roomState.[field3]
roomState.[field4]

// Phase 3 data
roomState.[field5]

// ... etc
```

**Files to Modify:**
- Server: [path to server file, e.g., server/index.js]
- Client: [path to client file if changes needed, e.g., src/components/game-room.tsx]

---

## Full Request to Claude Code

Copy this template, fill in the brackets, and paste into Claude Code:

```
I need to implement a phase catchup system for late-joining players in [game name].

Phase sequence: [list phases separated by →]

Essential messages per phase:
[paste your phase messages list from above]

State to store for catchup:
[paste your roomState fields from above]

Files to modify:
- Server: [path]
- Client: [path] (if needed)

Please:
1. Add CATCHUP_MESSAGE_DELAY_MS constant (start with 10ms)
2. Create catchupJoiningPlayer() function with clear if-endif structure for each phase
3. Add roomState fields to store catchup data
4. Update each phase entry handler to store catchup data when entering that phase
5. Replace single-phase send in join handler with catchup call
6. Add comprehensive logging at each catchup step

Follow the TransVerse Phase Catchup Pattern from CLAUDE_CODE.md.
```

---

## Examples

### Example 1: WordGuess Game

**Game Name:** WordGuess

**Phase Sequence:** `welcome → waiting → guessing → reveal → celebrate`

**Essential Messages Per Phase:**

```
waiting:
  - sc_set_phase (waiting) with userId of active player

guessing:
  - sc_set_phase (guessing) with targetWord, choices_list
  - sc_set_highlights with current highlights_list from active player

reveal:
  - sc_set_phase (reveal) with availablePoints, actualPointsEarned

celebrate:
  - sc_set_phase (celebrate) with winnerUserId, winnerUsername, winnerScore
```

**State to Store:**

```javascript
// Guessing phase
roomState.currentTargetWord
roomState.currentChoicesList
roomState.currentHighlights

// Reveal phase
roomState.lastRevealAvailablePoints
roomState.lastRevealActualPointsEarned

// Celebrate phase
roomState.celebrateWinnerUserId
roomState.celebrateWinnerUsername
roomState.celebrateWinnerScore
```

**Files:** server/index.js

**Full Request:**

```
I need to implement a phase catchup system for late-joining players in WordGuess.

Phase sequence: welcome → waiting → guessing → reveal → celebrate

Essential messages per phase:
waiting:
  - sc_set_phase (waiting) with userId of active player

guessing:
  - sc_set_phase (guessing) with targetWord, choices_list
  - sc_set_highlights with current highlights_list from active player

reveal:
  - sc_set_phase (reveal) with availablePoints, actualPointsEarned

celebrate:
  - sc_set_phase (celebrate) with winnerUserId, winnerUsername, winnerScore

State to store for catchup:
roomState.currentTargetWord
roomState.currentChoicesList
roomState.currentHighlights
roomState.lastRevealAvailablePoints
roomState.lastRevealActualPointsEarned
roomState.celebrateWinnerUserId
roomState.celebrateWinnerUsername
roomState.celebrateWinnerScore

Files to modify:
- Server: server/index.js

Please:
1. Add CATCHUP_MESSAGE_DELAY_MS constant (start with 10ms)
2. Create catchupJoiningPlayer() function with clear if-endif structure for each phase
3. Add roomState fields to store catchup data
4. Update each phase entry handler to store catchup data when entering that phase
5. Replace single-phase send in join handler with catchup call
6. Add comprehensive logging at each catchup step

Follow the TransVerse Phase Catchup Pattern from CLAUDE_CODE.md.
```

### Example 2: Simple Turn-Based Game

**Game Name:** TicTacToe

**Phase Sequence:** `lobby → playing → gameover`

**Essential Messages Per Phase:**

```
lobby:
  - sc_set_phase (lobby) with player count

playing:
  - sc_set_phase (playing) with board state, current turn player
  - sc_board_update with current board array

gameover:
  - sc_set_phase (gameover) with winner, final board state
```

**State to Store:**

```javascript
// Playing phase
roomState.boardState
roomState.currentTurnPlayer

// Gameover phase
roomState.gameoverWinner
roomState.gameoverFinalBoard
```

---

## Implementation Checklist

After Claude Code implements the catchup system, verify:

- [ ] CATCHUP_MESSAGE_DELAY_MS constant added at top of server file
- [ ] catchupJoiningPlayer() function created with clear if-endif blocks for each phase
- [ ] Each if-endif block has comprehensive logging
- [ ] roomState fields added for all catchup data
- [ ] Each phase entry handler stores catchup data immediately
- [ ] Join handler calls catchupJoiningPlayer() instead of single phase send
- [ ] Function is async and uses await sleep(CATCHUP_MESSAGE_DELAY_MS) after EVERY message
- [ ] Early returns when target phase reached (no unnecessary messages sent)

---

## Testing Checklist

Test ALL these scenarios after implementation:

- [ ] Join during phase 1 (earliest non-welcome phase)
- [ ] Join during phase 2
- [ ] Join during phase 3
- [ ] Join during final phase
- [ ] Multiple players join in rapid succession (< 100ms apart)
- [ ] Join, leave immediately, rejoin (catchup works every time)
- [ ] Join while active player is mid-action
- [ ] Verify server logs show all catchup steps
- [ ] Verify joining player sees correct state (UI matches active players)
- [ ] Verify no race conditions or out-of-order message processing

---

## Common Mistakes to Avoid

When implementing catchup, watch out for:

❌ **Forgetting delay after a message** - EVERY message needs a delay
❌ **Using wrong target phase** - Must match active player's current phase
❌ **Not storing catchup data** - Store immediately when entering each phase
❌ **Storing stale data** - Always use most recent values
❌ **Complex branching** - Keep if-endif structure simple and clear
❌ **Missing logging** - Log every step for debugging
❌ **Hardcoding phase data** - Always use roomState values

✅ **Delay after every message**
✅ **Clear if-endif structure**
✅ **Store data on phase entry**
✅ **Comprehensive logging**
✅ **Use roomState for all data**

---

## Reference Implementation

See working example in:
- **WordGuess**: `C:\_projects\p27_wordguess\wordguess\server\index.js` lines 1576-1669
- **Pattern documentation**: `/g/My Drive/CLAUDE/CLAUDE_CODE.md` TransVerse Architectural Patterns section

---

