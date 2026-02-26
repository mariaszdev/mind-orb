import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------------------------------------------------------------------------
// Scene + Renderer
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// OrbitControls
// ---------------------------------------------------------------------------

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = true;

// ---------------------------------------------------------------------------
// Geometry, Material, Mesh
// ---------------------------------------------------------------------------

const loader = new THREE.TextureLoader();

const albedoMap = loader.load("/textures/concrete/albedo.jpg");
albedoMap.colorSpace = THREE.SRGBColorSpace;
const normalMap = loader.load("/textures/concrete/normal.jpg");
const ormMap = loader.load("/textures/concrete/orm.jpg");

for (const tex of [albedoMap, normalMap, ormMap]) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
}

const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshStandardMaterial({
  map: albedoMap,
  normalMap: normalMap,
  roughnessMap: ormMap,
  metalnessMap: ormMap,
  aoMap: ormMap,
  roughness: 1.0,
  metalness: 0.0,
});
// const material = new THREE.MeshNormalMaterial({ wireframe: true });

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// ---------------------------------------------------------------------------
// Light
// ---------------------------------------------------------------------------

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
scene.add(hemisphereLight);

const light = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(light);

// ---------------------------------------------------------------------------
// Animation Loop
// ---------------------------------------------------------------------------

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

animate();
