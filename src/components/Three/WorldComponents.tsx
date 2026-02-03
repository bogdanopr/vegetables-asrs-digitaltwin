import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useStore } from '../../store/useStore';
import type { VegetableType, GridPosition } from '../../types';
import { VEGETABLE_COLORS } from '../../types';
import { RoundedBox } from '@react-three/drei';

// Helper to convert Grid Coords to World Vector3
export const gridToWorld = (pos: GridPosition) => {
    return new Vector3(pos.x * 1.5, pos.y * 1.5, pos.z * 1.5);
};

interface BoxProps {
    type: VegetableType;
    position: [number, number, number];
}

export const BoxMesh: React.FC<BoxProps> = ({ type, position }) => {
    return (
        <RoundedBox args={[1, 1, 1]} radius={0.1} position={position}>
            <meshStandardMaterial color={VEGETABLE_COLORS[type]} />
        </RoundedBox>
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
        </group>
    );
};

export const InventoryRacks = () => {
    const inventory = useStore(state => state.inventory);

    return (
        <group>
            {inventory.map(box => {
                const pos = gridToWorld(box.position);
                return <BoxMesh key={box.id} type={box.type} position={[pos.x, pos.y, pos.z]} />
            })}

            {/* Rack Structure (Visual Reference) */}
            {/* We could render lines/grid here */}
        </group>
    );
};

export const DeliveryZone = () => {
    const delivered = useStore(state => state.deliveredItems);
    const pos = gridToWorld({ x: 0, y: 0, z: 5 });

    return (
        <group position={[pos.x, pos.y, pos.z]}>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[4, 4]} />
                <meshStandardMaterial color="#222" />
            </mesh>

            {/* Render delivered items piled up */}
            {delivered.map((box, i) => (
                <BoxMesh key={box.id} type={box.type} position={[1.5, 0.5, i * 1.2 - 2]} />
            ))}
        </group>
    );
};
