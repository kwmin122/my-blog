# STATE — Personal Blog 3D World

현재 SUNCO 작업 상태. `/sunco:phase` 전환마다 이 파일이 갱신된다.

---

## Current Phase

**Phase 6 — Motion Morphing & Micro-Interactions**
**Milestone:** M3 (v1.0 — 2026-12-31)
**Status:** Not started
**Branch:** `milestone/v1.0-launch`

### 다음 액션
```
/sunco:plan 6
```

---

## Phase 5 — Visual Signature: Shaders & Glass ✅ SHIPPED
**Status:** Shipped (2026-04-16)
**PR:** kwmin122/my-blog#5 (milestone/v1.0-launch → main)
**Verification:** 7/7 layers PASS (1 HIGH + 3 WARNs fixed: UIOverlay pointerEvents, sky direction, dispose, chroma metric)
**Requirements:** VIS-01, VIS-02, VIS-03

---

## Phase 4 — Design System & Accessibility Baseline ✅ SHIPPED
**Status:** Shipped (2026-04-15)
**PR:** kwmin122/my-blog#4 (phase/04-design-system-and-accessibility-baseline → main)
**Verification:** 7/7 layers PASS (Codex P2 fixed: .hashes.json stale hash)
**Requirements:** DSGN-01, MOT-04, A11Y-03, INT-03

---

## Phase 3 — World Concept & Camera Choreography ✅ SHIPPED
**Status:** Shipped (2026-04-15)
**PR:** kwmin122/my-blog#3 (phase/03-world-concept-and-camera-choreography → main)
**Verification:** 7/7 layers PASS (2 issues fixed: ST global kill, camera tween conflict)
**Requirements:** CORE-02, MOT-01, MOT-03, INT-02

---

## Completed Phases

### Phase 2 — Canonical Content Split ✅ SHIPPED
**Status:** Shipped (2026-04-14)
**PR:** kwmin122/my-blog#2 (milestone/v0.5-inhabited-world → main)
**Verification:** 7/7 layers PASS (3 issues patched)
**Requirements:** CORE-03, CORE-04, CONT-01

### Phase 1 — Foundation & Verification ✅ SHIPPED
**Status:** Shipped (2026-04-14)
**PR:** kwmin122/my-blog#1 (milestone/v0.1-skeleton → main)
**Production:** https://webbuild-gray.vercel.app
**Verification:** 7/7 layers PASS
**Requirements:** CORE-01, CORE-05, CORE-06, INFRA-04, PERF-05

---

## Decisions

핵심 결정 사항은 중복 피하고 원본만 참조한다.

- **전체 설계 결정:** `.planning/PROJECT.md` Key Decisions 표 (9개 결정 잠금)
- **v1 요구사항 목록:** `.planning/REQUIREMENTS.md` v1 섹션 (34개)
- **페이즈 구조 및 매핑:** `.planning/ROADMAP.md` (8 phases, 3 milestones)
- **오리지널 디자인 doc:** `/Users/min-kyungwook/Desktop/dev/webbuild/2026-04-14-personal-blog-3d-world.md`

### Roadmap 단계에서 새로 굳힌 결정
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 8 phases / 3 milestones 구조 | granularity = standard + 디자인 doc v0.1/v0.5/v1.0 마일스톤 정렬 | Active |
| 트렌드 통합은 Phase 5·6에 집중 | v0.1/v0.5는 아키텍처·콘텐츠·a11y 기반 작업, v1.0 마일스톤에서 시각 트렌드 폭발 | Active (트렌드 가지치기 금지 원칙 유지) |
| 자체 성능 계측 스캐폴드는 Phase 1 | 게이트 통과는 Phase 8이지만 인스트루먼트는 초기 구축해야 측정 데이터 축적 가능 | Active |
| 디자인 토큰은 v0.5(Phase 4)에서 초안, v1.0까지 lint 강제 유지 | DSGN-01 분기 구현 (REQUIREMENTS.md Notes 명시) | Active |
| Phase 3 진입 전 월드 컨셉 확정 필수 | 디자인 doc Open Question #1 + 카메라 waypoint 배치 전제 조건 | **RESOLVED (2026-04-14) → 떠다니는 군도** |

---

## Blockers

Phase 1 착수 전 또는 다음 페이즈 전환 전 반드시 해소해야 할 항목.

### ~~B1 — 월드 컨셉 미결정~~ RESOLVED (2026-04-14)
- **결론:** **떠다니는 군도 (Floating Archipelago)** 확정
- 구름 바다 위 4~6개 바위섬, 섬마다 카테고리(일기·공부·일지), 카메라가 섬 사이를 비행
- 팔레트: 하늘색 + Cloud Dancer + 따뜻한 대지색 + 네온 포인트
- Phase 3 영향: waypoint = 섬 위 착지 포인트, Spline 오브젝트 = 섬 지형·나무·집

### B2 — 위키 미검증 주장 1차 출처 확인
- **원문:** 디자인 doc Open Question #5 — "WebGPU 15~30배", "팬톤 2026 'Cloud Dancer'", "Safari 26 WebGPU 완전 지원", "모바일 53% 3초 이탈"
- **영향:** 이 주장 중 하나라도 깨지면 접근 C(Single Continuous World) 자체 재고 가능성 → REQUIREMENTS.md 재작성 트리거
- **언제까지:** Phase 1 착수 직전 (코드 쓰기 전 1~2시간 투자, 디자인 doc "The Assignment" 1번 항목)
- **해소 방법:** `/sunco:research` 수동 확인, 1차 출처 URL 기록
- **위험 트리거:** 핵심 가정 파괴 시 즉시 office-hours 재호출

### ~~B3 — R3F + WebGPU 프로덕션 성숙도 검증~~ RESOLVED (2026-04-14)
- **결론:** R3F v9 (9.6.0) + three.js r183 + WebGPURenderer = 프로덕션 준비 완료.
- async `gl` prop factory 패턴 공식 확인. `await renderer.init()` 필수.
- Phase 1에서 사용하는 drei helpers(`<Html>`, `OrbitControls`, `useGLTF`) 전부 WebGPU 호환.
- `EffectComposer`/`SoftShadows`/`AccumulativeShadows`는 미사용(lock-set 외)이므로 충돌 없음.
- WebGL2 fallback = `WebGPURenderer({ forceWebGL: true })` — 별도 WebGLRenderer 인스턴스 불필요.
- 대체안(WebGL2 기본 + WebGPU opt-in) 불필요. WebGPU 최초 렌더러로 진행.
- 리서치 상세: `.planning/phases/01-foundation-and-verification/01-RESEARCH.md`

### B4 — 호스팅 헤더 사전 검증 (미차단이지만 Phase 8 전 확정 필요)
- **원문:** 디자인 doc Open Question #3 + INFRA-03
- **영향:** Vercel vs Cloudflare Pages의 KTX2 MIME / COOP/COEP / 엣지 캐시 지원 차이
- **언제까지:** Phase 1 배포 파이프라인 설정 시점 (INFRA-04와 동시)
- **해소 방법:** 양 플랫폼 문서 확인 + 샘플 배포 1회

---

## Session Log

### 2026-04-14 — Bootstrap
- `/sunco:office-hours`로 디자인 doc 생성: `2026-04-14-personal-blog-3d-world.md` (APPROVED)
- `.planning/PROJECT.md` 초기화 (Active 22개, Out of Scope 11개, Key Decisions 9개)
- `.planning/REQUIREMENTS.md` v1 섹션 작성 (34 REQ-ID, 9 카테고리)
- `.planning/config.json` 생성 (granularity=standard, profile=quality, git_branching=milestone)
- `/sunco:roadmap`으로 `.planning/ROADMAP.md` 생성 (8 phases, 3 milestones, 100% 커버리지)
- `.planning/STATE.md` 초기화 (현재 파일)
- 다음: B2·B3 blocker 해소 후 `/sunco:plan` Phase 1 세부 분해

---

## Risk Watchlist (디자인 doc 위험 트리거 연계)

- v0.1 데드라인 미달 (2026-04-28) → 즉시 office-hours 재호출
- WebGPU+R3F 통합 v0.1에서 작동 실패 → 접근 C 자체 재고
- 위키 미검증 주장 검증 결과로 핵심 가정 파괴 → design doc revision
- 주당 가용시간 4h 이하 하락 → 마일스톤 슬립 *공개 선언* (침묵 슬립 금지)
- 병행 프로젝트(MILK 백엔드·WalkMate·학기·멘토) 충돌 시 이 블로그가 후순위

---

## Vercel

- **Production URL:** https://webbuild-gray.vercel.app
- **Project:** kwmin122s-projects/webbuild
- **Status:** Ready (deployed 2026-04-14)
- **GitHub CI:** `.github/workflows/vercel.yml` (GitHub Actions) — main push → production, PR → preview
- **PR:** kwmin122/my-blog#1 (milestone/v0.1-skeleton → main)

---

### 2026-04-14 — Phase 1 Executed
- `/sunco:execute 1` 완료: 2/2 plans PASS, lint gate PASS
- 5개 편차 처리 (Next.js 16 Turbopack, next lint 제거, WorldCanvasLoader 패턴)
- INFRA-04 (Vercel CI) human action 대기 — 코드 완료, 브라우저 연결 필요
- B3 blocker RESOLVED: R3F v9 + WebGPU 프로덕션 준비 확인
- 커밋 13개: 54d41bd → 737f207
- 다음: `/sunco:verify 1`

*Last updated: 2026-04-14 by /sunco:execute 1.*

---

### 2026-04-15 — Phase 3 Executed
- `/sunco:execute 3` 완료: 3/3 plans PASS, lint gate PASS, `npx next build` 0
- Wave 1 (병렬): 03-01 (GSAP+Lenis+worldStore+SmoothScrollProvider) + 03-02 (ArchipelagoScene+GLB stubs)
- Wave 2: 03-03 (WorldCameraRig+WorldScrollCamera+WorldPostWaypointSync)
- 편차 2개: SmoothScrollProviderWrapper (Next.js Server Component 제약), lenis CSS를 client component로 이동
- REQ 충족: CORE-02 (route-change interpolation), MOT-01 (GSAP ScrollTrigger flythrough), MOT-03 (Lenis smooth scroll), INT-02 (Spline userData.source tagging)
- 커밋 14개: 920eb1d → 5a9c6f9
- 다음: `/sunco:verify 3`

*Last updated: 2026-04-15 by /sunco:execute 3.*

---

### 2026-04-15 — Phase 3 Shipped
- `/sunco:verify 3` 완료: 7/7 layers PASS, 2 이슈 수정 (ST global kill, camera 충돌)
- `/sunco:ship 3` 완료: PR kwmin122/my-blog#3 생성
- 브랜치: `phase/03-world-concept-and-camera-choreography` → main
- 다음: PR 머지 후 `/sunco:plan 4`

*Last updated: 2026-04-15 by /sunco:ship 3.*

---

### 2026-04-15 — Phase 4 Planned
- PR kwmin122/my-blog#3 머지 완료 (phase/03-world-concept-and-camera-choreography → main)
- `/sunco:plan 4` 완료: 3 plans PASS (9/9 체커 통과, 2회 반복: 스코프 이슈 1개 수정)
- Wave 1 (병렬): 04-01 (tokens+eslint+canvas-aria), 04-02 (reduced-motion+P3-cleanup)
- Wave 2: 04-03 (a11y+keyboard-nav, depends on 04-01)
- REQ 커버: DSGN-01, MOT-04, A11Y-03, INT-03
- 다음: `/sunco:execute 4`

*Last updated: 2026-04-15 by /sunco:plan 4.*

---

### 2026-04-15 — Phase 4 Executed
- `/sunco:execute 4` 완료: 3/3 plans PASS, lint gate PASS
- Wave 1 (병렬): 04-01 (tokens+ESLint+aria-hidden, 8 commits) + 04-02 (reduced-motion matchMedia, 2 commits)
- Wave 2: 04-03 (skip-nav+WorldKeyboardNav+time element+StrictMode guard, 6 commits)
- 편차 1개: eslint config `export default []` → `const config = []; export default config` (import/no-anonymous-default-export 경고 해소)
- REQ 충족: DSGN-01 (design tokens + lint gate), MOT-04 (prefers-reduced-motion ≤200ms cut), A11Y-03 (skip-nav+time+SR route), INT-03 (WorldKeyboardNav listbox+Tab+Enter)
- 커밋 16개: 0aa9ef0 → 95718bc
- 다음: `/sunco:verify 4`

*Last updated: 2026-04-15 by /sunco:execute 4.*

---

### 2026-04-15 — Phase 4 Shipped
- `/sunco:verify 4` 완료: 7/7 layers PASS, Codex P2 수정 (.hashes.json 스테일 해시 + 6개 Phase 4 artifact 추가)
- `/sunco:ship 4` 완료: PR kwmin122/my-blog#4 생성
- 브랜치: `phase/04-design-system-and-accessibility-baseline` → main
- 다음: PR 머지 후 `/sunco:plan 5`

*Last updated: 2026-04-15 by /sunco:ship 4.*

---

### 2026-04-15 — Phase 5 Planned
- `/sunco:plan 5` 완료: 3 plans PASS (체커 통과, WARN 1개 수정 — 05-01 checklist fog + background 제거 둘 다 검증)
- Wave 1 (병렬): 05-01 (TSL CloudSeaSky 셰이더 — VIS-01), 05-02 (tokens.ts baseTone+accent + colorAudit.ts — VIS-03)
- Wave 2: 05-03 (UIGlassPanel + useScrollOpacity + globals.css + UIOverlay 와이어업 — VIS-02, depends on Wave 1)
- REQ 커버: VIS-01, VIS-02, VIS-03
- 다음: `/sunco:execute 5`

*Last updated: 2026-04-15 by /sunco:plan 5.*

---

### 2026-04-16 — Phase 5 Shipped
- `/sunco:verify 5` 완료: 7/7 layers PASS (1 HIGH + 3 WARNs fixed)
  - HIGH: UIOverlay `pointerEvents:none` 제거 (commit `0b96131`)
  - WARN: CloudSeaSky 카메라 상대 방향 수정 `positionWorld.sub(cameraPosition)` (commit `0944c00`)
  - WARN: NodeMaterial `dispose()` 누락 — GPU 리소스 누수 수정 (commit `0944c00`)
  - WARN: colorAudit HSL saturation → raw delta chroma proxy (commit `0944c00`)
- `/sunco:ship 5` 완료: PR kwmin122/my-blog#5 생성
- 브랜치: `milestone/v1.0-launch` → main
- 다음: PR 머지 후 `/sunco:plan 6`

*Last updated: 2026-04-16 by /sunco:ship 5.*

---

### 2026-04-15 — Phase 5 Executed
- `/sunco:execute 5` 완료: 3/3 plans PASS, lint gate PASS, `npx next build` 0
- Wave 1 (병렬): 05-01 (CloudSeaSky TSL shader + ArchipelagoScene fog 제거, 4 commits) + 05-02 (tokens.ts baseTone/accent + colorAudit.ts, 2 commits)
- Wave 2: 05-03 (UIGlassPanel + UIOverlay + useScrollOpacity + globals.css + wire-up, 6 commits)
- 편차 1개: eslint.config.mjs에 `.claude/**` ignore 추가 (병렬 실행 worktree false-positive 수정)
- REQ 충족: VIS-01 (TSL NodeMaterial CloudSeaSky), VIS-02 (backdrop-filter + --panel-opacity 0.4↔0.85), VIS-03 (baseTone+accent.* palette lock + assertLightColor dev guard)
- 커밋 10개: d068106 → c72253d
- 다음: `/sunco:verify 5`

*Last updated: 2026-04-15 by /sunco:execute 5.*
- **phase**: 6
- **status**: planned
- **next_action**: Execute Phase 6: /sunco:execute 6
- **last_updated**: 2026-04-16T05:34:02.367Z
