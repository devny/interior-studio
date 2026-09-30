"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, Html, OrbitControls, RoundedBox, useTexture } from "@react-three/drei";
import {
  Armchair,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Grid2X2,
  Home,
  LampCeiling,
  Layers3,
  Maximize2,
  Move3D,
  PackageOpen,
  PanelLeftClose,
  RotateCw,
  Save,
  Search,
  Sofa,
  Sparkles,
  SquareStack,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type FinishKey = "warm-white" | "sage" | "sand" | "stone";
type FurnitureKind = "table" | "sofa" | "bed" | "shelf" | "island" | "chair" | "appliance" | "light";

type FurnitureItem = {
  id: string;
  name: string;
  room: string;
  kind: FurnitureKind;
  size: [number, number, number];
  position: [number, number, number];
  rotation: number;
  color: string;
  fixed?: boolean;
};

const FINISHES: Record<FinishKey, { name: string; sub: string; color: string; texture: string }> = {
  "warm-white": { name: "모던 회벽 화이트", sub: "LX 디아망 · 회벽 질감", color: "#e8e3d7", texture: "/materials/wallpaper-plaster.svg" },
  sage: { name: "소프트 세이지", sub: "무광 패브릭 벽지", color: "#aeb5a1", texture: "/materials/wallpaper-sage.svg" },
  sand: { name: "샌드 베이지", sub: "세로 직조 질감 벽지", color: "#cbbda6", texture: "/materials/wallpaper-sand.svg" },
  stone: { name: "웜 그레이 린넨", sub: "교차 직조 질감 벽지", color: "#babbb6", texture: "/materials/wallpaper-linen.svg" },
};

const INITIAL_ITEMS: FurnitureItem[] = [
  { id: "dining", name: "라메리트 식탁", room: "거실 확장부", kind: "table", size: [1.8, .76, .95], position: [-.8, .38, 4.62], rotation: 0, color: "#a7754b" },
  { id: "sofa", name: "패브릭 소파", room: "거실", kind: "sofa", size: [2.6, .78, .92], position: [-1.05, .39, 1.62], rotation: 0, color: "#b4aa98" },
  { id: "bed", name: "라메리트 침대", room: "안방", kind: "bed", size: [1.68, .46, 2.12], position: [3.72, .23, 2.72], rotation: 0, color: "#b49a7f" },
  { id: "shelf", name: "보유 책장 세트", room: "서재", kind: "shelf", size: [1.8, 2.05, .34], position: [-4.48, 1.03, 1.42], rotation: Math.PI / 2, color: "#7a5b44" },
  { id: "island", name: "키친핏 주방", room: "주방/식당", kind: "island", size: [2.4, .9, .64], position: [.6, .45, -2.55], rotation: 0, color: "#d4cfc3", fixed: true },
];

const CATALOG = [
  { id: "fabric-sofa", category: "가구", icon: Sofa, title: "3인 패브릭 소파", meta: "2600 × 920 × 780", color: "#c3b9a7", kind: "sofa" as const, size: [2.6, .78, .92] as [number, number, number], room: "거실", position: [-1.05, .39, 1.62] as [number, number, number] },
  { id: "lounge-chair", category: "가구", icon: Armchair, title: "라운드 라운지 체어", meta: "760 × 820 × 740", color: "#8e9683", kind: "chair" as const, size: [.76, .74, .82] as [number, number, number], room: "거실", position: [1.15, .37, 1.8] as [number, number, number] },
  { id: "side-table", category: "가구", icon: SquareStack, title: "오크 사이드 테이블", meta: "450 × 450 × 510", color: "#ad8058", kind: "table" as const, size: [.45, .51, .45] as [number, number, number], room: "거실", position: [1.2, .255, 2.7] as [number, number, number] },
  { id: "book-shelf", category: "가구", icon: Box, title: "오크 책장", meta: "1800 × 340 × 2050", color: "#7a5b44", kind: "shelf" as const, size: [1.8, 2.05, .34] as [number, number, number], room: "침실2", position: [-4.45, 1.025, 1.5] as [number, number, number] },
  { id: "kitchen-fridge", category: "가전", icon: PackageOpen, title: "키친핏 냉장고", meta: "912 × 697 × 1853", color: "#d9d9d4", kind: "appliance" as const, size: [.912, 1.853, .697] as [number, number, number], room: "주방/식당", position: [-.55, .9265, -2.2] as [number, number, number] },
  { id: "kimchi-fridge", category: "가전", icon: PackageOpen, title: "변온 김치냉장고", meta: "595 × 688 × 1853", color: "#c9cbc8", kind: "appliance" as const, size: [.595, 1.853, .688] as [number, number, number], room: "주방/식당", position: [.4, .9265, -2.2] as [number, number, number] },
  { id: "living-tv", category: "가전", icon: Box, title: "65형 TV", meta: "1450 × 55 × 830", color: "#303230", kind: "appliance" as const, size: [1.45, .83, .12] as [number, number, number], room: "거실", position: [1.7, .7, 1.15] as [number, number, number] },
  { id: "opal-pendant", category: "조명", icon: LampCeiling, title: "오팔 펜던트 300", meta: "Ø300 × H240", color: "#e8d7ad", kind: "light" as const, size: [.3, .24, .3] as [number, number, number], room: "거실 확장부", position: [-.8, 2.12, 4.62] as [number, number, number] },
  { id: "ceiling-light", category: "조명", icon: LampCeiling, title: "슬림 천장등 600", meta: "600 × 600 × 65", color: "#f0e6c9", kind: "light" as const, size: [.6, .065, .6] as [number, number, number], room: "거실", position: [0, 2.2, 1.7] as [number, number, number] },
];

type CatalogItem = (typeof CATALOG)[number];

function Wall({ position, size, color, finish }: { position: [number, number, number]; size: [number, number, number]; color: string; finish?: FinishKey }) {
  const sourceTexture = useTexture(FINISHES[finish ?? "warm-white"].texture);
  const wallpaper = useMemo(() => {
    const texture = sourceTexture.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(Math.max(1, Math.max(size[0], size[2]) / .72), Math.max(1, size[1] / .72));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [sourceTexture, size[0], size[1], size[2]]);

  useEffect(() => () => wallpaper.dispose(), [wallpaper]);
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={finish ? "#ffffff" : color} map={finish ? wallpaper : undefined} roughness={.92} />
    </mesh>
  );
}

const PLAN_WIDTH = 11.7;
const PLAN_DEPTH = 11.17;
const planX = (value: number) => value - PLAN_WIDTH / 2;
const planZ = (value: number) => value - PLAN_DEPTH / 2;

function footprint(item: FurnitureItem) {
  const cos = Math.abs(Math.cos(item.rotation));
  const sin = Math.abs(Math.sin(item.rotation));
  return {
    width: item.size[0] * cos + item.size[2] * sin,
    depth: item.size[0] * sin + item.size[2] * cos,
  };
}

function placementIssue(item: FurnitureItem, items: FurnitureItem[]) {
  const current = footprint(item);
  const halfPlanWidth = PLAN_WIDTH / 2 - .12;
  const halfPlanDepth = PLAN_DEPTH / 2 - .12;
  if (
    Math.abs(item.position[0]) + current.width / 2 > halfPlanWidth ||
    Math.abs(item.position[2]) + current.depth / 2 > halfPlanDepth
  ) return "도면 외곽을 벗어났어요";

  if (item.kind === "light") return null;
  const collision = items.some((other) => {
    if (other.id === item.id || other.kind === "light") return false;
    const next = footprint(other);
    return Math.abs(item.position[0] - other.position[0]) < (current.width + next.width) / 2 - .04
      && Math.abs(item.position[2] - other.position[2]) < (current.depth + next.depth) / 2 - .04;
  });
  return collision ? "다른 제품과 겹쳐 있어요" : null;
}

function findOpenPosition(item: FurnitureItem, items: FurnitureItem[]): [number, number, number] {
  const [startX, y, startZ] = item.position;
  const offsets: Array<[number, number]> = [[0, 0]];
  for (let radius = .6; radius <= 3.6; radius += .6) {
    offsets.push([0, radius], [radius, 0], [-radius, 0], [0, -radius], [radius, radius], [-radius, radius]);
  }
  for (const [dx, dz] of offsets) {
    const candidate = { ...item, position: [startX + dx, y, startZ + dz] as [number, number, number] };
    if (!placementIssue(candidate, items)) return candidate.position;
  }
  return item.position;
}

type RoomSpec = { name: string; x: number; z: number; w: number; d: number; color: string; area?: string };
type WallSpec = { x: number; z: number; w: number; d: number; height?: number; y?: number; material?: "wall" | "glass" };

const ROOMS: RoomSpec[] = [
  { name: "침실2 · 확장", x: 1.45, z: 8.61, w: 2.9, d: 5.13, color: "#ddd1bc" },
  { name: "거실 · 확장", x: 5.25, z: 8.61, w: 4.7, d: 5.13, color: "#b89973" },
  { name: "침실1 · 확장", x: 9.65, z: 8.61, w: 4.1, d: 5.13, color: "#d9cdb8" },
  { name: "침실3", x: 9.95, z: 3.07, w: 3.5, d: 2.93, color: "#ded3bd" },
  { name: "주방/식당", x: 6.45, z: 3.07, w: 3.5, d: 2.93, color: "#aa916b" },
  { name: "욕실1", x: 3.75, z: 3.07, w: 1.9, d: 2.93, color: "#8d918e" },
  { name: "욕실2", x: 10.7, z: 5.29, w: 2, d: 1.51, color: "#858a87" },
  { name: "현관", x: 1.4, z: 5.29, w: 2.8, d: 1.51, color: "#c8c7bf" },
  { name: "복도", x: 6.25, z: 5.29, w: 6.9, d: 1.51, color: "#b89973" },
  { name: "발코니3", x: 5.65, z: .8, w: 1.9, d: 1.6, color: "#d8d4ca" },
  { name: "발코니4", x: 9.95, z: .8, w: 3.5, d: 1.6, color: "#d8d4ca" },
];

// CAD 도면을 수평 반전한 실측 구조.
// 하부 2,900 + 4,700 + 4,100, 깊이 11,170을 그대로 사용한다.
const WALLS: WallSpec[] = [
  // 외곽
  { x: 0, z: 7.85, w: .16, d: 6.64 },
  { x: 11.7, z: 5.59, w: .16, d: 11.17 },
  { x: 8.2, z: 0, w: 7, d: .16 },
  { x: 2.8, z: 3.07, w: .16, d: 2.93 },
  { x: 3.75, z: 1.6, w: 1.9, d: .16 },

  // 현관: 외부 현관문 → 현관 → 우측 유리 중문 → 복도
  { x: .075, z: 4.53, w: .15, d: .16 },
  { x: 2, z: 4.53, w: 1.6, d: .16 },
  { x: .925, z: 6.04, w: 1.85, d: .14 },
  { x: 2.825, z: 6.04, w: .15, d: .14 },
  { x: 2.8, z: 4.59, w: .14, d: .12 },
  { x: 2.8, z: 5.8, w: .14, d: .49 },

  // 욕실1, 주방, 침실3
  { x: 4.7, z: 3.07, w: .14, d: 2.93 },
  { x: 8.2, z: 3.07, w: .14, d: 2.93 },
  { x: 3.02, z: 4.53, w: .44, d: .14 },
  { x: 4.3, z: 4.53, w: .8, d: .14 },
  { x: 8.34, z: 4.53, w: .28, d: .14 },
  { x: 10.47, z: 4.53, w: 2.46, d: .14 },

  // 욕실2
  { x: 9.7, z: 5.29, w: .14, d: 1.51 },
  { x: 9.8, z: 6.04, w: .2, d: .14 },
  { x: 11.2, z: 6.04, w: 1, d: .14 },

  // 침실1 출입구는 도면처럼 상부 벽에 배치
  { x: 7.675, z: 6.04, w: .15, d: .14 },
  { x: 9.175, z: 6.04, w: 1.05, d: .14 },

  // 하부 세 공간의 경계. 방문은 상부 벽에 있고 세로 벽은 확장부까지 연속된다.
  { x: 2.9, z: 8.61, w: .14, d: 5.13 },
  { x: 7.6, z: 8.61, w: .14, d: 5.13 },

  // 상부 발코니 창호와 확장된 전면 외창
  { x: 5.65, z: 1.6, w: 1.9, d: .1, height: .92, y: .46, material: "glass" },
  { x: 9.95, z: 1.6, w: 3.5, d: .1, height: .92, y: .46, material: "glass" },
  { x: 1.45, z: 11.17, w: 2.9, d: .12, height: 1.05, y: .53, material: "glass" },
  { x: 5.25, z: 11.17, w: 4.7, d: .12, height: 1.05, y: .53, material: "glass" },
  { x: 9.65, z: 11.17, w: 4.1, d: .12, height: 1.05, y: .53, material: "glass" },
];

function RoomFloor({ room, showLabel }: { room: RoomSpec; showLabel: boolean }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[planX(room.x), 0, planZ(room.z)]}>
        <planeGeometry args={[room.w - .04, room.d - .04]} />
        <meshStandardMaterial color={room.color} roughness={.84} />
      </mesh>
      {showLabel && <Html position={[planX(room.x), .05, planZ(room.z)]} center className="room-label">{room.name}</Html>}
    </group>
  );
}

function CameraRig({ view }: { view: "3d" | "2d" }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(view === "2d" ? 0 : 12.2, view === "2d" ? 17.2 : 11.4, view === "2d" ? .01 : 14.1);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, view]);
  return null;
}

function ReferenceOverlay({ opacity }: { opacity: number }) {
  const texture = useTexture("/floorplan-reference.jpeg");
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, .018, 0]} renderOrder={3}>
      <planeGeometry args={[PLAN_WIDTH, PLAN_DEPTH]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Door({ x, z, width, rotation = 0 }: { x: number; z: number; width: number; rotation?: number }) {
  return (
    <group position={[planX(x), 1.02, planZ(z)]} rotation-y={rotation}>
      <mesh castShadow position={[width / 2, 0, 0]}>
        <boxGeometry args={[width, 2.04, .045]} />
        <meshStandardMaterial color="#9d7655" roughness={.72} />
      </mesh>
      <mesh position={[width - .08, 0, .038]}>
        <sphereGeometry args={[.035, 10, 10]} />
        <meshStandardMaterial color="#6f6557" metalness={.65} roughness={.25} />
      </mesh>
    </group>
  );
}

function DoorOpening({ x, z, axis, width, rotation, wallColor }: { x: number; z: number; axis: "horizontal" | "vertical"; width: number; rotation: number; wallColor: string }) {
  const headerX = axis === "horizontal" ? x + width / 2 : x;
  const headerZ = axis === "vertical" ? z + width / 2 : z;
  return (
    <group>
      <Wall
        position={[planX(headerX), 2.17, planZ(headerZ)]}
        size={axis === "horizontal" ? [width, .26, .14] : [.14, .26, width]}
        color={wallColor}
      />
      <Door x={x} z={z} width={width - .04} rotation={rotation} />
    </group>
  );
}

function MiddleDoor({ x, z, width, wallColor }: { x: number; z: number; width: number; wallColor: string }) {
  const frame = "#60645f";
  return (
    <group>
      <Wall position={[planX(x), 2.17, planZ(z + width / 2)]} size={[.14, .26, width]} color={wallColor} />
      <group position={[planX(x), 1.03, planZ(z + width / 2)]} rotation-y={-Math.PI / 2}>
        <mesh castShadow>
          <boxGeometry args={[width - .04, 2.02, .035]} />
          <meshStandardMaterial color="#c9d7d5" transparent opacity={.48} roughness={.18} metalness={.06} />
        </mesh>
        <mesh position={[0, 1.01, .024]}><boxGeometry args={[width, .055, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[0, -1.01, .024]}><boxGeometry args={[width, .055, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[-width / 2, 0, .024]}><boxGeometry args={[.055, 2.05, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[width / 2, 0, .024]}><boxGeometry args={[.055, 2.05, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[0, 0, .024]}><boxGeometry args={[.04, 2.02, .055]} /><meshStandardMaterial color={frame} /></mesh>
      </group>
    </group>
  );
}

function MasterBathFixtures() {
  return (
    <group>
      <RoundedBox args={[.56, .42, .72]} radius={.14} position={[planX(10.9), .22, planZ(5.28)]} castShadow>
        <meshStandardMaterial color="#f2f0ea" roughness={.28} />
      </RoundedBox>
      <RoundedBox args={[.52, .12, .38]} radius={.09} position={[planX(10.05), .78, planZ(4.84)]} castShadow>
        <meshStandardMaterial color="#f4f2ed" roughness={.24} />
      </RoundedBox>
    </group>
  );
}

function Chair({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, .34, 0]} castShadow><boxGeometry args={[.43, .08, .43]} /><meshStandardMaterial color="#9d7c5e" /></mesh>
      <mesh position={[0, .65, .18]} rotation-x={-.12} castShadow><boxGeometry args={[.43, .62, .07]} /><meshStandardMaterial color="#9d7c5e" /></mesh>
      {[[-.17, .16, -.16], [.17, .16, -.16], [-.17, .16, .16], [.17, .16, .16]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}><boxGeometry args={[.045, .34, .045]} /><meshStandardMaterial color="#634c39" /></mesh>
      ))}
    </group>
  );
}

function FurnitureModel({ item, selected, invalid, onSelect }: { item: FurnitureItem; selected: boolean; invalid: boolean; onSelect: () => void }) {
  const [w, h, d] = item.size;
  return (
    <group position={item.position} rotation-y={item.rotation} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      {selected && (
        <mesh position={[0, .015 - item.position[1], 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[Math.max(w, d) * .55, Math.max(w, d) * .62, 48]} />
          <meshBasicMaterial color={invalid ? "#c83f3f" : "#d65a36"} transparent opacity={.86} />
        </mesh>
      )}
      {item.kind === "table" && <>
        <RoundedBox args={[w, .1, d]} radius={.05} position={[0, h / 2 - .05, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.55} /></RoundedBox>
        {w > 1 ? <>
          {[[-w*.38, h*.22, -d*.34], [w*.38, h*.22, -d*.34], [-w*.38, h*.22, d*.34], [w*.38, h*.22, d*.34]].map((p, i) => <mesh key={i} position={p as [number, number, number]}><cylinderGeometry args={[.035, .035, h*.72, 12]} /><meshStandardMaterial color="#6c4d37" /></mesh>)}
          <Chair position={[0, 0, -d*.9]} /><Chair position={[0, 0, d*.9]} rotation={Math.PI} />
        </> : <mesh position={[0, -.03, 0]}><cylinderGeometry args={[w*.16, w*.24, h*.78, 24]} /><meshStandardMaterial color="#70533d" roughness={.5} /></mesh>}
      </>}
      {item.kind === "sofa" && <>
        <RoundedBox args={[w, .42, d]} radius={.12} position={[0, -.08, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.95} /></RoundedBox>
        <RoundedBox args={[w, .54, .2]} radius={.08} position={[0, .2, .34]} castShadow><meshStandardMaterial color={item.color} roughness={.95} /></RoundedBox>
        <RoundedBox args={[.16, .45, d]} radius={.06} position={[-w*.47, .05, 0]}><meshStandardMaterial color={item.color} /></RoundedBox>
        <RoundedBox args={[.16, .45, d]} radius={.06} position={[w*.47, .05, 0]}><meshStandardMaterial color={item.color} /></RoundedBox>
        {[-.3, .3].map((ratio) => <RoundedBox key={ratio} args={[w*.43, .12, d*.58]} radius={.055} position={[w*ratio, .17, -.08]} castShadow><meshStandardMaterial color={item.color} roughness={1} /></RoundedBox>)}
        {[-w*.4, w*.4].map((x) => <mesh key={x} position={[x, -.35, 0]}><cylinderGeometry args={[.025, .025, .18, 10]} /><meshStandardMaterial color="#645548" metalness={.3} /></mesh>)}
      </>}
      {item.kind === "bed" && <>
        <RoundedBox args={[w, .32, d]} radius={.08} position={[0, -.07, 0]} castShadow><meshStandardMaterial color={item.color} /></RoundedBox>
        <RoundedBox args={[w*.92, .18, d*.88]} radius={.09} position={[0, .14, .05]} castShadow><meshStandardMaterial color="#eee9df" /></RoundedBox>
        <RoundedBox args={[w, .9, .12]} radius={.06} position={[0, .25, d*.47]} castShadow><meshStandardMaterial color="#9f8069" /></RoundedBox>
        <RoundedBox args={[w*.7, .07, d*.43]} radius={.035} position={[0, .27, -.13]} castShadow><meshStandardMaterial color="#d7c7b7" roughness={1} /></RoundedBox>
        {[-.23, .23].map((ratio) => <RoundedBox key={ratio} args={[w*.38, .12, d*.2]} radius={.06} position={[w*ratio, .3, d*.28]} castShadow><meshStandardMaterial color="#faf8f2" roughness={1} /></RoundedBox>)}
      </>}
      {item.kind === "shelf" && <>
        <mesh castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={item.color} /></mesh>
        {[.15, .48, .81].map((ratio) => <mesh key={ratio} position={[0, -h/2 + h*ratio, -d*.52]}><boxGeometry args={[w*.92, .035, .04]} /><meshStandardMaterial color="#caa77f" /></mesh>)}
        {[-.32, 0, .32].map((ratio) => <mesh key={ratio} position={[w*ratio, 0, -d*.525]}><boxGeometry args={[.025, h*.92, .035]} /><meshStandardMaterial color="#a98261" /></mesh>)}
      </>}
      {item.kind === "island" && <>
        <RoundedBox args={[w, h, d]} radius={.045} castShadow><meshStandardMaterial color={item.color} roughness={.68} /></RoundedBox>
        <mesh position={[0, h*.52, 0]} castShadow><boxGeometry args={[w+.08, .06, d+.08]} /><meshStandardMaterial color="#e1ded7" roughness={.32} /></mesh>
      </>}
      {item.kind === "chair" && <>
        <RoundedBox args={[w, .16, d * .82]} radius={.08} position={[0, -.05, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.9} /></RoundedBox>
        <RoundedBox args={[w, h * .62, .13]} radius={.06} position={[0, h * .19, d * .38]} rotation-x={-.1} castShadow><meshStandardMaterial color={item.color} roughness={.9} /></RoundedBox>
        {[[-w*.35, -h*.28, -d*.3], [w*.35, -h*.28, -d*.3], [-w*.35, -h*.28, d*.3], [w*.35, -h*.28, d*.3]].map((p, i) => <mesh key={i} position={p as [number, number, number]}><cylinderGeometry args={[.025, .025, h*.5, 10]} /><meshStandardMaterial color="#5f5246" metalness={.15} /></mesh>)}
      </>}
      {item.kind === "appliance" && <>
        <RoundedBox args={[w, h, d]} radius={Math.min(.06, w * .08)} castShadow><meshStandardMaterial color={item.color} roughness={.32} metalness={.28} /></RoundedBox>
        <mesh position={[0, 0, d / 2 + .008]}><planeGeometry args={[w * .82, h * .008]} /><meshBasicMaterial color="#777a76" /></mesh>
        <mesh position={[w * .32, 0, d / 2 + .012]}><boxGeometry args={[.018, h * .72, .014]} /><meshStandardMaterial color="#464946" metalness={.7} /></mesh>
      </>}
      {item.kind === "light" && <>
        {h > .1 && <mesh position={[0, .3, 0]}><cylinderGeometry args={[.012, .012, .6, 10]} /><meshStandardMaterial color="#52534e" /></mesh>}
        <RoundedBox args={[w, h, d]} radius={Math.min(.12, w * .3)} castShadow><meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={.8} roughness={.32} /></RoundedBox>
        <pointLight position={[0, -.18, 0]} intensity={1.2} distance={4.2} color="#ffe5b4" />
      </>}
      {selected && <Html position={[0, h / 2 + .42, 0]} center className="object-label"><strong>{item.name}</strong><span>{Math.round(w*1000)} × {Math.round(d*1000)}</span></Html>}
    </group>
  );
}

function ApartmentScene({ finish, view, items, selectedId, invalidId, onSelect, showReference, referenceOpacity }: { finish: FinishKey; view: "3d" | "2d"; items: FurnitureItem[]; selectedId: string | null; invalidId: string | null; onSelect: (id: string | null) => void; showReference: boolean; referenceOpacity: number }) {
  const wall = FINISHES[finish].color;
  return (
    <>
      <color attach="background" args={["#eceae4"]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[-5, 9, 5]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} />
      <CameraRig view={view} />
      {view === "2d" && showReference && <ReferenceOverlay opacity={referenceOpacity} />}
      <group onClick={() => onSelect(null)}>
        {ROOMS.map((room, index) => <RoomFloor key={`${room.name}-${index}`} room={room} showLabel={view === "2d"} />)}
        <Grid args={[12.6, 12]} cellSize={.1} cellThickness={.12} cellColor="#9b8e80" sectionSize={1} sectionColor="#72675d" fadeDistance={18} fadeStrength={2} position={[0, .006, 0]} />
        {WALLS.map((segment, index) => {
          const height = segment.height ?? 2.3;
          return <Wall key={index} position={[planX(segment.x), segment.y ?? height / 2, planZ(segment.z)]} size={[segment.w, height, segment.d]} color={segment.material === "glass" ? "#b9d1d3" : wall} finish={segment.material === "glass" ? undefined : finish} />;
        })}
      </group>
      <DoorOpening x={.15} z={4.53} axis="horizontal" width={1.05} rotation={0} wallColor={wall} />
      <MiddleDoor x={2.8} z={4.65} width={.9} wallColor={wall} />
      <DoorOpening x={1.85} z={6.04} axis="horizontal" width={.9} rotation={0} wallColor={wall} />
      <DoorOpening x={3.24} z={4.53} axis="horizontal" width={.66} rotation={0} wallColor={wall} />
      <DoorOpening x={8.48} z={4.53} axis="horizontal" width={.76} rotation={0} wallColor={wall} />
      <DoorOpening x={7.75} z={6.04} axis="horizontal" width={.9} rotation={0} wallColor={wall} />
      <DoorOpening x={9.9} z={6.04} axis="horizontal" width={.8} rotation={0} wallColor={wall} />
      <MasterBathFixtures />
      {items.map((item) => <FurnitureModel key={item.id} item={item} selected={selectedId === item.id} invalid={invalidId === item.id} onSelect={() => onSelect(item.id)} />)}
      <ContactShadows opacity={.28} scale={16} blur={2.3} far={4} />
      <Environment preset="apartment" environmentIntensity={.35} />
      <OrbitControls makeDefault enableDamping target={[0, 0, 0]} maxPolarAngle={view === "2d" ? .01 : Math.PI / 2.08} minPolarAngle={view === "2d" ? 0 : .35} enableRotate={view !== "2d"} />
    </>
  );
}

export function Studio() {
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [finish, setFinish] = useState<FinishKey>("warm-white");
  const [items, setItems] = useState<FurnitureItem[]>(INITIAL_ITEMS);
  const [selectedId, setSelectedId] = useState<string | null>("dining");
  const [category, setCategory] = useState("가구");
  const [query, setQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [referenceOpacity, setReferenceOpacity] = useState(.52);
  const catalogSequence = useRef(0);
  const noticeTimer = useRef<number | null>(null);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const selectedIssue = useMemo(() => selected ? placementIssue(selected, items) : null, [selected, items]);
  const filteredCatalog = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ko");
    return CATALOG.filter((item) => item.category === category && (!keyword || `${item.title} ${item.meta}`.toLocaleLowerCase("ko").includes(keyword)));
  }, [category, query]);

  useEffect(() => {
    const stored = window.localStorage.getItem("sanghyeon-studio-v3-cad-floorplan");
    if (stored) {
      try { const data = JSON.parse(stored); setItems(data.items ?? INITIAL_ITEMS); setFinish(data.finish ?? "warm-white"); } catch { /* ignore invalid local draft */ }
    }
  }, []);

  const updateSelected = (patch: Partial<FurnitureItem>) => {
    if (!selectedId) return;
    setItems((current) => current.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
    setSaved(false);
  };

  const nudge = (dx: number, dz: number) => {
    if (!selected || selected.fixed) return;
    updateSelected({ position: [selected.position[0] + dx, selected.position[1], selected.position[2] + dz] });
  };

  const showNotice = (message: string) => {
    setActionNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setActionNotice(null), 2200);
  };

  const addCatalogItem = (product: CatalogItem) => {
    let nextSequence = catalogSequence.current + 1;
    while (items.some((item) => item.id === `${product.id}-${nextSequence}`)) nextSequence += 1;
    catalogSequence.current = nextSequence;
    const id = `${product.id}-${nextSequence}`;
    const draft: FurnitureItem = {
      id,
      name: product.title,
      room: product.room,
      kind: product.kind,
      size: [...product.size],
      position: [...product.position],
      rotation: 0,
      color: product.color,
    };
    const next: FurnitureItem = { ...draft, position: findOpenPosition(draft, items) };
    setItems((current) => [...current, next]);
    setSelectedId(id);
    setSaved(false);
    showNotice(`${product.title}을(를) 빈 공간에 배치했어요`);
  };

  const deleteSelected = () => {
    if (!selected || selected.fixed) return;
    setItems((current) => current.filter((item) => item.id !== selected.id));
    setSelectedId(null);
    setSaved(false);
  };

  const save = () => {
    window.localStorage.setItem("sanghyeon-studio-v3-cad-floorplan", JSON.stringify({ items, finish }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Home size={18} /></div><div><strong>Sanghyeon Studio</strong><span>광교상현마을현대 · 33평</span></div></div>
        <div className="project-title"><span className="status-dot" />우리 집 인테리어 <ChevronDown size={14} /></div>
        <div className="header-actions"><button className="icon-button" aria-label="실행 취소"><Undo2 size={17} /></button><button className="secondary-button"><Eye size={16} /> 미리보기</button><button className="primary-button" onClick={save}><Save size={16} /> {saved ? "저장했어요" : "내 기기에 저장"}</button></div>
      </header>

      <section className="workspace">
        <aside className="library-panel">
          <div className="panel-heading"><div><span className="eyebrow">LIBRARY</span><h1>공간 채우기</h1></div><button className="bare-icon" aria-label="패널 닫기"><PanelLeftClose size={19} /></button></div>
          <label className="search"><Search size={16} /><input aria-label="제품 검색" placeholder="가구, 가전, 조명 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <nav className="category-tabs" aria-label="제품 카테고리">
            {[{name:"가구",icon:Sofa},{name:"벽지",icon:Grid2X2},{name:"가전",icon:PackageOpen},{name:"조명",icon:LampCeiling}].map(({ name, icon: Icon }) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}><Icon size={18} /><span>{name}</span></button>)}
          </nav>
          {category === "벽지" ? <div className="finish-list"><div className="section-label">전체 벽지 · 4</div>{(Object.entries(FINISHES) as [FinishKey, typeof FINISHES[FinishKey]][]).map(([key, item]) => <button key={key} className={`finish-card ${finish === key ? "selected" : ""}`} onClick={() => { setFinish(key); setSaved(false); showNotice(`${item.name} 벽지를 전체 벽에 적용했어요`); }}><span className="finish-swatch wallpaper" style={{backgroundImage:`url(${item.texture})`,backgroundColor:item.color}} /><span><strong>{item.name}</strong><small>{item.sub}</small></span>{finish === key && <Sparkles size={16} />}</button>)}</div> : <div className="catalog"><div className="catalog-header"><span className="section-label">추천 {category} · {filteredCatalog.length}</span><span className="catalog-hint">눌러서 배치</span></div><div className="catalog-grid">{filteredCatalog.map(({icon:Icon,...item}) => <button className="product-card" key={item.id} onClick={() => addCatalogItem({ icon: Icon, ...item })}><span className="product-visual" style={{background:`linear-gradient(145deg, ${item.color}, #ece7dd)`}}><Icon size={40} strokeWidth={1.2} /><span className="add-product"><Plus size={13} /></span></span><strong>{item.title}</strong><small>{item.meta}</small></button>)}{filteredCatalog.length === 0 && <div className="catalog-empty">검색 결과가 없어요</div>}</div></div>}
          <div className="accuracy-note"><Maximize2 size={17} /><div><strong>실측 도면 기준</strong><span>제품은 실제 규격 비율로 배치돼요.</span></div></div>
        </aside>

        <section className="canvas-area">
          <div className="room-bar"><span className="eyebrow">CAD MODEL</span><strong>109㎡ 기본형</strong><span>11,700 × 11,170</span><span className="draft-badge">도면 좌우반전 · 3개 공간 확장</span></div>
          <div className="view-switch"><button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}><Grid2X2 size={15} /> 2D</button><button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}><Layers3 size={15} /> 3D</button></div>
          {view === "2d" && <div className="reference-controls">
            <button className={showReference ? "active" : ""} aria-pressed={showReference} onClick={() => setShowReference((current) => !current)}><Eye size={14} /> 도면 대조</button>
            {showReference && <label><span>투명도</span><input aria-label="도면 투명도" type="range" min="0.15" max="0.85" step="0.05" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))} /></label>}
          </div>}
          <Canvas shadows dpr={[1, 1.65]} camera={{ position: [11.6, 10.8, 13.2], fov: 38 }}>
            <Suspense fallback={null}><ApartmentScene finish={finish} view={view} items={items} selectedId={selectedId} invalidId={selectedIssue ? selectedId : null} onSelect={setSelectedId} showReference={showReference} referenceOpacity={referenceOpacity} /></Suspense>
          </Canvas>
          <div className="orientation"><span>N</span><div /></div>
          {actionNotice && <div className="action-notice"><Sparkles size={14} />{actionNotice}</div>}
          {selected && <div className={`selection-summary ${selectedIssue ? "invalid" : ""}`}><strong>{selected.name}</strong><span>{selectedIssue ?? `${Math.round(selected.size[0]*1000)} × ${Math.round(selected.size[2]*1000)} mm · 배치됨`}</span></div>}
          <div className="canvas-help"><Move3D size={15} /> 드래그로 둘러보고, 스크롤로 확대하세요</div>
          <div className="room-legend"><span><i style={{background:"#b89973"}} />거실 4,700</span><span><i style={{background:"#ddd1bc"}} />침실 2,900</span><span><i style={{background:"#d9cdb8"}} />안방 4,100</span></div>
        </section>

        <aside className="property-panel">
          {selected ? <>
            <div className="selection-title"><span className="selection-icon">{selected.kind === "table" ? <SquareStack size={20} /> : <Box size={20} />}</span><div><span className="eyebrow">SELECTED</span><h2>{selected.name}</h2><p>{selected.room}</p></div></div>
            <div className="property-section"><div className="property-heading"><span>제품 규격</span><button>실측값</button></div><div className="measure-grid"><label>너비<strong>{Math.round(selected.size[0]*1000)}<small> mm</small></strong></label><label>깊이<strong>{Math.round(selected.size[2]*1000)}<small> mm</small></strong></label><label>높이<strong>{Math.round(selected.size[1]*1000)}<small> mm</small></strong></label></div></div>
            <div className="property-section"><div className="property-heading"><span>위치 조정</span><small>100mm 단위</small></div><div className="nudge-pad"><button disabled={selected.fixed} onClick={() => nudge(0,-.1)}><ChevronUp /></button><div><button disabled={selected.fixed} onClick={() => nudge(-.1,0)}><ChevronLeft /></button><span>{selected.fixed ? "고정" : "이동"}</span><button disabled={selected.fixed} onClick={() => nudge(.1,0)}><ChevronRight /></button></div><button disabled={selected.fixed} onClick={() => nudge(0,.1)}><ChevronDown /></button></div><div className="edit-actions"><button disabled={selected.fixed} className="rotate-button" onClick={() => updateSelected({rotation:selected.rotation + Math.PI/2})}><RotateCw size={16} /> 90° 회전</button><button disabled={selected.fixed} className="delete-button" onClick={deleteSelected} aria-label="선택 제품 삭제"><Trash2 size={15} /></button></div></div>
            <div className="property-section"><div className="property-heading"><span>배치 상태</span></div><div className={`placement-ok ${selectedIssue ? "invalid" : ""}`}><span>{selectedIssue ? "!" : "✓"}</span><div><strong>{selectedIssue ?? "배치 가능한 위치"}</strong><small>{selectedIssue ? "이동하거나 90° 회전해 간격을 확보하세요" : "도면 안에서 다른 제품과 겹치지 않아요"}</small></div></div></div>
            <div className="property-section surface"><div className="property-heading"><span>소재</span></div><div className="material-chip"><span style={{background:selected.color}} /><div><strong>기존 제품 마감</strong><small>보유 가구 · 변경 없음</small></div></div></div>
          </> : <div className="empty-selection"><div><Move3D size={24} /></div><h2>가구를 선택해보세요</h2><p>크기와 위치를 확인하고<br/>정확하게 배치할 수 있어요.</p></div>}
          <div className="plan-facts"><span className="eyebrow">DRAWING FACTS</span><ul><li><span>01</span>제공 CAD 도면을 좌우반전</li><li><span>02</span>침실2·거실·침실1 발코니 확장</li><li><span>03</span>현관문 → 중문 → 복도 동선</li></ul></div>
        </aside>
      </section>
    </main>
  );
}
