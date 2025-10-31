# Bug Tracking - TransVerse Project

## Status Legend
- 🔴 **CRITICAL** - Blocks core functionality
- 🟡 **HIGH** - Important but has workaround
- 🟢 **MEDIUM** - Quality of life improvement
- 🔵 **LOW** - Minor cosmetic issue

## Open Bugs

### 🟡 HIGH - Firebase OAuth Domain Authorization
**Component:** fb_hub - Authentication
**Discovered:** 2025-10-28
**Status:** Open (Workaround: Use email/password instead)

**Description:**
Google OAuth sign-in fails when accessing via ngrok because the ngrok domain is not in Firebase's authorized domains list.

**Error Message:**
```
The current domain is not authorized for OAuth operations. Add your domain (postvertebral-unsceptically-kristel.ngrok-free.dev) to the OAuth redirect domains list in the Firebase console -> Authentication -> Settings -> Authorized domains tab.
```

**Impact:**
- ❌ Google OAuth sign-in doesn't work
- ✅ Email/Password authentication works fine

**Root Cause:**
ngrok generates random domains on each restart (e.g., `postvertebral-unsceptically-kristel.ngrok-free.dev`). Firebase requires all OAuth redirect domains to be pre-authorized.

**Resolution Options:**
1. **Upgrade ngrok to paid plan** - Get fixed subdomain (e.g., `transverse.ngrok.io`)
2. **Use localtunnel** - Allows custom subdomains (already have `launch_localtunnel.js`)
3. **Manually add domain** - Add current ngrok domain to Firebase console (temporary, breaks on ngrok restart)

**Recommended Fix:** Switch to localtunnel for demos, or upgrade ngrok for production

---

### 🟢 MEDIUM - Production Server Health Check Fails
**Component:** fb_hub - Lobby
**Discovered:** 2025-10-28
**Status:** Open (Not breaking functionality)

**Description:**
Lobby health check attempts to check port 9001 (production server) which doesn't exist in dev mode, generating console errors.

**Error Message:**
```
Production server for game 1 not available: FATAL: No proxy route found for port 9001. Proxy mode is enabled but port 9001 is not configured in reverse_proxy.json.
```

**Impact:**
- Console noise (appears once per minute due to health check)
- No functional impact - just a warning

**Location:** `C:\_projects\p23_fb_hub\fb_hub\src\lobby.tsx:116`

**Resolution Options:**
1. Skip production server check when MODE === 'development'
2. Suppress the error message (change from console.log to debug-only)
3. Make error message less alarming (remove "FATAL")

**Recommended Fix:** Skip production server check in dev mode

---

### 🔵 LOW - Vite HMR WebSocket Connection Failures
**Component:** fb_hub & wordguess - Development Environment
**Discovered:** 2025-10-28
**Status:** Open (Dev-only, not affecting functionality)

**Description:**
Vite's Hot Module Replacement (HMR) WebSocket connections fail when using ngrok proxy.

**Error Message:**
```
WebSocket connection to 'wss://postvertebral-unsceptically-kristel.ngrok-free.dev/localhost_11000/?token=...' failed
[vite] failed to connect to websocket
```

**Impact:**
- ⚠️ Hot reload may not work (requires manual page refresh)
- ✅ Application functionality unaffected
- Console noise at startup

**Root Cause:**
Vite HMR doesn't know how to connect through the ngrok proxy WebSocket

**Resolution Options:**
1. Configure Vite HMR settings in `vite.config.ts` to work with proxy
2. Ignore (dev-only, doesn't affect production)
3. Disable HMR warnings in dev mode

**Recommended Fix:** Ignore for alpha, configure properly post-alpha

---

### 🔵 LOW - Duplicate Environment Display
**Component:** fb_hub - Development Environment
**Discovered:** 2025-10-28
**Status:** Open (Cosmetic only)

**Description:**
Environment configuration banner displays twice in console on page load.

**Location:** `display-environment.ts:31-53`

**Impact:**
- Console clutter
- No functional impact

**Root Cause:**
Likely called from two different components or double-rendering in React StrictMode

**Recommended Fix:** Investigate component calling pattern, ensure single invocation

---

### 🔵 LOW - GameBanner Username Warning
**Component:** shared_components - GameBanner
**Discovered:** 2025-10-28
**Status:** Open (Cosmetic only)

**Description:**
GameBanner logs "No username found" warning during initial render, even though username displays correctly afterward.

**Location:** `game-banner.tsx:211`

**Impact:**
- Console noise
- Banner displays correctly (shows "SuperEric")

**Root Cause:**
Timing issue - banner checks for username before it arrives from async auth flow

**Recommended Fix:** Add conditional check or suppress warning if username loads successfully

---

## Resolved Bugs

### ✅ RESOLVED - Health Check Request Loop Causing ngrok Rate Limit
**Component:** fb_hub - Lobby
**Discovered:** 2025-10-28
**Resolved:** 2025-10-28

**Description:**
Health checks ran every 2.5 seconds, causing 72+ requests/minute and hitting ngrok's 360 req/min limit.

**Resolution:**
Changed health check interval from 2.5 seconds to 60 seconds in `lobby.tsx:230`

**Impact After Fix:**
- Reduced from 72 requests/minute to 3 requests/minute per game
- No more ngrok rate limiting

---

### ✅ RESOLVED - Async/Await Syntax Error in speakWords Function
**Component:** wordguess - game-room.tsx
**Discovered:** 2025-10-28
**Resolved:** 2025-10-28

**Description:**
Added `await` to call `playCachedPhrasesWithGain()` but forgot to make parent function `async`.

**Error Message:**
```
await isn't allowed in non-async function (line 1754)
```

**Resolution:**
Changed `const speakWords = () => {` to `const speakWords = async () => {` at line 1746

---

## Feature Requests / Post-Alpha Improvements

### 📋 POST-ALPHA - Multilingual Text-to-Speech
**Component:** wordguess
**Documented:** CLAUDE.md

See `C:\_projects\p27_wordguess\wordguess\CLAUDE.md` section "Multilingual Text-to-Speech (POST-ALPHA Feature)" for full details.

**Summary:**
- Use Web Speech API for Southeast Asian language pronunciation
- Implement language detection for `SpeechSynthesisUtterance.lang`
- Test quality before considering Google Cloud TTS API

---

## Bug Reporting Template

When adding new bugs, use this format:

```markdown
### 🔴 PRIORITY - Brief Title
**Component:** project - specific component
**Discovered:** YYYY-MM-DD
**Status:** Open / In Progress / Resolved

**Description:**
What's broken and why it matters

**Error Message:**
```
Paste error here if applicable
```

**Impact:**
- What works / doesn't work
- User-facing effects

**Location:** File path and line numbers

**Root Cause:**
Technical explanation

**Resolution Options:**
1. Option 1
2. Option 2

**Recommended Fix:** Best approach
```

---

## WordGuess Game Bugs

### 🟡 HIGH - Audio Distortion and Accumulation During Rapid Gameplay
**Component:** wordguess - game-room.tsx
**Discovered:** 2025-10-31
**Status:** PATCHED (kludge), root cause not fixed

**Description:**
When rapidly clicking through choices during guessing phase, audio becomes chunky, halting, and crunchy within 5-10 turns. Audio elements accumulate and bog down the client.

**Symptoms:**
- Crunchy, distorted audio when transitioning from celebrate to guessing with new theme
- Audio halts and replays
- Multiple audio streams playing simultaneously
- Chrome performance warnings about slow tabs
- Audio accumulation during rapid clicking (hmm, sad trombone, cheering sounds)

**Root Cause #1: Inconsistent Attribute Application in loadPhaseMusic()**
In `loadPhaseMusic()`, when reusing an existing audio element:

```javascript
if (backgroundMusicRef.current) {
  backgroundMusicRef.current.src = musicPath;
  // BUG: Attributes applied directly, bypassing applyAudioAttributes()
  for (const [key, value] of Object.entries(attributes)) {
    if (key !== 'file') {
      (backgroundMusicRef.current as any)[key] = value;
    }
  }
}
```

**Problems:**
1. `gain` attribute is set directly on HTMLAudioElement (which has no `gain` property)
2. Web Audio API GainNode is NOT updated with new gain value
3. Over multiple phase transitions, Web Audio nodes get into inconsistent states
4. The `else` branch (new element creation) properly calls `applyAudioAttributes()`

**Root Cause #2: Audio Element Accumulation**
Audio elements may accumulate in DOM if:
- `backgroundMusicRef.current` becomes null due to error
- Race condition causes multiple `loadPhaseMusic()` calls
- Old elements never destroyed, just replaced in ref
- Sound effects during rapid clicking create new audio players each time instead of reusing

**Current Workaround (Kludge Patch)**
Server-controlled audio cleanup via `destroyAudioPlayers` field:
- Server sends `destroyAudioPlayers: true` in `sc_set_phase` when leaving celebrate phase
- Client's `killAllAudio()` function destroys ALL audio elements and Web Audio nodes
- Clears soundEffects Map
- Forces creation of fresh audio elements with proper attribute handling
- **Side effect:** 5-10ms latency on first sound effect after leaving celebrate

**Locations:**
- Server: `/c/_projects/p27_wordguess/wordguess/server/index.js:308,2613,2633,2644`
- Client: `/c/_projects/p27_wordguess/wordguess/src/components/game-room.tsx:636-673,885-889`

**Proper Fix (TODO)**
1. Update the reuse path to use `applyAudioAttributes()`:
```javascript
if (backgroundMusicRef.current) {
  backgroundMusicRef.current.src = musicPath;
  backgroundMusicRef.current.load();
  // FIX: Use applyAudioAttributes instead of direct assignment
  applyAudioAttributes(backgroundMusicRef.current, attributes);
  await backgroundMusicRef.current.play();
}
```

2. Always destroy old audio element before creating new one:
```javascript
if (backgroundMusicRef.current) {
  destroyAudio(backgroundMusicRef.current);
  backgroundMusicRef.current = null;
}
const audio = createAudioWithGain(musicPath, attributes.gain);
```

3. Implement single audio player reuse for choice selection feedback (hmm, sad trombone, cheering):
   - Create one shared audio player for choice feedback sounds
   - When new sound needed, immediately abort current sound and start new one
   - No accumulation, just one player switching between sounds

**Testing Plan:**
1. Remove server-controlled killAllAudio() mechanism
2. Apply proper fixes above
3. Test: celebrate → welcome (verify music plays)
4. Test: celebrate → guessing with theme change (verify no distortion)
5. Test: rapid clicking through 20+ choices (verify no audio accumulation)
6. Monitor Chrome performance over multiple phase transitions

---

### 🟡 HIGH - Choice Arrangement Not Sufficiently Random
**Component:** wordguess - Server choice generation
**Discovered:** 2025-10-31
**Status:** Open

**Description:**
When rapidly clicking the first 2 choices every turn, the correct answer appears in the first 2 positions more than 50% of the time. The random arrangement algorithm is not providing uniform distribution.

**Impact:**
- Players can exploit the bias by always choosing first 2 positions
- Reduces difficulty and game challenge
- Not truly random

**Location:** `/c/_projects/p27_wordguess/wordguess/server/index.js` (choice generation/shuffling logic)

**Root Cause:**
Unknown - need to examine the shuffling algorithm used to arrange choices

**Recommended Fix:**
1. Locate the choice shuffling code in server
2. Verify it uses proper Fisher-Yates shuffle or equivalent
3. Test distribution over 1000+ samples to verify uniform randomness
4. Consider seeding with crypto.randomBytes() for better entropy

---

### 🟢 MEDIUM - Sound Effects Map Memory Leak
**Component:** wordguess - game-room.tsx
**Discovered:** 2025-10-31
**Status:** PATCHED (kludge)

**Description:**
`roomState.soundEffects` Map accumulates audio elements over time. Intentional caching for performance, but paused elements never destroyed.

**Impact:**
- Minor memory leak
- Not serious, but wastes memory over long sessions

**Current Workaround:**
`killAllAudio()` clears the Map when leaving celebrate (server-controlled).

**Proper Fix (TODO):**
Implement LRU cache or periodic cleanup:
- Keep frequently used effects
- Destroy effects unused for >5 minutes
- Or destroy all on room change

---

