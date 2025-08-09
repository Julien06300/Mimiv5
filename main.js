// Mimi Runner — toutes fonctionnalités demandées
// - Bouton "Nouvelle Partie" obligatoire pour démarrer
// - Timer 60s (en haut à droite), fin = score centré + bouton
// - Mort (trou ou chat) => score centré + bouton + tombe affichée
// - Chats (cat.PNG) droite->gauche, apparition tous les 4–5 trous
// - Limite: max 3 TROUS visibles à l'écran simultanément
// - Score visible en haut à gauche en permanence; remis à 0 au démarrage d'une nouvelle partie
// Images attendues (majuscules): Mimi.PNG, bone.PNG, paris.PNG, cat.PNG, tomb.PNG (ou tomb_pixel.PNG si vous changez le nom ici)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const timerEl = document.getElementById('timer');
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');
const bigScoreEl = document.getElementById('bigScore');

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  baseGroundY = canvas.height - 96;
}
let baseGroundY = 0;
resize(); window.addEventListener('resize', resize);

// --- IMAGES (.PNG exact) ---
const bg    = new Image(); bg.src    = 'paris.PNG';
const mimi  = new Image(); mimi.src  = 'Mimi.PNG';
const boneI = new Image(); boneI.src = 'bone.PNG';
const catI  = new Image(); catI.src  = 'cat.PNG';
const tombI = new Image(); tombI.src = 'tomb.PNG'; // renommez ici si vous utilisez tomb_pixel.PNG

// --- Joueur ---
const GRAV = 0.55;
const player = { x: 140, y: 0, w: 56, h: 56, vy: 0, onGround:false, speed: 4 };
player.y = baseGroundY - player.h;

// --- Monde & état de jeu ---
let camX = 0, moveL=false, moveR=false;
let score = 0;
let bones = [];
let holes = [];           // {x,w}
let cats  = [];           // {x,y,w,h,vy,vx}
let holeCount = 0;
let nextCatAt = 4;        // un chat toutes les 4–5 fosses
let lastDeath = null;     // {x,y} pour dessiner la tombe

let gameActive = false;
let timeLeft = 60;
let lastTs = 0;

// ---------- Spawns (actifs uniquement quand gameActive) ----------
function spawnBone(){
  if(!gameActive) return;
  const gap = 200 + Math.random()*140;
  const x = camX + canvas.width + gap;
  const y = baseGroundY - (40 + Math.floor(Math.random()*70));
  bones.push({x,y,w:28,h:22});
}
function countVisibleHoles(){
  const L = camX, R = camX + canvas.width;
  let c = 0;
  for(const h of holes){
    const right = h.x + h.w, left = h.x;
    if (right >= L && left <= R) c++;
  }
  return c;
}
function spawnHole(){
  if(!gameActive) return;
  // Limite: maximum 3 trous visibles
  if (countVisibleHoles() >= 3) return;

  const minW = 90, maxW = 180;
  const distance = 420 + Math.random()*380;
  const x = camX + canvas.width + distance;
  const w = Math.floor(minW + Math.random()*(maxW-minW));
  holes.push({x,w});
  holeCount++;

  // Chat tous les 4–5 trous, sans limite stricte côté chats (contrôle de rareté par holes)
  if (holeCount >= nextCatAt){
    spawnCat();
    nextCatAt = holeCount + (Math.random() < 0.5 ? 4 : 5);
  }
}
function spawnCat(){
  if(!gameActive) return;
  const distance = 160 + Math.random()*120;
  const x = camX + canvas.width + distance;
  const w = 64, h = 48;
  cats.push({x, y: baseGroundY - h, w, h, vy:0, vx:-2.2}); // droite -> gauche
}

// Intervalles (respectent gameActive via les checks dans les fonctions)
setInterval(spawnBone, 800);
setInterval(spawnHole, 1600);

// ---------- Contrôles ----------
document.addEventListener('keydown', e=>{
  if(e.code==='ArrowLeft')  moveL=true;
  if(e.code==='ArrowRight') moveR=true;
  if(e.code==='Space' || e.code==='ArrowUp') jump();
});
document.addEventListener('keyup', e=>{
  if(e.code==='ArrowLeft')  moveL=false;
  if(e.code==='ArrowRight') moveR=false;
});

const L=document.getElementById('left'),R=document.getElementById('right'),J=document.getElementById('jump');
['touchstart','mousedown'].forEach(ev=>{
  L.addEventListener(ev,e=>{e.preventDefault();moveL=true});
  R.addEventListener(ev,e=>{e.preventDefault();moveR=true});
  J.addEventListener(ev,e=>{e.preventDefault();jump()});
});
['touchend','touchcancel','mouseup','mouseleave'].forEach(ev=>{
  L.addEventListener(ev,()=>moveL=false);
  R.addEventListener(ev,()=>moveR=false);
});
function jump(){ if(gameActive && player.onGround){ player.vy=-11.5; player.onGround=false; } }

// ---------- Cycle de vie ----------
function startGame(){
  // reset UI
  bigScoreEl.style.display = 'none';
  // reset monde
  score = 0; hud.textContent = 'Os: 0';
  timeLeft = 60; timerEl.textContent = '60s';
  lastDeath = null;
  camX = 0;
  bones = []; holes = []; cats = []; holeCount = 0; nextCatAt = 4;
  player.x = 140; player.y = baseGroundY - player.h; player.vy = 0; player.onGround = true;

  // préremplir
  for(let i=0;i<8;i++)  spawnBone();
  for(let i=0;i<3;i++)  spawnHole();

  gameActive = true;
  startOverlay.style.display = 'none';
}
startBtn.addEventListener('click', startGame);

function showEndWithScore(){
  bigScoreEl.textContent = `Score : ${score} os`;
  bigScoreEl.style.display = 'block';
  timerEl.textContent = '60s';
  startOverlay.style.display = 'flex';
}
function die(){
  lastDeath = { x: camX + player.x, y: player.y };
  gameActive = false;
  showEndWithScore();
}
function endByTimer(){
  lastDeath = null;
  gameActive = false;
  showEndWithScore();
}

// ---------- Boucle ----------
function loop(ts){
  // timer
  if (gameActive){
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs)/1000;
    timeLeft -= dt;
    if (timeLeft <= 0){
      timeLeft = 0;
      endByTimer();
    }
    timerEl.textContent = `${Math.ceil(timeLeft)}s`;
  } else {
    lastTs = ts;
  }

  // Physique Mimi
  if (gameActive){
    const worldX = camX + player.x;
    const overHole = holes.some(h => worldX + player.w*0.5 > h.x && worldX + player.w*0.5 < h.x + h.w);
    const groundY = overHole ? canvas.height + 1000 : baseGroundY;

    player.y += player.vy;
    if(player.y + player.h < groundY){ player.vy += GRAV; player.onGround=false; }
    else { player.vy = 0; player.y = groundY - player.h; player.onGround=true; }

    if (player.y > canvas.height) die(); // mort par chute

    if(moveR) camX += player.speed;
    if(moveL) camX = Math.max(0, camX - player.speed);
  }

  // Nettoyage des entités hors écran (garder la liste légère)
  bones = bones.filter(b => (b.x - camX) > -300);
  holes = holes.filter(h => (h.x + h.w) > camX - 300);
  cats  = cats.filter(c => (c.x - camX) > -400 && c.y <= canvas.height+10);

  // Rendu
  drawBackground();
  drawGround();
  drawMimi();
  drawBones();
  updateAndDrawCats();

  // Tombe affichée quand jeu à l’arrêt (après mort)
  if (!gameActive && lastDeath && tombI.complete){
    const tombW = 48, tombH = 48;
    const sx = lastDeath.x - camX;
    const sy = baseGroundY - tombH;
    ctx.drawImage(tombI, sx - tombW/2, sy, tombW, tombH);
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- Dessins & gameplay ----------
function drawBackground(){
  if(!bg.complete) return;
  const w=bg.width,h=bg.height;
  const scale = Math.max(canvas.height/h, 1);
  const dw = w*scale, dh = h*scale;
  const shift = (camX*0.5) % dw;
  for(let x=-shift; x<canvas.width; x+=dw) ctx.drawImage(bg, x, 0, dw, dh);
}
function drawGround(){
  ctx.fillStyle='#3b2a1d';
  ctx.fillRect(0, baseGroundY, canvas.width, canvas.height-baseGroundY);
  const tw=48, th=20, off=-(camX*0.8)%tw;
  for(let x=off; x<canvas.width; x+=tw){
    ctx.fillStyle='#b8743b'; ctx.fillRect(x, baseGroundY-20, tw-2, th);
    ctx.strokeStyle='#8b5a2b'; ctx.strokeRect(x+0.5, baseGroundY-20.5, tw-3, th-1);
  }
  holes.forEach(h=>{
    const sx = h.x - camX;
    if (sx > canvas.width || sx + h.w < 0) return;
    ctx.clearRect(sx, baseGroundY-24, h.w, canvas.height - (baseGroundY-24));
    ctx.fillStyle = '#2a1d14';
    ctx.fillRect(sx-2, baseGroundY-22, 2, 24);
    ctx.fillRect(sx+h.w, baseGroundY-22, 2, 24);
  });
}
function drawMimi(){
  ctx.drawImage(mimi, player.x, player.y, player.w, player.h);
  ctx.font='16px system-ui,-apple-system'; ctx.fillStyle='#fff'; ctx.textAlign='center';
  ctx.fillText('Mimi', player.x+player.w/2, player.y-10);
}
function drawBones(){
  for(let i=bones.length-1;i>=0;i--){
    const b = bones[i];
    b.x -= (gameActive && moveR?player.speed:0);
    b.x += (gameActive && moveL?player.speed:0);
    const sx = b.x - camX;
    ctx.drawImage(boneI, sx, b.y, b.w, b.h);
    if (gameActive && overlap(player.x,player.y,player.w,player.h, sx,b.y,b.w,b.h)){
      bones.splice(i,1); score++; hud.textContent='Os: '+score;
    }
  }
}
function updateAndDrawCats(){
  for(let i=cats.length-1;i>=0;i--){
    const c = cats[i];
    if (gameActive){
      c.x += c.vx;
      c.x -= (moveR?player.speed:0);
      c.x += (moveL?player.speed:0);

      // gravité / trous
      const cx = c.x + c.w*0.5;
      const overHole = holes.some(h => cx > h.x && cx < h.x + h.w);
      const gY = overHole ? canvas.height + 1000 : baseGroundY;
      if (c.y + c.h < gY){ c.vy += GRAV; c.y += c.vy; } else { c.vy = 0; c.y = gY - c.h; }
    }
    const sx = c.x - camX;
    ctx.drawImage(catI, sx, c.y, c.w, c.h);
    if (gameActive && overlap(player.x,player.y,player.w,player.h, sx,c.y,c.w,c.h)) die();
  }
}

function overlap(ax,ay,aw,ah,bx,by,bw,bh){
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}
