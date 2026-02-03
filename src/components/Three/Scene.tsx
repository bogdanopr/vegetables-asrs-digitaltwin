import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { InventoryRacks, Robot, DeliveryZone } from './WorldComponents';

export const Scene = () => {
    return (
        <Canvas
            camera={{ position: [10, 10, 10], fov: 50 }}
            shadows
        >
            <color attach="background" args={['#1a1a1a']} />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

            {/* Environment */}
            <OrbitControls makeDefault />
            <Grid args={[20, 20]} cellColor="#444" sectionColor="#888" />

            {/* Simulation Components */}
            <InventoryRacks />
            <Robot />
            <DeliveryZone />

        </Canvas>
    );
};
