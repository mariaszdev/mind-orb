# Mind Orb

An interactive 3D sphere built with Three.js and TypeScript. Place pins with notes anywhere on the surface, connect them with lines, and build a spatial mind map on a textured orb.

## Features

### Current

- Textured 3D sphere
- Orbit controls — rotate and zoom with mouse/touch
- PBR materials (albedo, normal, roughness/ORM maps)

### Planned

- **Pins** — click anywhere on the sphere to place a pin with a text note
- **Edit notes** — update pin text in-place
- **Drag pins** — reposition pins by dragging across the surface
- **Connection lines** — draw lines between pins to show relationships
- **Export / Import** — save and load the full state as a JSON file
- **Texture switcher** — swap sphere textures at runtime
- **Pin styles** — customise pin shape, size, and colour
- **Note styles** — customise label typography and background
- **Line styles** — customise line colour, thickness, and curve
- **MongoDB backend** — persist data server-side _(future)_
- **User accounts** — multi-user support with auth _(future)_

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Rendering | [Three.js](https://threejs.org/) v0.183 |
| Language  | TypeScript 5.9 (strict mode)            |
| Bundler   | [Vite](https://vitejs.dev/) v7          |
| Styling   | CSS (vanilla)                           |

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
 📦mind-orb
 ┣ 📂public/
 ┃ ┗ 📂textures/
 ┃ ┃ ┗ 📂concrete/    # albedo, normal, ORM maps
 ┣ 📂src/
 ┃ ┣ 📂core/
 ┃ ┃ ┣ controls.ts  # OrbitControls factory
 ┃ ┃ ┗ scene.ts     # Scene, camera, renderer, lights, resize handler
 ┃ ┣ 📂sphere
 ┃ ┃ ┗ sphere.ts    # Sphere geometry, material, texture loading
 ┃ ┣ App.tsx
 ┃ ┣ context.ts     # AppContext interface — shared type for all future managers
 ┃ ┣ main.ts        # Wires everything together, exports ctx, runs animate loop, mounts React
 ┃ ┗ style.css
 ┣ index.html
```

## License

Private project — all rights reserved.
