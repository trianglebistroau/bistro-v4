# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bistro v3 is a Next.js 16 (app-router) web application that serves as a TikTok companion app. It includes an onboarding flow that collects user preferences and stores data in localStorage.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run Biome linter
pnpm format           # Format code with Biome
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.4 with React Compiler enabled (`reactCompiler: true`)
- **Styling**: Tailwind CSS v4
- **Linting**: Biome (replaces ESLint + Prettier)
- **Animation**: GSAP
- **3D Graphics**: Three.js (custom shaders for onboarding background)

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (Server Component)
│   ├── page.tsx            # Home page - gates to /onboarding until completion
│   └── onboarding/
│       ├── page.tsx        # Onboarding page wrapper (Server Component)
│       └── reset/
│           └── page.tsx    # Reset onboarding (dev only, clears localStorage)
├── components/
│   └── onboarding/
│       ├── OnboardingFlow.tsx      # Main 6-screen onboarding wizard (812 lines)
│       ├── OnboardingPageClient.tsx # Gate logic wrapper
│       └── t3-empty/               # Three.js background animation
│           ├── backgroundCanvas.tsx
│           ├── BackgroundSketch.ts
│           └── *.glsl              # Custom shaders
└── utils/
    └── onboarding.ts       # localStorage utilities + types
```

### Key Patterns

**Client/Server Boundaries**
- Pages in `app/` are Server Components by default
- Client Components use `"use client"` directive when they need:
  - `useState`, `useEffect`, or other hooks
  - Browser APIs (`window`, `localStorage`)
  - Event handlers
- Pattern: Server page imports Client wrapper (see `onboarding/page.tsx`)

**Data Persistence**
- All user data stored in localStorage (no backend API)
- Keys: `bistro_onboarding_data`, `bistro_onboarding_done`, `bistro_tutorial_data`
- No schema versioning currently (identified risk in CODE_SMELL_ANALYSIS.md)

**Navigation Flow**
- `/` → Checks onboarding completion → Redirects to `/onboarding` if incomplete
- `/onboarding` → 6-screen wizard → Saves to localStorage → Returns to `/`
- `/onboarding/reset` → Clears localStorage → Redirects to `/onboarding` (dev only)

### Configuration Notes

**next.config.ts**: React Compiler enabled for automatic memoization
**biome.json**: Next.js and React recommended rules enabled
**tsconfig.json**: Path alias `@/*` → `src/*`

## Important Files

- `CODE_SMELL_ANALYSIS.md` - Code review with identified issues and recommendations
- `AGENTS.md` - Contains Next.js 16 breaking changes notice
- `README.md` - Development setup and migration status from WXT → Next.js

## Common Tasks

**Replay onboarding in dev**: Visit `/onboarding/reset` to clear state and restart

**Add new onboarding screen**: Edit `OnboardingFlow.tsx` - currently monolithic (812 lines), refactor planned

**Shader changes**: Raw GLSL in `.glsl` files, imported via TypeScript modules in `.ts` wrappers
