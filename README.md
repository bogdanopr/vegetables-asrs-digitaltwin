## Tech Stack

### Core Framework
- React
- TypeScript
- Vite

### 3D & Visualization
- Three.js
- React Three Fiber (R3F) — React renderer for building the 3D scene.
- Drei — Helper library providing essential 3D components for R3F.

### State Management & Logic
- Zustand — library used to implement the **Saga Orchestrator Pattern**, managing complex asynchronous robot workflows outside the React render cycle:
  
  `Queue → Move → Pick → Deliver`

- UUID — Generates unique IDs for each order and vegetable box.

---

## Live Demo

https://veg-asrs-digitaltwin.vercel.app/
