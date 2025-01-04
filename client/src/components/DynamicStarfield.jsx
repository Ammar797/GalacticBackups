import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

//DynamicStarfield - Creates a static starfield visualization

const DynamicStarfield = memo(() => {
  // Refs for Three.js objects
  const pointsRef = useRef();
  const glowPointsRef = useRef();
  
  // Create geometry and materials once on mount
  const [geometry, materials] = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const STAR_COUNT = 12000;
    const SPACE_RANGE = 2500; // Defines the size of star field

    // Initialize arrays for star properties
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    
    // Define star color distribution
    const starColors = [
      { color: new THREE.Color('#FFFFFF'), weight: 65 },  // White stars
      { color: new THREE.Color('#BBDDFF'), weight: 20 },  // Blue-white
      { color: new THREE.Color('#99CCFF'), weight: 10 },  // Blue
      { color: new THREE.Color('#AADDFF'), weight: 3 },   // Bright blue
      { color: new THREE.Color('#FFEECC'), weight: 1.5 }, // Slight yellow
      { color: new THREE.Color('#FFE4B5'), weight: 0.5 }  // Pale golden
    ];
    
    // Calculate color probabilities
    const totalWeight = starColors.reduce((sum, type) => sum + type.weight, 0);
    const colorProbabilities = starColors.map(type => type.weight / totalWeight);

    // Initialize star positions and colors
    for (let i = 0; i < positions.length; i += 3) {
      // Random position within space range
      positions[i] = (Math.random() - 0.5) * SPACE_RANGE;
      positions[i + 1] = (Math.random() - 0.5) * SPACE_RANGE;
      positions[i + 2] = (Math.random() - 0.5) * SPACE_RANGE;

      // Select color based on probability distribution
      let cumulative = 0;
      const rand = Math.random();
      const selectedColor = starColors.find(({ weight }) => {
        cumulative += weight / totalWeight;
        return rand <= cumulative;
      })?.color || starColors[0].color;

      colors[i] = selectedColor.r;
      colors[i + 1] = selectedColor.g;
      colors[i + 2] = selectedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create enhanced star texture
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    const center = 64;

    // Helper function to draw star spikes
    const drawSpike = (ctx, x, y, length, width, intensity, angle = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      
      const gradient = ctx.createLinearGradient(0, -length, 0, length);
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(0.3, `rgba(255, 255, 255, ${intensity * 0.1})`);
      gradient.addColorStop(0.4, `rgba(255, 255, 255, ${intensity * 0.4})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity})`);
      gradient.addColorStop(0.6, `rgba(255, 255, 255, ${intensity * 0.4})`);
      gradient.addColorStop(0.7, `rgba(255, 255, 255, ${intensity * 0.1})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -length);
      ctx.lineTo(0, length);
      ctx.stroke();
      ctx.restore();
    };

    // Helper function to draw star glow
    const drawGlow = (radius, alpha) => {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(0.2, `rgba(230, 240, 255, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.4})`);
      gradient.addColorStop(0.8, `rgba(180, 200, 255, ${alpha * 0.2})`);
      gradient.addColorStop(1, 'rgba(150, 180, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    };

    // Draw star texture layers
    [64, 48, 32, 24].forEach((radius, i) => {
      drawGlow(radius, 0.2 + (i * 0.1));
    });

    // Draw primary spikes
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      drawSpike(ctx, center, center, 60, 2, 1.0, angle);
      drawSpike(ctx, center, center, 58, 1.5, 0.7, angle + 0.02);
    }

    // Draw secondary spikes
    for (let i = 0; i < 4; i++) {
      drawSpike(ctx, center, center, 45, 1, 0.5, (i * Math.PI) / 2 + Math.PI / 4);
    }

    // Draw star core
    const coreGradient = ctx.createRadialGradient(center, center, 0, center, center, 8);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(0.3, 'rgba(240, 248, 255, 0.8)');
    coreGradient.addColorStop(0.5, 'rgba(220, 235, 255, 0.6)');
    coreGradient.addColorStop(0.7, 'rgba(200, 220, 255, 0.4)');
    coreGradient.addColorStop(1, 'rgba(180, 200, 255, 0)');

    ctx.beginPath();
    ctx.fillStyle = coreGradient;
    ctx.arc(center, center, 8, 0, Math.PI * 2);
    ctx.fill();

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create materials for core and glow layers
    const materials = [
      new THREE.PointsMaterial({
        size: 3,
        map: texture,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
      new THREE.PointsMaterial({
        size: 5,
        map: texture,
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    ];

    return [geometry, materials];
  }, []);

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={materials[0]} />
      <points ref={glowPointsRef} geometry={geometry} material={materials[1]} />
    </>
  );
});

export default DynamicStarfield;