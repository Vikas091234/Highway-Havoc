// game.js - Main game logic for Highway Havoc, a canvas-based driving game
// Handles game state, input, rendering, and features like vehicle bursts and high scores

// Note: The following objects are defined in abilitiesAndLives.js:
// - player: { x, y, width, height, speed, lives, shield, shieldTime, speedBoost, speedBoostTime, shieldOpacity, shieldPulse, nitroParticles, invincible, invincibleTime, image }
// - powerUps: Array of { x, y, width, height, speed, type, rotation, pulseScale }
// - nitroParticle: { x, y, vx, vy, size, life, opacity, color, angle }

document.addEventListener('DOMContentLoaded', () => {
  // === ASSET LOADING ===
  // Object to store loaded images (player, enemies, trucks)
  const images = {};
  const imageFiles = [
    'images/player.png',
    'images/enemy1.png',
    'images/enemy2.png',
    'images/enemy3.png',
    'images/enemy4.png',
    'images/enemy5.png',
    'images/enemy6.png',
    'images/enemy7.png',
    'images/truck1.png',
    'images/truck2.png'
  ];
  let useImages = true; // Toggle for image rendering (falls back to shapes if false)

  // Load images and update loading progress
  function loadImages() {
    loadingProgress.textContent = 'Loading images...';
    let loaded = 0, errors = 0;
    if (!imageFiles.length) return finishLoading();

    imageFiles.forEach(fn => {
      const img = new Image();
      const key = fn.split('/').pop().split('.')[0]; // e.g., 'player' from 'images/player.png'
      img.onload = () => {
        images[key] = img;
        loaded++;
        if (loaded + errors === imageFiles.length) {
          loadingProgress.textContent = `Loaded ${loaded} images${errors ? `, ${errors} errors` : ''}`;
          finishLoading();
        }
      };
      img.onerror = () => {
        errors++;
        if (loaded + errors === imageFiles.length) {
          loadingProgress.textContent = `Loaded ${loaded} images, ${errors} errors`;
          useImages = false; // Disable images if any fail
          finishLoading();
        }
      };
      img.src = fn;
    });
  }

  // Hide loading screen, show game UI, and assign player image after assets load
  function finishLoading() {
    loadingProgress.textContent = useImages ? 'Images loaded!' : 'Using fallback graphics';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      startButton.style.display = 'inline-block';
      modeSelector.style.display = 'block';
      resetHighScoresButton.style.display = 'inline-block';
      // Assign player image after images are loaded
      if (useImages && images['player']) {
        player.image = images['player'];
      }
    }, 500);
  }

  // === GAME STATE ===
  // Canvas and context for rendering
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // UI elements
  const startButton = document.getElementById('startButton');
  const restartButton = document.getElementById('restartButton');
  const playAgainButton = document.getElementById('playAgainButton');
  const scoreDisplay = document.getElementById('score');
  const gameUI = document.getElementById('gameUI');
  const heartsContainer = document.getElementById('heartsContainer');
  const roadTypeDisplay = document.getElementById('roadType');
  const modeSelector = document.getElementById('modeSelector');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScoreDisplay = document.getElementById('finalScore');
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingProgress = document.getElementById('loadingProgress');
  const fpsDisplay = document.getElementById('fps');
  const resetHighScoresButton = document.getElementById('resetHighScores');

  // Game configuration
  const roadTypes = {
    city: { name: 'City Highway', color: '#333', markingColor: '#fff', speedMultiplier: 1, sidewalk: 'city' },
    desert: { name: 'Desert Road', color: '#333', markingColor: '#FFD700', speedMultiplier: 1.1, sidewalk: 'desert' },
    snow: { name: 'Snowy Pass', color: '#333', markingColor: '#87CEEB', speedMultiplier: 1.2, sidewalk: 'snow' },
    night: { name: 'Night Highway', color: '#333', markingColor: '#00FFFF', speedMultiplier: 1.3, sidewalk: 'night' }
  };
  const modes = {
    classic: { truckChance: 0.1, maxEnemies: 17 },
    combat: { truckChance: 0.1, maxEnemies: 24 },
    survival: { truckChance: 0.1, maxEnemies: 29 },
    truckers: { truckChance: 1, maxEnemies: 17 }
  };
  const maxAmmoOnStart = { combat: 6, survival: 0 };
  const lanes = [40, 117, 194, 271, 348, 425, 502];
  const sidewalkWidth = 30;
  const BULLET_SPEED = 9;
  const BULLET_SIZE = { w: 6, h: 12 };

  // Game variables
  let highScores = JSON.parse(localStorage.getItem('HH_highScores') || '{}');
  if (typeof highScores !== 'object' || highScores === null) {
    highScores = {};
  }
  let currentMode = 'classic';
  let gameRunning = false;
  let gameOver = false;
  let animationId = null;
  let lastFrameTime = 0;
  let targetX = lanes[3];
  let score = 0;
  let lastSpawnTime = 0;
  let spawnInterval = 3000;
  let roadOffset = 0;
  let currentRoadType = 'snow';
  let frameCount = 0;
  let lastFPSUpdate = Date.now();
  let fps = 0;
  let ammo = 0;
  let survivalTimer = null;
  let survivalStart = 0;
  const keys = {};
  const keyStates = { ArrowLeft: false, ArrowRight: false };
  const enemies = [];
  const particles = [];
  const snowflakes = [];
  const bullets = [];

  // Import abilities and lives from external API
  const { updatePowerUps, updateHearts, spawnPowerUp, player, powerUps } = window.abilitiesAndLives;

  // === HIGH SCORE MANAGEMENT ===
  // Save high score for a mode if higher than previous
  function saveHigh(mode, score) {
    const old = highScores[mode] || 0;
    if (score > old) {
      highScores[mode] = score;
      localStorage.setItem('HH_highScores', JSON.stringify(highScores));
      const element = document.getElementById('h-' + mode);
      if (element) {
        element.textContent = score.toString();
      }
    }
  }

  // Retrieve high score for a mode
  function getHigh(mode) {
    console.log('getHigh called for mode:', mode, 'value:', highScores[mode] || 0);
    return highScores[mode] || 0;
  }

  // Expose high score functions globally
  window.saveHigh = saveHigh;
  window.getHigh = getHigh;

  // Populate high scores on home page
  ['classic', 'combat', 'survival', 'truckers'].forEach(m => {
    const element = document.getElementById('h-' + m);
    if (element) {
      element.textContent = getHigh(m).toString();
    }
  });

  // Reset high scores on button click
  if (resetHighScoresButton) {
    resetHighScoresButton.addEventListener('click', () => {
      localStorage.removeItem('HH_highScores');
      highScores = {};
      ['classic', 'combat', 'survival', 'truckers'].forEach(m => {
        const element = document.getElementById('h-' + m);
        if (element) {
          element.textContent = '0';
        }
      });
      console.log('High scores reset');
    });
  }

  // === INPUT HANDLING ===
  // Handle key presses for movement and shooting
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      keys[e.key] = true;
      keyStates[e.key] = true;
    } else if (e.key === ' ') {
      e.preventDefault();
      fireBullet();
    }
  });

  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      keys[e.key] = false;
      keyStates[e.key] = false;
    }
  });

  // Handle player movement
  function handleInput() {
    if (!gameRunning) return;
    const friction = currentRoadType === 'snow' ? 0.5 : 1;
    const mv = player.speedBoost ? player.speed * 1.3 : player.speed;
    if (keyStates.ArrowLeft) {
      targetX = Math.max(sidewalkWidth + 10, player.x - mv);
      keyStates.ArrowLeft = false;
    }
    if (keyStates.ArrowRight) {
      targetX = Math.min(canvas.width - sidewalkWidth - player.width - 10, player.x + mv);
      keyStates.ArrowRight = false;
    }
    player.x += (targetX - player.x) * 0.3 * friction;
  }

  // === UI SETUP ===
  // Handle mode selection buttons
  document.querySelectorAll('.mode-button').forEach(btn => {
    const button = btn;
    button.addEventListener('click', () => {
      document.querySelectorAll('.mode-button').forEach(b => b.classList.remove('selected'));
      button.classList.add('selected');
      currentMode = button.dataset.mode;
    });
  });

  // === GAME START/RESET ===
  // Start a new game
  function startGame() {
    // Reset UI and game state
    heartsContainer.style.display = 'block';
    scoreDisplay.style.display = 'block';
    restartButton.style.display = 'inline-block';
    canvas.style.display = 'block';
    modeSelector.style.display = 'none';
    resetHighScoresButton.style.display = 'none';
    startButton.style.display = 'none';
    gameOverScreen.style.display = 'none';
    document.getElementById('canvasSpacer').style.display = 'block';

    // Initialize game state
    gameRunning = true;
    gameOver = false;
    score = 0;
    currentRoadType = document.getElementById('roadSelect').value;
    roadTypeDisplay.textContent = roadTypes[currentRoadType].name;
    console.log('Selected road type:', currentRoadType);

    player.x = lanes[3];
    targetX = lanes[3];
    player.y = 480;
    player.lives = 3;
    player.shield = false;
    player.speedBoost = false;
    player.invincible = false;
    player.shieldTime = 0;
    player.speedBoostTime = 0;
    player.invincibleTime = 0;

    enemies.length = 0;
    powerUps.length = 0;
    particles.length = 0;
    snowflakes.length = 0;
    bullets.length = 0;

    lastSpawnTime = 0;
    spawnInterval = 3000;
    roadOffset = 0;

    updateHearts();
    updateRoadType();
    scoreDisplay.textContent = `Score: ${score}`;

    // Mode-specific setup
    ammo = maxAmmoOnStart[currentMode] || 0;
    if (currentMode === 'combat') ammo = 6;
    updateAmmoDisplay();

    // Clear survival timer if exists
    if (survivalTimer) clearInterval(survivalTimer);

    // Start survival/combat mode timer (2 minutes)
    if (currentMode === 'survival' || currentMode === 'combat') {
      survivalStart = Date.now();
      survivalTimer = setInterval(() => {
        const left = 120 - ((Date.now() - survivalStart) / 1000 | 0);
        if (left <= 0) {
          clearInterval(survivalTimer);
          gameRunning = false;
          gameOver = true;
          cancelAnimationFrame(animationId);
          saveHigh(currentMode, score);
          finalScoreDisplay.textContent = score.toString();
          document.getElementById('bestScore').textContent = getHigh(currentMode).toString();
          gameOverScreen.style.display = 'block';
        }
      }, 1000);
    }

    // Start audio and game loop
    if (window.audioControl) window.audioControl.play();
    animationId = requestAnimationFrame(gameLoop);
  }

  // Reset game to home screen
  function resetGame() {
    score = 0;
    gameRunning = false;
    gameOver = false;

    player.x = lanes[3];
    player.y = 480;
    player.lives = 3;
    player.shield = false;
    player.speedBoost = false;
    player.invincible = false;

    enemies.length = 0;
    powerUps.length = 0;
    particles.length = 0;
    snowflakes.length = 0;
    bullets.length = 0;

    scoreDisplay.textContent = `Score: ${score}`;
    gameOverScreen.style.display = 'none';
    canvas.style.display = 'none';
    scoreDisplay.style.display = 'none';
    heartsContainer.style.display = 'none';
    restartButton.style.display = 'none';
    document.getElementById('canvasSpacer').style.display = 'none';
    modeSelector.style.display = 'block';
    startButton.style.display = 'inline-block';
    resetHighScoresButton.style.display = 'inline-block';

    updateHearts();
    cancelAnimationFrame(animationId);
  }

  // Attach event listeners for start and reset
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', resetGame);
  if (playAgainButton) {
    playAgainButton.addEventListener('click', resetGame);
  }

  // === GAME LOGIC ===
  // Fire a bullet in combat mode
  function fireBullet() {
    if (currentMode !== 'combat' || ammo <= 0) return;
    ammo--;
    bullets.push({
      x: player.x + player.width / 2 - 3,
      y: player.y - 12,
      width: BULLET_SIZE.w,
      height: BULLET_SIZE.h,
      speed: BULLET_SPEED
    });
    updateAmmoDisplay();
  }

  // Update ammo display for combat/survival modes
  function updateAmmoDisplay() {
    const box = document.getElementById('ammoContainer');
    box.style.display = (currentMode === 'combat' || currentMode === 'survival') ? 'block' : 'none';
    box.innerHTML = '';
    for (let i = 0; i < ammo; i++) {
      const span = document.createElement('span');
      span.className = 'bullet-icon';
      span.textContent = '.';
      box.appendChild(span);
    }
  }

  // Check for collisions between two objects
  function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  // Update road type based on score
  function updateRoadType() {
    if (score >= 20) {
      const types = Object.keys(roadTypes);
      const idx = Math.floor(score / 20) % types.length;
      currentRoadType = types[idx];
    }
    roadTypeDisplay.textContent = roadTypes[currentRoadType].name;
    console.log('Current road type:', currentRoadType);
  }

  // Spawn enemies (regular or trucks) with random images
  function spawnEnemy() {
    const now = Date.now();
    if (now - lastSpawnTime < spawnInterval) return;

    let maxEnemies = modes[currentMode].maxEnemies;
    const available = lanes.filter(lx => !enemies.some(e => Math.abs(e.x - lx) < 60 && e.y < 100));
    if (!available.length) return;

    const cluster = score > 20 && Math.random() < 0.4;
    const clusterSize = cluster ? Math.min(available.length, Math.floor(Math.random() * 3) + 1) : 1;
    for (let i = 0; i < clusterSize; i++) {
      const li = Math.floor(Math.random() * available.length);
      const lx = available.splice(li, 1)[0];
      const isTruck = Math.random() < modes[currentMode].truckChance + Math.min(score / 200, 0.5);
      const baseSpeed = Math.min(1.5 + score / 80, 5);
      const isNewEnemy = Math.random() < 0.2;
      const imageKey = isTruck
        ? (Math.random() < 0.5 ? 'truck1' : 'truck2')
        : isNewEnemy ? 'enemy7'
        : ['enemy1', 'enemy2', 'enemy3', 'enemy4', 'enemy5', 'enemy6'][Math.floor(Math.random() * 6)];

      const enemy = {
        x: lx,
        y: -150,
        width: 50,
        height: isTruck ? 150 : 100,
        speed: (Math.random() * 1 + baseSpeed) * roadTypes[currentRoadType].speedMultiplier,
        isTruck,
        health: isTruck ? 3 : 2,
        maxHealth: isTruck ? 3 : 2,
        imageKey,
        targetX: lx,
        hasChangedLane: false
      };
      enemies.push(enemy);
    }
    lastSpawnTime = now;
  }

  // Create explosion particles
  function createExplosion(cx, cy, size = 1) {
    const pc = Math.min(5, 3 * size);
    for (let i = 0; i < pc; i++) {
      particles.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: Math.random() * 2 + 1,
        life: 8,
        color: ['#ff4444', '#ff8844', '#ffaa00'][Math.floor(Math.random() * 3)]
      });
    }
  }

  // Main update loop
  function update() {
    if (!gameRunning) return;
    handleInput();
    updatePowerUps();
    updateRoadType();

    // Update road movement
    roadOffset = (roadOffset + 2.5) % 40;
    spawnInterval = Math.max(600, 3000 - score * 12);

    // Random vehicle burst after score 40
    if (score >= 40 && Math.random() < 0.01) {
      const burstCount = Math.floor(Math.random() * 3) + 3; // 3 to 5 enemies
      for (let i = 0; i < burstCount; i++) {
        spawnEnemy();
      }
      console.log(`Random vehicle burst triggered at score ${score}: ${burstCount} enemies`);
    }

    spawnEnemy();
    spawnPowerUp();

    // Generate snowflakes for snow road and maintain them while in snow mode
    if (currentRoadType === 'snow') {
      if (snowflakes.length < 60 && Math.random() < 0.3) {
        snowflakes.push({
          x: sidewalkWidth + Math.random() * (canvas.width - 2 * sidewalkWidth),
          y: -10,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 1 + 0.5,
          opacity: Math.random() * 0.3 + 0.2
        });
      }
    } else {
      // Clear snowflakes when not in snow mode
      snowflakes.length = 0;
    }

    snowflakes.forEach(f => {
      f.y += f.speed;
      if (f.y > canvas.height) {
        f.y = -10;
        f.x = Math.random() < 0.5
          ? Math.random() * sidewalkWidth
          : canvas.width - sidewalkWidth + Math.random() * sidewalkWidth;
      }
    });

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y -= b.speed;
      if (b.y + b.height < 0) {
        bullets.splice(i, 1);
        continue;
      }
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (isColliding(b, e)) {
          createExplosion(e.x + e.width / 2, e.y + e.height / 2, 0.8);
          e.health--;
          bullets.splice(i, 1);
          if (e.health <= 0 || !e.isTruck) {
            enemies.splice(j, 1);
            score += e.isTruck ? 3 : 1;
          }
          scoreDisplay.textContent = `Score: ${score}`;
          break;
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.speed;
      if (score > 40 && !e.hasChangedLane && e.y >= 150 && e.y < 160) {
        const pc = Math.min(0.05 + score / 800, 0.2);
        if (Math.random() < pc) {
          const idx = lanes.indexOf(e.targetX);
          const opts = [];
          if (idx > 0) opts.push(lanes[idx - 1]);
          if (idx < lanes.length - 1) opts.push(lanes[idx + 1]);
          if (opts.length) {
            e.targetX = opts[Math.floor(Math.random() * opts.length)];
            e.hasChangedLane = true;
          }
        }
      }
      e.x += (e.targetX - e.x) * 0.1;

      if (e.y > canvas.height) {
        enemies.splice(i, 1);
        if (currentMode !== 'combat') {
          score += player.speedBoost ? 2 : 1;
          scoreDisplay.textContent = `Score: ${score}`;
        }
        continue;
      }

      if (isColliding(player, e)) {
        if (player.shield) {
          createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.isTruck ? 1.5 : 1);
          enemies.splice(i, 1);
          score += e.isTruck ? 5 : 2;
          scoreDisplay.textContent = `Score: ${score}`;
        } else if (!player.invincible) {
          player.lives--;
          updateHearts();
          if (player.lives <= 0) {
            gameOver = true;
            try {
              highScores = JSON.parse(localStorage.getItem('HH_highScores') || '{}');
            } catch (e) {
              highScores = {};
            }
            saveHigh(currentMode, score);
            gameRunning = false;
            finalScoreDisplay.textContent = score.toString();
            const bestScoreElement = document.getElementById('bestScore');
            if (bestScoreElement) {
              bestScoreElement.textContent = getHigh(currentMode).toString();
            }
            gameOverScreen.style.display = 'block';
          } else {
            enemies.splice(i, 1);
            player.shield = true;
            player.shieldTime = Date.now();
            player.invincible = true;
            player.invincibleTime = Date.now();
          }
        }
      }
    }

    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.y += pu.speed;
      pu.rotation += 0.05;
      pu.pulseScale = 1 + 0.2 * Math.sin(Date.now() / 200);
      if (pu.y > canvas.height) {
        powerUps.splice(i, 1);
        continue;
      }
      if (isColliding(player, pu)) {
        if (pu.type === 'shield') {
          player.shield = true;
          player.shieldTime = Date.now();
        } else if (pu.type === 'speed') {
          player.speedBoost = true;
          player.speedBoostTime = Date.now();
        } else if (pu.type === 'ammo') {
          ammo = Math.min(6, ammo + 2);
          updateAmmoDisplay();
        }
        powerUps.splice(i, 1);
      }
    }
  }

  // === RENDERING ===
  // Draw sidewalks based on road type
  function drawSidewalk(type, x, w, h) {
    if (type === 'city') {
      // City: Building silhouettes with glowing windows and continuous yellow path
      ctx.fillStyle = '#2A2A2A'; // Dark gray background
      ctx.fillRect(x, 0, w, h);
      // Gradient for sky
      const grad = ctx.createLinearGradient(x, 0, x, h);
      grad.addColorStop(0, '#1C2526');
      grad.addColorStop(1, '#4A4A4A');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w, h);
      // Buildings
      for (let bx = x; bx < x + w; bx += 10) {
        const height = 50 + Math.random() * 100;
        ctx.fillStyle = '#333';
        ctx.fillRect(bx, h - height, 8, height);
        // Windows
        for (let wy = h - height + 10; wy < h - 10; wy += 15) {
          if (Math.random() < 0.5) {
            ctx.fillStyle = `rgba(255, 255, 0, ${0.6 + 0.3 * Math.sin(Date.now() / 1000)})`;
            ctx.fillRect(bx + 2, wy, 4, 4);
          }
        }
      }
      // Continuous yellow path
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x, h - 5, w, 5);
    } else if (type === 'desert') {
      // Desert: Layered dunes with gradient and animated tumbleweeds
      ctx.fillStyle = '#D2B48C'; // Tan background
      ctx.fillRect(x, 0, w, h);
      // Gradient dunes
      const grad = ctx.createLinearGradient(x, h * 0.7, x, h);
      grad.addColorStop(0, '#DEB887');
      grad.addColorStop(1, '#8B5A2B');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, h);
      for (let dx = x; dx <= x + w; dx += 5) {
        ctx.lineTo(dx, h - 20 - 10 * Math.sin(dx / 10 + roadOffset / 10));
      }
      ctx.lineTo(x + w, h);
      ctx.closePath();
      ctx.fill();
      // Tumbleweeds (spawn occasionally)
      if (Math.random() < 0.02) {
        particles.push({
          x: x + w / 2,
          y: h - 10,
          vx: (Math.random() - 0.5) * 2,
          vy: -1,
          size: 8,
          life: 20,
          color: '#8B4513'
        });
      }
    } else if (type === 'snow') {
      // Snow: Snow-covered ground with falling snowflakes
      ctx.fillStyle = '#E6F0FA'; // Light snow background
      ctx.fillRect(x, 0, w, h);
      // Snow-covered ground
      ctx.fillStyle = '#FFF';
      ctx.fillRect(x, h - 20, w, 20);
      // Snowflakes on sidewalk
      if (Math.random() < 0.1) {
        snowflakes.push({
          x: x + Math.random() * w,
          y: 0,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 0.5 + 0.3,
          opacity: 0.5
        });
      }
    } else if (type === 'night') {
      // Night: Starry sky
      ctx.fillStyle = '#1C2526'; // Dark night background
      ctx.fillRect(x, 0, w, h);
      // Starry sky gradient
      const grad = ctx.createLinearGradient(x, 0, x, h);
      grad.addColorStop(0, '#0A0F1A');
      grad.addColorStop(1, '#1C2526');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w, h);
      // Stars
      for (let y = 0; y < h; y += 50) {
        if (Math.random() < 0.3) {
          ctx.beginPath();
          ctx.arc(x + Math.random() * w, y + Math.random() * 50, 1, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.5 * Math.sin(Date.now() / 1000)})`;
          ctx.fill();
        }
      }
    }
  }

  // Draw car (fallback for player or enemies)
  function drawCar(x, y, w, h, color, isPlayer = false) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    if (isPlayer) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }

  // Draw truck (fallback for trucks)
  function drawTruck(x, y, w, h) {
    ctx.fillStyle = '#666';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  }

  // Draw shield power-up
  function drawShield(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w / 3, y + h / 2);
    ctx.lineTo(x - w / 3, y + h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.closePath();
  }

  // Draw star shape for power-ups
  function drawStar(x, y, r, pts, inner, rot) {
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const ang = (i * Math.PI) / pts + rot;
      const rr = (i % 2 === 0) ? r : r * inner;
      ctx.lineTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang));
    }
    ctx.closePath();
  }

  // Main draw function
  function draw() {
    // Clear canvas
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road and sidewalks
    ctx.fillStyle = '#333';
    ctx.fillRect(sidewalkWidth, 0, canvas.width - 2 * sidewalkWidth, canvas.height);
    drawSidewalk(roadTypes[currentRoadType].sidewalk, 0, sidewalkWidth, canvas.height);
    drawSidewalk(roadTypes[currentRoadType].sidewalk, canvas.width - sidewalkWidth, sidewalkWidth, canvas.height);

    // Draw lane markings
    ctx.fillStyle = roadTypes[currentRoadType].markingColor;
    for (let i = 1; i < lanes.length; i++) {
      const x = lanes[i] - 10;
      for (let y = -40 + roadOffset; y < canvas.height; y += 40) {
        ctx.fillRect(x, y, 5, 20);
      }
    }

    // Draw survival/combat timer
    if (currentMode === 'survival' || currentMode === 'combat') {
      const left = Math.max(0, 120 - ((Date.now() - survivalStart) / 1000 | 0));
      ctx.fillStyle = '#fff';
      ctx.font = '24px "Segoe UI"';
      ctx.textAlign = 'center';
      ctx.fillText(`Time left: ${left}s`, canvas.width / 2, 30);
    }

    // Draw snowflakes
    if (currentRoadType === 'snow') {
      ctx.fillStyle = '#FFF';
      snowflakes.forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw player
    if (useImages && images['player'] && images['player'].complete) {
      ctx.drawImage(images['player'], player.x, player.y, player.width, player.height);
    } else {
      drawCar(player.x, player.y, player.width, player.height, '#00ff00', true);
    }

    // Draw shield effect
    if (player.shield) {
      const cx = player.x + player.width / 2, cy = player.y + player.height / 2;
      [50, 60, 70].forEach((rad, idx) => {
        const grad = ctx.createRadialGradient(
          cx + 5 * Math.sin(Date.now() / 400 + idx),
          cy + 3 * Math.cos(Date.now() / 400 + idx),
          0, cx, cy, rad
        );
        grad.addColorStop(0, `rgba(0,255,255,${player.shieldOpacity[idx]})`);
        grad.addColorStop(1, `rgba(0,100,255,${player.shieldOpacity[idx] / 4})`);
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, 2 * Math.PI);
        ctx.fillStyle = grad;
        ctx.fill();
      });
    }

    // Draw nitro particles
    player.nitroParticles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size / 2, p.size, 0, 0, 2 * Math.PI);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    });

    // Draw enemies
    enemies.forEach(e => {
      if (useImages && images[e.imageKey] && images[e.imageKey].complete) {
        ctx.drawImage(images[e.imageKey], e.x, e.y, e.width, e.height);
      } else {
        if (e.isTruck) drawTruck(e.x, e.y, e.width, e.height);
        else drawCar(e.x, e.y, e.width, e.height, '#ff4444');
      }
    });

    // Draw bullets
    ctx.fillStyle = '#FFD700';
    bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

    // Draw power-ups
    powerUps.forEach(pu => {
      ctx.save();
      ctx.translate(pu.x + pu.width / 2, pu.y + pu.height / 2);
      ctx.rotate(pu.rotation);
      ctx.scale(pu.pulseScale, pu.pulseScale);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, pu.width / 2);

      if (pu.type === 'speed') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(0, 0);
        ctx.lineTo(-4, 0);
        ctx.lineTo(4, 8);
        ctx.lineTo(0, 8);
        ctx.lineTo(8, 0);
        ctx.lineTo(4, 0);
        ctx.lineTo(2, -8);
        ctx.closePath();
        ctx.stroke();
      } else if (pu.type === 'shield') {
        grad.addColorStop(0, '#0f0');
        grad.addColorStop(1, 'rgba(0,255,0,0)');
        drawShield(0, 0, pu.width / 2, pu.height / 2);
        ctx.beginPath();
        ctx.arc(0, 0, pu.width / 2 + 2 * Math.sin(Date.now() / 300), 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0,255,255,0.1)';
        ctx.fill();
      } else if (pu.type === 'ammo') {
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillRect(-2, -8, 4, 4);
        ctx.fillRect(-2, -2, 4, 4);
        ctx.fillRect(-2, 4, 4, 4);
      }

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    });

    // Draw explosion particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    // Update FPS counter
    frameCount++;
    if (Date.now() - lastFPSUpdate >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastFPSUpdate = Date.now();
      fpsDisplay.textContent = `FPS: ${fps}`;
    }
  }

  // === MAIN GAME LOOP ===
  function gameLoop(ts) {
    if (!gameRunning) return;
    if (!lastFrameTime) lastFrameTime = ts;
    const dt = ts - lastFrameTime;
    lastFrameTime = ts;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  // Start image loading
  loadImages();
});
