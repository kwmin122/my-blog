# Personal Blog 3D World

## What This Is

개인 블로그를 단일 연속 WebGPU 3D 월드로 구현하는 작품형 사이트. 일반적인 페이지 기반 블로그가 아니라, 사이트 자체가 하나의 3D 세계이며 각 글·프로젝트는 그 월드 안의 *장소*다. 카메라가 스크롤로 장소들 사이를 비행하면서 글이 등장한다. 2026년 핵심 웹 트렌드(WebGPU·모핑 스크롤·도파민 컬러·리퀴드 글래스·뉴트로 등)를 *데모로 나열*하지 않고 *세계관 디테일*로 통합한다. 작성자(민경욱, 1인)의 기술력과 디자인 취향을 즉시 증명하는 디지털 명함·포트폴리오 역할.

## Core Value

방문자가 도착한 첫 5초 안에 "이 사람 기술력 + 디자인 취향 둘 다 미친다"를 시각적으로 증명한다. 글이 거의 없어도 사이트 자체가 작품으로 성립한다.

## Requirements

### Validated

(None yet — 그린필드. v0.1 라이브 검증 후 이동.)

### Active

- [ ] **사이트 = 단일 3D 월드** — 페이지 전환에 캔버스 재마운트 없이, layout에 영속 마운트된 WebGPU 캔버스가 계속 살아 있다.
- [ ] **콘텐츠 정본/프레젠테이션 분리** — `/text/{slug}` = canonical 정본 (SEO·a11y 인덱싱), `/world/{slug}` = 같은 콘텐츠의 3D 월드 프레젠테이션 사본 (`<link rel="canonical">` 정본을 가리킨다).
- [ ] **WebGPU + WebGL2 자동 폴백** — `navigator.gpu` 미존재 또는 init 실패 시 WebGL2로 자동 강등, 둘 다 실패 시 정적 포스터 + 텍스트 라우트 안내.
- [ ] **GSAP 카메라 안무** — 라우트 변경 / 스크롤 진행도에 따라 카메라가 waypoint 사이를 보간 비행. Theatre.js 미사용.
- [ ] **드래이 `<Html>` 포털 발췌 표시** — 월드 안 장소에 글의 제목·발췌만 표시 (본문 전체 X, 정본 중복 방지). "전체 보기"가 `/text/`로 이동.
- [ ] **리퀴드 글래스 UI 패널** — 떠 있는 내비·모달이 `backdrop-filter` 기반 반투명 유리 효과.
- [ ] **도파민 컬러 라이팅** — 단일 베이스 톤 위에서 채도 높은 액센트(네온·하늘·라이트). 잡탕 금지.
- [ ] **Rive 마이크로 인터랙션** — 월드 안 표지판·버튼·이정표가 상태 머신 기반 반응형 애니.
- [ ] **Spline 정적 오브젝트 임포트** — Blender 대신 Spline로 월드 가구·조각·소품을 모델링·내보내 임포트.
- [ ] **TSL 셰이더로 월드 렌더링** — 자작 TSL 셰이더(WGSL/GLSL 동시 컴파일)로 월드의 시각적 시그니처 한 가지 이상 구현.
- [ ] **뉴트로/픽셀/Y2K 격리 사용** — 월드 안 표지판·CRT·픽셀 캐릭터로만 격리. 전체 톤은 잡아먹지 않는다.
- [ ] **커스텀 커서** — 월드 좌표 호버로 인터랙션 힌트 + 자석 효과. `prefers-reduced-motion` 존중.
- [ ] **모핑 스크롤 스토리텔링** — 스크롤 진행도가 카메라 안무 + 장소 간 형태/라이팅 보간을 동시 구동.
- [ ] **MDX 기반 글 작성** — `.mdx` 파일 직접 작성으로 글 추가. 외부 CMS 의존 없음.
- [ ] **글 5편 이상 (v1.0)** — 일기·공부·일지 카테고리. 정본 라우트에서 모두 읽힌다.
- [ ] **데스크톱 성능 게이트** — `/text/` LCP ≤ 1.5s, `/world` 첫 의미있는 프레임 ≤ 3.0s, 인터랙션 시 60fps 유지, draw call ≤ 800.
- [ ] **모바일 우아한 폴백** — 정적 포스터 LCP ≤ 1.8s, 명시적 사용자 액션("탐험하기" 버튼) 후에만 월드 활성.
- [ ] **a11y 최소선** — 모든 콘텐츠 정본은 키보드만으로 도달, `prefers-reduced-motion` 존중(카메라 fade-cut 강등), alt 텍스트 사이드카 JSON, 월드 안 텍스트 SR-only DOM 미러.
- [ ] **인지적 접근성 토글** — 미니멀 모드(저자극 정적 표시) 토글 제공.
- [ ] **에셋 파이프라인** — Draco(지오메트리 압축) + KTX2/Basis(텍스처 압축) + `gltf-transform` CLI 빌드 단계 + `<Suspense>` 단계 로딩.
- [ ] **호스팅 + 헤더** — Vercel 또는 Cloudflare Pages 배포, KTX2 MIME (`image/ktx2`) 명시, 필요 시 COOP/COEP (SharedArrayBuffer).
- [ ] **디자인 토큰 1세트** — 색·여백·타이포·이징·라이팅 톤을 코드화. 새 컴포넌트는 토큰 미준수 시 lint fail.
- [ ] **자체 성능 계측** — Lighthouse가 canvas LCP를 비신뢰하므로 `performance.mark()` 자체 계측 + 콘솔 리포트.

### Out of Scope

- **에이전틱 UX / 동적 레이아웃 재배치 / 대화형 에이전트** — ROI 0(일기 트래픽), LLM API 비용·프롬프트 보안·서버 부담. 위키 자료에 *멋있어 보여서* 들어간 항목.
- **댓글·소셜 기능** — 일기 사이트 트래픽 규모에서 운영 부담 > 가치.
- **다크 모드 토글** — 월드 자체가 라이팅 시스템. 별도 다크모드는 잡탕 위험.
- **i18n / 다국어** — 한국어 단일.
- **사용자 로그인·계정** — 정적 사이트.
- **사용자별 카메라 시퀀스 / 추천 콘텐츠** — v1.5+ 백로그.
- **WebXR / VR / AR 모드** — v1.5+ 백로그.
- **Notion/Obsidian CMS 연동** — MDX 직접 작성으로 충분. 의존성 셋 추가 금지.
- **단계화된 트렌드 도입** — 사용자 결정: 트렌드 가지치기 금지, v1.0 시점에 모든 트렌드 통합 완료. (릴리즈는 단계화 OK, 트렌드는 NO.)
- **Astro 프레임워크 옵션** — Day-0 결정으로 Next.js App Router 잠금 (R3F+WebGPU 영속 캔버스 호환성).
- **Theatre.js** — 유지보수 둔화. GSAP 단일 커밋.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 접근 = Single Continuous 3D World (Approach C) | "사이트 자체가 작품" 1순위 + "기술 다 넣기" 욕구를 *세계관 디테일*로 정당화. Approach A(적층)는 잡탕 위험, B(아틀리에)는 다 못 넣음. | — Pending v0.1 검증 |
| 프레임워크 = Next.js App Router | App Router의 layout 영속성이 WorldCanvas "지속 마운트" 패턴과 호환. R3F+WebGPU 프로덕션 사례 풍부. Astro islands는 SPA 캔버스 영속과 충돌. | — Pending eng-review 검증 |
| 카메라 안무 = GSAP 단일 | Theatre.js 2024 이후 유지보수 둔화. GSAP는 안정성·문서·R3F+Lenis 통합 사례 풍부. | — Pending v0.5 검증 |
| 콘텐츠 정본 = `/text/{slug}` | SEO 중복 방지(canonical), a11y 인덱싱 보장, 월드 안 `<Html>`은 *프레젠테이션 사본*에 불과. | — Pending v0.5 검증 |
| 의존성 lock-set 12개 | Next, three.js+WebGPURenderer, R3F, drei, GSAP+ScrollTrigger, Lenis, zustand, MDX, Tailwind v4, Rive, Spline runtime, gltf-transform. v1.0 출시 전까지 추가 금지. | — Pending v1.0 |
| 에이전틱 AI 제외 | 비용·보안·서버 부담 vs ROI 0. 위키에 *멋있어서* 들어간 항목. | — Confirmed |
| 모바일 = 정적 폴백 우선 | WebGPU 모바일 변동성 + 배터리·메모리 예산 + 터치 인터랙션 재설계 비용. 데스크톱 1순위. | — Pending v1.0 |
| 카메라 모델 단일 (Theatre.js + GSAP 동시 금지) | 두 타임라인 모델 lock-in 비용 다름, 호환 안 됨. | — Confirmed |
| AI 모델 분업 = Sonnet executor + Opus advisor | 사용자 선호 (`feedback_executor_sonnet_advisor_opus.md`). 현재 advisor 단계라 Opus(quality), 실행 단계 진입 시 `/sunco:profile balanced`로 전환 예정. | — Active |

## Context

**Target users:** 본인(작성자, 일기·공부·일지) + 잠재 고용주·클라이언트(포트폴리오로 도착) + 디자이너·개발자(기술·디자인에 호기심). 일반 독자 확보는 부차 — 트래픽 엔진은 사이트 임팩트 자체.

**Current alternative:** Velog/티스토리 같은 일반 블로그(기술력 시그널 0), 또는 Notion 공유 페이지(디자인 무, 무료).

**v1 deadline:** 2026-12-31 (사용자 명시 "기한 없음"이지만 office hours 강제 마일스톤. v0.1 = 2026-04-28, v0.5 = 2026-06-30, v1.0 = 2026-12-31). 데드라인 미달 시 office hours 재호출 필수.

**Constraints:**
- 1인 풀스택, 주당 8~12h (MILK 백엔드·WalkMate·학기·창업과 시간 분할)
- 바이브 코딩 우선, 단 셰이더·perf·a11y는 본인 학습
- 데스크톱 1순위, 모바일 정적 폴백
- 의존성 lock-set 12개 외 추가 금지
- 작업 디렉토리: `/Users/min-kyungwook/Desktop/dev/webbuild`
- 별도 git 레포 (홈 디렉토리 git에서 분리)

**참조 자료:**
- Office hours 디자인 doc (정본): `/Users/min-kyungwook/Desktop/dev/webbuild/2026-04-14-personal-blog-3d-world.md`
- 트렌드 위키: `/Users/min-kyungwook/Desktop/dev/llm-wiki-webdesign/wiki/`
  - 핵심: `wiki/syntheses/2026-web-design-trends.md`
  - 보조: `wiki/concepts/{ai-assisted-design-tools, immersive-3d-web-experiences, threejs-performance-practices, 3d-web-accessibility, phygital-experience-strategy}.md`
  - 주의: 위키의 통계 주장(WebGPU 15-30배·Cloud Dancer·Safari 26·53% 3초 이탈)은 미검증. 핵심 결정 인용 전 1차 출처 확인.

**병행 프로젝트:**
- MILK 백엔드 (yeon-03 fork, 활성, 우선순위 높음)
- WalkMate (창업 프로젝트)
- 학기 과제 (2026 1학기, AI응용학과 4학년, 지도교수 오세종·이선아)
- 멘토 강예은 (레몬클라우드)

## Evolution

이 문서는 페이즈 전환 / 마일스톤 경계에서 진화한다.

**페이즈 전환마다 (`/sunco:phase`):**
1. 무효화된 요구사항? → Out of Scope로 이동 + 사유 기록
2. 검증된 요구사항? → Validated로 이동 + 페이즈 참조
3. 새 요구사항 등장? → Active에 추가
4. 결정 사항? → Key Decisions 표에 추가
5. "What This Is" 정확성? → 드리프트 시 수정

**마일스톤마다 (`/sunco:milestone`):**
1. 모든 섹션 전체 리뷰
2. Core Value 재확인 — 여전히 맞는 우선순위?
3. Out of Scope 감사 — 사유 여전히 유효?
4. Context 현재 상태로 갱신
5. 트렌드 통합 진척 점검 — v1.0 절대선 위협 시 office hours 재호출

**위험 트리거 — 즉시 office hours 재호출 조건:**
- v0.1 데드라인(2026-04-28) 미달
- WebGPU+R3F 통합이 v0.1에서 작동 안 함 → 접근 C 자체 재고
- 위키 미검증 주장 검증 결과 핵심 가정 깨짐 (예: WebGPU 모바일 지원이 2026 현재 가정과 다름)
- 주당 가용시간 4h 이하로 떨어짐

---
*Last updated: 2026-04-14 after initialization (origin: /sunco:office-hours design doc)*
