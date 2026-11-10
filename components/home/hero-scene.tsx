"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { useMemo, useRef } from "react";

function Artifact() {
  const groupRef = useRef<THREE.Group>(null);
  const prefersReducedMotion = useReducedMotion();

  useFrame((state, delta) => {
    if (!groupRef.current || prefersReducedMotion) return;
    const group = groupRef.current;
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, state.pointer.y * 0.1, 3.2, delta);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, state.pointer.x * 0.14 + 0.18, 3.2, delta);
    group.rotation.z += delta * 0.045;
  });

  return (
    <group ref={groupRef} rotation={[0.1, 0.18, -0.12]}>
      <mesh castShadow receiveShadow rotation={[0.46, 0.1, 0.28]}>
        <torusKnotGeometry args={[0.92, 0.22, 220, 28, 2, 3]} />
        <meshPhysicalMaterial
          color="#aa916e"
          metalness={0.82}
          roughness={0.22}
          clearcoat={0.8}
          clearcoatRoughness={0.16}
          envMapIntensity={1.3}
        />
      </mesh>
      <mesh rotation={[0.7, 0.25, 0.2]}>
        <torusGeometry args={[1.28, 0.008, 12, 180]} />
        <meshBasicMaterial color="#eee5d6" transparent opacity={0.56} />
      </mesh>
      <mesh rotation={[0.2, -0.36, 1.07]}>
        <torusGeometry args={[1.42, 0.006, 10, 180]} />
        <meshBasicMaterial color="#b9a27e" transparent opacity={0.38} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <icosahedronGeometry args={[0.31, 3]} />
        <meshPhysicalMaterial
          color="#d5c7ae"
          metalness={0.62}
          roughness={0.12}
          clearcoat={1}
          emissive="#362a1d"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function ParticleField() {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let index = 0; index < 170; index += 1) {
      const ring = 1.8 + ((index * 17) % 23) / 14;
      const angle = index * 2.399963229728653;
      positions.push(
        Math.cos(angle) * ring,
        Math.sin(angle * 1.61) * (0.55 + (index % 11) / 20),
        Math.sin(angle) * ring * 0.55,
      );
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return pointGeometry;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial color="#c5ad88" size={0.012} transparent opacity={0.62} depthWrite={false} sizeAttenuation />
    </points>
  );
}

export default function HeroScene() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Canvas
      className="hero-scene__canvas"
      aria-hidden="true"
      camera={{ position: [0, 0, 5.4], fov: 39 }}
      dpr={[1, 1.5]}
      frameloop={prefersReducedMotion ? "demand" : "always"}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.42} />
      <pointLight color="#fff1d5" intensity={30} position={[3.2, 3.4, 4.5]} distance={12} />
      <pointLight color="#987346" intensity={22} position={[-3.8, -1.2, 2.2]} distance={10} />
      <spotLight color="#e6ddcd" intensity={28} position={[-1.8, 5, -3]} angle={0.6} penumbra={1} />
      <ParticleField />
      <Artifact />
    </Canvas>
  );
}
