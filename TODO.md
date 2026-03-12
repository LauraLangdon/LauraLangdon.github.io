# Todo

## In progress
- UI monospace font sizes — scattered across scoped component styles in each page/layout

## Frontend / styling
- Email subscribe button
- Post type tags/cards (stream, talk, post, etc.) like Ghost Pro had
- Dates on featured post cards should line up with each other regardless of title length
- Copy button and syntax highlighting for code blocks
- Use pinkish themes for code blocks (currently github-light/github-dark)
- Light mode has no syntax highlighting (Shiki dual-theme CSS not applying)
- Deploy pending changes (blog post centering, image width fix, new fonts, PT Mono for code)

## Content / publishing
- Markdown images with complex alt text (e.g. alt text containing `[[brackets]]`) render as literal Markdown syntax — fix needed in `pull.mjs` or `publish.mjs`
- Pull Ravelry projects into site feed
  - Set up Ravelry Pro account for API access: https://www.ravelry.com/businesses/new?plan_type=6

## CI / quality
- RSS feed validator (e.g. W3C Feed Validation Service)

## Infrastructure
- Set up ActivityPub
- Ghost webhook to trigger Astro rebuild on content change
- Import `routes.yaml` / `redirects.yaml` to staging (low priority, for redirect preservation)
- Automated backups: mysqldump + tar + Backblaze (deferred to production)

## Production readiness
- DNS cutover (lauralangdon.io → staging server)
- Domain migration (lauralangdon.io → lauralangdon.com)
