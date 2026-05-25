"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeDBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
      });
    } catch (err) {
      console.error("[ThreeDBackground] WebGL unavailable:", err);
      return;
    }

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.015);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 20;

    // 3. Renderer Setup
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Create Particles (Atomic nutrients floating)
    const particleCount = 60;
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    // Distribute particles in a 3D box
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35;     // X
      positions[i * 3 + 1] = (Math.random() - 0.5) * 35; // Y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // Z

      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.01,
      });
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.12,
      transparent: true,
      opacity: 0.5,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Line connections for constellation effect
    const maxDistance = 7.5;
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x39ff14,
      transparent: true,
      opacity: 0.08,
    });

    // Create a dynamic line segment mesh
    const lineGeo = new THREE.BufferGeometry();
    // Maximum possible lines is count * (count - 1) / 2
    // We allocate a buffer large enough
    const maxLinePoints = particleCount * 4;
    const linePositions = new Float32Array(maxLinePoints * 3);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // 6. Interactive Mouse Drift variables
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 7. Animation Loop
    let animationFrameId: number;
    const posArr = particles.geometry.attributes.position.array as Float32Array;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Mouse drag inertia
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Camera responds gently to mouse
      camera.position.x = targetX * 4;
      camera.position.y = targetY * 4;
      camera.lookAt(0, 0, 0);

      // Update positions based on velocity and boundary wrap
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3] += velocities[i].x;
        posArr[i * 3 + 1] += velocities[i].y;
        posArr[i * 3 + 2] += velocities[i].z;

        // Boundaries wrap
        if (Math.abs(posArr[i * 3]) > 20) velocities[i].x *= -1;
        if (Math.abs(posArr[i * 3 + 1]) > 20) velocities[i].y *= -1;
        if (Math.abs(posArr[i * 3 + 2]) > 15) velocities[i].z *= -1;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Re-calculate constellation lines
      let lineIdx = 0;
      const linePosArr = lines.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const x1 = posArr[i * 3];
        const y1 = posArr[i * 3 + 1];
        const z1 = posArr[i * 3 + 2];

        for (let j = i + 1; j < particleCount; j++) {
          const x2 = posArr[j * 3];
          const y2 = posArr[j * 3 + 1];
          const z2 = posArr[j * 3 + 2];

          const dist = Math.sqrt(
            (x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2
          );

          if (dist < maxDistance && lineIdx < maxLinePoints - 2) {
            // Point 1
            linePosArr[lineIdx * 3] = x1;
            linePosArr[lineIdx * 3 + 1] = y1;
            linePosArr[lineIdx * 3 + 2] = z1;

            // Point 2
            linePosArr[(lineIdx + 1) * 3] = x2;
            linePosArr[(lineIdx + 1) * 3 + 1] = y2;
            linePosArr[(lineIdx + 1) * 3 + 2] = z2;

            lineIdx += 2;
          }
        }
      }

      // Fill rest of the buffer with zeroes or offscreen points
      for (let i = lineIdx; i < maxLinePoints; i++) {
        linePosArr[i * 3] = 0;
        linePosArr[i * 3 + 1] = 0;
        linePosArr[i * 3 + 2] = -999;
      }
      lines.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Handle Window Resize
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      particleGeo.dispose();
      particleMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 w-screen h-screen z-0 pointer-events-none opacity-[0.35] overflow-hidden"
    />
  );
}
