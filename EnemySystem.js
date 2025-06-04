/*  EnemySystem.js  – drop-in replacement for your old enemy logic  */
export class EnemySystem {
  constructor(playerRef, levelManager) {
    this.player = playerRef;           // expect {x,y} and .takeDamage()
    this.levelManager = levelManager;  // expect .currentLevel (int)
    this.enemies = [];
    this.bullets = [];
    this.ticker = 0;
  }

  /* ---------- PUBLIC ---------- */
  update(dt) {
    this.ticker += dt;
    // spawn according to current level every 2–6 s (scales downward)
    const spawnGap = Math.max(6000 / (1 + this.levelManager.currentLevel), 800);
    if (this.ticker > spawnGap) {
      this.spawnWave(this.levelManager.currentLevel);
      this.ticker = 0;
    }

    // update enemies
    this.enemies.forEach(e => e.update(dt, this.player, this.bullets));
    this.enemies = this.enemies.filter(e => !e.dead);

    // update bullets
    this.bullets.forEach(b => b.update(dt));
    this.bullets = this.bullets.filter(b => !b.offscreen && !b.hit);
  }

  draw(ctx) {
    this.enemies.forEach(e => e.draw(ctx));
    this.bullets.forEach(b => b.draw(ctx));
  }

  /* ---------- PRIVATE ---------- */
  spawnWave(level) {
    // escalate number & mix
    const count = 2 + Math.floor(level * 0.6);
    for (let i = 0; i < count; i++) {
      const type = this.pickType(level);
      this.enemies.push(new Enemy(type));
    }
  }

  pickType(level) {
    // probability table per level
    const table = [
      {type: 'drone',  p: 0.6},
      {type: 'kamikaze', p: Math.min(0.3, level * 0.04)},
      {type: 'sniper', p: Math.min(0.25, level * 0.03)},
      {type: 'shield', p: level > 6 ? 0.15 : 0},
      {type: 'boss', p: level % 5 === 0 ? 0.12 : 0}
    ];
    const r = Math.random();
    let acc = 0;
    for (const row of table) {
      acc += row.p;
      if (r < acc) return row.type;
    }
    return 'drone';
  }
}

/* ---------- Enemy definitions ---------- */
class Enemy {
  constructor(kind) {
    this.kind = kind;
    this.setBaseStats(kind);
    this.x = Math.random() * innerWidth;
    this.y = -50; // spawn off-screen top
    this.dead = false;
    this.reload = 0;
    this.angle = 0;
  }
  setBaseStats(k){
    const base = {
      drone:    {hp: 3, speed: 90,   fireRate: 1400, weapon: 'single'},
      kamikaze: {hp: 1, speed: 230,  fireRate: 0,    weapon: 'ram'},
      sniper:   {hp: 4, speed: 60,   fireRate: 2400, weapon: 'sniper'},
      shield:   {hp: 6, speed: 45,   fireRate: 1100, weapon: 'spread', shield: 4},
      boss:     {hp: 100, speed: 35, fireRate: 600,  weapon: 'barrage'}
    };
    Object.assign(this, base[k]);
  }

  update(dt, player, bullets) {
    // ---------- movement ----------
    switch (this.kind) {
      case 'drone':
        this.y += this.speed * dt;
        break;
      case 'kamikaze':
        const dx = player.x - this.x, dy = player.y - this.y;
        const len = Math.hypot(dx, dy) || 1;
        this.x += (dx / len) * this.speed * dt;
        this.y += (dy / len) * this.speed * dt;
        break;
      case 'sniper':
      case 'shield':
      case 'boss':
        this.y += this.speed * dt * 0.5;
        break;
    }
    if (this.y > innerHeight + 60) this.dead = true;

    // ---------- attack ----------
    if (this.fireRate && (this.reload -= dt) <= 0) {
      this.reload = this.fireRate;
      bullets.push(...this.makeShots(player));
    }
  }

  makeShots(player) {
    const shots = [];
    const aimAngle = Math.atan2(player.y - this.y, player.x - this.x);
    const mkBullet = (a, speed=250, dmg=1) => new EnemyBullet(this.x, this.y, a, speed, dmg);

    switch (this.weapon) {
      case 'single':   shots.push(mkBullet(aimAngle)); break;
      case 'spread':   [-0.2,0,0.2].forEach(off=>shots.push(mkBullet(aimAngle+off,200))); break;
      case 'sniper':   shots.push(mkBullet(aimAngle, 500, 3)); break;
      case 'barrage':  for(let a=-0.4;a<=0.4;a+=0.1) shots.push(mkBullet(aimAngle+a,180)); break;
    }
    return shots;
  }

  draw(ctx){
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle += 0.03);
    ctx.fillStyle = '#f44';
    ctx.beginPath();
    ctx.arc(0,0,10 + (this.kind==='boss'?15:0),0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

class EnemyBullet{
  constructor(x,y,angle,speed,dmg){
    this.x=x;this.y=y;this.vx=Math.cos(angle)*speed;this.vy=Math.sin(angle)*speed;
    this.dmg=dmg;this.offscreen=false;this.hit=false;
  }
  update(dt){
    this.x+=this.vx*dt;this.y+=this.vy*dt;
    this.offscreen=this.y<-20||this.y>innerHeight+20||this.x<-20||this.x>innerWidth+20;
  }
  draw(ctx){ctx.fillStyle='#ffbe32';ctx.fillRect(this.x-2,this.y-2,4,4);}
}
