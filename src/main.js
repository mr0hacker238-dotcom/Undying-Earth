import { display, initDisplay } from './core/display.js';
import { initWorlds } from './core/worlds.js';
import { createMenu } from './ui/menu.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const planet = new Image();
planet.src = 'assets/logo/mainlogo-1x.png';

// Placeholder until the login system exists.
const session = { name: 'GUEST' };

const menu = createMenu({ ctx, canvas, planet, session, nameInput: document.getElementById('name-input') });
initDisplay(canvas);
initWorlds();

function frame() {
  if (!display.paused) menu.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
