import type * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface AppContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sphere: THREE.Mesh;
  controls: OrbitControls;
}
