// game.js - Full updated code with your requested enhancements

document.addEventListener('DOMContentLoaded', () => {
  function update() {
  if (!gameRunning) return;
    handleInput();
    updatePowerUps();
    updateRoadType();

    roadOffset = (roadOffset + 2.5) % 40;
    spawnInterval = Math.max(600, 3000 - score * 12);

    // Random vehicle burst after score 40
    if (score >= 40 && Math.random() < 0.01) { // 1% chance per frame
      const burstCount = Math.floor(Math.random() * 3) + 3; // 3 to 5 enemies
      for (let i = 0; i < burstCount; i++) {
        spawnEnemy();
      }
      console.log(`Random vehicle burst triggered at score ${score}: ${burstCount} enemies`);
    }
    spawnEnemy();
    spawnPowerUp();
  }
  
  let highScores = JSON.parse(localStorage.getItem('HH_highScores') || '{}');
  if (typeof highScores !== 'object' || highScores === null) {
    highScores = {};
  }
  function saveHigh(mode, score) {
    const old = highScores[mode] || 0;
    if (score > old) {
      highScores[mode] = score;
      localStorage.setItem('HH_highScores', JSON.stringify(highScores));
      const element = document.getElementById('h-' + mode);
      if (element) {
        element.textContent = score;
      }
    }
  }

  function getHigh(mode) {
    console.log('getHigh called for mode:', mode, 'value:', highScores[mode] || 0);
    return highScores[mode] || 0;
  }
  window.saveHigh = saveHigh;
  window.getHigh  = getHigh;

  // Populate high scores on home page
  ['classic', 'combat', 'survival', 'truckers'].forEach(m => {
    const element = document.getElementById('h-' + m);
    if (element) {
      element.textContent = getHigh(m);
    }
  });

  // Abilities & lives API
  const {
    updatePowerUps, updateHearts, 
    spawnPowerUp,  player, powerUps
  } = window.abilitiesAndLives;
  // Reset high scores button
  const resetHighScoresButton = document.getElementById('resetHighScores');
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
  /*** CANVAS & UI ELEMENTS ***/
  // --- COMBAT & SURVIVAL MODE EXTRAS ---
   
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');
  const startButton = document.getElementById('startButton');
  const restartButton    = document.getElementById('restartButton');
  const scoreDisplay     = document.getElementById('score');
  const gameUI           = document.getElementById('gameUI');
  const heartsContainer  = document.getElementById('heartsContainer');
 
  const roadTypeDisplay  = document.getElementById('roadType');
  const modeSelector     = document.getElementById('modeSelector');
  const gameOverScreen   = document.getElementById('gameOverScreen');
  const finalScoreDisplay= document.getElementById('finalScore');
  const loadingScreen    = document.getElementById('loadingScreen');
  const loadingProgress  = document.getElementById('loadingProgress');
  const fpsDisplay       = document.getElementById('fps');
  let currentRoadType = 'snow'; // Default value
  const modes = {
    classic:  { truckChance: 0.1, maxEnemies: 17 },
    combat:   { truckChance: 0.1, maxEnemies: 24 },
    survival: { truckChance: 0.1, maxEnemies: 29 },
    truckers: { truckChance: 1, maxEnemies: 17 }
    }
  const maxAmmoOnStart ={ combat: 6, survival: 0 };

  /*** GAME STATE ***/
  let frameCount      = 0,
      lastFPSUpdate   = Date.now(),
      fps             = 0;

  let currentMode     = 'classic',
      
      gameRunning     = false,
      gameOver        = false,
      animationId     = null,
      lastFrameTime   = 0,
      targetX         = 0,
      score           = 0,
      lastSpawnTime   = 0,
      spawnInterval   = 3000,
      roadOffset      = 0;

  const keys     = {},
        keyStates= { ArrowLeft: false, ArrowRight: false };

  const snowflakes = [];      // for snow effect
  const bullets = [];
  const BULLET_SPEED = 9;
  const BULLET_SIZE = { w: 6, h: 12 };
  let ammo=0;
  let survivalTimer = null;
  let survivalstart = 0;
  


  /*** ASSET LOADING ***/
  const images = {};
  const imageFiles = [
    'player.png','enemy1.png','enemy2.png','enemy3.png',
    'enemy4.png','enemy5.png','enemy6.png','enemy7.png',
    'truck1.png','truck2.png'
  ];

  let useImages = true;
  function loadImages() {
    loadingProgress.textContent = 'Loading images...';
    let loaded=0, errors=0;
    if (!imageFiles.length) return finishLoading();

    imageFiles.forEach(fn => {
      const img=new Image(), key=fn.replace('.png','');
      img.onload = () => { images[key]=img; loaded++; checkDone(); };
      img.onerror= () => { errors++; checkDone(); };
      img.src=fn;
    });
    setTimeout(() => { if (loaded+errors<imageFiles.length) { useImages=false; finishLoading(); } }, 5000);

    function checkDone() {
      if (loaded+errors===imageFiles.length) {
        useImages = loaded>0;
        finishLoading();
      }
      const pct = Math.round(((loaded+errors)/imageFiles.length)*100);
      loadingProgress.textContent=`Loading: ${pct}% (${loaded}/${imageFiles.length})`;
    }
  }
  function finishLoading() {
    loadingProgress.textContent = useImages ? 'Images loaded!' : 'Using fallback graphics';
    setTimeout(() => {
      loadingScreen.style.display='none';
      startButton.style.display='inline-block';
    }, 500);
  }
  
  function fireBullet() {
    if (currentMode !== 'combat' || ammo <= 0) return;
    ammo--;
    bullets.push({
      x: player.x + player.width/2 - 3,
      y: player.y - 12,
      width: 6,
      height: 12,
      speed: 9
    });
    updateAmmoDisplay();
  }
  

  function updateAmmoDisplay(){
    const box = document.getElementById('ammoContainer');
    box.style.display=(currentMode === 'combat' || currentMode === 'survival') ? 'block' : 'none';
    box.innerHTML = '';
    for (let i = 0; i < ammo; i++){
      const span = document.createElement('span');
      span.className = 'bullet-icon'; span.textContent = '.';
      box.appendChild(span);
    }
  }
  
  
  loadImages();

  /*** GAME CONFIGURATIONS ***/
  function fireBullet() {
    if (currentMode !== 'combat' || ammo <= 0) return;
    ammo--;
    bullets.push({
      x: player.x + player.width/2 - 3,
      y: player.y - 12,
      width: 6,
      height: 12,
      speed: 9
    });
    updateAmmoDisplay();
  }
    const roadTypes = {
    city : { name:'City Highway', color:'#333', markingColor:'#fff', speedMultiplier:1,   sidewalk:'city' },
    desert: { name:'Desert Road', color:'#333', markingColor:'#FFD700',speedMultiplier:1.1, sidewalk:'desert' },
    snow : { name:'Snowy Pass', color:'#333', markingColor:'#87CEEB',speedMultiplier:1.2, sidewalk:'snow' },
    night: { name:'Night Highway',color:'#333',markingColor:'#00FFFF',speedMultiplier:1.3, sidewalk:'night' }
  };
  const sidewalkWidth = 30;
  const lanes = [40,117,194,271,348,425,502];

  /*** INPUT HANDLING ***/
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      keys[e.key] = true;
      keyStates[e.key] = true;
    } else if (e.key === ' ') {            // <<< NEW
      e.preventDefault();
      fireBullet();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.key==='ArrowLeft'||e.key==='ArrowRight') {
      keys[e.key]=false; keyStates[e.key]=false;
    }
  });





  /*** MODE SELECTOR ***/
  document.querySelectorAll('.mode-button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.mode-button').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      currentMode = btn.dataset.mode;
    });
  });

  /*** GAME START / RESET ***/
  function startGame() {
    // ----- UI & basic reset -----
    heartsContainer.style.display   = 'block';
    scoreDisplay.style.display      = 'block';
    restartButton.style.display     = 'inline-block';
    if (window.audioControl) window.audioControl.play();

    gameRunning = true;
    gameOver    = false;
    score       = 0;
    const types = Object.keys(roadTypes);
    currentRoadType = document.getElementById('roadSelect').value;
    console.log('Selected road type:', currentRoadType);
    roadTypeDisplay.textContent = roadTypes[currentRoadType].name;

    player.x     = lanes[3];
    targetX      = lanes[3];
    player.y     = 480;
    player.lives = 3;

    player.shield       = false;
    player.speedBoost   = false;
    player.invincible   = false;
    player.shieldTime   = 0;
    player.speedBoostTime = 0;
    player.invincibleTime = 0;

    enemies.length     = 0;
    powerUps.length    = 0;
    particles.length   = 0;
    snowflakes.length  = 0;
    bullets.length     = 0;

    lastSpawnTime = 0;
    spawnInterval = 3000;
    roadOffset    = 0;
   

    updateHearts();
    updateRoadType();
    
    scoreDisplay.textContent = `Score: ${score}`;

    canvas.style.display          = 'block';
    scoreDisplay.style.display    = 'block';
    heartsContainer.style.display = 'block';
    modeSelector.style.display    = 'none';
    resetHighScoresButton.style.display = 'none';
    startButton.style.display     = 'none';
    gameOverScreen.style.display  = 'none';
    document.getElementById('gameMusic').style.display = 'block';
    document.getElementById('gameMusic').style.zIndex = '10';
    document.getElementById('canvasSpacer').style.display = 'block';

    // ----- MODE-SPECIFIC SETUP -----
    ammo = maxAmmoOnStart[currentMode] || 0;
    if (currentMode === 'combat') ammo = 6;
    updateAmmoDisplay();

    // clear any leftover survival timer
    if (survivalTimer) clearInterval(survivalTimer);

    // Survival 2-minute countdown
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
          finalScoreDisplay.textContent = score;
          document.getElementById('bestScore').textContent = getHigh(currentMode);
          gameOverScreen.style.display = 'block';
        }
      }, 1000);
    }

    animationId = requestAnimationFrame(gameLoop);
  }
  function resetGame() {
    score = 0;
    gameRunning = true;
    gameOver = false;

    player.x = lanes[3];
    player.y = 480;
    player.lives = 3;
    player.shield = player.speedBoost = player.invincible = false;

    enemies.length = 0;
    powerUps.length = 0;
    particles.length = 0;
    snowflakes.length = 0;
    bullets.length = 0;

    scoreDisplay.textContent = `Score: ${score}`;
    gameOverScreen.style.display = 'none';
    canvas.style.display = 'block';
    scoreDisplay.style.display = 'block';
    heartsContainer.style.display = 'block';
    restartButton.style.display = 'inline-block';
    document.getElementById('gameMusic').style.display = 'none';
    document.getElementById('canvasSpacer').style.display = 'none';

    updateHearts();
    

    // stop loop & go home
    cancelAnimationFrame(animationId);
    canvas.style.display = 'none';
    scoreDisplay.style.display = 'none';
    heartsContainer.style.display = 'none';
    restartButton.style.display = 'none';
    gameOverScreen.style.display = 'none';
    modeSelector.style.display = 'block';
    startButton.style.display = 'inline-block';
  }
  
 startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', resetGame);

  const playAgainButton = document.getElementById('playAgainButton');
  if (playAgainButton) {
    playAgainButton.addEventListener('click', resetGame);
  }

  /*** UTILS ***/
  function isColliding(a,b) {
    return a.x < b.x+b.width &&
           a.x+a.width > b.x &&
           a.y < b.y+b.height &&
           a.y+a.height > b.y;
  }

  /*** ROAD TYPE UPDATE ***/
  function updateRoadType() {
    if (score >= 20) { // Only update after score reaches 20
      const types = Object.keys(roadTypes);
      const idx = Math.floor(score / 20) % types.length;
      currentRoadType = types[idx];
    }
    roadTypeDisplay.textContent = roadTypes[currentRoadType].name;
    console.log('Current road type:', currentRoadType); // Debug
  }
  /*** SPAWN ENEMIES ***/
  const enemies=[],
        particles=[];
  function spawnEnemy() {
    const now=Date.now();
    if (now-lastSpawnTime < spawnInterval) return;

    // dynamic max by score
    let maxEnemies = modes[currentMode].maxEnemies;
    const available = lanes.filter(lx=>!enemies.some(e=>Math.abs(e.x-lx)<60&&e.y<100));
    if (!available.length) return;

    const cluster = score>20 && Math.random()<0.4;
    const clusterSize = cluster?Math.min(available.length,Math.floor(Math.random()*3)+1):1;
    for(let i=0;i<clusterSize;i++){
      const li = Math.floor(Math.random()*available.length);
      const lx = available.splice(li,1)[0];
      const isTruck = Math.random() < modes[currentMode].truckChance + Math.min(score/200,0.5);
      const baseSpeed = Math.min(1.5 + score/80,5);
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
        imageKey, // ✅ ← THIS is what we're talking about
        targetX: lx,
        hasChangedLane: false
      };

      enemies.push(enemy);
    }
    lastSpawnTime = now;
  }

  

  /*** UPDATE FUNCTIONS ***/
  function handleInput() {
    if (!gameRunning) return;
    const friction = currentRoadType==='snow'?0.5:1;
    const mv = player.speedBoost ? player.speed*1.3 : player.speed;
    if (keyStates.ArrowLeft) {
      targetX = Math.max(sidewalkWidth+10, player.x - mv);
      keyStates.ArrowLeft=false;
    }
    if (keyStates.ArrowRight) {
      targetX = Math.min(canvas.width-sidewalkWidth-player.width-10, player.x + mv);
      keyStates.ArrowRight=false;
    }
    player.x += (targetX - player.x)*0.3*friction;
  }

  function update() {
    if (!gameRunning) return;
    handleInput();
    updatePowerUps();
    updateRoadType();

    // road movement
    roadOffset = (roadOffset + 2.5) % 40;
    spawnInterval = Math.max(600, 3000 - score*12);

    spawnEnemy();
    spawnPowerUp();

    const types = currentMode === 'combat'
                    ?
    ['shield','speed','ammo'] 
                    : ['shield','speed'];
                
    


    // snowflake generation
    
    if (currentRoadType === 'snow' && snowflakes.length < 60 && Math.random() < 0.3) {
      snowflakes.push({
        x: sidewalkWidth + Math.random() * (canvas.width - 2 * sidewalkWidth),
        y: -10,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.3 + 0.2
      });
    }
    snowflakes.forEach(f=>{
      f.y+=f.speed;
      if (f.y>canvas.height) {
        f.y=-10;
        f.x = Math.random()<0.5
            ? Math.random()*sidewalkWidth
            : canvas.width-sidewalkWidth + Math.random()*sidewalkWidth;
      }
    } );
        // move bullets upward
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y -= b.speed;

      // delete off-screen
      if (b.y + b.height < 0) {
        bullets.splice(i, 1);
        continue;
      }

      // collision with enemies
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (isColliding(b, e)) {
          createExplosion(e.x + e.width/2, e.y + e.height/2, 0.8);
          e.health--;
          bullets.splice(i, 1);
          if (e.health <= 0 || !e.isTruck) {
            enemies.splice(j, 1);
            score +=e.isTruck ? 3 : 1;
          }
          
          scoreDisplay.textContent = `Score: ${score}`;
          break;   // one bullet → one enemy
        }
      }
    }
 


    // update particles
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      p.x+=p.vx; p.y+=p.vy; p.life--;
      if(p.life<=0) particles.splice(i,1);
    }

    // update enemies movement & collisions
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      e.y += e.speed;
      // lane-change probability
      if (score>40 && !e.hasChangedLane && e.y>=150 && e.y<160) {
        const pc = Math.min(0.05 + score/800, 0.2);
        if (Math.random()<pc) {
          const idx=lanes.indexOf(e.targetX);
          const opts=[];
          if(idx>0) opts.push(lanes[idx-1]);
          if(idx<lanes.length-1) opts.push(lanes[idx+1]);
          if(opts.length) {
            e.targetX = opts[Math.floor(Math.random() * opts.length)];
            e.hasChangedLane=true;
          }
        }
      }
      e.x += (e.targetX - e.x)*0.1;

      // off-screen
      if (e.y > canvas.height) {
        enemies.splice(i, 1);
        if (currentMode !== 'combat') {
          score += player.speedBoost ? 2 : 1;
          scoreDisplay.textContent = `Score: ${score}`;
        }
        continue;
      }

      // collision with player
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
            // Refresh highScores from localStorage
            try {
              highScores = JSON.parse(localStorage.getItem('HH_highScores') || '{}');
            } catch (e) {
              highScores = {};
            }
            saveHigh(currentMode, score);
            gameRunning = false;
            finalScoreDisplay.textContent = score;
            const bestScoreElement = document.getElementById('bestScore');
            if (bestScoreElement) {
              bestScoreElement.textContent = getHigh(currentMode);
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

    // power-up collection
    for(let i=powerUps.length-1;i>=0;i--){
      const pu = powerUps[i];
      pu.y += pu.speed;
      pu.rotation += 0.05;
      pu.pulseScale = 1 + 0.2 * Math.sin(Date.now()/200);

      if(pu.y>canvas.height){ powerUps.splice(i,1); continue; }
      if(isColliding(player, pu)){
        if(pu.type==='shield'){
          player.shield=true; player.shieldTime=Date.now();
        } else if(pu.type==='speed'){
          player.speedBoost=true; player.speedBoostTime=Date.now();
        } else if(pu.type==='ammo'){
          ammo = Math.min(6, ammo + 2);
          updateAmmoDisplay()
        }
        powerUps.splice(i,1);
      }
    }
  }

  /*** DRAW UTILITIES ***/
  function drawSidewalk(type, x, w, h) {
    if(type==='city'){
      ctx.fillStyle='#4A4A4A'; ctx.fillRect(x,0,w,h);
      for(let y=0;y<h;y+=100){
        ctx.fillStyle='#333'; ctx.fillRect(x,y,w,80);
        ctx.fillStyle='#FFFF99';
        for(let wy=y+10;wy<y+70;wy+=15){
          ctx.fillRect(x+5,wy,5,5);
          ctx.fillRect(x+15,wy,5,5);
        }
      }
    } else if(type==='desert'){
      ctx.fillStyle='#DEB887'; ctx.fillRect(x,0,w,h);
      for(let y=0;y<h;y+=120){
        ctx.fillStyle='rgba(205,133,63,0.8)';
        ctx.beginPath(); ctx.arc(x+w/2,y+30,20,0,2*Math.PI); ctx.fill();
        ctx.fillStyle='rgba(210,180,140,0.6)';
        ctx.beginPath(); ctx.arc(x+w/2+10,y+50,15,0,2*Math.PI); ctx.fill();
      }
    } else if(type==='snow'){
      ctx.fillStyle='#F0F8FF'; ctx.fillRect(x,0,w,h);
      for(let y=0;y<h;y+=80){
        ctx.fillStyle='#FFF'; ctx.fillRect(x,y,w,20);
      }
    } else if(type==='night'){
      ctx.fillStyle='#1C2526'; ctx.fillRect(x,0,w,h);
      for(let y=0;y<h;y+=60){
        ctx.fillStyle=`rgba(255,255,255,${0.3+0.2*Math.sin(Date.now()/500)})`;
        ctx.beginPath(); ctx.arc(x+w/2,y,6,0,2*Math.PI); ctx.fill();
      }
    }
  }

  function drawCar(x,y,w,h,color,isPlayer=false){
    ctx.fillStyle=color; ctx.fillRect(x,y,w,h);
    if(isPlayer){
      ctx.strokeStyle='#00FF00'; ctx.lineWidth=2;
      ctx.strokeRect(x,y,w,h);
    }
  }
  function drawTruck(x,y,w,h){
    ctx.fillStyle='#666'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#555'; ctx.fillRect(x+10,y+10,w-20,h-20);
  }
 
  function drawThunderbolt(x,y,w,h){
    ctx.beginPath();
    ctx.moveTo(x,y-h/2);
    ctx.lineTo(x+w/3,y-h/3);
    ctx.lineTo(x-w/4,y-h/6);
    ctx.lineTo(x+w/2,y);
    ctx.lineTo(x-w/4,y+h/6);
    ctx.lineTo(x+w/3,y+h/3);
    ctx.lineTo(x,y+h/2);
    ctx.closePath();
  }
  function drawShield(x,y,w,h){
    ctx.beginPath();
    ctx.moveTo(x,y-h/2);
    ctx.lineTo(x+w/2,y);
    ctx.lineTo(x+w/3,y+h/2);
    ctx.lineTo(x-w/3,y+h/2);
    ctx.lineTo(x-w/2,y);
    ctx.closePath();
  }
  function drawStar(x,y,r,pts, inner, rot){
    ctx.beginPath();
    for(let i=0;i<pts*2;i++){
      const ang = (i*Math.PI)/pts + rot;
      const rr  = (i%2===0)?r:r*inner;
      ctx.lineTo(x+rr*Math.cos(ang), y+rr*Math.sin(ang));
    }
    ctx.closePath();
  }

  function createExplosion(cx,cy,size=1){
    const pc = Math.min(5,3*size);
    for(let i=0;i<pc;i++){
      particles.push({
        x:cx, y:cy,
        vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*4,
        size:Math.random()*2+1,
        life:8,
        color:['#ff4444','#ff8844','#ffaa00'][Math.floor(Math.random()*3)]
      });
    }
  }

  /*** DRAW FUNCTION ***/
  function draw() {
    // clear
    ctx.fillStyle='#222'; ctx.fillRect(0,0,canvas.width,canvas.height);

    // road & sidewalks
    ctx.fillStyle='#333';
    ctx.fillRect(sidewalkWidth,0,canvas.width-2*sidewalkWidth,canvas.height);
    drawSidewalk(roadTypes[currentRoadType].sidewalk, 0, sidewalkWidth, canvas.height);
    drawSidewalk(roadTypes[currentRoadType].sidewalk, canvas.width-sidewalkWidth, sidewalkWidth, canvas.height);
    

    // lane markings
    ctx.fillStyle=roadTypes[currentRoadType].markingColor;
    for(let i=1;i<lanes.length;i++){
      const x=lanes[i]-10;
      for(let y=-40+roadOffset; y<canvas.height; y+=40){
        ctx.fillRect(x,y,5,20);
      }
    }
    if (currentMode === 'survival' || currentMode === 'combat') {
    const left = Math.max(0, 120 - ((Date.now() - survivalStart) / 1000 | 0));
    ctx.fillStyle = '#fff';
    ctx.font = '24px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText(`Time left: ${left}s`, canvas.width / 2, 30);
  }

    // snowflakes
    if (currentRoadType === 'snow') {
      ctx.fillStyle = '#FFF'; // Ensure snowflakes are white
      snowflakes.forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // draw player
    if(useImages && images.player){
      ctx.drawImage(images.player,player.x,player.y,player.width,player.height);
    } else {
      drawCar(player.x,player.y,player.width,player.height,'#00ff00',true);
    }

    // shield sphere
    if(player.shield){
      const cx = player.x+player.width/2, cy=player.y+player.height/2;
      [50,60,70].forEach((rad,idx)=>{
        const grad = ctx.createRadialGradient(
          cx+5*Math.sin(Date.now()/400+idx),
          cy+3*Math.cos(Date.now()/400+idx),
          0, cx,cy,rad
        );
        grad.addColorStop(0, `rgba(0,255,255,${player.shieldOpacity[idx]})`);
        grad.addColorStop(1, `rgba(0,100,255,${player.shieldOpacity[idx]/4})`);
        ctx.beginPath();
        ctx.arc(cx,cy,rad,0,2*Math.PI);
        ctx.fillStyle=grad; ctx.fill();
      });
    }

    // nitro particles
    player.nitroParticles.forEach(p=>{
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.ellipse(0,0,p.size/2,p.size,0,0,2*Math.PI);
      ctx.globalAlpha=p.opacity;
      ctx.fillStyle=p.color;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha=1;
    });

    // enemies
    enemies.forEach(e=>{
      if(useImages && images[e.imageKey]){
        ctx.drawImage(images[e.imageKey], e.x,e.y,e.width,e.height);
      } else {
        if(e.isTruck) drawTruck(e.x,e.y,e.width,e.height);
        else        drawCar(e.x,e.y,e.width,e.height,'#ff4444');
      }
    });
    // draw bullets
    ctx.fillStyle = '#FFD700';
    bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

    // power-ups
    powerUps.forEach(pu=>{
      ctx.save();
      ctx.translate(pu.x+pu.width/2, pu.y+pu.height/2);
      ctx.rotate(pu.rotation);
      ctx.scale(pu.pulseScale, pu.pulseScale);
      const grad = ctx.createRadialGradient(0,0,0,0,0,pu.width/2);

      if(pu.type==='speed'){
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(  0,  0);
        ctx.lineTo( -4,  0);
        ctx.lineTo(  4,  8);
        ctx.lineTo(  0,  8);
        ctx.lineTo(  8,  0);
        ctx.lineTo(  4,  0);
        ctx.lineTo(  2, -8);
        ctx.closePath();
        ctx.stroke();
      } else if(pu.type==='shield'){
        grad.addColorStop(0,'#0f0');
        grad.addColorStop(1,'rgba(0,255,0,0)');
        drawShield(0,0,pu.width/2,pu.height/2);
        ctx.beginPath();
        ctx.arc(0,0,pu.width/2 + 2*Math.sin(Date.now()/300),0,2*Math.PI);
        ctx.fillStyle='rgba(0,255,255,0.1)'; ctx.fill();
      } else if(pu.type=='ammo'){
        grad.addColorStop(0,'#ffd700');
        grad.addColorStop(1,'rgba(255,215,0,0)');
        ctx.fillRect(-2,-8,4,4);
        ctx.fillRect(-2,-2,4,4);
        ctx.fillRect(-2, 4,4,4);

      }

      ctx.fillStyle=grad;
      ctx.fill();
      ctx.restore();
    });

    ctx.fillStyle = '#FFD700';
    bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
    // explosion particles
    particles.forEach(p=>{
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.size,0,2*Math.PI);
      ctx.fillStyle=p.color; ctx.fill();
    });

    // FPS counter
    frameCount++;
    if(Date.now()-lastFPSUpdate>=1000){
      fps=frameCount; frameCount=0; lastFPSUpdate=Date.now();
      fpsDisplay.textContent=`FPS: ${fps}`;
    }
  }
  
  
  /*** MAIN LOOP ***/
  function gameLoop(ts){
    if(!gameRunning) return;
    if(!lastFrameTime) lastFrameTime=ts;
    const dt=ts-lastFrameTime; lastFrameTime=ts;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', resetGame);
  document.getElementById('gPlay').onclick = () => window.audioControl?.play();
  document.getElementById('gPause').onclick = () => window.audioControl?.pause();
  document.getElementById('gNext').onclick = () => window.audioControl?.skip();
});
  // populate high-scores on home page
;


 
