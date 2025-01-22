import React, { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import Planet from './Planet';

// Constants for orbit calculation
const ORBIT_RANGES = Array.from({ length: 10 }, (_, i) => ({
  radius: 10 + (i * 4),
  tilt: 0
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
  const planetRefs = useRef({});
  const rotationAngles = useRef({});

  const orbitPaths = useMemo(() => {
    return ORBIT_RANGES.map(orbit => ({
      ...orbit,
      points: generateOrbitPath(orbit.radius)
    }));
  }, []);

  const planetPositions = useMemo(() => {
    if (!transactions?.length) return [];
    
    const positions = [];
    const usedTransactions = transactions.slice(0, 15);
    
    usedTransactions.forEach((tx, index) => {
      // Generate random initial angle and speed for each planet
      if (!rotationAngles.current[tx.hash]) {
        rotationAngles.current[tx.hash] = {
          angle: Math.random() * Math.PI * 2,
          // Speed varies based on orbit distance (closer = faster)
          speed: (0.002 + Math.random() * 0.001) * (1 / (Math.floor(index/3) + 1)),
          // Add very subtle vertical oscillation
          verticalOffset: Math.random() * 0.2,
          verticalSpeed: 0.0002 + Math.random() * 0.0001
        };
      }

      const position = getPositionOnOrbit(
        ORBIT_RANGES[index].radius,
        rotationAngles.current[tx.hash].angle / (Math.PI * 2)
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
  
  useFrame((state, delta) => {
    // Rotate core and glow
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.005;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.003;
    }

    // Update planet positions
    planetPositions.forEach(({ transaction, orbitIndex }) => {
      const planetData = rotationAngles.current[transaction.hash];
      if (planetData) {
        // Update rotation angle
        planetData.angle += planetData.speed;
        // Update vertical oscillation
        planetData.verticalOffset += planetData.verticalSpeed;

        // Calculate new position
        const radius = ORBIT_RANGES[orbitIndex].radius;
        const x = radius * Math.cos(planetData.angle);
        const y = Math.sin(planetData.verticalOffset) * 0.5; // Vertical oscillation
        const z = radius * Math.sin(planetData.angle);

        // Update planet position if ref exists
        if (planetRefs.current[transaction.hash]) {
          planetRefs.current[transaction.hash].position.set(x, y, z);
        }
      }
    });

    if (composerRef.current) {
      composerRef.current.render();
    }
  });

  const handlePlanetHover = (isHovered, transaction) => {
    setHoveredPlanet(isHovered ? transaction : null);
    // Prevent galaxy hover sounds in zoomed view
    if (window.AudioManager) {
      window.AudioManager.handleGalaxyHoverEnd();
    }
  };

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
        <group 
          key={transaction.hash}
          ref={el => planetRefs.current[transaction.hash] = el}
          position={position}
        >
          <Planet
            transaction={transaction}
            position={[0, 0, 0]}
            isHighlighted={transaction.hash === highlightedHash}
            onHover={(isHovered) => handlePlanetHover(isHovered, transaction)}
            lodLevel={lodLevel}
          />
        </group>
      ))}

      <ambientLight intensity={0.5} />
      <pointLight position={[0, 30, 0]} intensity={2} distance={100} />
      <pointLight position={[0, -30, 0]} intensity={2} distance={100} />
    </>
  );
};

export default React.memo(ZoomedGalaxy);