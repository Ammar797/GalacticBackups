import React, { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import Planet from './Planet';

// Simple circular orbits, evenly spaced
const ORBIT_RANGES = Array.from({ length: 10 }, (_, i) => ({
  radius: 10 + (i * 4), // Start at 15, increment by 5 for each orbit
  tilt: 0 // No tilt for perfect circles
}));

const generateOrbitPath = (radius, segments = 128) => {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const y = 0;
    const z = radius * Math.sin(angle);
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
};

const getPositionOnOrbit = (radius, progress) => {
  const angle = progress * Math.PI * 2;
  const x = radius * Math.cos(angle);
  const y = 0;
  const z = radius * Math.sin(angle);
  return new THREE.Vector3(x, y, z);
};

const ZoomedGalaxy = ({ 
  colorScheme, 
  transactions, 
  safeColorIndex = 0, 
  highlightedHash,
  setHoveredPlanet,
  lodLevel = 'HIGH' 
}) => {
  const { gl, scene, camera } = useThree();
  const coreRef = useRef();
  const glowRef = useRef();
  const composerRef = useRef();

  const orbitPaths = useMemo(() => {
    return ORBIT_RANGES.map(orbit => ({
      ...orbit,
      points: generateOrbitPath(orbit.radius)
    }));
  }, []);

  // Update the planetPositions calculation:

const planetPositions = useMemo(() => {
  if (!transactions?.length) return [];
  
  const positions = [];
  const usedTransactions = transactions.slice(0, 15);
  
  usedTransactions.forEach((tx, index) => {
    // Generate random angle between 0 and 2π
    const randomAngle = Math.random() * Math.PI * 2;
    const position = getPositionOnOrbit(
      ORBIT_RANGES[index].radius,
      randomAngle / (Math.PI * 2) // Convert angle to progress (0-1)
    );
    
    positions.push({
      transaction: tx,
      position: [position.x, position.y, position.z],
      orbitIndex: index
    });
  });
  
  return positions;
}, [transactions]);

  useEffect(() => {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    
    bloomPass.threshold = 0.2;
    bloomPass.strength = 2.0;
    bloomPass.radius = 0.5;
    
    const composer = new EffectComposer(gl);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;
  
    return () => {
      composer.dispose();
    };
  }, [scene, camera, gl]);
  
  useFrame(() => {
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.005;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.003;
    }
    if (composerRef.current) {
      composerRef.current.render();
    }
  });

  return (
    <>
      <group>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[2, 15]} />
          <meshStandardMaterial
            color={colorScheme?.core}
            emissive={colorScheme?.core}
            emissiveIntensity={0.5}
          />
          <pointLight 
            color={colorScheme?.core}
            intensity={3.0}
            distance={50}
            decay={2}
          />
        </mesh>

        <mesh ref={glowRef} scale={[1.2, 1.2, 1.2]}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshStandardMaterial
            color={colorScheme?.core}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {orbitPaths.map((orbit, i) => (
        <line key={`orbit-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={orbit.points.length}
              array={new Float32Array(orbit.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#FFF8E7"
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}

      {planetPositions.map(({ transaction, position }, index) => (
        <Planet
          key={transaction.hash}
          transaction={transaction}
          position={position}
          isHighlighted={transaction.hash === highlightedHash}
          onHover={(isHovered) => setHoveredPlanet(isHovered ? transaction : null)}
          lodLevel={lodLevel}
        />
      ))}

      <ambientLight intensity={0.5} />
      <pointLight position={[0, 30, 0]} intensity={2} distance={100} />
      <pointLight position={[0, -30, 0]} intensity={2} distance={100} />
    </>
  );
};

export default React.memo(ZoomedGalaxy);