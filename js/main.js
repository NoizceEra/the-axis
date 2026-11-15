// THE AXIS — boot: DOM wiring, scaling, input, menu, loop.

import { AxisGame } from './engine.js';
import { ITEMS, PLAYER_NAME_DEFAULT } from './data.js';

const $ = id => document.getElementById(id);

const ui = {
  stage: $('stage'),
  place: $('place'),
  objective: $('objective'),
  stressbar: $('stressbar'),
  tokens: $('tokens'),
  dialogue: $('dialogue'),
  name: $('dname'),
  text: $('dtext'),
  choices: $('dchoices'),
  more: $('dmore'),
  picture: $('picture'),
  picCanvas: $('piccanvas'),
  picTitle: $('pictitle'),
  toast: $('toast'),
  title: $('title'),
  menu: $('menu'),
  menuItems: $('menu-items'),
  menuStats: $('menu-stats')
};

const canvas = $('game');
const game = new AxisGame(canvas, ui);

/* ---------------- scaling ---------------- */
function fit(){
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / 320, vh / 208);
  const s = Math.max(1.2, scale);
  canvas.style.width = Math.floor(320 * s) + 'px';
  canvas.style.height = Math.floor(208 * s) + 'px';
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 120));
fit();

/* ---------------- title ---------------- */
const nameInput = $('name-input');
nameInput.value = PLAYER_NAME_DEFAULT;
$('btn-new').addEventListener('click', () => {
  game.audio.init(); game.audio.resume();
  const n = (nameInput.value || PLAYER_NAME_DEFAULT).trim().slice(0, 14) || PLAYER_NAME_DEFAULT;
  game.startNew(n);
});
const btnContinue = $('btn-continue');
btnContinue.disabled = !game.hasSave();
btnContinue.addEventListener('click', () => {
  game.audio.init(); game.audio.resume();
  game.load();
});

/* ---------------- keyboard ---------------- */
window.addEventListener('keydown', e => {
  if (game.choiceResolve){
    if (e.key === 'ArrowUp' || e.key === 'w'){ e.preventDefault(); game.moveChoice(-1); return; }
    if (e.key === 'ArrowDown' || e.key === 's'){ e.preventDefault(); game.moveChoice(1); return; }
    if (e.key === 'z' || e.key === 'Enter' || e.key === ' '){ e.preventDefault(); game.pickChoice(game.choiceIndex); return; }
  }
  game.onKey(e, true);
});
window.addEventListener('keyup', e => game.onKey(e, false));

/* ---------------- dialogue advance / picture dismiss by tap ---------------- */
$('dbox').addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') return;
  game.press();
});
$('picture').addEventListener('click', () => game.closePicture());

/* ---------------- touch ---------------- */
function bindHold(el, dir){
  const start = e => {
    e.preventDefault();
    game.audio.init(); game.audio.resume();
    game.queueDir(dir);
    game.keys.add(dir);
    if (game.dialogueResolve) return;
    if (game.mode === 'play' && !game.busy && !game.moving){
      game.state.dir = dir;
      game.tryMove(dir);
    }
  };
  const end = e => { e.preventDefault(); game.keys.delete(dir); };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', end);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
document.querySelectorAll('.dbtn').forEach(el => bindHold(el, el.dataset.dir));

$('btn-a').addEventListener('pointerdown', e => { e.preventDefault(); game.press(); });
$('btn-menu').addEventListener('pointerdown', e => { e.preventDefault(); openMenu(); });

/* ---------------- pause menu ---------------- */
function openMenu(){
  if (game.mode === 'title') return;
  renderMenu();
  ui.menu.hidden = false;
}
function closeMenu(){ ui.menu.hidden = true; }

function renderMenu(){
  const st = game.state;
  ui.menuItems.innerHTML = '';
  if (!st.items.length){
    const li = document.createElement('li');
    li.className = 'dim';
    li.textContent = 'Empty.';
    ui.menuItems.appendChild(li);
  }
  for (const id of st.items){
    const it = ITEMS[id] || { name:id, kind:'key', desc:'' };
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = it.name;
    label.title = it.desc;
    li.appendChild(label);
    if (it.kind === 'use'){
      const b = document.createElement('button');
      b.textContent = 'use';
      b.addEventListener('click', () => {
        game.removeItem(id);
        if (it.stress) game.addStress(it.stress);
        game.toast(`${it.name}: ${it.desc}`);
        renderMenu();
      });
      li.appendChild(b);
    } else {
      const b = document.createElement('button');
      b.textContent = 'look';
      b.addEventListener('click', () => { game.toast(it.desc || it.name); });
      li.appendChild(b);
    }
    ui.menuItems.appendChild(li);
  }
  ui.menuStats.innerHTML =
    `Axis stress: ${Math.round(st.vars.AxisStress || 0)} / 100<br>` +
    `Supports held: ${['north_token','east_token','west_token'].filter(k => st.items.includes(k)).length} / 3<br>` +
    `Time in Ashhollow: ${Math.floor(st.playMs/60000)} min`;
}

$('menu-close').addEventListener('click', closeMenu);
$('menu-save').addEventListener('click', () => { game.save(); closeMenu(); });
$('menu-load').addEventListener('click', () => { const ok = game.load(); if (ok) closeMenu(); });
$('menu-sound').addEventListener('click', e => {
  game.audio.on = !game.audio.on;
  e.target.textContent = 'Sound: ' + (game.audio.on ? 'on' : 'off');
});
ui.menu.addEventListener('click', e => { if (e.target === ui.menu) closeMenu(); });

/* ---------------- ending overlay ---------------- */
const ending = $('ending');
game.ui.ending = ending;
game.ui.endingTitle = $('ending-title');
game.ui.endingBody = $('ending-body');
$('ending-restart').addEventListener('click', () => {
  location.reload();
});

/* ---------------- loop ---------------- */
let last = performance.now();
function loop(now){
  const dt = Math.min(50, now - last);
  last = now;
  game.update(dt, now);
  game.render(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// expose for automated checks / tinkering
window.__axis = game;
