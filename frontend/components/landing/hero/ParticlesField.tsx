"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 100;
const K = 2; // vizinhos mais próximos por nó → estilo trilha
const COLOR = "#0D9488";
const BOUNDS: [number, number, number] = [10, 6, 4];

export function ParticlesField() {
  // Posições base aleatórias (fixas, geradas 1x)
  const basePositions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * BOUNDS[0];
      arr[i * 3 + 1] = (Math.random() - 0.5) * BOUNDS[1];
      arr[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS[2];
    }
    return arr;
  }, []);

  // Conexões KNN: para cada nó, os K vizinhos mais próximos
  // connections é um array de índices de nós (pares: [i, j, i, j, ...])
  const connections = useMemo(() => {
    const pairs: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < COUNT; j++) {
        if (i === j) continue;
        const dx = basePositions[i * 3] - basePositions[j * 3];
        const dy = basePositions[i * 3 + 1] - basePositions[j * 3 + 1];
        const dz = basePositions[i * 3 + 2] - basePositions[j * 3 + 2];
        dists.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      dists.sort((a, b) => a.d - b.d);
      for (let k = 0; k < K; k++) {
        pairs.push(i, dists[k].j);
      }
    }
    return pairs;
  }, [basePositions]);

  // Buffers mutáveis (atualizados a cada frame)
  const pointsPositions = useMemo(() => basePositions.slice(), [basePositions]);
  const linePositions = useMemo(() => {
    const arr = new Float32Array(connections.length * 3);
    for (let i = 0; i < connections.length; i++) {
      const idx = connections[i];
      arr[i * 3] = basePositions[idx * 3];
      arr[i * 3 + 1] = basePositions[idx * 3 + 1];
      arr[i * 3 + 2] = basePositions[idx * 3 + 2];
    }
    return arr;
  }, [connections, basePositions]);

  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Oscilação sutil dos pontos
    for (let i = 0; i < COUNT; i++) {
      const ox = Math.sin(t * 0.3 + i) * 0.15;
      const oy = Math.cos(t * 0.25 + i * 1.3) * 0.15;
      pointsPositions[i * 3] = basePositions[i * 3] + ox;
      pointsPositions[i * 3 + 1] = basePositions[i * 3 + 1] + oy;
      // z mantém base
    }
    // Atualizar buffer dos pontos
    if (pointsRef.current) {
      const attr = pointsRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
    // Espelhar posições nas linhas
    for (let i = 0; i < connections.length; i++) {
      const idx = connections[i];
      linePositions[i * 3] = pointsPositions[idx * 3];
      linePositions[i * 3 + 1] = pointsPositions[idx * 3 + 1];
      linePositions[i * 3 + 2] = pointsPositions[idx * 3 + 2];
    }
    if (linesRef.current) {
      const attr = linesRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[pointsPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color={COLOR}
          transparent
          opacity={0.8}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={COLOR}
          transparent
          opacity={0.15}
          depthWrite={true}
        />
      </lineSegments>
    </>
  );
}
