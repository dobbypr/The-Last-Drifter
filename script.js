// ---- Story, Menu, and Pixel Intro ----
const GAME_STATES = {
  MENU: 0,
  STORY: 1,
  PLAYING: 2,
  GAMEOVER: 3
};
let gameState = GAME_STATES.MENU;
let storyText = [
  "YEAR: 3124 // GALACTIC WASTES",
  "",
  "IN THE ABANDONED REACHES OF SPACE,",
  "THE ONCE GREAT CIVILIZATIONS ARE DUST.",
  "",
  "LEGENDS SPEAK OF THE COSMIC GENESIS ENGINE,",
  "A RELIC CAPABLE OF REVIVING WORLDS.",
  "",
  "YOU ARE THE LAST DRIFTER.",
  "YOUR SHIP, COBBLED FROM RUINS,",
  "CRAWLS THROUGH DEAD STARS AND",
  "SHATTERED PLANETOIDS.",
  "",
  "ASTEROIDS—SCARRED BY LOST WARS—",
  "FLOAT WITH SECRETS AND DANGER.",
  "",
  "HARVEST THEIR CORES.",
  "SURVIVE THE VOID.",
  "FIND THE ENGINE.",
  "",
  "DO NOT LET THE UNIVERSE GO DARK."
];
let gameOverText = [
  "DRIFTER DOWN",
  "",
  "YOUR SHIP IS LOST AMONG THE DEAD STARS.",
  "THE COSMIC ENGINE REMAINS OUT OF REACH.",
  "",
  "MAY ANOTHER PILOT TRY..."
];

let menuText = [
  "COSMIC WRECK: THE LAST DRIFTER",
  "",
  "Survive endless asteroid fields and",
  "unlock new weapons as you progress.",
  "Use Q and E to cycle weapons."
];
let storyPage = 0;
const storyPages = [
  storyText.slice(0,7),
  storyText.slice(7,13),
  storyText.slice(13)
];
let storyStep = 0;
let overlay = document.getElementById('overlay');
let overlayContent = document.getElementById('overlay-content');

function showMenu() {
  gameState = GAME_STATES.MENU;
  overlay.style.display = "flex";
  renderOverlayText(menuText, "#fc9", 74, true);
  let box = document.createElement('div');
  box.style.textAlign = 'center';
  let start = document.createElement('button');
  start.textContent = 'START';
  start.className = 'menu-btn';
  start.onclick = showStory;
  let settings = document.createElement('button');
  settings.textContent = 'SETTINGS';
  settings.className = 'menu-btn';
  settings.onclick = () => alert('Settings coming soon!');
  box.appendChild(start);
  box.appendChild(settings);
  overlayContent.appendChild(box);
}
function showStory() {
  gameState = GAME_STATES.STORY;
  overlay.style.display = "flex";
  storyPage = 0; storyStep = 0;
  showStoryPage();
}
function showStoryPage() {
  let page = storyPages[storyPage];
  renderOverlayText(page, "#fa5", 38, false);
  if (storyPage === storyPages.length-1) {
    setTimeout(() => showPressKey("Press any key to continue... (E to skip)"), 1000);
  } else {
    setTimeout(() => showPressKey("Press any key... (E to skip)"), 900);
  }
}
function showGameOver() {
  gameState = GAME_STATES.GAMEOVER;
  overlay.style.display = "flex";
  renderOverlayText(gameOverText, "#f96", 52, true);
  setTimeout(() => showPressKey("Press any key to restart..."), 1100);
}

function showPressKey(txt) {
  let pk = document.createElement("span");
  pk.id = "press-key";
  pk.textContent = txt;
  overlayContent.appendChild(pk);
}

function renderOverlayText(lines, color="#fda", glow=52, center=false) {
  overlayContent.innerHTML = "";
  overlayContent.style.color = color;
  overlayContent.style.textAlign = center ? "center" : "left";
  overlayContent.style.textShadow =
    `0 0 ${glow}px #fa2,0 1px 0 #101,0 0 2px #000,0 0 14px #2bf9`;
  for (let i=0; i<lines.length; ++i) {
    let line = document.createElement("div");
    line.textContent = lines[i];
    line.style.marginBottom = "0.6em";
    overlayContent.appendChild(line);
  }
}

function showLevelOverlay(text) {
  overlay.style.display = "flex";
  renderOverlayText([text], "#9f9", 40, true);
  setTimeout(() => { overlay.style.display = "none"; }, 1200);
}

function nextLevel() {
  level++;
  if (unlockedWeapons < weapons.length) unlockedWeapons++;
  placeAsteroids();
  showLevelOverlay(`Level ${level}! New weapon: ${weapons[unlockedWeapons-1].name}`);
}

// Handle key presses for menu/story/gameover
window.addEventListener('keydown', e => {
  if (gameState === GAME_STATES.MENU) {
    showStory();
  } else if (gameState === GAME_STATES.STORY) {
    if (e.key.toLowerCase() === 'e') {
      overlay.style.display = "none";
      startGame();
    } else {
      storyPage++;
      if (storyPage >= storyPages.length) {
        overlay.style.display = "none";
        startGame();
      } else {
        showStoryPage();
      }
    }
  } else if (gameState === GAME_STATES.GAMEOVER) {
    showMenu();
    placeAsteroids();
    resetShip();
    particles = [];
    lasers = [];
  }
});

// ---- The Game ----
const TAU = Math.PI * 2;
const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, mi, ma) => Math.max(mi, Math.min(ma, v));
function seededRand(seed) {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function generateAsteroid(x, y, r, level=1, seed) {
  let verts = [];
  let vCount = clamp(Math.floor(rand(8, 15)), 7, 20);
  for (let i = 0; i < vCount; ++i) {
    let ang = (i / vCount) * TAU;
    let jag = 1 + seededRand(seed + i) * 0.4 * (level === 1 ? 1 : rand(0.75, 1.15));
    verts.push([
      Math.cos(ang) * r * jag,
      Math.sin(ang) * r * jag
    ]);
  }
  return {
    x, y, r, verts, ang: rand(0, TAU), spin: rand(-0.008, 0.008),
    level, seed, alive: true,
    vx: rand(-0.5, 0.5) * (2 - level), vy: rand(-0.5, 0.5) * (2 - level)
  };
}
const WORLD_SIZE = 3000;
const ASTEROID_MIN = 15, ASTEROID_MAX = 45, ASTEROID_COUNT = 35;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let width = window.innerWidth, height = window.innerHeight;
canvas.width = width; canvas.height = height;
const ship = {
  x: WORLD_SIZE / 2, y: WORLD_SIZE / 2,
  vx: 0, vy: 0, rot: 0, size: 16,
  cooldown: 0, weapon: 0
};
let unlockedWeapons = 3;
let level = 1;
let asteroidBase = 20, asteroidGrowth = 5;
const weapons = [
  {
    name: "Blaster", color: "#d6ffe0", cooldown: 7,
    shoot: (origin) => [{
      x: origin.x, y: origin.y, vx: Math.cos(origin.dir) * 15 + ship.vx,
      vy: Math.sin(origin.dir) * 15 + ship.vy, dir: origin.dir, life: 44,
      type: 0, thick: 2, pierce: false
    }]
  },
  {
    name: "Spread", color: "#fff0b8", cooldown: 22,
    shoot: (origin) => {
      let out = [];
      for (let i = -2; i <= 2; ++i) {
        let spread = origin.dir + i * 0.18 + rand(-0.03, 0.03);
        out.push({
          x: origin.x, y: origin.y,
          vx: Math.cos(spread) * (11 + rand(-1, 2)) + ship.vx,
          vy: Math.sin(spread) * (11 + rand(-1, 2)) + ship.vy,
          dir: spread, life: 20 + rand(0,5), type: 1, thick: 2.8, pierce: false
        });
      }
      return out;
    }
  },
  {
    name: "Pierce", color: "#ffe2fc", cooldown: 32,
    shoot: (origin) => [{
      x: origin.x, y: origin.y,
      vx: Math.cos(origin.dir) * 8 + ship.vx,
      vy: Math.sin(origin.dir) * 8 + ship.vy,
      dir: origin.dir, life: 64, type: 2, thick: 7, pierce: true
    }]
  }
];
const extraWeaponNames = [
"Pulse Blaster", "Photon Cannon", "Plasma Cutter", "Ion Rifle", "Meteor Slicer", "Nova Lance", "Stellar Hammer", "Nebula Flare", "Graviton Wave", "Vortex Launcher",
"Quantum Shredder", "Obsidian Drill", "Solar Flaregun", "Singularity Projector", "Asteroid Breaker", "Gamma Ray Emitter", "Void Disruptor", "Cosmic Railgun", "Electron Splitter", "Particle Saw",
"Chain Lightning Arc", "Thermal Burster", "Spectral Scythe", "Dark Matter Blaster", "Laser Net", "Shrapnel Mortar", "Explosive Harpoon", "Plasma Shuriken", "Molecular Blade", "EMP Coilgun",
"Nano Swarm Launcher", "Starfire Revolver", "Antimatter Pistol", "Cryo Bolter", "Pyrostream Jet", "Seismic Grenade", "Magnetron Flail", "Wormhole Disk", "Astro Javelin", "Chrono Dagger",
"Fusion Accelerator", "Tachyon Bow", "Hyperflux Cannon", "Blitz Gauntlets", "Specter Shotgun", "Pulse Hammer", "Gravity Mine Layer", "Tesseract Cleaver", "Polarity Rifle", "Lumin Blade",
"Cosmo Chakram", "Celestial Darts", "Solar Smasher", "Glacier Emitter", "Disassembler Beam", "Phase Cutter", "Echo Launcher", "Void Shard", "Cascade Emitter", "Pulse Trident",
"Ion Fist", "Fragmentation Disc", "Neutron Scattergun", "Molten Thrower", "Frostbyte Cannon", "Radiation Spitter", "EMP Bombard", "Comet Lance", "Spectra Revolver", "Nano-Edge Knife",
"Tesla Rifle", "Riftmaker", "Spacetime Harpoon", "Wraith Launcher", "Thunder Coil", "Quark Bazooka", "Solaris Chakram", "Pulsar Sabre", "Oblivion Ray", "Maelstrom Axe",
"Blackhole Grenade", "Shockwave Launcher", "Meteor Cluster", "Grav Blade", "Spectral Mace", "Plasma Bident", "Inferno Slinger", "Cryo Pike", "Gamma Disc", "Quantum Flail",
"Orbiting Blade", "Void Bow", "Nano Disruptor", "Hypernova Bomb", "Vaporizer", "Shock Prism", "Celestial Pistol", "Dynamo Javelin", "Starburst Gun", "Astral Saber",
"Darklight Repeater", "Comet Slicer", "Flux Hammer", "Sonic Emitter", "Dimensional Blade"
];
for (let i=0; i<extraWeaponNames.length; ++i) {
  weapons.push({
    name: extraWeaponNames[i],
    color: `hsl(${(i*37)%360},100%,70%)`,
    cooldown: 12,
    shoot: weapons[0].shoot
  });
}
let keys = {}, mouse = {x: width / 2, y: height / 2, down: false};
window.addEventListener('keydown', e => {
  if (gameState !== GAME_STATES.PLAYING) return;
  keys[e.key.toLowerCase()] = true;
  let num = parseInt(e.key);
  if (!isNaN(num) && num >= 1 && num <= unlockedWeapons && num <= 9) {
    ship.weapon = num-1;
  }
  if (e.key.toLowerCase() === 'q') {
    ship.weapon = (ship.weapon - 1 + unlockedWeapons) % unlockedWeapons;
  }
  if (e.key.toLowerCase() === 'e') {
    ship.weapon = (ship.weapon + 1) % unlockedWeapons;
  }
});
window.addEventListener('keyup', e => {
  if (gameState !== GAME_STATES.PLAYING) return;
  keys[e.key.toLowerCase()] = false;
});
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', () => { if (gameState === GAME_STATES.PLAYING) mouse.down = true; });
window.addEventListener('mouseup', () => { mouse.down = false; });

function wrap(val, size) { while (val < 0) val += size; while (val > size) val -= size; return val; }
function worldToScreen(wx, wy) {
  let dx = wx - cam.x, dy = wy - cam.y;
  if (dx > WORLD_SIZE/2) dx -= WORLD_SIZE;
  if (dx < -WORLD_SIZE/2) dx += WORLD_SIZE;
  if (dy > WORLD_SIZE/2) dy -= WORLD_SIZE;
  if (dy < -WORLD_SIZE/2) dy += WORLD_SIZE;
  return [Math.floor(width / 2 + dx), Math.floor(height / 2 + dy)];
}

function drawWorldBorder() {
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  let [sx, sy] = worldToScreen(0, 0);
  ctx.moveTo(sx, sy);
  [sx, sy] = worldToScreen(WORLD_SIZE, 0);
  ctx.lineTo(sx, sy);
  [sx, sy] = worldToScreen(WORLD_SIZE, WORLD_SIZE);
  ctx.lineTo(sx, sy);
  [sx, sy] = worldToScreen(0, WORLD_SIZE);
  ctx.lineTo(sx, sy);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
let asteroids = [];
function placeAsteroids() {
  asteroids = [];
  let count = asteroidBase + (level-1) * asteroidGrowth;
  for (let i = 0; i < count; ++i) {
    let ax = rand(0, WORLD_SIZE);
    let ay = rand(0, WORLD_SIZE);
    let r = rand(ASTEROID_MIN, ASTEROID_MAX);
    let s = Math.floor(rand(1, 9999999));
    asteroids.push(generateAsteroid(ax, ay, r, 1, s));
  }
}
let lasers = [];
let particles = [];
function spawnParticles(x, y, col, amt, size=2, life=28) {
  for (let i = 0; i < amt; ++i) {
    let dir = rand(0, TAU);
    let spd = rand(0.8, 5.8);
    particles.push({
      x, y,
      vx: Math.cos(dir)*spd, vy: Math.sin(dir)*spd,
      life: life+rand(-5,5), age: 0, color: col,
      size: size+rand(-1,1), rot: rand(0,TAU), vr: rand(-0.1,0.1),
      shape: Math.random()<0.5 ? 'circle' : 'star'
    });
  }
}
function updateParticles() {
  for (let p of particles) {
    p.x = wrap(p.x + p.vx, WORLD_SIZE);
    p.y = wrap(p.y + p.vy, WORLD_SIZE);
    p.vx *= 0.97; p.vy *= 0.97;
    p.rot += p.vr;
    p.age++; p.size *= 0.97;
  }
  particles = particles.filter(p => p.age < p.life && p.size > 0.5);
}
let cam = {x: 0, y: 0};

function resetShip() {
  ship.x = WORLD_SIZE / 2;
  ship.y = WORLD_SIZE / 2;
  ship.vx = 0; ship.vy = 0;
  ship.rot = 0; ship.cooldown = 0; ship.weapon = 0;
}
function startGame() {
  document.getElementById('hud').style.display = '';
  document.getElementById('help').style.display = '';
  overlay.style.display = "none";
  gameState = GAME_STATES.PLAYING;
  level = 1;
  unlockedWeapons = 3;
  resetShip();
  placeAsteroids();
  lasers = [];
  particles = [];
  requestAnimationFrame(loop);
}

function loop() {
  if (gameState !== GAME_STATES.PLAYING) return;
  width = window.innerWidth; height = window.innerHeight;
  canvas.width = width; canvas.height = height;

  // --- Update Ship
  let rotTarget = Math.atan2(mouse.y - height / 2, mouse.x - width / 2);
  ship.rot = rotTarget;
  let accel = 0.19, fric = 0.98, maxSpeed = 5.2;
  if (keys['w']) { ship.vx += Math.cos(ship.rot) * accel; ship.vy += Math.sin(ship.rot) * accel; }
  if (keys['s']) { ship.vx -= Math.cos(ship.rot) * accel * 0.6; ship.vy -= Math.sin(ship.rot) * accel * 0.6; }
  if (keys['a']) { ship.vx += Math.cos(ship.rot - Math.PI/2) * accel * 0.65; ship.vy += Math.sin(ship.rot - Math.PI/2) * accel * 0.65; }
  if (keys['d']) { ship.vx += Math.cos(ship.rot + Math.PI/2) * accel * 0.65; ship.vy += Math.sin(ship.rot + Math.PI/2) * accel * 0.65; }
  ship.vx *= fric; ship.vy *= fric;
  let sp = Math.hypot(ship.vx, ship.vy);
  if (sp > maxSpeed) { ship.vx *= maxSpeed/sp; ship.vy *= maxSpeed/sp; }
  ship.x = wrap(ship.x + ship.vx, WORLD_SIZE); ship.y = wrap(ship.y + ship.vy, WORLD_SIZE);

  // --- Update Camera
  cam.x += (ship.x - cam.x) * 0.13;
  cam.y += (ship.y - cam.y) * 0.13;

  // --- Lasers
  for (let l of lasers) {
    l.x = wrap(l.x + l.vx, WORLD_SIZE);
    l.y = wrap(l.y + l.vy, WORLD_SIZE);
    l.life--;
    l.alive = l.life > 0;
  }
  lasers = lasers.filter(l => l.alive);

  // --- Asteroids
  for (let ast of asteroids) {
    ast.x = wrap(ast.x + ast.vx, WORLD_SIZE);
    ast.y = wrap(ast.y + ast.vy, WORLD_SIZE);
    ast.ang += ast.spin;
  }
  asteroids = asteroids.filter(ast => ast.alive);
  if (asteroids.length === 0) {
    nextLevel();
  }

  // --- Particles
  updateParticles();

  // --- Shooting
  if (mouse.down && ship.cooldown === 0) shootCurrentWeapon();
  ship.cooldown = Math.max(0, ship.cooldown-1);

  // --- Collisions (lasers/asteroid) and Asteroid Destruction
  for (let laser of lasers) {
    for (let ast of asteroids) {
      if (!ast.alive) continue;
      let dx = (laser.x - ast.x), dy = (laser.y - ast.y);
      if (dx > WORLD_SIZE/2) dx -= WORLD_SIZE;
      if (dx < -WORLD_SIZE/2) dx += WORLD_SIZE;
      if (dy > WORLD_SIZE/2) dy -= WORLD_SIZE;
      if (dy < -WORLD_SIZE/2) dy += WORLD_SIZE;
      let dist = Math.hypot(dx, dy);
      if (dist < ast.r + 7) {
        if (pointInPoly(ast, dx, dy)) {
          if (!laser.pierce) laser.alive = false;
          let hitIndex = nearestVertIndex(ast, dx, dy);
          let chopped = chopAsteroidAtIndex(ast, hitIndex);
          if (chopped) {
            spawnParticles(
              wrap(ast.x + ast.verts[hitIndex % ast.verts.length][0], WORLD_SIZE),
              wrap(ast.y + ast.verts[hitIndex % ast.verts.length][1], WORLD_SIZE),
              weapons[laser.type].color, rand(6,12), 2.5, 18
            );
          } else {
            ast.alive = false;
            spawnParticles(ast.x, ast.y, weapons[laser.type].color, rand(20,36), 2.6, 25);
          }
          ast.vx += Math.cos(laser.dir) * (laser.thick || 1.5) * 0.21;
          ast.vy += Math.sin(laser.dir) * (laser.thick || 1.5) * 0.21;
        }
      }
    }
  }

  // --- Asteroid/ship collision
  let gameOver = false;
  for (let ast of asteroids) {
    let dx = (ship.x - ast.x), dy = (ship.y - ast.y);
    if (dx > WORLD_SIZE/2) dx -= WORLD_SIZE;
    if (dx < -WORLD_SIZE/2) dx += WORLD_SIZE;
    if (dy > WORLD_SIZE/2) dy -= WORLD_SIZE;
    if (dy < -WORLD_SIZE/2) dy += WORLD_SIZE;
    let dist = Math.hypot(dx, dy);
    if (dist < ast.r + ship.size*0.7) {
      if (pointInPoly(ast, dx, dy)) gameOver = true;
    }
  }

  // ---- Rendering ----
  ctx.clearRect(0,0,width,height);

  drawWorldBorder();

  // Stars
  ctx.save();
  for (let i = 0; i < 250; ++i) {
    let sx = ((i * 3931) % WORLD_SIZE), sy = ((i * 8761) % WORLD_SIZE);
    let [sx2, sy2] = worldToScreen(sx, sy);
    if (sx2 < 0 || sy2 < 0 || sx2 > width || sy2 > height) continue;
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = "#fff";
    ctx.fillRect(sx2, sy2, 1.2, 1.2);
    ctx.globalAlpha = 1.0;
  }
  ctx.restore();

  // Particles
  for (let p of particles) {
    let [sx,sy] = worldToScreen(p.x, p.y);
    ctx.save();
    ctx.globalAlpha = clamp(1 - p.age/p.life, 0.15, 1.0);
    ctx.translate(sx, sy);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    if (p.shape === 'star') {
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.moveTo(0, -p.size);
      ctx.lineTo(0, p.size);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Asteroids
  for (let ast of asteroids) drawAsteroid(ast);

  // Lasers
  for (let l of lasers) {
    let [sx, sy] = worldToScreen(l.x, l.y);
    ctx.save();
    ctx.strokeStyle = weapons[l.type||0].color;
    ctx.lineWidth = l.thick;
    ctx.globalAlpha = 0.72;
    ctx.shadowColor = weapons[l.type||0].color;
    ctx.shadowBlur = l.type === 2 ? 11 : 6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - Math.cos(l.dir) * 17, sy - Math.sin(l.dir) * 17);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Ship
  let [sx, sy] = worldToScreen(ship.x, ship.y);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ship.rot);
  ctx.beginPath();
  ctx.moveTo(ship.size, 0);
  ctx.lineTo(-ship.size * 0.6, -ship.size * 0.7);
  ctx.lineTo(-ship.size * 0.35, 0);
  ctx.lineTo(-ship.size * 0.6, ship.size * 0.7);
  ctx.closePath();
  ctx.fillStyle = "#adfdff";
  ctx.shadowColor = "#6cf7ec";
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0,0, ship.size * 0.3, 0, TAU);
  ctx.fillStyle = "#3b6e7b";
  ctx.shadowBlur = 0;
  ctx.fill();
  ctx.restore();

  // HUD
  document.getElementById('hud').innerText =
    `Level: ${level}\n` +
    `Weapon: ${weapons[ship.weapon].name} (${ship.weapon+1})\n` +
    `Asteroids: ${asteroids.length}\n` +
    `Position: (${ship.x.toFixed(0)}, ${ship.y.toFixed(0)})\n` +
    (gameOver ? 'GAME OVER - reload to play again' : '');

  if (!gameOver) requestAnimationFrame(loop);
  else {
    document.getElementById('hud').style.display = 'none';
    document.getElementById('help').style.display = 'none';
    showGameOver();
  }
}
function pointInPoly(ast, dx, dy) {
  let c = false, n = ast.verts.length;
  let px = Math.cos(-ast.ang) * dx - Math.sin(-ast.ang) * dy;
  let py = Math.sin(-ast.ang) * dx + Math.cos(-ast.ang) * dy;
  for (let i = 0, j = n-1; i < n; j = i++) {
    let xi = ast.verts[i][0], yi = ast.verts[i][1];
    let xj = ast.verts[j][0], yj = ast.verts[j][1];
    if (((yi > py) != (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi + 0.00001) + xi))
      c = !c;
  }
  return c;
}
function nearestVertIndex(ast, dx, dy) {
  let px = Math.cos(-ast.ang) * dx - Math.sin(-ast.ang) * dy;
  let py = Math.sin(-ast.ang) * dx + Math.cos(-ast.ang) * dy;
  let minDist = 99999, minIdx = 0;
  for (let i = 0; i < ast.verts.length; ++i) {
    let [vx, vy] = ast.verts[i];
    let d = Math.hypot(px - vx, py - vy);
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}
function chopAsteroidAtIndex(ast, idx) {
  if (ast.verts.length <= 6) return false;
  if (ast.verts.length > 12) {
    ast.verts.splice(idx, 2);
  } else {
    ast.verts.splice(idx, 1);
  }
  ast.r *= 0.96;
  return true;
}
function drawAsteroid(ast) {
  let [sx, sy] = worldToScreen(ast.x, ast.y);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ast.ang);
  ctx.beginPath();
  let verts = ast.verts;
  ctx.moveTo(verts[0][0], verts[0][1]);
  for (let i = 1; i < verts.length; ++i)
    ctx.lineTo(verts[i][0], verts[i][1]);
  ctx.closePath();
  ctx.globalAlpha = 0.89;
  ctx.fillStyle = "#353c4a";
  ctx.shadowColor = "#475367";
  ctx.shadowBlur = 13;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#a2bcc7";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}
function shootCurrentWeapon() {
  let weap = weapons[ship.weapon];
  let shots = weap.shoot({
    x: ship.x + Math.cos(ship.rot) * ship.size,
    y: ship.y + Math.sin(ship.rot) * ship.size,
    dir: ship.rot
  });
  for (let s of shots) lasers.push(s);
  spawnParticles(
    wrap(ship.x + Math.cos(ship.rot)*ship.size, WORLD_SIZE),
    wrap(ship.y + Math.sin(ship.rot)*ship.size, WORLD_SIZE),
    weap.color, rand(7, 14), 3.7, 18
  );
  ship.cooldown = weap.cooldown;
}
window.addEventListener('resize', () => {
  width = window.innerWidth; height = window.innerHeight;
  canvas.width = width; canvas.height = height;
});

// ---- Begin ----
showMenu();
