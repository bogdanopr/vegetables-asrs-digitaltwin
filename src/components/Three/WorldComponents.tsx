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

export const Robot = () => {
    const mesh = useRef<any>(null);
    const robotPosition = useStore(state => state.robotPosition);
    const robotTarget = useStore(state => state.robotTarget);
    const heldItem = useStore(state => state.heldItem);
    const robotArrived = useStore(state => state.robotArrivedAtTarget);

    // Sync initial position
    useEffect(() => {
        if (mesh.current) {
            const start = gridToWorld(robotPosition);
            mesh.current.position.set(start.x, start.y, start.z);
        }
    }, []);

    useFrame((_, delta) => {
        if (!robotTarget || !mesh.current) return;

        const targetVec = gridToWorld(robotTarget);
        const step = 5 * delta; // Speed

        mesh.current.position.lerp(targetVec, step * 0.5);

        if (mesh.current.position.distanceTo(targetVec) < 0.1) {
            robotArrived();
        }
    });

    return (
        <group ref={mesh}>
            {/* Robot Gantry Visual */}
            <mesh>
                <boxGeometry args={[1.2, 1.2, 1.2]} />
                <meshStandardMaterial color="#888" wireframe />
            </mesh>

            {/* Held Item */}
            {heldItem && (
                <BoxMesh type={heldItem.type} position={[0, 0, 0]} />
            )}

            {/* Robot-Eye Camera */}
            <PerspectiveCamera
                makeDefault={useStore(s => s.viewMode) === 'ROBOT'}
                position={[0, 0.5, 0.5]}
                rotation={[-0.5, 0, 0]} // Look slightly down
                fov={75}
            />
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
    return (
        <group>
            <InventoryRacks />
            <Robot />
            <DeliveryZone />
        </group>
    );
};
