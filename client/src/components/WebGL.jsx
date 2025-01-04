import { useState, useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const WebGL = () => {
  const { gl, invalidate, scene, camera } = useThree();
  const [lastFrameTime, setLastFrameTime] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [detailLevel, setDetailLevel] = useState('high');

  const checkPerformance = useCallback(() => {
    const currentTime = performance.now();
    if (lastFrameTime) {
      const delta = currentTime - lastFrameTime;
      if (delta > 50) {
        console.warn('Performance warning: Frame time:', delta.toFixed(2), 'ms');
        
        // Gradually reduce detail instead of disposing geometry
        if (detailLevel === 'high') {
          setDetailLevel('medium');
        } else if (detailLevel === 'medium') {
          setDetailLevel('low');
        }
        
        // Emit detail level change event
        window.dispatchEvent(new CustomEvent('detailLevelChange', {
          detail: { level: detailLevel }
        }));
      }
    }
    setLastFrameTime(currentTime);
    setFrameCount(prev => prev + 1);
  }, [lastFrameTime, detailLevel]);

  const handleContextLost = useCallback((event) => {
    event.preventDefault();
    console.warn('WebGL context lost');
    if (window.wsConnection) {
      window.wsConnection.send(JSON.stringify({
        type: 'pause',
        reason: 'context_lost'
      }));
    }
  }, []);

  const handleContextRestored = useCallback(() => {
    console.log('WebGL context restored');
    if (gl) {
      gl.setSize(gl.domElement.width, gl.domElement.height);
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.25)); // Further reduced pixel ratio
      gl.shadowMap.enabled = false; // Disable shadows for performance
      gl.powerPreference = 'high-performance';
      gl.antialias = false;
      
      // Enable texture compression
      const ext = gl.getExtension('WEBGL_compressed_texture_s3tc');
      if (ext) {
        gl.compressedTexImage2D = ext.compressedTexImage2D.bind(ext);
      }
      
      invalidate();
    }
  }, [gl, invalidate]);

  useEffect(() => {
    if (!gl?.domElement) return;

    const canvas = gl.domElement;
    
    // Initial optimizations
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    gl.shadowMap.enabled = false;
    gl.powerPreference = 'high-performance';
    gl.antialias = false;
    
    // Enable frustum culling
    scene.traverse((object) => {
      if (object.isMesh) {
        object.frustumCulled = true;
      }
    });

    // Throttled animation frame
    let lastRender = 0;
    const minFrameTime = 1000 / 30; // Cap at 30 FPS
    
    let animationFrameId;
    const animate = (timestamp) => {
      if (timestamp - lastRender >= minFrameTime) {
        checkPerformance();
        lastRender = timestamp;
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, handleContextLost, handleContextRestored, checkPerformance, scene]);

  return null;
};

export const createTransactionProcessor = (wsConnection) => {
  let processingQueue = [];
  let isProcessing = false;
  const maxBatchSize = 25; // Reduced batch size
  
  const processQueue = async () => {
    if (isProcessing || processingQueue.length === 0) return;
    
    isProcessing = true;
    const batch = processingQueue.splice(0, maxBatchSize);
    
    try {
      const uniqueTransactions = new Map();
      batch.forEach(tx => {
        if (!uniqueTransactions.has(tx.hash)) {
          uniqueTransactions.set(tx.hash, tx);
        }
      });
      
      window.dispatchEvent(new CustomEvent('newTransactions', {
        detail: { transactions: Array.from(uniqueTransactions.values()) }
      }));
      
    } catch (error) {
      console.error('Error processing transaction batch:', error);
      processingQueue.unshift(...batch);
    }
    
    isProcessing = false;
    if (processingQueue.length > 0) {
      setTimeout(processQueue, 200); // Increased delay between batches
    }
  };
  
  return {
    addTransaction: (transaction) => {
      processingQueue.push(transaction);
      requestAnimationFrame(processQueue); // Use rAF for better timing
    },
    clearQueue: () => {
      processingQueue = [];
      isProcessing = false;
    }
  };
};

export default WebGL;