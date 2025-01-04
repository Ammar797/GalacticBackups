import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

//Constants for star field configuration
const STAR_CONFIG = {
  COUNT: 5000,
  INITIAL_RADIUS: 10,
  MAX_DISTANCE: 1000,
  BASE_SPEED: 60,
  MIN_TRAIL_LENGTH: 20,
  MAX_TRAIL_LENGTH: 100,
  TRAIL_DISTANCE_FACTOR: 0.1,
  COLORS: [
    '#FFFFFF', // White
    '#B0C4DE', // Light steel blue
    '#E6E6FA', // Lavender
    '#87CEEB', // Sky blue
    '#ADD8E6'  // Light blue
  ].map(color => new THREE.Color(color))
};

//UniverseReveal - Creates an expanding star field effect
const UniverseReveal = ({ active }) => {
  const meshRef = useRef();
  
  // Create geometry and material for star field
  const [geometry, material] = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_CONFIG.COUNT * 6); // x,y,z for point + trail
    const colors = new Float32Array(STAR_CONFIG.COUNT * 6);
    const velocities = new Float32Array(STAR_CONFIG.COUNT * 3);
    
    //Initialize a single star's properties
    const initializeStar = (index) => {
      const baseIndex = index * 6;
      const velocityIndex = index * 3;
      
      // Calculate initial position in spherical coordinates
      const radius = Math.random() * STAR_CONFIG.INITIAL_RADIUS;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      // Convert to Cartesian coordinates
      const position = {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi)
      };
      
      // Set initial positions for star and its trail
      positions[baseIndex] = position.x;
      positions[baseIndex + 1] = position.y;
      positions[baseIndex + 2] = position.z;
      positions[baseIndex + 3] = position.x;
      positions[baseIndex + 4] = position.y;
      positions[baseIndex + 5] = position.z;
      
      // Calculate outward velocity
      const speed = 1 + Math.random() * 2;
      velocities[velocityIndex] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[velocityIndex + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[velocityIndex + 2] = Math.cos(phi) * speed;
      
      // Assign random color with brightness variation
      const color = STAR_CONFIG.COLORS[Math.floor(Math.random() * STAR_CONFIG.COLORS.length)];
      const brightness = 0.7 + Math.random() * 0.3;
      
      // Set colors for star and trail
      colors[baseIndex] = color.r * brightness;
      colors[baseIndex + 1] = color.g * brightness;
      colors[baseIndex + 2] = color.b * brightness;
      colors[baseIndex + 3] = color.r * brightness * 0.3; // Fainter trail
      colors[baseIndex + 4] = color.g * brightness * 0.3;
      colors[baseIndex + 5] = color.b * brightness * 0.3;
    };

    // Initialize all stars
    for (let i = 0; i < STAR_CONFIG.COUNT; i++) {
      initializeStar(i);
    }

    // Create geometry attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    // Create material with additive blending
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return [geometry, material];
  }, []);

  // Animation frame update
  useFrame((state, delta) => {
    if (!active || !meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position.array;
    const velocities = meshRef.current.geometry.attributes.velocity.array;
    const speed = delta * STAR_CONFIG.BASE_SPEED;
    
    //Update a single star's position and trail
    const updateStar = (index) => {
      const baseIndex = index * 6;
      const velocityIndex = index * 3;
      
      // Update star position
      positions[baseIndex] += velocities[velocityIndex] * speed;
      positions[baseIndex + 1] += velocities[velocityIndex + 1] * speed;
      positions[baseIndex + 2] += velocities[velocityIndex + 2] * speed;
      
      // Calculate distance from center
      const distanceFromCenter = Math.sqrt(
        positions[baseIndex] * positions[baseIndex] +
        positions[baseIndex + 1] * positions[baseIndex + 1] +
        positions[baseIndex + 2] * positions[baseIndex + 2]
      );
      
      // Calculate dynamic trail length
      const trailLength = Math.min(
        STAR_CONFIG.MAX_TRAIL_LENGTH,
        STAR_CONFIG.MIN_TRAIL_LENGTH + distanceFromCenter * STAR_CONFIG.TRAIL_DISTANCE_FACTOR
      );
      
      // Update trail position
      positions[baseIndex + 3] = positions[baseIndex] - velocities[velocityIndex] * trailLength;
      positions[baseIndex + 4] = positions[baseIndex + 1] - velocities[velocityIndex + 1] * trailLength;
      positions[baseIndex + 5] = positions[baseIndex + 2] - velocities[velocityIndex + 2] * trailLength;
      
      // Reset star if too far
      if (distanceFromCenter > STAR_CONFIG.MAX_DISTANCE) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        // Reset position to center
        positions[baseIndex] = 0;
        positions[baseIndex + 1] = 0;
        positions[baseIndex + 2] = 0;
        positions[baseIndex + 3] = 0;
        positions[baseIndex + 4] = 0;
        positions[baseIndex + 5] = 0;
        
        // New velocity direction
        const speed = 1 + Math.random() * 2;
        velocities[velocityIndex] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[velocityIndex + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        velocities[velocityIndex + 2] = Math.cos(phi) * speed;
      }
    };

    // Update all stars
    for (let i = 0; i < STAR_CONFIG.COUNT; i++) {
      updateStar(i);
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return active ? <lineSegments ref={meshRef} geometry={geometry} material={material} /> : null;
};

export default React.memo(UniverseReveal);