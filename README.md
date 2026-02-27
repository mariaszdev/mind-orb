# Mind Orb

**Live demo:** [mind-orb.vercel.app](https://mind-orb.vercel.app)

An interactive 3D sphere built with Three.js and TypeScript. Place pins with notes anywhere on the surface, connect them with arcs, and build a spatial mind map on a textured orb.

## Features

### Current

- Textured 3D sphere with PBR materials (albedo, normal, roughness/ORM maps)
- Orbit controls — rotate and zoom with mouse/touch
- **Pins** — double-click anywhere on the sphere to place a pin with a text note
- **Edit notes** — click a pin to edit its label in-place
- **Drag pins** — drag pins to reposition them across the surface; edge-spin rotates the sphere when dragging near the boundary
- **Arc connections** — drag from one pin to another to draw a curved arc with an arrowhead; right-click an arc for a context menu to delete it
- **Back-face fading** — pins and labels fade out when they rotate to the back of the sphere
- **Orbit mode** — hold `Space` to rotate the sphere freely without accidentally clicking pins

### Planned

- **Export / Import** — save your orb state (pins, arcs, notes) to a Markdown `.md` file and reload it later
- **Obsidian plugin** — embed the orb directly inside an Obsidian vault as an interactive view

## Controls

| Action        | Input                               |
| ------------- | ----------------------------------- |
| Rotate sphere | Hold `Space` + drag                 |
| Place pin     | Double-click on sphere              |
| Edit pin      | Click pin label                     |
| Drag pin      | Click-hold pin, drag                |
| Draw arc      | Click-hold pin, drag to another pin |
| Delete arc    | Right-click arc → context menu      |
| Cancel menu   | `Escape`                            |

## Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Rendering  | [Three.js](https://threejs.org/) v0.183 |
| Language   | TypeScript 5.9 (strict mode)            |
| Bundler    | [Vite](https://vitejs.dev/) v7          |
| UI overlay | React 19                                |
| Styling    | CSS (vanilla)                           |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs at `http://localhost:5173` by default.

## Project Structure

```
📦 mind-orb
┣ 📂 public/
┃ ┗ 📂 textures/
┃   ┣ 📂 concrete/    # albedo, normal, ORM maps
┃   ┗ 📂 earth/       # daymap, normal, specular maps
┣ 📂 src/
┃ ┣ 📂 core/
┃ ┃ ┣ controls.ts     # OrbitControls factory
┃ ┃ ┗ scene.ts        # Scene, camera, renderer, lights, resize handler
┃ ┣ 📂 sphere/
┃ ┃ ┗ sphere.ts       # Sphere geometry, PBR material, texture loading
┃ ┣ 📂 pins/
┃ ┃ ┣ pin.ts          # Pin data model + mesh factory
┃ ┃ ┗ noteManager.ts  # CRUD, click-to-place, drag logic, back-face fade
┃ ┣ 📂 lines/
┃ ┃ ┗ arcManager.ts   # Arc connections: draw, render, context menu, delete
┃ ┣ App.tsx           # React root (UI overlay)
┃ ┣ context.ts        # AppContext interface — shared across all modules
┃ ┣ main.ts           # Entry point — wires everything, runs animation loop
┃ ┗ style.css
┣ index.html
```

## License

Private project — all rights reserved.
