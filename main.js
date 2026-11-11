const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const startButton = document.getElementById('startButton');
const messageBox = document.getElementById('messageBox');
const healthLabel = document.getElementById('healthLabel');
const timerLabel = document.getElementById('timerLabel');
const beaconLabel = document.getElementById('beaconLabel');

const world = {
  width: 1600,
  height: 600,
  groundY: 550,
  station: { x: 1460, y: 430, w: 120, h: 120 },
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const time = {
  last: 0,
  elapsed: 0,
  timer: 90,
  gameOver: false,
  won: false,
  phase: 'intro',
  giantPauseTimer: 0,
};

const player = {
  x: 120,
  y: world.groundY - 24,
  radius: 18,
  speed: 140,
  health: 3,
  beacons: 0,
  invulnerable: 0,
};

const giantess = {
  x: 700,
  y: 110,
  width: 460,
  height: 520,
  feetY: 450,
  speed: 85,
  targetX: 700,
  direction: 1,
  stuck: 0,
  nearPlayer: false,
  stepTime: 0,
  pauseTimer: 0,
  phase: 'patrol',
  footFlash: 0,
};

const beacons = [
  { x: 320, y: 200, collected: false },
  { x: 700, y: 240, collected: false },
  { x: 1180, y: 195, collected: false },
];

let cameraX = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setMessage(text) {
  messageBox.textContent = text;
}

function startGame() {
  resetTouchButtons();
  overlay.classList.remove('visible');
  time.phase = 'playing';
  time.timer = 90;
  time.gameOver = false;
  time.won = false;
  time.elapsed = 0;
  player.x = 120;
  player.y = world.groundY - 24;
  cameraX = 0;
  player.health = 3;
  player.beacons = 0;
  player.invulnerable = 0;
  giantess.x = 700;
  giantess.targetX = 700;
  giantess.direction = 1;
  giantess.phase = 'patrol';
  giantess.pauseTimer = 0;
  giantess.footFlash = 0;
  giantess.nearPlayer = false;
  beacons.forEach((b) => { b.collected = false; });
  updateHud();
  setMessage('Collect three rooftop beacons and reach the station exit while the giantess patrols the streets.');
}

function updateHud() {
  healthLabel.textContent = String(player.health);
  timerLabel.textContent = String(Math.max(0, Math.ceil(time.timer)));
  beaconLabel.textContent = `${player.beacons} / ${beacons.length}`;
}

function setOverlay(title, text, buttonText = 'Play Again') {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonText;
  overlay.classList.add('visible');
}

function endGame(win = false) {
  time.gameOver = true;
  time.won = win;
  if (win) {
    setOverlay('You Escaped!', 'The station platform is yours. The giantess is left behind in the city lights.', 'Play Again');
    setMessage('Victory! You reached the station with all beacons secured. Press Space to play again.');
  } else {
    setOverlay('Caught!', 'The giantess closed in before you could escape. Try the route again from the alley.', 'Retry');
    setMessage('Run over. Press Space or Retry to make another escape attempt.');
  }
}

function resetTouchButtons() {
  Object.keys(input).forEach((key) => { input[key] = false; });
}

function handleKeyState(code, isDown) {
  const mapping = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
  };
  const key = mapping[code];
  if (key) input[key] = isDown;
}

window.addEventListener('keydown', (event) => {
  handleKeyState(event.code, true);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === 'Space' && time.phase !== 'playing') {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  handleKeyState(event.code, false);
});

window.addEventListener('blur', resetTouchButtons);

startButton.addEventListener('click', () => {
  startGame();
});

const touchButtons = document.querySelectorAll('.move-btn');
touchButtons.forEach((button) => {
  const key = button.dataset.key;
  const press = (down) => {
    input[key] = down;
    button.style.opacity = down ? '1' : '0.8';
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    press(true);
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointerup', () => press(false));
  button.addEventListener('pointerleave', () => press(false));
  button.addEventListener('pointercancel', () => press(false));
  button.addEventListener('lostpointercapture', () => press(false));
});

function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    const nextX = player.x + dx * player.speed * dt;
    const nextY = player.y + dy * player.speed * dt;
    player.x = clamp(nextX, 50, world.width - 50);
    player.y = clamp(nextY, 70, world.groundY);
  }

  if (player.invulnerable > 0) {
    player.invulnerable = Math.max(0, player.invulnerable - dt);
  }

  cameraX = clamp(player.x - canvas.width * 0.46, 0, world.width - canvas.width);
}

function updateGiantess(dt) {
  const playerNear = Math.abs(player.x - giantess.x) < 260;
  giantess.nearPlayer = playerNear;

  if (giantess.phase === 'patrol') {
    giantess.x += giantess.direction * giantess.speed * dt;
    if (giantess.x < 330 || giantess.x > 1180) {
      giantess.direction *= -1;
      giantess.x = clamp(giantess.x, 330, 1180);
    }

    if (Math.random() < 0.009) {
      giantess.phase = 'pause';
      giantess.pauseTimer = 1.9 + Math.random() * 1.8;
      giantess.footFlash = 0.6;
      setMessage('The giantess slows to a stop, giving you a brief window to move.');
    }
  }

  if (giantess.phase === 'pause') {
    giantess.pauseTimer -= dt;
    giantess.footFlash = Math.max(0, giantess.footFlash - dt * 1.3);
    if (giantess.pauseTimer <= 0) {
      giantess.phase = 'patrol';
      giantess.direction *= -1;
      setMessage('The giantess resumes her walk through the city block.');
    }
  }

  giantess.stepTime += dt;
  if (giantess.stepTime > 0.7) {
    giantess.stepTime = 0;
  }
}

function collectBeacons() {
  beacons.forEach((beacon) => {
    if (beacon.collected) return;
    const dx = player.x - beacon.x;
    const dy = player.y - beacon.y;
    if (Math.hypot(dx, dy) < 28) {
      beacon.collected = true;
      player.beacons += 1;
      updateHud();
      setMessage(player.beacons === beacons.length
        ? 'All beacons secured! Reach the METRO station at the far end of the street.'
        : 'Beacon secured. Keep moving toward the next rooftop beacon.');
    }
  });
}

function checkPlayerDamage() {
  const distanceX = Math.abs(player.x - giantess.x);
  const distanceY = Math.abs(player.y - 280);
  const danger = distanceX < 110 && distanceY < 150;

  if (danger && player.invulnerable <= 0) {
    player.health -= 1;
    player.invulnerable = 1.5;
    updateHud();
    setMessage('The giantess stomped near you! Keep moving.');
  }

  if (player.health <= 0 && !time.gameOver) {
    endGame(false);
  }
}

function checkStationExit() {
  const nearExit = player.x > world.station.x - 20 && player.y > world.station.y;
  if (nearExit && player.beacons >= beacons.length && !time.gameOver) {
    endGame(true);
  }
}

function update(dt) {
  if (time.phase !== 'playing' || time.gameOver) return;

  time.elapsed += dt;
  time.timer -= dt;
  if (time.timer <= 0) {
    time.timer = 0;
    endGame(false);
  }

  updatePlayer(dt);
  updateGiantess(dt);
  collectBeacons();
  checkPlayerDamage();
  checkStationExit();
  updateHud();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#75b9ed');
  sky.addColorStop(0.34, '#e1e9e9');
  sky.addColorStop(0.35, '#7cbb78');
  sky.addColorStop(1, '#183a32');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, world.width, canvas.height);

  ctx.fillStyle = '#24323a';
  ctx.fillRect(0, 380, world.width, 220);

  for (let i = 0; i < 9; i++) {
    const x = 28 + i * 190;
    const height = 120 + ((i * 47) % 95);
    const top = 380 - height;
    ctx.fillStyle = i % 2 ? '#324b56' : '#263e49';
    ctx.fillRect(x, top, 150, height);
    ctx.fillStyle = '#45636a';
    ctx.fillRect(x, top, 150, 8);
    for (let row = 0; row < Math.floor(height / 35); row++) {
      for (let col = 0; col < 3; col++) {
        ctx.fillStyle = (row + col + i) % 4 === 0 ? '#f6d487' : '#89b6b5';
        ctx.fillRect(x + 14 + col * 43, top + 20 + row * 32, 22, 14);
      }
    }
    ctx.fillStyle = '#192b34';
    ctx.fillRect(x + 65, 340, 24, 40);
  }

  ctx.fillStyle = '#315654';
  ctx.fillRect(0, world.groundY, world.width, canvas.height - world.groundY);
  ctx.fillStyle = '#3f5055';
  ctx.fillRect(0, 506, world.width, 93);
  ctx.fillStyle = '#d1b877';
  for (let stripe = 0; stripe < world.width; stripe += 180) {
    ctx.fillRect(stripe + 28, 549, 75, 5);
  }
  ctx.fillStyle = '#60776c';
  ctx.fillRect(0, 500, world.width, 6);

  // Street furniture and small parked cars make the scale of the pedestrian clear.
  for (let i = 0; i < 8; i++) {
    const x = 105 + i * 205;
    ctx.fillStyle = '#303d49';
    ctx.fillRect(x, 464, 7, 42);
    ctx.fillStyle = '#f6cf75';
    ctx.beginPath();
    ctx.arc(x + 3, 464, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = ['#d5775e', '#4e9ab4', '#d5b75f'][i % 3];
    ctx.fillRect(x + 42, 523, 52, 20);
    ctx.fillRect(x + 50, 516, 34, 12);
    ctx.fillStyle = '#202a30';
    ctx.beginPath();
    ctx.arc(x + 52, 544, 6, 0, Math.PI * 2);
    ctx.arc(x + 84, 544, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#d7b574';
  ctx.fillRect(world.station.x, world.station.y, world.station.w, 120);
  ctx.fillStyle = '#405b60';
  ctx.fillRect(world.station.x + 10, world.station.y + 15, 100, 8);
  ctx.fillStyle = '#f2dfa1';
  ctx.fillRect(world.station.x + 18, world.station.y + 32, 84, 46);
  ctx.fillStyle = '#456b73';
  ctx.fillRect(world.station.x + 35, world.station.y + 88, 50, 32);
  ctx.fillStyle = '#fff0bd';
  ctx.font = 'bold 15px Segoe UI';
  ctx.fillText('METRO', world.station.x + 36, world.station.y + 27);
}

function drawBeacons() {
  beacons.forEach((beacon) => {
    if (beacon.collected) return;
    const pulse = 0.5 + Math.sin(performance.now() * 0.006 + beacon.x) * 0.35;
    ctx.save();
    ctx.translate(beacon.x, beacon.y);
    ctx.fillStyle = `rgba(255, 216, 108, ${0.8 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }
  ctx.fillStyle = '#f6d0a8';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1d2231';
  ctx.fillRect(-6, 0, 12, 22);
  ctx.fillStyle = '#8ed0ff';
  ctx.fillRect(-9, 7, 18, 8);
  ctx.fillStyle = '#f9f0de';
  ctx.fillRect(-9, 20, 5, 10);
  ctx.fillRect(4, 20, 5, 10);
  ctx.restore();
}

function drawGiantess() {
  const bodyY = giantess.y + 345;
  const stride = giantess.phase === 'pause' ? 0 : Math.sin(performance.now() * 0.005) * 8;
  const skin = '#f1b58f';
  const shadowSkin = '#ce876d';

  ctx.save();
  ctx.translate(giantess.x, bodyY);
  ctx.lineJoin = 'round';

  // Arms frame a tailored coat-dress.
  ctx.strokeStyle = shadowSkin;
  ctx.lineWidth = 35;
  ctx.beginPath();
  ctx.moveTo(-94, -285);
  ctx.quadraticCurveTo(-139, -210, -139, -112);
  ctx.moveTo(94, -285);
  ctx.quadraticCurveTo(139, -210, 139, -112);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 25;
  ctx.beginPath();
  ctx.moveTo(-94, -287);
  ctx.quadraticCurveTo(-128, -208, -128, -118);
  ctx.moveTo(94, -287);
  ctx.quadraticCurveTo(128, -208, 128, -118);
  ctx.stroke();

  ctx.fillStyle = '#a54668';
  ctx.beginPath();
  ctx.moveTo(-77, -300);
  ctx.quadraticCurveTo(-120, -255, -119, -181);
  ctx.lineTo(-105, -112);
  ctx.quadraticCurveTo(0, -83, 105, -112);
  ctx.lineTo(119, -181);
  ctx.quadraticCurveTo(120, -255, 77, -300);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d2687c';
  ctx.beginPath();
  ctx.moveTo(-16, -294);
  ctx.lineTo(-8, -91);
  ctx.lineTo(34, -95);
  ctx.lineTo(23, -294);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f3d09a';
  ctx.fillRect(-5, -263, 10, 9);
  ctx.fillRect(-4, -216, 9, 9);
  ctx.fillRect(-3, -169, 8, 9);

  // Face, neck, and flowing dark hair.
  ctx.fillStyle = shadowSkin;
  ctx.fillRect(-25, -333, 50, 43);
  ctx.fillStyle = skin;
  ctx.fillRect(-20, -330, 40, 40);
  ctx.fillStyle = '#39263b';
  ctx.beginPath();
  ctx.moveTo(-58, -382);
  ctx.quadraticCurveTo(-71, -442, -28, -449);
  ctx.quadraticCurveTo(31, -458, 59, -419);
  ctx.quadraticCurveTo(76, -389, 58, -333);
  ctx.lineTo(39, -319);
  ctx.lineTo(-45, -319);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd2ae';
  ctx.beginPath();
  ctx.ellipse(0, -386, 39, 51, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#39263b';
  ctx.beginPath();
  ctx.moveTo(-40, -402);
  ctx.quadraticCurveTo(-5, -428, 40, -403);
  ctx.lineTo(31, -387);
  ctx.quadraticCurveTo(0, -403, -36, -382);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4d3448';
  ctx.fillRect(-57, -395, 16, 77);
  ctx.fillRect(41, -395, 16, 77);
  ctx.fillStyle = '#45303a';
  ctx.fillRect(-20, -382, 6, 6);
  ctx.fillRect(13, -382, 6, 6);
  ctx.strokeStyle = '#a7565c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, -355);
  ctx.quadraticCurveTo(0, -350, 8, -355);
  ctx.stroke();

  // Long legs and small flats meet the street plane.
  ctx.fillStyle = shadowSkin;
  ctx.fillRect(-72, -117, 51, 103 + stride);
  ctx.fillRect(21, -117, 51, 103 - stride);
  ctx.fillStyle = skin;
  ctx.fillRect(-66, -112, 40, 98 + stride);
  ctx.fillRect(26, -112, 40, 98 - stride);
  ctx.fillStyle = '#ead3bc';
  ctx.beginPath();
  ctx.ellipse(-45, -8 + stride, 34, 11, 0, 0, Math.PI * 2);
  ctx.ellipse(48, -8 - stride, 34, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c49a82';
  ctx.fillRect(-73, -3 + stride, 53, 5);
  ctx.fillRect(22, -3 - stride, 53, 5);

  if (giantess.phase === 'pause') {
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(-145, -455, 290, 460);
  }
  ctx.restore();
}

function drawMiniMapHint() {
  const mapWidth = 110;
  const mapLeft = canvas.width - 140;
  const stationX = world.station.x / world.width * mapWidth;
  const playerX = player.x / world.width * mapWidth;
  const giantX = giantess.x / world.width * mapWidth;

  ctx.fillStyle = 'rgba(10, 16, 28, 0.7)';
  ctx.fillRect(canvas.width - 150, 18, 132, 36);

  ctx.fillStyle = '#85ddff';
  ctx.fillRect(mapLeft + stationX, 28, 6, 14);
  ctx.fillStyle = '#f8d977';
  ctx.fillRect(mapLeft + playerX, 28, 5, 14);
  ctx.fillStyle = '#ff8c82';
  ctx.fillRect(mapLeft + giantX, 28, 6, 14);
}

function draw() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  drawBackground();
  drawBeacons();
  drawPlayer();
  drawGiantess();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Segoe UI';
  ctx.fillText('Station', world.station.x + 16, world.station.y - 14);
  ctx.restore();

  drawMiniMapHint();

  if (time.phase !== 'playing') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0.016);
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

setOverlay('Start the Run', 'Explore the city as a tiny pedestrian. The giantess walks the streets in slow loops, pauses for a close-up, and stomps anything in reach.', 'Begin');
updateHud();
requestAnimationFrame(gameLoop);
