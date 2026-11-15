# THE AXIS — Game 1: The Trembling

A complete, playable short RPG built from `Axis_Mundi_Game1_Deep_Dive.pdf`.
Zero build step, zero dependencies: open `index.html` (or serve the folder) and play.

> The ridge has always spoken. Lately it only groans.

## Play

```bash
# any static server works
python -m http.server 8137
# then open http://127.0.0.1:8137/
```

Mobile-first: on-screen d-pad + A button, everything fits a phone in portrait.
Keyboard: **arrows / WASD** move · **Z or Enter** interact · **X or Esc** menu.

## What's in it

Everything from the design doc, not just the recommended vertical slice:

- **14 maps** — Ashhollow village, your home, the shrine, the ridge track, a
  4-room First Hollow, North Ridge + vent shaft, East Marsh, West stone circle
  + eroded pit, the Deep Root Chamber, and the Trunk.
- **Both endings** — Stabilize (the three tokens, a short rite) and Open
  (gated behind the Root-Tender's promise or high Axis stress).
- **AxisStress 0–100** — rises on ignored warnings, failed puzzles and hard
  choices; at 50+ the `AxisHighStress` switch flips, dialogue gets a harder
  edge and the root maps render thinner sap and fresh gnaw marks.
- **RPG-Maker-style events** — multi-page events with switch/variable/item
  conditions, autorun map-entry scenes, touch transfers, object events.
- **Three real puzzles** — vent plug order (one, three, two), a push-block
  channel in the marsh, debris clearing + turning the centre stone.
- **Key items, lore fragments, consumables** (consumables lower stress),
  save/load to localStorage, procedural chiptune + tremor audio, screen shake.

Combat is deliberately absent — the doc calls it secondary/optional and every
challenge here is event-based.

## Layout

```
index.html          markup, HUD, dialogue box, touch controls, ending screen
style.css           mobile-first pixel UI
js/art.js           procedural Game Boy-style palettes, tiles, sprites, pictures
js/data.js          all maps, tiles, items, and every event script
js/engine.js        grid movement, collision, page conditions, script interpreter,
                    camera, shake, WebAudio, save/load
js/main.js          boot, scaling, input, menu, loop
tools/validate.mjs  static map/event validator (geometry + reachability)
tools/playthrough.js       headless test: the full Stabilize path (42 assertions)
tools/playthrough-open.js  headless test: Open branch, its gate, save/load (18)
```

## Tests

```bash
node tools/validate.mjs        # 14 maps, 0 errors, 0 warnings
```

Both playthroughs run in a real browser against the live engine and currently
pass 63/63 assertions with no console errors (including keyboard and touch-dpad
movement, both endings, and a save/load round-trip). To run one, serve the
folder and inject the file into the page:

```js
const src = await (await fetch('/tools/playthrough.js')).text();
window.__testResults = await eval(src);
```

Headless note: pump dialogue with `await Promise.resolve()` loops, not
`setTimeout` — background tabs throttle timers to 1 s and a 10-second test
becomes a 10-minute one.

## Editing content

Maps are painted with ops, not ASCII, so they stay legible:

```js
ops: [
  ['border','T'],
  ['v',11,0,8,'-'],          // vertical path  x=11, y=0..8
  ['h',6,18,12,'-'],         // horizontal path
  ['rect',2,2,4,3,'H'],      // 4x3 building block
  ['put',12,12,'w']          // one well
]
```

Scripts are plain arrays of commands — `say`, `choice`, `set`, `add`, `give`,
`take`, `pic`, `teleport`, `objective`, `toast`, `tremor`, `wait`, `if`,
`ending`. Any `text`/`who` may be a function of state, which is how NPC
dialogue changes as switches flip:

```js
S('Hollis', st => st.switches.firstHollow
  ? 'Well water’s still cloudy…'
  : 'Well water’s gone cloudy. Don’t drink past the second bucket.')
```

Event pages are authored **most-specific-first**: the first page whose
`cond` passes wins, and a page with no `cond` is the fallback. Conditions
support `{sw}`, `{sw, val:false}`, `{item}`, `{varGte:['AxisStress',50]}`,
plus `{all:[…]} / {any:[…]} / {not:…}`.

## Notes / open points from the doc, as built

- Settlement, ridge, and token names kept as the doc had them.
- The Root-Tender is deliberately terse and never explains the cosmology.
- `AxisHighStress` never hard-locks content, per the doc — it only flavours.
- Combat intentionally omitted (see above).
- Palette and 16×16 tile size are locked in `js/art.js` (`REGION_PAL`).
