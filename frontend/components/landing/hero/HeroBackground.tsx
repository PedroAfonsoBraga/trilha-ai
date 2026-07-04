"use client";

import { Canvas } from "@react-three/fiber";
import { ParticlesField } from "./ParticlesField";

export function HeroBackground() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      className="!pointer-events-none"
    >
      <ParticlesField />
    </Canvas>
  );
}
