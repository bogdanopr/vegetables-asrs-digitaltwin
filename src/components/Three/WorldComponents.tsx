import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3 } from 'three';
import { useStore } from '../../store/useStore';
import type { VegetableType, GridPosition } from '../../types';
import { VEGETABLE_COLORS } from '../../types';
import { Text, PerspectiveCamera } from '@react-three/drei';
import { useBox, usePlane } from '@react-three/cannon';

// Helper to convert Grid Coords to World Vector3
export const gridToWorld = (pos: GridPosition) => {
    return new Vector3(pos.x * 1.5, (pos.y * 1.0) + 0.5, pos.z * 1.5);
};

interface BoxProps {
    type: VegetableType;
    position: [number, number, number];
}


export const PhysicsFloor = () => {
    const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }));
    return (
        <mesh ref={ref as any}>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial transparent opacity={0.2} color="#111" />
        </mesh>
    );
};

export const BoxMesh: React.FC<BoxProps> = ({ type, position }) => {
    // Dynamic physics box
    const [ref] = useBox(() => ({ mass: 0, position, args: [1, 1, 1] })); // Mass 0 = Static (no drop)

    return (
        <mesh ref={ref as any}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={VEGETABLE_COLORS[type]} />
            {/* Edge highlights for visual pop */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
                <lineBasicMaterial color="black" linewidth={2} />
            </lineSegments>
        </mesh>
    );
};

interface RobotProps {
    data: import('../../types').RobotState;
}

export const Robot: React.FC<RobotProps> = ({ data }) => {
    const mesh = useRef<any>(null);
    const robotArrived = useStore(state => state.robotArrivedAtTarget);

    // Sync initial position (snap)
    useEffect(() => {
        if (mesh.current && data.status === 'IDLE') {
            const start = gridToWorld(data.position);
            mesh.current.position.set(start.x, start.y, start.z);
        }
    }, []);

    useFrame((_, delta) => {
        if (!data.target || !mesh.current) return;

        const targetVec = gridToWorld(data.target);
        const currentPos = mesh.current.position;
        const step = 8 * delta; // Speed up slightly for swarm efficiency

        // HIGHWAY LOGIC
        // 1. If we are far from target X, stay in Highway Z
        // 2. If we are at approximate Target X, move in Z

        const laneZ = data.highwayLaneZ; // The Z coordinate for travel
        // Just use raw Z for lane? gridToWorld converts it scaling * 1.5
        // Let's assume laneZ is Grid Coords.
        const worldLaneZ = gridToWorld({ x: 0, y: 0, z: laneZ }).z;

        // Vector to Highway Lane
        const getToLane = new Vector3(currentPos.x, currentPos.y, worldLaneZ);
        // Vector along Highway to Target X
        const moveAlongLane = new Vector3(targetVec.x, currentPos.y, worldLaneZ);

        // State Machine for Movement Frame

        // Priority 1: Clear the racks (Move to Lane Z if currently "in" the racks and needs to travel far X)
        // Check if we are "in" the racks (Z > -1 roughly)
        const isInRacks = currentPos.z > -2;
        const isFarX = Math.abs(currentPos.x - targetVec.x) > 0.5;

        if (isInRacks && isFarX) {
            // Retreat to Highway
            mesh.current.position.lerp(getToLane, step * 0.5);
        }
        else if (Math.abs(currentPos.x - targetVec.x) > 0.5) {
            // Travel along Highway X
            // Ensure we are AT lane Z approx
            if (Math.abs(currentPos.z - worldLaneZ) > 0.5) {
                mesh.current.position.lerp(getToLane, step * 0.5);
            } else {
                mesh.current.position.lerp(moveAlongLane, step * 0.5);
            }
        } else {
            // We are at correct X (aligned with target column)
            // Now move Z/Y to target
            mesh.current.position.lerp(targetVec, step * 0.5);
        }

        // Arrival Check
        if (mesh.current.position.distanceTo(targetVec) < 0.1) {
            robotArrived(data.id);
        }
    });

    return (
        <group ref={mesh}>
            {/* Robot Body */}
            <mesh>
                <boxGeometry args={[1.2, 1.2, 1.2]} />
                <meshStandardMaterial color={data.color} wireframe />
            </mesh>

            {/* ID Label */}
            <Text position={[0, 1.0, 0]} fontSize={0.5} color={data.color}>
                {data.id}
            </Text>

            {/* Held Item */}
            {data.heldItem && (
                <BoxMesh type={data.heldItem.type} position={[0, 0, 0]} />
            )}

            {/* Robot-Eye Camera - Only if View Mode matches AND it's Robot 1 (for simplicity) */}
            {data.id === 'R1' && (
                <PerspectiveCamera
                    makeDefault={useStore(s => s.viewMode) === 'ROBOT'}
                    position={[0, 0.5, 0.5]}
                    rotation={[-0.5, 0, 0]}
                    fov={75}
                />
            )}
        </group>
    );
};

export const InventoryRacks = () => {
    const inventory = useStore(state => state.inventory);
    const types: VegetableType[] = ['Tomato', 'Lettuce', 'Carrot', 'Eggplant', 'Corn', 'Onion'];

    return (
        <group>
            {/* Render Boxes */}
            {inventory.map(box => {
                const pos = gridToWorld(box.position);
                return <BoxMesh key={box.id} type={box.type} position={[pos.x, pos.y, pos.z]} />
            })}

            {/* Labels and Zone Dividers */}
            {types.map((type, index) => {
                const baseX = (index - 2.5) * 4;
                const centerX = baseX + 0.5; // Center of 2x2 block (spanning x to x+1)

                const worldIdxPos = gridToWorld({ x: centerX, y: 0, z: 0.5 }); // Center of 2x2

                return (
                    <group key={type} position={[worldIdxPos.x, 0, 0]}>
                        {/* Floor Label */}
                        <Text
                            position={[0, 0.05, 3.5]}
                            rotation={[-Math.PI / 2, 0, 0]}
                            fontSize={0.8}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                        >
                            {type}
                        </Text>

                        {/* Zone Divider Line (Right side, except last) */}
                        {index < types.length - 1 && (
                            <mesh position={[3.0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                <planeGeometry args={[0.2, 20]} />
                                <meshStandardMaterial color="#333" />
                            </mesh>
                        )}
                    </group>
                );
            })}
        </group>
    );
};

export const DeliveryZone = () => {
    const delivered = useStore(state => state.deliveredItems);
    const pos = gridToWorld({ x: 0, y: 0, z: 5 });

    return (
        <group position={[pos.x, pos.y, pos.z]}>
            {/* Dock Floor */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[6, 4]} />
                <meshStandardMaterial color="#222" />
                <lineSegments>
                    <edgesGeometry args={[new THREE.PlaneGeometry(6, 4)]} />
                    <lineBasicMaterial color="#yellow" linewidth={2} />
                </lineSegments>
            </mesh>

            <Text position={[0, 0.1, 2.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#aaa">
                DELIVERY DOCK
            </Text>

            {/* Render delivered items piled up neatly */}
            {delivered.map((box, i) => {
                // Stack 2x2 logic again for delivery
                // Let's do a simple 3 wide x N deep stack
                // Visual layout:
                // x: -1, 0, 1
                // z: starts at 0, moves back
                // Let's try 3x2 base for variety
                const col = i % 3;
                const row = Math.floor((i % 9) / 3);
                const level = Math.floor(i / 9);

                return (
                    <BoxMesh
                        key={box.id}
                        type={box.type}
                        position={[(col - 1) * 1.1, level + 0.5, (row - 1) * 1.1]}
                    />
                );
            })}
        </group>
    );
};

export const WorldComponents = () => {
    const robots = useStore(state => state.robots);

    return (
        <group>
            <InventoryRacks />
            {robots.map(r => (
                <Robot key={r.id} data={r} />
            ))}
            <DeliveryZone />
        </group>
    );
};
