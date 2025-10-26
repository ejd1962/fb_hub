# TransVerse Platform - Caching Strategy Documentation

**Date:** October 26, 2025
**Project:** TransVerse Multi-Game Platform
**Primary Repository:** fb_hub (C:\_projects\p23_fb_hub\fb_hub)
**Related Projects:** wordguess (C:\_projects\p27_wordguess\wordguess), shared_components (C:\_projects\p20_shared_components\shared)

---

## Table of Contents
1. [Platform Architecture Overview](#platform-architecture-overview)
2. [Current Deployment Model](#current-deployment-model)
3. [Future Rollout Plans](#future-rollout-plans)
4. [JSON Caching Implementation](#json-caching-implementation)
5. [Multi-Tab Architecture Implications](#multi-tab-architecture-implications)
6. [Mobile Strategy Considerations](#mobile-strategy-considerations)

---

## Platform Architecture Overview

The TransVerse platform consists of:
- **fb_hub**: Central authentication hub and game lobby
- **Individual games**: Each game (e.g., wordguess) is a separate application
- **shared_components**: Reusable UI components and utilities shared across all projects

### User Flow:
1. User authenticates in fb_hub
2. User navigates to game lobby
3. User creates or joins a game room
4. Game room opens in a new browser tab (desktop/laptop) or same tab (mobile - future)

---

## Current Deployment Model

### Desktop/Laptop (Current Focus - October 2025):
- **Lobby Tab**: Single persistent tab running the game lobby
- **Room Tab(s)**: Each game room opens in a separate browser tab
- **Tab Lifecycle**:
  - Lobby tab stays open throughout the session (potentially hours)
  - Room tabs open when joining a room, close when leaving the room
  - User is currently limited to: 1 lobby tab + 1 room tab at a time (simplified model)

### Key Technical Constraint:
Each browser tab is a **separate JavaScript runtime** with its own memory space. Tabs cannot share cached data directly.

---

## Future Rollout Plans

### Phase 1: Current (Q4 2025)
- ✅ Desktop/laptop multi-tab architecture
- ✅ Basic game logic working
- ✅ Proxy system (localhost and ngrok) functional
- ⏸️ Layout optimization for mobile deferred
- ⏸️ Polish and aesthetics deferred

### Phase 2: Multi-Room Support (Q1 2026 - Expected)
- **Goal**: User can be in multiple game rooms simultaneously
- **Architecture**: Lobby tab + Room1 tab + Room2 tab + ... (all separate tabs)
- **Use Case**: User manages multiple concurrent games
- **Cross-Device**: User might even have rooms open on different computers/browsers

### Phase 3: Mobile Support (Target: Within 1 Month - November 2025)
- **Primary Goal**: Full mobile phone support
- **Navigation Model**: Likely single-tab navigation (Lobby → Room → Lobby)
  - Reason: Mobile browsers handle multi-tab poorly, small screen size
- **Layout Work Required**:
  - Responsive UI design for phone screens
  - Touch-friendly controls
  - Optimized layouts for portrait/landscape modes

### Phase 4: Cross-Platform Optimization (Q1-Q2 2026)
- Unified experience across desktop, tablet, mobile
- Performance optimizations for lower-powered devices
- Offline/PWA capabilities (potential)

---

## JSON Caching Implementation

### Current Cache Strategy (as of October 26, 2025):

All games use JSON files for configuration and data. These files are loaded and cached strategically to minimize network requests and improve performance.

| File | Load Trigger | Cache Location | Re-fetch Frequency | Scope |
|------|--------------|----------------|-------------------|-------|
| `audio_effects_info.json` | Once at room start | `audioEffectsInfoRef` (ref) | Never (room session) | Per room tab |
| `theme_info.json` | When theme changes | `themeInfo` (state) | Only on theme change | Per room tab |
| `info.json` (word data) | When theme changes | `info_json_data_ref` (ref) | Only on theme change | Per room tab |
| `game_info.json` | Once at room start | Not cached (used once) | Never | Per room tab |

### Implementation Details:

#### 1. `audio_effects_info.json`
**Purpose**: Central configuration for all audio effects, background music, and spoken word audio attributes (volume, loop, muted, etc.)

**Loading**:
```typescript
// Loaded in preloadSoundEffects() when room component mounts
const response = await fetch(`${PUBLIC_DIR}/game/special_effects/sounds/audio_effects_info.json`);
const audioEffectsInfo = await response.json();
audioEffectsInfoRef.current = audioEffectsInfo; // Cached in ref
```

**Usage**:
- Background music configuration (default_music array)
- Sound effects (audio_effects array)
- Spoken word audio patterns (spoken_phrases array with regex matching)

**Lifetime**: Entire room session (typically 1 hour of gameplay)

#### 2. `theme_info.json`
**Purpose**: Theme-specific configuration (title, description, rules, theme music, background images)

**Loading**:
```typescript
// useEffect with [roomTheme] dependency - runs when theme changes
const response = await fetch(`${PUBLIC_DIR}/game/${roomTheme}/theme_info.json`);
const info = await response.json();
setThemeInfo(info); // Cached in state
```

**Usage**:
- Theme-specific background music paths
- Welcome screen background/feature images
- Game rules and descriptions

**Lifetime**: Until theme changes (rare - usually once per room)

#### 3. `info.json` (Word Data)
**Purpose**: All game content for a theme (words, images, audio files)

**Loading**:
```typescript
// Loaded in sc_set_theme socket event handler
const response = await fetch(`${PUBLIC_DIR}/game/${room_theme}/info.json`);
const themeInfo = await response.json();
info_json_data_ref.current = themeInfo.word_data; // Cached in ref
```

**Usage**:
- Word choices for each round
- Image-to-word mappings
- Audio file paths

**Lifetime**: Until theme changes

#### 4. `game_info.json`
**Purpose**: Game metadata (game name for Firebase logging)

**Loading**: Once at room initialization, not cached (small, used once)

---

## Multi-Tab Architecture Implications

### Why Room-Level Caching is Optimal (Current Architecture):

```
Browser Tab 1 (Lobby)          Browser Tab 2 (Room 1)         Browser Tab 3 (Room 2)
├─ Own JavaScript runtime      ├─ Own JavaScript runtime      ├─ Own JavaScript runtime
├─ Own React app instance      ├─ Own React app instance      ├─ Own React app instance
├─ Own memory/cache            ├─ Own memory/cache            ├─ Own memory/cache
└─ Cannot share with other tabs└─ Cannot share with other tabs└─ Cannot share with other tabs
```

**Key Points**:
1. Each tab has its own isolated JavaScript environment
2. Cached data in one tab is **completely inaccessible** to other tabs
3. Loading cache at "application level" (App.tsx) only helps **that specific tab**
4. Room tabs are short-lived - they load, run game session, then close

**Why Application-Level Caching Doesn't Help**:
- If we loaded `audio_effects_info.json` in App.tsx of the lobby tab, the room tab (separate tab) would still need to load its own copy
- Each room tab is a fresh App.tsx instance with empty caches
- No performance benefit for multi-tab architecture

**Current Implementation is Correct**:
- Load caches when room component mounts (once per room tab)
- Use cached data throughout that room's lifetime
- When room closes, tab closes, browser frees memory automatically

---

## Mobile Strategy Considerations

### When Mobile Single-Tab Navigation is Implemented:

#### Expected Architecture:
```
Single Browser Tab:
  Lobby (Component) → Room (Component) → Lobby (Component)
  ↑                                              ↑
  └──────────────── Same App.tsx instance ───────┘
```

#### Caching Changes Needed (Future):
1. **Application-level caching becomes beneficial**:
   - Move `audio_effects_info.json` loading to App.tsx or a Context Provider
   - Cache persists as user navigates Lobby → Room → Lobby
   - Avoids re-loading static data on each navigation

2. **Component-level cleanup required**:
   - When navigating away from Room component, don't close the tab
   - Properly cleanup audio refs, socket connections, etc.
   - Preserve shared caches (audio effects) while clearing room-specific caches (theme, word data)

3. **Memory management**:
   - Need to explicitly clear theme-specific caches when leaving a room
   - Keep session-wide caches (audio effects) in memory
   - Balance performance vs memory usage on mobile devices

#### Implementation Strategy (When Mobile Support Added):
```typescript
// Future: Context provider at App.tsx level
<AudioEffectsProvider>  {/* Loads audio_effects_info.json once */}
  <BrowserRouter>
    <Routes>
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/room/:roomId" element={<Room />} />  {/* Uses cached audio effects */}
    </Routes>
  </BrowserRouter>
</AudioEffectsProvider>
```

**Decision Point**: Implement application-level caching when transitioning from multi-tab to single-tab navigation model.

---

## Development Timeline Impact on Caching

### Current Priority (October 2025):
- **Focus**: Core game logic, proxy system, multi-tab desktop experience
- **Caching Strategy**: Room-level (optimal for multi-tab)
- **Status**: ✅ Implemented and working correctly

### Next Month (November 2025):
- **Focus**: Mobile support implementation
- **Caching Strategy**: Evaluate single-tab navigation
- **Action Required**:
  - If single-tab navigation: Implement application-level caching for audio_effects_info.json
  - If keeping multi-tab on mobile: Keep current room-level caching
  - Update this document with final decision

### Q1 2026:
- **Focus**: Multi-room support (user in multiple rooms simultaneously)
- **Caching Strategy**: Remains room-level (each room tab independent)
- **No changes needed**: Current architecture already supports this

---

## Recommendations

1. **Keep current room-level caching** for multi-tab architecture (October 2025)
2. **Re-evaluate during mobile implementation** (November 2025):
   - If single-tab navigation → Move to application-level caching
   - If multi-tab preserved → Keep room-level caching
3. **Document mobile navigation decision** in this file when made
4. **Test mobile performance** with current caching before making changes

---

## Document History

- **2025-10-26**: Initial documentation created
  - Documented current caching strategy
  - Outlined rollout phases
  - Analyzed multi-tab vs single-tab implications
  - Prepared for mobile implementation decisions

---

**Maintained by**: Eric (TransVerse Platform Lead)
**Review Date**: Update when mobile strategy is finalized (target: November 2025)
