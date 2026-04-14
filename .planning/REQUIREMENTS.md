# Requirements

소스: `.planning/PROJECT.md` Active 요구사항 + office hours 디자인 doc Constraints/강제 게이트.

---

## v1 Requirements (2026-12-31 v1.0 절대선)

### CORE — 월드 통합 아키텍처

- [ ] **CORE-01**: 사용자가 사이트의 어떤 라우트를 방문해도 단일 WebGPU 캔버스가 layout에 영속 마운트되어 있고, 페이지 전환에 캔버스가 재마운트되지 않는다.
- [ ] **CORE-02**: 사용자가 `/world` 진입 시 카메라가 home waypoint에 위치하고, `/world/{slug}` 진입 시 동일 월드의 해당 글 waypoint로 카메라가 보간 비행한다.
- [ ] **CORE-03**: 사용자가 `/text/{slug}` 라우트 방문 시 3D가 비활성화된 순수 HTML/MDX 본문이 표시되고, 검색 엔진이 이 라우트를 canonical로 인덱싱한다.
- [ ] **CORE-04**: 사용자가 `/world/{slug}` 페이지 소스 보기 시 `<link rel="canonical" href="/text/{slug}">`가 존재하고, 월드 안 `<Html>` 표시는 제목·발췌만이며 본문 전체는 중복되지 않는다.
- [ ] **CORE-05**: 사용자가 `navigator.gpu` 미지원 브라우저로 방문 시 자동으로 WebGL2 렌더러로 강등되어 동일 월드를 본다 (R3F 표준 폴백 검증).
- [ ] **CORE-06**: 사용자가 WebGPU·WebGL2 둘 다 실패하는 환경에서 방문 시 정적 포스터 이미지 + `/text/`로 안내 배너가 표시된다.

### VISUAL — 트렌드 통합 (가지치기 금지)

- [ ] **VIS-01**: 월드 안 시각적 시그니처(예: 메인 셰이더 효과·라이팅 시스템) 한 가지 이상이 자작 TSL 셰이더로 구현되어 WGSL/GLSL 동시 컴파일된다.
- [ ] **VIS-02**: 떠 있는 UI 패널·내비·모달이 `backdrop-filter` 기반 리퀴드 글래스 효과로 표시되며, 스크롤·상호작용에 따라 불투명도가 동적으로 변한다.
- [ ] **VIS-03**: 월드의 라이팅·하늘·네온이 단일 베이스 톤 위에서 채도 높은 도파민 컬러 액센트를 사용하며 톤 잡탕(서로 충돌하는 4개 이상 채도) 발생하지 않는다.
- [ ] **VIS-04**: 월드 안 표지판·CRT 모니터·픽셀 캐릭터 등 뉴트로/픽셀/Y2K 요소가 격리 사용되며, 전체 월드 톤을 지배하지 않는다 (격리된 오브젝트로 한정).
- [ ] **VIS-05**: 사용자가 마우스를 움직일 때 커스텀 커서가 월드 좌표 호버에 따라 인터랙션 힌트(자석 효과 등)를 표시하고, `prefers-reduced-motion` 활성 시 기본 커서로 강등된다.

### MOTION — 카메라/스크롤 안무

- [ ] **MOT-01**: 사용자가 스크롤할 때 GSAP + ScrollTrigger 기반 카메라 안무가 waypoint 사이를 부드럽게 보간 비행한다 (Theatre.js 미사용).
- [ ] **MOT-02**: 스크롤 진행도가 카메라 위치뿐 아니라 장소 간 형태/라이팅 보간을 동시 구동한다 (모핑 스크롤).
- [ ] **MOT-03**: Lenis 기반 부드러운 스크롤이 적용되어 네이티브 스크롤보다 매끄러운 관성 스크롤을 제공한다.
- [ ] **MOT-04**: `prefers-reduced-motion` 활성 사용자에게는 카메라 안무가 fade-cut 전환으로 강등된다.

### INTERACT — 마이크로 인터랙션

- [ ] **INT-01**: 월드 안 표지판·버튼·이정표가 Rive 상태 머신 기반 반응형 애니메이션으로 호버·클릭에 반응한다.
- [ ] **INT-02**: 월드 안 정적 오브젝트(가구·조각·소품) 중 적어도 3종이 Spline로 모델링·내보내져 임포트되어 있다.
- [ ] **INT-03**: 사용자가 키보드(Tab + Enter)만으로 모든 waypoint에 도달할 수 있고, 현재 포커스 waypoint가 시각적으로 표시된다.

### CONTENT — 글 콘텐츠

- [ ] **CONT-01**: 작성자가 새 글을 추가할 때 `.mdx` 파일을 직접 작성하여 라우트가 자동 생성된다 (외부 CMS 의존 없음).
- [ ] **CONT-02**: v1.0 출시 시점에 일기·공부·일지 카테고리의 글 5편 이상이 `/text/{slug}` 정본 라우트에서 읽히고 `/world/{slug}` 프레젠테이션에서도 발췌가 보인다.
- [ ] **CONT-03**: 각 글에 alt 텍스트 사이드카 JSON이 존재하여 월드 안 해당 장소의 시각 요소를 설명한다.

### A11Y — 접근성

- [ ] **A11Y-01**: 사용자가 인지적 접근성 토글(미니멀 모드)을 활성화하면 카메라 안무 정지 + 텍스트만 표시되는 저자극 모드로 전환된다.
- [ ] **A11Y-02**: 월드 안 모든 텍스트가 SR-only DOM 미러 또는 `/text/` 폴백 라우트를 통해 스크린 리더에 노출된다.
- [ ] **A11Y-03**: 모든 콘텐츠 정본은 `/text/{slug}`을 통해 키보드 + 스크린 리더만으로 100% 접근 가능하다.

### PERF — 성능 게이트

- [ ] **PERF-01**: 데스크톱(1080p, Chrome 안정판)에서 `/text/` 라우트 LCP ≤ 1.5s를 측정 통과한다.
- [ ] **PERF-02**: 데스크톱에서 `/world` 첫 의미 있는 프레임 ≤ 3.0s를 `performance.mark()` 자체 계측으로 측정 통과한다 (WebGPU init + KTX2 디코드 포함).
- [ ] **PERF-03**: 데스크톱 인터랙션(스크롤·호버) 시 60fps 유지, draw call ≤ 800을 만족한다.
- [ ] **PERF-04**: 모바일에서 정적 포스터 LCP ≤ 1.8s, 월드는 명시적 사용자 액션("탐험하기" 버튼) 후에만 활성화된다.
- [ ] **PERF-05**: 자체 성능 계측 리포트(콘솔 또는 별도 라우트)가 PERF-01~04 측정값을 출력한다.

### INFRA — 빌드/에셋/호스팅

- [ ] **INFRA-01**: 빌드 단계에 `gltf-transform` CLI가 통합되어 모든 GLTF 에셋에 Draco(지오메트리) + KTX2/Basis(텍스처) 압축이 자동 적용된다.
- [ ] **INFRA-02**: `<Suspense>` 경계로 월드 에셋이 단계 로딩되어 첫 의미있는 프레임까지 점진적 표시가 된다.
- [ ] **INFRA-03**: 호스팅(Vercel 또는 Cloudflare Pages)에 KTX2 MIME (`image/ktx2`) 헤더가 명시되고, SharedArrayBuffer 사용 시 COOP/COEP 헤더가 활성화된다.
- [ ] **INFRA-04**: Next.js App Router 기반 배포가 자동화되어 `main` 브랜치 푸시 시 프리뷰·프로덕션이 자동 빌드·배포된다.

### DESIGN — 디자인 시스템

- [ ] **DSGN-01**: 색·여백·타이포·이징·라이팅 톤을 코드화한 디자인 토큰 1세트가 존재하고, 새 컴포넌트가 토큰 미준수 시 lint fail로 차단된다.

---

## v2 Requirements (백로그)

- [ ] **CONT-NN**: 추가 글 (10편+, 카테고리별 균형) — 트래픽·SEO 안정화 후 우선순위 상승
- [ ] **MOT-NN**: 사용자별 카메라 시퀀스 (방문 횟수·소스에 따른 차등 안무) — v1.5 기능 확장
- [ ] **VIS-NN**: 새 월드 영역 추가 (계절·시간대 변주) — 콘텐츠 풍요화
- [ ] **INT-NN**: 이스터에그 인터랙션 (커서 패턴·키보드 시퀀스 발견) — 재방문 인센티브
- [ ] **A11Y-NN**: 다크 모드 (기본 라이팅 외 야간 변주) — 사용자 요청 시
- [ ] **CONT-NN**: 댓글 시스템 (Giscus·utterances 등 GitHub 기반) — 트래픽 발생 후 검토

---

## Out of Scope (v1·v2 모두 제외)

- **에이전틱 UX / 동적 레이아웃 재배치 / 대화형 에이전트** — ROI 0(일기 트래픽), LLM API 비용·프롬프트 보안·서버 부담. 위키에서 *멋있어 보여서* 들어간 항목.
- **i18n / 다국어** — 한국어 단일.
- **사용자 로그인·계정** — 정적 사이트.
- **Notion/Obsidian 외부 CMS 연동** — MDX 직접 작성으로 충분. 의존성 lock-set 외 추가 금지.
- **WebXR / VR / AR 모드** — v1.5+ 백로그 분류, v1·v2 모두 제외.
- **Astro 프레임워크 옵션** — Day-0 Next.js App Router 잠금.
- **Theatre.js 카메라 라이브러리** — GSAP 단일 커밋, 유지보수 둔화 사유.
- **소셜 로그인 댓글** — Giscus 등 GitHub 기반 외 제외.
- **단계화된 트렌드 도입** — 사용자 결정으로 가지치기 금지. v1.0 시점 전체 통합.

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CORE-01 | Phase 1 | Not started |
| CORE-02 | Phase 3 | Not started |
| CORE-03 | Phase 2 | Not started |
| CORE-04 | Phase 2 | Not started |
| CORE-05 | Phase 1 | Not started |
| CORE-06 | Phase 1 | Not started |
| VIS-01 | Phase 5 | Not started |
| VIS-02 | Phase 5 | Not started |
| VIS-03 | Phase 5 | Not started |
| VIS-04 | Phase 6 | Not started |
| VIS-05 | Phase 6 | Not started |
| MOT-01 | Phase 3 | Not started |
| MOT-02 | Phase 6 | Not started |
| MOT-03 | Phase 3 | Not started |
| MOT-04 | Phase 4 | Not started |
| INT-01 | Phase 6 | Not started |
| INT-02 | Phase 3 | Not started |
| INT-03 | Phase 4 | Not started |
| CONT-01 | Phase 2 | Not started |
| CONT-02 | Phase 7 | Not started |
| CONT-03 | Phase 7 | Not started |
| A11Y-01 | Phase 7 | Not started |
| A11Y-02 | Phase 7 | Not started |
| A11Y-03 | Phase 4 | Not started |
| PERF-01 | Phase 8 | Not started |
| PERF-02 | Phase 8 | Not started |
| PERF-03 | Phase 8 | Not started |
| PERF-04 | Phase 8 | Not started |
| PERF-05 | Phase 1 | Not started |
| INFRA-01 | Phase 8 | Not started |
| INFRA-02 | Phase 8 | Not started |
| INFRA-03 | Phase 8 | Not started |
| INFRA-04 | Phase 1 | Not started |
| DSGN-01 | Phase 4 | Not started |

---

## Notes

- 글 5편 (CONT-02)의 "5편" 기준은 office hours design doc Success Criteria v1.0 항목에 명시. v0.5에서 1편 정본 등장은 Success Criteria 분리.
- 성능 예산 숫자(PERF-01~04)는 **목표치**. v0.1에서 자체 계측 후 조정 가능 (design doc 명시).
- 디자인 토큰 1세트(DSGN-01)는 v0.5에서 초안, v1.0에서 lint 강제까지 진화.
- 위키 미검증 주장(WebGPU 15-30배·Cloud Dancer·Safari 26·53% 3초 이탈)은 핵심 가정 인용 전 1차 출처 확인이 별도 액션으로 필요. 이 검증으로 핵심 가정이 깨지면 design doc revision + REQUIREMENTS.md 재작성 트리거.
