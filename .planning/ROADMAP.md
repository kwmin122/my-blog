# ROADMAP — Personal Blog 3D World

소스: `.planning/PROJECT.md` + `.planning/REQUIREMENTS.md` + `2026-04-14-personal-blog-3d-world.md` Success Criteria.

Granularity: **standard** (8 phases, 3 milestones).
Git branching: **milestone** (Milestone 1/2/3 = v0.1/v0.5/v1.0).
Owner: 민경욱 (1인, 주당 8–12h).
Lock-set (12): Next.js, three.js + WebGPURenderer, R3F, drei, GSAP + ScrollTrigger, Lenis, zustand, MDX, Tailwind v4, Rive, Spline runtime, gltf-transform. **신규 라이브러리 추가 금지.**

---

## Summary Table

| # | Phase Name | Goal | Requirements (IDs) | Success criteria count | Complexity | Milestone |
|---|------------|------|--------------------|------------------------|------------|-----------|
| 1 | Foundation & Verification | 영속 WebGPU 캔버스 + 폴백 + 배포 + 자체 계측 스캐폴드 | CORE-01, CORE-05, CORE-06, INFRA-04, PERF-05 | 5 | M | M1 (v0.1) |
| 2 | Canonical Content Split | `/text` 정본 / `/world` 프레젠테이션 분리 + MDX 라우팅 | CORE-03, CORE-04, CONT-01 | 4 | S | M2 (v0.5) |
| 3 | World Concept & Camera Choreography | 월드 컨셉 확정 + waypoint 비행 + Lenis + Spline 오브젝트 | CORE-02, MOT-01, MOT-03, INT-02 | 5 | L | M2 (v0.5) |
| 4 | Design System & Accessibility Baseline | 디자인 토큰 + lint 강제 + 키보드/SR 접근 + 모션 감쇄 폴백 | DSGN-01, A11Y-03, MOT-04, INT-03 | 5 | M | M2 (v0.5) |
| 5 | Visual Signature: Shaders & Glass | TSL 셰이더 시그니처 + 리퀴드 글래스 + 도파민 컬러 팔레트 | VIS-01, VIS-02, VIS-03 | 4 | L | M3 (v1.0) |
| 6 | Motion Morphing & Micro-Interactions | 모핑 스크롤 + Rive 표지판 + 뉴트로 격리 + 커스텀 커서 | MOT-02, INT-01, VIS-04, VIS-05 | 5 | L | M3 (v1.0) |
| 7 | Content, A11Y Polish & Cognitive Toggle | 글 5편 + alt 사이드카 + SR 미러 + 미니멀 모드 토글 | CONT-02, CONT-03, A11Y-01, A11Y-02 | 5 | M | M3 (v1.0) |
| 8 | Asset Pipeline, Performance Gates & Launch | gltf-transform + Suspense + 호스팅 헤더 + 성능 4게이트 통과 + 공개 | INFRA-01, INFRA-02, INFRA-03, PERF-01, PERF-02, PERF-03, PERF-04 | 7 | L | M3 (v1.0) |

Total: **8 phases, 34 requirement mappings, 3 milestones**.

---

## Phase 1 — Foundation & Verification

**Milestone:** M1 (v0.1 — World Skeleton, 2026-04-28)
**Complexity:** M
**UI hint:** yes (첫 데스크톱 렌더 가능한 빈 월드)

### Goal
Next.js App Router 골격에 영속 `<WorldCanvas>`를 layout에 마운트하고, WebGPU 초기화 + WebGL2 폴백 + 정적 포스터 최종 폴백까지 3단계 강등 체인을 배포 환경에서 작동시킨다. 이후 모든 페이즈가 이 스캐폴드 위에서 돈다.

### Requirements
- **CORE-01**: 단일 WebGPU 캔버스 layout 영속 마운트, 페이지 전환에 재마운트 없음.
- **CORE-05**: `navigator.gpu` 미존재 또는 init 실패 시 WebGL2로 자동 강등.
- **CORE-06**: WebGPU·WebGL2 둘 다 실패 시 정적 포스터 + `/text/` 안내 배너.
- **INFRA-04**: Next.js App Router 배포 자동화 (`main` 푸시 → 프리뷰·프로덕션 자동 빌드).
- **PERF-05**: 자체 성능 계측 리포트 (`performance.mark()` + 콘솔/라우트 출력) 스캐폴드.

### Success Criteria
1. `/`, `/world`, `/text/hello` 3개 라우트를 브라우저 Next.js devtools로 연속 이동할 때 `<canvas>` DOM 노드의 `data-canvas-id`가 동일하게 유지된다 (재마운트 0회).
2. Chrome Canary(WebGPU on)·Chrome 안정판(WebGPU off 플래그)·Firefox 현재(WebGL2) 세 환경에서 동일 URL 방문 시 각각 WebGPU / WebGL2 / WebGL2로 렌더러가 선택되며 콘솔 리포트에 선택값이 찍힌다.
3. `navigator.gpu`와 WebGL2를 devtools로 모두 막은 환경에서 방문 시 정적 포스터 이미지와 `/text/`로 가는 배너 링크가 FCP 이전에 보인다.
4. `git push origin main` 시 Vercel(또는 CF Pages) 프로덕션 빌드가 자동 트리거되고, PR 푸시 시 프리뷰 URL이 5분 이내 생성된다.
5. 로컬·프로덕션에서 콘솔에 `[perf] /world first-frame: Xms`, `[perf] /text LCP: Xms` 포맷의 자체 계측 라인이 출력된다 (값은 아직 게이트 미적용).

---

## Phase 2 — Canonical Content Split

**Milestone:** M2 (v0.5 — Inhabited World, 2026-06-30)
**Complexity:** S
**UI hint:** yes (`/text/{slug}` HTML 정본 페이지 + `/world/{slug}` 월드 프레젠테이션 공존)

### Goal
콘텐츠 정본/프레젠테이션 분리 아키텍처를 박는다. `/text/{slug}`는 SEO·a11y canonical, `/world/{slug}`는 같은 콘텐츠의 3D 사본으로 `<link rel="canonical">`을 정본으로 가리킨다. MDX 파일 작성 → 양쪽 라우트 자동 생성.

### Requirements
- **CORE-03**: `/text/{slug}` 순수 HTML/MDX, 3D 비활성, 검색엔진 canonical 인덱싱.
- **CORE-04**: `/world/{slug}` 소스에 `<link rel="canonical" href="/text/{slug}">` 존재, `<Html>` 표시는 제목·발췌만.
- **CONT-01**: `.mdx` 파일 직접 작성 → 라우트 자동 생성 (외부 CMS 의존 없음).

### Success Criteria
1. `content/posts/sample.mdx` 파일을 추가하고 빌드하면 `/text/sample`·`/world/sample` 두 라우트가 수동 설정 0줄로 생성된다.
2. `/world/sample`의 페이지 소스에 정확히 하나의 `<link rel="canonical" href="/text/sample">`이 렌더되고, `/text/sample`에는 self-canonical만 존재한다.
3. `/world/sample`에서 월드 안 `<Html>` 발췌는 MDX frontmatter `title` + `excerpt` 필드만 렌더하고, 본문(`<article>` 전체)은 DOM에 존재하지 않는다.
4. Lighthouse SEO 섹션에서 `/text/sample`이 "Document has a valid canonical" 통과, `/world/sample`이 canonical 경고 없이 통과한다.

---

## Phase 3 — World Concept & Camera Choreography

**Milestone:** M2 (v0.5 — Inhabited World, 2026-06-30)
**Complexity:** L
**UI hint:** yes (월드 컨셉 시각화 + 스크롤 비행 카메라)

### Goal
월드 컨셉(떠다니는 군도 / 디지털 아틀리에 / 데이터 숲 / 뉴트로 도시 중 1택)을 확정하고 장소 3개를 배치한 뒤, GSAP + ScrollTrigger 기반 카메라 waypoint 비행과 Lenis 부드러운 스크롤, Spline 정적 오브젝트 3종을 임포트한다.

### Precondition (blocker)
월드 컨셉 미결정 시 Phase 3 진입 불가 — `/sunco:design-shotgun` 또는 office-hours 후속으로 선결정.

### Requirements
- **CORE-02**: `/world` 진입 → home waypoint, `/world/{slug}` 진입 → post waypoint 보간 비행.
- **MOT-01**: GSAP + ScrollTrigger 카메라 안무, Theatre.js 미사용.
- **MOT-03**: Lenis 기반 부드러운 관성 스크롤.
- **INT-02**: 월드 안 Spline 정적 오브젝트 3종 이상 임포트.

### Success Criteria
1. 주소창에 `/world`와 `/world/sample`을 번갈아 입력하면 카메라가 순간이동이 아니라 1–2초 보간 비행으로 home ↔ sample waypoint를 이동한다.
2. `/world`에서 스크롤 진행도 0% → 100%에 따라 카메라가 3개 장소를 순차로 통과하고, 각 waypoint 도달 시 `ScrollTrigger.onEnter`가 정확히 한 번씩 발화한다 (devtools 로그 검증).
3. Lenis 스크롤 비활성 시 대비 스크롤 휠 1틱당 이동 거리가 부드럽게 감쇄되며, 관성 종료까지 네이티브보다 긴 꼬리가 측정된다.
4. 월드 씬 inspector로 확인 시 Spline export로 임포트된 glTF 3종(가구·조각·소품 중)이 서로 다른 `userData.source = "spline"` 태그로 식별된다.
5. `grep -r "theatre" node_modules package.json`이 0건을 반환한다 (Theatre.js 금지 검증).

---

## Phase 4 — Design System & Accessibility Baseline

**Milestone:** M2 (v0.5 — Inhabited World, 2026-06-30)
**Complexity:** M
**UI hint:** yes (토큰 적용된 UI 패널 + 키보드 네비 포커스 링)

### Goal
v0.5 이후 모든 신규 컴포넌트가 강제로 통과해야 하는 디자인 시스템·a11y 최소선을 박는다. 디자인 토큰 1세트 lint 강제, `/text/` 키보드·SR 100% 접근, `prefers-reduced-motion` 감쇄, 키보드 waypoint 네비.

### Requirements
- **DSGN-01**: 디자인 토큰 1세트 코드화 + lint fail 차단.
- **A11Y-03**: `/text/{slug}` 키보드·스크린리더 100% 접근.
- **MOT-04**: `prefers-reduced-motion` 시 카메라 안무 fade-cut 강등.
- **INT-03**: Tab + Enter로 모든 waypoint 도달 + 포커스 waypoint 시각 표시.

### Success Criteria
1. `tokens.ts`에 색·여백·타이포·이징·라이팅 5카테고리 값이 export되고, 임의 컴포넌트에서 하드코드 hex(`#[0-9a-f]{6}`)를 넣으면 `pnpm lint`가 ESLint custom rule로 실패한다.
2. `/text/sample`을 Tab만으로 순회 시 본문의 모든 링크·heading anchor에 포커스가 도달하고, 포커스 링이 토큰 `--focus-ring` 값으로 보인다.
3. 스크린리더(VoiceOver 또는 NVDA)로 `/text/sample` 읽기 시 본문·제목·발행일이 선형적으로 낭독되며 3D 관련 DOM이 노출되지 않는다.
4. devtools로 `prefers-reduced-motion: reduce`를 설정하고 `/world` → `/world/sample` 이동 시 카메라가 보간 비행이 아니라 200ms fade-cut으로 전환된다.
5. `/world` 키보드 포커스 상태에서 Tab을 누를 때마다 다음 waypoint 명찰에 aria-selected + 시각적 링이 이동하고 Enter로 카메라가 해당 waypoint로 이동한다.

---

## Phase 5 — Visual Signature: Shaders & Glass

**Milestone:** M3 (v1.0 — Public Launch, 2026-12-31)
**Complexity:** L
**UI hint:** yes (월드 시그니처 셰이더 효과 + 글래스 패널)

### Goal
월드의 시각적 시그니처를 자작 TSL 셰이더로 최소 1종 구현하고, 모든 떠 있는 UI 패널을 리퀴드 글래스로 치환하며, 도파민 컬러 팔레트를 단일 베이스 톤 + 액센트 체계로 락다운한다.

### Requirements
- **VIS-01**: 자작 TSL 셰이더 1종 이상 (WGSL/GLSL 동시 컴파일).
- **VIS-02**: UI 패널·내비·모달 `backdrop-filter` 리퀴드 글래스, 스크롤·상호작용에 불투명도 동적 변화.
- **VIS-03**: 단일 베이스 톤 + 도파민 액센트, 충돌 채도 4개 이상 금지.

### Success Criteria
1. 월드의 하늘·바다·지형 중 1개가 TSL 노드 그래프로 작성된 셰이더로 렌더되며, WebGPU 환경에서 WGSL, WebGL2 폴백에서 GLSL이 각각 컴파일되어 동일한 시각 결과를 낸다 (screenshot diff < 5% LPIPS).
2. 모든 `<UIOverlay>` 자손 패널의 computed style `backdrop-filter`가 `blur()` 또는 `saturate()`를 포함하며, 스크롤 진행도에 따라 `--panel-opacity` CSS 변수가 0.4 ↔ 0.85 사이로 동적 변화한다.
3. 토큰 파일에서 `baseTone` 1값 + `accent.*` 3값(네온·하늘·라이트)만 export되며, 월드 씬 라이트 inspector에서 사용 중인 채도값이 이 4개 범위 밖이면 dev 콘솔 경고가 뜬다.
4. `/world` 스크린샷을 K-means 4 클러스터로 분석했을 때 주요 클러스터의 HSL 채도가 base ± accent 범위 내에 들어간다 (툴: `scripts/color-audit.ts`).

---

## Phase 6 — Motion Morphing & Micro-Interactions

**Milestone:** M3 (v1.0 — Public Launch, 2026-12-31)
**Complexity:** L
**UI hint:** yes (모핑 스크롤 + Rive 표지판 + 뉴트로 오브젝트 + 커스텀 커서)

### Goal
스크롤 진행도가 카메라뿐 아니라 장소 간 형태·라이팅 보간까지 동시 구동하도록 확장하고, 월드 안 인터랙션 오브젝트를 Rive 상태 머신으로 반응형으로 만들며, 뉴트로/Y2K 요소를 격리된 오브젝트로만 배치하고, 커스텀 커서(자석 + 모션 감쇄 존중)를 추가한다.

### Requirements
- **MOT-02**: 스크롤 진행도가 카메라 + 장소 간 형태/라이팅 보간 동시 구동 (모핑 스크롤).
- **INT-01**: 월드 안 표지판·버튼·이정표 Rive 상태 머신 기반 호버·클릭 반응.
- **VIS-04**: 뉴트로/픽셀/Y2K 요소 격리 사용, 전체 톤 지배 금지.
- **VIS-05**: 커스텀 커서 월드 좌표 호버 + 자석, `prefers-reduced-motion` 시 기본 커서 강등.

### Success Criteria
1. `/world` 스크롤 0% → 50% 구간에서 장소 A의 geometry morphTargetInfluences가 0 → 1로, 라이팅 color가 baseTone → accent.neon으로 동시 보간되는 것이 devtools timeline에 기록된다.
2. 월드 안 표지판 3개에 마우스 호버 시 각각 Rive `.riv` 파일의 state machine에서 `hover` 상태로 전이되며, 클릭 시 `activate` 트리거가 발화한다.
3. `/world` 스크린샷에서 뉴트로 요소(CRT·픽셀 폰트·Y2K 글래스)는 전체 픽셀의 15% 미만을 차지하며, 특정 오브젝트 3종에 한정되어 나타난다.
4. 월드 UI 상호작용 호버 시 커서가 자석 효과로 버튼 중심으로 당겨지며, `prefers-reduced-motion: reduce` 설정 시 커서가 OS 기본 커서로 강등되고 자석 효과가 비활성화된다.
5. 커스텀 커서는 별도 `<canvas>`나 신규 라이브러리 없이 기존 R3F 씬 + DOM 오버레이만으로 구현되어 lock-set 위반이 발생하지 않는다.

---

## Phase 7 — Content, A11Y Polish & Cognitive Toggle

**Milestone:** M3 (v1.0 — Public Launch, 2026-12-31)
**Complexity:** M
**UI hint:** yes (글 5편 + 미니멀 모드 토글 + SR 미러)

### Goal
v1.0 출시에 필요한 콘텐츠 임계치(5편)를 채우고, 월드 시각 요소의 alt 사이드카 JSON을 모든 글에 붙이며, 월드 안 텍스트 SR-only DOM 미러와 인지적 접근성(미니멀 모드) 토글을 완성한다.

### Requirements
- **CONT-02**: 일기·공부·일지 카테고리의 글 5편 이상, `/text/` 정본 + `/world/` 발췌 공존.
- **CONT-03**: 각 글에 alt 텍스트 사이드카 JSON 존재.
- **A11Y-01**: 미니멀 모드 토글 — 카메라 안무 정지 + 텍스트만.
- **A11Y-02**: 월드 안 모든 텍스트 SR-only DOM 미러 또는 `/text/` 폴백 노출.

### Success Criteria
1. `content/posts/*.mdx` 파일이 5개 이상 존재하고, 카테고리 frontmatter가 일기·공부·일지 각 1개 이상을 포함한다 (빌드 time check로 강제).
2. 각 `.mdx` 옆에 동일 basename의 `.alt.json` 사이드카가 존재하고, 월드 안 해당 waypoint의 시각 요소 ID → alt 문자열 매핑 키가 최소 1개 포함된다 (CI 체크).
3. 헤더의 "미니멀 모드" 토글을 켜면 Lenis + GSAP 카메라가 중단되고, `<main>` 영역이 `/text/{slug}` 내용을 인라인 렌더하며, localStorage에 선호가 저장된다.
4. `/world/sample`의 DOM에 `<div class="sr-only">` 또는 `aria-live` 영역이 존재하며, 월드 안 `<Html>` 발췌 텍스트가 해당 영역에 미러링되어 스크린리더 낭독 순서가 시각 순서와 일치한다.
5. axe-core devtools run이 `/world/sample`·`/text/sample` 양쪽에서 critical violation 0을 반환한다.

---

## Phase 8 — Asset Pipeline, Performance Gates & Launch

**Milestone:** M3 (v1.0 — Public Launch, 2026-12-31)
**Complexity:** L
**UI hint:** yes (단계 로딩 UX + 성능 리포트 페이지 + 공개)

### Goal
에셋 파이프라인을 빌드에 고정하고, Suspense 단계 로딩을 적용하며, 호스팅 헤더를 명시하고, PERF-01~04 성능 게이트 4종을 모두 측정·통과시킨 뒤 v1.0을 공개 배포한다.

### Requirements
- **INFRA-01**: 빌드에 `gltf-transform` 통합 → 모든 GLTF에 Draco + KTX2/Basis 압축.
- **INFRA-02**: `<Suspense>` 경계 단계 로딩 → 첫 의미있는 프레임까지 점진 표시.
- **INFRA-03**: KTX2 MIME (`image/ktx2`) + COOP/COEP 헤더 명시 (SharedArrayBuffer 사용 시).
- **PERF-01**: 데스크톱 `/text/` LCP ≤ 1.5s 측정 통과.
- **PERF-02**: 데스크톱 `/world` 첫 의미 있는 프레임 ≤ 3.0s 자체 계측 통과.
- **PERF-03**: 데스크톱 인터랙션 시 60fps + draw call ≤ 800.
- **PERF-04**: 모바일 정적 포스터 LCP ≤ 1.8s, 월드는 "탐험하기" 버튼 후에만 활성.

### Success Criteria
1. `pnpm build` 시 `gltf-transform` CLI가 `assets/raw/*.glb`를 `assets/out/*.glb`로 자동 처리하고, 출력 파일 크기가 원본 대비 40% 이상 감소한 것을 빌드 로그가 기록한다.
2. `/world` 첫 방문 시 devtools Network에서 KTX2 에셋이 `image/ktx2` Content-Type으로 응답되고, 스카이박스 → 지형 → 디테일 순으로 3단계 Suspense boundary가 순차 해제된다.
3. 배포 프로덕션 URL에서 `curl -I` 결과 `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` 헤더가 응답된다 (SharedArrayBuffer 경로에 한정).
4. Chrome 안정판 1080p 5회 반복 측정 평균에서 `/text/sample` LCP ≤ 1.5s, `/world` 첫 의미 있는 프레임 ≤ 3.0s를 만족하며 자체 계측 리포트 페이지(`/_perf`)에 기록된다.
5. `/world` 스크롤·호버 인터랙션 30초간 Chrome devtools Performance 탭 측정에서 프레임 드롭 0회 + draw call peak ≤ 800을 만족한다.
6. 모바일(실기기 iPhone + Android 1개씩) 방문 시 정적 포스터 LCP ≤ 1.8s, "탐험하기" 버튼 탭 전에는 WebGPU·WebGL2 컨텍스트가 생성되지 않는다 (Performance 탭 검증).
7. v1.0 공개 배포 후 트위터/LinkedIn/디스코드 중 최소 1채널에 공개 링크가 게시되고, 친구 3명·교수·멘토 중 1명 이상의 데모 피드백이 기록된다.

---

## 100% Coverage Validation

v1 REQUIREMENTS.md의 모든 REQ-ID가 정확히 하나의 Phase에 매핑되는지 검증한다.

| Category | REQ-IDs | Count | Phases Used |
|----------|---------|-------|-------------|
| CORE | CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06 | 6 | 1, 2, 3 |
| VISUAL | VIS-01, VIS-02, VIS-03, VIS-04, VIS-05 | 5 | 5, 6 |
| MOTION | MOT-01, MOT-02, MOT-03, MOT-04 | 4 | 3, 4, 6 |
| INTERACT | INT-01, INT-02, INT-03 | 3 | 3, 4, 6 |
| CONTENT | CONT-01, CONT-02, CONT-03 | 3 | 2, 7 |
| A11Y | A11Y-01, A11Y-02, A11Y-03 | 3 | 4, 7 |
| PERF | PERF-01, PERF-02, PERF-03, PERF-04, PERF-05 | 5 | 1, 8 |
| INFRA | INFRA-01, INFRA-02, INFRA-03, INFRA-04 | 4 | 1, 8 |
| DESIGN | DSGN-01 | 1 | 4 |
| **Total** | | **34** | 1–8 |

**Coverage gaps: 0.**
**Double-mapped requirements: 0** (각 REQ-ID는 정확히 1개 phase에만 할당).
**Out-of-scope drift: 0** (에이전틱 UX·다크모드·i18n·Theatre.js·Astro 등 Out of Scope 항목은 어떤 phase에도 등장하지 않음).
**Lock-set 위반: 0** (신규 라이브러리 카테고리 도입 없음; 모든 phase가 12-item lock-set 내에서 구현).

---

## Milestone → Phase 맵핑 (git_branching = milestone)

- **Milestone 1 (v0.1, 2026-04-28)** — 브랜치: `milestone/v0.1-skeleton`
  - Phase 1 (Foundation & Verification)
- **Milestone 2 (v0.5, 2026-06-30)** — 브랜치: `milestone/v0.5-inhabited`
  - Phase 2 (Canonical Content Split)
  - Phase 3 (World Concept & Camera Choreography)
  - Phase 4 (Design System & A11Y Baseline)
- **Milestone 3 (v1.0, 2026-12-31)** — 브랜치: `milestone/v1.0-launch`
  - Phase 5 (Visual Signature: Shaders & Glass)
  - Phase 6 (Motion Morphing & Micro-Interactions)
  - Phase 7 (Content, A11Y Polish & Cognitive Toggle)
  - Phase 8 (Asset Pipeline, Performance Gates & Launch)

---

*Last updated: 2026-04-14 by /sunco:roadmap (initial creation from office-hours design doc + v1 REQUIREMENTS).*
