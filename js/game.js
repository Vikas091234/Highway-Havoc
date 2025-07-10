// game.js - Full updated code with your requested enhancements

document.addEventListener('DOMContentLoaded', () => {
  // Abilities & lives API
  const {
    updatePowerUps, updateHearts, 
    spawnPowerUp,  player, powerUps
  } = window.abilitiesAndLives;

  /*** CANVAS & UI ELEMENTS ***/
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
  const modes = {
    classic:  { truckChance: 0.1 },
    truckers: { truckChance: 0.7 }
  };

  /*** GAME STATE ***/
  let frameCount      = 0,
      lastFPSUpdate   = Date.now(),
      fps             = 0;

  let currentMode     = 'classic',
      currentRoadType = 'city',
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
      img.src = 'images/' + fn;
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
  loadImages();

  /*** GAME CONFIGURATIONS ***/
  
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
    if (e.key==='ArrowLeft'||e.key==='ArrowRight') {
      keys[e.key]=true; keyStates[e.key]=true;
    } else if (e.key===' ') { e.preventDefault();  }
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
    // → reveal the overlays when the game actually begins
    heartsContainer.style.display   = 'block';
    scoreDisplay.style.display      = 'block';
    restartButton.style.display     = 'inline-block';
    if (window.audioControl) window.audioControl.play();
    gameRunning = true;
    lastTime     = 0;
    requestAnimationFrame(gameLoop);
    gameRunning=true; gameOver=false; score=0;
    player.x=lanes[3]; targetX=lanes[3]; player.y=480;
    player.lives=3;

    player.shield=false; player.speedBoost=false; player.invincible=false;
    enemies.length=0; powerUps.length=0; particles.length=0; snowflakes.length=0;
    lastSpawnTime=0; spawnInterval=3000; roadOffset=0; currentRoadType='city';

    updateHearts(); updateRoadType();
    scoreDisplay.textContent=`Score: ${score}`;

    canvas.style.display='block'; scoreDisplay.style.display='block';
    heartsContainer.style.display='block';
   //gameUI.style.display='block';
    modeSelector.style.display='none'; startButton.style.display='none';
    gameOverScreen.style.display='none';

    animationId = requestAnimationFrame(gameLoop);
  }
  function resetGame() {
    // Reset core game state
    score = 0;
    gameRunning = true;
    gameOver = false;

    // Reset player
    player.x = lanes[3];
    player.y = 480;
    player.lives = 3;
    player.shield = false;
    player.speedBoost = false;
    player.invincible = false;
    player.invincibleTime = 0;
    player.speedBoostTime = 0;
    player.shieldTime = 0;
    player.nitroParticles = [];

    // Reset arrays
    powerUps.length = 0;
    enemies.length = 0;
    particles.length = 0;
    snowflakes.length = 0;

    // Reset display
    scoreDisplay.textContent = `Score: ${score}`;
    gameOverScreen.style.display = 'none';
    canvas.style.display = 'block';
    scoreDisplay.style.display = 'block';
    heartsContainer.style.display = 'block';
    restartButton.style.display = 'inline-block';
    gameUI.style.display = 'block';

    updateHearts();
    updateRoadType();

    lastFrameTime = 0;
    requestAnimationFrame(gameLoop);
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
  function shuffleArray(array) {
    const a = array.slice(); // make a copy
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }


  /*** ROAD TYPE UPDATE ***/
  function updateRoadType() {
    const types = Object.keys(roadTypes);
    const idx = Math.floor(score/25) % types.length;
    currentRoadType = types[idx];
    roadTypeDisplay.textContent = roadTypes[currentRoadType].name;
  }

  /*** SPAWN ENEMIES ***/
  const enemies=[],
        particles=[];
  function spawnEnemy() {
    const now = Date.now();
    if (now - lastSpawnTime < spawnInterval) return;

    // 🎯 Dynamic max enemies
    let maxEnemies = 11;
    if (score > 50)  maxEnemies += Math.floor(Math.random() * 2) + 1;
    if (score > 100) maxEnemies += 2;

    if (enemies.length >= maxEnemies) return;

    const shuffledLanes = shuffleArray(lanes);
    const available = shuffledLanes.filter(lx => !enemies.some(e => Math.abs(e.x - lx) < 60 && e.y < 100));
    if (!available.length) return;

    // 🎯 Combined cluster + rush logic
    const time = Date.now() / 1000;
    const rush = Math.floor(time % 30) === 0 && Math.random() < 0.3;

    const clusterSize = rush
      ? 4 + Math.floor(Math.random() * 3)
      : (Math.random() < 0.5 ? 1 : Math.floor(Math.random() * 2) + 1);


    for (let i = 0; i < clusterSize; i++) {
      if (available.length === 0) break;
      const li = Math.floor(Math.random() * available.length);
      const lx = available.splice(li, 1)[0];

      const extraTruckChance = Math.random() * 0.2;
      const isTruck = Math.random() < (modes[currentMode].truckChance + Math.min(score / 200, 0.5) + extraTruckChance);
      const baseSpeed = Math.min(1.5 + score / 80, 5);

      const isNewEnemy = Math.random() < 0.2; // 20% chance to get enemy7
      const imageKey = isTruck
        ? (Math.random() < 0.5 ? 'truck1' : 'truck2')
        : isNewEnemy
        ? 'enemy7'
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

    // snowflake generation
    if (currentRoadType==='snow' && snowflakes.length<15 && Math.random()<0.05) {
      snowflakes.push({
        x: Math.random()<0.5
             ? Math.random()*sidewalkWidth
             : canvas.width-sidewalkWidth + Math.random()*sidewalkWidth,
        y:-10, size:Math.random()*2+1,
        speed:Math.random()*1+0.5,
        opacity:Math.random()*0.3+0.2
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
    });


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
      if(e.y>canvas.height){
        enemies.splice(i,1);
        if(currentMode!=='combat'){ score++; scoreDisplay.textContent=`Score: ${score}`; }
        continue;
      }

      // collision with player
      if(isColliding(player,e)){
        if(player.shield){
          createExplosion(e.x+e.width/2,e.y+e.height/2,e.isTruck?1.5:1);
          enemies.splice(i,1);
          score += e.isTruck?5:2; scoreDisplay.textContent=`Score: ${score}`;
        } else if(!player.invincible){
          player.lives--; updateHearts();
          if(player.lives<=0){
            gameOver=true; gameRunning=false;
            finalScoreDisplay.textContent = score;
            gameOverScreen.style.display = 'block';
          } else {
            enemies.splice(i,1);
            player.shield=true; player.shieldTime=Date.now();
            player.invincible=true; player.invincibleTime=Date.now();
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

    // snowflakes
    if(currentRoadType==='snow'){
      snowflakes.forEach(f=>{
        ctx.beginPath();
        ctx.arc(f.x,f.y,f.size,0,2*Math.PI);
        ctx.fillStyle=`rgba(255,255,255,${f.opacity})`;
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

    // power-ups
    powerUps.forEach(pu=>{
      ctx.save();
      ctx.translate(pu.x+pu.width/2, pu.y+pu.height/2);
      ctx.rotate(pu.rotation);
      ctx.scale(pu.pulseScale, pu.pulseScale);
      const grad = ctx.createRadialGradient(0,0,0,0,0,pu.width/2);

      if(pu.type==='speed'){
        grad.addColorStop(0,'#FFF');
        grad.addColorStop(1,'rgba(255,255,0,0)');
        drawThunderbolt(0,0,pu.width,pu.height);
      } else if(pu.type==='shield'){
        grad.addColorStop(0,'#0f0');
        grad.addColorStop(1,'rgba(0,255,0,0)');
        drawShield(0,0,pu.width/2,pu.height/2);
        ctx.beginPath();
        ctx.arc(0,0,pu.width/2 + 2*Math.sin(Date.now()/300),0,2*Math.PI);
        ctx.fillStyle='rgba(0,255,255,0.1)'; ctx.fill();
      } 

      ctx.fillStyle=grad;
      ctx.fill();
      ctx.restore();
    });


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
});
