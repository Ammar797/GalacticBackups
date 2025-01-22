import { useRef, useState, memo, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Points, Point } from '@react-three/drei';
import * as THREE from 'three';
import ZoomedGalaxy from './ZoomedGalaxy';
import '../styles/galaxy.css';
import { PREFIXES, SUFFIXES, GALAXY_COLORS } from './GalaxyStyles';

const FIXED_GALAXY_SIZE = 8;
const NAME_OPACITY_BASE = 0.7;
const PARTICLES_PER_ARM = 500;
const ARMS = 6;
const ARM_ANGLE_STEP = (2 * Math.PI) / ARMS;

const galaxyNameCache = new Map();

const generateGalaxyName = (key) => {
  if (galaxyNameCache.has(key)) return galaxyNameCache.get(key);

  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const suffix = Math.random() < 0.3 ? SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)] : '';
  
  const name = `${prefix}-${number}${suffix ? `-${suffix}` : ''}`;
  galaxyNameCache.set(key, name);
  return name;
};

const createSpiralParticles = (colorScheme, isHovered) => {
  const positions = [];
  const colors = [];
  const sizes = [];
  
  // Core particles - increased brightness and density
  const coreParticles = 150;  // Increased from 100
  for (let i = 0; i < coreParticles; i++) {
    const radius = Math.random() * 2.5;  // Increased from 2
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 0.5;
    
    positions.push(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );
    
    const coreColor = new THREE.Color(colorScheme.core);
    coreColor.multiplyScalar(isHovered ? 4 : 3);  // Increased brightness
    colors.push(coreColor.r, coreColor.g, coreColor.b);
    sizes.push(Math.random() * 1.0 + 0.6);  // Increased size
  }

  // Spiral arms - increased brightness
  for (let arm = 0; arm < ARMS; arm++) {
    const startAngle = arm * ARM_ANGLE_STEP;
    const armColor = new THREE.Color(colorScheme.arms[arm % colorScheme.arms.length]);
    
    for (let i = 0; i < PARTICLES_PER_ARM; i++) {
      const distance = (i / PARTICLES_PER_ARM) * FIXED_GALAXY_SIZE;
      const spiral = startAngle + (distance * 1);
      const spread = (1 - i / PARTICLES_PER_ARM) * 0.8;
      const randomSpread = (Math.random() - 0.5) * spread;
      
      const x = Math.cos(spiral + randomSpread) * distance;
      const z = Math.sin(spiral + randomSpread) * distance;
      const y = (Math.random() - 0.5) * (distance * 0.15);
      
      positions.push(x, y, z);
      
      const colorVar = Math.random() * 0.3 + 0.7;
      const mixedColor = armColor.clone();
      mixedColor.multiplyScalar(isHovered ? colorVar * 3 : colorVar * 2);  // Increased brightness
      colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
      
      const sizeVar = Math.max(0.3, 1 - (distance / FIXED_GALAXY_SIZE));  // Increased minimum size
      sizes.push(sizeVar * (Math.random() * 0.8 + 0.6));  // Increased overall size
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    sizes: new Float32Array(sizes)
  };
};

const GalaxyParticles = memo(({ colorScheme, isHovered }) => {
  const particleRef = useRef();
  const { positions, colors, sizes } = useMemo(() => 
    createSpiralParticles(colorScheme, isHovered), 
    [colorScheme, isHovered]
  );

  useFrame((state) => {
    if (particleRef.current) {
      particleRef.current.rotation.y += 0.002;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  return (
    <points ref={particleRef} geometry={geometry}>
      <pointsMaterial
        size={0.35}  // Increased from 0.3
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
});

const SpiralGalaxy = ({ 
  transactions, 
  position, 
  onClick, 
  isSelected, 
  colorIndex = 0, 
  highlightedHash,
  lodLevel = 'HIGH',
}) => {
  const { camera } = useThree();
  const groupRef = useRef();
  const hitboxRef = useRef();
  const [nameOpacity, setNameOpacity] = useState(NAME_OPACITY_BASE);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);

  const safeColorIndex = Math.abs(colorIndex) % GALAXY_COLORS.length;
  const colorScheme = GALAXY_COLORS[safeColorIndex] || GALAXY_COLORS[0];

  const galaxyKey = useMemo(() => `galaxy-${position.join('-')}`, [position]);
  const galaxyName = useMemo(() => generateGalaxyName(galaxyKey), [galaxyKey]);

  useEffect(() => {
    if (groupRef.current && !isInitialized) {
      setNameOpacity(NAME_OPACITY_BASE);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useFrame(() => {
    if (groupRef.current && isInitialized) {
      const distance = groupRef.current.position.distanceTo(camera.position);
      const opacity = Math.max(0.5, Math.min(0.9, 40 / distance));
      setNameOpacity(opacity);
    }
  });

  const handleGalaxyClick = (e) => {
    e.stopPropagation();
    if (!isSelected) onClick();
  };

  const handlePointerEnter = () => {
    if (isSelected) return;
    
    document.body.style.cursor = 'pointer';
    setIsHovered(true);
    if (window.AudioManager) {
      window.AudioManager.handleGalaxyHover(`galaxy-${position.join('-')}`);
    }
  };
  
  const handlePointerLeave = () => {
    document.body.style.cursor = 'auto';
    setIsHovered(false);
    if (window.AudioManager) {
      window.AudioManager.handleGalaxyHoverEnd();
    }
  };

  return (
    <group ref={groupRef} position={position}>
      {isSelected ? (
        <ZoomedGalaxy
          colorScheme={colorScheme}
          transactions={transactions}
          safeColorIndex={safeColorIndex}
          highlightedHash={highlightedHash}
          setHoveredPlanet={setHoveredPlanet}
          lodLevel={lodLevel}
        />
      ) : (
        <group
          onClick={handleGalaxyClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <mesh ref={hitboxRef}>
            <sphereGeometry args={[FIXED_GALAXY_SIZE * 1.2, 32, 32]} />
            <meshBasicMaterial visible={false} transparent opacity={0} />
          </mesh>

          <GalaxyParticles colorScheme={colorScheme} isHovered={isHovered} />

          {isHovered && (
            <pointLight
              color={colorScheme.core}
              intensity={80}
              distance={180}
              decay={1.5}
            />
          )}

          {!isSelected && isInitialized && (
            <Html
              position={[FIXED_GALAXY_SIZE * 0.8, FIXED_GALAXY_SIZE * 0.3, 0]}
              style={{
                transform: 'translate(0, -50%)',
                opacity: nameOpacity,
                transition: 'opacity 0.3s ease-out',
                pointerEvents: 'none'
              }}
            >
              <div className="galaxy-label-container">
                <div className="galaxy-name">{galaxyName}</div>
                <div 
                  className="galaxy-underline" 
                  style={{
                    backgroundColor: colorScheme.core,
                    boxShadow: `0 0 ${isHovered ? '30px' : '15px'} ${colorScheme.core}`,
                    opacity: isHovered ? 1 : 0.8
                  }}
                />
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
};

export default memo(SpiralGalaxy);