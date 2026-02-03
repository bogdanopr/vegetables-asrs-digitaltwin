import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import { useStore } from '../../store/useStore';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { WorldComponents, PhysicsFloor } from './WorldComponents';

export const Scene = () => {
    const { viewMode } = useStore();

    return (
        <Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
            {/* Conditional Controls */}
            {viewMode === 'ORBIT' && <OrbitControls makeDefault />}

            <ambientLight intensity={0.5} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={1.5}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />

            <gridHelper args={[40, 40, 0x444444, 0x222222]} position={[0, -0.01, 0]} />

            <Physics gravity={[0, -9.81, 0]}>
                <PhysicsFloor />
                <WorldComponents />
            </Physics>

            <EffectComposer>
                <Bloom luminanceThreshold={1} intensity={0.5} radius={0.5} />
            </EffectComposer>
        </Canvas>
    );
};
