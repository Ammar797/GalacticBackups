import * as THREE from 'three';

// Generate random position within bounds
export const randomPosition = (radius) => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
};

// Calculate planet size based on transaction amount
export const calculatePlanetSize = (amount, minSize = 0.5, maxSize = 2) => {
  const logAmount = Math.log10(amount + 1);
  const maxLogAmount = Math.log10(2000 + 1); // Maximum expected amount
  return minSize + (logAmount / maxLogAmount) * (maxSize - minSize);
};

// Generate galaxy particles
export const generateGalaxyGeometry = (count, radius) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  const colorInside = new THREE.Color('#ff88aa');
  const colorOutside = new THREE.Color('#88aaff');

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * radius;
    const spinAngle = radius * 5;
    const branchAngle = (i % 3) * Math.PI * 2 / 3;

    const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.3;
    const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.3;
    const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.3;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / radius);

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    scales[i] = Math.random();
  }

  return { positions, colors, scales };
};

// Create planet material
export const createPlanetMaterial = (color = 0x44aaff) => {
  return new THREE.MeshPhongMaterial({
    color,
    shininess: 15,
    metalness: 0.3,
    roughness: 0.7,
    emissive: new THREE.Color(color).multiplyScalar(0.2)
  });
};