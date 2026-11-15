// Map/event validator for THE AXIS. Node: node tools/validate.mjs
// Checks geometry, arrivals, walkability, and reachability of every story-critical event.

import { MAPS, TILES, START } from '../js/data.js';

let errors = 0, warns = 0;
const err = (m) => { errors++; console.log('ERROR  ' + m); };
const warn = (m) => { warns++; console.log('warn   ' + m); };

/* ---- rebuild grids exactly like the engine ---- */
function buildGrid(def){
  const g = [];
  for (let y=0; y<def.h; y++) g.push(new Array(def.w).fill(def.fill || '.'));
  const put = (x,y,ch) => { if (g[y] && g[y][x] !== undefined) g[y][x] = ch; };
  for (const op of (def.ops || [])){
    const [k] = op;
    if (k === 'put') put(op[1],op[2],op[3]);
    else if (k === 'rect'){ const [,x,y,w,h,ch]=op; for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,ch); }
    else if (k === 'h'){ const [,x1,x2,y,ch]=op; for(let i=x1;i<=x2;i++)put(i,y,ch); }
    else if (k === 'v'){ const [,x,y1,y2,ch]=op; for(let j=y1;j<=y2;j++)put(x,j,ch); }
    else if (k === 'border'){ const ch=op[1];
      for(let i=0;i<def.w;i++){put(i,0,ch);put(i,def.h-1,ch);}
      for(let j=0;j<def.h;j++){put(0,j,ch);put(def.w-1,j,ch);}
    }
    else err(`unknown op '${k}' in map`);
  }
  return g;
}

const grids = {};
for (const [id, def] of Object.entries(MAPS)){
  grids[id] = buildGrid(def);
  if (grids[id].length !== def.h) err(`${id}: grid height ${grids[id].length} != ${def.h}`);
  grids[id].forEach((row, y) => { if (row.length !== def.w) err(`${id}: row ${y} width ${row.length} != ${def.w}`); });
  for (const row of grids[id]) for (const ch of row){
    if (!TILES[ch]) err(`${id}: unknown tile char '${ch}'`);
  }
}

/* ---- helpers ---- */
const solidStatic = (ch) => {
  const t = TILES[ch]; if (!t) return true;
  return t.solid === true;                        // 'mark' barriers count as passable for reachability
};
const inBounds = (def,x,y) => x>=0 && y>=0 && x<def.w && y<def.h;
const evPos = (ev) => ({ x: ev.x, y: ev.y });

/* ---- event sanity ---- */
for (const [id, def] of Object.entries(MAPS)){
  const seen = new Map();
  for (const ev of def.events || []){
    if (!inBounds(def, ev.x, ev.y)) { err(`${id}/${ev.id}: event out of bounds (${ev.x},${ev.y})`); continue; }
    const key = `${ev.x},${ev.y}`;
    if (seen.has(key)) warn(`${id}: events '${seen.get(key)}' and '${ev.id}' share tile ${key}`);
    seen.set(key, ev.id);
    const ch = grids[id][ev.y][ev.x];
    if (ev.kind === 'npc' && solidStatic(ch)) err(`${id}/${ev.id}: NPC stands on solid tile '${ch}'`);
    if (ev.kind === 'push' && solidStatic(ch)) err(`${id}/${ev.id}: pushable stone starts on solid tile '${ch}'`);
    for (const pg of ev.pages || []){
      if (pg.to){
        const t = MAPS[pg.to.map];
        if (!t) { err(`${id}/${ev.id}: transfer to missing map '${pg.to.map}'`); continue; }
        if (!inBounds(t, pg.to.x, pg.to.y)) { err(`${id}/${ev.id}: transfer target out of bounds ${pg.to.map} (${pg.to.x},${pg.to.y})`); continue; }
        const tch = grids[pg.to.map][pg.to.y][pg.to.x];
        if (solidStatic(tch)) err(`${id}/${ev.id}: arrival ${pg.to.map}(${pg.to.x},${pg.to.y}) lands on SOLID tile '${tch}'`);
        const blocking = (t.events||[]).filter(e => e.solid && e.x===pg.to.x && e.y===pg.to.y && !e.pages?.[0]?.cond);
        if (blocking.length) warn(`${id}/${ev.id}: arrival tile occupied by solid event '${blocking[0].id}'`);
      }
    }
  }
}

/* ---- reachability (BFS over walkable tiles + transfers) ---- */
const adj = (x,y) => [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
const reached = new Map();     // mapId -> Set of "x,y"
function walkable(id, x, y, withEvents = true){
  const def = MAPS[id];
  if (!inBounds(def,x,y)) return false;
  const ch = grids[id][y][x];
  if (solidStatic(ch)) return false;
  if (withEvents){
    for (const ev of def.events || []){
      const p = evPos(ev);
      if (p.x===x && p.y===y && ev.solid && ev.kind !== 'push') return false;
    }
  }
  return true;
}

/* pull every teleport destination out of a script, including nested branches */
function scriptTeleports(actions){
  const out = [];
  const walk = (list) => {
    for (const a of (list || [])){
      if (!a || typeof a !== 'object') continue;
      if (a.t === 'teleport') out.push({ map:a.map, x:a.x, y:a.y });
      if (a.t === 'if'){ walk(a.then); walk(a.else); }
      if (a.t === 'choice') for (const o of a.options || []) walk(o.do);
    }
  };
  walk(actions);
  return out;
}

function bfs(startMap, sx, sy){
  const q = [[startMap, sx, sy]];
  const seen = new Set([`${startMap}:${sx},${sy}`]);
  while (q.length){
    const [id, x, y] = q.shift();
    if (!reached.has(id)) reached.set(id, new Set());
    reached.get(id).add(`${x},${y}`);
    // stepping onto / walking into a transfer or touch trigger
    for (const ev of MAPS[id].events || []){
      const p = evPos(ev);
      const adjacent = Math.abs(p.x - x) + Math.abs(p.y - y) <= 1;
      if (!adjacent) continue;
      if (ev.kind !== 'transfer' && ev.kind !== 'trigger' && ev.kind !== 'object' && ev.kind !== 'npc') continue;
      const targets = [];
      if (ev.to) targets.push(ev.to);
      for (const pg of ev.pages || []){
        if (pg.to) targets.push(pg.to);
        for (const t of scriptTeleports(pg.actions)) targets.push(t);
      }
      for (const t of scriptTeleports(ev.actions)) targets.push(t);
      for (const to of targets){
        const k = `${to.map}:${to.x},${to.y}`;
        if (!seen.has(k)) { seen.add(k); q.push([to.map, to.x, to.y]); }
      }
    }
    for (const [nx, ny] of adj(x,y)){
      if (!walkable(id, nx, ny)) continue;
      const k = `${id}:${nx},${ny}`;
      if (!seen.has(k)) { seen.add(k); q.push([id, nx, ny]); }
    }
  }
}

bfs(START.map, START.x, START.y);
if (!reached.get(START.map)?.has(`${START.x},${START.y}`)) err('start tile is not reachable/walkable');

for (const [id, def] of Object.entries(MAPS)){
  const r = reached.get(id);
  if (!r) { warn(`map '${id}' is unreachable from start`); continue; }
  for (const ev of def.events || []){
    const p = evPos(ev);
    const selfReach = r.has(`${p.x},${p.y}`);
    // an object is reachable if the player can stand on it, or adjacent to it and face it
    const near = selfReach || adj(p.x, p.y).some(([ax, ay]) => r.has(`${ax},${ay}`));
    if (!near) err(`${id}/${ev.id}: NOT REACHABLE at (${p.x},${p.y})`);
  }
}

/* ---- story-completeness spot checks ---- */
const need = [
  ['home','vela'], ['home','ledger'], ['village','to_north'], ['village','to_east'], ['village','to_west'],
  ['shrine','mara'], ['shrine','oldroot'], ['ridgepath','hollowmouth'],
  ['hollow1','sap1'], ['hollow2','carving'], ['hollow3','remnant'], ['hollow4','trunksection'], ['hollow4','wayout'],
  ['north','keeperN'], ['north','cairn'], ['north','ventdoor'], ['northvent','plug1'], ['northvent','plug3'], ['northvent','plug2'],
  ['east','keeperE'], ['east','pushstone'], ['east','tree'],
  ['west','keeperW'], ['west','centrestone'], ['west','deb1'], ['west','deb2'], ['west','deb3'],
  ['deeproot','totrunk'], ['trunk','axisheart']
];
for (const [map, id] of need){
  const found = (MAPS[map]?.events || []).find(e => e.id === id);
  if (!found) err(`missing required event ${map}/${id}`);
}

console.log(`\n${Object.keys(MAPS).length} maps checked · ${errors} errors · ${warns} warnings`);
process.exit(errors ? 1 : 0);
