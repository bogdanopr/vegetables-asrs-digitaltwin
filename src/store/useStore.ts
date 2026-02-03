import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { VegetableBox, VegetableType, GridPosition, Order, SystemStatus } from '../types';
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

interface StoreState {
    inventory: VegetableBox[];
    orders: Order[];
    deliveredItems: VegetableBox[];
    taskQueue: VegetableType[];

    // Chat State
    chatHistory: ChatMessage[];
    pendingConfirmation: PendingItem[] | null; // For partial orders

    // Robot State
    robotPosition: GridPosition;
    robotTarget: GridPosition | null;
    heldItem: VegetableBox | null;
    systemStatus: SystemStatus;

    // Stats
    logs: string[];

    // Actions
    initInventory: () => void;
    placeOrder: (items: VegetableType[]) => void;
    robotArrivedAtTarget: () => void;
    addLog: (msg: string) => void;
    checkNextTask: () => void;

    // Chat Actions
    sendUserMessage: (text: string) => void;
    resolvePendingOrder: (action: 'PROCEED' | 'SCRATCH') => void;

    // System Actions
    resetSystem: () => void;
}

const DELIVERY_ZONE: GridPosition = { x: 0, y: 0, z: 5 };
const HOME_POSITION: GridPosition = { x: 0, y: 5, z: 5 };

const generateInventory = (): VegetableBox[] => {
    const boxes: VegetableBox[] = [];
    const types: VegetableType[] = ['Tomato', 'Lettuce', 'Carrot', 'Eggplant', 'Corn', 'Onion'];

    // Create 6 distinct pallets, one for each type
    types.forEach((type, index) => {
        // Spacing: Wider apart to fit 2x2 footprint
        // BaseX: -15, -9, -3, 3, 9, 15 (Spacing of 6)
        const baseX = (index - 2.5) * 6;

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

    chatHistory: [{ id: 'init', sender: 'bot', text: 'Hello! Inventory is ready. Tell me what you need (e.g., "I want 3 tomatoes").' }],
    pendingConfirmation: null,

    robotPosition: HOME_POSITION,
    robotTarget: null,
    heldItem: null,
    systemStatus: 'IDLE',
    logs: [],

    initInventory: () => {
        set({ inventory: generateInventory(), logs: ['System Initialized. Inventory Scanned.'] });
    },

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

        if (get().systemStatus === 'IDLE') {
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

        if (validOrders.length === 0) {
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
            robotPosition: HOME_POSITION,
            robotTarget: null,
            heldItem: null,
            systemStatus: 'IDLE',
            logs: ['System Reset Initiated.']
        });
    },

    checkNextTask: () => {
        const state = get();
        if (state.taskQueue.length === 0) {
            if (state.systemStatus !== 'IDLE') {
                set({ systemStatus: 'RETURNING', robotTarget: HOME_POSITION });
                get().addLog('All tasks complete. Returning home.');
            }
            return;
        }

        const nextItemType = state.taskQueue[0];

        // 1. Find the best available box for this type
        // Priority: Highest Y (top of stack), then whatever X/Z
        const candidateBox = state.inventory
            .filter(b => b.type === nextItemType && state.heldItem?.id !== b.id)
            .sort((a, b) => b.position.y - a.position.y)[0];

        if (!candidateBox) {
            get().addLog(`Error: Out of stock for ${nextItemType}! Skipping.`);
            set({ taskQueue: state.taskQueue.slice(1) }); // Remove from queue
            get().checkNextTask();
            return;
        }

        // 2. Assign Target
        set({
            robotTarget: candidateBox.position,
            systemStatus: 'MOVING_TO_PICK',
            robotPosition: get().robotPosition // Ensure current position is known
        });

        get().addLog(`Moving to pick ${nextItemType} at [${candidateBox.position.x}, ${candidateBox.position.y}, ${candidateBox.position.z}]`);
    },

    robotArrivedAtTarget: () => {
        const state = get();
        const { systemStatus, heldItem, robotTarget } = state;

        if (systemStatus === 'MOVING_TO_PICK') {
            // Robot arrived at the box location. Time to "pick" it.
            if (!robotTarget) return;

            const boxIndex = state.inventory.findIndex(b =>
                b.position.x === robotTarget.x &&
                b.position.y === robotTarget.y &&
                b.position.z === robotTarget.z
            );

            if (boxIndex === -1) {
                get().addLog('Error: Box gone when arrived to pick! Retrying...');
                get().checkNextTask();
                return;
            }

            // Transition to "picking" animation or logic
            // For now, we simulate instantaneous pick and move to delivery
            const box = state.inventory[boxIndex];
            const newInventory = [...state.inventory];
            newInventory.splice(boxIndex, 1); // Remove from rack

            set({
                inventory: newInventory,
                heldItem: box, // Attach to robot
                systemStatus: 'DELIVERING',
                robotTarget: DELIVERY_ZONE,
            });
            get().addLog(`Picked up ${box.type}. Delivering...`);
        }

        else if (systemStatus === 'DELIVERING') {
            if (heldItem) {
                set((state) => ({
                    heldItem: null, // Detach (delivered)
                    deliveredItems: [...state.deliveredItems, heldItem],
                    taskQueue: state.taskQueue.slice(1) // Remove completed task
                }));
                get().addLog(`Delivered ${heldItem.type}.`);
                get().checkNextTask(); // Next!
            }
        }
        else if (systemStatus === 'RETURNING') {
            set({ systemStatus: 'IDLE', robotTarget: null });
        }
    }
}));

