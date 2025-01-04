import * as THREE from 'three';

class UniverseOptimizer {
  constructor() {
    this.chunks = new Map();
    this.chunkSize = 200; // Increased chunk size for better distribution
    this.visibleChunks = new Set();
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
    this.boundingSpheres = new Map();
    this.loadedChunks = new Set();
    this.chunkLoadQueue = [];
    this.isLoading = false;
    
    // Dynamic parameters that adjust based on performance
    this.dynamicParams = {
      minRadius: 200,
      maxRadius: 800,
      verticalSpread: 300,
      densityFactor: 0.8,
      renderDistance: 3, // Number of chunks to render in each direction
      maxGalaxiesPerChunk: 50
    };
  }

  // Initialize chunk system with camera
  initializeChunks(camera) {
    this.camera = camera;
    this.updateVisibleChunks();
  }

  // Calculate optimal universe parameters based on performance
  calculateUniverseParams(galaxyCount, fps) {
    const scaleFactor = Math.cbrt(galaxyCount / 100);
    
    // Adjust parameters based on FPS
    if (fps < 30) {
      this.dynamicParams.renderDistance = 2;
      this.dynamicParams.maxGalaxiesPerChunk = 30;
    } else if (fps > 50) {
      this.dynamicParams.renderDistance = 4;
      this.dynamicParams.maxGalaxiesPerChunk = 70;
    }

    return this.dynamicParams;
  }

  // Get chunk key from position
  getChunkKey(position) {
    const x = Math.floor(position[0] / this.chunkSize);
    const y = Math.floor(position[1] / this.chunkSize);
    const z = Math.floor(position[2] / this.chunkSize);
    return `${x},${y},${z}`;
  }

  // Update chunks based on new galaxy positions
  updateChunks(galaxies, positions) {
    this.chunks.clear();
    
    galaxies.forEach((galaxy, index) => {
      const pos = positions[index];
      const chunkKey = this.getChunkKey(pos);
      
      if (!this.chunks.has(chunkKey)) {
        this.chunks.set(chunkKey, new Set());
      }
      this.chunks.get(chunkKey).add({
        galaxy,
        position: pos,
        index
      });

      // Update bounding sphere
      const sphere = new THREE.Sphere(
        new THREE.Vector3(...pos),
        Math.sqrt(galaxy.transactions.length) * 2
      );
      this.boundingSpheres.set(index, sphere);
    });
  }

  // Update visible chunks based on camera position and frustum
  updateVisibleChunks() {
    if (!this.camera) return;

    this.visibleChunks.clear();
    this.frustum.setFromProjectionMatrix(
      this.projScreenMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      )
    );

    const cameraChunk = this.getChunkKey(this.camera.position.toArray());
    const [baseX, baseY, baseZ] = cameraChunk.split(',').map(Number);

    // Check chunks in view frustum
    for (let x = -this.dynamicParams.renderDistance; x <= this.dynamicParams.renderDistance; x++) {
      for (let y = -this.dynamicParams.renderDistance; y <= this.dynamicParams.renderDistance; y++) {
        for (let z = -this.dynamicParams.renderDistance; z <= this.dynamicParams.renderDistance; z++) {
          const checkChunk = `${baseX + x},${baseY + y},${baseZ + z}`;
          
          if (this.chunks.has(checkChunk)) {
            const chunkCenter = new THREE.Vector3(
              (baseX + x) * this.chunkSize + this.chunkSize / 2,
              (baseY + y) * this.chunkSize + this.chunkSize / 2,
              (baseZ + z) * this.chunkSize + this.chunkSize / 2
            );
            
            const chunkSphere = new THREE.Sphere(chunkCenter, this.chunkSize * Math.SQRT2);
            
            if (this.frustum.intersectsSphere(chunkSphere)) {
              this.visibleChunks.add(checkChunk);
              
              // Queue chunk for loading if not already loaded
              if (!this.loadedChunks.has(checkChunk)) {
                this.queueChunkLoad(checkChunk);
              }
            }
          }
        }
      }
    }
  }

  // Queue chunk for loading
  queueChunkLoad(chunkKey) {
    if (!this.chunkLoadQueue.includes(chunkKey)) {
      this.chunkLoadQueue.push(chunkKey);
      this.processLoadQueue();
    }
  }

  // Process chunk load queue
  async processLoadQueue() {
    if (this.isLoading || this.chunkLoadQueue.length === 0) return;
    
    this.isLoading = true;
    const chunkKey = this.chunkLoadQueue.shift();
    
    // Simulate chunk loading delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.loadedChunks.add(chunkKey);
    this.isLoading = false;
    
    // Continue processing queue
    if (this.chunkLoadQueue.length > 0) {
      this.processLoadQueue();
    }
  }

  // Check if a galaxy should be rendered
  shouldRenderGalaxy(galaxyIndex, position) {
    const chunkKey = this.getChunkKey(position);
    
    // Check if chunk is visible and loaded
    if (!this.visibleChunks.has(chunkKey) || !this.loadedChunks.has(chunkKey)) {
      return false;
    }

    // Frustum culling check
    const sphere = this.boundingSpheres.get(galaxyIndex);
    if (!sphere) return true;
    
    return this.frustum.intersectsSphere(sphere);
  }

  // Get LOD level based on distance and performance
  getLODLevel(distance, fps) {
    const baseLOD = distance > 1000 ? 0 : distance > 500 ? 1 : 2;
    
    // Adjust LOD based on performance
    if (fps < 30) {
      return Math.max(0, baseLOD - 1);
    }
    
    return baseLOD;
  }

  // Clear unused chunk data
  clearUnusedData() {
    // Remove chunks that are far from visible chunks
    const chunksToRemove = Array.from(this.loadedChunks)
      .filter(key => !this.visibleChunks.has(key));
    
    chunksToRemove.forEach(key => {
      this.loadedChunks.delete(key);
    });
  }

  // Get optimization statistics
  getStats() {
    return {
      visibleChunks: this.visibleChunks.size,
      loadedChunks: this.loadedChunks.size,
      queuedChunks: this.chunkLoadQueue.length,
      totalChunks: this.chunks.size
    };
  }
}

export default UniverseOptimizer;