import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Configuration for skybox
 */
const SKYBOX_CONFIG = {
  SIZE: 2000,
  BASE_OPACITY: 0.9,
  ROTATION_SPEED: 0.0001,
  FADE_DURATION: 0.5,
  SIDES: ['front', 'back', 'top', 'bottom', 'left', 'right'],
  POSITIONS: {
    front: [0, 0, -1000],
    back: [0, 0, 1000],
    top: [0, 1000, 0],
    bottom: [0, -1000, 0],
    left: [-1000, 0, 0],
    right: [1000, 0, 0]
  },
  ROTATIONS: {
    front: [0, 0, 0],
    back: [0, Math.PI, 0],
    top: [Math.PI/2, 0, 0],
    bottom: [-Math.PI/2, 0, 0],
    left: [0, Math.PI/2, 0],
    right: [0, -Math.PI/2, 0]
  }
};

/**
 * UniverseSkybox - Creates a dynamic skybox with fade effects
 */
const UniverseSpere = memo(({ selectedGalaxy, hyperspaceActive }) => {
  const groupRef = useRef();
  const rotationRef = useRef(0);
  const [textureErrors, setTextureErrors] = useState({});
  const fadeStartTimeRef = useRef(null);
  const opacityRef = useRef(1);
  const previousHyperspaceRef = useRef(hyperspaceActive);
  const fadeModeRef = useRef(null);

  /**
   * Initialize textures for all sides of the skybox
   */
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    
    return SKYBOX_CONFIG.SIDES.reduce((acc, side) => {
      acc[side] = loader.load(
        `/textures/${side}.png`,
        undefined,
        undefined,
        (error) => {
          console.warn(`Texture failed to load for ${side}:`, error);
          setTextureErrors(prev => ({ ...prev, [side]: true }));
        }
      );
      // Optimize texture settings
      acc[side].minFilter = THREE.LinearFilter;
      acc[side].magFilter = THREE.LinearFilter;
      acc[side].generateMipmaps = false;
      return acc;
    }, {});
  }, []);

  /**
   * Handle animation frame updates
   */
  useFrame(({ clock, camera }) => {
    if (!groupRef.current) return;

    // Update position and rotation
    groupRef.current.position.copy(camera.position);
    rotationRef.current += SKYBOX_CONFIG.ROTATION_SPEED;
    groupRef.current.rotation.y = rotationRef.current;
    
    // Handle hyperspace transition
    if (hyperspaceActive !== previousHyperspaceRef.current) {
      fadeStartTimeRef.current = clock.elapsedTime;
      fadeModeRef.current = hyperspaceActive ? 'out' : 'in';
      previousHyperspaceRef.current = hyperspaceActive;
    }
    
    // Process fade animation
    if (fadeStartTimeRef.current !== null) {
      const fadeElapsed = clock.elapsedTime - fadeStartTimeRef.current;
      
      // Calculate opacity based on fade mode
      if (fadeModeRef.current === 'out') {
        opacityRef.current = Math.max(0, 1 - (fadeElapsed / SKYBOX_CONFIG.FADE_DURATION));
      } else {
        opacityRef.current = Math.min(1, fadeElapsed / SKYBOX_CONFIG.FADE_DURATION);
      }
      
      // Update material opacities
      groupRef.current.children.forEach(child => {
        if (child.material) {
          child.material.opacity = child.material.baseOpacity * opacityRef.current;
        }
      });
      
      // Reset fade when complete
      if (fadeElapsed >= SKYBOX_CONFIG.FADE_DURATION) {
        fadeStartTimeRef.current = null;
        fadeModeRef.current = null;
      }
    }
    
    // Control visibility based on galaxy selection
    groupRef.current.visible = !selectedGalaxy || fadeModeRef.current === 'in';
  });

  /**
   * Store initial opacity values
   */
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach(child => {
        if (child.material) {
          child.material.baseOpacity = child.material.opacity;
        }
      });
    }
  }, []);

  /**
   * Create a single plane for the skybox
   */
  const createPlane = (side) => {
    if (textureErrors[side]) return null;
    
    return (
      <mesh 
        key={side}
        position={SKYBOX_CONFIG.POSITIONS[side]} 
        rotation={SKYBOX_CONFIG.ROTATIONS[side]}
      >
        <planeGeometry args={[SKYBOX_CONFIG.SIZE, SKYBOX_CONFIG.SIZE]} />
        <meshBasicMaterial
          map={textures[side]}
          side={THREE.DoubleSide}
          transparent={true}
          opacity={SKYBOX_CONFIG.BASE_OPACITY}
          depthWrite={false}
          depthTest={false}
          fog={false}
          color="#ffffff"
        />
      </mesh>
    );
  };

  return (
    <group ref={groupRef} renderOrder={-2000}>
      {SKYBOX_CONFIG.SIDES.map(side => createPlane(side))}
    </group>
  );
});

export default UniverseSpere;