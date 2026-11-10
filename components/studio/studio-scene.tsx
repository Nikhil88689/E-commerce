"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CatalogProduct } from "@/lib/catalog/types";
import type { ProductConfiguration, StudioFinish, StudioMaterial } from "@/lib/catalog/configuration";

export type StudioView = "front" | "side" | "back" | "top";
export type StudioInteraction = { rotation: { current: [number, number] }; zoom: { current: number } };

type SceneProps = {
  product: CatalogProduct;
  configuration: ProductConfiguration;
  material: StudioMaterial;
  finish: StudioFinish;
  view: StudioView;
  interaction: StudioInteraction;
  reducedMotion: boolean;
};

function prepareEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  const generator = new THREE.PMREMGenerator(gl);
  generator.compileEquirectangularShader();
  const room = new RoomEnvironment();
  const target = generator.fromScene(room, 0.04);
  scene.environment = target.texture;
  scene.environmentIntensity = 0.62;
  room.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((item) => item.dispose());
    }
  });
  generator.dispose();
  return target;
}

function ShoeShape({ colorHex, material, finish }: { colorHex: string; material: StudioMaterial; finish: StudioFinish }) {
  const sole = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-1.18, -0.26);
    shape.quadraticCurveTo(-0.92, -0.38, -0.52, -0.36);
    shape.lineTo(0.72, -0.33);
    shape.quadraticCurveTo(1.1, -0.29, 1.05, -0.12);
    shape.lineTo(0.76, -0.02);
    shape.lineTo(-0.95, -0.02);
    shape.quadraticCurveTo(-1.22, -0.08, -1.18, -0.26);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.66, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.035, bevelThickness: 0.035 });
  }, []);
  const upper = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-1.08, -0.05);
    shape.quadraticCurveTo(-0.78, 0.08, -0.38, 0.08);
    shape.quadraticCurveTo(-0.05, 0.11, 0.23, 0.47);
    shape.quadraticCurveTo(0.39, 0.66, 0.58, 0.58);
    shape.lineTo(0.85, 0.18);
    shape.quadraticCurveTo(1.08, 0.1, 0.96, 0.01);
    shape.lineTo(-0.92, -0.12);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.52, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.045, bevelThickness: 0.05 });
  }, []);
  return (
    <group position={[0, 0.12, 0]} rotation={[0.12, -0.16, 0]}>
      <mesh geometry={sole} position={[0, -0.39, -0.33]} castShadow receiveShadow><meshStandardMaterial color="#242521" roughness={0.82} /></mesh>
      <mesh geometry={upper} position={[0, -0.1, -0.26]} castShadow receiveShadow><meshStandardMaterial color={colorHex} metalness={material.metalness} roughness={finish.roughness} /></mesh>
    </group>
  );
}

function MainForm({ product, configuration, material, finish }: Pick<SceneProps, "product" | "configuration" | "material" | "finish">) {
  const color = configuration.colorHex;
  const materialProps = { color, metalness: material.metalness, roughness: finish.roughness };
  const dark = "#292b28";
  const accent = "#c9b18c";
  const vesselProfile = useMemo(() => [new THREE.Vector2(0.34, -0.88), new THREE.Vector2(0.47, -0.78), new THREE.Vector2(0.42, -0.5), new THREE.Vector2(0.3, -0.2), new THREE.Vector2(0.25, 0.3), new THREE.Vector2(0.38, 0.7), new THREE.Vector2(0.35, 0.82)], []);

  if (product.category === "footwear") {
    return <>
      <ShoeShape colorHex={color} material={material} finish={finish} />
      <mesh position={[0.17, 0.4, 0.19]} rotation={[0.18, 0, -0.18]} castShadow><boxGeometry args={[0.19, 0.3, 0.28]} /><meshStandardMaterial color={color} roughness={0.78} /></mesh>
      {[0, 1, 2].map((index) => <mesh key={index} position={[-0.22 + index * 0.19, 0.03 + index * 0.045, 0.294]} rotation={[0, 0, -0.32]} castShadow><boxGeometry args={[0.2, 0.025, 0.035]} /><meshStandardMaterial color={configuration.addOns.includes("lace-set") ? accent : "#e1d8ca"} roughness={0.66} /></mesh>)}
    </>;
  }

  if (product.category === "audio" && product.slug.includes("headphone")) {
    return <group>
      <mesh position={[0, 0.36, 0]} rotation={[0, 0, Math.PI]} castShadow><torusGeometry args={[0.72, 0.09, 16, 64, Math.PI]} /><meshStandardMaterial {...materialProps} /></mesh>
      {[-0.75, 0.75].map((x) => <group key={x} position={[x, -0.13, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.31, 0.34, 0.2, 48]} /><meshStandardMaterial {...materialProps} /></mesh>
        <mesh position={[0, 0, 0.115]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.23, 0.045, 12, 48]} /><meshStandardMaterial color={accent} metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.19, 0.19, 0.025, 48]} /><meshStandardMaterial color={dark} roughness={0.92} /></mesh>
      </group>)}
    </group>;
  }

  if (product.category === "audio") {
    return <group>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow><cylinderGeometry args={[0.55, 0.62, 1.72, 64, 1, false]} /><meshStandardMaterial {...materialProps} /></mesh>
      {[-0.39, 0.35].map((y, index) => <group key={y} position={[0, y, 0.42]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[index ? 0.28 : 0.35, 0.035, 12, 56]} /><meshStandardMaterial color={accent} metalness={0.84} roughness={0.25} /></mesh>
        <mesh position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[index ? 0.25 : 0.32, index ? 0.25 : 0.32, 0.055, 48]} /><meshStandardMaterial color={dark} roughness={0.88} /></mesh>
        <mesh position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.14, 0.012, 8, 40]} /><meshStandardMaterial color="#77776f" metalness={0.6} roughness={0.4} /></mesh>
      </group>)}
      <mesh position={[0, -0.91, 0]} castShadow><cylinderGeometry args={[0.45, 0.52, 0.11, 48]} /><meshStandardMaterial color={dark} roughness={0.7} /></mesh>
    </group>;
  }

  if (product.category === "objects") {
    if (product.slug.includes("bookend")) return <group rotation={[0.08, -0.27, 0]}>
      {[-0.48, 0.48].map((x) => <group key={x} position={[x, -0.18, 0]} rotation={[0, x > 0 ? Math.PI : 0, 0]}>
        <mesh position={[0, -0.36, 0]} castShadow><boxGeometry args={[0.14, 0.82, 0.52]} /><meshStandardMaterial {...materialProps} /></mesh>
        <mesh position={[0.1, 0.04, 0]} rotation={[0, 0, -0.2]} castShadow><boxGeometry args={[0.34, 0.12, 0.52]} /><meshStandardMaterial {...materialProps} /></mesh>
        <mesh position={[0.05, -0.76, 0]} castShadow><boxGeometry args={[0.72, 0.1, 0.58]} /><meshStandardMaterial {...materialProps} /></mesh>
      </group>)}
    </group>;
    return <group rotation={[0.04, -0.18, 0]}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow><latheGeometry args={[vesselProfile, 64]} /><meshStandardMaterial {...materialProps} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.81, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.34, 0.026, 12, 48]} /><meshStandardMaterial color={accent} metalness={0.8} roughness={finish.roughness} /></mesh>
      <mesh position={[0, -0.9, 0]} castShadow><cylinderGeometry args={[0.38, 0.42, 0.12, 48]} /><meshStandardMaterial color={color} metalness={material.metalness} roughness={finish.roughness} /></mesh>
    </group>;
  }

  if (product.category === "living" && product.slug.includes("table")) {
    return <group>
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow><cylinderGeometry args={[0.88, 0.88, 0.16, 64]} /><meshStandardMaterial color={color} metalness={material.metalness} roughness={finish.roughness} /></mesh>
      <mesh position={[0, -0.3, 0]} castShadow><cylinderGeometry args={[0.16, 0.28, 1.15, 32]} /><meshStandardMaterial color={accent} metalness={0.78} roughness={finish.roughness} /></mesh>
      <mesh position={[0, -0.91, 0]} castShadow><cylinderGeometry args={[0.59, 0.64, 0.12, 48]} /><meshStandardMaterial color={dark} roughness={0.8} /></mesh>
      <mesh position={[0.56, 0.68, 0]} castShadow><cylinderGeometry args={[0.27, 0.27, 0.09, 48]} /><meshStandardMaterial color="#c8bca5" roughness={0.65} /></mesh>
    </group>;
  }

  if (product.category === "living") {
    return <group>
      <mesh position={[0, -0.77, 0]} castShadow><cylinderGeometry args={[0.52, 0.58, 0.18, 48]} /><meshStandardMaterial color={dark} roughness={0.78} /></mesh>
      <mesh position={[0, -0.29, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 0.84, 32]} /><meshStandardMaterial color={accent} metalness={0.82} roughness={finish.roughness} /></mesh>
      <mesh position={[0, 0.4, 0]} castShadow><sphereGeometry args={[0.38, 40, 32]} /><meshStandardMaterial color={color} metalness={0.08} roughness={0.2} emissive={color} emissiveIntensity={0.22} /></mesh>
      <mesh position={[0, 0.79, 0]} castShadow><cylinderGeometry args={[0.58, 0.34, 0.44, 48, 1, true]} /><meshStandardMaterial color={color} metalness={material.metalness} roughness={finish.roughness} side={THREE.DoubleSide} /></mesh>
    </group>;
  }

  if (product.category === "accessories" && product.slug.includes("watch")) {
    return <group rotation={[0.12, -0.18, -0.18]}>
      <mesh position={[0, 0.78, 0]} castShadow><boxGeometry args={[0.45, 0.8, 0.15]} /><meshStandardMaterial color={dark} roughness={0.78} /></mesh>
      <mesh position={[0, -0.78, 0]} castShadow><boxGeometry args={[0.45, 0.8, 0.15]} /><meshStandardMaterial color={dark} roughness={0.78} /></mesh>
      <mesh castShadow><cylinderGeometry args={[0.59, 0.59, 0.22, 64]} /><meshStandardMaterial {...materialProps} /></mesh>
      <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.48, 0.045, 12, 56]} /><meshStandardMaterial color={accent} metalness={0.88} roughness={finish.roughness} /></mesh>
      <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.44, 0.44, 0.04, 56]} /><meshStandardMaterial color={color} metalness={0.2} roughness={0.4} /></mesh>
      <mesh position={[0, 0.06, 0.17]}><boxGeometry args={[0.025, 0.37, 0.025]} /><meshStandardMaterial color="#ece3d3" metalness={0.6} /></mesh>
      <mesh position={[0.11, -0.08, 0.17]} rotation={[0, 0, -0.82]}><boxGeometry args={[0.02, 0.28, 0.025]} /><meshStandardMaterial color="#ece3d3" metalness={0.6} /></mesh>
    </group>;
  }

  if (product.category === "accessories") {
    return <group>
      {[-0.45, 0.45].map((x) => <group key={x} position={[x, 0.04, 0]}>
        <mesh rotation={[0, 0, 0]} castShadow><torusGeometry args={[0.39, 0.075, 16, 56]} /><meshStandardMaterial {...materialProps} /></mesh>
        <mesh position={[x > 0 ? 0.26 : -0.26, 0.04, -0.08]} rotation={[0, 0.16, x > 0 ? 0.12 : -0.12]} castShadow><boxGeometry args={[0.62, 0.065, 0.07]} /><meshStandardMaterial {...materialProps} /></mesh>
      </group>)}
      <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.055, 0.055, 0.5, 20]} /><meshStandardMaterial color={accent} metalness={0.86} roughness={0.24} /></mesh>
    </group>;
  }

  return <mesh castShadow><icosahedronGeometry args={[0.9, 2]} /><meshStandardMaterial {...materialProps} /></mesh>;
}

function OptionalComponents({ product, addOns, colorHex }: { product: CatalogProduct; addOns: string[]; colorHex: string }) {
  if (!addOns.length) return null;
  const stand = addOns.some((item) => ["plinth", "isolation-stand", "mount"].includes(item));
  const carry = addOns.some((item) => ["travel-shell", "travel-case", "care-kit"].includes(item));
  const cable = addOns.some((item) => ["cable-set", "alternate-strap"].includes(item));
  return <group>
    {stand ? <mesh position={[0, -1.08, 0]} castShadow receiveShadow><cylinderGeometry args={[0.72, 0.82, 0.22, 48]} /><meshStandardMaterial color="#77746d" metalness={0.54} roughness={0.48} /></mesh> : null}
    {carry ? <group position={[1.08, -0.44, 0.14]} rotation={[0, -0.24, -0.12]}>
      <mesh castShadow><boxGeometry args={[0.48, 0.67, 0.32]} /><meshStandardMaterial color={colorHex} metalness={0.28} roughness={0.72} /></mesh>
      <mesh position={[0, 0.37, 0]}><torusGeometry args={[0.15, 0.025, 10, 24, Math.PI]} /><meshStandardMaterial color="#c8b58f" metalness={0.8} roughness={0.3} /></mesh>
    </group> : null}
    {cable ? <mesh position={[1.05, -0.75, 0.08]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.025, 10, 40, Math.PI * 1.55]} /><meshStandardMaterial color="#ded7ca" roughness={0.72} /></mesh> : null}
    {addOns.includes("dimmer") ? <mesh position={[0.86, -0.54, 0.1]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.2, 24]} /><meshStandardMaterial color="#d2bb98" metalness={0.68} roughness={0.32} /></mesh> : null}
    {addOns.includes("lace-set") && product.category !== "footwear" ? <mesh position={[0.92, -0.58, 0]} castShadow><sphereGeometry args={[0.16, 24, 20]} /><meshStandardMaterial color="#c9b18c" roughness={0.5} /></mesh> : null}
  </group>;
}

function CameraAndObject({ product, configuration, material, finish, view, interaction, reducedMotion }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const entrance = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const targetCamera = useMemo(() => {
    const positions: Record<StudioView, THREE.Vector3> = {
      front: new THREE.Vector3(0, 0.14, 5.3),
      side: new THREE.Vector3(5.15, 0.08, 0),
      back: new THREE.Vector3(0, 0.12, -5.3),
      top: new THREE.Vector3(0, 5.05, 0.01),
    };
    return positions[view];
  }, [view]);

  useFrame(({ clock }, delta) => {
    camera.position.lerp(targetCamera, 1 - Math.exp(-delta * 2.4));
    camera.lookAt(0, 0, 0);
    if (!group.current) return;
    const autoTurn = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.2) * 0.035;
    const desiredY = interaction.rotation.current[0] + autoTurn;
    const desiredX = interaction.rotation.current[1];
    if (entrance.current) {
      const entranceScale = reducedMotion ? 1 : THREE.MathUtils.damp(entrance.current.scale.x, 1, 3.4, delta);
      entrance.current.scale.setScalar(entranceScale);
    }
    group.current.rotation.y += (desiredY - group.current.rotation.y) * Math.min(1, delta * 7);
    group.current.rotation.x += (desiredX - group.current.rotation.x) * Math.min(1, delta * 7);
    const sizeScale = product.category === "footwear" && configuration.size ? 0.95 + (Number(configuration.size) - 39) * 0.016 : 1;
    const scale = interaction.zoom.current * sizeScale;
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, scale, 6, delta));
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, 0.07 + Math.sin(clock.elapsedTime * 0.75) * (reducedMotion ? 0 : 0.025), 3, delta);
  });

  return <>
    <ambientLight intensity={1.15} />
    <directionalLight position={[4, 5, 4]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[-3, 1.2, 3]} intensity={1.4} color="#dfc69d" />
    <pointLight position={[1.8, 2, -3]} intensity={2.1} color="#c4d0d4" />
    <group ref={group} position={[0, 0.07, 0]}>
      <group ref={entrance} scale={0.001}>
        <MainForm product={product} configuration={configuration} material={material} finish={finish} />
        <OptionalComponents product={product} addOns={configuration.addOns} colorHex={configuration.colorHex} />
      </group>
    </group>
    <mesh position={[0, -1.32, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <shadowMaterial transparent opacity={0.24} />
    </mesh>
    <mesh position={[0, -1.29, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.3, 64]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
    </mesh>
  </>;
}

export function StudioScene(props: SceneProps) {
  const environmentTarget = useRef<THREE.WebGLRenderTarget | null>(null);
  const setupEnvironment = useCallback((gl: THREE.WebGLRenderer, scene: THREE.Scene) => { environmentTarget.current = prepareEnvironment(gl, scene); }, []);
  useEffect(() => () => environmentTarget.current?.dispose(), []);
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0.15, 5.3], fov: 37, near: 0.1, far: 80 }} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
    <color attach="background" args={["#10110f"]} />
    <EnvironmentSetup onCreated={setupEnvironment} />
    <CameraAndObject {...props} />
  </Canvas>;
}

function EnvironmentSetup({ onCreated }: { onCreated: (gl: THREE.WebGLRenderer, scene: THREE.Scene) => void }) {
  const { gl, scene } = useThree();
  useEffect(() => { onCreated(gl, scene); }, [gl, scene, onCreated]);
  return null;
}
