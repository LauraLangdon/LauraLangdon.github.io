# Todo

## In progress

## Frontend / styling

- ~~Initials logo overlaps nav links on mobile~~ ✓ hidden on ≤600px
- ~~Featured/Recent section headings on landing page: pink in light mode but purple-ish in dark mode~~ ✓
- Custom JS tooltips (native title tooltips blocked by some browsers/extensions)
- ~~Center prose content on post pages~~ ✓
- ~~Style Abstract/Description as monospace uppercase accent headings~~ ✓
- Recover "Writing WebAssembly Code by Hand" from Wayback Machine (draft, snapshot: https://web.archive.org/web/20250121234529/https://blog.suborbital.dev/writing-webassembly-code-by-hand)

## Content / publishing

- Pull Ravelry projects into site feed
  - Set up Ravelry Pro account for API access: https://www.ravelry.com/businesses/new?plan_type=6
- Post comments (unified display from two sources):
  - Mastodon replies: fetch replies to Hachyderm posts (@LauraLangdon@hachyderm.io) via Mastodon API. Avoids creating a second Fediverse identity for the site; domain-independent so unaffected by .io → .com migration
  - giscus (GitHub Discussions): for readers without Fediverse accounts
  - Both streams rendered together in a single `<Comments />` component
- ~~Next/previous post links at the end of posts~~ ✓
- ~~Script to prompt for featured placement when creating new posts~~ ✓

## CI / quality

- ~~Audit entire site for tracker links; add CI check to catch any in future~~ ✓

## Infrastructure

- Set up ActivityPub

## Production readiness

- ~~DNS cutover (lauralangdon.io → staging server)~~ ✓ completed 2026-03-15
- ~~Update post image URLs from staging.lauralangdon.io to lauralangdon.io~~ ✓
- ~~Remove staging.lauralangdon.io from astro.config.mjs image domains~~ ✓
- Domain migration (lauralangdon.io → lauralangdon.com)
