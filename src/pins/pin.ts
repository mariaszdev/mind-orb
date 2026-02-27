import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// ---------------------------------------------------------------------------
// Serialisable Pin data model
// ---------------------------------------------------------------------------

export interface Pin {
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  color: string;
}

export function createPin(
  position: { x: number; y: number; z: number },
  label: string = "",
  color: string = "#f9ffa0",
): Pin {
  return {
    id: crypto.randomUUID(),
    position,
    label,
    color,
  };
}

// ---------------------------------------------------------------------------
// Runtime Note — combines Pin data with live Three.js objects
// ---------------------------------------------------------------------------

export interface Note {
  /** The unit-sphere normal that defines where this note lives. */
  normal: THREE.Vector3;
  text: string;
  object: CSS2DObject;  // HTML label anchored to the sphere
  pin: THREE.Mesh;      // hemisphere head
  pinMat: THREE.MeshStandardMaterial;
  pole: THREE.Mesh;     // thin cylinder
  poleMat: THREE.MeshStandardMaterial;
}

// ---------------------------------------------------------------------------
// Shared geometries (created once, reused by every pin)
// ---------------------------------------------------------------------------

/** Hemisphere — sits on the sphere surface like a thumbtack head. */
export const pinGeo = new THREE.SphereGeometry(
  0.034, // radius
  24,
  12,
  0,
  Math.PI * 2,
  0,
  Math.PI / 2, // half sphere only
);

/** Thin pole between the sphere surface and the note card. */
export const poleGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.1, 8);

/** Cone used for directional arc arrows. */
export const arrowConeGeo = new THREE.ConeGeometry(0.012, 0.028, 6);

/** Canonical up vector for pin quaternion alignment. */
export const PIN_UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// Factory — creates a Note's Three.js objects from a surface position
// ---------------------------------------------------------------------------

export function createNoteMeshes(
  scene: THREE.Scene,
  position: THREE.Vector3,
  text: string,
): Note {
  const normal = position.clone().normalize();

  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xd6c1c1,
    roughness: 0.15,
    metalness: 0,
    transparent: true,
  });
  const pin = new THREE.Mesh(pinGeo, pinMat);
  scene.add(pin);

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xd6c1c1,
    roughness: 0.15,
    metalness: 0,
    transparent: true,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  scene.add(pole);

  const div = document.createElement("div");
  div.className = "note";
  const span = document.createElement("span");
  span.className = "note-text";
  span.textContent = text;
  div.appendChild(span);

  const label = new CSS2DObject(div);
  label.center.set(0.5, 1);
  scene.add(label);

  return { normal, text, object: label, pin, pinMat, pole, poleMat };
}
