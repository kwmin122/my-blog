---
phase: 3
plan: 02
title: Archipelago scene geometry — island primitives, cloud plane, lighting, Spline placeholder GLBs
wave: 1
depends_on: []
files_modified:
  - components/world/FloatingIsland.tsx
  - components/world/ArchipelagoScene.tsx
  - components/world/SplineIslandProp.tsx
  - components/world/WorldScene.tsx
  - public/assets/raw/island-cottage.glb
  - public/assets/raw/island-tree.glb
  - public/assets/raw/island-arch.glb
requirements_addressed:
  - INT-02
gap_closure: false
---

## read_first

- `components/world/WorldScene.tsx` — current scene (postOverlay Html only), will be extended to include ArchipelagoScene
- `components/world/WorldCanvas.tsx` — Canvas setup pattern (do NOT modify — gl factory must not change)
- `lib/worldStore.ts` — current store shape (postOverlay slice — WorldScene still reads it)
- `CLAUDE.md` — lock-set: three.js, @react-three/fiber, @react-three/drei are all present; simplex-noise is NOT on lock-set

## Objective

Build the archipelago scene geometry: 3 floating rock islands using procedural `SphereGeometry` deformation (no external noise library), a cloud sea plane, directional + ambient lighting, sky fog, and 3 Spline-origin placeholder mesh objects with `userData.source = 'spline'` tagging. Mount everything inside `WorldScene` via `<ArchipelagoScene>`.

Requirements fulfilled: INT-02 (3 Spline-origin objects in scene, each tagged `userData.source = "spline"`).

Phase goal contribution: establishes the visible world geometry that the camera system (Plan 03-03) will fly through.

## Capabilities

- **INT-02**: Three distinct objects — island-cottage, island-tree, island-arch — are loaded via `useGLTF` (drei). Each has its full scene graph traversed in `useEffect` to stamp `obj.userData.source = 'spline'`. For Phase 3, actual `.glb` files are minimal valid GLBs (created via `npx gltf-pipeline -i /dev/null -o assets/raw/island-cottage.glb` workaround — see Technical direction for the exact stub creation method). The `userData.source = "spline"` tag is what the success criterion checks; real Spline-exported GLBs replace these in Phase 5/8 via the INFRA-01 asset pipeline.

## Delivery scope

- Create `components/world/FloatingIsland.tsx` — procedural rock island component using distorted `SphereGeometry`
- Create `components/world/SplineIslandProp.tsx` — `useGLTF` loader with `userData.source = 'spline'` traversal, clones scene to avoid mutation
- Create `components/world/ArchipelagoScene.tsx` — assembles 3 islands + cloud plane + 3 SplineIslandProp instances + lighting + fog
- Modify `components/world/WorldScene.tsx` — add `<ArchipelagoScene />` render alongside existing `postOverlay` Html block
- Create stub GLB files at `assets/raw/island-cottage.glb`, `assets/raw/island-tree.glb`, `assets/raw/island-arch.glb` — minimal valid binary GLBs so `useGLTF` does not 404

## Verification intent

1. Visit `http://localhost:3000/world` — see 3 floating rock islands (warm earth-colored flat-bottom spheroids) against a sky-blue fog horizon, with a semi-transparent cloud plane below.
2. Open browser devtools Three.js inspector (or `window.__THREE__` if available) — traverse scene children and verify at least 3 objects have `userData.source === 'spline'`.
3. Devtools Network tab — `island-cottage.glb`, `island-tree.glb`, `island-arch.glb` all return 200 responses.
4. Existing WorldPostPanel behavior: navigate to `/world/sample` — `<Html>` overlay with title/excerpt still appears as before (WorldScene postOverlay unchanged).

## Technical direction

### 1. Stub GLB file creation
Executor must create minimal valid GLTF binary files. The simplest approach is a 20-byte valid GLB magic:

Use Node.js in a build script to write valid minimal GLBs, or use `drei`'s `<Box>` geometry with `useRef` and inject `userData` directly — avoiding `useGLTF` for the stubs.

**Preferred for Phase 3:** Create the 3 GLB files as minimal valid binaries using this Node script (run once):
```bash
node -e "
const fs = require('fs');
// Minimal valid GLB: magic + version + length + JSON chunk header + minimal JSON
// GLB spec: magic(4) + version(4) + length(4) + chunkLength(4) + chunkType(4) + chunkData
const json = JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{}}]}]});
const jsonBytes = Buffer.from(json, 'utf8');
const padding = (4 - (jsonBytes.length % 4)) % 4;
const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc(padding, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0); // magic 'glTF'
header.writeUInt32LE(2, 4); // version 2
header.writeUInt32LE(12 + 8 + paddedJson.length, 8); // total length
const chunkHeader = Buffer.alloc(8);
chunkHeader.writeUInt32LE(paddedJson.length, 0);
chunkHeader.writeUInt32LE(0x4E4F534A, 4); // chunk type JSON
const glb = Buffer.concat([header, chunkHeader, paddedJson]);
['island-cottage','island-tree','island-arch'].forEach(name => {
  fs.mkdirSync('public/assets/raw', {recursive:true});
  fs.writeFileSync(\`public/assets/raw/\${name}.glb\`, glb);
  console.log('wrote', \`public/assets/raw/\${name}.glb\`, glb.length, 'bytes');
});
"
```
Run this from the project root (`/Users/min-kyungwook/Desktop/dev/webbuild`) before implementing the React components. Files must be in `public/assets/raw/` (served at `/assets/raw/`) — not `assets/raw/` at the project root.

### 2. `components/world/FloatingIsland.tsx` (new file)
```ts
'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

interface FloatingIslandProps {
  id: string
  position: [number, number, number]
  scale: [number, number, number]
  seed: number
}

export default function FloatingIsland({ id, position, scale, seed }: FloatingIslandProps) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 12, 8)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      // Flatten bottom half to create island silhouette
      if (y < 0) pos.setY(i, y * 0.35)
      // Sine wave deformation for irregular top surface
      const wave = Math.sin(pos.getX(i) * seed + pos.getZ(i) * seed * 0.7) * 0.25
      pos.setY(i, pos.getY(i) + wave)
    }
    g.computeVertexNormals()
    return g
  }, [seed])

  return (
    <mesh geometry={geo} position={position} scale={scale} name={id}>
      <meshStandardMaterial color="#c4a882" roughness={0.9} metalness={0.05} />
    </mesh>
  )
}
```

### 3. `components/world/SplineIslandProp.tsx` (new file)
```ts
'use client'

import { useGLTF } from '@react-three/drei'
import { useMemo, useEffect } from 'react'
import type * as THREE from 'three'

interface SplineIslandPropProps {
  path: string
  position: [number, number, number]
  scale?: [number, number, number]
  name: string
}

export default function SplineIslandProp({ path, position, scale = [1, 1, 1], name }: SplineIslandPropProps) {
  const { scene } = useGLTF(path)
  // Clone so multiple instances do not share the same scene graph
  const clone = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    clone.traverse((obj: THREE.Object3D) => {
      obj.userData.source = 'spline'
    })
  }, [clone])

  return <primitive object={clone} position={position} scale={scale} name={name} />
}

// Preload at module evaluation time — avoids waterfall on first render
useGLTF.preload('/assets/raw/island-cottage.glb')
useGLTF.preload('/assets/raw/island-tree.glb')
useGLTF.preload('/assets/raw/island-arch.glb')
```

### 4. `components/world/ArchipelagoScene.tsx` (new file)

Island positions and scales match the Key Decisions:
```
ISLANDS = [
  { id: 'home-island',   position: [0, 0, 0],    scale: [4, 1.5, 4]  },
  { id: 'sample-island', position: [-8, -1, 0],  scale: [3, 1.2, 3]  },
  { id: 'study-island',  position: [8, -2, 0],   scale: [2.5, 1, 2.5] },
]
```

Spline prop positions: place cottage on home-island top (+1 y offset), tree on sample-island (+0.8 y), arch between sample and study islands.

```ts
'use client'

import FloatingIsland from './FloatingIsland'
import SplineIslandProp from './SplineIslandProp'

export default function ArchipelagoScene() {
  return (
    <>
      {/* Sky atmosphere */}
      <fog attach="fog" args={['#a8d4f5', 20, 80]} />
      <color attach="background" args={['#a8d4f5']} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow={false}
        color="#fff8e8"
      />

      {/* Cloud sea plane */}
      <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color="#f0f4ff"
          transparent
          opacity={0.72}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Floating islands */}
      <FloatingIsland id="home-island"   position={[0,   0,   0]}  scale={[4,   1.5, 4]}   seed={2.3} />
      <FloatingIsland id="sample-island" position={[-8, -1,   0]}  scale={[3,   1.2, 3]}   seed={3.7} />
      <FloatingIsland id="study-island"  position={[8,  -2,   0]}  scale={[2.5, 1,   2.5]} seed={5.1} />

      {/* Spline placeholder props — userData.source = 'spline' tagged in SplineIslandProp */}
      <SplineIslandProp
        path="/assets/raw/island-cottage.glb"
        position={[0, 1.8, 0]}
        scale={[0.6, 0.6, 0.6]}
        name="spline-cottage"
      />
      <SplineIslandProp
        path="/assets/raw/island-tree.glb"
        position={[-8, 0.6, 0]}
        scale={[0.5, 0.5, 0.5]}
        name="spline-tree"
      />
      <SplineIslandProp
        path="/assets/raw/island-arch.glb"
        position={[4, 1.0, -2]}
        scale={[0.7, 0.7, 0.7]}
        name="spline-arch"
      />
    </>
  )
}
```

### 5. `components/world/WorldScene.tsx` modification
Add `<ArchipelagoScene />` import and render. Keep `postOverlay` Html block exactly as-is:

```ts
'use client'

import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useRef } from 'react'
import { markWorldFirstFrame } from '@/lib/perf'
import { useWorldStore } from '@/lib/worldStore'
import ArchipelagoScene from './ArchipelagoScene'

export default function WorldScene() {
  const hasMarked = useRef(false)
  const postOverlay = useWorldStore((s) => s.postOverlay)

  useFrame(() => {
    if (!hasMarked.current) {
      hasMarked.current = true
      markWorldFirstFrame()
    }
  })

  return (
    <>
      <ArchipelagoScene />
      {postOverlay && (
        <Html center distanceFactor={10} position={[0, 1, -3]}>
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              padding: '1rem',
              color: 'white',
              pointerEvents: 'none',
              minWidth: '200px',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem' }}>
              {postOverlay.title}
            </h2>
            <p style={{ margin: 0 }}>{postOverlay.excerpt}</p>
          </div>
        </Html>
      )}
    </>
  )
}
```

### 6. Assets path note
The GLB files are placed in `assets/raw/` (project-level directory), and served via Next.js `public/` directory symlink or by placing them under `public/assets/raw/`. **Correct path:** place files at `public/assets/raw/island-cottage.glb` so they are served at `/assets/raw/island-cottage.glb`. Adjust the node script path accordingly: `fs.mkdirSync('public/assets/raw', {recursive:true})` and output to `public/assets/raw/${name}.glb`. Update `useGLTF.preload` and `SplineIslandProp` `path` props to `/assets/raw/island-cottage.glb` (same as above — already correct).

For the done_when file check, `ls public/assets/raw/island-cottage.glb` should exit 0.

## Dependencies

- No other plans — this is Wave 1, no deps
- Relies on existing `@react-three/drei` (useGLTF — already in package.json)
- Relies on existing `three` (THREE.SphereGeometry, THREE.BufferAttribute — already in package.json)
- Does NOT require gsap/lenis (installed in Plan 03-01 but not needed here)
- WorldCanvas must not be modified — Canvas gl factory pattern must stay as-is

## Out of scope

- Camera choreography (Plan 03-03)
- GSAP animations (Plan 03-03)
- ScrollTrigger flythrough (Plan 03-03)
- Real Spline-exported GLBs with colors/textures (Phase 5/8 INFRA-01)
- TSL shaders (Phase 5 VIS-01)
- Instanced mesh optimization (Phase 8 PERF-03)

---

## done_when

- [ ] `pnpm run build` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] `ls public/assets/raw/island-cottage.glb` exits 0
- [ ] `ls public/assets/raw/island-tree.glb` exits 0
- [ ] `ls public/assets/raw/island-arch.glb` exits 0
- [ ] `grep "userData.source = 'spline'" components/world/SplineIslandProp.tsx` returns match
- [ ] `grep "useGLTF.preload" components/world/SplineIslandProp.tsx` returns 3 matches
- [ ] `grep "ArchipelagoScene" components/world/WorldScene.tsx` returns match
- [ ] `grep "FloatingIsland" components/world/ArchipelagoScene.tsx` returns 3 matches
- [ ] `grep "SplineIslandProp" components/world/ArchipelagoScene.tsx` returns 3 matches
- [ ] `grep "fog" components/world/ArchipelagoScene.tsx` returns match
- [ ] `grep "planeGeometry" components/world/ArchipelagoScene.tsx` returns match (cloud plane)
- [ ] Browser: visiting `/world` shows 3 floating island shapes (warm earth tone) on sky-blue background with cloud plane below
- [ ] Browser: devtools Network tab shows 200 responses for `/assets/raw/island-cottage.glb`, `/assets/raw/island-tree.glb`, `/assets/raw/island-arch.glb`
- [ ] Browser: existing `/world/sample` postOverlay (Html title/excerpt) still renders correctly (regression check)
