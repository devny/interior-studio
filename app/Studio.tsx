"use client";

import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, Html, OrbitControls, RoundedBox, useTexture } from "@react-three/drei";
import {
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
type FurnitureKind = "table" | "sofa" | "bed" | "daybed" | "shelf" | "cabinet" | "desk" | "island" | "chair" | "stool" | "appliance" | "light" | "ceiling" | "fan";

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
  integrated?: boolean;
};

type FurnitureTransform = Pick<FurnitureItem, "position" | "rotation">;

const FINISHES: Record<FinishKey, { name: string; sub: string; color: string; texture: string }> = {
  "warm-white": { name: "디아망 회벽 크림화이트", sub: "LX Z:IN PR002-12 · 천장 대안 프리모 99126-1", color: "#eee9df", texture: "/materials/wallpaper-plaster-real.webp" },
  sage: { name: "소프트 세이지", sub: "무광 패브릭 벽지", color: "#aeb5a1", texture: "/materials/wallpaper-sage.svg" },
  sand: { name: "샌드 베이지", sub: "세로 직조 질감 벽지", color: "#cbbda6", texture: "/materials/wallpaper-sand.svg" },
  stone: { name: "웜 그레이 린넨", sub: "교차 직조 질감 벽지", color: "#babbb6", texture: "/materials/wallpaper-linen.svg" },
};

const MATERIALS = {
  grandSteady: { name: "구정 그랜드 스테디 165", color: "#bca98d" },
  wallpaper: { name: "LX 디아망 PR002-12 회벽 크림화이트", color: "#eee9df" },
  ceilingAlternative: { name: "개나리 프리모 99126-1", color: "#f2efe8" },
  pw966: { name: "영림 PW966-1 · 영림184", color: "#a9825e" },
  ps102: { name: "영림 PS102 회벽화이트", color: "#eceae3" },
  gravillaCream: { name: "LX 하이막스 그라빌라 크림 GM02", color: "#ddd2bf" },
  veniceCotton: { name: "논현131 VENICE COTTON", color: "#d8d2c5" },
  joinMango: { name: "Caesar JOIN MANGO", color: "#cda15b" },
  veniceCottonGv: { name: "VENICE COTTON GV", color: "#c7bba7" },
  nvBeige: { name: "논현131 NV BEIGE", color: "#cbbba2" },
};

const INITIAL_ITEMS: FurnitureItem[] = [
  // 거실 / 확장 다이닝 — 프로젝트북 V4 확정 보유품
  { id: "living-sofa", name: "자코모 휘몰라 네이비 소파", room: "거실", kind: "sofa", size: [3.15, .9, 1], position: [.95, .45, 2.7], rotation: Math.PI / 2, color: "#344654" },
  { id: "living-stool", name: "자코모 휘몰라 스툴", room: "거실", kind: "stool", size: [.93, .42, .68], position: [-.15, .21, 2.7], rotation: Math.PI / 2, color: "#344654" },
  { id: "living-console", name: "라메리트 몰튼 거실장 B", room: "거실 TV월", kind: "cabinet", size: [1.8, .5, .4], position: [-2.65, .25, 2.7], rotation: Math.PI / 2, color: "#9b6c46" },
  { id: "living-tv", name: "LG OLED77C9KW 77형 벽걸이", room: "거실 TV월", kind: "appliance", size: [1.722, .991, .056], position: [-2.72, 1.28, 2.7], rotation: Math.PI / 2, color: "#202321", integrated: true },
  { id: "dining", name: "라메리트 바움오크 페닉스 오벌 식탁", room: "거실 발코니 확장부", kind: "table", size: [1.8, .75, .95], position: [-.65, .375, 4.45], rotation: 0, color: "#d8d2c7" },
  { id: "dining-light", name: "루이스폴센 PH5", room: "거실 확장 다이닝", kind: "light", size: [.5, .28, .5], position: [-.65, 1.98, 4.45], rotation: 0, color: "#dfb56f", fixed: true },
  { id: "living-ac", name: "거실 시스템에어컨", room: "거실", kind: "ceiling", size: [1.05, .06, .42], position: [.65, 2.25, 1.35], rotation: 0, color: "#f0f0eb", fixed: true },
  { id: "living-fan", name: "루씨에어 Radar3 실링팬", room: "거실", kind: "fan", size: [1.32, .24, 1.32], position: [-.7, 2.02, 2.75], rotation: 0, color: "#efe9de", fixed: true },

  // 안방 — 라메리트 몰튼 세트와 신규 붙박이장
  // 확장창을 막지 않도록 침대 헤드가 거실측 내벽을 향한다.
  { id: "master-bed", name: "라메리트 몰튼 침대 A LK", room: "안방", kind: "bed", size: [1.8, 1, 2.28], position: [4.69, .5, 2.85], rotation: Math.PI / 2, color: "#9c7658" },
  // 왼쪽 벽에는 붙박이장과 화장대를 연속 배치하고, 와이드체스트는 침대 왼쪽에 둬 두 출입문을 비운다.
  { id: "master-vanity", name: "몰튼 화장대 + 거울", room: "안방", kind: "cabinet", size: [1.2, .85, .4], position: [2.05, .425, 1.14], rotation: Math.PI / 2, color: "#a77d5d" },
  { id: "master-chest", name: "몰튼 와이드체스트", room: "안방", kind: "cabinet", size: [1.2, .75, .45], position: [2.94, .375, 2.85], rotation: 0, color: "#9f7556" },
  { id: "master-wardrobe", name: "영림 PS102 붙박이장", room: "안방", kind: "cabinet", size: [2.25, 2.2, .6], position: [2.06, 1.1, 3.08], rotation: Math.PI / 2, color: "#eceae3", fixed: true },
  { id: "master-ac", name: "안방 시스템에어컨", room: "안방", kind: "ceiling", size: [.85, .055, .36], position: [2.35, 2.25, 1.2], rotation: 0, color: "#f0f0eb", fixed: true },
  { id: "master-fan", name: "안방 실링팬", room: "안방", kind: "fan", size: [1.05, .2, 1.05], position: [3.75, 2.04, 2.35], rotation: 0, color: "#eee7dc", fixed: true },

  // 아이방(침실3)
  { id: "child-bed", name: "안데르센 올리버 60cm 하이가드 SS", room: "아이방", kind: "daybed", size: [1.2, .96, 2.12], position: [4.72, .48, -2.53], rotation: 0, color: "#b58a64" },
  // 발코니창과 방문 사이 통로를 비우고 주방측 내벽에 낮은 수납장을 둔다.
  { id: "child-shelf", name: "일룸 에디키즈 슬라이딩 3단", room: "아이방", kind: "shelf", size: [1.19, 1.0545, .392], position: [2.6, .527, -3.18], rotation: Math.PI / 2, color: "#d8d6ce" },
  { id: "child-ac", name: "아이방 시스템에어컨", room: "아이방", kind: "ceiling", size: [.75, .05, .34], position: [4.15, 2.25, -3.55], rotation: 0, color: "#f0f0eb", fixed: true },

  // 작업방(침실2) — 두 개의 1800 책상을 ㄱ자로 분산
  { id: "office-desk-a", name: "우피아 모션데스크 1800 A", room: "부부 작업방", kind: "desk", size: [1.8, .74, .75], position: [-4.85, .37, .88], rotation: 0, color: "#c3aa8b" },
  { id: "office-desk-b", name: "우피아 모션데스크 1800 B", room: "부부 작업방", kind: "desk", size: [1.8, .74, .75], position: [-5.32, .37, 3.15], rotation: Math.PI / 2, color: "#c3aa8b" },
  { id: "office-pc-a", name: "데스크탑 컴퓨터 A", room: "부부 작업방", kind: "appliance", size: [.25, .48, .48], position: [-4.28, .62, .85], rotation: 0, color: "#303433", integrated: true },
  { id: "office-pc-b", name: "데스크탑 컴퓨터 B", room: "부부 작업방", kind: "appliance", size: [.25, .48, .48], position: [-5.3, .62, 3.78], rotation: Math.PI / 2, color: "#303433", integrated: true },
  // 확장창 앞을 비우고 두 책장을 거실측 내벽에 나란히 배치한다.
  { id: "office-shelf-a", name: "데스커 800 오픈형 철제책장 A", room: "부부 작업방", kind: "shelf", size: [.8, 1.061, .32], position: [-3.18, .531, 3.42], rotation: Math.PI / 2, color: "#e7e7e1" },
  { id: "office-shelf-b", name: "데스커 800 오픈형 철제책장 B", room: "부부 작업방", kind: "shelf", size: [.8, 1.061, .32], position: [-3.18, .531, 4.34], rotation: Math.PI / 2, color: "#e7e7e1" },
  { id: "office-ac", name: "작업방 시스템에어컨", room: "부부 작업방", kind: "ceiling", size: [.75, .05, .34], position: [-4.35, 2.25, 4.15], rotation: 0, color: "#f0f0eb", fixed: true },

  // 주방 — 식탁 없음, 보유 가전과 교체 예정 냉장고장
  { id: "island", name: "PW966-1 반도형 아일랜드", room: "주방", kind: "island", size: [1.25, .9, .85], position: [1.1, .45, -2.15], rotation: 0, color: "#a9825e", fixed: true },
  // 시공 사례처럼 냉장고장은 욕실측 벽에 세우고 발코니 출입구를 완전히 비운다.
  { id: "fridge", name: "LG 오브제 컨버터블 냉장전용고", room: "주방 · 측벽 맞춤 냉장고장", kind: "appliance", size: [.595, 1.86, .67], position: [-.81, .93, -1.53], rotation: Math.PI / 2, color: "#e5e2da", fixed: true },
  { id: "kimchi-fridge", name: "LG 오브제 컨버터블 김치냉장고", room: "주방 · 측벽 맞춤 냉장고장", kind: "appliance", size: [.595, 1.86, .67], position: [-.81, .93, -2.16], rotation: Math.PI / 2, color: "#ddd9d0", fixed: true },
  // 싱크·식기세척기는 후면 벽으로, 인덕션·와인셀러만 아일랜드에 둔다.
  { id: "dishwasher", name: "밀레 식기세척기", room: "주방 · 후면 싱크장", kind: "appliance", size: [.598, .805, .57], position: [1.85, .4025, -3.59], rotation: 0, color: "#c8c9c6", fixed: true, integrated: true },
  { id: "induction", name: "디트리쉬 DPI7686GP 인덕션", room: "주방", kind: "appliance", size: [.65, .04, .515], position: [1.25, .93, -2.15], rotation: 0, color: "#252726", fixed: true, integrated: true },
  { id: "wine-cellar", name: "LG 미니와인셀러 W087B", room: "주방", kind: "appliance", size: [.282, .534, .497], position: [.63, .267, -2.15], rotation: 0, color: "#393b39", fixed: true, integrated: true },
  { id: "bath1-vent", name: "힘펠 휴젠뜨3", room: "공용욕실", kind: "ceiling", size: [.45, .055, .45], position: [-2.1, 2.25, -3.25], rotation: 0, color: "#e6e5df", fixed: true },
  { id: "bath2-vent", name: "힘펠 휴젠뜨3", room: "안방욕실", kind: "ceiling", size: [.45, .055, .45], position: [4.85, 2.25, -.25], rotation: 0, color: "#e6e5df", fixed: true },

  // 짧은 현관 — 신발장, 벤치, 음각 선반과 간접조명
  { id: "entry-cabinet", name: "영림 PS102 맞춤 신발장", room: "현관", kind: "cabinet", size: [1.35, 2.15, .35], position: [-5.56, 1.075, -.28], rotation: Math.PI / 2, color: "#eceae3", fixed: true },
  { id: "entry-bench", name: "현관 착석 벤치", room: "현관", kind: "stool", size: [.78, .43, .38], position: [-4.05, .215, -.62], rotation: 0, color: "#aa805e", fixed: true },
  { id: "entry-light", name: "음각 선반 간접조명", room: "현관", kind: "light", size: [.55, .06, .12], position: [-3.28, 1.35, -.35], rotation: Math.PI / 2, color: "#f0d6a2", fixed: true },
];

const STORAGE_KEY = "sanghyeon-studio-v18-master-bed-wall";

const CATALOG = [
  { id: "jacomo-sofa", category: "가구", icon: Sofa, title: "자코모 휘몰라 네이비 소파", meta: "3150 × 1000 × 900", color: "#344654", kind: "sofa" as const, size: [3.15, .9, 1] as [number, number, number], room: "거실", position: [-.6, .45, 2.35] as [number, number, number] },
  { id: "ramerit-table", category: "가구", icon: SquareStack, title: "라메리트 바움오크 페닉스 오벌 식탁", meta: "1800 × 950 × 750", color: "#d8d2c7", kind: "table" as const, size: [1.8, .75, .95] as [number, number, number], room: "거실 확장부", position: [-.6, .375, 4.7] as [number, number, number] },
  { id: "ramerit-bed", category: "가구", icon: Box, title: "라메리트 몰튼 침대 A LK", meta: "1800 × 2280 × 1000", color: "#9c7658", kind: "bed" as const, size: [1.8, 1, 2.28] as [number, number, number], room: "안방", position: [4.55, .5, 2.85] as [number, number, number], rotation: Math.PI / 2 },
  { id: "oliver-daybed", category: "가구", icon: Box, title: "안데르센 올리버 하이가드 SS", meta: "1200 × 2120 × 960", color: "#b58a64", kind: "daybed" as const, size: [1.2, .96, 2.12] as [number, number, number], room: "아이방", position: [4.7, .48, -2.55] as [number, number, number] },
  { id: "iloom-shelf", category: "가구", icon: Box, title: "일룸 에디키즈 슬라이딩 3단", meta: "1190 × 392 × 1054.5", color: "#d8d6ce", kind: "shelf" as const, size: [1.19, 1.0545, .392] as [number, number, number], room: "아이방", position: [2.6, .527, -3.18] as [number, number, number], rotation: Math.PI / 2 },
  { id: "upia-desk", category: "가구", icon: SquareStack, title: "우피아 모션데스크 1800", meta: "1800 × 750 × 740", color: "#c3aa8b", kind: "desk" as const, size: [1.8, .74, .75] as [number, number, number], room: "작업방", position: [-4.35, .37, 1.15] as [number, number, number] },
  { id: "desker-shelf", category: "가구", icon: Box, title: "데스커 800 오픈형 3단", meta: "800 × 320 × 1061", color: "#e7e7e1", kind: "shelf" as const, size: [.8, 1.061, .32] as [number, number, number], room: "작업방", position: [-3.18, .531, 3.42] as [number, number, number], rotation: Math.PI / 2 },
  { id: "oled77", category: "가전", icon: Box, title: "LG OLED77C9KW 77형 벽걸이", meta: "1722 × 56 × 991", color: "#202321", kind: "appliance" as const, size: [1.722, .991, .056] as [number, number, number], room: "거실 TV월", position: [-2.72, 1.28, 2.7] as [number, number, number], rotation: Math.PI / 2 },
  { id: "kitchen-fridge", category: "가전", icon: PackageOpen, title: "LG 오브제 컨버터블 냉장전용고", meta: "595 × 670 × 1860", color: "#e5e2da", kind: "appliance" as const, size: [.595, 1.86, .67] as [number, number, number], room: "주방 · 측벽 맞춤 냉장고장", position: [-.81, .93, -1.53] as [number, number, number], rotation: Math.PI / 2 },
  { id: "kimchi-fridge", category: "가전", icon: PackageOpen, title: "LG 오브제 컨버터블 김치냉장고", meta: "595 × 670 × 1860", color: "#ddd9d0", kind: "appliance" as const, size: [.595, 1.86, .67] as [number, number, number], room: "주방 · 측벽 맞춤 냉장고장", position: [-.81, .93, -2.16] as [number, number, number], rotation: Math.PI / 2 },
  { id: "miele-dishwasher", category: "가전", icon: PackageOpen, title: "밀레 식기세척기", meta: "598 × 570 × 805", color: "#c8c9c6", kind: "appliance" as const, size: [.598, .805, .57] as [number, number, number], room: "주방 · 후면 싱크장", position: [1.85, .4025, -3.59] as [number, number, number] },
  { id: "dietrich-induction", category: "가전", icon: Grid2X2, title: "디트리쉬 DPI7686GP", meta: "650 × 515 × 40", color: "#252726", kind: "appliance" as const, size: [.65, .04, .515] as [number, number, number], room: "주방 반도형 아일랜드", position: [1.25, .93, -2.15] as [number, number, number] },
  { id: "wine-cellar-catalog", category: "가전", icon: PackageOpen, title: "LG 미니와인셀러 W087B", meta: "282 × 497 × 534", color: "#393b39", kind: "appliance" as const, size: [.282, .534, .497] as [number, number, number], room: "주방 반도형 아일랜드", position: [.63, .267, -2.15] as [number, number, number] },
  { id: "system-ac", category: "가전", icon: PackageOpen, title: "1Way 시스템에어컨", meta: "850 × 360 × 55", color: "#f0f0eb", kind: "ceiling" as const, size: [.85, .055, .36] as [number, number, number], room: "침실", position: [2.35, 2.25, 1.2] as [number, number, number] },
  { id: "ph5-pendant", category: "조명", icon: LampCeiling, title: "루이스폴센 PH5", meta: "Ø500 × H267", color: "#dfb56f", kind: "light" as const, size: [.5, .28, .5] as [number, number, number], room: "거실 확장부", position: [-.6, 1.98, 4.7] as [number, number, number] },
  { id: "radar3-fan", category: "조명", icon: LampCeiling, title: "루씨에어 Radar3 실링팬", meta: "Ø1320 × H240", color: "#efe9de", kind: "fan" as const, size: [1.32, .24, 1.32] as [number, number, number], room: "거실", position: [-.75, 2.02, 3.35] as [number, number, number] },
  { id: "himpel", category: "조명", icon: LampCeiling, title: "힘펠 휴젠뜨3", meta: "450 × 450 × 55", color: "#e6e5df", kind: "ceiling" as const, size: [.45, .055, .45] as [number, number, number], room: "욕실", position: [-2.1, 2.25, -3.25] as [number, number, number] },
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
      <meshStandardMaterial color={finish ? "#ffffff" : color} map={finish ? wallpaper : undefined} bumpMap={finish ? wallpaper : undefined} bumpScale={.012} roughness={.94} />
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

  if (["light", "ceiling", "fan"].includes(item.kind)) return null;
  const collision = items.some((other) => {
    if (other.id === item.id || item.integrated || other.integrated || ["light", "ceiling", "fan"].includes(other.kind)) return false;
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
  { name: "침실1", x: 9.65, z: 7.955, w: 4.1, d: 3.83, color: "#d9cdb8" },
  { name: "안방 발코니", x: 9.65, z: 10.52, w: 4.1, d: 1.3, color: "#d8d4ca" },
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

  // 하부 세 공간의 경계. 거실과 침실2는 확장, 안방은 기존 발코니를 유지한다.
  { x: 2.9, z: 8.61, w: .14, d: 5.13 },
  { x: 7.6, z: 7.955, w: .14, d: 3.83 },
  // 거실 확장부에서 비확장 안방 발코니로 이어지는 출입문 양옆 벽
  { x: 7.6, z: 10.02, w: .14, d: .3 },
  { x: 7.6, z: 11.095, w: .14, d: .15 },

  // 안방 비확장 발코니 경계창
  { x: 9.65, z: 9.87, w: 4.1, d: .1, height: 2.05, y: 1.025, material: "glass" },

  // 상부 발코니 창호와 확장된 전면 외창
  // 주방·침실3의 비확장 발코니는 방 내부에서 출입하는 전고 슬라이딩 창호를 유지한다.
  { x: 5.65, z: 1.6, w: 1.9, d: .1, height: 2.05, y: 1.025, material: "glass" },
  { x: 9.95, z: 1.6, w: 3.5, d: .1, height: 2.05, y: 1.025, material: "glass" },
  { x: 1.45, z: 11.17, w: 2.9, d: .12, height: 2.3, y: 1.15, material: "glass" },
  { x: 5.25, z: 11.17, w: 4.7, d: .12, height: 2.3, y: 1.15, material: "glass" },
  { x: 9.65, z: 11.17, w: 4.1, d: .12, height: 2.3, y: 1.15, material: "glass" },
];

function RoomFloor({ room, showLabel }: { room: RoomSpec; showLabel: boolean }) {
  const tiled = /욕실|현관|발코니/.test(room.name);
  const entry = room.name === "현관";
  const bathroom = /욕실/.test(room.name);
  const sourceTexture = useTexture(tiled ? "/materials/floor-porcelain-greige.webp" : "/materials/floor-oak-natural.webp");
  const floorTexture = useMemo(() => {
    const texture = sourceTexture.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(Math.max(.5, room.w / (tiled ? 3.2 : 3)), Math.max(.5, room.d / (tiled ? 3.2 : 3)));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [room.d, room.w, sourceTexture, tiled]);

  useEffect(() => () => floorTexture.dispose(), [floorTexture]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[planX(room.x), 0, planZ(room.z)]}>
        <planeGeometry args={[room.w + .008, room.d + .008]} />
        <meshStandardMaterial color={entry ? MATERIALS.nvBeige.color : bathroom ? MATERIALS.veniceCotton.color : tiled ? "#d8d4ca" : MATERIALS.grandSteady.color} map={floorTexture} bumpMap={floorTexture} bumpScale={tiled ? .014 : .012} roughness={tiled ? .82 : .76} />
      </mesh>
      {showLabel && <Html position={[planX(room.x), .05, planZ(room.z)]} center className="room-label">{room.name}</Html>}
    </group>
  );
}

function TilePanel({ position, width, height, tileWidth, tileHeight, color, rotation = 0 }: { position: [number, number, number]; width: number; height: number; tileWidth: number; tileHeight: number; color: string; rotation?: number }) {
  const verticals = Array.from({ length: Math.floor(width / tileWidth) }, (_, index) => -width / 2 + tileWidth * (index + 1)).filter((x) => x < width / 2 - .01);
  const horizontals = Array.from({ length: Math.floor(height / tileHeight) }, (_, index) => -height / 2 + tileHeight * (index + 1)).filter((y) => y < height / 2 - .01);
  return <group position={position} rotation-y={rotation}>
    <mesh receiveShadow><boxGeometry args={[width, height, .028]} /><meshStandardMaterial color={color} roughness={.76} /></mesh>
    {verticals.map((x) => <mesh key={`v-${x}`} position={[x, 0, .016]}><boxGeometry args={[.008, height, .006]} /><meshStandardMaterial color="#b7afa2" roughness={.9} /></mesh>)}
    {horizontals.map((y) => <mesh key={`h-${y}`} position={[0, y, .016]}><boxGeometry args={[width, .008, .006]} /><meshStandardMaterial color="#b7afa2" roughness={.9} /></mesh>)}
  </group>;
}

function SelectedMaterialSurfaces() {
  return <group>
    {/* 주방: VENICE COTTON 600×1200 가로 시공 */}
    <TilePanel position={[1.18, 1.28, -3.94]} width={2.25} height={.72} tileWidth={1.2} tileHeight={.6} color={MATERIALS.veniceCotton.color} />
    {/* 공용욕실: 기본 VENICE COTTON과 욕조 뒤 JOIN MANGO 포인트면 */}
    <TilePanel position={[-3.045, 1.15, -2.51]} width={2.9} height={2.26} tileWidth={.6} tileHeight={.6} color={MATERIALS.veniceCotton.color} rotation={Math.PI / 2} />
    <TilePanel position={[-2.1, 1.15, -3.972]} width={1.86} height={2.26} tileWidth={1.2} tileHeight={.6} color={MATERIALS.joinMango.color} />
    {/* 안방욕실: 기본 VENICE COTTON과 세면대 뒤 GV 포인트면 */}
    <TilePanel position={[3.858, 1.15, -.295]} width={1.48} height={2.26} tileWidth={.6} tileHeight={.6} color={MATERIALS.veniceCotton.color} rotation={Math.PI / 2} />
    <TilePanel position={[4.85, 1.15, -1.058]} width={1.96} height={2.26} tileWidth={1.2} tileHeight={.6} color={MATERIALS.veniceCottonGv.color} />
  </group>;
}

function InteriorTrim() {
  return <group>
    {WALLS.filter((segment) => segment.material !== "glass").map((segment, index) => <group key={`trim-${index}`}>
      <mesh position={[planX(segment.x), .045, planZ(segment.z)]}><boxGeometry args={[segment.w + .025, .09, segment.d + .025]} /><meshStandardMaterial color={MATERIALS.ps102.color} roughness={.8} /></mesh>
      <mesh position={[planX(segment.x), 2.265, planZ(segment.z)]}><boxGeometry args={[segment.w + .025, .07, segment.d + .025]} /><meshStandardMaterial color={MATERIALS.ps102.color} roughness={.8} /></mesh>
    </group>)}
    {WALLS.filter((segment) => segment.material === "glass").map((segment, index) => {
      const width = segment.w;
      const height = segment.height ?? .92;
      const centerY = segment.y ?? height / 2;
      return <group key={`sash-${index}`} position={[planX(segment.x), centerY, planZ(segment.z)]}>
        <mesh position={[0, height / 2, 0]}><boxGeometry args={[width + .08, .065, .055]} /><meshStandardMaterial color={MATERIALS.ps102.color} roughness={.72} /></mesh>
        <mesh position={[0, -height / 2, 0]}><boxGeometry args={[width + .08, .065, .055]} /><meshStandardMaterial color={MATERIALS.ps102.color} roughness={.72} /></mesh>
        {[-width / 2, width / 2].map((x) => <mesh key={x} position={[x, 0, 0]}><boxGeometry args={[.065, height, .055]} /><meshStandardMaterial color={MATERIALS.ps102.color} roughness={.72} /></mesh>)}
      </group>;
    })}
  </group>;
}

function CameraRig({ view }: { view: "3d" | "2d" }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (view === "2d") {
      const perspective = camera as THREE.PerspectiveCamera;
      const verticalFov = THREE.MathUtils.degToRad(perspective.fov || 38);
      const aspect = Math.max(size.width / size.height, .2);
      const padding = 4;
      const fitDepth = (PLAN_DEPTH + padding) / (2 * Math.tan(verticalFov / 2));
      const fitWidth = (PLAN_WIDTH + padding) / (2 * Math.tan(verticalFov / 2) * aspect);
      camera.position.set(0, Math.max(fitDepth, fitWidth), 1.41);
    } else {
      camera.position.set(12.2, 11.4, 14.1);
    }
    camera.lookAt(0, 0, view === "2d" ? 1.4 : 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width, view]);
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

function Door({ x, z, width, rotation = 0, color = MATERIALS.pw966.color }: { x: number; z: number; width: number; rotation?: number; color?: string }) {
  return (
    <group position={[planX(x), 1.02, planZ(z)]} rotation-y={rotation}>
      <mesh castShadow position={[width / 2, 0, 0]}>
        <boxGeometry args={[width, 2.04, .045]} />
        <meshStandardMaterial color={color} roughness={.76} />
      </mesh>
      <mesh position={[width - .08, 0, .038]}>
        <sphereGeometry args={[.035, 10, 10]} />
        <meshStandardMaterial color="#6f6557" metalness={.65} roughness={.25} />
      </mesh>
    </group>
  );
}

function DoorOpening({ x, z, axis, width, rotation, wallColor, doorColor }: { x: number; z: number; axis: "horizontal" | "vertical"; width: number; rotation: number; wallColor: string; doorColor?: string }) {
  const headerX = axis === "horizontal" ? x + width / 2 : x;
  const headerZ = axis === "vertical" ? z + width / 2 : z;
  return (
    <group>
      <Wall
        position={[planX(headerX), 2.17, planZ(headerZ)]}
        size={axis === "horizontal" ? [width, .26, .14] : [.14, .26, width]}
        color={wallColor}
      />
      <Door x={x} z={z} width={width - .04} rotation={rotation} color={doorColor} />
      <group position={[planX(x + width / 2), 1.03, planZ(z)]}>
        <mesh position={[0, 1.025, 0]}><boxGeometry args={[width + .1, .065, .075]} /><meshStandardMaterial color={doorColor ?? MATERIALS.pw966.color} roughness={.76} /></mesh>
        {[-width / 2, width / 2].map((frameX) => <mesh key={frameX} position={[frameX, 0, 0]}><boxGeometry args={[.065, 2.05, .075]} /><meshStandardMaterial color={doorColor ?? MATERIALS.pw966.color} roughness={.76} /></mesh>)}
      </group>
    </group>
  );
}

function MiddleDoor({ x, z, width, wallColor }: { x: number; z: number; width: number; wallColor: string }) {
  const frame = MATERIALS.ps102.color;
  return (
    <group>
      <Wall position={[planX(x), 2.17, planZ(z + width / 2)]} size={[.14, .26, width]} color={wallColor} />
      <group position={[planX(x), 1.03, planZ(z + width / 2)]} rotation-y={-Math.PI / 2}>
        <mesh castShadow position={[0, .34, 0]}>
          <boxGeometry args={[width - .04, 1.34, .035]} />
          <meshStandardMaterial color="#c9d7d5" transparent opacity={.48} roughness={.18} metalness={.06} />
        </mesh>
        {[-.32, -.24, -.16, -.08, 0, .08, .16, .24, .32].map((ratio) => <mesh key={ratio} position={[width * ratio, .34, .026]}>
          <boxGeometry args={[.012, 1.28, .012]} />
          <meshStandardMaterial color="#eef3f1" transparent opacity={.5} roughness={.2} />
        </mesh>)}
        <mesh castShadow position={[0, -.69, 0]}>
          <boxGeometry args={[width - .04, .68, .045]} />
          <meshStandardMaterial color={MATERIALS.ps102.color} roughness={.72} />
        </mesh>
        <mesh position={[0, 1.01, .024]}><boxGeometry args={[width, .055, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[0, -1.01, .024]}><boxGeometry args={[width, .055, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[-width / 2, 0, .024]}><boxGeometry args={[.055, 2.05, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[width / 2, 0, .024]}><boxGeometry args={[.055, 2.05, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[0, -.34, .024]}><boxGeometry args={[width, .045, .055]} /><meshStandardMaterial color={frame} /></mesh>
        <mesh position={[0, 0, .024]}><boxGeometry args={[.04, 2.02, .055]} /><meshStandardMaterial color={frame} /></mesh>
      </group>
    </group>
  );
}

function BalconySideDoor({ x, z, width }: { x: number; z: number; width: number }) {
  const frame = MATERIALS.ps102.color;
  return (
    <group position={[planX(x), 1.03, planZ(z + width / 2)]} rotation-y={Math.PI / 2}>
      <mesh castShadow>
        <boxGeometry args={[width - .08, 1.92, .03]} />
        <meshStandardMaterial color="#c9d7d5" transparent opacity={.4} roughness={.16} metalness={.05} />
      </mesh>
      <mesh position={[0, 1.01, .025]}><boxGeometry args={[width, .055, .06]} /><meshStandardMaterial color={frame} roughness={.72} /></mesh>
      <mesh position={[0, -1.01, .025]}><boxGeometry args={[width, .055, .06]} /><meshStandardMaterial color={frame} roughness={.72} /></mesh>
      {[-width / 2, width / 2].map((frameX) => <mesh key={frameX} position={[frameX, 0, .025]}><boxGeometry args={[.055, 2.05, .06]} /><meshStandardMaterial color={frame} roughness={.72} /></mesh>)}
      <mesh position={[width * .28, 0, .075]}><boxGeometry args={[.025, .32, .035]} /><meshStandardMaterial color="#8d8c87" metalness={.72} roughness={.2} /></mesh>
    </group>
  );
}

function SlidingBalconyDoor({ x, z, width, panels = 4, handles = true }: { x: number; z: number; width: number; panels?: number; handles?: boolean }) {
  const frame = MATERIALS.ps102.color;
  const panelWidth = width / panels;
  return (
    <group position={[planX(x), 1.025, planZ(z + .006)]}>
      {Array.from({ length: panels }, (_, index) => {
        const panelX = -width / 2 + panelWidth * (index + .5);
        return <mesh key={`glass-${index}`} position={[panelX, 0, .008 + (index % 2) * .012]}>
          <boxGeometry args={[panelWidth - .045, 1.94, .022]} />
          <meshStandardMaterial color="#c7d6d5" transparent opacity={.28} roughness={.12} metalness={.04} />
        </mesh>;
      })}
      <mesh position={[0, 1.01, .03]}><boxGeometry args={[width + .06, .06, .075]} /><meshStandardMaterial color={frame} roughness={.72} /></mesh>
      <mesh position={[0, -1.01, .03]}><boxGeometry args={[width + .06, .07, .075]} /><meshStandardMaterial color={frame} roughness={.72} /></mesh>
      {Array.from({ length: panels + 1 }, (_, index) => -width / 2 + panelWidth * index).map((panelX) => <mesh key={`frame-${panelX}`} position={[panelX, 0, .035]}>
        <boxGeometry args={[.055, 2.04, .075]} />
        <meshStandardMaterial color={frame} roughness={.72} />
      </mesh>)}
      {handles && <>
        <mesh position={[panelWidth * .38, 0, .085]}><boxGeometry args={[.025, .34, .025]} /><meshStandardMaterial color="#84847f" metalness={.72} roughness={.2} /></mesh>
        <mesh position={[-panelWidth * .38, 0, .085]}><boxGeometry args={[.025, .34, .025]} /><meshStandardMaterial color="#84847f" metalness={.72} roughness={.2} /></mesh>
      </>}
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
      <mesh position={[planX(10.05), .99, planZ(4.84)]}><cylinderGeometry args={[.018, .02, .22, 14]} /><meshStandardMaterial color="#8d8c87" metalness={.78} roughness={.16} /></mesh>
      <mesh position={[planX(10.05), 1.35, planZ(4.62)]} rotation-y={Math.PI / 2}><circleGeometry args={[.24, 32]} /><meshStandardMaterial color="#c7d0ce" metalness={.45} roughness={.12} /></mesh>
    </group>
  );
}

function CommonBathFixtures() {
  return (
    <group>
      {/* 정확 도면의 1.9m 폭 안에 욕조-세면기-양변기 순으로 배치 */}
      <RoundedBox args={[1.48, .5, .68]} radius={.055} position={[-2.1, .26, -3.57]} castShadow><meshStandardMaterial color="#eeeae2" roughness={.32} /></RoundedBox>
      <RoundedBox args={[1.32, .36, .53]} radius={.045} position={[-2.1, .48, -3.57]}><meshStandardMaterial color="#c9c8c1" roughness={.26} /></RoundedBox>
      <RoundedBox args={[.48, .42, .68]} radius={.13} position={[-1.55, .22, -1.48]} castShadow><meshStandardMaterial color="#f1efea" roughness={.3} /></RoundedBox>
      <RoundedBox args={[.52, .2, .42]} radius={.045} position={[-2.58, .8, -1.48]} castShadow><meshStandardMaterial color="#efede8" roughness={.28} /></RoundedBox>
      <mesh position={[-2.58, 1.01, -1.5]}><cylinderGeometry args={[.018, .021, .22, 14]} /><meshStandardMaterial color="#8c8175" metalness={.78} roughness={.16} /></mesh>
      <mesh position={[-2.58, 1.38, -1.12]}><circleGeometry args={[.28, 32]} /><meshStandardMaterial color="#c7d0ce" metalness={.42} roughness={.12} /></mesh>
    </group>
  );
}

function KitchenFixtures() {
  return (
    <group position={[1.2, .925, -3.58]}>
      {/* 520 × 400 언더마운트 싱크볼: 상판 위 링 대신 실제 깊이가 보이는 볼 형태 */}
      <RoundedBox args={[.52, .025, .4]} radius={.035} position={[0, .004, 0]}>
        <meshStandardMaterial color="#727775" metalness={.78} roughness={.2} />
      </RoundedBox>
      <RoundedBox args={[.46, .018, .34]} radius={.03} position={[0, .017, 0]}>
        <meshStandardMaterial color="#252a29" metalness={.35} roughness={.32} />
      </RoundedBox>
      <mesh position={[0, .027, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[.025, 20]} />
        <meshStandardMaterial color="#101312" metalness={.45} roughness={.28} />
      </mesh>

      {/* 그로헤 계열의 절제된 ㄱ자형 풀아웃 수전 */}
      <group position={[.2, .02, -.17]}>
        <mesh position={[0, .14, 0]}><cylinderGeometry args={[.022, .026, .28, 18]} /><meshStandardMaterial color="#777b78" metalness={.9} roughness={.12} /></mesh>
        <mesh position={[-.065, .28, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.019, .019, .13, 18]} /><meshStandardMaterial color="#777b78" metalness={.9} roughness={.12} /></mesh>
        <mesh position={[-.13, .235, 0]}><cylinderGeometry args={[.021, .019, .09, 18]} /><meshStandardMaterial color="#777b78" metalness={.9} roughness={.12} /></mesh>
        <mesh position={[.055, .08, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[.009, .009, .11, 12]} /><meshStandardMaterial color="#777b78" metalness={.9} roughness={.12} /></mesh>
      </group>
    </group>
  );
}

function KitchenFridgeCabinet() {
  const cabinet = MATERIALS.pw966.color;
  const shadowGap = "#aaa59b";
  return (
    <group>
      {/* 사례처럼 컨버터블 2대와 팬트리를 하나의 3열 키큰장으로 정렬 */}
      <RoundedBox args={[.75, 2.22, .055]} radius={.012} position={[-.81, 1.11, -1.2]} castShadow>
        <meshStandardMaterial color={cabinet} roughness={.84} />
      </RoundedBox>
      <RoundedBox args={[.75, 2.22, .055]} radius={.012} position={[-.81, 1.11, -3.12]} castShadow>
        <meshStandardMaterial color={cabinet} roughness={.84} />
      </RoundedBox>
      <mesh position={[-.81, 2.12, -2.16]} castShadow>
        <boxGeometry args={[.75, .22, 1.975]} />
        <meshStandardMaterial color={cabinet} roughness={.84} />
      </mesh>
      <mesh position={[-.445, .055, -2.16]}>
        <boxGeometry args={[.035, .11, 1.92]} />
        <meshStandardMaterial color="#b5aea2" roughness={.72} />
      </mesh>
      <RoundedBox args={[.028, 2.06, .575]} radius={.012} position={[-.46, 1.03, -2.79]} castShadow>
        <meshStandardMaterial color={MATERIALS.pw966.color} roughness={.78} />
      </RoundedBox>
      {/* 맞춤장과 가전 사이의 15mm 섀도 갭 */}
      {[-1.225, -1.845, -2.475, -3.095].map((z) => <mesh key={z} position={[-.445, 1.06, z]}>
        <boxGeometry args={[.018, 2.02, .016]} />
        <meshStandardMaterial color={shadowGap} roughness={.64} />
      </mesh>)}
      <mesh position={[-.445, 1.9, -2.16]}>
        <boxGeometry args={[.018, .015, 1.86]} />
        <meshStandardMaterial color={shadowGap} roughness={.64} />
      </mesh>
    </group>
  );
}

function KitchenWallCabinets() {
  const fronts = MATERIALS.pw966.color;
  const countertop = MATERIALS.gravillaCream.color;
  return (
    <group>
      {/* 발코니 문 오른쪽 후면 싱크장 */}
      <RoundedBox args={[2.25, .86, .62]} radius={.025} position={[1.18, .43, -3.62]} castShadow><meshStandardMaterial color={fronts} roughness={.78} /></RoundedBox>
      <mesh position={[1.18, .89, -3.62]} castShadow><boxGeometry args={[2.31, .055, .67]} /><meshStandardMaterial color={countertop} roughness={.4} /></mesh>
      {[.43, 1.18, 1.93].map((x) => <mesh key={x} position={[x, .45, -3.295]}><boxGeometry args={[.014, .76, .014]} /><meshStandardMaterial color="#b8b6b0" /></mesh>)}
      {/* 사례의 ㄱ자 보조 조리대와 상부장 */}
      <RoundedBox args={[.62, .86, 1.75]} radius={.025} position={[2.02, .43, -2.35]} castShadow><meshStandardMaterial color={fronts} roughness={.78} /></RoundedBox>
      <mesh position={[2.02, .89, -2.35]} castShadow><boxGeometry args={[.67, .055, 1.81]} /><meshStandardMaterial color={countertop} roughness={.4} /></mesh>
      <mesh position={[1.18, 1.77, -3.82]} castShadow><boxGeometry args={[2.25, .72, .32]} /><meshStandardMaterial color={fronts} roughness={.82} /></mesh>
      <mesh position={[2.18, 1.77, -2.35]} castShadow><boxGeometry args={[.32, .72, 1.75]} /><meshStandardMaterial color={fronts} roughness={.82} /></mesh>
      <mesh position={[1.18, 1.38, -3.64]}><boxGeometry args={[2.15, .025, .035]} /><meshStandardMaterial color="#ffe8b7" emissive="#ffe8b7" emissiveIntensity={1.2} /></mesh>
      <mesh position={[2, 1.38, -2.35]}><boxGeometry args={[.035, .025, 1.6]} /><meshStandardMaterial color="#ffe8b7" emissive="#ffe8b7" emissiveIntensity={1.2} /></mesh>
      {/* 실제 사례의 후면 조리대 위 소형가전 존 */}
      <RoundedBox args={[.52, .34, .34]} radius={.025} position={[.38, 1.09, -3.55]} castShadow><meshStandardMaterial color="#e9e8e3" roughness={.45} /></RoundedBox>
      <mesh position={[.38, 1.09, -3.375]}><planeGeometry args={[.4, .22]} /><meshStandardMaterial color="#2c302f" metalness={.28} roughness={.14} /></mesh>
      <mesh position={[.1, 1.62, -3.805]}><boxGeometry args={[.34, .9, .045]} /><meshStandardMaterial color={MATERIALS.pw966.color} roughness={.78} /></mesh>
    </group>
  );
}

function EntryCabinetLighting() {
  return <group>
    <mesh position={[-5.53, .13, -.28]} rotation-y={Math.PI / 2}><boxGeometry args={[1.24, .025, .035]} /><meshStandardMaterial color="#ffe3a8" emissive="#ffe3a8" emissiveIntensity={1.5} /></mesh>
    <pointLight position={[-5.28, .22, -.28]} intensity={.55} distance={1.8} color="#ffe5b2" />
  </group>;
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

function ApplianceModel({ item }: { item: FurnitureItem }) {
  const [w, h, d] = item.size;
  const name = item.name;

  if (name.includes("OLED") || name.includes("TV")) {
    return <>
      <RoundedBox args={[w, h, Math.max(d, .045)]} radius={.025} castShadow>
        <meshStandardMaterial color="#171918" roughness={.18} metalness={.25} />
      </RoundedBox>
      <mesh position={[0, 0, d / 2 + .006]}>
        <planeGeometry args={[w * .94, h * .88]} />
        <meshStandardMaterial color="#263331" emissive="#14201f" emissiveIntensity={.25} roughness={.08} />
      </mesh>
      <mesh position={[0, 0, -d / 2 - .025]}><boxGeometry args={[w * .28, h * .34, .035]} /><meshStandardMaterial color="#343735" metalness={.55} roughness={.32} /></mesh>
    </>;
  }

  if (name.includes("데스크탑")) {
    return <>
      <RoundedBox args={[w, h, d]} radius={.025} castShadow><meshStandardMaterial color={item.color} roughness={.3} metalness={.35} /></RoundedBox>
      {[.16, -.16].map((y) => <mesh key={y} position={[0, y * h, d / 2 + .008]} rotation-x={Math.PI / 2}><torusGeometry args={[w * .22, .012, 8, 24]} /><meshStandardMaterial color="#717b78" emissive="#5f8d82" emissiveIntensity={.35} /></mesh>)}
      <mesh position={[w * .28, h * .36, d / 2 + .01]}><sphereGeometry args={[.012, 10, 10]} /><meshStandardMaterial color="#86cbb3" emissive="#86cbb3" emissiveIntensity={1} /></mesh>
    </>;
  }

  if (name.includes("인덕션")) {
    return <>
      <RoundedBox args={[w, Math.max(h, .025), d]} radius={.025} castShadow><meshStandardMaterial color="#171918" roughness={.08} metalness={.18} /></RoundedBox>
      {[[-.23, -.22], [.23, -.22], [-.23, .22], [.23, .22]].map(([x, z], index) => <mesh key={index} position={[x * w, h / 2 + .006, z * d]} rotation-x={-Math.PI / 2}><ringGeometry args={[Math.min(w, d) * .12, Math.min(w, d) * .135, 28]} /><meshStandardMaterial color="#686d69" emissive="#343735" emissiveIntensity={.2} /></mesh>)}
    </>;
  }

  if (name.includes("와인셀러")) {
    return <>
      <RoundedBox args={[w, h, d]} radius={.025} castShadow><meshStandardMaterial color={item.color} roughness={.24} metalness={.35} /></RoundedBox>
      <mesh position={[0, 0, d / 2 + .006]}><planeGeometry args={[w * .82, h * .82]} /><meshStandardMaterial color="#18201f" transparent opacity={.82} roughness={.08} /></mesh>
      {[-.28, 0, .28].map((ratio) => <mesh key={ratio} position={[0, h * ratio, d / 2 + .014]}><boxGeometry args={[w * .7, .012, .012]} /><meshStandardMaterial color="#9c8872" metalness={.25} /></mesh>)}
      <mesh position={[w * .36, 0, d / 2 + .018]}><boxGeometry args={[.014, h * .64, .012]} /><meshStandardMaterial color="#b5aea2" metalness={.75} /></mesh>
    </>;
  }

  if (name.includes("식기세척기")) {
    return <>
      <RoundedBox args={[w, h, d]} radius={.018} castShadow><meshStandardMaterial color={item.color} roughness={.28} metalness={.42} /></RoundedBox>
      <mesh position={[0, h * .34, d / 2 + .008]}><boxGeometry args={[w * .86, .055, .012]} /><meshStandardMaterial color="#474b49" metalness={.65} /></mesh>
      <mesh position={[0, h * .41, d / 2 + .012]}><boxGeometry args={[w * .32, .018, .014]} /><meshStandardMaterial color="#747875" /></mesh>
    </>;
  }

  if (name.includes("오브제 컨버터블")) {
    return <>
      <RoundedBox args={[w, h, d]} radius={.018} castShadow>
        <meshStandardMaterial color="#b7b6b1" roughness={.42} metalness={.18} />
      </RoundedBox>
      {/* 미스트 무광 글라스 1도어와 매립형 포켓 핸들 */}
      <RoundedBox args={[w * .965, h * .965, .028]} radius={.012} position={[0, .008, d / 2 + .008]} castShadow>
        <meshPhysicalMaterial color={item.color} roughness={.62} metalness={.04} clearcoat={.08} clearcoatRoughness={.7} />
      </RoundedBox>
      <mesh position={[w * .39, .02, d / 2 + .026]}>
        <boxGeometry args={[.018, h * .68, .012]} />
        <meshStandardMaterial color="#aaa79f" metalness={.42} roughness={.36} />
      </mesh>
      <mesh position={[-w * .3, -h * .42, d / 2 + .026]}>
        <boxGeometry args={[.07, .018, .01]} />
        <meshStandardMaterial color="#92918d" metalness={.55} roughness={.28} />
      </mesh>
    </>;
  }

  if (name.includes("김치냉장고")) {
    return <>
      <RoundedBox args={[w, h, d]} radius={.028} castShadow><meshStandardMaterial color={item.color} roughness={.24} metalness={.32} /></RoundedBox>
      {[-.2, .18].map((ratio) => <mesh key={ratio} position={[0, h * ratio, d / 2 + .009]}><boxGeometry args={[w * .92, .014, .012]} /><meshStandardMaterial color="#929691" /></mesh>)}
      <mesh position={[w * .34, h * .3, d / 2 + .016]}><boxGeometry args={[.014, h * .22, .014]} /><meshStandardMaterial color="#626764" metalness={.65} /></mesh>
      <mesh position={[0, -h * .34, d / 2 + .014]}><boxGeometry args={[w * .72, .018, .014]} /><meshStandardMaterial color="#737875" /></mesh>
    </>;
  }

  if (name.includes("냉장고")) {
    return <>
      <RoundedBox args={[w, h, d]} radius={.035} castShadow><meshStandardMaterial color={item.color} roughness={.28} metalness={.25} /></RoundedBox>
      <mesh position={[0, 0, d / 2 + .009]}><boxGeometry args={[w * .94, .014, .012]} /><meshStandardMaterial color="#9c9f9b" /></mesh>
      <mesh position={[0, h * .25, d / 2 + .01]}><boxGeometry args={[.014, h * .46, .014]} /><meshStandardMaterial color="#9c9f9b" /></mesh>
      <mesh position={[0, -h * .25, d / 2 + .01]}><boxGeometry args={[.014, h * .46, .014]} /><meshStandardMaterial color="#9c9f9b" /></mesh>
      {[-.055, .055].map((x) => <mesh key={x} position={[x * w, h * .23, d / 2 + .018]}><boxGeometry args={[.016, h * .27, .016]} /><meshStandardMaterial color="#666b68" metalness={.7} /></mesh>)}
      {[-.055, .055].map((x) => <mesh key={x} position={[x * w, -h * .23, d / 2 + .018]}><boxGeometry args={[.016, h * .27, .016]} /><meshStandardMaterial color="#666b68" metalness={.7} /></mesh>)}
    </>;
  }

  return <>
    <RoundedBox args={[w, h, d]} radius={Math.min(.06, w * .08)} castShadow><meshStandardMaterial color={item.color} roughness={.32} metalness={.28} /></RoundedBox>
    <mesh position={[0, 0, d / 2 + .008]}><planeGeometry args={[w * .82, h * .008]} /><meshBasicMaterial color="#777a76" /></mesh>
  </>;
}

function FurnitureModel({ item, selected, invalid, view, onSelect, onMove, onRotate, onInteractionStart, onInteractionEnd }: {
  item: FurnitureItem;
  selected: boolean;
  invalid: boolean;
  view: "3d" | "2d";
  onSelect: () => void;
  onMove: (position: [number, number, number]) => void;
  onRotate: (rotation: number) => void;
  onInteractionStart: () => void;
  onInteractionEnd: (origin: FurnitureTransform) => void;
}) {
  const [w, h, d] = item.size;
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const dragOrigin = useRef<FurnitureTransform | null>(null);
  const grabOffset = useRef(new THREE.Vector3());
  const pointerStart = useRef(new THREE.Vector3());
  const moving = useRef(false);
  const rotating = useRef(false);

  const floorPoint = (event: ThreeEvent<PointerEvent>) => {
    const point = new THREE.Vector3();
    return event.ray.intersectPlane(dragPlane, point) ? point : null;
  };

  const capture = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect();
    if (item.fixed) return false;
    event.target.setPointerCapture(event.pointerId);
    dragOrigin.current = { position: [...item.position], rotation: item.rotation };
    onInteractionStart();
    (event.nativeEvent.target as HTMLElement).style.cursor = "grabbing";
    return true;
  };

  const startMove = (event: ThreeEvent<PointerEvent>) => {
    const point = floorPoint(event);
    if (!point || !capture(event)) return;
    moving.current = true;
    pointerStart.current.copy(point);
    grabOffset.current.set(point.x - item.position[0], 0, point.z - item.position[2]);
  };

  const startRotate = (event: ThreeEvent<PointerEvent>) => {
    if (!capture(event)) return;
    rotating.current = true;
  };

  const updateInteraction = (event: ThreeEvent<PointerEvent>) => {
    if (!moving.current && !rotating.current) return;
    event.stopPropagation();
    const point = floorPoint(event);
    if (!point) return;
    if (moving.current) {
      if (point.distanceTo(pointerStart.current) < .035) return;
      const snap = .1;
      onMove([
        Math.round((point.x - grabOffset.current.x) / snap) * snap,
        item.position[1],
        Math.round((point.z - grabOffset.current.z) / snap) * snap,
      ]);
    } else {
      const angle = Math.atan2(point.x - item.position[0], point.z - item.position[2]);
      const snap = Math.PI / 12;
      onRotate(Math.round(angle / snap) * snap);
    }
  };

  const finishInteraction = (event: ThreeEvent<PointerEvent>) => {
    if (!moving.current && !rotating.current) return;
    event.stopPropagation();
    if (event.target.hasPointerCapture(event.pointerId)) event.target.releasePointerCapture(event.pointerId);
    moving.current = false;
    rotating.current = false;
    (event.nativeEvent.target as HTMLElement).style.cursor = "grab";
    if (dragOrigin.current) onInteractionEnd(dragOrigin.current);
    dragOrigin.current = null;
  };

  return (
    <group
      position={item.position}
      rotation-y={item.rotation}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      onPointerDown={startMove}
      onPointerMove={updateInteraction}
      onPointerUp={finishInteraction}
      onPointerCancel={finishInteraction}
      onPointerOver={(event) => { event.stopPropagation(); (event.nativeEvent.target as HTMLElement).style.cursor = item.fixed ? "pointer" : "grab"; }}
      onPointerOut={(event) => { if (!moving.current && !rotating.current) (event.nativeEvent.target as HTMLElement).style.cursor = "default"; }}
    >
      {selected && (
        <mesh position={[0, .014 - item.position[1], 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[w + .16, d + .16]} />
          <meshBasicMaterial color={item.fixed ? "#777b76" : invalid ? "#c83f3f" : "#d65a36"} transparent opacity={view === "2d" ? .18 : .12} depthWrite={false} />
        </mesh>
      )}
      {selected && !item.fixed && <group position={[0, .045 - item.position[1], d / 2 + .32]}>
        <mesh position={[0, 0, -.16]} rotation-x={Math.PI / 2}><cylinderGeometry args={[.018, .018, .32, 12]} /><meshBasicMaterial color={invalid ? "#c83f3f" : "#d65a36"} /></mesh>
        <mesh onPointerDown={startRotate} onPointerMove={updateInteraction} onPointerUp={finishInteraction} onPointerCancel={finishInteraction}>
          <sphereGeometry args={[.13, 20, 20]} />
          <meshBasicMaterial color={invalid ? "#c83f3f" : "#d65a36"} />
        </mesh>
      </group>}
      {item.kind === "table" && (item.name.includes("페닉스 오벌") ? <>
        {/* 라메리트 1800 오벌: 얇은 FENIX NTM 상판, 오크 하부판과 원목 다리 */}
        <mesh position={[0, h / 2 - .035, 0]} scale={[w, 1, d]} castShadow>
          <cylinderGeometry args={[.5, .5, .07, 64]} />
          <meshStandardMaterial color={item.color} roughness={.92} metalness={0} />
        </mesh>
        <mesh position={[0, h / 2 - .082, 0]} scale={[w * .94, 1, d * .94]} castShadow>
          <cylinderGeometry args={[.5, .5, .035, 64]} />
          <meshStandardMaterial color="#b8875e" roughness={.74} />
        </mesh>
        {[[-w*.34, -d*.3], [w*.34, -d*.3], [-w*.34, d*.3], [w*.34, d*.3]].map(([x, z], i) => <mesh key={i} position={[x, -.04, z]} rotation-y={Math.PI / 4} castShadow>
          <cylinderGeometry args={[.045, .07, h * .82, 4]} />
          <meshStandardMaterial color="#a97850" roughness={.72} />
        </mesh>)}
        {[[-w*.27, -d*.92, Math.PI], [w*.27, -d*.92, Math.PI], [-w*.27, d*.92, 0], [w*.27, d*.92, 0]].map(([x, z, rotation], i) => <Chair key={i} position={[x, 0, z]} rotation={rotation} />)}
      </> : <>
        <RoundedBox args={[w, .1, d]} radius={.05} position={[0, h / 2 - .05, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.55} /></RoundedBox>
        {w > 1 ? <>
          {[[-w*.38, h*.22, -d*.34], [w*.38, h*.22, -d*.34], [-w*.38, h*.22, d*.34], [w*.38, h*.22, d*.34]].map((p, i) => <mesh key={i} position={p as [number, number, number]}><cylinderGeometry args={[.035, .035, h*.72, 12]} /><meshStandardMaterial color="#6c4d37" /></mesh>)}
          <Chair position={[0, 0, -d*.9]} /><Chair position={[0, 0, d*.9]} rotation={Math.PI} />
        </> : <mesh position={[0, -.03, 0]}><cylinderGeometry args={[w*.16, w*.24, h*.78, 24]} /><meshStandardMaterial color="#70533d" roughness={.5} /></mesh>}
      </>)}
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
      {item.kind === "daybed" && <>
        <RoundedBox args={[w, .28, d]} radius={.07} position={[0, -.3, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.7} /></RoundedBox>
        <RoundedBox args={[w*.9, .17, d*.84]} radius={.08} position={[0, -.08, 0]} castShadow><meshStandardMaterial color="#eee8dc" roughness={1} /></RoundedBox>
        <RoundedBox args={[w, h*.62, .11]} radius={.045} position={[0, .12, d*.46]} castShadow><meshStandardMaterial color={item.color} /></RoundedBox>
        <RoundedBox args={[.11, h*.62, d]} radius={.045} position={[-w*.46, .12, 0]} castShadow><meshStandardMaterial color={item.color} /></RoundedBox>
        <RoundedBox args={[.11, h*.42, d*.56]} radius={.045} position={[w*.46, .02, d*.16]} castShadow><meshStandardMaterial color={item.color} /></RoundedBox>
      </>}
      {item.kind === "shelf" && <>
        <mesh castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={item.color} /></mesh>
        {[.15, .48, .81].map((ratio) => <mesh key={ratio} position={[0, -h/2 + h*ratio, -d*.52]}><boxGeometry args={[w*.92, .035, .04]} /><meshStandardMaterial color="#caa77f" /></mesh>)}
        {[-.32, 0, .32].map((ratio) => <mesh key={ratio} position={[w*ratio, 0, -d*.525]}><boxGeometry args={[.025, h*.92, .035]} /><meshStandardMaterial color="#a98261" /></mesh>)}
      </>}
      {item.kind === "cabinet" && <>
        <RoundedBox args={[w, h, d]} radius={.035} castShadow><meshStandardMaterial color={item.color} roughness={.72} /></RoundedBox>
        {[.28, .56].map((ratio) => <mesh key={ratio} position={[0, -h/2 + h*ratio, d/2 + .006]}><boxGeometry args={[w*.9, .018, .012]} /><meshStandardMaterial color="#776353" /></mesh>)}
        {h > 1.5 && [-.25, 0, .25].map((ratio) => <mesh key={ratio} position={[w*ratio, 0, d/2 + .009]}><boxGeometry args={[.014, h*.88, .014]} /><meshStandardMaterial color="#aaa69e" /></mesh>)}
      </>}
      {item.kind === "desk" && <>
        <RoundedBox args={[w, .07, d]} radius={.025} position={[0, h/2 - .04, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.7} /></RoundedBox>
        {[-w*.42, w*.42].map((x) => <group key={x}><mesh position={[x, 0, -d*.38]}><boxGeometry args={[.055, h*.82, .055]} /><meshStandardMaterial color="#676b68" metalness={.45} /></mesh><mesh position={[x, 0, d*.38]}><boxGeometry args={[.055, h*.82, .055]} /><meshStandardMaterial color="#676b68" metalness={.45} /></mesh></group>)}
        <mesh position={[0, h*.68, -d*.12]}><boxGeometry args={[w*.34, .34, .035]} /><meshStandardMaterial color="#282c2b" /></mesh>
      </>}
      {item.kind === "stool" && <RoundedBox args={[w, h, d]} radius={.12} castShadow><meshStandardMaterial color={item.color} roughness={.95} /></RoundedBox>}
      {item.kind === "island" && <>
        <RoundedBox args={[w, h, d]} radius={.045} castShadow><meshStandardMaterial color={item.color} roughness={.68} /></RoundedBox>
        <mesh position={[0, h*.52, 0]} castShadow><boxGeometry args={[w+.08, .06, d+.08]} /><meshStandardMaterial color={MATERIALS.gravillaCream.color} roughness={.38} /></mesh>
      </>}
      {item.kind === "chair" && <>
        <RoundedBox args={[w, .16, d * .82]} radius={.08} position={[0, -.05, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.9} /></RoundedBox>
        <RoundedBox args={[w, h * .62, .13]} radius={.06} position={[0, h * .19, d * .38]} rotation-x={-.1} castShadow><meshStandardMaterial color={item.color} roughness={.9} /></RoundedBox>
        {[[-w*.35, -h*.28, -d*.3], [w*.35, -h*.28, -d*.3], [-w*.35, -h*.28, d*.3], [w*.35, -h*.28, d*.3]].map((p, i) => <mesh key={i} position={p as [number, number, number]}><cylinderGeometry args={[.025, .025, h*.5, 10]} /><meshStandardMaterial color="#5f5246" metalness={.15} /></mesh>)}
      </>}
      {item.kind === "appliance" && <ApplianceModel item={item} />}
      {item.kind === "light" && <>
        {h > .1 && <mesh position={[0, .3, 0]}><cylinderGeometry args={[.012, .012, .6, 10]} /><meshStandardMaterial color="#52534e" /></mesh>}
        {item.name.includes("PH5") ? <group>
          {[{y:.08,r:w*.5},{y:0,r:w*.38},{y:-.07,r:w*.25}].map((part) => <mesh key={part.y} position={[0, part.y, 0]}><cylinderGeometry args={[part.r*.35, part.r, .06, 32]} /><meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={.28} roughness={.45} /></mesh>)}
        </group> : <RoundedBox args={[w, h, d]} radius={Math.min(.12, w * .3)} castShadow><meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={.8} roughness={.32} /></RoundedBox>}
        <pointLight position={[0, -.18, 0]} intensity={1.2} distance={4.2} color="#ffe5b4" />
      </>}
      {item.kind === "ceiling" && <>
        <RoundedBox args={[w, h, d]} radius={.025} castShadow><meshStandardMaterial color={item.color} roughness={.35} /></RoundedBox>
        {[[-w*.28,0], [0,0], [w*.28,0]].map(([x], i) => <mesh key={i} position={[x, -h*.52, 0]}><boxGeometry args={[w*.17, .008, d*.68]} /><meshStandardMaterial color="#babdb8" /></mesh>)}
      </>}
      {item.kind === "fan" && <>
        <mesh position={[0, .13, 0]}><cylinderGeometry args={[.035, .035, .26, 14]} /><meshStandardMaterial color="#676762" /></mesh>
        <mesh><cylinderGeometry args={[.11, .14, .1, 24]} /><meshStandardMaterial color={item.color} /></mesh>
        {[0, Math.PI*2/3, Math.PI*4/3].map((angle) => <RoundedBox key={angle} args={[w*.46, .025, .13]} radius={.05} position={[Math.cos(angle)*w*.23, 0, Math.sin(angle)*w*.23]} rotation-y={-angle} castShadow><meshStandardMaterial color={item.color} roughness={.7} /></RoundedBox>)}
      </>}
      {selected && <Html position={[0, h / 2 + .42, 0]} center className="object-label"><strong>{item.name}</strong><span>{item.fixed ? "시공 고정 · 이동 불가" : `${Math.round(w*1000)} × ${Math.round(d*1000)} · 드래그 이동`}</span></Html>}
    </group>
  );
}

function ApartmentScene({ finish, view, items, selectedId, invalidId, interactingId, onSelect, onMove, onRotate, onInteractionStart, onInteractionEnd, showReference, referenceOpacity }: {
  finish: FinishKey;
  view: "3d" | "2d";
  items: FurnitureItem[];
  selectedId: string | null;
  invalidId: string | null;
  interactingId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, position: [number, number, number]) => void;
  onRotate: (id: string, rotation: number) => void;
  onInteractionStart: (id: string) => void;
  onInteractionEnd: (id: string, origin: FurnitureTransform) => void;
  showReference: boolean;
  referenceOpacity: number;
}) {
  const wall = FINISHES[finish].color;
  return (
    <>
      <color attach="background" args={["#eceae4"]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[-5, 9, 5]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} />
      <CameraRig view={view} />
      {view === "2d" && showReference && <Suspense fallback={null}><ReferenceOverlay opacity={referenceOpacity} /></Suspense>}
      <group onClick={() => onSelect(null)}>
        {ROOMS.map((room, index) => <RoomFloor key={`${room.name}-${index}`} room={room} showLabel={view === "2d"} />)}
        <Grid args={[12.6, 12]} cellSize={.1} cellThickness={.12} cellColor="#9b8e80" sectionSize={1} sectionColor="#72675d" fadeDistance={18} fadeStrength={2} position={[0, .006, 0]} />
        {WALLS.map((segment, index) => {
          const height = segment.height ?? 2.3;
          return <Wall key={index} position={[planX(segment.x), segment.y ?? height / 2, planZ(segment.z)]} size={[segment.w, height, segment.d]} color={segment.material === "glass" ? "#b9d1d3" : wall} finish={segment.material === "glass" ? undefined : finish} />;
        })}
      </group>
      <SelectedMaterialSurfaces />
      <InteriorTrim />
      <DoorOpening x={.15} z={4.53} axis="horizontal" width={1.05} rotation={0} wallColor={wall} doorColor={MATERIALS.ps102.color} />
      <MiddleDoor x={2.8} z={4.65} width={.9} wallColor={wall} />
      <BalconySideDoor x={7.6} z={10.17} width={.85} />
      <SlidingBalconyDoor x={9.65} z={9.87} width={4.1} panels={4} />
      <SlidingBalconyDoor x={5.65} z={1.6} width={1.9} panels={2} />
      <SlidingBalconyDoor x={9.95} z={1.6} width={3.5} panels={4} />
      <SlidingBalconyDoor x={1.45} z={11.17} width={2.9} panels={3} handles={false} />
      <SlidingBalconyDoor x={5.25} z={11.17} width={4.7} panels={4} handles={false} />
      <SlidingBalconyDoor x={9.65} z={11.17} width={4.1} panels={4} handles={false} />
      <DoorOpening x={1.85} z={6.04} axis="horizontal" width={.9} rotation={0} wallColor={wall} />
      <DoorOpening x={3.24} z={4.53} axis="horizontal" width={.66} rotation={0} wallColor={wall} />
      <DoorOpening x={8.48} z={4.53} axis="horizontal" width={.76} rotation={0} wallColor={wall} />
      <DoorOpening x={7.75} z={6.04} axis="horizontal" width={.9} rotation={0} wallColor={wall} />
      <DoorOpening x={9.9} z={6.04} axis="horizontal" width={.8} rotation={0} wallColor={wall} />
      <MasterBathFixtures />
      <CommonBathFixtures />
      <KitchenFixtures />
      <KitchenFridgeCabinet />
      <KitchenWallCabinets />
      <EntryCabinetLighting />
      {items.map((item) => <FurnitureModel
        key={item.id}
        item={item}
        selected={selectedId === item.id}
        invalid={invalidId === item.id}
        view={view}
        onSelect={() => onSelect(item.id)}
        onMove={(position) => onMove(item.id, position)}
        onRotate={(rotation) => onRotate(item.id, rotation)}
        onInteractionStart={() => onInteractionStart(item.id)}
        onInteractionEnd={(origin) => onInteractionEnd(item.id, origin)}
      />)}
      <ContactShadows opacity={.28} scale={16} blur={2.3} far={4} />
      <Environment preset="apartment" environmentIntensity={.35} />
      <OrbitControls key={view} makeDefault enabled={!interactingId} enableDamping target={[0, 0, view === "2d" ? 1.4 : 0]} maxPolarAngle={view === "2d" ? .01 : Math.PI / 2.08} minPolarAngle={view === "2d" ? 0 : .35} enableRotate={view !== "2d"} />
    </>
  );
}

export function Studio() {
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [finish, setFinish] = useState<FinishKey>("warm-white");
  const [items, setItems] = useState<FurnitureItem[]>(INITIAL_ITEMS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interactingId, setInteractingId] = useState<string | null>(null);
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
    const stored = window.localStorage.getItem(STORAGE_KEY);
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

  const moveItem = (id: string, position: [number, number, number]) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, position } : item));
    setSaved(false);
  };

  const rotateItem = (id: string, rotation: number) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, rotation } : item));
    setSaved(false);
  };

  const finishInteraction = (id: string, origin: FurnitureTransform) => {
    const candidate = items.find((item) => item.id === id);
    const issue = candidate ? placementIssue(candidate, items) : null;
    if (issue) {
      setItems((current) => current.map((item) => item.id === id ? { ...item, ...origin } : item));
      showNotice(`${issue} 원래 위치로 되돌렸어요`);
    } else if (candidate) {
      showNotice(`${candidate.name} 배치를 변경했어요`);
    }
    setInteractingId(null);
    setSaved(false);
  };

  const rotateSelected = () => {
    if (!selected || selected.fixed) return;
    const candidate = { ...selected, rotation: selected.rotation + Math.PI / 2 };
    const issue = placementIssue(candidate, items);
    if (issue) {
      showNotice(`${issue} 회전할 공간이 부족해요`);
      return;
    }
    updateSelected({ rotation: candidate.rotation });
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
      rotation: "rotation" in product ? product.rotation : 0,
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, finish }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const restoreProjectbook = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setItems(INITIAL_ITEMS);
    setFinish("warm-white");
    setSelectedId(null);
    setSaved(false);
    showNotice("지정 마감재와 기획서 기본 배치를 복원했어요");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, button, select")) return;
      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (!selected || selected.fixed) return;
      const step = event.shiftKey ? .01 : .1;
      const moves: Record<string, [number, number]> = {
        ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      };
      if (moves[event.key]) {
        event.preventDefault();
        nudge(...moves[event.key]);
      } else if (event.code === "KeyR" || event.key.toLowerCase() === "r") {
        event.preventDefault();
        rotateSelected();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Home size={18} /></div><div><strong>Sanghyeon Studio</strong><span>광교상현마을현대 · 33평</span></div></div>
        <div className="project-title"><span className="status-dot" />프로젝트북 V4 배치안 <ChevronDown size={14} /></div>
        <div className="header-actions"><button className="icon-button" aria-label="기획서 기본 배치 복원" title="기획서 기본 배치 복원" onClick={restoreProjectbook}><Undo2 size={17} /></button><button className="secondary-button" onClick={() => setView("3d")}><Eye size={16} /> 미리보기</button><button className="primary-button" onClick={save}><Save size={16} /> {saved ? "저장했어요" : "내 기기에 저장"}</button></div>
      </header>

      <section className="workspace">
        <aside className="library-panel">
          <div className="panel-heading"><div><span className="eyebrow">LIBRARY</span><h1>공간 채우기</h1></div><button className="bare-icon" aria-label="패널 닫기"><PanelLeftClose size={19} /></button></div>
          <label className="search"><Search size={16} /><input aria-label="제품 검색" placeholder="가구, 가전, 조명 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <nav className="category-tabs" aria-label="제품 카테고리">
            {[{name:"가구",icon:Sofa},{name:"벽지",icon:Grid2X2},{name:"가전",icon:PackageOpen},{name:"조명",icon:LampCeiling}].map(({ name, icon: Icon }) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}><Icon size={18} /><span>{name}</span></button>)}
          </nav>
          {category === "벽지" ? <div className="finish-list"><div className="section-label">전체 벽지 · 4</div>{(Object.entries(FINISHES) as [FinishKey, typeof FINISHES[FinishKey]][]).map(([key, item]) => <button key={key} className={`finish-card ${finish === key ? "selected" : ""}`} onClick={() => { setFinish(key); setSaved(false); showNotice(`${item.name} 벽지를 전체 벽에 적용했어요`); }}><span className="finish-swatch wallpaper" style={{backgroundImage:`url(${item.texture})`,backgroundColor:item.color}} /><span><strong>{item.name}</strong><small>{item.sub}</small></span>{finish === key && <Sparkles size={16} />}</button>)}</div> : <div className="catalog"><div className="catalog-header"><span className="section-label">추천 {category} · {filteredCatalog.length}</span><span className="catalog-hint">눌러서 배치</span></div><div className="catalog-grid">{filteredCatalog.map(({icon:Icon,...item}) => <button className="product-card" key={item.id} onClick={() => addCatalogItem({ icon: Icon, ...item })}><span className="product-visual" style={{background:`linear-gradient(145deg, ${item.color}, #ece7dd)`}}><Icon size={40} strokeWidth={1.2} /><span className="add-product"><Plus size={13} /></span></span><strong>{item.title}</strong><small>{item.meta}</small></button>)}{filteredCatalog.length === 0 && <div className="catalog-empty">검색 결과가 없어요</div>}</div></div>}
          <div className="accuracy-note"><Maximize2 size={17} /><div><strong>실제품 마감재 반영</strong><span>PR002-12 · 그랜드 스테디165 · PW966-1 · PS102</span></div></div>
        </aside>

        <section className="canvas-area">
          <div className="room-bar"><span className="eyebrow">PROJECTBOOK V4</span><strong>109㎡ 전체 배치</strong><span>11,700 × 11,170</span><span className="draft-badge">기획서 품목 {items.length}개 · 좌우반전 · 거실·침실2 확장</span></div>
          <div className="view-switch"><button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}><Grid2X2 size={15} /> 2D</button><button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}><Layers3 size={15} /> 3D</button></div>
          {view === "2d" && <div className="reference-controls">
            <button className={showReference ? "active" : ""} aria-pressed={showReference} onClick={() => setShowReference((current) => !current)}><Eye size={14} /> 도면 대조</button>
            {showReference && <label><span>투명도</span><input aria-label="도면 투명도" type="range" min="0.15" max="0.85" step="0.05" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))} /></label>}
          </div>}
          <Canvas shadows dpr={[1, 1.65]} camera={{ position: [11.6, 10.8, 13.2], fov: 38 }} onPointerMissed={() => setSelectedId(null)}>
            <Suspense fallback={null}><ApartmentScene
              finish={finish}
              view={view}
              items={items}
              selectedId={selectedId}
              invalidId={selectedIssue ? selectedId : null}
              interactingId={interactingId}
              onSelect={setSelectedId}
              onMove={moveItem}
              onRotate={rotateItem}
              onInteractionStart={setInteractingId}
              onInteractionEnd={finishInteraction}
              showReference={showReference}
              referenceOpacity={referenceOpacity}
            /></Suspense>
          </Canvas>
          <div className="orientation"><span>N</span><div /></div>
          {actionNotice && <div className="action-notice"><Sparkles size={14} />{actionNotice}</div>}
          {selected && <div className={`selection-summary ${selectedIssue ? "invalid" : ""}`}><strong>{selected.name}</strong><span>{selectedIssue ?? `${Math.round(selected.size[0]*1000)} × ${Math.round(selected.size[2]*1000)} mm · 배치됨`}</span></div>}
          <div className="canvas-help"><Move3D size={15} /> {selected?.fixed ? "시공 고정 제품 · 위치 변경 불가" : selected ? "가구 드래그: 이동 · 주황 핸들: 15° 회전 · R: 90°" : "빈 공간 드래그: 둘러보기 · 가구 드래그: 이동"}</div>
          <div className="room-legend"><span><i style={{background:"#b89973"}} />거실 4,700</span><span><i style={{background:"#ddd1bc"}} />침실 2,900</span><span><i style={{background:"#d9cdb8"}} />안방 4,100</span></div>
        </section>

        <aside className="property-panel">
          {selected ? <>
            <div className="selection-title"><span className="selection-icon">{selected.kind === "table" ? <SquareStack size={20} /> : <Box size={20} />}</span><div><span className="eyebrow">SELECTED</span><h2>{selected.name}</h2><p>{selected.room}</p></div></div>
            <div className="property-section"><div className="property-heading"><span>제품 규격</span><button>실측값</button></div><div className="measure-grid"><label>너비<strong>{Math.round(selected.size[0]*1000)}<small> mm</small></strong></label><label>깊이<strong>{Math.round(selected.size[2]*1000)}<small> mm</small></strong></label><label>높이<strong>{Math.round(selected.size[1]*1000)}<small> mm</small></strong></label></div></div>
            <div className="property-section"><div className="property-heading"><span>위치 조정</span><small>드래그 · 100mm 단위</small></div><div className="nudge-pad"><button disabled={selected.fixed} onClick={() => nudge(0,-.1)}><ChevronUp /></button><div><button disabled={selected.fixed} onClick={() => nudge(-.1,0)}><ChevronLeft /></button><span>{selected.fixed ? "고정" : "이동"}</span><button disabled={selected.fixed} onClick={() => nudge(.1,0)}><ChevronRight /></button></div><button disabled={selected.fixed} onClick={() => nudge(0,.1)}><ChevronDown /></button></div><div className="edit-actions"><button disabled={selected.fixed} className="rotate-button" onClick={rotateSelected} aria-keyshortcuts="R"><RotateCw size={16} /> 90° 회전 · R</button><button disabled={selected.fixed} className="delete-button" onClick={deleteSelected} aria-label="선택 제품 삭제"><Trash2 size={15} /></button></div><div className="transform-readout"><span>X {selected.position[0].toFixed(2)}m</span><span>Z {selected.position[2].toFixed(2)}m</span><span>{Math.round(THREE.MathUtils.radToDeg(selected.rotation) % 360)}°</span></div></div>
            <div className="property-section"><div className="property-heading"><span>배치 상태</span></div><div className={`placement-ok ${selectedIssue ? "invalid" : ""}`}><span>{selectedIssue ? "!" : "✓"}</span><div><strong>{selectedIssue ?? "배치 가능한 위치"}</strong><small>{selectedIssue ? "이동하거나 90° 회전해 간격을 확보하세요" : "도면 안에서 다른 제품과 겹치지 않아요"}</small></div></div></div>
            <div className="property-section surface"><div className="property-heading"><span>소재</span></div><div className="material-chip"><span style={{background:selected.color}} /><div><strong>기존 제품 마감</strong><small>보유 가구 · 변경 없음</small></div></div></div>
          </> : <div className="empty-selection"><div><Move3D size={24} /></div><h2>가구를 선택해보세요</h2><p>크기와 위치를 확인하고<br/>정확하게 배치할 수 있어요.</p></div>}
          <div className="plan-facts"><span className="eyebrow">PROJECTBOOK FACTS</span><ul><li><span>01</span>제공 도면의 좌우반전 구조·실측 치수 적용</li><li><span>02</span>침실2·거실 확장 / 안방·주방·침실3 발코니 유지</li><li><span>03</span>안방 발코니는 안방 슬라이딩창과 거실측 터닝도어로 출입</li><li><span>04</span>보유품·신규 설비 {INITIAL_ITEMS.length}개 반영</li></ul></div>
        </aside>
      </section>
    </main>
  );
}
