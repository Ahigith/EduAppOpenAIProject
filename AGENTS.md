<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md — Young Entrepreneurs (OpenAI Build Week 2026)

This file is read by every Codex agent session. Follow it exactly. When these rules
conflict with a task prompt, ask the human instead of guessing.

## What we are building

A gamified entrepreneurship learning web app for grade 11-12 students, structured
as a TOPIC GRID (like a Duolingo skill tree):

- 7 TOPICS (columns): selling, pitching, business_model, industry, news,
  product_pipeline, finance
- 2 TIERS (rows): Tier 1 = broad, playful introduction to each topic.
  Tier 2 = harder, more holistic level on the same topic.
- One fictional company — "ChocoNation", a young Indian chocolate brand — runs as
  the case-study thread through ALL levels, so students learn each concept
  against a realistic, continuous story.

Every level uses ONE of 5 reusable game mechanics (see lib/schemas.ts):
1. narrative    — branching decision story; choices move visible metrics
                  (cash, customers, insight, etc.); AI writes a debrief after
                  each decision explaining what happened and why.
2. sort_buckets — drag/tap items into the right buckets (classify business-model
                  components; sort news headlines into opportunity/threat/noise;
                  sort money items into P&L buckets). Scored in CODE, no AI call.
3. sequence     — arrange shuffled steps into the right order (product pipeline
                  from idea to shelf). Scored in CODE, no AI call.
4. roleplay     — live conversation with an AI persona (investor pitch, customer
                  sale, cold call). Scored by the AI evaluator against a rubric.
5. builder      — free-text structured canvas (business model canvas, mini
                  financial model). Scored by the AI evaluator against a rubric.

Unlock rules: ALL Tier 1 levels are unlocked from the start (players roam
freely — this is the "open world" feel). A topic's Tier 2 unlocks when its
Tier 1 is completed. XP accumulates globally; badges per level.

The full 14-level grid lives in CONTENT_PLAN.md. Not all levels must exist for
the demo; the engine + whatever content files exist = the game.

## Tech stack (do not add to this without human approval)

- Next.js 14+ (App Router, TypeScript, strict mode)
- Tailwind CSS (no other UI libraries)
- Supabase (Postgres) via `@supabase/supabase-js`
- OpenAI SDK, model `gpt-5.6` (dev iterations may use the `AI_DEV_MODEL` env fallback)
- Zod for ALL runtime validation of AI responses and content files
- Deployed on Vercel. `npm run build` must always pass on main.

**Never install a new dependency.** If a task seems to need one, stop and report why.

## Repository layout and ownership

/app                → routes + UI                 (owner: Agent A — game engine)
/app/api            → API route handlers           (owner: Agent B — AI layer)
/lib/game           → progression, XP, unlock, deterministic scoring (Agent A)
/lib/ai             → OpenAI wrapper, prompts, evaluators (owner: Agent B)
/lib/schemas.ts     → shared contracts             (FROZEN — humans only)
/content            → level definition JSON files  (owner: Agent C — content)
/supabase           → SQL migrations               (humans only after Day 1)
CONTENT_PLAN.md     → the level grid + writing guidelines for Agent C

**Only edit files inside your assigned directory.** If your task requires touching
another module, stop and report what interface change you need.

## Hard rules

1. All AI calls go through `lib/ai/client.ts`. Never call the OpenAI SDK from a
   component or route directly.
2. Every AI response is requested as JSON and parsed with the matching Zod schema
   from `lib/schemas.ts`. On failure: one repair retry, then typed fallback.
   Never render unvalidated model text.
3. sort_buckets and sequence levels are scored deterministically in
   `lib/game/scoring.ts` using the authored `explain` strings as feedback —
   NO AI calls for these two mechanics. This is deliberate (cost + stability).
   Both produce a DeterministicResult so one results component serves both.
4. Every level lives in `/content/*.json` and must validate against
   `LevelDefinitionSchema` (schemaVersion 2). Game code never hardcodes content.
5. The demo path is sacred: sign in (anon) → topic-grid map →
   finance/business_model T1 (sort_buckets) → industry T1 (narrative, 2+
   decisions with AI debriefs) → pitching T1 (roleplay with Meera, scored) →
   XP + badges visible on map. Any change that breaks this path is reverted,
   not patched forward.
6. Content rules: fictional brands only (ChocoNation, never real names), no real
   people, age-appropriate for teens, Indian context (₹, kirana stores, school
   fairs, festivals), no financial-advice framing — always "in this game".
7. Metrics in narrative levels are generic per level (defined in the content
   file). The engine renders whatever the file defines; never hardcode metric
   names in components.
8. Keep responses fast: stream roleplay turns; cache debriefs per
   (levelId, nodeId, decisionId) in the attempts table.

## Database (5 tables, do not add more)

users(id, handle, created_at)
levels(id, slug, topic, tier, xp_reward, order_index)   -- seeded from /content
progress(user_id, level_id, status, xp_earned, updated_at)
attempts(id, user_id, level_id, payload jsonb, score jsonb, created_at)
transcripts(id, attempt_id, role, content, created_at)   -- roleplay turns

## Verification before you finish ANY task

- `npm run build` passes
- `npm run test` passes
- `npm run validate:content` passes (validates every /content file against Zod)
- If you changed UI: describe the manual click-path a human should verify

## Working style

- One feature per session. Do the checklist in the task prompt, nothing extra.
- No speculative abstractions, no refactors outside your task, no TODOs.
- After finishing, append one line to CODEX_LOG.md:
  `YYYY-MM-DD | agent | task | what Codex produced | what humans should review`

## Environment variables (never hardcode, never print)

OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, AI_MODEL=gpt-5.6, AI_DEV_MODEL
