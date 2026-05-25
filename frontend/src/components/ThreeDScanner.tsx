
"use client";

import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeDScannerProps {
  category?: string;
  isScanning?: boolean;
}

export default function ThreeDScanner({ category = "Grain", isScanning = false }: ThreeDScannerProps) {
  console.log("ThreeDScanner component mounted");

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useLayoutEffect(() => 
    {
    console.log("useLayoutEffect started");
    const container = containerRef.current;
    if (!container) return;

    let camera: THREE.PerspectiveCamera | null = null;
    let animationFrameId: number | null = null;
    let clock: THREE.Clock | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let handleMouseMove: ((e: MouseEvent) => void) | null = null;

    const setDataset = (status: string, error?: unknown) => {
      try {
        container.dataset.threed = status;
        if (error) {
          container.dataset.threedErr = String(error);
        }
      } catch (e) {
        // ignore dataset write failures
      }
    };

    const logDebug = (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.debug("[ThreeDScanner]", ...args);
    };

    const tryInitScene = () => {
      const measuredWidth = container.clientWidth || container.parentElement?.clientWidth || window.innerWidth || 800;
      const measuredHeight = container.clientHeight || 500;
      const width = Math.max(200, Math.round(measuredWidth));
      const height = Math.max(200, Math.round(measuredHeight));

      if (width === 0 || height === 0) {
        return false;
      }

      logDebug("mounting scene", { width, height, category, isScanning });
      setDataset("init");

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050505, 0.015);

      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
      camera.position.z = 15;

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      setDataset("renderer-attached");

      const ambientLight = new THREE.AmbientLight(0x0d0d0d, 1.5);
      scene.add(ambientLight);

      const pointLightGreen = new THREE.PointLight(0x39ff14, 2, 30);
      pointLightGreen.position.set(5, 5, 5);
      scene.add(pointLightGreen);

      const pointLightCyan = new THREE.PointLight(0x00f3ff, 2.5, 30);
      pointLightCyan.position.set(-5, -5, 5);
      scene.add(pointLightCyan);

      const moleculeGroup = new THREE.Group();
      scene.add(moleculeGroup);

      const getAtomConfig = (cat: string) => {
        switch (cat) {
          case "Fruit":
            return { centerColor: 0xff4d4d, count: 8, shellColor: 0x00f3ff };
          case "Meat":
            return { centerColor: 0x39ff14, count: 12, shellColor: 0xff8c00 };
          case "Seafood":
            return { centerColor: 0x00a8ff, count: 10, shellColor: 0x00f3ff };
          case "Beverage":
            return { centerColor: 0x9b59b6, count: 7, shellColor: 0xff4d4d };
          case "Vegetable":
            return { centerColor: 0x39ff14, count: 6, shellColor: 0x39ff14 };
          case "Dairy":
            return { centerColor: 0xffffff, count: 10, shellColor: 0x00f3ff };
          default:
            return { centerColor: 0x00f3ff, count: 9, shellColor: 0x39ff14 };
        }
      };

      const config = getAtomConfig(category);
      const nucleusGeo = new THREE.SphereGeometry(1.6, 32, 32);
      const nucleusMat = new THREE.MeshPhongMaterial({
        color: config.centerColor,
        emissive: config.centerColor,
        emissiveIntensity: 0.35,
        shininess: 80,
        flatShading: false,
      });
      const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
      moleculeGroup.add(nucleus);

      const outerAtoms: THREE.Mesh[] = [];
      const bonds: THREE.Line[] = [];
      const numOuter = config.count;

      for (let i = 0; i < numOuter; i++) {
        const phi = Math.acos(-1 + (2 * i) / numOuter);
        const theta = Math.sqrt(numOuter * Math.PI) * phi;
        const radius = 4.2;

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        const atomGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const atomMat = new THREE.MeshPhongMaterial({
          color: config.shellColor,
          emissive: config.shellColor,
          emissiveIntensity: 0.45,
          shininess: 90,
        });
        const atom = new THREE.Mesh(atomGeo, atomMat);
        atom.position.set(x, y, z);
        moleculeGroup.add(atom);
        outerAtoms.push(atom);

        const linePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.22,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        moleculeGroup.add(line);
        bonds.push(line);
      }

      const ringGeo = new THREE.BufferGeometry();
      const ringCount = 180;
      const ringPositions = new Float32Array(ringCount * 3);
      const ringRadius = 6.0;

      for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        ringPositions[i * 3] = Math.cos(angle) * ringRadius;
        ringPositions[i * 3 + 1] = 0;
        ringPositions[i * 3 + 2] = Math.sin(angle) * ringRadius;
      }
      ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPositions, 3));
      const ringMat = new THREE.PointsMaterial({
        color: 0x00f3ff,
        size: 0.08,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Points(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 4;
      moleculeGroup.add(ring);

      const particleCount = 250;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 25;
      }
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.04,
        transparent: true,
        opacity: 0.4,
      });
      const starField = new THREE.Points(particleGeo, particleMat);
      scene.add(starField);

      const laserGeo = new THREE.CylinderGeometry(6.5, 6.5, 0.05, 32, 1, true);
      const laserMat = new THREE.MeshBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
      });
      const laserPlane = new THREE.Mesh(laserGeo, laserMat);
      scene.add(laserPlane);

      let mouseX = 0;
      let mouseY = 0;
      let targetX = 0;
      let targetY = 0;

      handleMouseMove = (e: MouseEvent) => {
        if (!renderer) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        mouseX = (x / rect.width) * 2 - 1;
        mouseY = -(y / rect.height) * 2 + 1;
      };

      window.addEventListener("mousemove", handleMouseMove);
      clock = new THREE.Clock();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        const elapsed = clock!.getElapsedTime();

        moleculeGroup.rotation.y += 0.005;
        moleculeGroup.rotation.x += 0.0025;
        ring.rotation.y -= 0.01;

        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        moleculeGroup.position.x = targetX * 1.5;
        moleculeGroup.position.y = targetY * 1.5;

        outerAtoms.forEach((atom, idx) => {
          const bounce = Math.sin(elapsed * 2 + idx) * 0.08;
          atom.position.normalize().multiplyScalar(4.2 + bounce);
          const linePos = bonds[idx].geometry.attributes.position;
          linePos.setXYZ(1, atom.position.x, atom.position.y, atom.position.z);
          linePos.needsUpdate = true;
        });

        starField.rotation.y += 0.0005;

        if (isScanning) {
          laserMat.opacity = 0.45 + Math.sin(elapsed * 15) * 0.15;
          laserPlane.position.y = Math.sin(elapsed * 3.5) * 4.8;
        } else {
          laserMat.opacity = Math.max(0, laserMat.opacity - 0.02);
        }

        if (renderer && camera) {
          renderer.render(scene, camera);
        }
      };

      animate();
      setDataset("ready");
      return true;
    };

    const handleResize = () => {
      if (!container || !rendererRef.current || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(Math.max(200, w), Math.max(200, h));
    };

    try {
      if (!tryInitScene()) {
        resizeObserver = new ResizeObserver(() => {
          if (tryInitScene() && resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
          }
        });
        resizeObserver.observe(container);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("ThreeDScanner initialization error:", err);
      setDataset("error", err);
    }

    window.addEventListener("resize", handleResize);

    const placeholderTimer = window.setTimeout(() => {
      if (!container) return;
      if (!container.querySelector("canvas")) {
        container.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg width="260" height="140" viewBox="0 0 260 140" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="260" height="140" rx="12" fill="#071013"/><g fill="#00f3ff" opacity="0.9"><circle cx="60" cy="70" r="18"/><circle cx="120" cy="70" r="10"/><circle cx="180" cy="70" r="6"/></g><text x="20" y="120" fill="#9fbfb0" font-family="JetBrains Mono, monospace" font-size="11">3D visual unavailable — placeholder</text></svg></div>`;
      }
    }, 2500);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (handleMouseMove) window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      clearTimeout(placeholderTimer);
      if (container && rendererRef.current && rendererRef.current.domElement) {
        try {
          container.removeChild(rendererRef.current.domElement);
        } catch (e) {
          // ignore cleanup failures
        }
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      rendererRef.current = null;
    };
  }, [category, isScanning]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden min-h-[400px]">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
