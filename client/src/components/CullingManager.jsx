import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

const CullingManager = memo(({ galaxies, solitaryPlanets, selectedGalaxy, searchResult, calculateGalaxyPosition, onSetVisible }) => {
  const { camera, size } = useThree();
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const visibleObjects = useRef(new Set());

  useFrame(() => {
    // Update the frustum
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const newVisibleObjects = new Set();
    const maxDistance = 1000; // Maximum render distance
    const minDistance = 50;   // Distance at which to start fading objects

    // Helper function to check if position is in view
    const isInView = (position) => {
      const point = new THREE.Vector3(...position);
      const distance = camera.position.distanceTo(point);
      
      // Early return if object is too far
      if (distance > maxDistance) return false;
      
      // Check if point is in frustum
      if (!frustum.containsPoint(point)) return false;
      
      // Calculate visibility factor based on distance
      const visibilityFactor = distance < minDistance ? 1 : 
        1 - Math.min(1, (distance - minDistance) / (maxDistance - minDistance));
      
      return visibilityFactor > 0.1; // Only render if more than 10% visible
    };

    // Check galaxies
    if (!selectedGalaxy) {
      galaxies.forEach((galaxy, index) => {
        const position = calculateGalaxyPosition(index, galaxies.length);
        if (isInView(position)) {
          newVisibleObjects.add(`galaxy-${index}`);
        }
      });

      // Check solitary planets
      solitaryPlanets.forEach((planet, index) => {
        const position = calculateGalaxyPosition(
          index + galaxies.length,
          solitaryPlanets.length + galaxies.length
        );
        if (isInView(position)) {
          newVisibleObjects.add(`planet-${index}`);
        }
      });
    } else {
      // If a galaxy is selected, only render that galaxy
      newVisibleObjects.add(`galaxy-${galaxies.indexOf(selectedGalaxy)}`);
    }

    // Update visibility if changed
    if (JSON.stringify([...visibleObjects.current]) !== JSON.stringify([...newVisibleObjects])) {
      visibleObjects.current = newVisibleObjects;
      onSetVisible(newVisibleObjects);
    }
  });

  return null;
});


export default CullingManager;