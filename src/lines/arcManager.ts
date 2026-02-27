import * as THREE from "three";
import { CatmullRomCurve3 } from "three";
import { TubeGeometry } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { arrowConeGeo, PIN_UP } from "../pins/pin.ts";
import type { Note } from "../pins/pin.ts";
import { hitPin, hitNoteDiv, hitPinAtScreen, applyNoteTransform } from "../pins/noteManager.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArcConnection {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  from: Note;
  to: Note;
  arrowTo: THREE.Mesh | null;
  arrowFrom: THREE.Mesh | null;
}

interface DrawingArc {
  sourceNote: Note;
  line: THREE.Line;
  lineMat: THREE.LineBasicMaterial;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const arcConnections: ArcConnection[] = [];
let drawingArc: DrawingArc | null = null;
let edgeSpin = false;
const lastArcTarget = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const ARC_SEGMENTS = 64;

function makeArcGeo(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array((ARC_SEGMENTS + 1) * 3), 3),
  );
  return geo;
}

function updateArc(
  geo: THREE.BufferGeometry,
  a: THREE.Vector3,
  b: THREE.Vector3,
): void {
  const pos = geo.attributes["position"] as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    p.lerpVectors(a, b, i / ARC_SEGMENTS).normalize().multiplyScalar(1.005);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
}

function makeArcTube(a: THREE.Vector3, b: THREE.Vector3): TubeGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    points.push(
      new THREE.Vector3()
        .lerpVectors(a, b, i / ARC_SEGMENTS)
        .normalize()
        .multiplyScalar(1.005),
    );
  }
  return new TubeGeometry(
    new CatmullRomCurve3(points),
    ARC_SEGMENTS,
    0.004,
    6,
    false,
  );
}

// ---------------------------------------------------------------------------
// Arrow helpers
// ---------------------------------------------------------------------------

function tangentAtEnd(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3()
    .copy(to)
    .multiplyScalar(from.dot(to))
    .sub(from)
    .normalize();
}

function repositionArcArrows(arc: ArcConnection): void {
  if (arc.arrowTo) {
    arc.arrowTo.position.copy(arc.to.normal).multiplyScalar(1.005);
    arc.arrowTo.quaternion.setFromUnitVectors(
      PIN_UP,
      tangentAtEnd(arc.from.normal, arc.to.normal),
    );
  }
  if (arc.arrowFrom) {
    arc.arrowFrom.position.copy(arc.from.normal).multiplyScalar(1.005);
    arc.arrowFrom.quaternion.setFromUnitVectors(
      PIN_UP,
      tangentAtEnd(arc.to.normal, arc.from.normal),
    );
  }
}

export function setArcArrows(
  scene: THREE.Scene,
  arc: ArcConnection,
  showTo: boolean,
  showFrom: boolean,
): void {
  if (showTo && !arc.arrowTo) {
    arc.arrowTo = new THREE.Mesh(
      arrowConeGeo,
      new THREE.MeshBasicMaterial({ color: 0xebab2b }),
    );
    arc.arrowTo.frustumCulled = false;
    scene.add(arc.arrowTo);
  } else if (!showTo && arc.arrowTo) {
    scene.remove(arc.arrowTo);
    (arc.arrowTo.material as THREE.Material).dispose();
    arc.arrowTo = null;
  }

  if (showFrom && !arc.arrowFrom) {
    arc.arrowFrom = new THREE.Mesh(
      arrowConeGeo,
      new THREE.MeshBasicMaterial({ color: 0xebab2b }),
    );
    arc.arrowFrom.frustumCulled = false;
    scene.add(arc.arrowFrom);
  } else if (!showFrom && arc.arrowFrom) {
    scene.remove(arc.arrowFrom);
    (arc.arrowFrom.material as THREE.Material).dispose();
    arc.arrowFrom = null;
  }

  repositionArcArrows(arc);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export function deleteArcConnection(
  scene: THREE.Scene,
  arc: ArcConnection,
): void {
  setArcArrows(scene, arc, false, false);
  scene.remove(arc.mesh);
  arc.mesh.geometry.dispose();
  arc.mat.dispose();
  const idx = arcConnections.indexOf(arc);
  if (idx !== -1) arcConnections.splice(idx, 1);
}

/** Called by noteManager when a note is deleted — removes all connected arcs. */
export function deleteArcsForNote(scene: THREE.Scene, note: Note): void {
  for (let i = arcConnections.length - 1; i >= 0; i--) {
    if (arcConnections[i].from === note || arcConnections[i].to === note) {
      deleteArcConnection(scene, arcConnections[i]);
    }
  }
  // Cancel an in-progress draw if source note is deleted
  if (drawingArc?.sourceNote === note) {
    scene.remove(drawingArc.line);
    drawingArc.line.geometry.dispose();
    drawingArc.lineMat.dispose();
    drawingArc = null;
    edgeSpin = false;
  }
}

// ---------------------------------------------------------------------------
// Screen-space arc hit test (for context menu)
// ---------------------------------------------------------------------------

export function hitArc(
  clientX: number,
  clientY: number,
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
): ArcConnection | null {
  const rect = domElement.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  const w = rect.width;
  const h = rect.height;
  const THRESHOLD_SQ = 8 * 8;
  const _p = new THREE.Vector3();
  for (const arc of arcConnections) {
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      _p
        .lerpVectors(arc.from.normal, arc.to.normal, i / ARC_SEGMENTS)
        .normalize()
        .multiplyScalar(1.005)
        .project(camera);
      if (_p.z > 1) continue;
      const sx = (_p.x + 1) * 0.5 * w;
      const sy = (-_p.y + 1) * 0.5 * h;
      if ((sx - mx) ** 2 + (sy - my) ** 2 < THRESHOLD_SQ) return arc;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Arc context menu
// ---------------------------------------------------------------------------

let arcMenuEl: HTMLDivElement | null = null;
let menuArc: ArcConnection | null = null;
let _menuScene: THREE.Scene | null = null;

export function initArcMenu(scene: THREE.Scene): void {
  _menuScene = scene;
  arcMenuEl = document.createElement("div");
  arcMenuEl.id = "arc-menu";
  document.body.appendChild(arcMenuEl);

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (menuArc && arcMenuEl && !arcMenuEl.contains(e.target as Node))
        hideArcMenu();
    },
    true,
  );
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideArcMenu();
  });
}

function buildArcMenu(arc: ArcConnection): void {
  if (!arcMenuEl || !_menuScene) return;
  arcMenuEl.innerHTML = "";

  const btn = (label: string, action: () => void, cls?: string): void => {
    const el = document.createElement("button");
    el.textContent = label;
    if (cls) el.className = cls;
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    el.addEventListener("click", action);
    arcMenuEl!.appendChild(el);
  };

  const sep = (): void => {
    const el = document.createElement("div");
    el.className = "arc-menu-sep";
    arcMenuEl!.appendChild(el);
  };

  const t = !!arc.arrowTo;
  const f = !!arc.arrowFrom;
  btn((t && f ? "✓ " : "") + "Arrows ↔", () => {
    setArcArrows(_menuScene!, arc, true, true);
    buildArcMenu(arc);
  });
  btn((!t && !f ? "✓ " : "") + "No arrows", () => {
    setArcArrows(_menuScene!, arc, false, false);
    buildArcMenu(arc);
  });
  btn((t && !f ? "✓ " : "") + "Arrow →", () => {
    setArcArrows(_menuScene!, arc, true, false);
    buildArcMenu(arc);
  });
  btn((!t && f ? "✓ " : "") + "Arrow ←", () => {
    setArcArrows(_menuScene!, arc, false, true);
    buildArcMenu(arc);
  });
  sep();
  btn(
    "Delete line",
    () => {
      deleteArcConnection(_menuScene!, arc);
      hideArcMenu();
    },
    "arc-menu-danger",
  );
}

export function showArcMenu(
  x: number,
  y: number,
  arc: ArcConnection,
): void {
  if (!arcMenuEl) return;
  menuArc = arc;
  buildArcMenu(arc);
  arcMenuEl.style.left = "-9999px";
  arcMenuEl.style.display = "block";
  const r = arcMenuEl.getBoundingClientRect();
  arcMenuEl.style.left = Math.min(x, window.innerWidth - r.width - 4) + "px";
  arcMenuEl.style.top = Math.min(y, window.innerHeight - r.height - 4) + "px";
}

export function hideArcMenu(): void {
  if (arcMenuEl) arcMenuEl.style.display = "none";
  menuArc = null;
}

// ---------------------------------------------------------------------------
// Pointer events (called from main.ts)
// ---------------------------------------------------------------------------

export function onArcPointerDown(
  e: PointerEvent,
  scene: THREE.Scene,
  controls: OrbitControls,
  raycaster: THREE.Raycaster,
  _pointer: THREE.Vector2,
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
): boolean {
  if (e.button !== 0 && e.pointerType === "mouse") return false;
  const sourceNote =
    e.pointerType === "mouse"
      ? hitPin(raycaster)
      : hitPinAtScreen(e.clientX, e.clientY, 30, camera, domElement);
  if (!sourceNote) return false;

  domElement.setPointerCapture(e.pointerId);
  const arcMat = new THREE.LineBasicMaterial({
    color: 0xebab2b,
    transparent: true,
    opacity: 0.4,
  });
  const arcGeo = makeArcGeo();
  updateArc(arcGeo, sourceNote.normal, sourceNote.normal);
  const arcLine = new THREE.Line(arcGeo, arcMat);
  arcLine.frustumCulled = false;
  scene.add(arcLine);
  drawingArc = { sourceNote, line: arcLine, lineMat: arcMat };
  lastArcTarget.copy(sourceNote.normal);
  edgeSpin = false;
  controls.enableRotate = false;
  sourceNote.object.element.classList.add("note--arc-source");
  return true;
}

export function onArcPointerMove(
  sphere: THREE.Mesh,
  raycaster: THREE.Raycaster,
  clientX: number,
  clientY: number,
  setEdgeSpin: (v: boolean) => void,
): void {
  if (!drawingArc) return;
  const targetNote = hitPin(raycaster) || hitNoteDiv(clientX, clientY);
  if (targetNote && targetNote !== drawingArc.sourceNote) {
    edgeSpin = false;
    setEdgeSpin(false);
    lastArcTarget.copy(targetNote.normal);
    updateArc(drawingArc.line.geometry, drawingArc.sourceNote.normal, targetNote.normal);
    drawingArc.lineMat.opacity = 1;
  } else {
    const hits = raycaster.intersectObject(sphere);
    if (hits.length > 0) {
      edgeSpin = false;
      setEdgeSpin(false);
      const target = hits[0].point.clone().normalize();
      lastArcTarget.copy(target);
      updateArc(drawingArc.line.geometry, drawingArc.sourceNote.normal, target);
      drawingArc.lineMat.opacity = 0.4;
    } else {
      edgeSpin = true;
      setEdgeSpin(true);
    }
  }
}

export function onArcPointerUp(
  e: PointerEvent,
  scene: THREE.Scene,
  controls: OrbitControls,
  raycaster: THREE.Raycaster,
): void {
  if (!drawingArc) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  drawingArc.sourceNote.object.element.classList.remove("note--arc-source");
  const targetNote = hitPin(raycaster) || hitNoteDiv(e.clientX, e.clientY);

  if (targetNote && targetNote !== drawingArc.sourceNote) {
    scene.remove(drawingArc.line);
    drawingArc.line.geometry.dispose();
    drawingArc.lineMat.dispose();
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xebab2b });
    const tubeMesh = new THREE.Mesh(
      makeArcTube(drawingArc.sourceNote.normal, targetNote.normal),
      tubeMat,
    );
    tubeMesh.frustumCulled = false;
    scene.add(tubeMesh);
    arcConnections.push({
      mesh: tubeMesh,
      mat: tubeMat,
      from: drawingArc.sourceNote,
      to: targetNote,
      arrowTo: null,
      arrowFrom: null,
    });
  } else {
    scene.remove(drawingArc.line);
    drawingArc.line.geometry.dispose();
    drawingArc.lineMat.dispose();
  }

  edgeSpin = false;
  drawingArc = null;
  controls.enableRotate = true;
}

export function getDrawingArc(): DrawingArc | null {
  return drawingArc;
}

export function getArcEdgeSpin(): boolean {
  return edgeSpin;
}

export function getLastArcTarget(): THREE.Vector3 {
  return lastArcTarget;
}

// ---------------------------------------------------------------------------
// Animate — edge-spin for arc drawing + arc transform updates
// ---------------------------------------------------------------------------

export function updateArcsForDrag(draggingNote: Note): void {
  for (const arc of arcConnections) {
    if (arc.from === draggingNote || arc.to === draggingNote) {
      arc.mesh.geometry.dispose();
      arc.mesh.geometry = makeArcTube(arc.from.normal, arc.to.normal);
      repositionArcArrows(arc);
    }
  }
}

export function rebuildAllArcs(): void {
  for (const arc of arcConnections) {
    arc.mesh.geometry.dispose();
    arc.mesh.geometry = makeArcTube(arc.from.normal, arc.to.normal);
    repositionArcArrows(arc);
  }
}

export function updateAllArcs(
  _scene: THREE.Scene,
  sphere: THREE.Mesh,
  notes: Note[],
  pointer: THREE.Vector2,
  camera: THREE.PerspectiveCamera,
): void {
  if (!drawingArc) return;
  const SPEED = 0.02;
  const _right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const _up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const qy = new THREE.Quaternion().setFromAxisAngle(_up, -pointer.x * SPEED);
  const qx = new THREE.Quaternion().setFromAxisAngle(_right, pointer.y * SPEED);
  const q = new THREE.Quaternion().copy(qy).multiply(qx);
  sphere.quaternion.premultiply(q);
  for (const note of notes) {
    note.normal.applyQuaternion(q);
    applyNoteTransform(note);
  }
  for (const arc of arcConnections) {
    arc.mesh.geometry.dispose();
    arc.mesh.geometry = makeArcTube(arc.from.normal, arc.to.normal);
    repositionArcArrows(arc);
  }
  lastArcTarget.applyQuaternion(q);
  updateArc(drawingArc.line.geometry, drawingArc.sourceNote.normal, lastArcTarget);
}
