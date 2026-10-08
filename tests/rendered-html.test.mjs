import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Sanghyeon Studio shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sanghyeon Studio — 우리 집 3D 인테리어<\/title>/i);
  assert.match(html, /광교상현마을현대/);
  assert.match(html, /프로젝트북 V4 배치안/);
  assert.match(html, /109㎡ 전체 배치/);
  assert.match(html, /기획서 기본 배치 복원/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps the projectbook products and room plan in source", async () => {
  const studio = await readFile(new URL("../app/Studio.tsx", import.meta.url), "utf8");
  for (const expected of [
    "자코모 휘몰라 네이비 소파",
    "라메리트 바움오크 페닉스 오벌 식탁",
    "LG OLED77C9KW 77형",
    "LG 오브제 컨버터블 냉장전용고",
    "밀레 식기세척기",
    "디트리쉬 DPI7686GP 인덕션",
    "LG 미니와인셀러 W087B",
  ]) assert.match(studio, new RegExp(expected));

  assert.match(studio, /const PLAN_WIDTH = 11\.7/);
  assert.match(studio, /const PLAN_DEPTH = 11\.17/);
  assert.match(studio, /function ApplianceModel/);
});

test("supports direct furniture move and rotation controls", async () => {
  const studio = await readFile(new URL("../app/Studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /setPointerCapture/);
  assert.match(studio, /intersectPlane/);
  assert.match(studio, /Math\.PI \/ 12/);
  assert.match(studio, /enabled=\{!interactingId\}/);
  assert.match(studio, /원래 위치로 되돌렸어요/);
  assert.match(studio, /event\.code === "KeyR"/);
});
