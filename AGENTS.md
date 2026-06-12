<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TRAIN vs BEAR

Turn-based web game where player (train or bear) upgrades between rounds, then a physics simulation resolves the encounter. Runs on Next.js 16 + React 19 + Tailwind v4 + Vercel AI SDK v6.

## Stack
- **Framework**: Next.js 16.2 (Turbopack default, `cacheComponents: true`)
- **Runtime**: React 19.2 (`use()` for async in client components)
- **Styling**: Tailwind v4 (CSS-first config, `@theme` directive)
- **AI**: `ai` SDK v6 (Vercel AI Gateway — bear plan generation, custom upgrade validation)
- **Types**: TypeScript 5

## Key Next.js 16 rules
- `params`/`searchParams` are **Promises** — must `await` in server components, `use()` in client components
- `cookies()` / `headers()` are **async** — always await
- `middleware.ts` → `proxy.ts`, export name → `proxy`, edge runtime not supported
- `revalidateTag` needs 2nd arg (cacheLife profile); use `updateTag` for immediate in server actions
- `'use client'` / `'use server'` / `'use cache'` directives
- `next lint` removed — use ESLint directly
- Tailwind v4: no `tailwind.config.ts`, use `@theme` in CSS, class-based dark mode with `dark:` prefix

## Architecture
```
lib/
  types.ts    — All game types (TrainStats, TrainTier, Mod, BearUnitSpec, SimResult, GameState, Phase...)
  catalog.ts  — Game data (trains, mods, bear units, balance constants, round formulas)
  simulate.ts — Physics engine (NOT YET BUILT — next priority)
  state.ts    — Game state machine (NOT YET BUILT)
  ai.ts       — AI integration via Vercel AI SDK (NOT YET BUILT)
app/
  page.tsx    — Entry point, game shell
  layout.tsx  — Root layout
  globals.css — Tailwind v4 setup
```

## Game flow
1. TITLE → choose train or bear side
2. SHOP → buy trains/mods (or bear units/upgrades) with coins + upgrade points
3. INTEL → AI generates opponent strategy, shows odds
4. RUN → simulation plays out with animated frames + event log
5. RESULT → win/loss, rewards, hearts update
6. VICTORY (all 7 rounds won) or GAMEOVER (0 hearts)

## Simulation
- Discrete timestep (~0.1s), each tick: accelerate → move → check obstacles → apply damage/regen
- Obstacles have 2 kinds: blockers (point objects with mass/damage) and zones (stretches with DPS/stickiness)
- Train stats: topSpeed, accel, maxHp, armor (0-0.8 dmg reduction), plow (tons/sec clearing), grip (anti-stickiness), heatShield, energyWeapon (pre-clears obstacles), regen
- Mod flags: droneJammer, mineSweeper, acidProof, bearWhisperer, gooseRepellent — checked per-obstacle as bypasses

## Commands
```bash
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm run lint   # ESLint
npx next typegen  # Generate type helpers for pages
```
