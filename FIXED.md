# Fixed Bugs - TransVerse Project

This file tracks bugs that have been resolved. Bugs are moved here from BUGS.md when fixed.

Format: Most recent fixes at the bottom (append new fixes as they are resolved).

---

## Fixed: Audio Distortion and Accumulation During Rapid Gameplay

**Fixed Date:** 2025-10-31
**Fixed By:** Implementing proper audio player reuse architecture

**What Was Fixed:**
The root cause was audio element accumulation - every time a choice feedback sound (hmm, sad trombone, cheering) or spoken word was played, a NEW HTMLAudioElement was created and never destroyed. Additionally, `loadPhaseMusic()` was applying Web Audio API gain attributes incorrectly when reusing the background music player.

**Solution:**
Implemented three single-use audio players per client:
1. `backgroundMusicRef` - ONE player for phase background music
2. `choiceFeedbackAudioRef` - ONE player for choice feedback sounds (hmm, sad trombone, cheering)
3. `spokenPhraseAudioRef` - ONE player for word pronunciations

Each player reuses the same HTMLAudioElement by:
- Pausing current playback
- Swapping the `src` attribute to new audio file
- Calling `load()` and `play()`
- No new elements created = zero accumulation possible

Also fixed `loadPhaseMusic()` to use `applyAudioAttributes()` instead of direct attribute assignment, ensuring Web Audio API GainNode is properly updated.

**Result:** Rapid clicking through 20+ choices produces clean audio with zero degradation. Bug completely resolved.

**Files Modified:**
- `/c/_projects/p27_wordguess/wordguess/src/components/game-room.tsx`
  - Added `choiceFeedbackAudioRef` and `spokenPhraseAudioRef` (lines 200-201)
  - Modified `playSoundEffect()` to reuse player (lines 1508-1524)
  - Modified `playSpokenPhrase()` to reuse player (lines 1568-1583)
  - Modified `loadPhaseMusic()` to use `applyAudioAttributes()` (line 761)
  - Updated `killAllAudio()` to destroy all three players (lines 649-660)

---

**Original Bug Report:**

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

