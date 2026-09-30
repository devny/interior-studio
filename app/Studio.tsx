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
  Undo2,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

type FinishKey = "warm-white" | "sage" | "sand" | "stone";
type FurnitureKind = "table" | "sofa" | "bed" | "shelf" | "island";

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

const FINISHES: Record<FinishKey, { name: string; sub: string; color: string }> = {
  "warm-white": { name: "웜 화이트", sub: "LX 디아망 모던회벽", color: "#e8e3d7" },
  sage: { name: "소프트 세이지", sub: "무광 친환경 페인트", color: "#aeb5a1" },
  sand: { name: "샌드 베이지", sub: "미세 질감 벽지", color: "#cbbda6" },
  stone: { name: "스톤 그레이", sub: "600각 포세린 타일", color: "#7f807b" },
};

const INITIAL_ITEMS: FurnitureItem[] = [
  { id: "dining", name: "라메리트 식탁", room: "거실 확장부", kind: "table", size: [1.8, .76, .95], position: [-.8, .38, 4.14], rotation: 0, color: "#a7754b" },
  { id: "sofa", name: "패브릭 소파", room: "거실", kind: "sofa", size: [2.6, .78, .92], position: [-1.05, .39, 1.55], rotation: 0, color: "#b4aa98" },
  { id: "bed", name: "라메리트 침대", room: "안방", kind: "bed", size: [1.68, .46, 2.12], position: [3.72, .23, 2.65], rotation: 0, color: "#b49a7f" },
  { id: "shelf", name: "보유 책장 세트", room: "서재", kind: "shelf", size: [1.8, 2.05, .34], position: [-4.48, 1.03, 1.27], rotation: Math.PI / 2, color: "#7a5b44" },
  { id: "island", name: "키친핏 주방", room: "주방/식당", kind: "island", size: [2.4, .9, .64], position: [.85, .45, -2.0], rotation: 0, color: "#d4cfc3", fixed: true },
];

const CATALOG = [
  { icon: Sofa, title: "3인 패브릭 소파", meta: "2600 × 920 × 780", color: "#c3b9a7" },
  { icon: Armchair, title: "라운드 라운지 체어", meta: "760 × 820 × 740", color: "#8e9683" },
  { icon: LampCeiling, title: "오팔 펜던트 300", meta: "Ø300 × H240", color: "#e8d7ad" },
  { icon: SquareStack, title: "오크 사이드 테이블", meta: "450 × 450 × 510", color: "#ad8058" },
];

function Wall({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={.88} />
    </mesh>
  );
}

const PLAN_WIDTH = 11.7;
const PLAN_DEPTH = 10.07;
const planX = (value: number) => value - PLAN_WIDTH / 2;
const planZ = (value: number) => value - PLAN_DEPTH / 2;

type RoomSpec = { name: string; x: number; z: number; w: number; d: number; color: string; area?: string };
type WallSpec = { x: number; z: number; w: number; d: number; height?: number; y?: number; material?: "wall" | "glass" };

const ROOMS: RoomSpec[] = [
  { name: "침실 9.52", x: 1.45, z: 6.71, w: 2.9, d: 3.53, color: "#ddd1bc" },
  { name: "거실 27.47", x: 5.25, z: 7.25, w: 4.7, d: 5.64, color: "#b89973" },
  { name: "안방 14.71", x: 9.65, z: 7.86, w: 4.1, d: 3.83, color: "#d9cdb8" },
  { name: "침실 9.45", x: 9.95, z: 2.97, w: 3.5, d: 2.93, color: "#ded3bd" },
  { name: "주방/식당 9.49", x: 6.5, z: 2.97, w: 3.4, d: 2.93, color: "#aa916b" },
  { name: "공용욕실", x: 3.85, z: 3.27, w: 1.9, d: 2.32, color: "#8d918e" },
  { name: "안방욕실", x: 10.4, z: 5.18, w: 2.6, d: 1.5, color: "#858a87" },
  { name: "현관", x: 1.45, z: 4.19, w: 2.9, d: 1.51, color: "#c8c7bf" },
  { name: "복도", x: 6.95, z: 5.18, w: 4.3, d: 1.5, color: "#b89973" },
  { name: "침실 발코니", x: 1.45, z: 9.27, w: 2.9, d: 1.6, color: "#d8d4ca" },
  { name: "안방 발코니", x: 9.65, z: 9.92, w: 4.1, d: .3, color: "#d8d4ca" },
  { name: "다용도실", x: 3.85, z: 1.43, w: 1.9, d: 1.35, color: "#d8d4ca" },
  { name: "주방 발코니", x: 6.5, z: .75, w: 3.4, d: 1.5, color: "#d8d4ca" },
  { name: "침실 발코니", x: 9.95, z: .75, w: 3.5, d: 1.5, color: "#d8d4ca" },
];

// 원본 109㎡ 기본형 도면의 치수선(2,900 + 4,700 + 4,100 / 10,070)을
// 기준으로 다시 그린 벽체. 문과 확장부는 벽을 놓지 않고 실제 개구부로 남긴다.
const WALLS: WallSpec[] = [
  // 외곽선과 현관의 꺾인 형태
  { x: 0, z: 7.5, w: .16, d: 5.14 },
  { x: 1.45, z: 3.43, w: 1.95, d: .16 },
  { x: 2.82, z: 3.43, w: .16, d: .16 },
  { x: 2.9, z: 1.43, w: .16, d: 1.35 },
  { x: 3.85, z: .75, w: 1.9, d: .16 },
  { x: 4.8, z: .38, w: .16, d: .76 },
  { x: 8.25, z: 0, w: 6.9, d: .16 },
  { x: 11.7, z: 5.04, w: .16, d: 10.07 },

  // 현관, 공용욕실, 다용도실
  { x: 1.45, z: 4.94, w: 2.9, d: .14 },
  { x: 2.9, z: 3.67, w: .14, d: .48 },
  { x: 2.9, z: 4.82, w: .14, d: .24 },
  { x: 3.85, z: 2.1, w: 1.9, d: .14 },
  { x: 2.9, z: 2.77, w: .14, d: 1.34 },
  { x: 4.8, z: 2.97, w: .14, d: 2.94 },
  { x: 3.03, z: 4.43, w: .26, d: .14 },
  { x: 4.36, z: 4.43, w: .88, d: .14 },

  // 주방, 침실 9.45와 복도
  { x: 8.2, z: 2.97, w: .14, d: 2.94 },
  { x: 8.33, z: 4.43, w: .26, d: .14 },
  { x: 10.45, z: 4.43, w: 2.5, d: .14 },

  // 안방욕실: 복도에서 출입하는 문 개구부 포함
  { x: 9.1, z: 5.18, w: .14, d: 1.5 },
  { x: 11.42, z: 5.18, w: .56, d: .14 },
  { x: 9.18, z: 5.93, w: .16, d: .14 },
  { x: 10.88, z: 5.93, w: 1.64, d: .14 },

  // 침실 9.52, 거실, 안방 사이 벽 — 각 방문 폭만 비움
  { x: 2.9, z: 5.04, w: .14, d: .2 },
  { x: 2.9, z: 7.24, w: .14, d: 2.47 },
  { x: 7.6, z: 6, w: .14, d: .12 },
  { x: 7.6, z: 8.34, w: .14, d: 2.87 },

  // 발코니 칸막이. 거실은 확장형이므로 중간 벽을 두지 않는다.
  { x: 2.9, z: 9.27, w: .14, d: 1.6 },
  { x: 7.6, z: 9.92, w: .14, d: .3 },
  { x: 1.45, z: 8.47, w: 2.9, d: .1, height: .92, y: .46, material: "glass" },
  { x: 9.65, z: 9.77, w: 4.1, d: .1, height: .92, y: .46, material: "glass" },
  { x: 6.5, z: 1.5, w: 3.4, d: .1, height: .92, y: .46, material: "glass" },
  { x: 9.95, z: 1.5, w: 3.5, d: .1, height: .92, y: .46, material: "glass" },
  { x: 1.45, z: 10.07, w: 2.9, d: .12, height: 1.05, y: .53, material: "glass" },
  { x: 5.25, z: 10.07, w: 4.7, d: .12, height: 1.05, y: .53, material: "glass" },
  { x: 9.65, z: 10.07, w: 4.1, d: .12, height: 1.05, y: .53, material: "glass" },
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
    camera.position.set(view === "2d" ? 0 : 11.6, view === "2d" ? 16 : 10.8, view === "2d" ? .01 : 13.2);
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
    <mesh rotation-x={-Math.PI / 2} position={[-1.42, .018, -.08]} renderOrder={3}>
      <planeGeometry args={[14.55, 11.12]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Door({ x, z, rotation = 0 }: { x: number; z: number; rotation?: number }) {
  return (
    <group position={[planX(x), 1, planZ(z)]} rotation-y={rotation}>
      <mesh castShadow position={[.36, 0, 0]}>
        <boxGeometry args={[.76, 2, .045]} />
        <meshStandardMaterial color="#9d7655" roughness={.72} />
      </mesh>
      <mesh position={[.7, 0, .038]}>
        <sphereGeometry args={[.035, 10, 10]} />
        <meshStandardMaterial color="#6f6557" metalness={.65} roughness={.25} />
      </mesh>
    </group>
  );
}

function MasterBathFixtures() {
  return (
    <group>
      <RoundedBox args={[.56, .42, .72]} radius={.14} position={[planX(10.45), .22, planZ(5.16)]} castShadow>
        <meshStandardMaterial color="#f2f0ea" roughness={.28} />
      </RoundedBox>
      <RoundedBox args={[.52, .12, .38]} radius={.09} position={[planX(9.42), .78, planZ(4.72)]} castShadow>
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

function FurnitureModel({ item, selected, onSelect }: { item: FurnitureItem; selected: boolean; onSelect: () => void }) {
  const [w, h, d] = item.size;
  return (
    <group position={item.position} rotation-y={item.rotation} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      {selected && (
        <mesh position={[0, .015 - item.position[1], 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[Math.max(w, d) * .55, Math.max(w, d) * .62, 48]} />
          <meshBasicMaterial color="#d65a36" transparent opacity={.8} />
        </mesh>
      )}
      {item.kind === "table" && <>
        <RoundedBox args={[w, .1, d]} radius={.05} position={[0, h / 2 - .05, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.55} /></RoundedBox>
        {[[-w*.38, h*.22, -d*.34], [w*.38, h*.22, -d*.34], [-w*.38, h*.22, d*.34], [w*.38, h*.22, d*.34]].map((p, i) => <mesh key={i} position={p as [number, number, number]}><cylinderGeometry args={[.035, .035, h*.72, 12]} /><meshStandardMaterial color="#6c4d37" /></mesh>)}
        <Chair position={[0, 0, -.75]} /><Chair position={[0, 0, .75]} rotation={Math.PI} />
      </>}
      {item.kind === "sofa" && <>
        <RoundedBox args={[w, .42, d]} radius={.12} position={[0, -.08, 0]} castShadow><meshStandardMaterial color={item.color} roughness={.95} /></RoundedBox>
        <RoundedBox args={[w, .54, .2]} radius={.08} position={[0, .2, .34]} castShadow><meshStandardMaterial color={item.color} roughness={.95} /></RoundedBox>
        <RoundedBox args={[.16, .45, d]} radius={.06} position={[-w*.47, .05, 0]}><meshStandardMaterial color={item.color} /></RoundedBox>
        <RoundedBox args={[.16, .45, d]} radius={.06} position={[w*.47, .05, 0]}><meshStandardMaterial color={item.color} /></RoundedBox>
      </>}
      {item.kind === "bed" && <>
        <RoundedBox args={[w, .32, d]} radius={.08} position={[0, -.07, 0]} castShadow><meshStandardMaterial color={item.color} /></RoundedBox>
        <RoundedBox args={[w*.92, .18, d*.88]} radius={.09} position={[0, .14, .05]} castShadow><meshStandardMaterial color="#eee9df" /></RoundedBox>
        <RoundedBox args={[w, .9, .12]} radius={.06} position={[0, .25, d*.47]} castShadow><meshStandardMaterial color="#9f8069" /></RoundedBox>
      </>}
      {item.kind === "shelf" && <>
        <mesh castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={item.color} /></mesh>
        {[.15, .48, .81].map((ratio) => <mesh key={ratio} position={[0, -h/2 + h*ratio, -d*.52]}><boxGeometry args={[w*.92, .035, .04]} /><meshStandardMaterial color="#caa77f" /></mesh>)}
      </>}
      {item.kind === "island" && <>
        <RoundedBox args={[w, h, d]} radius={.045} castShadow><meshStandardMaterial color={item.color} roughness={.68} /></RoundedBox>
        <mesh position={[0, h*.52, 0]} castShadow><boxGeometry args={[w+.08, .06, d+.08]} /><meshStandardMaterial color="#e1ded7" roughness={.32} /></mesh>
      </>}
      {selected && <Html position={[0, h / 2 + .42, 0]} center className="object-label"><strong>{item.name}</strong><span>{Math.round(w*1000)} × {Math.round(d*1000)}</span></Html>}
    </group>
  );
}

function ApartmentScene({ finish, view, items, selectedId, onSelect, showReference, referenceOpacity }: { finish: FinishKey; view: "3d" | "2d"; items: FurnitureItem[]; selectedId: string | null; onSelect: (id: string | null) => void; showReference: boolean; referenceOpacity: number }) {
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
        <Grid args={[12.6, 11]} cellSize={.1} cellThickness={.12} cellColor="#9b8e80" sectionSize={1} sectionColor="#72675d" fadeDistance={18} fadeStrength={2} position={[0, .006, 0]} />
        {WALLS.map((segment, index) => {
          const height = segment.height ?? 2.3;
          return <Wall key={index} position={[planX(segment.x), segment.y ?? height / 2, planZ(segment.z)]} size={[segment.w, height, segment.d]} color={segment.material === "glass" ? "#b9d1d3" : wall} />;
        })}
      </group>
      <Door x={1.95} z={3.43} rotation={-Math.PI / 2.8} />
      <Door x={2.9} z={3.95} rotation={Math.PI / 2 + Math.PI / 2.8} />
      <Door x={2.9} z={5.14} rotation={Math.PI / 2 + Math.PI / 2.8} />
      <Door x={3.16} z={4.43} rotation={Math.PI / 2.8} />
      <Door x={8.46} z={4.43} rotation={-Math.PI / 2.8} />
      <Door x={7.6} z={6.05} rotation={Math.PI / 2 + Math.PI / 2.8} />
      <Door x={9.26} z={5.93} rotation={Math.PI / 2.8} />
      <MasterBathFixtures />
      {items.map((item) => <FurnitureModel key={item.id} item={item} selected={selectedId === item.id} onSelect={() => onSelect(item.id)} />)}
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
  const [saved, setSaved] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [referenceOpacity, setReferenceOpacity] = useState(.52);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  useEffect(() => {
    const stored = window.localStorage.getItem("sanghyeon-studio-v2-floorplan");
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

  const save = () => {
    window.localStorage.setItem("sanghyeon-studio-v2-floorplan", JSON.stringify({ items, finish }));
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
          <label className="search"><Search size={16} /><input aria-label="제품 검색" placeholder="가구, 가전, 조명 검색" /></label>
          <nav className="category-tabs" aria-label="제품 카테고리">
            {[{name:"가구",icon:Sofa},{name:"마감재",icon:Grid2X2},{name:"가전",icon:PackageOpen},{name:"조명",icon:LampCeiling}].map(({ name, icon: Icon }) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}><Icon size={18} /><span>{name}</span></button>)}
          </nav>
          {category === "마감재" ? <div className="finish-list"><div className="section-label">벽 마감 · 4</div>{(Object.entries(FINISHES) as [FinishKey, typeof FINISHES[FinishKey]][]).map(([key, item]) => <button key={key} className={`finish-card ${finish === key ? "selected" : ""}`} onClick={() => { setFinish(key); setSaved(false); }}><span className="finish-swatch" style={{background:item.color}} /><span><strong>{item.name}</strong><small>{item.sub}</small></span>{finish === key && <Sparkles size={16} />}</button>)}</div> : <div className="catalog"><div className="catalog-header"><span className="section-label">추천 {category}</span><button>전체 보기 <ChevronRight size={13} /></button></div><div className="catalog-grid">{CATALOG.map(({icon:Icon,...item}) => <button className="product-card" key={item.title}><span className="product-visual" style={{background:`linear-gradient(145deg, ${item.color}, #ece7dd)`}}><Icon size={40} strokeWidth={1.2} /></span><strong>{item.title}</strong><small>{item.meta}</small></button>)}</div></div>}
          <div className="accuracy-note"><Maximize2 size={17} /><div><strong>실측 전 초안</strong><span>평면 구조와 가구 규격을 먼저 검토하고 있어요.</span></div></div>
        </aside>

        <section className="canvas-area">
          <div className="room-bar"><span className="eyebrow">DRAWING MODEL</span><strong>109㎡ 기본형</strong><span>전용 76.33㎡</span><span className="draft-badge">현관 왼쪽 · 원본 방향</span></div>
          <div className="view-switch"><button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}><Grid2X2 size={15} /> 2D</button><button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}><Layers3 size={15} /> 3D</button></div>
          {view === "2d" && <div className="reference-controls">
            <button className={showReference ? "active" : ""} aria-pressed={showReference} onClick={() => setShowReference((current) => !current)}><Eye size={14} /> 도면 대조</button>
            {showReference && <label><span>투명도</span><input aria-label="도면 투명도" type="range" min="0.15" max="0.85" step="0.05" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))} /></label>}
          </div>}
          <Canvas shadows dpr={[1, 1.65]} camera={{ position: [11.6, 10.8, 13.2], fov: 38 }}>
            <Suspense fallback={null}><ApartmentScene finish={finish} view={view} items={items} selectedId={selectedId} onSelect={setSelectedId} showReference={showReference} referenceOpacity={referenceOpacity} /></Suspense>
          </Canvas>
          <div className="orientation"><span>N</span><div /></div>
          <div className="canvas-help"><Move3D size={15} /> 드래그로 둘러보고, 스크롤로 확대하세요</div>
          <div className="room-legend"><span><i style={{background:"#b89973"}} />거실 4,700</span><span><i style={{background:"#ddd1bc"}} />침실 2,900</span><span><i style={{background:"#d9cdb8"}} />안방 4,100</span></div>
        </section>

        <aside className="property-panel">
          {selected ? <>
            <div className="selection-title"><span className="selection-icon">{selected.kind === "table" ? <SquareStack size={20} /> : <Box size={20} />}</span><div><span className="eyebrow">SELECTED</span><h2>{selected.name}</h2><p>{selected.room}</p></div></div>
            <div className="property-section"><div className="property-heading"><span>제품 규격</span><button>실측값</button></div><div className="measure-grid"><label>너비<strong>{Math.round(selected.size[0]*1000)}<small> mm</small></strong></label><label>깊이<strong>{Math.round(selected.size[2]*1000)}<small> mm</small></strong></label><label>높이<strong>{Math.round(selected.size[1]*1000)}<small> mm</small></strong></label></div></div>
            <div className="property-section"><div className="property-heading"><span>위치 조정</span><small>100mm 단위</small></div><div className="nudge-pad"><button onClick={() => nudge(0,-.1)}><ChevronUp /></button><div><button onClick={() => nudge(-.1,0)}><ChevronLeft /></button><span>{selected.fixed ? "고정" : "이동"}</span><button onClick={() => nudge(.1,0)}><ChevronRight /></button></div><button onClick={() => nudge(0,.1)}><ChevronDown /></button></div><button disabled={selected.fixed} className="rotate-button" onClick={() => updateSelected({rotation:selected.rotation + Math.PI/2})}><RotateCw size={16} /> 90° 회전</button></div>
            <div className="property-section"><div className="property-heading"><span>배치 상태</span></div><div className="placement-ok"><span>✓</span><div><strong>배치 가능한 위치</strong><small>현재 다른 가구와 겹치지 않아요</small></div></div></div>
            <div className="property-section surface"><div className="property-heading"><span>소재</span></div><div className="material-chip"><span style={{background:selected.color}} /><div><strong>기존 제품 마감</strong><small>보유 가구 · 변경 없음</small></div></div></div>
          </> : <div className="empty-selection"><div><Move3D size={24} /></div><h2>가구를 선택해보세요</h2><p>크기와 위치를 확인하고<br/>정확하게 배치할 수 있어요.</p></div>}
          <div className="plan-facts"><span className="eyebrow">DRAWING FACTS</span><ul><li><span>01</span>현관 왼쪽 · 원본 도면 방향</li><li><span>02</span>거실 4,700 · 전면 발코니 1,600</li><li><span>03</span>안방 욕실은 변기·세면대 구성</li></ul></div>
        </aside>
      </section>
    </main>
  );
}
