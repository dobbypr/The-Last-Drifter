/*  AsteroidSystem.js  – inject fresh purpose into rock-busting  */
export class AsteroidSystem {
  constructor(playerRef, hudRef) {
    this.player = playerRef;   // expect .score or .inventory
    this.hud   = hudRef;       // DOM element or simple console log fn
    this.rocks = [];
    this.loot  = [];
    this.spawnCooldown = 0;
    this.levelHardness = 1;    // call .setLevel(n) from outside
  }

  setLevel(n) {
    this.levelHardness = 1 + n * 0.15;
  }

  update(dt) {
    // spawn new asteroid waves every 4–8 s
    if ((this.spawnCooldown -= dt) <= 0) {
      this.spawnWave();
      this.spawnCooldown = 4000 + Math.random() * 4000;
    }

    // rocks
    this.rocks.forEach(r => r.update(dt));
    this.rocks = this.rocks.filter(r => !r.dead);

    // loot
    this.loot.forEach(l => l.update(dt, this.player));
    this.loot = this.loot.filter(l => !l.collected && !l.offscreen);
  }

  draw(ctx) {
    this.rocks.forEach(r => r.draw(ctx));
    this.loot.forEach(l => l.draw(ctx));
  }

  /* Called when a player bullet hits a rock */
  fractureRock(rock, impactPower) {
    rock.hp -= impactPower;
    if (rock.hp <= 0) {
      rock.dead = true;
      this.rollDrops(rock);
    } else {
      // split into smaller chunks if large
      if (rock.radius > 18) {
        const newRad = rock.radius * 0.6;
        for (let i = 0; i < 2; i++) {
          const child = new Rock(rock.x, rock.y, newRad, this.levelHardness);
          this.rocks.push(child);
        }
      }
    }
  }

  /* ---------- PRIVATE ---------- */
  spawnWave() {
    const count = 3 + Math.floor(Math.random() * 2 * this.levelHardness);
    for (let i = 0; i < count; i++) {
      const r = new Rock(
        Math.random() * innerWidth,
        -60 - Math.random()*100,
        20 + Math.random() * 25 * this.levelHardness,
        this.levelHardness
      );
      this.rocks.push(r);
    }
  }

  rollDrops(rock) {
    // rare mineral chance rises with level
    const table = [
      {id:'iron',  p:0.8},
      {id:'gold',  p:0.18 + 0.01*this.levelHardness},
      {id:'titan', p:0.02 + 0.01*this.levelHardness},
    ];
    table.forEach(entry=>{
      if (Math.random() < entry.p) {
        this.loot.push(new Loot(rock.x, rock.y, entry.id));
        this.hud && this.hud.flash && this.hud.flash(`+${entry.id.toUpperCase()}`);
      }
    });
  }
}

/* ---------- Rock ---------- */
class Rock {
  constructor(x,y,radius,hardness){
    this.x=x;this.y=y;this.radius=radius;
    this.vx=(Math.random()-0.5)*40;this.vy=40+Math.random()*60;
    this.hp=radius*0.3*hardness; // bigger = tougher
    this.dead=false;
  }
  update(dt){
    this.x+=this.vx*dt;this.y+=this.vy*dt;
    if(this.y>innerHeight+80) this.dead=true;
  }
  draw(ctx){
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.rotate(this.y*0.01);
    ctx.fillStyle='#666';
    ctx.beginPath();
    ctx.moveTo(this.radius,0);
    for(let i=1;i<=8;i++){
      const ang=i*Math.PI/4;
      const rad=this.radius* (0.7+Math.random()*0.3);
      ctx.lineTo(Math.cos(ang)*rad,Math.sin(ang)*rad);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/* ---------- Loot ---------- */
class Loot{
  constructor(x,y,type){
    this.x=x;this.y=y;this.type=type;
    this.vy=40;this.collected=false;this.offscreen=false;
    this.r=5; // visual radius
  }
  update(dt,player){
    this.y+=this.vy*dt;
    if(this.y>innerHeight+20) this.offscreen=true;

    // simple pickup
    const dx=player.x-this.x,dy=player.y-this.y;
    if(Math.hypot(dx,dy)<18){
      this.collected=true;
      player.inventory = player.inventory||{};
      player.inventory[this.type]=(player.inventory[this.type]||0)+1;
    }
  }
  draw(ctx){
    ctx.fillStyle=this.type==='iron'?'#aaa':this.type==='gold'?'#fc0':'#7ef';
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fill();
  }
}
