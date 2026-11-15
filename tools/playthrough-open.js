// Branch test: the "Open" ending, its gate, and save/load. Injected into the page.

(async function(){
  const game = window.__axis;
  const log = [];
  const ok = (name, cond, extra) => log.push({ name, pass: !!cond, extra: extra === undefined ? '' : String(extra) });

  async function drain(pick = 0, maxSteps = 4000){
    for (let i = 0; i < maxSteps; i++){
      const waiting = game.busy || game.dialogueResolve || game.picResolve || game.choiceResolve;
      if (!waiting) return true;
      if (game.choiceResolve) game.pickChoice(Math.min(pick, game.ui.choices.children.length - 1));
      else if (game.picResolve) game.closePicture();
      else game.press();
      await Promise.resolve(); await Promise.resolve();
    }
    return false;
  }
  function at(map, x, y, dir = 'down'){
    game.enterMap(map, x, y, dir, true);
    game.state.dir = dir; game.px = x; game.py = y;
  }
  function faceInteract(map, px, py, tx, ty){
    const dx = tx - px, dy = ty - py;
    const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    at(map, px, py, dir);
    game.interact();
  }

  /* ---------- fresh run ---------- */
  game.startNew('Opener');
  await drain();
  ok('open: new game autoran the intro', game.state.switches.started === true);

  /* ---------- the Root-Tender's "open a clean path" promise ---------- */
  faceInteract('hollow3', 7, 4, 7, 3);
  await drain(2);                                     // third option: open a clean path
  ok('open: promise recorded', game.state.switches.promiseOpen === true);
  ok('open: promise raises stress', game.state.vars.AxisStress >= 18, game.state.vars.AxisStress);
  ok('open: mark still granted', game.state.items.includes('root_mark'));

  /* ---------- simulate Act 2 completion so the root opens ---------- */
  for (const id of ['north_token','east_token','west_token']) game.addItem(id);
  game.setSwitch('northToken'); game.setSwitch('eastToken'); game.setSwitch('westToken');
  game.setSwitch('firstHollow');
  ok('open: threeTokens auto-set', game.state.switches.threeTokens === true);

  faceInteract('shrine', 7, 8, 7, 7);
  await drain(0);
  ok('open: root opens', game.state.map === 'deeproot', game.state.map);

  at('deeproot', 7, 11, 'down');
  game.tryMove('down');
  await drain();
  ok('open: trunk reached', game.state.map === 'trunk', game.state.map);

  /* ---------- the gate: no promise, low stress -> refused ---------- */
  game.state.switches.promiseOpen = false;
  game.state.vars.AxisStress = 10;
  faceInteract('trunk', 6, 6, 6, 5);
  await drain(1);                                     // "Open a clean path"
  ok('gate: refused without promise or stress', game.state.switches.FinalChoiceOpen !== true);
  ok('gate: still in the trunk', game.mode === 'play' && game.ui.ending.hidden === true);

  /* ---------- with the promise, the same choice opens ---------- */
  game.state.switches.promiseOpen = true;
  faceInteract('trunk', 6, 6, 6, 5);
  await drain(1);
  ok('open: FinalChoiceOpen set', game.state.switches.FinalChoiceOpen === true);
  ok('open: mode = ending', game.mode === 'ending', game.mode);
  ok('open: ending title', game.ui.endingTitle.textContent === 'OPEN', game.ui.endingTitle.textContent);
  ok('open: tokens NOT consumed', game.state.items.includes('north_token') && game.state.items.includes('west_token'));

  /* ---------- save / load round-trip ---------- */
  game.mode = 'play';                                 // step back out of the ending screen
  game.state.objective = 'roundtrip-marker';
  game.state.vars.AxisStress = 42;
  game.save();
  const before = { map: game.state.map, stress: game.state.vars.AxisStress, obj: game.state.objective };
  game.state.vars.AxisStress = 0; game.state.objective = 'clobbered';
  const loaded = game.load();
  await drain();
  ok('save: load returned true', loaded === true);
  ok('save: map restored', game.state.map === before.map, game.state.map);
  ok('save: stress restored', game.state.vars.AxisStress === 42, game.state.vars.AxisStress);
  ok('save: objective restored', game.state.objective === 'roundtrip-marker', game.state.objective);
  ok('save: items survive', game.state.items.length >= 4, game.state.items.length);

  window.__openResults = log;
  return log;
})();
