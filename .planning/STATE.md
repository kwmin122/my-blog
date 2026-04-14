# STATE — Personal Blog 3D World

현재 SUNCO 작업 상태. `/sunco:phase` 전환마다 이 파일이 갱신된다.

---

## Current Phase

**Phase 1 — Foundation & Verification**
**Milestone:** M1 (v0.1 — World Skeleton)
**Deadline:** 2026-04-28 (약 2주)
**Status:** Planned (2026-04-14)
**Branch target:** `milestone/v0.1-skeleton`

### Phase 1 요약
- Next.js App Router 골격 + layout 영속 `<WorldCanvas>` 마운트
- WebGPU → WebGL2 → 정적 포스터 3단계 강등 체인
- Vercel 자동 배포 파이프라인
- `performance.mark()` 자체 계측 스캐폴드 (값은 아직 게이트 미적용)

### 다음 액션
```
/sunco:execute 1
```

### 실행 계획
- Plan 01-01 (Wave 1): Next.js scaffold + Vercel CI — `INFRA-04`
- Plan 01-02 (Wave 2, depends on 01-01): WorldCanvas + renderer fallback + perf.mark — `CORE-01, CORE-05, CORE-06, PERF-05`
- Plans: `.planning/phases/01-foundation-and-verification/`

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
| Phase 3 진입 전 월드 컨셉 확정 필수 | 디자인 doc Open Question #1 + 카메라 waypoint 배치 전제 조건 | Active (blocker) |

---

## Blockers

Phase 1 착수 전 또는 다음 페이즈 전환 전 반드시 해소해야 할 항목.

### B1 — 월드 컨셉 미결정 (Phase 3 진입 blocker)
- **원문:** 디자인 doc Open Question #1 — "떠다니는 군도 / 디지털 아틀리에 / 데이터 숲 / 뉴트로 도시" 4안 중 1택 미결정
- **영향:** Phase 3(Camera Choreography)의 waypoint 배치·Spline 오브젝트 선정·v0.5 디자인 토큰 생태 결정 전부 이 선택에 의존
- **언제까지:** Phase 3 착수 전 (v0.5 2026-06-30 데드라인 역산 시 2026-05-중 이전)
- **해소 방법:** `/sunco:design-shotgun "3D 월드 비주얼 메타포 4안"` 또는 다음 office-hours 세션 후속
- **Phase 1·2 진행 가능 여부:** OK — Phase 1(골격)·Phase 2(콘텐츠 분리)는 월드 컨셉 비의존

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

*Last updated: 2026-04-14 by /sunco:roadmap (bootstrap).*
