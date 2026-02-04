export type VegetableType = 'Tomato' | 'Lettuce' | 'Carrot' | 'Eggplant' | 'Corn' | 'Onion';

export const VEGETABLE_COLORS: Record<VegetableType, string> = {
  Tomato: '#ff4d4d',    // Red
  Lettuce: '#4caf50',   // Green
  Carrot: '#ff9800',    // Orange
  Eggplant: '#9c27b0',  // Purple
  Corn: '#ffeb3b',      // Yellow
  Onion: '#f5f5f5',     // White
};

export interface GridPosition {
  x: number;
  y: number; // Vertical level
  z: number;
}

export interface VegetableBox {
  id: string;
  type: VegetableType;
  position: GridPosition;
}

export interface Order {
  id: string;
  items: VegetableType[];
  status: 'pending' | 'processing' | 'completed';
}

export type SystemStatus = 'IDLE' | 'MOVING' | 'PICKING' | 'DELIVERING' | 'RETURNING' | 'MOVING_TO_PICK';

export interface RobotState {
  id: string;
  position: GridPosition;
  target: GridPosition | null;
  status: SystemStatus;
  heldItem: VegetableBox | null;
  highwayLaneZ: number; // The Z-coordinate this robot uses for travel
  color: string; // Visual distinction
}
