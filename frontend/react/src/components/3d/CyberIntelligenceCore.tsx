import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface CyberIntelligenceCoreProps {
  className?: string;
}

export const CyberIntelligenceCore: React.FC<CyberIntelligenceCoreProps> = ({
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);

  useEffect(() => {
    // 1. Detect WebGL Availability
    const checkWebGL = (): boolean => {
      try {
        const canvas = document.createElement("canvas");
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
      } catch {
        return false;
      }
    };

    if (!checkWebGL()) {
      setHasWebGL(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 2. Scene, Camera, Renderer Setup
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Core Objects Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Outer Geodesic Hologram Sphere
    const outerGeo = new THREE.IcosahedronGeometry(7.5, 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const outerSphere = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerSphere);

    // Outer Rings
    const ringGeo1 = new THREE.RingGeometry(8.2, 8.35, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    coreGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(9.0, 9.15, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    coreGroup.add(ring2);

    // Inner Central AI Processing Core (Pulsing Sphere)
    const innerGeo = new THREE.SphereGeometry(3.2, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.85,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerSphere);

    const innerWireGeo = new THREE.SphereGeometry(3.25, 16, 16);
    const innerWireMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const innerWireSphere = new THREE.Mesh(innerWireGeo, innerWireMat);
    coreGroup.add(innerWireSphere);

    // Network Nodes Distributed on Outer Radius
    const nodeCount = 28;
    const nodePositions: THREE.Vector3[] = [];
    const nodeGroup = new THREE.Group();

    const nodeGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const alertNodeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const radius = 7.5;

      const pos = new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );
      nodePositions.push(pos);

      const isAlert = i % 5 === 0;
      const nodeMesh = new THREE.Mesh(nodeGeo, isAlert ? alertNodeMat : nodeMat);
      nodeMesh.position.copy(pos);
      nodeGroup.add(nodeMesh);
    }
    coreGroup.add(nodeGroup);

    // Connecting Network Lines
    const lineCoords: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist < 4.8) {
          lineCoords.push(
            nodePositions[i].x,
            nodePositions[i].y,
            nodePositions[i].z,
            nodePositions[j].x,
            nodePositions[j].y,
            nodePositions[j].z
          );
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(lineCoords, 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.28,
    });
    const networkLines = new THREE.LineSegments(lineGeo, lineMat);
    coreGroup.add(networkLines);

    // Orbiting Data Signal Particles (Telemetry streams)
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particleCoords = new Float32Array(particleCount * 3);
    const particleVelocities: { radius: number; angle: number; speed: number; y: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = 4.5 + Math.random() * 4.0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.008 + Math.random() * 0.015;
      const y = (Math.random() - 0.5) * 6;

      particleCoords[i * 3] = Math.cos(angle) * radius;
      particleCoords[i * 3 + 1] = y;
      particleCoords[i * 3 + 2] = Math.sin(angle) * radius;

      particleVelocities.push({ radius, angle, speed, y });
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particleCoords, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particleSystem);

    // 4. Mouse Parallax Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 1.5;
      mouseY = y * 1.5;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 5. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        // Autonomous subtle rotation
        coreGroup.rotation.y += 0.0035;
        ring1.rotation.z -= 0.004;
        ring2.rotation.z += 0.003;

        // Pulsing AI core
        const pulse = 1.0 + Math.sin(elapsedTime * 2.5) * 0.06;
        innerWireSphere.scale.set(pulse, pulse, pulse);

        // Telemetry particle revolution
        const positions = particleGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const p = particleVelocities[i];
          p.angle += p.speed;
          positions[i * 3] = Math.cos(p.angle) * p.radius;
          positions[i * 3 + 2] = Math.sin(p.angle) * p.radius;
        }
        particleGeo.attributes.position.needsUpdate = true;
      }

      // Smooth mouse parallax interpolation
      targetRotY = mouseX * 0.6;
      targetRotX = mouseY * 0.4;
      coreGroup.rotation.y += (targetRotY - coreGroup.rotation.y) * 0.03;
      coreGroup.rotation.x += (targetRotX - coreGroup.rotation.x) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 7. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Three.js resources
      outerGeo.dispose();
      outerMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      innerWireGeo.dispose();
      innerWireMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      alertNodeMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[420px] md:h-[500px] flex items-center justify-center select-none overflow-hidden ${className}`}
      aria-label="3D Cyber Intelligence Core Visualization"
      role="img"
    >
      {/* 2D Canvas Fallback if WebGL is unavailable */}
      {!hasWebGL && (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-cyber-900/50 rounded-2xl border border-cyan-500/20">
          <div className="relative w-48 h-48 rounded-full border-2 border-dashed border-cyan-400/40 flex items-center justify-center animate-spin" style={{ animationDuration: "20s" }}>
            <div className="w-32 h-32 rounded-full border border-violet-500/50 flex items-center justify-center animate-ping" style={{ animationDuration: "3s" }}>
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
                <span className="text-cyan-300 font-mono text-xs font-bold">AI CORE</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs font-mono text-slate-400">
            [2D Fallback Active &bull; Accelerated Hardware Rendering Unavailable]
          </p>
        </div>
      )}
    </div>
  );
};
