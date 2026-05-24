import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, vehicle;

const videoElement = document.querySelector('.input_video');
const statusText = document.getElementById('status');
const gestureText = document.getElementById('gesture');

//-------------------------------------------------
// ESTADO
//-------------------------------------------------

let rotationVelocity = 0;
let exploded = false;
let returningToOrigin = false;

let zoomLevel = 0;
let zoomInActive = false;
let zoomOutActive = false;

let lastIndexX = null;

//-------------------------------------------------
// DESPIECE
//-------------------------------------------------

let parts = [];
let originalPositions = [];
let explodedPositions = [];

//-------------------------------------------------
// INIT
//-------------------------------------------------

function initThree() {

  scene = new THREE.Scene();
  
  // CORRECCIÓN: Se elimina el fondo sólido para permitir transparencia sobre la cámara
  // scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(0, 1.2, 3.2);

  // CORRECCIÓN: Se añade alpha: true para que el fondo del render sea transparente
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.getElementById('canvas-container')
    .appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.8));

  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(5, 5, 5);
  scene.add(light);

  controls = new OrbitControls(camera, renderer.domElement);

  window.addEventListener('resize', onResize);

  loadModel();
}

//-------------------------------------------------
// MODELO
//-------------------------------------------------

function loadModel() {

  const loader = new GLTFLoader();

  // NOTA: Asegúrate de mantener el archivo con este nombre exacto en el mismo directorio
  loader.load('buggy despiezado.glb', (gltf) => {

    vehicle = gltf.scene;
    scene.add(vehicle);

    const box = new THREE.Box3().setFromObject(vehicle);
    const center = new THREE.Vector3();
    box.getCenter(center);
    vehicle.position.sub(center);

    parts = [];
    originalPositions = [];
    explodedPositions = [];

    vehicle.traverse((child) => {

      if (!child.isMesh) return;

      parts.push(child);

      const basePos = child.position.clone();
      originalPositions.push(basePos);

      const name = child.name.toLowerCase();
      const explodedPos = basePos.clone();

      let lift = 0;

      if (name.includes("lidar")) lift = 0.15;
      if (name.includes("cristal_arriba")) lift = 0.1;
      if (name.includes("sensores_delanteros")) lift = 0.1;
      if (name.includes("parte_abajo_coche")) lift = -0.1;

      if (name.includes("paragolpes_trasero")) explodedPos.x += 0.15;
      if (name.includes("paragolpes_delantero")) explodedPos.x += -0.15;

      if (name.includes("faros_trasero")) explodedPos.x += 0.15;
      if (name.includes("faros_delanteros")) explodedPos.x += -0.15;

      if (name.includes("luces_freno_traseras")) explodedPos.x += 0.15;
      if (name.includes("luces_freno_delanteras")) explodedPos.x += -0.15;

      if (name.includes("cristal_trasero")) explodedPos.x += 0.15;
      if (name.includes("cristal_delantero")) explodedPos.x += -0.15;

      if (name.includes("puerta_trasera_izda")) {
        explodedPos.z += 0.15;
        explodedPos.x += -0.08;
      }

      if (name.includes("puerta_delantera_izda")) {
        explodedPos.z += 0.15;
        explodedPos.x += 0.08;
      }

      if (name.includes("rueda_trasera_izda")) explodedPos.z += 0.15;
      if (name.includes("rueda_delantera_izda")) explodedPos.z += 0.15;

      if (name.includes("cristal_asientos_traseros_dcha")) explodedPos.z += 0.15;
      if (name.includes("cristal_piloto_dcha")) explodedPos.z += 0.15;
      if (name.includes("cristal_copiloto_dcha")) explodedPos.z += -0.15;
      if (name.includes("cristal_asientos_traseros_izda")) explodedPos.z += -0.15;

      if (name.includes("rueda_trasera_dcha")) explodedPos.z += -0.15;
      if (name.includes("rueda_delantera_dcha")) explodedPos.z += -0.15;

      if (name.includes("puerta_trasera_dcha")) {
        explodedPos.z += -0.15;
        explodedPos.x += 0.08;
      }

      if (name.includes("puerta_delantera_dcha")) {
        explodedPos.z += -0.15;
        explodedPos.x += -0.08;
      }

      explodedPos.y += lift;

      explodedPositions.push(explodedPos);
    });

    statusText.innerText = `modelo cargado (${parts.length} piezas)`;
  });
}

//-------------------------------------------------
// 🔥 DESPIECE MÁS FLUIDO
//-------------------------------------------------

function updateExplode(active) {

  const baseLerp = active ? 0.045 : 0.06;

  parts.forEach((p, i) => {

    const target = active
      ? explodedPositions[i]
      : originalPositions[i];

    const jitter = 0.002;

    const lerpFactor = baseLerp + (Math.sin(i) * jitter);

    p.position.lerp(target, lerpFactor);
  });
}

//-------------------------------------------------

function updateReturn() {

  let done = true;

  parts.forEach((p, i) => {

    p.position.lerp(originalPositions[i], 0.055);

    if (p.position.distanceTo(originalPositions[i]) > 0.01) {
      done = false;
    }
  });

  if (done) {
    returningToOrigin = false;
    exploded = false;
  }
}

//-------------------------------------------------

function onResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

//-------------------------------------------------

function animate() {

  requestAnimationFrame(animate);

  if (vehicle) {

    vehicle.rotation.y += rotationVelocity;

    if (zoomInActive) zoomLevel += 0.03;
    if (zoomOutActive) zoomLevel -= 0.03;

    zoomLevel = THREE.MathUtils.clamp(zoomLevel, 0, 2.5);
    camera.position.z = 3.2 - zoomLevel;

    if (returningToOrigin) updateReturn();
    else updateExplode(exploded);
  }

  controls.update();
  renderer.render(scene, camera);
}

//-------------------------------------------------
// MEDIA PIPE
//-------------------------------------------------

const hands = new window.Hands({
  locateFile: (f) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults((results) => {

  const data = results.multiHandLandmarks || [];

  if (!data.length) {
    rotationVelocity *= 0.9;
    zoomInActive = false;
    zoomOutActive = false;
    gestureText.innerText = "esperando mano...";
    lastIndexX = null;
    return;
  }

  const hand = data[0];

  const wrist = hand[0];
  const thumb = hand[4];
  const index = hand[8];

  const indexUp = hand[8].y < hand[6].y;
  const middleUp = hand[12].y < hand[10].y;
  const ringUp = hand[16].y < hand[14].y;
  const pinkyUp = hand[20].y < hand[18].y;

  const twoFingers =
    indexUp && middleUp && !ringUp && !pinkyUp;

  if (twoFingers) {
    exploded = true;
    returningToOrigin = false;
    gestureText.innerText = "✌️ DESPIECE";
  } else {
    returningToOrigin = true;
    gestureText.innerText = "✋ CONTROL";
  }

  const dx = lastIndexX !== null ? index.x - lastIndexX : 0;
  lastIndexX = index.x;

  const swipeThreshold = 0.02;

  if (exploded) {

    if (dx > swipeThreshold) rotationVelocity = 0.045;
    else if (dx < -swipeThreshold) rotationVelocity = -0.045;
    else rotationVelocity *= 0.92;

  } else {
    rotationVelocity = (index.x - wrist.x) * 0.08;
  }

  const pinch = Math.hypot(
    thumb.x - index.x,
    thumb.y - index.y
  );

  zoomInActive = pinch < 0.045;

  zoomOutActive =
    indexUp && !middleUp && !ringUp && !pinkyUp;
});

//-------------------------------------------------

async function startCamera() {

  try {

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true
    });

    videoElement.srcObject = stream;
    await videoElement.play();

    const cameraMP = new window.Camera(videoElement, {

      onFrame: async () => {
        await hands.send({ image: videoElement });
      },

      width: 640,
      height: 480
    });

    cameraMP.start();

  } catch (err) {
    console.error("❌ cámara error:", err);
  }
}

//-------------------------------------------------

initThree();
animate();
startCamera();