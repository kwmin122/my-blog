# CLAUDE.md — Personal Blog 3D World

이 파일은 Claude Code가 이 프로젝트를 작업할 때 항상 읽어야 하는 핵심 컨텍스트다.

---

## 문서 계층 (충돌 해소 순서)

```
2026-04-14-personal-blog-3d-world.md  ← 읽기 전용 원본 설계 의도 (정본 기준)
         ↓ 추출·구조화
.planning/PROJECT.md / REQUIREMENTS.md / ROADMAP.md  ← SUNCO 살아있는 문서
```

- design doc의 수치·결정이 코드나 .planning과 충돌하면 **design doc이 우선**.
- 변경 필요 시: **design doc revision → .planning 갱신 순서 필수**. 역순 금지.

---

## 프로젝트 개요

개인 블로그를 단일 연속 WebGPU 3D 월드로 구현하는 작품형 사이트.
- **작업 디렉토리:** `/Users/min-kyungwook/Desktop/dev/webbuild`
- **GitHub:** `https://github.com/kwmin122/my-blog`
- **오너:** 민경욱 (1인 풀스택)
- **v1.0 데드라인:** 2026-12-31

---

## 기술 스택 (lock-set, 추가 금지)

12개 라이브러리만 허용. 새 의존성 추가 시 design doc revision 필요.

| # | 라이브러리 | 용도 |
|---|-----------|------|
| 1 | Next.js App Router | 프레임워크 + 라우팅 |
| 2 | three.js + WebGPURenderer | 3D 렌더러 |
| 3 | @react-three/fiber (R3F) | React 통합 |
| 4 | @react-three/drei | R3F 헬퍼 |
| 5 | GSAP + ScrollTrigger | 카메라 안무 |
| 6 | Lenis | 부드러운 스크롤 |
| 7 | zustand | 전역 상태 |
| 8 | MDX (next-mdx-remote 또는 @next/mdx) | 글 콘텐츠 |
| 9 | Tailwind v4 | 스타일링 |
| 10 | Rive web runtime | 마이크로 인터랙션 |
| 11 | Spline runtime | 3D 정적 오브젝트 |
| 12 | gltf-transform | 빌드 에셋 압축 |

**금지:** Theatre.js, Astro, Notion/CMS 연동, 에이전틱 UX 라이브러리, WebXR.

---

## 핵심 아키텍처 원칙

1. **영속 캔버스**: `<WorldCanvas>`는 `app/layout.tsx`에 마운트. 페이지 전환에 재마운트 금지.
2. **정본 분리**: `/text/{slug}` = SEO canonical (HTML/MDX), `/world/{slug}` = 3D 프레젠테이션 + `<link rel="canonical" href="/text/{slug}">`.
3. **폴백 체인**: WebGPU → WebGL2 → 정적 포스터 + 텍스트 라우트 안내.
4. **카메라 안무**: GSAP + ScrollTrigger 단일. Theatre.js 사용 금지.
5. **모바일**: 정적 포스터 기본. 명시적 "탐험하기" 버튼 탭 후에만 월드 활성화.

---

## 현재 페이즈

**Phase 1 — Foundation & Verification** (v0.1, 마감: 2026-04-28)

- 다음 명령: `/sunco:plan 1`으로 Phase 1 세부 분해
- 차단자 B2·B3 해소 우선 (위키 주장 검증, R3F+WebGPU 성숙도 확인)
- 전체 상태: `.planning/STATE.md`
- 페이즈 목록: `.planning/ROADMAP.md`

---

## 폴더 구조 (예정)

```
webbuild/
├── .planning/           # SUNCO 계획 산출물 (수정 금지, /sunco:* 명령으로만)
├── app/
│   ├── layout.tsx       # WorldCanvas 영속 마운트
│   ├── world/           # /world, /world/[slug]
│   └── text/            # /text/[slug] (canonical)
├── components/
│   ├── world/           # R3F 씬 컴포넌트
│   └── ui/              # 리퀴드 글래스 패널
├── content/
│   └── posts/           # *.mdx + *.alt.json 사이드카
├── tokens/              # 디자인 토큰 (tokens.ts)
├── shaders/             # TSL 셰이더
└── assets/
    ├── raw/             # 원본 GLTF (빌드에서 최적화됨)
    └── out/             # Draco + KTX2 압축 출력
```

---

## 성능 게이트 (Phase 8 목표)

| 지표 | 목표 |
|------|------|
| `/text/` LCP (데스크톱) | ≤ 1.5s |
| `/world` 첫 의미있는 프레임 (데스크톱) | ≤ 3.0s |
| 인터랙션 fps | 60fps |
| draw call | ≤ 800 |
| 모바일 정적 포스터 LCP | ≤ 1.8s |

---

## 작업 원칙

- **바이브 코딩 OK**, 단 셰이더·perf·a11y는 직접 이해하고 작성.
- **트렌드 가지치기 금지** — VIS/MOT/INT 전부 v1.0에 통합. 릴리즈 단계화는 OK.
- **lock-set 외 라이브러리 추가 금지** — 추가 필요 시 design doc revision 후 결정.
- **위키 통계 주장 미검증** — "WebGPU 15-30배", "Safari 26", "53% 이탈" 등은 핵심 결정 인용 전 1차 출처 확인 필수.
- **침묵 슬립 금지** — 마일스톤 미달 예상 시 즉시 공개 선언.
