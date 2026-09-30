"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, Html, OrbitControls, RoundedBox } from "@react-three/drei";
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
  { id: "dining", name: "라메리트 식탁", room: "거실 확장부", kind: "table", size: [1.8, .76, .95], position: [-3.05, .38, -2.2], rotation: 0, color: "#a7754b" },
  { id: "sofa", name: "패브릭 소파", room: "거실", kind: "sofa", size: [2.6, .78, .92], position: [-2.45, .39, .42], rotation: Math.PI / 2, color: "#b4aa98" },
  { id: "bed", name: "라메리트 침대", room: "안방", kind: "bed", size: [1.68, .46, 2.12], position: [2.55, .23, -1.8], rotation: 0, color: "#b49a7f" },
  { id: "shelf", name: "보유 책장 세트", room: "서재", kind: "shelf", size: [1.8, 2.05, .34], position: [2.93, 1.03, 1.5], rotation: Math.PI / 2, color: "#7a5b44" },
  { id: "island", name: "키친핏 주방", room: "주방", kind: "island", size: [2.75, .9, .64], position: [-.18, .45, 2.15], rotation: 0, color: "#d4cfc3", fixed: true },
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

function ApartmentScene({ finish, view, items, selectedId, onSelect }: { finish: FinishKey; view: "3d" | "2d"; items: FurnitureItem[]; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const wall = FINISHES[finish].color;
  const floorColor = finish === "stone" ? "#a6a49d" : "#b89973";
  return (
    <>
      <color attach="background" args={["#eceae4"]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[-5, 9, 5]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} />
      <group onClick={() => onSelect(null)}>
        <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -.02, 0]}><planeGeometry args={[8.2, 6.6]} /><meshStandardMaterial color={floorColor} roughness={.8} /></mesh>
        <Grid args={[8.2, 6.6]} cellSize={.25} cellThickness={.25} cellColor="#725c49" sectionSize={1} sectionColor="#8b725c" fadeDistance={14} fadeStrength={2} position={[0, 0, 0]} />
        <Wall position={[0, 1.15, 3.25]} size={[8.2, 2.3, .12]} color={wall} />
        <Wall position={[4.05, 1.15, 0]} size={[.12, 2.3, 6.6]} color={wall} />
        <Wall position={[-4.05, 1.15, 1.25]} size={[.12, 2.3, 4.1]} color={wall} />
        <Wall position={[-4.05, .45, -2.72]} size={[.12, .9, 1.05]} color="#dfe7e8" />
        <Wall position={[1.12, 1.15, -.85]} size={[.1, 2.3, 4.1]} color={wall} />
        <Wall position={[2.57, 1.15, .75]} size={[2.9, 2.3, .1]} color={wall} />
        <Wall position={[2.57, 1.15, -3.22]} size={[2.9, 2.3, .1]} color={wall} />
        <Wall position={[.05, 1.15, 1.12]} size={[2.05, 2.3, .1]} color={wall} />
        <Wall position={[-1.5, .58, -3.22]} size={[5.05, 1.16, .08]} color="#d6e1e1" />
        <mesh position={[-1.5, 1.66, -3.25]}><boxGeometry args={[5.02, .06, .04]} /><meshStandardMaterial color="#bfd2d4" transparent opacity={.55} /></mesh>
      </group>
      {items.map((item) => <FurnitureModel key={item.id} item={item} selected={selectedId === item.id} onSelect={() => onSelect(item.id)} />)}
      <ContactShadows opacity={.28} scale={12} blur={2.3} far={4} />
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
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  useEffect(() => {
    const stored = window.localStorage.getItem("sanghyeon-studio-v1");
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
    window.localStorage.setItem("sanghyeon-studio-v1", JSON.stringify({ items, finish }));
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
          <div className="room-bar"><span className="eyebrow">CURRENT SPACE</span><strong>전체 공간</strong><span>전용 84.98㎡</span><span className="draft-badge">좌우 반전형</span></div>
          <div className="view-switch"><button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}><Grid2X2 size={15} /> 2D</button><button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}><Layers3 size={15} /> 3D</button></div>
          <Canvas shadows dpr={[1, 1.65]} camera={{ position: view === "2d" ? [0, 12, .01] : [8.2, 7.4, 9.5], fov: 38 }}>
            <Suspense fallback={null}><ApartmentScene finish={finish} view={view} items={items} selectedId={selectedId} onSelect={setSelectedId} /></Suspense>
          </Canvas>
          <div className="orientation"><span>N</span><div /></div>
          <div className="canvas-help"><Move3D size={15} /> 드래그로 둘러보고, 스크롤로 확대하세요</div>
          <div className="room-legend"><span><i style={{background:"#b89973"}} />거실 · 확장부</span><span><i style={{background:"#ddd1bc"}} />안방</span><span><i style={{background:"#aeb5a1"}} />주방</span></div>
        </section>

        <aside className="property-panel">
          {selected ? <>
            <div className="selection-title"><span className="selection-icon">{selected.kind === "table" ? <SquareStack size={20} /> : <Box size={20} />}</span><div><span className="eyebrow">SELECTED</span><h2>{selected.name}</h2><p>{selected.room}</p></div></div>
            <div className="property-section"><div className="property-heading"><span>제품 규격</span><button>실측값</button></div><div className="measure-grid"><label>너비<strong>{Math.round(selected.size[0]*1000)}<small> mm</small></strong></label><label>깊이<strong>{Math.round(selected.size[2]*1000)}<small> mm</small></strong></label><label>높이<strong>{Math.round(selected.size[1]*1000)}<small> mm</small></strong></label></div></div>
            <div className="property-section"><div className="property-heading"><span>위치 조정</span><small>100mm 단위</small></div><div className="nudge-pad"><button onClick={() => nudge(0,-.1)}><ChevronUp /></button><div><button onClick={() => nudge(-.1,0)}><ChevronLeft /></button><span>{selected.fixed ? "고정" : "이동"}</span><button onClick={() => nudge(.1,0)}><ChevronRight /></button></div><button onClick={() => nudge(0,.1)}><ChevronDown /></button></div><button disabled={selected.fixed} className="rotate-button" onClick={() => updateSelected({rotation:selected.rotation + Math.PI/2})}><RotateCw size={16} /> 90° 회전</button></div>
            <div className="property-section"><div className="property-heading"><span>배치 상태</span></div><div className="placement-ok"><span>✓</span><div><strong>배치 가능한 위치</strong><small>현재 다른 가구와 겹치지 않아요</small></div></div></div>
            <div className="property-section surface"><div className="property-heading"><span>소재</span></div><div className="material-chip"><span style={{background:selected.color}} /><div><strong>기존 제품 마감</strong><small>보유 가구 · 변경 없음</small></div></div></div>
          </> : <div className="empty-selection"><div><Move3D size={24} /></div><h2>가구를 선택해보세요</h2><p>크기와 위치를 확인하고<br/>정확하게 배치할 수 있어요.</p></div>}
          <div className="plan-facts"><span className="eyebrow">CONFIRMED PLAN</span><ul><li><span>01</span>현관은 왼쪽</li><li><span>02</span>식탁은 거실 확장부</li><li><span>03</span>안방 욕실은 소형 구조 유지</li></ul></div>
        </aside>
      </section>
    </main>
  );
}
