# CONTENT_PLAN.md — The Level Grid

Read by Agent C (content) and humans. Every level is a JSON file in /content
validating against LevelDefinitionSchema (schemaVersion 2). ChocoNation — a
young Indian chocolate brand — is the case thread through every level.

## The grid: 7 topics x 2 tiers

| Topic | Tier 1 (broad, playful intro) | Mechanic | Tier 2 (harder, holistic) | Mechanic |
|---|---|---|---|---|
| selling | "The School Fair Stall" — sell ChocoNation bars to a friendly customer | roleplay (customer, friendly) | "The Cold Call" — call a busy kirana chain owner, tough persona, hit 2-3 metrics | roleplay (buyer, tough) |
| pitching | "The Elevator Pitch" — pitch your own idea to a friendly investor | roleplay (investor, friendly) | "The Investor Meeting" — tougher investor, sharper objections, higher bar | roleplay (investor, tough) |
| business_model | "What Makes ChocoNation Tick?" — sort facts into business model components | sort_buckets | "Design Your Machine" — build a business model canvas for your own idea | builder |
| industry | "Know Your Battlefield" — scout the chocolate industry, size up competitors | narrative (metrics: cash, insight) | "The Price War" — a big brand attacks; navigate competitive response | narrative (metrics: cash, customers) |
| news | "The Founder's Newsfeed" — sort headlines into opportunity / threat / noise for ChocoNation | sort_buckets | "Breaking News" — live narrative where news events force decisions | narrative (metrics: cash, reputation) |
| product_pipeline | "From Idea to Shelf" — arrange the launch of a new flavour in order | sequence | "The Melting Point" — production + logistics crisis narrative (margins under pressure) | narrative (metrics: cash, stock) |
| finance | "Where Does the Money Go?" — sort ChocoNation's money items into revenue / direct costs / SG&A / not-P&L | sort_buckets | "Build the Model" — mini financial model for your own idea (revenue, direct costs, SG&A, EBITDA) | builder |

14 levels total. Demo minimum (the sacred path + neighbours): finance T1,
business_model T1, product_pipeline T1, industry T1, pitching T1. Everything
else is stretch content — the engine renders whatever files exist.

## Writing guidelines (apply to every file)

1. ChocoNation continuity: reference the same facts everywhere — almond bar,
   ₹18 cost to make, sold in kirana stores, founder is "you", city unnamed.
   New facts may be added but never contradict existing files.
2. India-real: ₹, kirana stores, school fairs, festivals (Diwali gifting =
   chocolate season), summer melting problem. No real brands, no real people.
3. Tier 1 = welcoming: shorter, friendlier personas (warmth: "friendly"),
   passPercent ~60-70, generous explain strings. Tier 2 = demanding: tougher
   personas, passPercent ~75-85, rubrics with higher thresholds.
4. explain strings (sort/sequence) are the ENTIRE feedback the player gets —
   write each as a mini-lesson: why the answer is what it is, in one or two
   sentences a 15-year-old enjoys reading. Never just "Correct!".
5. One concept per item/decision/criterion. Breadth across the grid, depth
   within a moment.
6. Every file must pass `npm run validate:content` before commit.
7. XP: Tier 1 levels 100-150, Tier 2 levels 200-300. estimatedMinutes honest.
8. Language: simple, warm, second person, zero jargon without inline meaning.