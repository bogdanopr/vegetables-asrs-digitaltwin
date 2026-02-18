import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { VegetableBox, VegetableType, GridPosition, Order } from '../types';
import { parseUserOrder } from '../utils/textParser';

interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
}

interface PendingItem {
    type: VegetableType;
    requested: number;
    available: number;
}

export interface StoreState {
    inventory: VegetableBox[];
    orders: Order[];
    deliveredItems: VegetableBox[];
    taskQueue: VegetableType[];

    // Chat State
    chatHistory: ChatMessage[];
    pendingConfirmation: PendingItem[] | null; // For partial orders

    // Robot State (Swarm)
    robots: import('../types').RobotState[];

    // Stats
    logs: string[];
    viewMode: 'ORBIT' | 'ROBOT';
    systemStatus: string;

    // Actions
    initInventory: () => void;
    setViewMode: (mode: 'ORBIT' | 'ROBOT') => void;
    placeOrder: (items: VegetableType[]) => void;
    robotArrivedAtTarget: (robotId: string) => void;
    addLog: (msg: string) => void;
    checkNextTask: () => void;

    // Chat Actions
    sendUserMessage: (text: string) => void;
    resolvePendingOrder: (action: 'PROCEED' | 'SCRATCH') => void;

    // System Actions
    resetSystem: () => void;
}

export const DELIVERY_ZONE: GridPosition = { x: 0, y: 0, z: 5 };

// Robot Configs
const ROBOT_CONFIGS = [
    { id: 'R1', lane: -2, color: '#2196f3', home: { x: -5, y: 5, z: 5 } },
    { id: 'R2', lane: -4, color: '#e91e63', home: { x: 0, y: 5, z: 5 } },
    { id: 'R3', lane: -6, color: '#ff9800', home: { x: 5, y: 5, z: 5 } },
];

const generateInventory = (): VegetableBox[] => {
    const boxes: VegetableBox[] = [];
    const types: VegetableType[] = ['Tomato', 'Lettuce', 'Carrot', 'Eggplant', 'Corn', 'Onion'];

    // Create 6 distinct pallets, one for each type
    types.forEach((type, index) => {
        // Spacing: Wider apart to fit 2x2 footprint
        // BaseX: -10, -6, -2, 2, 6, 10 (Spacing of 4)
        const baseX = (index - 2.5) * 4;

        // 10 items total per type
        for (let i = 0; i < 10; i++) {
            // Map 1D index (0..9) to 3D local coords (dx, dy, dz)
            // 2x2 Base -> 4 items per layer
            const layer = Math.floor(i / 4);
            const remainder = i % 4;

            // Layout in 2x2:
            // 0: (0,0), 1: (1,0)
            // 2: (0,1), 3: (1,1)
            const dx = remainder % 2;
            const dz = Math.floor(remainder / 2);

            boxes.push({
                id: uuidv4(),
                type,
                position: { x: baseX + dx, y: layer, z: dz }
            });
        }
    });
    return boxes;
};

// Helper to count inventory
const countInventory = (inventory: VegetableBox[], type: VegetableType) => {
    return inventory.filter(b => b.type === type).length;
};

export const useStore = create<StoreState>((set, get) => ({
    inventory: [],
    orders: [],
    deliveredItems: [],
    taskQueue: [],

    chatHistory: [{ id: 'init', sender: 'bot', text: 'Swarm Online. 3 Robots Ready. Waiting for orders.' }],
    pendingConfirmation: null,

    // Initialize Swarm
    robots: ROBOT_CONFIGS.map(cfg => ({
        id: cfg.id,
        position: cfg.home,
        target: null,
        status: 'IDLE',
        heldItem: null,
        highwayLaneZ: cfg.lane,
        color: cfg.color
    })),

    logs: [],
    viewMode: 'ORBIT',
    systemStatus: 'OPERATIONAL',

    initInventory: () => {
        set({ inventory: generateInventory(), logs: ['System Initialized. Inventory Scanned.'] });
    },

    setViewMode: (mode) => set({ viewMode: mode }),

    addLog: (msg) => set((state) => ({ logs: [msg, ...state.logs].slice(0, 50) })),

    placeOrder: (items) => {
        const order: Order = { id: uuidv4(), items, status: 'pending' };

        // Use a greedy approach to reserve specific box IDs for this order to avoid collisions?
        // For now, we just push to queue. The robot parses queue at runtime.
        // However, checking stock requires knowing what's available.
        // The queue might contain items that are technically "spoken for".
        // Simplified: The robot picks the *current* best candidate when it starts the task.

        set((state) => ({
            orders: [...state.orders, order],
            taskQueue: [...state.taskQueue, ...items]
        }));
        get().addLog(`Order received: ${items.join(', ')}`);

        if (get().robots.some(r => r.status === 'IDLE')) {
            get().checkNextTask();
        }
    },



    sendUserMessage: (text: string) => {
        const state = get();

        // 1. Add user message
        const newUserMsg: ChatMessage = { id: uuidv4(), sender: 'user', text };
        set({ chatHistory: [...state.chatHistory, newUserMsg] });

        // 2. Check if we are waiting for a confirmation
        if (state.pendingConfirmation) {
            const lower = text.toLowerCase();
            if (lower.includes('proceed') || lower.includes('yes') || lower.includes('bring')) {
                get().resolvePendingOrder('PROCEED');
            } else if (lower.includes('scratch') || lower.includes('no') || lower.includes('cancel')) {
                get().resolvePendingOrder('SCRATCH');
            } else {
                set(s => ({ chatHistory: [...s.chatHistory, { id: uuidv4(), sender: 'bot', text: 'Please say "Proceed" or "Scratch".' }] }));
            }
            return;
        }

        // 3. NLP Parsing (Robust)
        const validOrders = parseUserOrder(text);

        get().addLog(`NLP: Parsed ${validOrders.length} valid orders from input.`);

        if (validOrders.length === 0) {
            get().addLog('NLP: Failed to extract any valid orders.');
            set(s => ({ chatHistory: [...s.chatHistory, { id: uuidv4(), sender: 'bot', text: 'I didn\'t catch that. Try saying "I want 5 tomatoes".' }] }));
            return;
        }

        // Aggregate duplicates (e.g. "2 corn and 3 corn" -> 5 corn)
        const totalsRequested: Record<string, number> = {};
        validOrders.forEach((order: { type: VegetableType, count: number }) => {
            totalsRequested[order.type] = (totalsRequested[order.type] || 0) + order.count;
        });

        // 4. Validate Stock
        const validItemsToOrder: VegetableType[] = [];
        const pendingCheck: PendingItem[] = []; // Definition restored
        let hasShortage = false;

        Object.entries(totalsRequested).forEach(([typeStr, count]) => {
            const type = typeStr as VegetableType;
            const available = countInventory(get().inventory, type);
            // We also need to subtract items already in queue (simplified: ignored for now, assuming strictly linear)

            if (count <= available) {
                // Full fulfillment
                for (let i = 0; i < count; i++) validItemsToOrder.push(type);
            } else {
                // Partial
                hasShortage = true;
                pendingCheck.push({ type, requested: count, available });
            }
        });

        if (hasShortage) {
            // We have a shortage. 
            // Logic: "Currently we only have X amount. Proceed or scratch?"
            // If multiple shortages, we simplify to just listing them.
            const shortageMsg = pendingCheck.map(p => `${p.type}: wanted ${p.requested}, have ${p.available}`).join('; ');

            set(s => ({
                chatHistory: [...s.chatHistory, {
                    id: uuidv4(),
                    sender: 'bot',
                    text: `Stock shortage for: ${shortageMsg}. Should we PROCEED with available items or SCRATCH these?`
                }],
                pendingConfirmation: pendingCheck
            }));

            // Note: We are NOT placing the valid items yet. We stick them in a holding pattern?
            // Actually user requirement: "scratch this entire item off".
            // So we should probably hold the VALID items for that *specific* shortage type until confirmed.
            // But what about the *other* valid items from the same order?
            // For simplicity: The ENTIRE interaction halts until resolved.
            // If we proceed, we add (available) amount. If scratch, we add 0.
            // Plus we add the fully valid types.
            // We need to store simple valid items somewhere too? 
            // Let's store EVERYTHING in `pendingConfirmation` context if we rewrite it slightly.
            // Simplification: We only allow confirming the PREVIOUSLY parsed request.
            // Current `pendingConfirmation` only tracks the problematic ones. 
            // Let's assume valid ones are auto-added?
            // No, "scratch this entire item" implies omitting it.
            // Let's queue the valid ones immediately? 
            // "if 1 or more quantities are missing it will prompt... proceed to bring THAT to you or scratch THIS item"
            // This implies the valid items (e.g. 5 onions which were fine) should probably go through?
            // Let's JustQueue the valid ones.
            if (validItemsToOrder.length > 0) {
                get().placeOrder(validItemsToOrder);
                set(s => ({ chatHistory: [...s.chatHistory, { id: uuidv4(), sender: 'bot', text: `(Ordering ${validItemsToOrder.length} available items...)` }] }));
            }

        } else {
            // All good
            get().placeOrder(validItemsToOrder);
            set(s => ({ chatHistory: [...s.chatHistory, { id: uuidv4(), sender: 'bot', text: `Ordering ${validItemsToOrder.length} items. On it!` }] }));
        }
    },

    resolvePendingOrder: (action: 'PROCEED' | 'SCRATCH') => {
        const state = get();
        if (!state.pendingConfirmation) return;

        if (action === 'PROCEED') {
            const itemsToAdd: VegetableType[] = [];
            state.pendingConfirmation.forEach(p => {
                for (let i = 0; i < p.available; i++) itemsToAdd.push(p.type);
            });
            if (itemsToAdd.length > 0) {
                get().placeOrder(itemsToAdd);
                set(s => ({ chatHistory: [...s.chatHistory, { id: uuidv4(), sender: 'bot', text: `Understood. Bringing ${itemsToAdd.length} items we have.` }] }));
            } else {
                set(s => ({ chatHistory: [...s.chatHistory, { id: uuidv4(), sender: 'bot', text: `Actually, we have 0 of those. Scratched.` }] }));
            }
        } else {
            set(s => ({ chatHistory: [...s.chatHistory, { id: uuidv4(), sender: 'bot', text: `Okay, scratched those items.` }] }));
        }

        set({ pendingConfirmation: null });
    },

    resetSystem: () => {
        set({
            inventory: generateInventory(),
            orders: [],
            deliveredItems: [],
            taskQueue: [],
            chatHistory: [{ id: uuidv4(), sender: 'bot', text: 'System Reset. Ready for new orders.' }],
            pendingConfirmation: null,
            // Reset Swarm
            robots: ROBOT_CONFIGS.map(cfg => ({
                id: cfg.id,
                position: cfg.home,
                target: null,
                status: 'IDLE',
                heldItem: null,
                highwayLaneZ: cfg.lane,
                color: cfg.color
            })),
            logs: ['System Reset Initiated.']
        });
    },

    checkNextTask: () => {
        const state = get();
        // Return active robots home if idle?
        // Logic: if queue is empty, send HOME.
        if (state.taskQueue.length === 0) {
            // Check for IDLE robots not at home
            /* 
            // Optional: Auto-return home logic
            const robotsToHome = state.robots.map(r => {
                if (r.status === 'IDLE' && r.holderItem === null) { 
                    // Calculate if at home? 
                    // Only return if not already there? Assumed logic.
                }
                return r;
            });
            */
            return;
        }

        // TASK AUCTION!
        // We have tasks and we have robots.
        // Assign first task to best robot.
        const nextItemType = state.taskQueue[0];

        // 1. Find Best Stock Box
        const candidateBox = state.inventory
            .filter(b => b.type === nextItemType && !state.robots.some(r => r.target?.x === b.position.x && r.target?.z === b.position.z)) // Don't pick same valid
            // Need to ensure box isn't already targeted by another robot!
            .sort((a, b) => b.position.y - a.position.y)[0];

        if (!candidateBox) {
            get().addLog(`Error: Out of stock for ${nextItemType}! Skipping.`);
            set({ taskQueue: state.taskQueue.slice(1) });
            get().checkNextTask();
            return;
        }

        // 2. Find Closest IDLE Robot
        const idleRobots = state.robots.filter(r => r.status === 'IDLE');
        if (idleRobots.length === 0) return; // Wait for robot to free up

        // Simple distance metric: Manhatten distance
        const bestRobot = idleRobots.sort((a, b) => {
            const distA = Math.abs(a.position.x - candidateBox.position.x) + Math.abs(a.position.z - candidateBox.position.z);
            const distB = Math.abs(b.position.x - candidateBox.position.x) + Math.abs(b.position.z - candidateBox.position.z);
            return distA - distB;
        })[0];

        // 3. Assign Mission
        const updatedRobots = state.robots.map(r => {
            if (r.id === bestRobot.id) {
                return {
                    ...r,
                    target: candidateBox.position,
                    status: 'MOVING_TO_PICK' as const
                };
            }
            return r;
        });

        set({
            robots: updatedRobots,
            taskQueue: state.taskQueue.slice(1) // Pop task
        });

        get().addLog(`AUCTION: Robot ${bestRobot.id} won task ${nextItemType}. Moving to [${candidateBox.position.x}, ${candidateBox.position.z}]`);

        // Recursive check if more robots are free and tasks exist
        if (updatedRobots.some(r => r.status === 'IDLE') && state.taskQueue.length > 1) {
            get().checkNextTask();
        }
    },

    robotArrivedAtTarget: (robotId: string) => {
        const state = get();
        // Find the robot
        const robotIndex = state.robots.findIndex(r => r.id === robotId);
        if (robotIndex === -1) return;

        const robot = state.robots[robotIndex];

        if (robot.status === 'MOVING_TO_PICK') {
            // Robot arrived at the box location. Time to "pick" it.
            if (!robot.target) return;

            const boxIndex = state.inventory.findIndex(b =>
                b.position.x === robot.target!.x &&
                b.position.y === robot.target!.y &&
                b.position.z === robot.target!.z
            );

            if (boxIndex === -1) {
                get().addLog(`Error: Box gone when Robot ${robotId} arrived! Retrying...`);
                // Reset this robot to IDLE? Or Retry?
                // For now, IDLE and re-check
                const updatedRobots = [...state.robots];
                updatedRobots[robotIndex] = { ...robot, status: 'IDLE', target: null };
                set({ robots: updatedRobots });
                get().checkNextTask();
                return;
            }

            // Pick Logic
            const box = state.inventory[boxIndex];
            const newInventory = [...state.inventory];
            newInventory.splice(boxIndex, 1); // Remove from rack

            const updatedRobots = [...state.robots];
            updatedRobots[robotIndex] = {
                ...robot,
                heldItem: box,
                status: 'DELIVERING',
                target: DELIVERY_ZONE
            };

            set({
                inventory: newInventory,
                robots: updatedRobots
            });
            get().addLog(`Robot ${robotId} picked up ${box.type}. Delivering...`);
        } else if (robot.status === 'DELIVERING') {
            if (robot.heldItem) {
                const updatedRobots = [...state.robots];
                updatedRobots[robotIndex] = {
                    ...robot,
                    heldItem: null,
                    status: 'IDLE',
                    target: null // Or HOME?
                };

                set((state) => ({
                    deliveredItems: [...state.deliveredItems, robot.heldItem!],
                    robots: updatedRobots
                }));
                get().addLog(`Robot ${robotId} delivered ${robot.heldItem.type}.`);
                get().checkNextTask(); // Next!
            }
        } else if (robot.status === 'RETURNING') {
            const updatedRobots = [...state.robots];
            updatedRobots[robotIndex] = { ...robot, status: 'IDLE', target: null };
            set({ robots: updatedRobots });
        }
    }
}));

