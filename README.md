## Tech Stack

### Core Framework
- React
- TypeScript
- Vite

### 3D & Visualization
- Three.js
- React Three Fiber (R3F) — React renderer for building the 3D scene declaratively.
- Drei — Helper library providing essential 3D components for R3F.

### State Management & Logic
- Zustand — Lightweight and fast state management library.  
  Used to implement the **Saga Orchestrator Pattern**, managing complex asynchronous robot workflows outside the React render cycle:
  
  `Queue → Move → Pick → Deliver`

- UUID — Generates unique IDs for each order and vegetable box.

---

## Live Demo

https://asrs-digitaltwin.vercel.app/
