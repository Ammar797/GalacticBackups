import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const useIsInView = (ref, camera, maxDistance = 300) => {
  const [isVisible, setIsVisible] = useState(true);

  useFrame(() => {
    if (!ref.current || !camera) return;

    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    
    projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // Check if object is within frustum and distance
    const distance = ref.current.position.distanceTo(camera.position);
    const isInView = frustum.containsPoint(ref.current.position) && distance < maxDistance;
    
    if (isInView !== isVisible) {
      setIsVisible(isInView);
    }
  });

  return isVisible;
};