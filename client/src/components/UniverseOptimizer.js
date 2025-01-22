import * as THREE from 'three';

class UniverseOptimizer {
  constructor() {
    this.chunks = new Map();
    this.chunkSize = 300; // Increased for better initial distribution
    this.visibleChunks = new Set();
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
    this.boundingSpheres = new Map();
    this.loadedChunks = new Set();
    this.chunkLoadQueue = [];
    this.isLoading = false;
    this.initialized = false;
    this.lastUpdate = 0;
    this.updateInterval = 16; // 60fps target

    // Optimization flags
    this.needsUpdate = true;
    this.frameCount = 0;
    
    // Pre-allocated vectors for calculations
    this.tempVector = new THREE.Vector3();
    this.tempSphere = new THREE.Sphere();
    
    // Dynamic parameters with better initial values
    this.dynamicParams = {
      minRadius: 100,
      maxRadius: 1200,
      verticalSpread: 400,
      densityFactor: 1,
      renderDistance: 4, // Increased for better initial view
      maxGalaxiesPerChunk: 100,
      initialLoadDelay: 100, // ms to wait before full load
      frustumCullingEnabled: true
    };
  }

  initializeChunks(camera) {
    this.camera = camera;
    // Set initial camera position for better overview
    if (camera && !this.initialized) {
      camera.position.set(0, 100, 200);
      camera.lookAt(0, 0, 0);
    }
    this.updateVisibleChunks();
  }

  calculateUniverseParams(galaxyCount, fps) {
    // Only adjust params if we have stable fps readings
    if (this.frameCount < 60) return this.dynamicParams;

    // Scale parameters based on galaxy count and fps
    const scaleFactor = Math.min(1.5, Math.cbrt(galaxyCount / 1000));
    
    if (fps < 30) {
      this.dynamicParams.renderDistance = 3;
      this.dynamicParams.maxGalaxiesPerChunk = 50;
      this.dynamicParams.frustumCullingEnabled = true;
    } else if (fps > 55) {
      this.dynamicParams.renderDistance = 5;
      this.dynamicParams.maxGalaxiesPerChunk = 150;
      this.dynamicParams.frustumCullingEnabled = false;
    }

    // Adjust size based on galaxy count
    this.dynamicParams.maxRadius = Math.max(800, Math.min(1500, 1200 * scaleFactor));
    
    return this.dynamicParams;
  }

  getChunkKey(position) {
    const x = Math.floor(position[0] / this.chunkSize);
    const y = Math.floor(position[1] / this.chunkSize);
    const z = Math.floor(position[2] / this.chunkSize);
    return `${x},${y},${z}`;
  }

  updateChunks(galaxies, positions) {
    this.chunks.clear();
    
    // Pre-calculate chunk assignments
    const chunkAssignments = new Map();
    
    positions.forEach((pos, index) => {
      const chunkKey = this.getChunkKey(pos);
      if (!chunkAssignments.has(chunkKey)) {
        chunkAssignments.set(chunkKey, []);
      }
      chunkAssignments.get(chunkKey).push({ index, pos });
    });

    // Process chunk assignments in batches
    chunkAssignments.forEach((items, chunkKey) => {
      const chunkGalaxies = new Set();
      items.forEach(({ index, pos }) => {
        if (chunkGalaxies.size < this.dynamicParams.maxGalaxiesPerChunk) {
          chunkGalaxies.add({
            galaxy: galaxies[index],
            position: pos,
            index
          });
          
          // Update bounding sphere with optimized calculation
          this.tempVector.set(pos[0], pos[1], pos[2]);
          const radius = Math.sqrt(galaxies[index].transactions.length) * 2;
          this.tempSphere.set(this.tempVector, radius);
          this.boundingSpheres.set(index, this.tempSphere.clone());
        }
      });
      this.chunks.set(chunkKey, chunkGalaxies);
    });
  }

  updateVisibleChunks() {
    if (!this.camera) return;

    // Throttle updates
    const now = performance.now();
    if (now - this.lastUpdate < this.updateInterval && this.initialized) {
      return;
    }
    this.lastUpdate = now;

    // First frame optimization
    if (!this.initialized) {
      this.initialized = true;
      this.dynamicParams.renderDistance = 6; // Wider initial view
      this.dynamicParams.frustumCullingEnabled = false; // Disable culling initially
      setTimeout(() => {
        this.dynamicParams.renderDistance = 4;
        this.dynamicParams.frustumCullingEnabled = true;
      }, this.dynamicParams.initialLoadDelay);
    }

    this.visibleChunks.clear();
    
    // Only update frustum if culling is enabled
    if (this.dynamicParams.frustumCullingEnabled) {
      this.frustum.setFromProjectionMatrix(
        this.projScreenMatrix.multiplyMatrices(
          this.camera.projectionMatrix,
          this.camera.matrixWorldInverse
        )
      );
    }

    const cameraChunk = this.getChunkKey(this.camera.position.toArray());
    const [baseX, baseY, baseZ] = cameraChunk.split(',').map(Number);

    // Optimized chunk checking
    const renderDist = this.dynamicParams.renderDistance;
    for (let x = -renderDist; x <= renderDist; x++) {
      for (let y = -renderDist; y <= renderDist; y++) {
        for (let z = -renderDist; z <= renderDist; z++) {
          // Distance optimization
          if (x*x + y*y + z*z > renderDist * renderDist) continue;
          
          const checkChunk = `${baseX + x},${baseY + y},${baseZ + z}`;
          if (!this.chunks.has(checkChunk)) continue;

          // Quick distance check first
          this.tempVector.set(
            (baseX + x) * this.chunkSize + this.chunkSize / 2,
            (baseY + y) * this.chunkSize + this.chunkSize / 2,
            (baseZ + z) * this.chunkSize + this.chunkSize / 2
          );

          const distToCamera = this.tempVector.distanceTo(this.camera.position);
          if (distToCamera > this.dynamicParams.maxRadius * 1.5) continue;

          // Only do frustum check if enabled
          if (this.dynamicParams.frustumCullingEnabled) {
            this.tempSphere.set(this.tempVector, this.chunkSize * Math.SQRT2);
            if (!this.frustum.intersectsSphere(this.tempSphere)) continue;
          }

          this.visibleChunks.add(checkChunk);
          
          // Efficient chunk loading
          if (!this.loadedChunks.has(checkChunk)) {
            this.queueChunkLoad(checkChunk);
          }
        }
      }
    }

    this.frameCount++;
  }

  queueChunkLoad(chunkKey) {
    if (!this.chunkLoadQueue.includes(chunkKey)) {
      this.chunkLoadQueue.push(chunkKey);
      if (!this.isLoading) {
        this.processLoadQueue();
      }
    }
  }

  async processLoadQueue() {
    if (this.isLoading || this.chunkLoadQueue.length === 0) return;
    
    this.isLoading = true;
    
    // Process chunks in batches for better performance
    while (this.chunkLoadQueue.length > 0) {
      const batch = this.chunkLoadQueue.splice(0, 5); // Process 5 chunks at a time
      batch.forEach(chunkKey => this.loadedChunks.add(chunkKey));
      
      // Small delay between batches to prevent frame drops
      if (this.chunkLoadQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 16)); // One frame delay
      }
    }
    
    this.isLoading = false;
  }

  shouldRenderGalaxy(galaxyIndex, position) {
    // Always render during initial load
    if (!this.initialized || this.frameCount < 60) {
      return true;
    }

    const chunkKey = this.getChunkKey(position);

    // Basic visibility check
    if (!this.visibleChunks.has(chunkKey)) {
      // Distance-based fallback for edge cases
      this.tempVector.set(position[0], position[1], position[2]);
      const distToCamera = this.tempVector.distanceTo(this.camera.position);
      return distToCamera < this.dynamicParams.maxRadius;
    }

    // Skip detailed checks if culling is disabled
    if (!this.dynamicParams.frustumCullingEnabled) {
      return true;
    }

    // Optimized frustum culling
    const sphere = this.boundingSpheres.get(galaxyIndex);
    if (!sphere) return true;

    return this.frustum.intersectsSphere(sphere);
  }

  getLODLevel(distance, fps) {
    // Skip LOD during initial load
    if (!this.initialized || this.frameCount < 60) {
      return 2; // Highest detail
    }

    // Dynamic LOD based on distance and FPS
    let baseLOD = distance > this.dynamicParams.maxRadius * 0.8 ? 0 : 
                  distance > this.dynamicParams.maxRadius * 0.5 ? 1 : 2;

    // Adjust based on performance
    if (fps < 30) {
      baseLOD = Math.max(0, baseLOD - 1);
    } else if (fps > 55 && baseLOD < 2) {
      baseLOD++;
    }

    return baseLOD;
  }

  clearUnusedData() {
    if (!this.initialized) return;
    
    // Remove chunks that haven't been visible recently
    const chunksToRemove = Array.from(this.loadedChunks)
      .filter(key => !this.visibleChunks.has(key));

    chunksToRemove.forEach(key => {
      this.loadedChunks.delete(key);
    });
  }

  getStats() {
    return {
      visibleChunks: this.visibleChunks.size,
      loadedChunks: this.loadedChunks.size,
      queuedChunks: this.chunkLoadQueue.length,
      totalChunks: this.chunks.size,
      fps: Math.round(1000 / (performance.now() - this.lastUpdate)),
      frameCount: this.frameCount
    };
  }
}

export default UniverseOptimizer;