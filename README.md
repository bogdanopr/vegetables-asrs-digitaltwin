
Core Framework:
React TypeScript Vite 

3D & Visualization :
Three.js + React Three Fiber (R3F): React renderer to build the scene declaratively + Drei: A helper library for 3D components

State & Logic 
Zustand: A fast state management library. We use this to implement the Saga Orchestrator Pattern, managing the complex async flows of the robot (Queue -> Move -> Pick -> Deliver) outside of the React render cycle.
UUID: For generating unique IDs for every order and vegetable box.
