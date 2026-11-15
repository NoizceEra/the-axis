# Porting THE AXIS to RPG Maker MZ

The game is built to the design doc's vocabulary — maps, event pages, switches,
variables, common events, pictures — so the port is mechanical rather than a
redesign. This file is the map between the two.

## Why it isn't an .mzproj already

RPG Maker MZ project data (`data/*.json`, `js/plugins.js`) is only runnable with
the MZ editor/runtime, which is **not installed on this machine** (checked:
`C:\Program Files`, `C:\Program Files (x86)`, Steam library — only GameMaker
present). Writing an MZ project blind would produce something that cannot be
opened, tested, or played. The web build is the thing you can actually play
today; this file makes the MZ port a transcription job if MZ turns up.

## Element mapping

| This project | RPG Maker MZ |
|---|---|
| `MAPS[id]` in `js/data.js` | one map per entry; `w`/`h` are tile counts |
| `ops` (`rect`/`h`/`v`/`put`/`border`) | tiles in the map editor (A/B/C/D/E tabs) |
| `TILES[ch].t` → `js/art.js` motif | tileset autotile / normal tile |
| `TILES[ch].solid` | passage settings (4-dir) on the tileset |
| `TILES['B'].solid === 'mark'` | event-based barrier: a page whose condition is `Item: Root-Tender's Mark` |
| `events[]` | map events |
| `pages[]` (most-specific-first) | event pages — **reverse the order**, MZ gives priority to the highest page number |
| `cond: {sw:'x'}` | page condition: Switch |
| `cond: {item:'x'}` | page condition: Item |
| `cond: {varGte:['AxisStress',50]}` | page condition: Variable ≥ n |
| `t:'say'` | Show Text (no face) / Show Text with face |
| `t:'choice'` | Show Choices (nest to 6 options max — the shrine scene needs one split) |
| `t:'set'` | Control Switches |
| `t:'add'` | Control Variables (add, clamp 0–100) |
| `t:'give'/'take'` | Change Items / Change Weapons–Armor (key items → Items, "key item" flag) |
| `t:'pic'` | Show Picture → wait for press → Erase Picture |
| `t:'teleport'` | Transfer Player (direct designation) |
| `t:'tremor'` | Screen Shake (or a plugin for a longer, softer shake) |
| `t:'ending'` | Show Picture + Show Text + a "game over" style common event |
| `onEnter` | **Autorun** event on the map, guarded by a switch |
| ambient tremor timer | **Parallel process** common event, conditional on `AxisStress ≥ 35` |
| `TremorEffect` (doc §5.3) | common event — already one function: `doTremor()` |
| `ShowCaretakerMessage` (doc §5.3) | common event: Show Picture + Show Text |
| `CheckTokens` (doc §5.3) | common event: Conditional Branch ×3 on the three token items |

## Switches to create (same names, so scripts copy over)

`started`, `villageSeen`, `shrineSeen`, `questHollow`, `hollowEntered`,
`firstHollow`, `villageAfterHollow`, `caretakerMet`, `promiseStabilize`,
`promiseOpen`, `northSeen`, `ventQuest`, `plug1`, `plug3`, `plug2`, `ventOpen`,
`northToken`, `eastSeen`, `eastQuest`, `eastFlow`, `cutGrowth`, `eastToken`,
`westSeen`, `westQuest`, `deb1`, `deb2`, `deb3`, `westWarm`, `westToken`,
`threeTokens`, `AxisHighStress`, `deepSeen`, `trunkSeen`, `finalChoice`,
`FinalChoiceStabilize`, `FinalChoiceOpen`.

## Variables

`AxisStress` (0–100). Only variable in the game. Raise it exactly where the
web build does — the doc's rule is that it flavours but never locks.

## Assets to draw (doc §7.2)

- Tilesets: Village, Ridge/Stone, Root/Hollow, Marsh, Stone Circle. The web
  build's tiles are procedural, so they are a colour-and-pattern reference:
  `REGION_PAL` in `js/art.js` holds the exact palette per region
  (muted greens/browns/greys, cool blue-grey North, muted teal East,
  warm ochre West) and `MOTIFS` describes each tile's texture.
- Character sprites: player, Mara, Vela, three keepers, three villagers,
  Root-Tender, plus the remnant's picture. `CHAR_SPECS` has every colour.
- Pictures: `drawPicture()` renders the four the doc asks for — the caretaker,
  the trunk cross-section, the hollow entrance, and both ending stills.

## Order of work, if MZ arrives

1. New project, 16×16 tiles, no plugins.
2. Build the four tilesets from the palettes above.
3. Type in the switches and the one variable.
4. Author maps in the same shapes (`ops` translate directly to tile coords).
5. Port event scripts top to bottom — they read like MZ command lists already.
6. Replay the two automated paths by hand: `tools/playthrough.js` (Stabilize)
   and `tools/playthrough-open.js` (Open) are the acceptance scripts.
