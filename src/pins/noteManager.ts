import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createNoteMeshes, PIN_UP } from "./pin.ts";
import type { Note } from "./pin.ts";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const notes: Note[] = [];

/** Maps a pin Mesh back to its parent Note for raycasting lookups. */
export const pinToNote = new Map<THREE.Mesh, Note>();

let draggingNote: Note | null = null;
let editingNote: Note | null = null;

/** Set by main.ts after arcManager is initialised to avoid circular imports. */
let _onDeleteArc: (note: Note) => void = () => {};

export function setDeleteArcCallback(fn: (note: Note) => void): void {
  _onDeleteArc = fn;
}

// Shared reusable vectors for the animate loop (avoid per-frame allocations)
const _camNormal = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export function applyNoteTransform(note: Note): void {
  note.pin.position.copy(note.normal);
  note.pin.quaternion.setFromUnitVectors(PIN_UP, note.normal);
  note.object.position.copy(note.normal).multiplyScalar(1.1);
  note.pole.position.copy(note.normal).multiplyScalar(1.05);
  note.pole.quaternion.setFromUnitVectors(PIN_UP, note.normal);
}

export function latLonToVec3(
  lat: number,
  lon: number,
  radius = 1,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// ---------------------------------------------------------------------------
// Add / Delete
// ---------------------------------------------------------------------------

export function addNote(
  scene: THREE.Scene,
  controls: OrbitControls,
  text: string,
  position: THREE.Vector3,
): Note {
  const note = createNoteMeshes(scene, position, text);
  pinToNote.set(note.pin, note);
  applyNoteTransform(note);
  notes.push(note);

  const div = note.object.element as HTMLDivElement;

  // Double-click → edit (desktop)
  div.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    enterEditMode(note, controls);
  });

  // Touch double-tap → edit (mobile)
  let _lastTapTime = 0;
  div.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - _lastTapTime < 350 && !div.classList.contains("note--editing")) {
      e.preventDefault();
      _lastTapTime = 0;
      requestAnimationFrame(() => enterEditMode(note, controls));
    } else {
      _lastTapTime = now;
    }
  });

  // Pointer drag on note card
  div.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (div.classList.contains("note--editing")) return;
    e.stopPropagation();
    div.setPointerCapture(e.pointerId);
    draggingNote = note;
    controls.enableRotate = false;
    div.classList.add("note--dragging");
  });

  // Enter → commit edit
  div.addEventListener("keydown", (e) => {
    if (!div.classList.contains("note--editing")) return;
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (div.querySelector(".note-text") as HTMLElement).blur();
    }
  });

  // Focus lost → commit
  div.addEventListener("focusout", () => {
    if (div.classList.contains("note--editing")) exitEditMode(scene, controls);
  });

  return note;
}

export function deleteNote(
  scene: THREE.Scene,
  controls: OrbitControls,
  note: Note,
  onDeleteArc: (note: Note) => void,
): void {
  if (editingNote === note) editingNote = null;
  if (draggingNote === note) {
    draggingNote = null;
    note.object.element.classList.remove("note--dragging");
  }

  scene.remove(note.pin);
  note.pinMat.dispose();
  scene.remove(note.pole);
  note.poleMat.dispose();
  scene.remove(note.object);
  pinToNote.delete(note.pin);

  // Delegate arc cleanup to arcManager
  onDeleteArc(note);

  const idx = notes.indexOf(note);
  if (idx !== -1) notes.splice(idx, 1);
  controls.enableRotate = true;
}

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

export function enterEditMode(note: Note, controls: OrbitControls): void {
  if (editingNote) exitEditMode(null, controls);
  editingNote = note;
  const div = note.object.element as HTMLDivElement;
  const span = div.querySelector(".note-text") as HTMLElement;
  div.classList.add("note--editing");
  span.contentEditable = "true";
  span.focus();
  const range = document.createRange();
  range.selectNodeContents(span);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  controls.enableRotate = false;
}

export function exitEditMode(
  scene: THREE.Scene | null,
  controls: OrbitControls,
): void {
  if (!editingNote) return;
  const note = editingNote;
  editingNote = null;
  const div = note.object.element as HTMLDivElement;
  const span = div.querySelector(".note-text") as HTMLElement;
  const newText = span.innerText.replace(/\n$/, "");
  span.contentEditable = "false";
  div.classList.remove("note--editing");
  if (newText.trim() === "" && scene) {
    // Empty note → auto-delete
    deleteNote(scene, controls, note, _onDeleteArc);
  } else {
    note.text = newText;
    span.textContent = newText;
    controls.enableRotate = true;
  }
}

// ---------------------------------------------------------------------------
// Picking helpers
// ---------------------------------------------------------------------------

export function hitPin(
  raycaster: THREE.Raycaster,
): Note | undefined {
  const hits = raycaster.intersectObjects([...pinToNote.keys()]);
  return hits.length > 0 ? pinToNote.get(hits[0].object as THREE.Mesh) : undefined;
}

export function hitNoteDiv(clientX: number, clientY: number): Note | undefined {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return undefined;
  const noteEl = el.closest(".note");
  if (!noteEl) return undefined;
  return notes.find((n) => n.object.element === noteEl);
}

export function hitPinAtScreen(
  clientX: number,
  clientY: number,
  radiusPx: number,
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
): Note | undefined {
  const rect = domElement.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const _p = new THREE.Vector3();
  let best: Note | null = null;
  let bestDist = radiusPx * radiusPx;
  for (const [pin, note] of pinToNote) {
    _p.copy(pin.position).project(camera);
    if (_p.z > 1) continue;
    const sx = (_p.x + 1) * 0.5 * rect.width;
    const sy = (-_p.y + 1) * 0.5 * rect.height;
    const d2 = (sx - cx) ** 2 + (sy - cy) ** 2;
    if (d2 < bestDist) {
      bestDist = d2;
      best = note;
    }
  }
  return best ?? undefined;
}

// ---------------------------------------------------------------------------
// Dragging (called from pointermove / pointerup in main.ts)
// ---------------------------------------------------------------------------

export function getDraggingNote(): Note | null {
  return draggingNote;
}

export function onDragMove(
  sphere: THREE.Mesh,
  raycaster: THREE.Raycaster,
  setEdgeSpin: (v: boolean) => void,
): void {
  if (!draggingNote) return;
  const hits = raycaster.intersectObject(sphere);
  if (hits.length > 0) {
    setEdgeSpin(false);
    draggingNote.normal.copy(hits[0].point).normalize();
    applyNoteTransform(draggingNote);
  } else {
    setEdgeSpin(true);
  }
}

export function onDragEnd(controls: OrbitControls): void {
  if (!draggingNote) return;
  draggingNote.object.element.classList.remove("note--dragging");
  draggingNote = null;
  controls.enableRotate = true;
}

// ---------------------------------------------------------------------------
// Animate — back-face opacity fade (call every frame)
// ---------------------------------------------------------------------------

export function updateNoteVisibility(camera: THREE.PerspectiveCamera): void {
  _camNormal.copy(camera.position).normalize();
  for (const note of notes) {
    const dot = note.normal.dot(_camNormal);
    const opacity = Math.max(0, Math.min(1, dot * 6));
    const el = note.object.element as HTMLElement;
    el.style.opacity = String(opacity);
    el.style.pointerEvents = opacity > 0.1 ? "auto" : "none";
    note.pinMat.opacity = opacity;
    note.poleMat.opacity = opacity;
  }
}
