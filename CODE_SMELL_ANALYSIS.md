# Code Smell Analysis - Bistro v3

**Date**: 2026-05-02
**Scope**: React/Next.js codebase review using Vercel best practices

---

## Executive Summary

This is a small, focused codebase (7 React components, ~1,000 lines total) with a clear purpose: onboarding flow for a TikTok companion app. The architecture is generally sound, but several code smells and missing optimizations were identified.

**Key Findings**:
- 1 critical code smell (monolithic component)
- 4 medium-priority issues (state management, data persistence, bundle optimization)
- 2 low-priority improvements (type safety, animation patterns)

**Recommended Libraries**:
| Priority | Library | Purpose | Impact |
|----------|---------|---------|--------|
| HIGH | `zod` | Runtime validation for localStorage data | Prevents corruption bugs |
| HIGH | `zustand` or `jotai` | Centralized state management | Reduces prop drilling, simplifies logic |
| MEDIUM | `@react-three/fiber` + `@react-three/drei` | React-friendly Three.js | Better integration, less boilerplate |
| MEDIUM | `swr` or `@tanstack/react-query` | Data fetching/caching (future) | Ready for API migration |
| LOW | `framer-motion` | Declarative animations | Replace imperative GSAP where appropriate |
| LOW | `next/font` | Font optimization | Replace manual Google Fonts loading |

---

## Detailed Code Smells

### 1. CRITICAL: Monolithic Component (`OnboardingFlow.tsx`)

**Location**: `src/components/onboarding/OnboardingFlow.tsx`
**Lines**: 812 lines
**Vercel Rule**: `rerender-memo` - Extract expensive work into memoized components

**Problem**:
The `OnboardingFlow` component contains:
- 6 different screens rendered conditionally
- Complex state management (8 state variables)
- Embedded helper components (`Blob`, `MascotAvatar`, `Cta`, `BackCta`, `LoadingScreen`)
- Multiple `useEffect` hooks with overlapping concerns
- Keyboard event handling logic
- Navigation logic embedded in JSX

**Why it matters**:
- Hard to test individual screens
- Every screen change re-renders the entire component tree
- Difficult to onboard new developers
- Single file becomes a merge conflict magnet

**Fix**:
```tsx
// Extract each screen into its own component
// src/components/onboarding/screens/NameScreen.tsx
// src/components/onboarding/screens/ContentScreen.tsx
// etc.

// Use a state machine or router pattern
const screens: Record<Screen, React.ComponentType<ScreenProps>> = {
  name: NameScreen,
  content: ContentScreen,
  character: CharacterScreen,
  pain: PainScreen,
  loading: LoadingScreen,
  summary: SummaryScreen,
};

// Render current screen only
const CurrentScreen = screens[screen];
return <CurrentScreen {...props} />;
```

**Recommended Library**: `xstate` for state machine management if the flow becomes more complex.

---

### 2. HIGH: localStorage-Only Data Persistence

**Location**: `src/utils/onboarding.ts`
**Vercel Rule**: `client-localstorage-schema` - Version and minimize localStorage data

**Problem**:
```ts
// No schema versioning
localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(data));

// Manual parsing with try/catch
const parsed = JSON.parse(stored) as Partial<OnboardingData>;
```

**Risks**:
- No migration path when schema changes
- Silent failures on parse errors (returns defaults)
- No validation of incoming data shape
- Vulnerable to XSS if any user input is stored

**Fix with `zod`**:
```ts
import { z } from 'zod';

const OnboardingSchema = z.object({
  name: z.string().min(1).max(50),
  dataLane: z.array(z.string()).min(1),
  challenge: z.string().min(1).max(500),
  character: z.enum(['chef', 'scholar', 'explorer', 'creator', 'traveler']).optional(),
});

type OnboardingData = z.infer<typeof OnboardingSchema>;

const SCHEMA_VERSION = 1;

export function saveOnboardingData(data: OnboardingData) {
  const versioned = { ...data, __schemaVersion: SCHEMA_VERSION };
  localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(versioned));
}

export function getInitialOnboardingData(): OnboardingData {
  const stored = localStorage.getItem(ONBOARDING_DATA_KEY);
  if (!stored) return { name: '', dataLane: [], challenge: '' };
  
  try {
    const parsed = JSON.parse(stored);
    // Handle schema migrations
    if (parsed.__schemaVersion !== SCHEMA_VERSION) {
      return migrateSchema(parsed);
    }
    return OnboardingSchema.parse(parsed);
  } catch {
    return { name: '', dataLane: [], challenge: '' };
  }
}
```

---

### 3. MEDIUM: Scattered State Management

**Location**: `OnboardingFlow.tsx` (lines 178-189)
**Vercel Rule**: `rerender-derived-state` - Subscribe to derived booleans, not raw values

**Problem**:
```tsx
const [name, setName] = useState(saved.name || "");
const [contentTypes, setContentTypes] = useState<string[]>(saved.dataLane ?? []);
const [character, setCharacter] = useState<number | null>(null);
const [painPoints, setPainPoints] = useState(saved.challenge || "");
const [othersExpanded, setOthersExpanded] = useState(false);
const [othersText, setOthersText] = useState("");
```

State is:
- Spread across multiple `useState` calls
- Synced to localStorage in multiple places
- Hard to derive "is step complete" status

**Fix with `zustand`**:
```tsx
// src/store/onboardingStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  name: string;
  contentTypes: string[];
  character: number | null;
  painPoints: string;
  currentScreen: Screen;
  isComplete: boolean;
  
  // Actions
  setName: (name: string) => void;
  addContentType: (type: string) => void;
  removeContentType: (type: string) => void;
  setCharacter: (index: number | null) => void;
  setPainPoints: (points: string) => void;
  advance: () => void;
  retreat: () => void;
  markComplete: () => void;
  
  // Derived
  canAdvance: boolean;
  canRetreat: boolean;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      name: '',
      contentTypes: [],
      character: null,
      painPoints: '',
      currentScreen: 'name',
      isComplete: false,
      
      setName: (name) => set({ name }),
      addContentType: (type) => set((s) => ({ 
        contentTypes: [...s.contentTypes, type] 
      })),
      removeContentType: (type) => set((s) => ({ 
        contentTypes: s.contentTypes.filter(t => t !== type) 
      })),
      setCharacter: (index) => set({ character: index }),
      setPainPoints: (points) => set({ painPoints: points }),
      
      advance: () => {
        const order: Screen[] = ['name', 'content', 'character', 'pain', 'loading', 'summary'];
        const idx = order.indexOf(get().currentScreen);
        if (idx < order.length - 1) {
          set({ currentScreen: order[idx + 1] });
        }
      },
      retreat: () => { /* similar logic */ },
      markComplete: () => set({ isComplete: true }),
      
      get canAdvance() {
        const { currentScreen, name, contentTypes, character, painPoints } = get();
        switch (currentScreen) {
          case 'name': return name.trim().length > 0;
          case 'content': return contentTypes.length > 0;
          case 'character': return character !== null;
          case 'pain': return painPoints.trim().length > 0;
          default: return true;
        }
      },
      get canRetreat() {
        return !['name', 'loading'].includes(get().currentScreen);
      },
    }),
    {
      name: 'bistro-onboarding',
      partialize: (state) => ({
        name: state.name,
        contentTypes: state.contentTypes,
        character: state.character,
        painPoints: state.painPoints,
        isComplete: state.isComplete,
      }),
    }
  )
);
```

**Benefits**:
- Single source of truth
- Automatic persistence
- Derived state computed once
- Easier to test and debug

---

### 4. MEDIUM: No Bundle Optimization for Three.js

**Location**: `src/components/onboarding/t3-empty/backgroundCanvas.tsx`
**Vercel Rule**: `bundle-dynamic-imports` - Use next/dynamic for heavy components

**Problem**:
Three.js (184KB gzipped) is loaded even when:
- User has completed onboarding
- User is on the main page
- The background is purely decorative

**Fix**:
```tsx
// Lazy load the background canvas
import dynamic from 'next/dynamic';

const BackgroundCanvas = dynamic(
  () => import('./t3-empty/backgroundCanvas'),
  { 
    ssr: false, // Three.js doesn't SSR well anyway
    loading: () => <div className="bg-gradient-to-br from-indigo-50 to-purple-50" />
  }
);

// Only render when needed
{!isOnboardingDone() && <BackgroundCanvas />}
```

**Better Fix with `@react-three/fiber`**:
```tsx
// Much cleaner API, better React integration
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function BackgroundCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
      <ambientLight intensity={0.5} />
      <BackgroundSketch />
    </Canvas>
  );
}
```

---

### 5. LOW: Imperative Animation with GSAP

**Location**: `OnboardingFlow.tsx` (lines 192-200, 122-145)
**Vercel Rule**: `rerender-transitions` - Use startTransition for non-urgent updates

**Problem**:
```tsx
// Imperative GSAP animations tied to state changes
useEffect(() => {
  if (!cardRef.current) return;
  gsap.fromTo(
    cardRef.current,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.42, ease: "power2.out" },
  );
}, [screen]);
```

**Why consider alternatives**:
- GSAP is external dependency (33KB gzipped)
- Imperative animations don't play nice with React's rendering
- Harder to test and reason about
- Can't leverage React Compiler optimizations

**Fix with `framer-motion`**:
```tsx
import { motion, AnimatePresence } from 'framer-motion';

function NameScreen() {
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative w-full max-w-3xl"
    >
      {/* content */}
    </motion.div>
  );
}

// For screen transitions
<AnimatePresence mode="wait">
  <motion.div
    key={screen}
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -18 }}
    transition={{ duration: 0.3 }}
  >
    {renderCurrentScreen()}
  </motion.div>
</AnimatePresence>
```

**Note**: With React Compiler already enabled, some of these animations might be optimizable without changes. Keep GSAP if the team is familiar with it.

---

### 6. LOW: Manual Font Loading

**Location**: `src/app/layout.tsx` (not shown, but referenced in globals.css)
**Vercel Rule**: `rendering-resource-hints` - Use React DOM resource hints for preloading

**Problem**:
Manual Google Fonts loading via CSS:
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
```

**Fix with `next/font`**:
```tsx
// src/app/layout.tsx
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-poppins">{children}</body>
    </html>
  );
}
```

**Benefits**:
- Automatic optimization (subset, display swap)
- Self-hosted fonts (no external request)
- Type-safe font weights
- Better Core Web Vitals

---

## Missing Best Practices

### 7. No Error Boundary

**Vercel Rule**: `advanced-init-once` - Initialize app once per app load

**Add**:
```tsx
// src/components/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-8 text-center">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### 8. No Loading States for Async Operations

**Location**: `OnboardingFlow.tsx` (loading screen exists but is hardcoded)
**Vercel Rule**: `async-suspense-boundaries` - Use Suspense to stream content

**Current approach**:
```tsx
{screen === "loading" && (
  <LoadingScreen onDone={() => setScreen("summary")} avatarSrc={characterSrc} />
)}
```

**Better approach with Suspense**:
```tsx
import { Suspense, useTransition } from 'react';

function OnboardingFlow() {
  const [isPending, startTransition] = useTransition();

  const handleFinish = async () => {
    startTransition(async () => {
      await saveToAPI(data); // Future: migrate from localStorage
      onComplete();
    });
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {/* screens */}
    </Suspense>
  );
}
```

---

## Recommendations Summary

### Immediate (Before Next Release)

| Issue | Effort | Impact |
|-------|--------|--------|
| Add `zod` validation for localStorage | 2 hours | Prevents data corruption bugs |
| Extract screen components from `OnboardingFlow.tsx` | 4 hours | Improves maintainability |

### Short-term (Next Sprint)

| Issue | Effort | Impact |
|-------|--------|--------|
| Migrate to `zustand` for state management | 6 hours | Simplifies logic, reduces bugs |
| Add Error Boundary | 1 hour | Better error handling |
| Lazy load Three.js background | 1 hour | Reduces initial bundle |

### Nice-to-have

| Issue | Effort | Impact |
|-------|--------|--------|
| Replace GSAP with `framer-motion` | 8 hours | Better React integration |
| Migrate to `@react-three/fiber` | 12 hours | Cleaner Three.js code |
| Use `next/font` for fonts | 1 hour | Marginal performance gain |
| Add `swr` for future API calls | 4 hours | Future-proofing |

---

## Library Installation Commands

```bash
# High priority
npm install zod
npm install zustand

# Medium priority
npm install @react-three/fiber @react-three/drei
npm install swr

# Low priority
npm install framer-motion
```

---

## Files Requiring Changes

| File | Changes Needed |
|------|----------------|
| `src/components/onboarding/OnboardingFlow.tsx` | Split into screen components |
| `src/utils/onboarding.ts` | Add zod validation, schema versioning |
| `src/store/onboardingStore.ts` | NEW: Create zustand store |
| `src/components/onboarding/t3-empty/backgroundCanvas.tsx` | Add dynamic import |
| `src/app/layout.tsx` | Add next/font configuration |
| `src/components/ErrorBoundary.tsx` | NEW: Add error boundary |

---

## Conclusion

This codebase is in good shape overall - the main issues are around component organization and data validation. The monolithic `OnboardingFlow.tsx` is the highest priority refactor, followed by adding runtime validation with `zod` to prevent localStorage-related bugs.

The React Compiler is already enabled, which will automatically optimize many re-render issues. Focus on the structural improvements first, then consider the animation/Three.js modernization if the team wants better long-term maintainability.
