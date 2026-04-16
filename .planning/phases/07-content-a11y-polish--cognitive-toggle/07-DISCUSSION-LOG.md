# Phase 7: Content, A11Y Polish & Cognitive Toggle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 07-content-a11y-polish--cognitive-toggle
**Areas discussed:** 콘텐츠 스키마 & 검증, Alt JSON 스키마, SR-only DOM 미러, 미니멀 모드 토글
**Mode:** interactive

---

## 콘텐츠 스키마 & 검증

| Option | Description | Selected |
|--------|-------------|----------|
| next.config.ts throw | 빌드 타임 검증 함수, 배포 빌드 차단 | ✓ |
| Custom lint rule | ESLint custom rule — 과잉, 빌드 차단 불확실 | |
| vitest check | CI 테스트 — 배포 빌드 차단력 약함 | |

**User's choice:** 빌드 타임 throw (next.config.ts 또는 content loader)
**Notes:**
- category enum: `일기 | 공부 | 일지` 고정
- 최소 5편, 세 카테고리 각 1편 이상
- sample.mdx의 `category: '탐험'`은 유효 카테고리로 수정 필요
- lint는 과잉, vitest 단독은 배포 차단력 약함 → 빌드 타임 throw가 가장 확실

---

## Alt JSON 스키마

| Option | Description | Selected |
|--------|-------------|----------|
| Record<string, string> | 단순 key-value 맵 | |
| { id, alt }[] 배열 | 나중에 type, label 등 확장 가능 | ✓ |

**User's choice:** `visuals: [{ id: string, alt: string }]` 배열
**Notes:**
- 배열 형태가 나중에 type, label, describedBy 필드 추가하기 좋음
- Phase 7에서는 WorldPostPanel/waypoint 컴포넌트가 읽어서 SR mirror에 공급
- `lib/posts.ts`에 `getAltData(slug)` 유틸 추가

---

## SR-only DOM 미러

| Option | Description | Selected |
|--------|-------------|----------|
| <Html> 내부 sr-only | 3D 레이어와 접근성 레이어 혼재 — 취약 | |
| 캔버스 형제 정적 sr-only + aria-live | DOM 계층 분리, 현재 waypoint만 live 업데이트 | ✓ |
| aria-live 전체 | 스크롤마다 낭독 폭주 위험 | |

**User's choice:** 캔버스 형제 DOM, 정적 sr-only 영역 + 현재 waypoint만 aria-live
**Notes:**
- Html 내부에 넣으면 3D 레이어와 접근성 레이어가 섞임 → 분리 필수
- 소스는 MDX frontmatter + alt JSON (Html 발췌 재수집은 취약)
- `WorldSRMirror.tsx` 신규 컴포넌트, worldStore 현재 waypoint slug 구독

---

## 미니멀 모드 토글

| Option | Description | Selected |
|--------|-------------|----------|
| 애니메이션만 중단 | Lenis/GSAP만 멈춤 | |
| 월드 인터랙션 전체 저자극 모드 | Lenis + GSAP + WorldCursor + Rive 저감, /text/ 콘텐츠 인라인 | ✓ |

**User's choice:** 월드 인터랙션 전체 저자극 모드
**Notes:**
- localStorage 키: `world:minimal-mode`
- 위치: 헤더/UIOverlay (항상 접근 가능)
- 중단: Lenis, GSAP camera/morph, WorldCursor magnet, Rive autoplay/interaction
- 대체 렌더: /text/{slug} 정본 콘텐츠를 `<main>`에 인라인 (또는 링크 중심)
- zustand `worldStore`에 `minimalMode` 슬라이스 추가

---

## Claude's Discretion

- 검증 함수 오류 메시지 형식
- WorldSRMirror 내부 DOM 구조 세부사항
- 미니멀 모드 토글 시각적 표현
- 글 5편 실제 내용 (구조·스키마만 구현, 내용은 작성자 재량)

## Deferred Ideas

- Phase 6 deferred 중 Phase 8 처리: SplineIslandProp Suspense, WorldKeyboardNav Escape trap
- aria-describedby 심화 연결 — Phase 8 이후
