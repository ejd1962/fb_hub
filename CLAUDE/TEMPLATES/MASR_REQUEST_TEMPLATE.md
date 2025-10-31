# MASR Request Template

Use this template when requesting a Message-Action-Sequence-Report from Claude Code.

---

## Template

**Scenario:** [Brief description of what's happening]

**Actors:** [List all players/clients involved]
- Example: "BigEric (active player in guessing phase), Cranberry (joining from welcome phase)"

**Entry Point:** [User action that starts the sequence, with file:line reference]
- Example: "User clicks 'Join Game' button (game-room.tsx:2148)"

**Files:** [List relevant files]
- Server: server/index.js
- Client: src/components/game-room.tsx
- Docs: SOCKET_MESSAGES_REFERENCE.md

**Focus:** [Specific aspect to highlight]
- Example: "How highlights and game state are synchronized"

**Initial State:** [Optional - describe starting conditions]
- Example: "BigEric in guessing phase with 2 wrong guesses (yellow, red highlights), Cranberry in welcome phase viewing Join Game button"

---

## Full Request to Claude Code

Copy this template, fill in the brackets, and paste into Claude Code:

```
Generate a MASR for: [scenario]

Actors: [list players/clients]

Entry point: [action with file:line]

Files:
- [file 1]
- [file 2]
- [file 3]

Focus: [specific aspect]

Initial state: [starting conditions]
```

---

## Examples

### Example 1: Join Game Feature

```
Generate a MASR for: Player joins game while another player is in guessing phase

Actors: BigEric (active player in guessing phase), Cranberry (joining from welcome phase)

Entry point: Cranberry clicks "Join Game" button (game-room.tsx:2148)

Files:
- server/index.js (cs_join_game handler)
- game-room.tsx (join button, sc_set_phase handlers)
- SOCKET_MESSAGES_REFERENCE.md

Focus: How highlights and game state are synchronized to late-joining player

Initial state: BigEric has clicked 2 wrong images (yellow, red highlights), Cranberry is in welcome phase
```

### Example 2: Turn Ending

```
Generate a MASR for: Active player ends their turn and next player begins

Actors: BigEric (current active player, completing turn), Cranberry (next player)

Entry point: BigEric clicks "End My Turn" button (game-room.tsx:1892)

Files:
- server/index.js (cs_end_of_turn handler, cs_request_guessing_phase handler)
- game-room.tsx (end turn button, phase transition handlers)

Focus: How active player status transfers from one player to the next

Initial state: BigEric in reveal phase with turn complete, Cranberry in waiting phase
```

### Example 3: Highlight Synchronization

```
Generate a MASR for: Active player clicks an image and highlights sync to non-active players

Actors: BigEric (active player clicking image), Cranberry (non-active player watching)

Entry point: BigEric clicks image #2 (wrong answer) (game-room.tsx:2421)

Files:
- game-room.tsx (handleImageClick function, sc_set_highlights handler)
- server/index.js (cs_set_highlights handler)

Focus: Real-time synchronization of highlight state from active to non-active players

Initial state: BigEric in guessing phase with 1 prior wrong guess (yellow on image #0), Cranberry watching in guessing phase
```

---

## Tips for Effective MASR Requests

1. **Be specific about actors** - Name each player and their role/state
2. **Include exact file:line for entry point** - Makes it easy to trace
3. **List ALL relevant files** - Server handlers, client handlers, docs
4. **Focus on ONE aspect** - Highlighting, phase transitions, scoring, etc.
5. **Describe initial state clearly** - Prevents ambiguity
6. **Use real player names** - BigEric, Cranberry, etc. (makes it concrete)
7. **Specify message names** - cs_join_game, sc_set_highlights, etc.

---

## What You'll Get Back

Claude Code will generate a detailed report with:

1. **Scenario Description** - Summary of what's happening
2. **Initial State** - All actors, their phases, relevant data
3. **Message-Action Sequence** - Step by step breakdown:
   - Client actions (what triggered, what changed)
   - Server receives (validation, processing)
   - Server sends (to whom, what messages)
   - Clients receive (how each client processes)
4. **Final State** - Result after sequence completes
5. **Key Design Points** - Insights, gotchas, why it works

This MASR will make bugs obvious and serve as living documentation.

---

