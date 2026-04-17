# Phase 7: Content, A11Y Polish & Cognitive Toggle - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

v1.0 출시에 필요한 콘텐츠 임계치(5편)를 채우고, 월드 시각 요소의 alt 사이드카 JSON을 모든 글에 붙이며, 월드 안 텍스트 SR-only DOM 미러와 인지적 접근성(미니멀 모드) 토글을 완성한다.

이 페이즈는 새 기능이 아니라 **데이터 계약 확정 → 접근성 레이어 완성** 순서로 진행한다.
1. 콘텐츠 스키마(category enum + 최소 수) + alt JSON 스키마 확정
2. SR-only DOM 미러 구현 (데이터 계약에 종속)
3. 미니멀 모드 토글 구현 (세계관 전체 저자극 모드)

**Out of scope:** 새 애니메이션 패턴 추가, alt JSON 외 별도 CMS, 댓글 시스템.

</domain>

<decisions>
## Implementation Decisions

### D-01: 콘텐츠 스키마 & 빌드 타임 검증

- **D-01a (카테고리 enum):** 허용 카테고리는 `일기 | 공부 | 일지` 3종만. 다른 값은 빌드 실패.
  - 기존 `sample.mdx`의 `category: '탐험'`은 이 페이즈에서 유효 카테고리로 수정 필수.
- **D-01b (최소 편수 게이트):** `.mdx` 파일 5편 이상 필수. 세 카테고리 각 1편 이상 포함.
- **D-01c (검증 방식):** `next.config.ts` 또는 content loader에서 **빌드 타임 throw**.
  - lint rule은 과잉, vitest 단독은 배포 빌드 차단력 부족 → 빌드 타임 throw가 가장 확실.
  - 구현: `lib/posts.ts`에 `validatePostsMeta()` 함수 추가 → `next.config.ts`에서 `pnpm build` 중 호출.

### D-02: Alt 사이드카 JSON 스키마

- **D-02a (파일 위치):** 모든 `.mdx` 옆에 동일 basename의 `.alt.json` 존재 필수 (CI 체크).
- **D-02b (스키마):**
  ```json
  {
    "visuals": [
      { "id": "home-island", "alt": "구름 위에 떠 있는 작은 섬과 표지판" }
    ]
  }
  ```
  - `visuals` 배열, 각 항목은 `{ id: string, alt: string }`.
  - 배열 형태이므로 나중에 `type`, `label`, `describedBy` 등 필드 확장 가능.
- **D-02c (소비자):** Phase 7에서는 WorldPostPanel 또는 waypoint 컴포넌트가 `.alt.json`을 읽어 SR mirror에 공급. `lib/posts.ts`에 `getAltData(slug)` 유틸 추가.

### D-03: SR-only DOM 미러

- **D-03a (위치):** `<canvas>` 형제 DOM 요소로 배치. `<Html>` 3D 레이어 **내부에 넣지 않는다** (접근성 레이어와 3D 레이어 분리 원칙).
- **D-03b (구조):**
  - 각 waypoint에 정적 `<div class="sr-only">` — frontmatter title + excerpt + alt JSON visuals
  - 현재 활성 waypoint만 `aria-live="polite"` 영역으로 업데이트 (전체를 live로 두면 낭독 폭주)
- **D-03c (소스):** MDX frontmatter (`title`, `excerpt`) + `.alt.json` visuals.
  - `<Html>` 발췌를 다시 긁어오는 방식은 취약 → frontmatter가 단일 진실의 원천.
- **D-03d (구현 포인트):** `components/world/WorldSRMirror.tsx` 새 컴포넌트. `worldStore`의 현재 waypoint slug를 구독하여 aria-live 내용 업데이트.

### D-04: 미니멀 모드 토글

- **D-04a (저장):** `localStorage` 키 `world:minimal-mode`. 초기 진입 시 읽어 즉시 적용.
- **D-04b (위치):** 기존 헤더 또는 `<UIOverlay>` — 접근성 기능이므로 항상 도달 가능한 곳.
- **D-04c (중단 범위):**
  - ✋ 중단: Lenis 스크롤, GSAP 카메라/모핑 애니메이션, WorldCursor 자석 효과, Rive autoplay/interaction
  - 설계 철학: "애니메이션만 끄기"가 아니라 **월드 인터랙션 전체를 저자극 모드로 낮추기**
- **D-04d (대체 렌더):** 미니멀 모드 활성 시 `<main>` 영역에 `/text/{slug}` 정본 콘텐츠 인라인 렌더 (또는 링크 중심). 3D 씬은 정지 상태로 배경에 남겨도 됨.
- **D-04e (zustand 연동):** `worldStore`에 `minimalMode: boolean` + `setMinimalMode()` 슬라이스 추가. 컴포넌트들이 이 값을 구독하여 개별적으로 자신의 동작을 정지.

### Claude's Discretion

- 검증 함수의 정확한 오류 메시지 형식 (`validatePostsMeta()` 출력)
- `WorldSRMirror`의 내부 DOM 구조 세부사항 (div vs section, id 네이밍 등)
- 미니멀 모드 토글의 시각적 표현 (아이콘, 체크박스, 스위치)
- 글 5편의 실제 내용 (일기·공부·일지 각 카테고리 주제는 작성자 재량)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 컨벤션
- `CLAUDE.md` — 기술 스택 lock-set, 아키텍처 원칙, 작업 원칙
- `.planning/REQUIREMENTS.md §CONT-02, CONT-03, A11Y-01, A11Y-02` — Phase 7 요구사항 상세

### 콘텐츠 인프라 (기존)
- `lib/posts.ts` — `getPostSlugs()` 유틸, 콘텐츠 디렉토리 접근 패턴
- `content/posts/sample.mdx` — 현재 metadata 구조 기준 (category 수정 필요)
- `content/posts/sample.alt.json` — 현재 alt JSON 구조 (`{ "slug": "...", "visuals": [] }`)

### 라우트 컴포넌트 (기존)
- `app/text/[slug]/page.tsx` — 정본 텍스트 라우트, LCPObserver 패턴
- `app/world/[slug]/page.tsx` — WorldPostPanel + WorldPostWaypointSync 패턴
- `components/world/ArchipelagoScene.tsx` — Html 발췌 배치, waypoint 구조

### 상태 관리 (기존)
- `lib/worldStore.ts` — zustand store, 기존 슬라이스 패턴 (cursorMagnetTarget 등)

### Phase 6 검증 (참고)
- `.planning/phases/06-motion-morphing--micro-interactions/06-VERIFICATION.md §Issues to Fix` — Phase 7에서 처리해야 할 deferred 항목 목록

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/posts.ts:getPostSlugs()` — `.mdx` 슬러그 목록 반환. `validatePostsMeta()` 추가 위치로 적합.
- `lib/worldStore.ts` — zustand 슬라이스 패턴 확립. `minimalMode` 슬라이스 추가 위치.
- `content/posts/sample.alt.json` — 현재 `{ "slug": "sample", "visuals": [] }`. 스키마 확장 기준점.

### Established Patterns
- MDX metadata: `export const metadata = { title, excerpt, date, category }` 패턴 (sample.mdx 기준)
- worldStore 슬라이스: `cursorMagnetTarget` 예시처럼 `{ value, setter }` 패턴
- Html 발췌: ArchipelagoScene에서 `<Html occlude distanceFactor={10}>` 안에 제목+발췌 텍스트

### Integration Points
- `next.config.ts` — 빌드 타임 검증 함수 호출 지점
- `app/layout.tsx` — UIOverlay 마운트 지점, 미니멀 모드 토글 버튼 위치
- `worldStore` → WorldCursor, WorldMorphScroll, Lenis 등이 `minimalMode`를 구독하여 동작 분기

### Phase 6 Deferred Items (이 페이즈에서 선택적 처리)
- `WorldCursor`: `mq.addEventListener('change', ...)` — prefers-reduced-motion 라이브 반응성
- `RiveSignBoard`: ErrorBoundary 래퍼
- `WorldMorphScroll`: 미사용 `WorldMorphScrollHandles` export 제거
- `SplineIslandProp`: Suspense boundary (Phase 5 기존 미완)

</code_context>

<specifics>
## Specific Ideas

- **데이터 계약 우선 원칙:** 콘텐츠 스키마 + alt JSON 스키마를 먼저 확정하고, SR mirror와 미니멀 모드는 이 데이터에 종속하여 구현.
- **미니멀 모드 설계 철학:** "애니메이션만 끄기"가 아닌 "월드 인터랙션 전체 저자극 모드". Lenis, GSAP, WorldCursor, Rive 전부 저감.
- **SR-only 구조:** `<Html>` 내부에 넣지 않음 — 3D 레이어와 접근성 레이어를 DOM 계층에서 명시적으로 분리.
- **글 내용:** 실제 일기·공부·일지 글 5편은 작성자(오너) 재량. Phase 7 플래너는 구조(스키마·라우트·검증)만 구현하면 됨.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 6 deferred 중 Phase 8으로 미룰 것들:** SplineIslandProp Suspense boundary, WorldKeyboardNav Escape trap — Phase 8 (Performance Gates)에서 처리.
- **기타:** aria-describedby를 통한 3D 오브젝트별 alt 연결 심화 — Phase 8 이후.

</deferred>

---

*Phase: 07-content-a11y-polish--cognitive-toggle*
*Context gathered: 2026-04-16*
