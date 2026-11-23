import { display, initDisplay } from './core/display.js';
import { readSave } from './core/storage.js';
import { createMenu } from './ui/menu.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const logo = new Image();
logo.src = 'assets/logo/undying-earth-logo-1x.png';

// Placeholders until the login system exists.
const session = { name: 'GUEST' };
const save = { exists: false, night: 0 };

const menu = createMenu({ ctx, canvas, logo, save, session });
initDisplay(canvas);

readSave().then((s) => {
  save.exists = !!s;
  save.night = s ? s.night : 0;
});

function frame() {
  if (!display.paused) menu.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
