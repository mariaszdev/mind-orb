import type * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enableRotate = true;
  return controls;
}
