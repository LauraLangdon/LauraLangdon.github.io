# Todo

## In progress
- Email subscribe: verify nginx proxies `/members/api/` to Ghost, enable free member signup in Ghost admin

## Frontend / styling
- Post type tags/cards (stream, talk, post, etc.) like Ghost Pro had
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
- Automated backups: mysqldump + tar + Backblaze (deferred to production)

## Production readiness
- DNS cutover (lauralangdon.io → staging server)
- Domain migration (lauralangdon.io → lauralangdon.com)
