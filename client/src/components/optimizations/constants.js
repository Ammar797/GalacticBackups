// optimizations/constants.js
export const LOD_DISTANCES = {
    HIGH: 200,
    MEDIUM: 500,
    LOW: 1000
  };
  
  export const LOD_LEVELS = {
    HIGH: {
      galaxyParticles: 6000,
      planetDetail: 32,
      planetParticles: 1000
    },
    MEDIUM: {
      galaxyParticles: 3000,
      planetDetail: 16,
      planetParticles: 500
    },
    LOW: {
      galaxyParticles: 1000,
      planetDetail: 8,
      planetParticles: 200
    }
  };
  
  export const CHUNK_SIZE = 200;
  export const RENDER_DISTANCE = 3;