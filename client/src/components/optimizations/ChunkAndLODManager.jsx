// optimizations/ChunkAndLODManager.jsx
import { memo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LOD_DISTANCES, CHUNK_SIZE, RENDER_DISTANCE } from './constants';

const ChunkAndLODManager = memo(({ 
  galaxies, 
  solitaryPlanets, 
  selectedGalaxy, 
  calculateGalaxyPosition, 
  onUpdateVisible, 
  onUpdateLOD 
}) => {
  const { camera } = useThree();
  const chunks = useRef(new Map());
  const currentLODs = useRef(new Map());
  const currentVisibleRef = useRef(new Set());

  const getChunkKey = (x, y, z) => `${x},${y},${z}`;
  
  const getChunkCoords = (position) => ({
    x: Math.floor(position[0] / CHUNK_SIZE),
    y: Math.floor(position[1] / CHUNK_SIZE),
    z: Math.floor(position[2] / CHUNK_SIZE)
  });

  const calculateLODLevel = (distance) => {
    if (distance <= LOD_DISTANCES.HIGH) return 'HIGH';
    if (distance <= LOD_DISTANCES.MEDIUM) return 'MEDIUM';
    return 'LOW';
  };

  useFrame(() => {
    if (selectedGalaxy) return;

    const cameraPosition = camera.position;
    const cameraChunk = getChunkCoords([cameraPosition.x, cameraPosition.y, cameraPosition.z]);
    
    const visibleObjects = new Set();
    const newLODs = new Map();

    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
      for (let y = -RENDER_DISTANCE; y <= RENDER_DISTANCE; y++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
          const chunkX = cameraChunk.x + x;
          const chunkY = cameraChunk.y + y;
          const chunkZ = cameraChunk.z + z;
          const chunkKey = getChunkKey(chunkX, chunkY, chunkZ);

          if (!chunks.current.has(chunkKey)) {
            const chunkObjects = new Set();
            
            galaxies.forEach((galaxy, index) => {
              const pos = calculateGalaxyPosition(index, galaxies.length);
              const objChunk = getChunkCoords(pos);
              
              if (objChunk.x === chunkX && objChunk.y === chunkY && objChunk.z === chunkZ) {
                chunkObjects.add(`galaxy-${index}`);
              }
            });

            solitaryPlanets.forEach((planet, index) => {
              const pos = calculateGalaxyPosition(
                index + galaxies.length,
                solitaryPlanets.length + galaxies.length
              );
              const objChunk = getChunkCoords(pos);
              
              if (objChunk.x === chunkX && objChunk.y === chunkY && objChunk.z === chunkZ) {
                chunkObjects.add(`planet-${index}`);
              }
            });

            chunks.current.set(chunkKey, chunkObjects);
          }

          const chunkObjects = chunks.current.get(chunkKey);
          chunkObjects.forEach(objectId => {
            visibleObjects.add(objectId);
            
            const [prefix, index] = objectId.split('-');
            const position = prefix === 'galaxy' 
              ? calculateGalaxyPosition(parseInt(index), galaxies.length)
              : calculateGalaxyPosition(
                  parseInt(index) + galaxies.length,
                  solitaryPlanets.length + galaxies.length
                );
            
            const distance = new THREE.Vector3(...position)
              .distanceTo(camera.position);
            
            newLODs.set(objectId, calculateLODLevel(distance));
          });
        }
      }
    }

    if (!areSetsEqual(visibleObjects, currentVisibleRef.current)) {
      currentVisibleRef.current = visibleObjects;
      onUpdateVisible(visibleObjects);
    }

    if (!areMapsEqual(newLODs, currentLODs.current)) {
      currentLODs.current = newLODs;
      onUpdateLOD(newLODs);
    }
  });

  return null;
});

const areSetsEqual = (a, b) => 
  a.size === b.size && [...a].every(value => b.has(value));

const areMapsEqual = (a, b) => 
  a.size === b.size && 
  [...a.entries()].every(([key, value]) => b.get(key) === value);

export default ChunkAndLODManager;