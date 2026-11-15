// Browser-side playthrough test. Injected into the page; drives the real engine.
// Run: see tools/run-playthrough.md. Results land on window.__testResults.

(async function(){
  const game = window.__axis;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = [];
  const ok = (name, cond, extra) => log.push({ name, pass: !!cond, extra: extra === undefined ? '' : String(extra) });

  // press through dialogue / pictures / choices until the engine is idle.
  // Pumped on microtasks (Promise.resolve) rather than setTimeout: headless tabs
  // throttle timers to ~1s, which turns a 10-second test into a 10-minute one.
  async function drain(pick = 0, maxSteps = 4000){
    for (let i = 0; i < maxSteps; i++){
      const waiting = game.busy || game.dialogueResolve || game.picResolve || game.choiceResolve;
      if (!waiting) return true;
      if (game.choiceResolve) game.pickChoice(Math.min(pick, game.ui.choices.children.length - 1));
      else if (game.picResolve) game.closePicture();
      else game.press();
      await Promise.resolve();
      await Promise.resolve();
    }
    return false;
  }

  function at(map, x, y, dir = 'down'){
    game.enterMap(map, x, y, dir, true);   // skip onEnter for determinism
    game.state.dir = dir;
    game.px = x; game.py = y;
  }

  function faceInteract(map, px, py, tx, ty){
    const dx = tx - px, dy = ty - py;
    const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    at(map, px, py, dir);
    game.interact();
  }

  /* ---------- 0. boot ---------- */
  game.startNew('Tester');
  await drain();
  ok('start: name stored', game.state.name === 'Tester', game.state.name);
  ok('start: Vela intro ran (started switch)', game.state.switches.started === true);
  ok('start: objective set', /Mara/.test(game.state.objective), game.state.objective);

  /* ---------- 0b. real input paths (keyboard + touch dpad) ---------- */
  const y0 = game.state.y;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  for (let i = 0; i < 12; i++){ game.update(140, performance.now()); await Promise.resolve(); }
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
  ok('input: keyboard walks the player', game.state.y > y0, `${y0} -> ${game.state.y} on ${game.state.map}`);
  await drain();                      // the walk can trip a door; clear any scene it opened

  at('home', 6, 6, 'down');
  const y1 = game.state.y;
  const upBtn = document.querySelector('.dbtn.up');
  upBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  for (let i = 0; i < 12; i++){ game.update(140, performance.now()); await Promise.resolve(); }
  upBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  ok('input: touch dpad walks the player', game.state.y < y1, `${y1} -> ${game.state.y}`);
  await drain();

  const pressTarget = document.getElementById('btn-a');
  ok('input: A button is wired', !!pressTarget);

  /* ---------- 1. home props ---------- */
  faceInteract('home', 4, 7, 4, 6);
  await drain();
  ok('home: ledger gives fragment_a', game.state.items.includes('fragment_a'));

  /* ---------- 2. village ---------- */
  at('village', 11, 12, 'down');
  ok('village: wall solid', game.blocked(12, 12) === true, 'well tile');
  ok('village: path walkable', game.blocked(11, 9) === false);
  at('village', 11, 0, 'up');
  game.tryMove('up');
  await drain();
  ok('village: north exit gated before the hollow', game.state.map === 'village', game.state.map);

  /* ---------- 3. Mara, first conversation ---------- */
  faceInteract('shrine', 7, 8, 6, 8);
  await drain(0);
  ok('mara: quest given', game.state.switches.questHollow === true);
  ok('mara: objective points at the hollow', /hollow/i.test(game.state.objective), game.state.objective);

  /* ---------- 4. the hollow mouth ---------- */
  faceInteract('ridgepath', 9, 8, 9, 9);
  await drain(0);
  ok('hollow mouth: descended', game.state.map === 'hollow1', game.state.map);

  /* ---------- 5. hollow 1-4 ---------- */
  faceInteract('hollow1', 9, 5, 9, 4);          // sap: raises stress
  await drain();
  ok('hollow: sap rises stress', game.state.vars.AxisStress > 10, game.state.vars.AxisStress);

  faceInteract('hollow2', 10, 7, 10, 6);        // carving
  await drain();
  ok('hollow: carving gives fragment_b', game.state.items.includes('fragment_b'));

  faceInteract('hollow3', 7, 4, 7, 3);          // the Root-Tender
  await drain(0);
  ok('remnant: met', game.state.switches.caretakerMet === true);
  ok('remnant: mark granted', game.state.items.includes('root_mark'));
  ok('remnant: stabilize promise', game.state.switches.promiseStabilize === true);

  faceInteract('hollow4', 6, 5, 6, 4);          // trunk cross-section
  await drain();
  ok('hollow: trunk section raises stress', game.state.vars.AxisStress >= 15, game.state.vars.AxisStress);

  at('hollow4', 6, 8, 'down');
  game.tryMove('down');
  await drain();
  ok('hollow: exit sets firstHollow', game.state.switches.firstHollow === true);
  ok('hollow: exits to the ridge', game.state.map === 'ridgepath', game.state.map);

  /* ---------- 6. Act 2 unlocked ---------- */
  at('village', 11, 1, 'up');
  game.tryMove('up');
  await drain();
  ok('act2: north exit open', game.state.map === 'north', game.state.map);

  /* ---------- 7. north: vent puzzle ---------- */
  faceInteract('north', 8, 8, 7, 8);
  await drain(0);
  ok('north: keeper gives the order quest', game.state.switches.ventQuest === true);

  faceInteract('northvent', 6, 5, 6, 4);        // middle first = wrong order
  await drain();
  ok('north: wrong order resets', !game.state.switches.plug1 && !game.state.switches.plug3);

  faceInteract('northvent', 5, 5, 5, 4); await drain();   // one
  faceInteract('northvent', 7, 5, 7, 4); await drain();   // three
  faceInteract('northvent', 6, 5, 6, 4); await drain();   // two
  ok('north: vent open', game.state.switches.ventOpen === true);

  faceInteract('north', 8, 8, 7, 8);
  await drain(0);
  ok('north: token awarded', game.state.items.includes('north_token'));

  /* ---------- 8. east: push the stone ---------- */
  faceInteract('east', 17, 6, 17, 7);
  await drain(0);
  ok('east: keeper quest', game.state.switches.eastQuest === true);

  at('east', 10, 11, 'up');
  game.interact(); await drain();               // push 1 -> (10,10)... stone starts (10,10)
  at('east', 10, 10, 'up');
  game.interact(); await drain();               // push 2 -> (10,9)
  at('east', 10, 9, 'up');
  game.interact(); await drain();               // push 3 -> (10,8) channel
  ok('east: flow restored', game.state.switches.eastFlow === true,
     JSON.stringify(game.state.evState['east:pushstone']));

  faceInteract('east', 17, 6, 17, 7);
  await drain(0);
  ok('east: token awarded', game.state.items.includes('east_token'));

  /* ---------- 9. west: debris + the stone's face ---------- */
  faceInteract('west', 14, 7, 14, 6);
  await drain(0);
  ok('west: keeper quest', game.state.switches.westQuest === true);

  faceInteract('west', 7, 6, 7, 5); await drain();
  faceInteract('west', 10, 6, 10, 5); await drain();
  faceInteract('west', 9, 9, 9, 8); await drain();
  ok('west: debris cleared', game.state.switches.deb1 && game.state.switches.deb2 && game.state.switches.deb3);

  faceInteract('west', 8, 7, 8, 6);   // centre stone, choice 0 = face the ridge
  await drain(0);
  ok('west: circle holds', game.state.switches.westWarm === true);

  faceInteract('west', 14, 7, 14, 6);
  await drain(0);
  ok('west: token awarded', game.state.items.includes('west_token'));
  ok('act2: threeTokens flag', game.state.switches.threeTokens === true);
  ok('act2: HUD tokens lit', (game.ui.tokens.innerHTML.match(/class="on"/g) || []).length >= 3,
     game.ui.tokens.innerHTML);

  /* ---------- 10. Mara sends you to the root ---------- */
  faceInteract('shrine', 7, 8, 6, 8);
  await drain(0);
  ok('mara: endgame objective', /root|trunk|Deep/i.test(game.state.objective), game.state.objective);

  /* ---------- 11. the root opens ---------- */
  faceInteract('shrine', 7, 8, 7, 7);
  await drain(0);
  ok('shrine: root opens into the deep', game.state.map === 'deeproot', game.state.map);
  ok('deeproot: onEnter ran', game.state.switches.deepSeen === true);

  /* ---------- 12. the trunk, stabilize ---------- */
  at('deeproot', 7, 11, 'down');
  game.tryMove('down');
  await drain();
  ok('trunk: reached', game.state.map === 'trunk', game.state.map);

  faceInteract('trunk', 6, 6, 6, 5);
  await drain(0);
  ok('trunk: stabilize chosen', game.state.switches.FinalChoiceStabilize === true);
  ok('trunk: tokens consumed', !game.state.items.includes('north_token') && !game.state.items.includes('east_token'));
  ok('trunk: ending screen shown', game.ui.ending.hidden === false);
  ok('trunk: mode = ending', game.mode === 'ending', game.mode);
  ok('trunk: ending title', game.ui.endingTitle.textContent === 'STABILIZE', game.ui.endingTitle.textContent);

  /* ---------- 13. rendering actually produced pixels ---------- */
  const cv = game.canvas;
  const ctx = cv.getContext('2d');
  game.render(performance.now());            // rAF is throttled in headless tabs; draw explicitly
  const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const colors = new Set();
  for (let i = 0; i < data.length; i += 4) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
  ok('render: canvas has many distinct colours', colors.size > 20, colors.size + ' colours');

  window.__testResults = log;
  console.log('PLAYTHROUGH', log.filter(l => !l.pass).length + ' failures / ' + log.length);
  return log;
})();
