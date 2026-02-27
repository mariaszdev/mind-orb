import "./style.css";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { createScene } from "./core/scene.ts";
import { createControls } from "./core/controls.ts";
import { createSphere } from "./sphere/sphere.ts";
import type { AppContext } from "./context.ts";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const { scene, camera, renderer } = createScene();
const controls = createControls(camera, renderer.domElement);
const sphere = createSphere(scene);

export const ctx: AppContext = { scene, camera, renderer, sphere, controls };

// ---------------------------------------------------------------------------
// Animation Loop
// ---------------------------------------------------------------------------

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------------------
// React UI
// ---------------------------------------------------------------------------

createRoot(document.getElementById("ui-root")!).render(createElement(App, null));
