// THE AXIS — engine. Grid movement, RPG-Maker-style event pages, script interpreter,
// save/load, procedural audio. No dependencies.

import { MAPS, TILES, ITEMS, START, PLAYER_NAME_DEFAULT } from './data.js';
import { TILE, tile, makeSpriteSheet, drawPicture, REGION_PAL } from './art.js';

const VIEW_W = 320, VIEW_H = 208;
const STEP_MS = 135;
const SAVE_KEY = 'the-axis.save.v1';

/* ---------------- audio ---------------- */
class Audio {
  constructor(){ this.on = true; this.ctx = null; this.master = null; }
  init(){
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  resume(){ if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  blip(freq = 440, dur = 0.05, type = 'square', gain = 0.05){
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  rumble(mag = 1){
    if (!this.on || !this.ctx || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, t);
    lp.frequency.linearRampToValueAtTime(70, t + 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.20 * mag, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 1.1);
  }
  chime(){
    if (!this.on || !this.ctx) return;
    [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => this.blip(f, 0.5, 'sine', 0.07), i*110));
  }
  motif(){
    // the short "Axis" motif: three falling tones, sparse
    if (!this.on || !this.ctx) return;
    [[220,0],[196,220],[146.83,460]].forEach(([f, d]) => setTimeout(() => this.blip(f, 0.7, 'triangle', 0.08), d));
  }
}

/* ---------------- helpers ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DIRV = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };

function buildGrid(def){
  const g = [];
  for (let y=0; y<def.h; y++){
    const row = new Array(def.w).fill(def.fill || '.');
    g.push(row);
  }
  const put = (x, y, ch) => { if (g[y] && g[y][x] !== undefined) g[y][x] = ch; };
  for (const op of (def.ops || [])){
    const [kind] = op;
    if (kind === 'put') put(op[1], op[2], op[3]);
    else if (kind === 'rect'){
      const [, x, y, w, h, ch] = op;
      for (let j=y; j<y+h; j++) for (let i=x; i<x+w; i++) put(i, j, ch);
    }
    else if (kind === 'h'){ const [, x1, x2, y, ch] = op; for (let i=x1; i<=x2; i++) put(i, y, ch); }
    else if (kind === 'v'){ const [, x, y1, y2, ch] = op; for (let j=y1; j<=y2; j++) put(x, j, ch); }
    else if (kind === 'border'){ const ch = op[1];
      for (let i=0;i<def.w;i++){ put(i,0,ch); put(i,def.h-1,ch); }
      for (let j=0;j<def.h;j++){ put(0,j,ch); put(def.w-1,j,ch); }
    }
  }
  return g;
}

/* ---------------- engine ---------------- */
export class AxisGame {
  constructor(canvas, ui){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.ui = ui;                       // {dia, name, text, choices, more, pic, picCanvas, picTitle, toast, stage}
    this.audio = new Audio();
    this.sprites = makeSpriteSheet();
    this.grids = {};
    this.mode = 'title';
    this.busy = false;
    this.keys = new Set();
    this.heldDirs = [];
    this.moveT = 0;
    this.moving = false;
    this.moveFrom = null;
    this.moveTo = null;
    this.stepCount = 0;
    this.shake = 0;
    this.ambientT = 20000;
    this.lastT = 0;
    this.state = null;
    this.onHud = () => {};
    this.picCache = new Map();
    this.frameT = 0;
  }

  /* ---------- state ---------- */
  newState(name){
    return {
      name: name || PLAYER_NAME_DEFAULT,
      map: START.map,
      x: START.x, y: START.y, dir: START.dir,
      switches: {}, vars: { AxisStress: 10 },
      items: [], evState: {},
      objective: 'Get up. The house is still settling.',
      playMs: 0
    };
  }

  startNew(name){
    this.state = this.newState(name);
    this.mode = 'play';
    this.ui.title.hidden = true;
    this.enterMap(START.map, START.x, START.y, START.dir, false);  // autorun the opening scene
  }

  hasSave(){ try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }

  save(){
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        state: this.state, savedAt: Date.now()
      }));
      this.toast('Saved.');
      this.audio.blip(660, 0.08, 'square', 0.05);
    } catch { this.toast('Could not save.'); }
  }

  load(){
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch {}
    if (!raw) { this.toast('No save found.'); return false; }
    try {
      const d = JSON.parse(raw);
      this.state = d.state;
      this.mode = 'play';
      this.ui.title.hidden = true;
      this.enterMap(this.state.map, this.state.x, this.state.y, this.state.dir, true);
      this.toast('Loaded.');
      return true;
    } catch { this.toast('Save is unreadable.'); return false; }
  }

  /* ---------- map ---------- */
  mapDef(id){ return MAPS[id]; }

  grid(id){
    if (!this.grids[id]) this.grids[id] = buildGrid(MAPS[id]);
    return this.grids[id];
  }

  evKey(id){ return `${this.state.map}:${id}`; }

  evPos(ev){
    const s = this.state.evState[this.evKey(ev.id)];
    return s && s.x !== undefined ? { x:s.x, y:s.y } : { x:ev.x, y:ev.y };
  }
  evGone(ev){ const s = this.state.evState[this.evKey(ev.id)]; return !!(s && s.gone); }

  // RPG-Maker-style pages, authored most-specific-first: the first page whose
  // conditions are met wins; an unconditional page is the fallback.
  pageFor(ev){
    if (!ev.pages || !ev.pages.length) return null;
    let fallback = null;
    for (const p of ev.pages){
      if (!p.cond){ if (!fallback) fallback = p; continue; }
      if (this.check(p.cond)) return p;
    }
    return fallback || ev.pages[ev.pages.length - 1];
  }

  // a transfer may declare its target at the top level or inside a page (page wins)
  evTarget(ev){
    const pg = this.pageFor(ev);
    const to = (pg && pg.to) || ev.to || null;
    const actions = (pg && pg.actions) || ev.actions || null;
    return { to, actions };
  }

  check(cond){
    const st = this.state;
    if (!cond) return true;
    if (cond.sw) return cond.val === false ? !st.switches[cond.sw] : !!st.switches[cond.sw];
    if (cond.item) return st.items.includes(cond.item);
    if (cond.varGte){
      const [k, v] = cond.varGte;
      return (st.vars[k] || 0) >= v;
    }
    if (cond.all) return cond.all.every(c => this.check(c));
    if (cond.any) return cond.any.some(c => this.check(c));
    if (cond.not) return !this.check(cond.not);
    return true;
  }

  tileAt(x, y, mapId = this.state.map){
    const def = MAPS[mapId];
    if (x < 0 || y < 0 || x >= def.w || y >= def.h) return '#';
    const ch = this.overrideChar(this.grid(mapId)[y][x], x, y, mapId);
    return ch;
  }

  // switches can change what a tile IS (a cleared ice plug, cleared debris, an opened root)
  overrideChar(ch, x, y, mapId){
    const sw = this.state.switches;
    if (mapId === 'northvent'){
      if (ch === 'I'){
        if (x === 5 && sw.plug1) return 'i';
        if (x === 7 && sw.plug3) return 'i';
        if (x === 6 && sw.plug2) return 'i';
      }
    }
    if (mapId === 'west' && ch === 'D'){
      if (x === 7 && y === 5 && sw.deb1) return 'a';
      if (x === 10 && y === 5 && sw.deb2) return 'a';
      if (x === 9 && y === 8 && sw.deb3) return 'a';
    }
    return ch;
  }

  tileSolid(ch){
    const t = TILES[ch];
    if (!t) return true;
    if (t.solid === 'mark') return !this.state.items.includes('root_mark') ? true : false;
    return !!t.solid;
  }

  eventsAt(x, y, mapId = this.state.map){
    const def = MAPS[mapId];
    const out = [];
    for (const ev of def.events || []){
      if (this.evGone(ev)) continue;
      const p = this.evPos(ev);
      if (p.x === x && p.y === y) out.push(ev);
    }
    return out;
  }

  blocked(x, y){
    if (this.tileSolid(this.tileAt(x, y))) return true;
    for (const ev of this.eventsAt(x, y)){
      if (ev.kind === 'transfer' || ev.kind === 'trigger') continue;
      const pg = this.pageFor(ev);
      if (pg && pg.to) continue;
      if (ev.solid) {
        // a push or object whose switch made it passable
        if (ev.kind === 'object' && pg && pg.passable) continue;
        return true;
      }
    }
    return false;
  }

  enterMap(id, x, y, dir, skipEnter){
    const def = MAPS[id];
    if (!def) return;
    this.state.map = id;
    this.state.x = x; this.state.y = y;
    this.state.dir = dir || 'down';
    this.px = x; this.py = y;
    this.moving = false; this.moveT = 0;
    this.ui.place.textContent = def.name;
    this.ui.dialogue.hidden = true;
    this.ui.picture.hidden = true;
    document.body.classList.remove('talking');
    this.updateHud();
    if (!skipEnter && def.onEnter) this.runScript(def.onEnter);
  }

  /* ---------- hud ---------- */
  updateHud(){
    const st = this.state;
    const stress = clamp(st.vars.AxisStress || 0, 0, 100);
    this.ui.stressbar.style.width = stress + '%';
    this.ui.stressbar.classList.toggle('high', stress >= 50);
    this.ui.objective.textContent = st.objective || '';
    const map = { north_token:'❄', east_token:'🌿', west_token:'☼' };
    this.ui.tokens.innerHTML = ['north_token','east_token','west_token']
      .map(k => `<span class="${st.items.includes(k) ? 'on' : ''}">${map[k]}</span>`).join('');
    this.onHud(st);
  }

  addItem(id){
    if (this.state.items.includes(id)) return;
    this.state.items.push(id);
    const it = ITEMS[id];
    this.toast(`Obtained: ${it ? it.name : id}`);
    this.audio.chime();
    this.updateHud();
  }
  removeItem(id){
    this.state.items = this.state.items.filter(i => i !== id);
    this.updateHud();
  }

  setSwitch(name, val = true){
    this.state.switches[name] = val;
    if (!val) delete this.state.switches[name];
    if (name === 'northToken' || name === 'eastToken' || name === 'westToken' || name === 'plugin'){
      const s = this.state.switches;
      if (s.northToken && s.eastToken && s.westToken && !s.threeTokens) {
        s.threeTokens = true;
        this.toast('All three supports are held.');
        this.audio.motif();
      }
    }
    this.updateHud();
  }

  addStress(n){
    const st = this.state;
    st.vars.AxisStress = clamp((st.vars.AxisStress || 0) + n, 0, 100);
    if (st.vars.AxisStress >= 50 && !st.switches.AxisHighStress){
      st.switches.AxisHighStress = true;
      this.toast('The ridge has noticed you.');
    }
    this.updateHud();
  }

  /* ---------- input ---------- */
  onKey(e, down){
    const k = e.key;
    const ord = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
                  w:'up', s:'down', a:'left', d:'right', W:'up', S:'down', A:'left', D:'right' };
    if (ord[k]){
      e.preventDefault();
      const dir = ord[k];
      if (down){ this.keys.add(dir); this.queueDir(dir); }
      else { this.keys.delete(dir); this.heldDirs = this.heldDirs.filter(d => d !== dir); }
      return;
    }
    if (k === 'z' || k === 'Z' || k === 'Enter' || k === ' '){
      e.preventDefault();
      if (down) this.press();
      return;
    }
    if (k === 'x' || k === 'X' || k === 'Escape'){
      e.preventDefault();
      if (down) this.ui.openMenu && this.ui.openMenu();
    }
  }

  setDir(dir){ if (!this.busy && this.mode === 'play') this.state.dir = dir; }

  press(){
    this.audio.resume();
    if (this.dialogueResolve) { this.advanceDialogue(); return; }
    if (this.picResolve) { this.closePicture(); return; }
    if (this.mode !== 'play' || this.busy) return;
    this.interact();
  }

  /* ---------- movement / update ---------- */
  update(dt, now){
    this.frameT += dt;
    if (this.mode !== 'play' || this.busy){ return; }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt / 380);

    // ambient tremor (the "parallel process")
    this.state.playMs += dt;
    this.ambientT -= dt;
    if (this.ambientT <= 0){
      this.ambientT = 18000 + Math.random() * 12000;
      const stress = this.state.vars.AxisStress || 0;
      if (stress >= 35){
        this.doTremor(0.6 + stress / 160);
      }
    }

    if (this.moving){
      this.moveT += dt;
      const t = Math.min(1, this.moveT / STEP_MS);
      const a = this.moveFrom, b = this.moveTo;
      this.px = a.x + (b.x - a.x) * t;
      this.py = a.y + (b.y - a.y) * t;
      if (t >= 1){
        this.moving = false;
        this.state.x = b.x; this.state.y = b.y;
        this.px = b.x; this.py = b.y;
        this.onStepOn();
      }
      return;
    }

    // held-direction movement
    let dir = null;
    for (const d of this.heldDirs){ if (this.keys.has(d)) { dir = d; break; } }
    if (dir){
      this.state.dir = dir;
      this.tryMove(dir);
    }
  }

  queueDir(d){ if (!this.heldDirs.includes(d)) this.heldDirs.push(d); }

  tryMove(dir){
    const [dx, dy] = DIRV[dir];
    const nx = this.state.x + dx, ny = this.state.y + dy;
    // walking into a touch-trigger (doors on the map edge, holes, seams) fires it
    const touchEv = this.eventsAt(nx, ny).find(e => {
      if (e.kind !== 'transfer' && e.kind !== 'trigger') return false;
      if (e.trigger !== 'touch') return false;
      const t = this.evTarget(e);
      return !!(t.to || t.actions);
    });
    if (touchEv){
      const t = this.evTarget(touchEv);
      if (t.to) { this.travel(t.to); return; }
      if (t.actions) { this.runScript(t.actions); return; }
    }
    // face first, then test
    const evs = this.eventsAt(nx, ny);
    const push = evs.find(e => e.kind === 'push' && this.pageFor(e));
    if (push) return;                       // push requires the interact press
    if (this.blocked(nx, ny)) { this.audio.blip(120, 0.03, 'square', 0.02); return; }
    this.moving = true;
    this.moveT = 0;
    this.moveFrom = { x:this.state.x, y:this.state.y };
    this.moveTo = { x:nx, y:ny };
    this.stepCount++;
    if (this.px === undefined){ this.px = this.state.x; this.py = this.state.y; }
  }

  onStepOn(){
    const x = this.state.x, y = this.state.y;
    for (const ev of this.eventsAt(x, y)){
      if (ev.trigger !== 'touch') continue;
      if (ev.kind !== 'transfer' && ev.kind !== 'trigger') continue;
      const t = this.evTarget(ev);
      if (t.to){ this.travel(t.to); return; }
      if (t.actions){ this.runScript(t.actions); return; }
    }
  }

  travel(to){
    this.audio.blip(330, 0.09, 'sine', 0.04);
    this.enterMap(to.map, to.x, to.y, to.dir || 'down');
  }

  interact(){
    const [dx, dy] = DIRV[this.state.dir];
    const tx = this.state.x + dx, ty = this.state.y + dy;
    const evs = this.eventsAt(tx, ty);
    // standing ON an event (sign underfoot etc.)
    const here = this.eventsAt(this.state.x, this.state.y);
    const cand = evs.concat(here);
    const ev = cand.find(e => {
      const pg = this.pageFor(e);
      if (!pg) return false;
      if (e.kind === 'transfer') return !!pg.actions;
      return true;
    });
    if (!ev){ this.audio.blip(200, 0.03, 'square', 0.02); return; }
    if (ev.kind === 'push'){ this.pushEvent(ev); return; }
    const t = this.evTarget(ev);
    if (t.to){ this.travel(t.to); return; }
    if (t.actions){ this.runScript(t.actions); return; }
  }

  pushEvent(ev){
    const [dx, dy] = DIRV[this.state.dir];
    const p = this.evPos(ev);
    // player must be adjacent on the opposite side of the push direction
    if (this.state.x + dx !== p.x || this.state.y + dy !== p.y){
      this.runScript([{ t:'say', text:'You’d have to be behind it to push it.' }]);
      return;
    }
    const tgt = { x:p.x + dx, y:p.y + dy };
    if (this.blocked(tgt.x, tgt.y)){
      this.runScript([{ t:'say', text:'It won’t move that way.' }]);
      return;
    }
    const key = this.evKey(ev.id);
    this.state.evState[key] = { x:tgt.x, y:tgt.y };
    this.audio.blip(150, 0.16, 'sawtooth', 0.05);
    // player follows into the vacated tile
    this.state.x = p.x; this.state.y = p.y;
    this.px = p.x; this.py = p.y;
    // east marsh: stone into the channel mouth restores the flow
    if (this.state.map === 'east' && tgt.x === 10 && tgt.y === 8){
      this.setSwitch('eastFlow');
      this.toast('Water finds its way again.');
      this.audio.chime();
    }
    this.updateHud();
  }

  /* ---------- scripts ---------- */
  async runScript(actions){
    if (!actions || !actions.length) return;
    this.busy = true;
    try {
      await this.exec(actions);
    } catch (err){
      console.error('script error', err);
    } finally {
      this.busy = false;
      this.updateHud();
    }
  }

  async exec(actions){
    for (const a of actions){
      if (!a) continue;
      switch (a.t){
        case 'say': {
          const text = typeof a.text === 'function' ? a.text(this.state) : a.text;
          const who = typeof a.who === 'function' ? a.who(this.state) : a.who;
          await this.showDialogue(who, text);
          break;
        }
        case 'choice': {
          const text = typeof a.text === 'function' ? a.text(this.state) : a.text;
          const who = typeof a.who === 'function' ? a.who(this.state) : a.who;
          const idx = await this.showChoice(who, text, a.options.map(o => o.label));
          const opt = a.options[idx];
          if (opt && opt.do) await this.exec(opt.do);
          break;
        }
        case 'set': this.setSwitch(a.sw, a.val === undefined ? true : a.val); break;
        case 'add': this.addStress(a.n || 0); break;
        case 'give': this.addItem(a.id); break;
        case 'take': this.removeItem(a.id); break;
        case 'pic': await this.showPicture(a.id); break;
        case 'teleport': this.travel({ map:a.map, x:a.x, y:a.y, dir:a.dir }); break;
        case 'objective': this.state.objective = typeof a.text === 'function' ? a.text(this.state) : a.text; this.updateHud(); break;
        case 'toast': this.toast(a.text); break;
        case 'tremor': this.doTremor(a.mag || 1); break;
        case 'wait': await new Promise(r => setTimeout(r, a.ms || 100)); break;
        case 'if': {
          const ok = this.check(a.cond);
          await this.exec(ok ? a.then : a.else);
          break;
        }
        case 'ending': this.showEnding(a.which); break;
        default: console.warn('unknown action', a); break;
      }
    }
  }

  doTremor(mag = 1){
    this.shake = Math.min(1, 0.35 + mag * 0.3);
    this.audio.rumble(mag);
    this.ui.stage.classList.remove('shake');
    void this.ui.stage.offsetWidth;
    this.ui.stage.classList.add('shake');
    setTimeout(() => this.ui.stage.classList.remove('shake'), 420);
  }

  /* ---------- dialogue ---------- */
  showDialogue(who, text){
    return new Promise(resolve => {
      this.dialogueResolve = resolve;
      this.dialogueFull = text;
      this.dialogueShown = 0;
      this.ui.dialogue.hidden = false;
      this.ui.name.textContent = who || '';
      this.ui.text.textContent = '';
      this.ui.choices.hidden = true;
      this.ui.more.hidden = true;
      document.body.classList.add('talking');
      this.audio.blip(520, 0.035, 'square', 0.03);
      // typewriter
      const step = () => {
        if (this.dialogueResolve !== resolve) return;
        if (this.dialogueShown < text.length){
          this.dialogueShown = Math.min(text.length, this.dialogueShown + 2);
          this.ui.text.textContent = text.slice(0, this.dialogueShown);
          this.typeTimer = setTimeout(step, 16);
        } else {
          this.ui.more.hidden = false;
          this.dialogueReady = true;
        }
      };
      this.dialogueReady = false;
      clearTimeout(this.typeTimer);
      step();
    });
  }

  advanceDialogue(){
    // first press completes the typewriter, second advances
    if (!this.dialogueReady && this.dialogueFull){
      this.dialogueShown = this.dialogueFull.length;
      this.ui.text.textContent = this.dialogueFull;
      this.ui.more.hidden = false;
      this.dialogueReady = true;
      return;
    }
    const r = this.dialogueResolve;
    this.dialogueResolve = null;
    this.dialogueReady = false;
    clearTimeout(this.typeTimer);
    this.ui.dialogue.hidden = true;
    this.ui.name.textContent = '';
    this.ui.text.textContent = '';
    document.body.classList.remove('talking');
    if (r) r();
  }

  showChoice(who, text, labels){
    return new Promise(resolve => {
      this.choiceResolve = resolve;
      this.choiceIndex = 0;
      this.dialogueResolve = null;
      this.ui.dialogue.hidden = false;
      this.ui.name.textContent = who || '';
      this.ui.text.textContent = text;
      this.ui.more.hidden = true;
      this.ui.choices.hidden = false;
      this.ui.choices.innerHTML = '';
      labels.forEach((label, i) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.className = i === 0 ? 'sel' : '';
        b.addEventListener('click', () => this.pickChoice(i));
        this.ui.choices.appendChild(b);
      });
      document.body.classList.add('talking');
      this.updateChoiceSel();
    });
  }
  updateChoiceSel(){
    [...this.ui.choices.children].forEach((b, i) => b.classList.toggle('sel', i === this.choiceIndex));
  }
  moveChoice(delta){
    const n = this.ui.choices.children.length;
    if (!n) return;
    this.choiceIndex = (this.choiceIndex + delta + n) % n;
    this.updateChoiceSel();
    this.audio.blip(440, 0.03, 'square', 0.03);
  }
  pickChoice(i){
    const r = this.choiceResolve;
    if (!r) return;
    this.choiceResolve = null;
    this.ui.choices.hidden = true;
    this.ui.choices.innerHTML = '';
    this.ui.dialogue.hidden = true;
    document.body.classList.remove('talking');
    r(i);
  }

  /* ---------- picture ---------- */
  showPicture(id){
    return new Promise(resolve => {
      this.picResolve = resolve;
      if (!this.picCache.has(id)) this.picCache.set(id, drawPicture(id));
      const c = this.picCache.get(id);
      const pc = this.ui.picCanvas;
      pc.width = c.width; pc.height = c.height;
      const cx = pc.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.clearRect(0,0,pc.width,pc.height);
      cx.drawImage(c, 0, 0);
      this.ui.picTitle.textContent = {
        caretaker:'The Root-Tender', trunk:'Trunk Cross-Section',
        hollowentrance:'The New Hollow', ending_stabilize:'Ending — Stabilize',
        ending_open:'Ending — Open'
      }[id] || '';
      this.ui.picture.hidden = false;
      this.audio.motif();
    });
  }
  closePicture(){
    const r = this.picResolve;
    if (!r) return;
    this.picResolve = null;
    this.ui.picture.hidden = true;
    r();
  }

  /* ---------- misc ui ---------- */
  toast(text){
    this.ui.toast.textContent = text;
    this.ui.toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.ui.toast.hidden = true; }, 2600);
  }

  showEnding(which){
    this.mode = 'ending';
    const title = which === 'stabilize' ? 'STABILIZE' : 'OPEN';
    this.ui.endingTitle.textContent = title;
    this.ui.endingBody.textContent = which === 'stabilize'
      ? 'The supports hold. The tremors ease over the following days, in stages, like a held muscle letting go. Ashhollow never learns what it cost. Out past the ridge, a seam stays open a finger’s width — waiting to be asked again.'
      : 'The trunk opened along its seam and something small went through, unhurried. The pressure has somewhere to go. In spring, things come up that nobody planted, and the keepers argue about it, fondly.';
    this.ui.ending.hidden = false;
    this.audio.motif();
  }

  /* ---------- render ---------- */
  render(now){
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#0b0e09';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!this.state) return;

    const def = MAPS[this.state.map];
    const grid = this.grid(this.state.map);
    const pal = REGION_PAL[def.region] || REGION_PAL.village;

    // camera
    let camX, camY;
    const mw = def.w * TILE, mh = def.h * TILE;
    const pxp = (this.px === undefined ? this.state.x : this.px) * TILE;
    const pyp = (this.py === undefined ? this.state.y : this.py) * TILE;
    camX = mw <= VIEW_W ? -(VIEW_W - mw)/2 : clamp(pxp + TILE/2 - VIEW_W/2, 0, mw - VIEW_W);
    camY = mh <= VIEW_H ? -(VIEW_H - mh)/2 : clamp(pyp + TILE/2 - VIEW_H/2, 0, mh - VIEW_H);

    const sh = this.shake;
    const ox = sh > 0 ? Math.round((Math.random()-.5) * 5 * sh) : 0;
    const oy = sh > 0 ? Math.round((Math.random()-.5) * 4 * sh) : 0;

    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    const x1 = Math.ceil((camX + VIEW_W) / TILE), y1 = Math.ceil((camY + VIEW_H) / TILE);

    // tiles
    for (let y = y0; y <= y1; y++){
      for (let x = x0; x <= x1; x++){
        if (y < 0 || y >= def.h || x < 0 || x >= def.w) continue;
        const ch = this.overrideChar(grid[y][x], x, y, this.state.map);
        const spec = TILES[ch];
        const kind = spec ? spec.t : 'hollowvoid';
        const img = tile(kind);
        let dx = Math.round(x * TILE - camX + ox);
        let dy = Math.round(y * TILE - camY + oy);
        if (this.state.map === 'northvent' && ch === 'i'){ /* cleared ice reads brighter */ }
        ctx.drawImage(img, dx, dy);
      }
    }

    // high-stress detail: thin sap / extra gnaw marks over root maps
    if ((this.state.vars.AxisStress || 0) >= 50 &&
        ['hollow','deeproot'].includes(def.region)){
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#1a0f08';
      for (let y = y0; y <= y1; y++){
        for (let x = x0; x <= x1; x++){
          if (((x*7 + y*13) % 11) !== 0) continue;
          const dx = Math.round(x * TILE - camX + ox) + 4;
          const dy = Math.round(y * TILE - camY + oy) + 5;
          ctx.fillRect(dx, dy, 6, 2);
          ctx.fillRect(dx + 2, dy + 2, 2, 3);
        }
      }
      ctx.restore();
    }

    // events + player, sorted by y so bodies overlap correctly
    const drawables = [];
    for (const ev of def.events || []){
      if (this.evGone(ev)) continue;
      const p = this.evPos(ev);
      if (ev.kind === 'npc' && ev.sprite){
        const pg = this.pageFor(ev);
        if (pg && pg.hide) continue;
        drawables.push({ y:p.y, kind:'npc', ev, p });
      } else if (ev.kind === 'push'){
        const pg = this.pageFor(ev);
        if (pg && pg.hide) continue;
        drawables.push({ y:p.y, kind:'push', ev, p });
      }
    }
    drawables.push({ y:this.py === undefined ? this.state.y : this.py, kind:'player' });
    drawables.sort((a, b) => a.y - b.y);

    for (const d of drawables){
      if (d.kind === 'player'){
        const img = this.playerFrame();
        ctx.drawImage(img, Math.round(pxp - camX + ox), Math.round(pyp - camY + oy) - 2);
      } else if (d.kind === 'npc'){
        const frames = this.sprites[d.ev.sprite] || this.sprites.player;
        const dir = d.ev.dir || 'down';
        const set = frames[dir] || frames.down;
        ctx.drawImage(set[0], Math.round(d.p.x*TILE - camX + ox), Math.round(d.p.y*TILE - camY + oy) - 2);
      } else if (d.kind === 'push'){
        const img = tile(d.ev.tile || 'pushstone');
        ctx.drawImage(img, Math.round(d.p.x*TILE - camX + ox), Math.round(d.p.y*TILE - camY + oy));
      }
    }

    // region grade
    if (def.region === 'hollow' || def.region === 'deeproot' || def.region === 'trunk'){
      const g = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, 90, VIEW_W/2, VIEW_H/2, 240);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.34)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (def.region === 'north'){
      ctx.fillStyle = 'rgba(180,205,225,0.05)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  playerFrame(){
    const frames = this.sprites.player;
    const set = frames[this.state.dir] || frames.down;
    if (!this.moving) return set[0];
    const phase = Math.floor(this.moveT / (STEP_MS / 2)) % 3;
    return set[[0,1,2][phase]];
  }
}
