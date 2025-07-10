// abilitiesAndLives.js
// Manages player stats, power-ups

const player = {
  x: 0,
  y: 480,
  width: 50,
  height: 100,
  speed: 35,
  lives: 3,
  shield: false,
  shieldTime: 0,
  speedBoost: false,
  speedBoostTime: 0,
  shieldOpacity: [0.3, 0.2, 0.1],
  shieldPulse: [0, 0, 0],
  nitroParticles: [],
  invincible: false,
  invincibleTime: 0
};

const powerUps = [];

/**
 * Update heart display based on player.lives
 */
function updateHearts() {
  const hearts = [
    document.getElementById('heart1'),
    document.getElementById('heart2'),
    document.getElementById('heart3')
  ];
  hearts.forEach((h, idx) => {
    if (idx < player.lives) h.classList.remove('lost');
    else                    h.classList.add('lost');
  });
}

/**
 * Spawn a power-up if conditions allow)
 */
function spawnPowerUp() {
  const mode = document.querySelector('.mode-button.selected')?.dataset.mode || 'classic';

  if (powerUps.length >= 1) return;

  const lanes = [40,117,194,271,348,425,502];
  const x = lanes[Math.floor(Math.random()*lanes.length)];
  const types=['shield','speed'];
  

  const type = types[Math.floor(Math.random()*types.length)];
  let rarity = 0.01;         // ~0.5% per frame
  if (Math.random() > rarity) return;

  powerUps.push({
    x, y:-40, width:40, height:40, speed:1.5,
    type, rotation:0, pulseScale:1
  });
}

/**
 * Power-up durations, shield pulse, nitro particles
 */
function updatePowerUps() {
  const now=Date.now();
  // shield timeout 2.5s
  if (player.shield && now - player.shieldTime > 2500) {
    player.shield = false;
  }
  // speed boost 3s
  if (player.speedBoost && now - player.speedBoostTime > 3000) {
    player.speedBoost = false;
    player.nitroParticles.length = 0;
  }
  // invincibility 1s
  if (player.invincible && now - player.invincibleTime > 1000) {
    player.invincible = false;
  }

  // shield animation
  if (player.shield) {
    player.shieldPulse = player.shieldPulse.map((p,i)=>p + 0.05*(1+i*0.5));
    player.shieldOpacity = player.shieldOpacity.map((p,i)=>0.1 + 0.2*Math.sin(player.shieldPulse[i]));
  }

  // nitro particles
  if (player.speedBoost && player.nitroParticles.length < 8) {
    player.nitroParticles.push({
      x: player.x + player.width/2 + (Math.random()-0.5)*10,
      y: player.y + player.height,
      vx:(Math.random()-0.5)*1,
      vy: Math.random()*2+3,
      size:Math.random()*3+2, life:12,
      opacity:1,
      color: ['#FF4500','#FFA500','#FFFF00','#FF6347'][Math.floor(Math.random()*4)],
      angle: Math.random()*0.2-0.1
    });
  }
  for (let i=player.nitroParticles.length-1;i>=0;i--) {
    const p=player.nitroParticles[i];
    p.x+=p.vx; p.y+=p.vy; p.life--; p.opacity=p.life/12;
    if (p.life<=0) player.nitroParticles.splice(i,1);
  }
}

window.abilitiesAndLives = {
  player, powerUps, 
  updateHearts, 
  spawnPowerUp, updatePowerUps
};
