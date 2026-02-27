import "./style.css";
import * as THREE from "three";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { createScene } from "./core/scene.ts";
import { createControls } from "./core/controls.ts";
import { createSphere } from "./sphere/sphere.ts";
import type { AppContext } from "./context.ts";
import {
  notes,
  addNote,
  enterEditMode,
  getDraggingNote,
  onDragMove,
  onDragEnd,
  updateNoteVisibility,
  hitPin,
  latLonToVec3,
  applyNoteTransform,
  setDeleteArcCallback,
} from "./pins/noteManager.ts";
import {
  initArcMenu,
  showArcMenu,
  hideArcMenu,
  hitArc,
  deleteArcsForNote,
  onArcPointerDown,
  onArcPointerMove,
  onArcPointerUp,
  getDrawingArc,
  updateArcsForDrag,
  updateAllArcs,
} from "./lines/arcManager.ts";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const { scene, camera, renderer, labelRenderer } = createScene();
const controls = createControls(camera, renderer.domElement);
const sphere = createSphere(scene);

export const ctx: AppContext = {
  scene,
  camera,
  renderer,
  labelRenderer,
  sphere,
  controls,
};

// Init arc context menu DOM
initArcMenu(scene);

// Wire arc cleanup into noteManager's delete flow
setDeleteArcCallback((note) => deleteArcsForNote(scene, note));

// ---------------------------------------------------------------------------
// Pointer / raycaster helpers
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let edgeSpin = false;

function updatePointer(e: PointerEvent | MouseEvent): void {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

// ---------------------------------------------------------------------------
// SPACE = orbit mode (hold to rotate without clicking a pin by accident)
// ---------------------------------------------------------------------------

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat) {
    document.body.classList.add("orbit-mode");
    controls.enableRotate = true;
  }
  if (e.key === "Escape") hideArcMenu();
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    document.body.classList.remove("orbit-mode");
  }
});

// ---------------------------------------------------------------------------
// Canvas events
// ---------------------------------------------------------------------------

// Double-click on sphere → add note
renderer.domElement.addEventListener("dblclick", (e) => {
  updatePointer(e);
  if (hitPin(raycaster)) return;
  const hits = raycaster.intersectObject(sphere);
  if (hits.length === 0) return;
  const note = addNote(scene, controls, "", hits[0].point);
  requestAnimationFrame(() => enterEditMode(note, controls));
});

// Right-click → arc context menu
renderer.domElement.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const arc = hitArc(e.clientX, e.clientY, camera, renderer.domElement);
  if (arc) showArcMenu(e.clientX, e.clientY, arc);
  else hideArcMenu();
});

// Pointerdown on pin → start drawing arc
renderer.domElement.addEventListener(
  "pointerdown",
  (e) => {
    updatePointer(e);
    const consumed = onArcPointerDown(
      e,
      scene,
      controls,
      raycaster,
      pointer,
      camera,
      renderer.domElement,
    );
    if (consumed) e.stopImmediatePropagation();
  },
  { capture: true },
);

// Pointermove → drag note OR update arc line
window.addEventListener("pointermove", (e) => {
  updatePointer(e);
  if (getDraggingNote()) {
    onDragMove(sphere, raycaster, (v) => {
      edgeSpin = v;
    });
    return;
  }
  if (getDrawingArc()) {
    onArcPointerMove(sphere, raycaster, e.clientX, e.clientY, (v) => {
      edgeSpin = v;
    });
  }
});

// Pointerup → finish drag or finish arc
window.addEventListener("pointerup", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (getDraggingNote()) {
    edgeSpin = false;
    onDragEnd(controls);
    return;
  }
  if (getDrawingArc()) {
    updatePointer(e);
    edgeSpin = false;
    onArcPointerUp(e, scene, controls, raycaster);
  }
});

// ---------------------------------------------------------------------------
// Edge-spin scratch vectors (reused every frame)
// ---------------------------------------------------------------------------

const _edgeCamRight = new THREE.Vector3();
const _edgeCamUp = new THREE.Vector3();
const _edgeQy = new THREE.Quaternion();
const _edgeQx = new THREE.Quaternion();
const _edgeQ = new THREE.Quaternion();

// ---------------------------------------------------------------------------
// Seed notes
// ---------------------------------------------------------------------------

addNote(scene, controls, "Hello", latLonToVec3(25, -80));
addNote(scene, controls, "World", latLonToVec3(10, -55));

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------

function animate(): void {
  requestAnimationFrame(animate);

  updateNoteVisibility(camera);

  const draggingNote = getDraggingNote();

  // Edge-spin: rotate sphere when dragging a note off the edge
  if (edgeSpin && draggingNote) {
    const SPEED = 0.025;
    _edgeCamRight.setFromMatrixColumn(camera.matrixWorld, 0);
    _edgeCamUp.setFromMatrixColumn(camera.matrixWorld, 1);
    _edgeQy.setFromAxisAngle(_edgeCamUp, pointer.x * SPEED);
    _edgeQx.setFromAxisAngle(_edgeCamRight, pointer.y * SPEED);
    _edgeQ.copy(_edgeQy).multiply(_edgeQx);
    sphere.quaternion.premultiply(_edgeQ);
    for (const note of notes) {
      note.normal.applyQuaternion(_edgeQ);
      applyNoteTransform(note);
    }
    updateArcsForDrag(draggingNote);
  } else if (draggingNote) {
    updateArcsForDrag(draggingNote);
  }

  // Edge-spin while drawing arc
  if (edgeSpin && getDrawingArc()) {
    updateAllArcs(scene, sphere, notes, pointer, camera);
  }

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------------------
// React UI
// ---------------------------------------------------------------------------

createRoot(document.getElementById("ui-root")!).render(createElement(App, null));
