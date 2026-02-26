import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------------------------------------------------------------------------
// Scene + Renderer
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  100,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.z = 1.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
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
// Geometry & Material
// ---------------------------------------------------------------------------

const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  roughness: 0,
  flatShading: false,
});
// const material = new THREE.MeshNormalMaterial({ wireframe: true });

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// ---------------------------------------------------------------------------
// Light
// ---------------------------------------------------------------------------

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
scene.add(hemisphereLight);

const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);

// ---------------------------------------------------------------------------
// Animation Loop
// ---------------------------------------------------------------------------

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

animate();
