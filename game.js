import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const canvas = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d99a86');
scene.fog = new THREE.FogExp2('#bd8d83', 0.0044);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.17;

const hemi = new THREE.HemisphereLight('#fff0d4', '#525c65', 2.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe3c3', 3.1);
sun.position.set(-42, 66, 34);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -78; sun.shadow.camera.right = 78;
sun.shadow.camera.top = 78; sun.shadow.camera.bottom = -78;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.025;
scene.add(sun);

const mats = {
  grass: new THREE.MeshStandardMaterial({ color: '#728b78', roughness: 1 }),
  asphalt: new THREE.MeshStandardMaterial({ color: '#50585d', roughness: 0.96 }),
  curb: new THREE.MeshStandardMaterial({ color: '#c4b8a4', roughness: 1 }),
  line: new THREE.MeshStandardMaterial({ color: '#e9d8a8', roughness: 1 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: '#b8aa96', roughness: 1 }),
  skin: new THREE.MeshStandardMaterial({ color: '#d99b76', roughness: .88 }),
  skinLight: new THREE.MeshStandardMaterial({ color: '#edb18a', roughness: .83 }),
  hair: new THREE.MeshStandardMaterial({ color: '#4b2d2c', roughness: .93 }),
  top: new THREE.MeshStandardMaterial({ color: '#328b83', roughness: .8 }),
  skirt: new THREE.MeshStandardMaterial({ color: '#dc795d', roughness: .82 }),
  trim: new THREE.MeshStandardMaterial({ color: '#f5c18d', roughness: .7 }),
  white: new THREE.MeshStandardMaterial({ color: '#fff1dc', roughness: .5 }),
  eye: new THREE.MeshStandardMaterial({ color: '#39292c', roughness: .45 }),
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 14, 10);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
const capsuleGeo = new THREE.CapsuleGeometry(.42, 1.7, 4, 8);
const cityObjects = [];
const particles = [];
const rings = [];

function mesh(geometry, material, parent, x=0, y=0, z=0, sx=1, sy=1, sz=1) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x,y,z); m.scale.set(sx,sy,sz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function block(parent, material, x,y,z,sx,sy,sz) { return mesh(boxGeo, material, parent,x,y,z,sx,sy,sz); }
function makeMat(color, rough=.88, metal=0) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }); }
function rng(seed) { let a=seed>>>0; return () => { a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
const rand = rng(719031);
function pick(list) { return list[Math.floor(rand()*list.length)]; }

// A quiet patchwork of tiny blocks, broad streets, crosswalks, and miniature street furniture.
mesh(new THREE.PlaneGeometry(132,132), mats.grass, scene,0,-.17,0).rotation.x=-Math.PI/2;
for(let lane=-54;lane<=54;lane+=18){
  block(scene,mats.asphalt,lane,.005,0,6.6,.12,120);
  block(scene,mats.asphalt,0,.006,lane,120,.12,6.6);
  block(scene,mats.curb,lane-3.55,.055,0,.22,.15,120);
  block(scene,mats.curb,lane+3.55,.055,0,.22,.15,120);
  block(scene,mats.curb,0,.055,lane-3.55,120,.15,.22);
  block(scene,mats.curb,0,.055,lane+3.55,120,.15,.22);
}
const dashMat = makeMat('#e3d4a9',.95);
for(let row=-54;row<=54;row+=18){
  for(let p=-52;p<=52;p+=7.5){
    block(scene,dashMat,p,.082,row,3.0,.026,.13);
    block(scene,dashMat,row,.083,p,.13,.026,3.0);
  }
  for(let k=-2;k<=2;k++){
    block(scene,mats.white,row+k*.46,.088,row-4.1,.24,.025,1.8);
    block(scene,mats.white,row-4.1,.089,row+k*.46,1.8,.025,.24);
  }
}

const facades=['#d9bda0','#c8c0aa','#9facab','#d5a39a','#c9ad91','#aeb9a8','#d9c8ac','#b2a1a0','#d3b88f'];
const windowMats=['#84a2a3','#96b6b4','#789597','#d3bd9e','#8dabb0'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.48,metalness:.08,emissive:c,emissiveIntensity:.07}));
const roofMats=['#858782','#9a8d7a','#6f7978','#aa907c'].map(c=>makeMat(c));
function createBuilding(x,z){
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  const w=3.1+rand()*2.2, d=3.0+rand()*2.2, h=5+rand()*10.5;
  const facade=makeMat(pick(facades),.92);
  block(g,facade,0,h/2,0,w,h,d);
  const cols=Math.max(2,Math.floor(w/1.05)), floors=Math.max(2,Math.floor(h/1.9));
  const wx=Math.min(.48,(w*.68)/cols), wy=Math.min(.55,(h*.64)/floors);
  for(let floor=0;floor<floors;floor++){
    const yy=1.05+floor*(h-1.6)/floors;
    for(let col=0;col<cols;col++){
      const xx=(col-(cols-1)/2)*(w*.75/cols);
      const wm=pick(windowMats);
      block(g,wm,xx,yy,-d/2-.012,wx,wy,.035);
      if(rand()>.15) block(g,wm,xx,yy,d/2+.012,wx,wy,.035);
    }
  }
  const sideCols=Math.max(2,Math.floor(d/1.35));
  for(let floor=0;floor<floors;floor++) for(let col=0;col<sideCols;col++){
    const yy=1.05+floor*(h-1.6)/floors;
    const zz=(col-(sideCols-1)/2)*(d*.72/sideCols);
    block(g,pick(windowMats),w/2+.012,yy,zz,.035,.43,.48);
  }
  block(g,pick(roofMats),0,h+.14,0,w+.18,.3,d+.18);
  if(rand()>.42){
    const roofBox=block(g,facade,(rand()-.5)*w*.36,h+.55,(rand()-.5)*d*.3,.9,.55,.8);
    if(rand()>.5) mesh(cylinderGeo,roofMats[0],g,roofBox.position.x,h+.98,roofBox.position.z,.48,.35,.48);
  }
  if(rand()>.75) mesh(cylinderGeo,makeMat('#6e7471',.78,.18),g,w*.27,h+.72,d*.24,.045,.9,.045);
  cityObjects.push({group:g,kind:'building',x,z,alive:true,points:150,fall:0,baseH:h});
}
function createCar(x,z,yaw){
  const g=new THREE.Group(); g.position.set(x,.12,z); g.rotation.y=yaw; scene.add(g);
  const color=pick(['#c96955','#e3b75b','#57878c','#d6d1bc','#748aa0','#bd8a68','#e2e0d1','#7f9272']);
  const bodyMat=makeMat(color,.53,.08), glass=makeMat('#47626a',.28,.13), tire=makeMat('#302f30',.98), hub=makeMat('#b9b8ad',.48,.3);
  block(g,bodyMat,0,.46,0,1.05,.48,2.0);
  block(g,bodyMat,0,.76,-.07,.83,.43,1.03);
  block(g,glass,0,.79,-.08,.85,.29,.82);
  block(g,makeMat('#eee0bd',.4),0,.41,-1.015,.4,.12,.028);
  for(const side of [-1,1]) for(const zz of [-.65,.66]){
    const wheel=mesh(cylinderGeo,tire,g,side*.54,.28,zz,.23,.17,.23); wheel.rotation.z=Math.PI/2;
    const center=mesh(cylinderGeo,hub,g,side*.64,.28,zz,.11,.08,.11); center.rotation.z=Math.PI/2;
  }
  const light=makeMat('#ffe6ae',.3,.05);
  block(g,light,-.32,.48,-1.025,.18,.13,.035); block(g,light,.32,.48,-1.025,.18,.13,.035);
  cityObjects.push({group:g,kind:'car',x,z,alive:true,points:45,fall:0,baseH:.12});
}
function createTree(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const bark=makeMat('#826652'),leaves=makeMat(pick(['#627f68','#72896c','#88906d','#668075']));
  mesh(cylinderGeo,bark,g,0,.72,0,.24,1.45,.24);
  mesh(sphereGeo,leaves,g,0,1.95,0,.95,1.05,.9);
  mesh(sphereGeo,leaves,g,-.48,1.65,.14,.63,.74,.62);
  mesh(sphereGeo,leaves,g,.48,1.69,-.12,.62,.7,.62);
}
function createLamp(x,z,yaw=0){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;scene.add(g);
  const metal=makeMat('#535c5c',.66,.25),bulb=new THREE.MeshStandardMaterial({color:'#fff1ca',emissive:'#ffdc9c',emissiveIntensity:.75});
  mesh(cylinderGeo,metal,g,0,1.75,0,.09,3.5,.09);
  mesh(cylinderGeo,metal,g,.35,3.35,-.3,.065,.75,.065).rotation.z=Math.PI/2.8;
  mesh(sphereGeo,bulb,g,.53,3.03,-.3,.22,.17,.22);
}
const centers=[];
for(let i=-45;i<=45;i+=18) centers.push(i);
for(const x of centers) for(const z of centers){
  const count=1+(rand()>.25?1:0)+(rand()>.79?1:0);
  for(let n=0;n<count;n++){
    const ox=(n%2===0?-1:1)*(2.2+rand()*2.1)+(rand()-.5)*1.1;
    const oz=(n<2?(rand()-.5)*4.3:(rand()>.5?1:-1)*3.0);
    createBuilding(x+ox,z+oz);
  }
  if(rand()>.37) createTree(x+(rand()>.5?1:-1)*5.35,z+(rand()>.5?1:-1)*5.35);
  else createLamp(x+(rand()>.5?1:-1)*4.9,z+(rand()>.5?1:-1)*4.9,rand()*Math.PI);
}
const roads=[-54,-36,-18,0,18,36,54];
for(let n=0;n<37;n++){
  const lane=pick(roads);
  if(rand()>.5){
    const z=lane+(rand()>.5?1:-1)*2.05;
    createCar(-51+rand()*102,z,rand()>.5?0:Math.PI);
  }else{
    const x=lane+(rand()>.5?1:-1)*2.05;
    createCar(x,-51+rand()*102,Math.PI/2+(rand()>.5?0:Math.PI));
  }
}

// A stylized full-size visitor, built from soft primitive forms rather than a flat icon.
const visitor=new THREE.Group(); scene.add(visitor); visitor.position.set(0,0,0);
const woman=new THREE.Group(); visitor.add(woman);
const skirtGeo=new THREE.CylinderGeometry(.76,1.22,1.25,18,1);
const blouseGeo=new THREE.CapsuleGeometry(.96,1.35,5,12);
mesh(blouseGeo,mats.top,woman,0,8.35,0,1.04,1.14,.72);
mesh(cylinderGeo,mats.skin,woman,0,7.23,0,.49,.5,.43);
mesh(skirtGeo,mats.skirt,woman,0,6.45,0);
// An understated bright waistband, necklace, and soft neckline.
mesh(cylinderGeo,mats.trim,woman,0,7.08,0,.67,.12,.57);
mesh(sphereGeo,mats.trim,woman,0,9.32,-.01,.22,.11,.08);
const head=mesh(sphereGeo,mats.skinLight,woman,0,11.02,-.04,.88,1.06,.78);
mesh(sphereGeo,mats.skin,woman,0,10.32,-.015,.26,.38,.28);
// Dark chestnut hair with a rounded crown, loose back, and long flowing locks.
mesh(sphereGeo,mats.hair,woman,0,11.48,.21,.92,.78,.8);
mesh(sphereGeo,mats.hair,woman,0,10.76,.55,.88,1.02,.52);
for(const side of [-1,1]){
  const lock=mesh(capsuleGeo,mats.hair,woman,side*.73,10.52,.23,.47,1.05,.48);
  lock.rotation.z=side*-.12;
  mesh(sphereGeo,mats.skinLight,woman,side*.29,11.14,-.738,.13,.09,.045);
  mesh(sphereGeo,mats.eye,woman,side*.29,11.15,-.78,.057,.07,.045);
  mesh(sphereGeo,mats.trim,woman,side*.94,10.83,-.02,.11,.14,.08);
}
mesh(cylinderGeo,mats.skin,woman,0,10.91,-.79,.075,.2,.08);
mesh(boxGeo,makeMat('#9f5650',.75),woman,0,10.69,-.79,.23,.035,.035);
const arms=[], upperLegs=[], lowerLegs=[], footRigs=[];
for(const side of [-1,1]){
  // Sleeves and swinging arms.
  const arm=new THREE.Group(); arm.position.set(side*1.04,9.12,0); woman.add(arm); arms.push(arm);
  const sleeve=mesh(capsuleGeo,mats.top,arm,side*.24,-.26,0,.57,.53,.54); sleeve.rotation.z=-side*.2;
  const upper=mesh(capsuleGeo,mats.skinLight,arm,side*.34,-1.03,-.015,.48,.88,.48); upper.rotation.z=-side*.13;
  const hand=mesh(sphereGeo,mats.skinLight,arm,side*.39,-2.05,-.03,.3,.38,.3);
  for(let f=0;f<4;f++) mesh(sphereGeo,mats.skinLight,arm,side*.39+(f-1.5)*.11,-2.3,-.03,.075,.2,.075);
  // Individual thigh, calf, ankle, and uncovered toes: her bare feet are part of the silhouette.
  const leg=new THREE.Group(); leg.position.set(side*.55,6.13,0); woman.add(leg); upperLegs.push(leg);
  mesh(capsuleGeo,mats.skin,leg,0,-1.43,0,.78,1.08,.76);
  const knee=new THREE.Group(); knee.position.y=-2.95; leg.add(knee); lowerLegs.push(knee);
  mesh(capsuleGeo,mats.skinLight,knee,0,-1.33,0,.69,1.02,.68);
  const foot=new THREE.Group(); foot.position.set(0,-2.9,-.04); knee.add(foot); footRigs.push(foot);
  mesh(sphereGeo,mats.skinLight,foot,0,-.04,-.48,.43,.22,.84);
  for(let toe=0;toe<5;toe++){
    const toeX=(toe-2)*.15, toeScale=toe===2?.18:.145;
    mesh(sphereGeo,mats.skinLight,foot,toeX,-.04,-1.08+Math.abs(toe-2)*.09,.105,toeScale,.17);
  }
}

// Soft elevated follow-camera, toy-scale focus, and subtle scene movement.
const cameraOffset=new THREE.Vector3(25,29,30);
camera.position.set(31,35,38); camera.lookAt(0,5,0);
const targetLook=new THREE.Vector3();
const clock=new THREE.Clock();
const held=new Set();
const touchDirs=new Set();
let running=false, remaining=90, roundEnd=0, score=0, demolished=0, stompTime=-1, impactDone=false, lastCombo=0, combo=0;
let shake=0, soundOn=false, audioCtx=null, toastTimer=0, comboTimer=0, elapsed=0;
const goal=14;
const scoreNode=document.querySelector('#score'), timerNode=document.querySelector('#timer');
const objectiveNode=document.querySelector('#objective'), progressNode=document.querySelector('#score-progress');
const toastNode=document.querySelector('#toast'), comboNode=document.querySelector('#combo');
const statusNode=document.querySelector('#status-label');

function showToast(message){toastNode.textContent=message;toastNode.classList.add('show');toastTimer=1.55;}
function playTone(freq=150,duration=.16,type='sine',gain=.04){
  if(!soundOn)return;
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume();
    const oscillator=audioCtx.createOscillator(), volume=audioCtx.createGain();
    oscillator.type=type; oscillator.frequency.setValueAtTime(freq,audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(38,freq*.48),audioCtx.currentTime+duration);
    volume.gain.setValueAtTime(gain,audioCtx.currentTime); volume.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
    oscillator.connect(volume);volume.connect(audioCtx.destination);oscillator.start();oscillator.stop(audioCtx.currentTime+duration);
  }catch(_){/* Audio is an optional flourish; gameplay never depends on it. */}
}
function addImpactRing(x,z){
  const material=new THREE.MeshBasicMaterial({color:'#f9d1a1',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
  const ring=mesh(new THREE.RingGeometry(.78,.97,44),material,scene,x,.14,z,1,1,1);ring.rotation.x=-Math.PI/2;
  rings.push({mesh:ring,life:0.72,max:.72});
}
function burst(x,z,count=15,color='#d4b28e'){
  const material=makeMat(color,.91);
  for(let i=0;i<count;i++){
    const size=.13+rand()*.32, p=mesh(boxGeo,material,scene,x+(rand()-.5)*2,.35+rand()*1.5,z+(rand()-.5)*2,size,size*(.7+rand()),size);
    p.rotation.set(rand()*3,rand()*3,rand()*3);
    particles.push({mesh:p,vx:(rand()-.5)*8,vy:2+rand()*7,vz:(rand()-.5)*8,life:.65+rand()*.55,spin:(rand()-.5)*8});
  }
}
function applyStomp(){
  impactDone=true; addImpactRing(visitor.position.x,visitor.position.z); shake=.5;
  let hits=0,points=0;
  for(const item of cityObjects){
    if(!item.alive)continue;
    const dx=item.x-visitor.position.x,dz=item.z-visitor.position.z;
    const distance=Math.hypot(dx,dz);
    const radius=item.kind==='building'?7.8:6.7;
    if(distance<radius){
      item.alive=false;item.fall=0;hits++;points+=item.points;
      if(item.kind==='car') item.group.rotation.z=(rand()-.5)*.16;
      burst(item.x,item.z,item.kind==='building'?12:7,item.kind==='building'?'#d8c0a3':'#d99c71');
    }
  }
  if(hits){
    const now=elapsed;
    combo=now-lastCombo<4?combo+1:1;lastCombo=now;
    const bonus=combo>1?Math.min((combo-1)*25,125):0;
    score+=points+bonus;demolished+=hits;
    scoreNode.textContent=String(score).padStart(4,'0');
    progressNode.style.width=`${Math.min(100,demolished/goal*100)}%`;
    objectiveNode.textContent=demolished>=goal?`${demolished} city details discovered & toppled`:`${demolished} / ${goal} city details toppled`;
    const message=hits===1?'A tiny landmark bites the dust':`${hits} tiny ${hits===1?'target':'targets'} crumpled`;
    showToast(message);
    if(combo>1){comboNode.textContent=`${combo}× STOMP STREAK`;comboNode.classList.add('show');comboTimer=1.15;}
    playTone(104+Math.min(hits*7,90),.35,'triangle',.065);
  }else{
    combo=0;showToast('A big step for a little city');playTone(90,.22,'sine',.04);
  }
}
function triggerStomp(){
  if(!running||stompTime>=0)return;
  stompTime=0;impactDone=false;playTone(205,.12,'triangle',.035);
}
function resetGame(){
  for(const item of cityObjects){item.alive=true;item.fall=0;item.group.scale.y=1;item.group.position.y=item.kind==='car'?.12:0;item.group.rotation.z=0;}
  for(const p of particles)scene.remove(p.mesh);particles.length=0;
  for(const r of rings){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();}rings.length=0;
  visitor.position.set(0,0,0);woman.position.set(0,0,0);woman.rotation.set(0,0,0);
  remaining=90;score=0;demolished=0;stompTime=-1;combo=0;lastCombo=-10;elapsed=0;shake=0;
  running=true;roundEnd=performance.now()+90000;scoreNode.textContent='0000';timerNode.textContent='01:30';progressNode.style.width='0%';
  objectiveNode.textContent=`0 / ${goal} city details toppled`;statusNode.textContent='CITY PLAYGROUND';
  document.querySelector('#welcome').classList.add('hidden');document.querySelector('#end-screen').classList.add('hidden');
  showToast('Take a look around, giant neighbor');
}
function endGame(){
  running=false;statusNode.textContent='STROLL COMPLETE';
  document.querySelector('#final-score').innerHTML=`${String(score).padStart(4,'0')} <small>PTS</small>`;
  document.querySelector('#end-copy').textContent=demolished?`You toppled ${demolished} tiny city details. The little city won't forget your visit.`:'The little city is ready whenever you are.';
  document.querySelector('#end-screen').classList.remove('hidden');
}

// Keyboard and touch use the same normalized movement path, with no pointer lock required.
const keyMap={w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right'};
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(keyMap[k]){held.add(keyMap[k]);e.preventDefault();}
  if(k===' '||k==='spacebar'){e.preventDefault();if(!e.repeat)triggerStomp();}
});
window.addEventListener('keyup',e=>{const dir=keyMap[e.key.toLowerCase()];if(dir)held.delete(dir);});
window.addEventListener('blur',()=>{held.clear();touchDirs.clear();});
for(const button of document.querySelectorAll('[data-dir]')){
  const dir=button.dataset.dir;
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touchDirs.add(dir);});
  const release=()=>touchDirs.delete(dir);
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
document.querySelector('#stomp-button').addEventListener('pointerdown',e=>{e.preventDefault();triggerStomp();});
document.querySelector('#game').addEventListener('pointerdown',e=>{if(running&&e.pointerType==='mouse')triggerStomp();});
document.querySelector('#start-button').addEventListener('click',resetGame);
document.querySelector('#again-button').addEventListener('click',resetGame);
document.querySelector('#sound-button').addEventListener('click',()=>{
  soundOn=!soundOn;document.querySelector('#sound-icon').textContent=soundOn?'♫':'♪';
  document.querySelector('#sound-button').classList.toggle('sound-on',soundOn);
  if(soundOn)playTone(440,.1,'sine',.025);
});

function update(dt){
  elapsed+=dt;
  if(running){
    remaining=Math.max(0,(roundEnd-performance.now())/1000);
    if(remaining<=0){timerNode.textContent='00:00';endGame();}
    else {
      const seconds=Math.ceil(remaining);
      timerNode.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    }
    const directions=new Set([...held,...touchDirs]);
    let dx=(directions.has('right')?1:0)-(directions.has('left')?1:0);
    let dz=(directions.has('down')?1:0)-(directions.has('up')?1:0);
    const moving=dx!==0||dz!==0;
    if(moving){
      const length=Math.hypot(dx,dz);dx/=length;dz/=length;
      visitor.position.x=THREE.MathUtils.clamp(visitor.position.x+dx*10.4*dt,-59,59);
      visitor.position.z=THREE.MathUtils.clamp(visitor.position.z+dz*10.4*dt,-59,59);
      woman.rotation.y=Math.atan2(-dx,-dz);
    }
    if(stompTime>=0){
      stompTime+=dt;
      const lift=stompTime<.28?Math.sin((stompTime/.28)*Math.PI/2)*1.75:Math.max(0,1.75*(1-(stompTime-.28)/.18));
      upperLegs[1].position.y=6.13+lift;
      woman.position.y=stompTime<.28?stompTime*1.9:Math.max(0,.52-(stompTime-.28)*2.8);
      if(stompTime>=.46&&!impactDone)applyStomp();
      if(stompTime>.76){stompTime=-1;upperLegs[1].position.y=6.13;woman.position.y=0;}
    }else{
      const phase=elapsed*(moving?8.2:1.9);
      const swing=moving?Math.sin(phase)*.32:Math.sin(phase)*.018;
      upperLegs[0].rotation.x=swing;upperLegs[1].rotation.x=-swing;
      lowerLegs[0].rotation.x=Math.max(0,-swing)*.72;lowerLegs[1].rotation.x=Math.max(0,swing)*.72;
      arms[0].rotation.x=-swing*.78;arms[1].rotation.x=swing*.78;
      woman.position.y=moving?Math.abs(Math.sin(phase*2))*.11:0;
    }
  }else if(stompTime>=0){stompTime=-1;}

  for(const item of cityObjects){
    if(item.alive)continue;
    item.fall=Math.min(1,item.fall+dt*1.65);
    const eased=1-Math.pow(1-item.fall,3);
    const squash=item.kind==='building'?.09:.14;
    item.group.scale.y=1-(1-squash)*eased;
  }
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.life-=dt;p.vy-=15*dt;
    p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;
    p.mesh.rotation.x+=p.spin*dt;p.mesh.rotation.y+=p.spin*.7*dt;
    if(p.mesh.position.y<.08){p.mesh.position.y=.08;p.vy=Math.abs(p.vy)*.24;p.vx*=.78;p.vz*=.78;}
    if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1);}
  }
  for(let i=rings.length-1;i>=0;i--){
    const r=rings[i];r.life-=dt;
    const t=1-r.life/r.max;r.mesh.scale.setScalar(1+t*10);r.mesh.material.opacity=Math.max(0,(1-t)*.8);
    if(r.life<=0){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();rings.splice(i,1);}
  }
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toastNode.classList.remove('show');}
  if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)comboNode.classList.remove('show');}
  shake=Math.max(0,shake-dt*1.6);
  const desired=new THREE.Vector3(visitor.position.x+cameraOffset.x,visitor.position.y+cameraOffset.y,visitor.position.z+cameraOffset.z);
  const alpha=1-Math.exp(-dt*2.7);
  camera.position.lerp(desired,alpha);
  targetLook.set(visitor.position.x,4.2+woman.position.y*.5,visitor.position.z);
  if(shake>0){camera.position.x+=(rand()-.5)*shake;camera.position.y+=(rand()-.5)*shake;}
  camera.lookAt(targetLook);
}
function render(){
  requestAnimationFrame(render);
  const dt=Math.min(clock.getDelta(),.04);
  update(dt);
  renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(innerWidth,innerHeight);
});
render();
