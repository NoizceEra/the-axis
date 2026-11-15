// THE AXIS — procedural art. Game Boy-flavoured limited palettes, 16x16 tiles.
// Everything is drawn at boot into offscreen canvases; no external assets.

export const TILE = 16;

/* ---------------- palettes ---------------- */

export const REGION_PAL = {
  village: { sky:'#0e120d', base:'#7d8a5c', dark:'#3f4a35', mid:'#5f6b47', light:'#9aa878',
             earth:'#8a7550', earthDark:'#5a4a30', water:'#41615f', accent:'#c8b06a', ink:'#20281c' },
  interior:{ sky:'#0e120d', base:'#8a7550', dark:'#3c352a', mid:'#6b5334', light:'#a89066',
             earth:'#6b5334', earthDark:'#3c352a', water:'#41615f', accent:'#c8b06a', ink:'#1a1712' },
  shrine:  { sky:'#0e120d', base:'#6f7566', dark:'#37392f', mid:'#565c4d', light:'#8f9683',
             earth:'#6f7566', earthDark:'#37392f', water:'#41615f', accent:'#c8b06a', ink:'#1a1c16' },
  ridge:   { sky:'#0e120d', base:'#6b6b5e', dark:'#33342c', mid:'#525244', light:'#8b8b7b',
             earth:'#6b6b5e', earthDark:'#33342c', water:'#41615f', accent:'#c8b06a', ink:'#1a1c16' },
  hollow:  { sky:'#0b0a07', base:'#43362a', dark:'#120e09', mid:'#56442f', light:'#8a6c42',
             earth:'#4a3a2a', earthDark:'#191410', water:'#2b3b33', accent:'#c8b06a', ink:'#0d0b08' },
  north:   { sky:'#0d1114', base:'#8fa0ad', dark:'#3b4a54', mid:'#6a7d8a', light:'#c2cdd4',
             earth:'#6a7d8a', earthDark:'#3b4a54', water:'#5d7d92', accent:'#d9e6ee', ink:'#1a2228' },
  east:    { sky:'#0c1210', base:'#6f9a8e', dark:'#2f4a43', mid:'#527a6e', light:'#a5c4b6',
             earth:'#6b6047', earthDark:'#3a3428', water:'#3f6157', accent:'#9ec4a8', ink:'#141b18' },
  west:    { sky:'#120f0a', base:'#b08f56', dark:'#5c4a2a', mid:'#8a6f3f', light:'#d1b47c',
             earth:'#8a6f3f', earthDark:'#5c4a2a', water:'#41615f', accent:'#e0c78e', ink:'#1f1a11' },
  deeproot:{ sky:'#080705', base:'#463629', dark:'#100b07', mid:'#5c4632', light:'#93713f',
             earth:'#54402e', earthDark:'#160f0a', water:'#2b3b33', accent:'#e0c070', ink:'#0a0806' },
  trunk:   { sky:'#0a0806', base:'#54402c', dark:'#160f08', mid:'#75593a', light:'#a07a45',
             earth:'#6b5030', earthDark:'#1c140d', water:'#2b3b33', accent:'#e8ca78', ink:'#0c0906' }
};

/* ---------------- deterministic noise ---------------- */

function prng(seed){
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function hash(str){ let h = 2166136261; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619); } return h >>> 0; }

/* ---------------- canvas helpers ---------------- */

function cv(w, h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

function rect(x, px, py, w, h, color){ x.fillStyle = color; x.fillRect(px, py, w, h); }

/* ---------------- tile painters ----------------
   motif: how a 16x16 tile of that material is textured
   --------------------------------------------------- */

const MOTIFS = {
  flat(x, p, r){ rect(x,0,0,16,16,p.base); },

  blades(x, p, r){                    // grass
    rect(x,0,0,16,16,p.base);
    for (let i=0;i<10;i++){
      const gx = Math.floor(r()*16), gy = 3 + Math.floor(r()*11);
      rect(x,gx,gy,1,2, r()>.5 ? p.light : p.mid);
    }
  },

  tuft(x, p, r){                     // taller grass with a couple of blades
    rect(x,0,0,16,16,p.base);
    for (let i=0;i<7;i++) rect(x, Math.floor(r()*16), 4+Math.floor(r()*12), 1, 3, p.mid);
    const gx = 3+Math.floor(r()*9);
    rect(x,gx,5,1,7,p.light); rect(x,gx+1,7,1,5,p.light); rect(x,gx-1,8,1,4,p.light);
  },

  speck(x, p, r){                    // earth / gravel
    rect(x,0,0,16,16,p.base);
    for (let i=0;i<16;i++) rect(x, Math.floor(r()*16), Math.floor(r()*16), 1, 1, r()>.5?p.dark:p.light);
  },

  path(x, p, r){                     // trodden dirt path
    rect(x,0,0,16,16,p.earth);
    for (let i=0;i<12;i++) rect(x, Math.floor(r()*16), Math.floor(r()*16), 1+Math.floor(r()*2), 1, r()>.6?p.earthDark:p.light);
  },

  plank(x, p, r){                    // wooden interior floor
    rect(x,0,0,16,16,p.base);
    for (let y=0;y<16;y+=4){ rect(x,0,y,16,1,p.dark); }
    for (let y=0;y<16;y+=4){
      const off = (y/4 % 2) ? 5 : 11;
      rect(x,off,y,1,4,p.dark);
    }
    rect(x,0,0,16,1,p.light);
  },

  brick(x, p, r){                    // walls
    rect(x,0,0,16,16,p.dark);
    for (let row=0;row<4;row++){
      const y = row*4;
      for (let col=0;col<2;col++){
        const bx = col*8 + (row%2?4:0);
        rect(x, bx, y, 7, 3, row%2 ? p.mid : p.base);
        rect(x, bx, y, 7, 1, p.light);
      }
    }
  },

  rock(x, p, r){                     // cliff / boulder face
    rect(x,0,0,16,16,p.dark);
    for (let i=0;i<5;i++){
      const bx = Math.floor(r()*13), by = Math.floor(r()*13);
      rect(x,bx,by,2+Math.floor(r()*3),2+Math.floor(r()*3), r()>.5?p.mid:p.base);
    }
    rect(x,1,1,14,1,p.mid);
  },

  water(x, p, r){
    rect(x,0,0,16,16,p.water);
    for (let i=0;i<4;i++){
      const wy = 2 + Math.floor(r()*12);
      rect(x, Math.floor(r()*8), wy, 5+Math.floor(r()*6), 1, p.light);
    }
  },

  reeds(x, p, r){
    rect(x,0,0,16,16,p.water);
    for (let i=0;i<5;i++){
      const rx = Math.floor(r()*14), rh = 5+Math.floor(r()*8);
      rect(x,rx,16-rh,1,rh, p.mid);
      rect(x,rx,16-rh,1,2, p.light);
    }
  },

  rootFloor(x, p, r){                 // hollow floor: packed root fibre, kept quiet
    rect(x,0,0,16,16,p.base);
    for (let i=0;i<3;i++){
      const ry = 2 + Math.floor(r()*12);
      rect(x,0,ry,16,1,p.mid);
    }
    for (let i=0;i<4;i++) rect(x,Math.floor(r()*16),Math.floor(r()*16),1,1,p.light);
  },

  rootWall(x, p, r){                  // walls of woven root: dark mass, lit top edge
    rect(x,0,0,16,16,p.dark);
    for (let i=0;i<3;i++){
      const bx = 1 + Math.floor(r()*11), by = 2 + Math.floor(r()*11);
      rect(x,bx,by,3+Math.floor(r()*3),3+Math.floor(r()*2), p.mid);
    }
    for (let i=0;i<4;i++) rect(x, Math.floor(r()*16), 3, 1, 13, p.base);
    rect(x,0,0,16,3,p.light);         // lit cap: the wall reads against a floor of the same family
    rect(x,0,3,16,1,p.dark);
  },

  bark(x, p, r){                      // trunk interior wall
    rect(x,0,0,16,16,p.dark);
    for (let i=0;i<5;i++){
      const rx = 1 + Math.floor(r()*14);
      rect(x,rx,2,1+Math.floor(r()*2),14, r()>.55?p.mid:p.base);
    }
    rect(x,0,0,16,2,p.base);
    rect(x,0,0,16,1,p.light);
  },

  ice(x, p, r){
    rect(x,0,0,16,16,p.base);
    for (let i=0;i<6;i++){
      const ix = Math.floor(r()*14), iy = Math.floor(r()*14);
      rect(x,ix,iy,2,1,p.light);
      rect(x,ix,iy+1,1,1,p.mid);
    }
    rect(x,0,0,1,16,p.light);
  },

  snow(x, p, r){
    rect(x,0,0,16,16,p.light);
    for (let i=0;i<10;i++) rect(x,Math.floor(r()*16),Math.floor(r()*16),1,1,p.base);
    for (let i=0;i<4;i++) rect(x,Math.floor(r()*16),Math.floor(r()*16),2,1,p.mid);
  },

  ash(x, p, r){
    rect(x,0,0,16,16,p.dark);
    for (let i=0;i<14;i++) rect(x,Math.floor(r()*16),Math.floor(r()*16),1,1, r()>.5?p.base:p.mid);
  },

  carved(x, p, r){                    // worked stone
    rect(x,0,0,16,16,p.base);
    rect(x,0,0,16,1,p.light); rect(x,0,15,16,1,p.dark);
    rect(x,0,0,1,16,p.light); rect(x,15,0,1,16,p.dark);
    rect(x,7,0,1,16,p.mid);
  },

  mossStone(x, p, r){
    rect(x,0,0,16,16,p.mid);
    for (let i=0;i<8;i++) rect(x,Math.floor(r()*16),Math.floor(r()*16),2,1,p.dark);
    for (let i=0;i<6;i++) rect(x,Math.floor(r()*16),Math.floor(r()*16),1,1,p.base);
    rect(x,0,0,16,1,p.light);
  }
};

/* tile kind -> [motif, paletteKeys] ; solidity lives in data.js */
export const TILE_ART = {
  grass:      ['blades','village'],  grass2:['tuft','village'],  path:['path','village'],
  tree:       ['rock','village'],    wall:['brick','village'],   water:['water','village'],
  floor:      ['plank','interior'],  ifloor:['plank','interior'], iwall:['brick','interior'],
  counter:    ['brick','interior'],  shrinestone:['carved','shrine'], shrinecrack:['mossStone','shrine'],
  rock:       ['rock','ridge'],      ridgepath:['path','ridge'],  scree:['speck','ridge'],
  rootfloor:  ['rootFloor','hollow'], rootwall:['rootWall','hollow'], sap:['rootFloor','hollow'],
  rootbarrier:['rootWall','hollow'], hollowvoid:['flat','hollow'],
  snow:       ['snow','north'],      ice:['ice','north'],        iceblock:['ice','north'],
  cairn:      ['carved','north'],    vent:['rock','north'],
  marsh:      ['tuft','east'],       marshwater:['water','east'], reeds:['reeds','east'],
  growth:     ['rootWall','east'],   channel:['marshwater','east'], pushstone:['carved','east'],
  drygrass:   ['speck','west'],      ash:['ash','west'],         circlestone:['carved','west'],
  debris:     ['rock','west'],       pitfloor:['scree','west'],
  deepfloor:  ['rootFloor','deeproot'], deepwall:['rootWall','deeproot'], platform:['carved','deeproot'],
  trunkfloor: ['bark','trunk'],      trunkwall:['rootWall','trunk'], livingwood:['bark','trunk'],
  bed:        ['plank','interior'],  table:['brick','interior'],  well:['carved','village'],
  sign:       ['carved','village'],  flowers:['tuft','village'],  pit:['flat','hollow']
};

const tileCache = new Map();

export function tile(kind){
  if (tileCache.has(kind)) return tileCache.get(kind);
  const spec = TILE_ART[kind] || TILE_ART.grass;
  const [motifName, palName] = spec;
  const p = REGION_PAL[palName] || REGION_PAL.village;
  const [c, x] = cv(TILE, TILE);
  const r = prng(hash(kind));
  (MOTIFS[motifName] || MOTIFS.flat)(x, p, r);
  // per-kind garnish that makes landmarks read instantly
  garnish(x, kind, p, r);
  tileCache.set(kind, c);
  return c;
}

function garnish(x, kind, p, r){
  switch (kind){
    case 'tree': {
      rect(x,0,0,16,16,REGION_PAL.village.base);          // grass underfoot
      const dark = '#1c2418', body = '#3f4a35', top = '#5f6b47';
      x.fillStyle = dark; x.beginPath(); x.arc(8,7,7,0,Math.PI*2); x.fill();
      x.fillStyle = body; x.beginPath(); x.arc(8,7,6,0,Math.PI*2); x.fill();
      x.fillStyle = top;  x.beginPath(); x.arc(7,5,4,0,Math.PI*2); x.fill();
      x.fillStyle = REGION_PAL.village.light;
      x.fillRect(5,2,4,1); x.fillRect(6,1,2,1);
      // trunk drawn last so it is not swallowed by the canopy
      rect(x,7,10,3,6,'#3a2b1d');
      rect(x,7,10,1,6,'#5c4a33');
      rect(x,10,10,1,6,'#241a12');
      rect(x,6,15,5,1,'#20281c');                          // root flare
      break;
    }
    case 'sap': {
      rect(x,0,0,16,16,REGION_PAL.hollow.base);
      for (let i=0;i<3;i++) rect(x,0,3+i*4,16,1,REGION_PAL.hollow.mid);
      rect(x,5,4,2,7,REGION_PAL.hollow.accent);       // glowing bead
      rect(x,10,9,1,4,REGION_PAL.hollow.accent);
      break;
    }
    case 'rootbarrier': {
      for (let i=0;i<3;i++) rect(x, 2+i*4, 0, 2, 16, REGION_PAL.hollow.mid);
      rect(x,0,7,16,2,REGION_PAL.hollow.accent);
      break;
    }
    case 'well': {
      rect(x,0,0,16,16,p.base);
      rect(x,1,1,14,14,'#3a3a30');       // stone rim, dark outline
      rect(x,2,2,12,12,p.mid);
      rect(x,2,2,12,1,p.light);
      rect(x,0,0,16,1,'#20281c'); rect(x,0,15,16,1,'#20281c');
      rect(x,0,0,1,16,'#20281c'); rect(x,15,0,1,16,'#20281c');
      rect(x,4,4,8,8,p.water);
      rect(x,4,4,8,1,'#5d8380');
      rect(x,5,8,5,1,'#5d8380');
      break;
    }
    case 'bed': {
      rect(x,0,3,16,11,p.mid);
      rect(x,1,4,14,4,p.light);   // pillow
      rect(x,0,9,16,5,p.base);
      break;
    }
    case 'table': {
      rect(x,1,3,14,10,p.mid);
      rect(x,1,3,14,1,p.light);
      rect(x,1,11,14,1,p.dark);
      break;
    }
    case 'counter': {
      rect(x,0,2,16,12,p.mid);
      rect(x,0,2,16,1,p.light);
      rect(x,0,12,16,2,p.dark);
      break;
    }
    case 'shrinecrack': {
      for (let i=0;i<16;i++){
        const cy = Math.floor(i*0.9) + (i%3===0?1:0);
        rect(x, i, Math.min(15,cy), 1, 2, REGION_PAL.shrine.ink);
      }
      break;
    }
    case 'sign': {
      rect(x,2,2,12,8,p.earth);
      rect(x,2,2,12,1,p.light);
      rect(x,7,10,2,6,p.earthDark);
      for (let i=0;i<3;i++) rect(x,4,4+i*2,8,1,p.earthDark);
      break;
    }
    case 'iceblock': {
      rect(x,1,1,14,14,p.mid);
      rect(x,2,2,12,12,p.light);
      rect(x,2,2,12,1,p.accent);
      rect(x,4,5,7,1,p.base);
      rect(x,6,9,5,1,p.base);
      break;
    }
    case 'cairn': {
      rect(x,0,0,16,16,REGION_PAL.north.base);
      rect(x,4,3,8,11,REGION_PAL.north.dark);
      rect(x,3,6,10,1,REGION_PAL.north.light);
      rect(x,3,9,10,1,REGION_PAL.north.light);
      rect(x,5,1,6,3,REGION_PAL.north.mid);
      break;
    }
    case 'vent': {
      rect(x,0,0,16,16,REGION_PAL.north.dark);
      rect(x,4,4,8,8,REGION_PAL.north.ink);
      rect(x,5,5,6,6,'#0a0f12');
      rect(x,4,4,8,1,REGION_PAL.north.mid);
      break;
    }
    case 'circlestone': {
      rect(x,0,0,16,16,REGION_PAL.west.earthDark);
      rect(x,2,2,12,12,REGION_PAL.west.mid);
      rect(x,3,3,10,10,REGION_PAL.west.base);
      rect(x,6,6,4,4,REGION_PAL.west.accent);
      break;
    }
    case 'debris': {
      rect(x,0,0,16,16,REGION_PAL.west.dark);
      rect(x,2,4,5,4,REGION_PAL.west.mid);
      rect(x,8,6,6,5,REGION_PAL.west.base);
      rect(x,4,9,4,3,REGION_PAL.west.mid);
      break;
    }
    case 'growth': {
      rect(x,0,0,16,16,REGION_PAL.east.dark);
      rect(x,4,0,3,16,REGION_PAL.east.mid);
      rect(x,9,0,2,16,REGION_PAL.east.mid);
      rect(x,4,3,3,1,REGION_PAL.east.accent);
      rect(x,9,10,2,1,REGION_PAL.east.accent);
      break;
    }
    case 'pushstone': {
      rect(x,1,1,14,14,REGION_PAL.east.light);
      rect(x,2,2,12,12,REGION_PAL.east.base);
      rect(x,5,5,6,6,REGION_PAL.east.accent);
      break;
    }
    case 'growthgate': {
      rect(x,0,0,16,16,REGION_PAL.east.dark);
      for (let i=0;i<4;i++) rect(x, 1+i*4, 0, 2, 16, REGION_PAL.east.mid);
      break;
    }
    case 'platform': {
      rect(x,0,0,16,16,REGION_PAL.deeproot.dark);
      rect(x,0,0,16,3,REGION_PAL.deeproot.mid);
      rect(x,0,0,16,1,REGION_PAL.deeproot.light);
      break;
    }
    case 'livingwood': {
      rect(x,0,0,16,16,REGION_PAL.trunk.mid);
      for (let i=0;i<3;i++) rect(x, Math.floor(r()*16), 0, 1, 16, REGION_PAL.trunk.dark);
      rect(x,0,7,16,2,REGION_PAL.trunk.accent);
      rect(x,0,7,16,1,REGION_PAL.trunk.light);
      break;
    }
    case 'flowers': {
      const cs = [REGION_PAL.village.accent,'#c98f8f','#9fb4d8'];
      for (let i=0;i<5;i++) rect(x, 2+Math.floor(r()*12), 2+Math.floor(r()*12), 1, 1, cs[i%3]);
      break;
    }
    case 'pit': {
      rect(x,0,0,16,16,'#050403');
      break;
    }
    case 'hollowvoid': {
      rect(x,0,0,16,16,REGION_PAL.hollow.sky);
      break;
    }
  }
}

/* ---------------- character sprites ---------------- */

export const CHAR_SPECS = {
  player:  { skin:'#d3ad7c', hair:'#3a2b1d', cloth:'#a7b06a', trim:'#e6d9a0', pants:'#4a4231' },
  mara:    { skin:'#bfa07a', hair:'#d8d4c8', cloth:'#6b7346', trim:'#a08b4f', pants:'#3f4632' },
  vela:    { skin:'#c9a678', hair:'#7a4a30', cloth:'#8a7550', trim:'#c9b489', pants:'#4a3a2a' },
  keeperN: { skin:'#d3bda0', hair:'#8fa0ad', cloth:'#5d7d92', trim:'#c2cdd4', pants:'#3b4a54' },
  keeperE: { skin:'#b3956f', hair:'#2f4a43', cloth:'#527a6e', trim:'#a5c4b6', pants:'#2f4a43' },
  keeperW: { skin:'#c0a071', hair:'#5c4a2a', cloth:'#8a6f3f', trim:'#d1b47c', pants:'#5c4a2a' },
  villager1:{ skin:'#c9a678', hair:'#3a2e22', cloth:'#7d8a5c', trim:'#9aa878', pants:'#4a4231' },
  villager2:{ skin:'#a98a63', hair:'#8a6f3f', cloth:'#8a7550', trim:'#c8b06a', pants:'#3c352a' },
  villager3:{ skin:'#cbb18d', hair:'#2b2620', cloth:'#6f7566', trim:'#8f9683', pants:'#3f4632' },
  remnant: { skin:'#3a2e22', hair:'#b9a35a', cloth:'#4a3a2a', trim:'#d8b96a', pants:'#191410' },
  elder_shade:{ skin:'#7a6a4a', hair:'#c8b06a', cloth:'#33342c', trim:'#b9a35a', pants:'#20281c' }
};

const DIRS = ['down','left','right','up'];

export function charFrames(name){
  const spec = CHAR_SPECS[name] || CHAR_SPECS.player;
  const isPlayer = name === 'player';
  const out = {};
  for (const d of DIRS){
    out[d] = [0,1,2].map(step => drawChar(spec, d, step, isPlayer));
  }
  return out;
}

/* a 1px rim so characters read against any floor */
function outlineSprite(c, rgb = [16, 12, 8]){
  const x = c.getContext('2d');
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const idx = (px, py) => (py * c.width + px) * 4;
  const solid = (i) => d[i + 3] > 200;              // ignore the soft drop shadow
  for (let y = 0; y < c.height; y++){
    for (let px = 0; px < c.width; px++){
      const i = idx(px, y);
      if (solid(i)) continue;
      let near = false;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx = px + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= c.width || ny >= c.height) continue;
        if (solid(idx(nx, ny))){ near = true; break; }
      }
      if (near){
        out[i] = rgb[0]; out[i+1] = rgb[1]; out[i+2] = rgb[2]; out[i+3] = 232;
      }
    }
  }
  x.putImageData(new ImageData(out, c.width, c.height), 0, 0);
  return c;
}

function drawChar(s, dir, step, isPlayer){
  const [c, x] = cv(TILE, TILE);
  const bob = step === 1 ? 1 : 0;              // 3-frame walk: down, mid, up
  const legPhase = [0, 1, -1][step];

  // shadow
  x.fillStyle = 'rgba(0,0,0,.35)';
  x.fillRect(4, 14, 8, 2);

  // the player carries a pale cord over one shoulder: a readable "this is you" cue
  if (isPlayer){
    rect(x, 9, 6 - bob, 1, 5, '#e6d9a0');
    rect(x, 8, 10 - bob, 3, 1, '#c8b06a');
  }

  // legs
  rect(x, 5, 11 - bob, 2, 3 + (legPhase === 1 ? 1 : 0), s.pants);
  rect(x, 9, 11 - bob, 2, 3 + (legPhase === -1 ? 1 : 0), s.pants);

  // body
  rect(x, 4, 6 - bob, 8, 6, s.cloth);
  rect(x, 4, 6 - bob, 8, 1, s.trim);           // collar
  rect(x, 7, 7 - bob, 2, 5, s.trim);           // placket
  // arms
  rect(x, 3, 7 - bob, 1, 4, s.cloth);
  rect(x, 12, 7 - bob, 1, 4, s.cloth);

  // head
  rect(x, 5, 1 - bob, 6, 5, s.skin);
  // hair (direction-dependent)
  if (dir === 'up'){
    rect(x, 4, 0 - bob, 8, 5, s.hair);
    rect(x, 4, 4 - bob, 8, 1, s.skin);
  } else {
    rect(x, 4, 0 - bob, 8, 2, s.hair);
    rect(x, 4, 2 - bob, 1, 2, s.hair);
    rect(x, 11, 2 - bob, 1, 2, s.hair);
    // eyes
    if (dir === 'down'){
      rect(x, 6, 3 - bob, 1, 1, '#221c14');
      rect(x, 9, 3 - bob, 1, 1, '#221c14');
    } else if (dir === 'left'){
      rect(x, 5, 3 - bob, 1, 1, '#221c14');
      rect(x, 7, 3 - bob, 1, 1, '#221c14');
      rect(x, 5, 2 - bob, 6, 1, s.skin);
    } else {
      rect(x, 8, 3 - bob, 1, 1, '#221c14');
      rect(x, 10, 3 - bob, 1, 1, '#221c14');
      rect(x, 5, 2 - bob, 6, 1, s.skin);
    }
  }
  return outlineSprite(c, isPlayer ? [214, 190, 118] : [16, 12, 8]);
}

/* ---------------- pictures (the "show picture" events) ---------------- */

const PIC_W = 240, PIC_H = 144;

export function drawPicture(id){
  const [c, x] = cv(PIC_W, PIC_H);
  x.imageSmoothingEnabled = false;
  const r = prng(hash(id));

  const wash = (top, bot) => {
    const g = x.createLinearGradient(0,0,0,PIC_H);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    x.fillStyle = g; x.fillRect(0,0,PIC_W,PIC_H);
  };

  if (id === 'caretaker'){
    wash('#14100b', '#080605');
    // root chamber framing
    x.fillStyle = '#241a12';
    for (let i=0;i<26;i++){
      const rx = Math.floor(r()*PIC_W);
      x.fillRect(rx, 0, 2 + Math.floor(r()*5), PIC_H);
    }
    x.fillStyle = '#3a2b1d';
    for (let i=0;i<14;i++){
      const rx = Math.floor(r()*PIC_W);
      x.fillRect(rx, 0, 1, PIC_H);
    }
    // hollow at centre
    x.fillStyle = '#0a0806';
    x.beginPath(); x.ellipse(PIC_W/2, PIC_H/2+8, 46, 56, 0, 0, Math.PI*2); x.fill();
    // the remnant: masked figure, tall, thin
    x.fillStyle = '#171310';
    x.fillRect(PIC_W/2-14, 40, 28, 74);
    x.fillStyle = '#2a2118';
    x.fillRect(PIC_W/2-18, 34, 36, 10);
    // mask
    x.fillStyle = '#8a7a4a';
    x.fillRect(PIC_W/2-10, 44, 20, 24);
    x.fillStyle = '#c8b06a';
    x.fillRect(PIC_W/2-6, 52, 4, 3);              // eyes
    x.fillRect(PIC_W/2+2, 52, 4, 3);
    x.fillStyle = '#3a3226';
    x.fillRect(PIC_W/2-3, 60, 6, 1);
    // antler-like roots
    x.strokeStyle = '#4a3a2a'; x.lineWidth = 2;
    for (const sx of [-1, 1]){
      x.beginPath();
      x.moveTo(PIC_W/2 + sx*10, 40);
      x.lineTo(PIC_W/2 + sx*20, 24);
      x.lineTo(PIC_W/2 + sx*14, 12);
      x.stroke();
    }
    // sap glow
    x.fillStyle = 'rgba(200,176,106,.20)';
    x.beginPath(); x.ellipse(PIC_W/2, 74, 54, 64, 0, 0, Math.PI*2); x.fill();
    x.fillStyle = '#c8b06a';
    for (let i=0;i<16;i++) x.fillRect(Math.floor(r()*PIC_W), Math.floor(r()*PIC_H), 1, 2);
    return c;
  }

  if (id === 'trunk'){
    // trunk cross-section: rings, thinning bark, gnaw marks
    wash('#2a2118', '#120d09');
    const cx = PIC_W/2, cy = PIC_H/2;
    for (let ring=26; ring>=2; ring-=3){
      x.strokeStyle = ring % 2 ? '#4a3a2a' : '#3a2b1d';
      x.lineWidth = 1;
      x.beginPath(); x.ellipse(cx, cy, ring*1.5, ring, 0, 0, Math.PI*2); x.stroke();
    }
    // thin bark band
    x.strokeStyle = '#6b5334'; x.lineWidth = 5;
    x.beginPath(); x.ellipse(cx, cy, 88, 60, 0, 0, Math.PI*2); x.stroke();
    x.strokeStyle = '#8a6f3f'; x.lineWidth = 2;
    x.beginPath(); x.ellipse(cx, cy, 88, 60, 0, 0, Math.PI*2); x.stroke();
    // gnaw marks on the upper-left arc
    x.strokeStyle = '#0d0a07'; x.lineWidth = 3;
    for (let i=0;i<7;i++){
      const a = Math.PI*1.05 + i*0.09;
      x.beginPath();
      x.moveTo(cx + Math.cos(a)*80, cy + Math.sin(a)*54);
      x.lineTo(cx + Math.cos(a)*95, cy + Math.sin(a)*64);
      x.stroke();
    }
    // sap beads
    x.fillStyle = '#c8b06a';
    for (let i=0;i<6;i++) x.fillRect(cx - 40 + Math.floor(r()*80), cy - 20 + Math.floor(r()*44), 1, 2);
    return c;
  }

  if (id === 'hollowentrance'){
    wash('#1a1710', '#0a0806');
    // ridge silhouette
    x.fillStyle = '#2c2a22';
    x.beginPath(); x.moveTo(0, PIC_H); x.lineTo(0, 92); x.lineTo(60, 58);
    x.lineTo(120, 88); x.lineTo(180, 46); x.lineTo(PIC_W, 84); x.lineTo(PIC_W, PIC_H);
    x.closePath(); x.fill();
    // leaning trees
    x.strokeStyle = '#3a2b1d'; x.lineWidth = 3;
    for (let i=0;i<6;i++){
      const bx = 16 + i*40, lean = (r()-.5)*10;
      x.beginPath(); x.moveTo(bx, 120); x.lineTo(bx+lean, 74); x.stroke();
      x.fillStyle = '#4a5540';
      x.beginPath(); x.ellipse(bx+lean, 70, 12, 8, 0, 0, Math.PI*2); x.fill();
    }
    // the new hollow: black mouth in the ground
    x.fillStyle = '#050403';
    x.beginPath(); x.ellipse(PIC_W/2, 126, 44, 20, 0, 0, Math.PI*2); x.fill();
    x.strokeStyle = '#4a3a2a'; x.lineWidth = 2;
    x.beginPath(); x.ellipse(PIC_W/2, 126, 44, 20, 0, 0, Math.PI*2); x.stroke();
    // cracked ground lines
    x.strokeStyle = '#6b6b5e'; x.lineWidth = 1;
    for (let i=0;i<9;i++){
      const sx = 30 + Math.floor(r()*180);
      x.beginPath(); x.moveTo(sx, 118 + Math.floor(r()*10));
      x.lineTo(sx + (r()-.5)*26, 138 + Math.floor(r()*6)); x.stroke();
    }
    return c;
  }

  if (id === 'ending_stabilize'){
    wash('#1d2430', '#3c4652');
    // dawn over a ridge that has stopped moving
    x.fillStyle = '#c8b06a';
    x.beginPath(); x.arc(PIC_W*0.68, 52, 16, 0, Math.PI*2); x.fill();
    x.fillStyle = '#8b8b7b';
    x.beginPath(); x.moveTo(0, PIC_H); x.lineTo(0, 96); x.lineTo(70, 66);
    x.lineTo(130, 92); x.lineTo(196, 60); x.lineTo(PIC_W, 90); x.lineTo(PIC_W, PIC_H);
    x.closePath(); x.fill();
    x.fillStyle = '#6f7566';
    x.beginPath(); x.moveTo(0, PIC_H); x.lineTo(0, 116); x.lineTo(90, 100);
    x.lineTo(170, 118); x.lineTo(PIC_W, 104); x.lineTo(PIC_W, PIC_H);
    x.closePath(); x.fill();
    // upright saplings + a steady pillar of stone
    x.fillStyle = '#4a5540';
    for (let i=0;i<5;i++){
      const bx = 24 + i*48;
      x.fillRect(bx, 108, 3, 22);
      x.beginPath(); x.ellipse(bx+1, 106, 9, 6, 0, 0, Math.PI*2); x.fill();
    }
    x.fillStyle = '#8f9683';
    x.fillRect(118, 74, 8, 56);
    x.fillRect(112, 78, 20, 5);       // the cairn token, upright
    x.fillStyle = '#c8b06a';
    x.fillRect(120, 80, 4, 2);
    return c;
  }

  if (id === 'ending_open'){
    wash('#12100c', '#1c2018');
    // a controlled hole, and something passing through it
    x.fillStyle = '#050403';
    x.beginPath(); x.ellipse(PIC_W/2, PIC_H-24, 56, 18, 0, 0, Math.PI*2); x.fill();
    x.strokeStyle = '#b9a35a'; x.lineWidth = 1;
    x.beginPath(); x.ellipse(PIC_W/2, PIC_H-24, 56, 18, 0, 0, Math.PI*2); x.stroke();
    // light shaft
    const g = x.createLinearGradient(0, 40, 0, PIC_H-24);
    g.addColorStop(0, 'rgba(200,176,106,.30)');
    g.addColorStop(1, 'rgba(200,176,106,.02)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(PIC_W/2-14, 34); x.lineTo(PIC_W/2+14, 34);
    x.lineTo(PIC_W/2+40, PIC_H-24); x.lineTo(PIC_W/2-40, PIC_H-24);
    x.closePath(); x.fill();
    // the small remnant, mid-passage
    x.fillStyle = '#c8b06a';
    x.fillRect(PIC_W/2-3, 74, 6, 12);
    x.fillRect(PIC_W/2-6, 78, 12, 4);
    // distant new growth on the horizon
    x.fillStyle = '#4a5540';
    x.fillRect(0, 26, PIC_W, 2);
    for (let i=0;i<9;i++){
      const bx = 8 + i*27 + Math.floor(r()*8);
      const hh = 4 + Math.floor(r()*7);
      x.fillRect(bx, 26-hh, 2, hh);
    }
    x.fillStyle = '#9ec4a8';
    for (let i=0;i<10;i++) x.fillRect(Math.floor(r()*PIC_W), 20 - Math.floor(r()*12), 1, 1);
    return c;
  }

  // fallback: dark plate with a faint root symbol
  wash('#15130e', '#080706');
  x.strokeStyle = '#4a3a2a'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(PIC_W/2, 20); x.lineTo(PIC_W/2, PIC_H-20); x.stroke();
  for (let i=0;i<5;i++){
    const y = 40 + i*18;
    x.beginPath(); x.moveTo(PIC_W/2, y); x.lineTo(PIC_W/2 + (i%2?30:-30), y+12); x.stroke();
  }
  return c;
}

export function makeSpriteSheet(){
  const out = {};
  for (const name of Object.keys(CHAR_SPECS)) out[name] = charFrames(name);
  return out;
}
