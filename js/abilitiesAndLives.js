// abilitiesAndLives.js
// Manages player statistics, power-ups, and related updates for the Highway Havoc game

// === PLAYER DEFINITION ===
// Player object storing position, stats, and power-up states
const player = {
  x: 0,                    // X-coordinate on canvas
  y: 480,                  // Y-coordinate (fixed at bottom of canvas)
  width: 50,               // Player width for collision and rendering
  height: 100,             // Player height for collision and rendering
  speed: 35,               // Base movement speed
  lives: 3,                // Number of lives (max 3)
  shield: false,           // Shield power-up active state
  shieldTime: 0,           // Timestamp when shield was activated
  speedBoost: false,       // Speed boost power-up active state
  speedBoostTime: 0,       // Timestamp when speed boost was activated
  shieldOpacity: [0.3, 0.2, 0.1], // Opacity values for shield animation layers
  shieldPulse: [0, 0, 0],         // Pulse values for shield animation
  nitroParticles: [],      // Array of particles for speed boost visual effect
  invincible: false,       // Invincibility state after collision
  invincibleTime: 0        // Timestamp when invincibility was activated
};

// === POWER-UP MANAGEMENT ===
// Array to store active power-ups on the canvas
const powerUps = [];

// Spawn a power-up based on game mode and rarity
function spawnPowerUp() {
  // Get current game mode from selected mode button, default to 'classic'
  const mode = document.querySelector('.mode-button.selected')?.dataset.mode || 'classic';
  
  // Limit to one power-up at a time
  if (powerUps.length >= 1) return;

  // Define lanes for power-up spawning
  const lanes = [40, 117, 194, 271, 348, 425, 502];
  const x = lanes[Math.floor(Math.random() * lanes.length)];
  
  // Power-up types depend on game mode (ammo only in combat mode)
  const types = mode === 'combat' ? ['shield', 'speed', 'ammo'] : ['shield', 'speed'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  // Spawn power-up with ~0.5% chance per frame
  const rarity = 0.01;
  if (Math.random() > rarity) return;

  // Add new power-up to array
  powerUps.push({
    x,                     // X-coordinate in a lane
    y: -40,                // Start above canvas
    width: 40,             // Power-up width
    height: 40,            // Power-up height
    speed: 1.5,            // Downward movement speed
    type,                  // Type: shield, speed, or ammo
    rotation: 0,           // Rotation for visual effect
    pulseScale: 1          // Scale for pulsing animation
  });
}

// === UPDATE FUNCTIONS ===
// Update heart display based on player lives
function updateHearts() {
  // Get heart elements from DOM
  const hearts = [
    document.getElementById('heart1'),
    document.getElementById('heart2'),
    document.getElementById('heart3')
  ];
  
  // Update heart classes based on player lives
  hearts.forEach((h, idx) => {
    if (h) {
      if (idx < player.lives) h.classList.remove('lost');
      else h.classList.add('lost');
    }
  });
}

// Update power-up states, shield animation, and nitro particles
function updatePowerUps() {
  const now = Date.now();

  // Handle power-up timeouts
  if (player.shield && now - player.shieldTime > 2500) {
    player.shield = false; // Deactivate shield after 2.5 seconds
  }
  if (player.speedBoost && now - player.speedBoostTime > 3000) {
    player.speedBoost = false; // Deactivate speed boost after 3 seconds
    player.nitroParticles.length = 0; // Clear nitro particles
  }
  if (player.invincible && now - player.invincibleTime > 1000) {
    player.invincible = false; // Deactivate invincibility after 1 second
  }

  // Update shield animation
  if (player.shield) {
    // Increment pulse values for animation
    player.shieldPulse = player.shieldPulse.map((p, i) => p + 0.05 * (1 + i * 0.5));
    // Update opacity for pulsing effect
    player.shieldOpacity = player.shieldOpacity.map((p, i) => 0.1 + 0.2 * Math.sin(player.shieldPulse[i]));
  }

  // Generate nitro particles for speed boost
  if (player.speedBoost && player.nitroParticles.length < 8) {
    player.nitroParticles.push({
      x: player.x + player.width / 2 + (Math.random() - 0.5) * 10, // Random x near player center
      y: player.y + player.height, // Start at bottom of player
      vx: (Math.random() - 0.5) * 1, // Horizontal velocity
      vy: Math.random() * 2 + 3, // Vertical velocity
      size: Math.random() * 3 + 2, // Particle size
      life: 12, // Particle lifespan
      opacity: 1, // Initial opacity
      color: ['#FF4500', '#FFA500', '#FFFF00', '#FF6347'][Math.floor(Math.random() * 4)], // Random color
      angle: Math.random() * 0.2 - 0.1 // Rotation angle
    });
  }

  // Update nitro particles
  for (let i = player.nitroParticles.length - 1; i >= 0; i--) {
    const p = player.nitroParticles[i];
    p.x += p.vx; // Update x position
    p.y += p.vy; // Update y position
    p.life--; // Decrease lifespan
    p.opacity = p.life / 12; // Fade out opacity
    if (p.life <= 0) player.nitroParticles.splice(i, 1); // Remove expired particles
  }
}

// === GLOBAL EXPORT ===
// Export player, power-ups, and functions for use in game.js
window.abilitiesAndLives = {
  player,
  powerUps,
  updateHearts,
  spawnPowerUp,
  updatePowerUps
};
