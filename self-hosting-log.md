# Self-Hosting Ghost: Setup Log

A running log of steps taken to migrate from Ghost(Pro) to a self-hosted Ghost instance on DigitalOcean. Intended as the basis for a blog post series.

---

## Motivation

- Want to author posts in an IDE using markdown/git rather than Ghost Admin
- Want to implement POSSE (Publish on Own Site, Syndicate Elsewhere) with full control over syndication to Mastodon, Bluesky, and others
- Want webmentions support
- Ghost(Pro)'s built-in ActivityPub is insufficient for this level of control
- Self-hosting gives full control over ActivityPub, webmentions, and syndication pipeline
- Keeping Ghost(Pro) live during migration for zero-downtime cutover

---

## Phase 1: VPS Setup

### Provider
- **DigitalOcean** Basic Droplet
- **OS:** Ubuntu 22.04 LTS x64
- **Size:** $6/month (1GB RAM, 1 vCPU, 25GB disk)
- **Region:** chosen based on proximity
- **Public IP:** 143.198.144.150

### SSH Key Setup
- Used 1Password SSH agent for secure key management (private key never written to disk)
- Generated Ed25519 key in 1Password (New Item → SSH Key → Generate New Key)
- 1Password configured SSH agent and updated `~/.ssh/config` automatically
- Added public key to DigitalOcean during droplet creation
- SSH connections authorized via Touch ID through 1Password

### DNS
- Added A record at Squarespace DNS: `staging.lauralangdon.io` → `143.198.144.150`

### First Login
```bash
ssh root@143.198.144.150
```

### System Updates
```bash
apt update && apt upgrade -y
```

### Install Prerequisites
```bash
apt install -y nginx mysql-server
```

---

## Phase 2: Node.js and Ghost CLI Installation

### First Node.js install attempt
Installed Node.js v20 via NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Create a dedicated Ghost user
Running Ghost as root is not recommended. Created a dedicated user:
```bash
adduser ghost-user
usermod -aG sudo ghost-user
```

### Create Ghost install directory
```bash
mkdir -p /var/www/ghost
chown ghost-user:ghost-user /var/www/ghost
chmod 775 /var/www/ghost
```

### Install Ghost CLI
```bash
npm install -g ghost-cli
```

### First Ghost install attempt
Switched to ghost-user and ran the installer:
```bash
su - ghost-user
cd /var/www/ghost
ghost install
```

This failed with:
```
Ghost v6.21.0 is not compatible with the current Node version.
Your node version is 20.20.1, but Ghost v6.21.0 requires ^22.13.1
```

Ghost 6 requires Node 22. Node 20 is what we installed — Ghost CLI's system check caught this.

### Upgrade Node.js to v22
Back as root:
```bash
exit
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

Note: the server has its own Node installation entirely separate from your local Mac's nvm-managed Node.

### Second Ghost install attempt
```bash
su - ghost-user
cd /var/www/ghost
ghost install
```

This ran successfully. The install takes a while on a $6 droplet (slow disk I/O, many npm dependencies). The SSH session dropped mid-install when the VPN was turned off — the install continued running on the server in the background. After reconnecting, the install had completed:

```
content/  versions/
```

These are the expected Ghost directory structure entries confirming a successful install.

### Note on SSH session stability
Dropping a VPN connection will drop your SSH session. For long-running server operations, use `tmux` to keep processes running independently of your SSH connection. TODO: set up tmux.

---

## Phase 3: Ghost Setup

### Transactional email: Mailgun
Ghost requires a mail provider for transactional email (magic links, subscriber notifications). Mailgun is the recommended provider.

**Mailgun signup issue:** Initial signup attempt was rejected — a known Mailgun anti-spam measure that can trigger for Google Workspace emails or certain network configurations. Resolved by disabling VPN before signing up.

**Alternatives if Mailgun continues to be problematic:** Postmark or SendGrid are both supported by Ghost and well-regarded for deliverability.

**DNS verification:** Mailgun requires adding DNS records to verify your sending domain (`lauralangdon.io`). These records are added in Squarespace DNS.

### MySQL status
After reconnecting post-VPN-drop, MySQL was still starting up. Check status with:
```bash
sudo systemctl status mysql
```
`Active: activating (start-pre)` means still starting. `Active: active (running)` means ready.

### OOM issue
MySQL was being killed by the Linux OOM (Out of Memory) killer — the server was running out of RAM. Fixed by adding a 1GB swap file:

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo systemctl start mysql
```

The last line of the `fstab` entry ensures the swap file persists across reboots.

### Secure MySQL
```bash
sudo mysql_secure_installation
```

Choices made:
- Validate password component: **No**
- Root password: skipped (socket authentication used by default)
- Remove anonymous users: **Yes**
- Disallow root login remotely: **Yes**
- Remove test database: **Yes**
- Reload privilege tables: **Yes**

Note: Ghost CLI will create its own MySQL user during setup — removing anonymous users does not affect this.

### Ghost setup
```bash
ghost setup
```

Prompts and responses:
- Blog URL: `https://staging.lauralangdon.io`
- MySQL hostname: `127.0.0.1` (default)
- MySQL username: `root`
- MySQL password: (blank — socket auth)
- Ghost database name: `ghost_staging`
- Set up Ghost MySQL user: accidentally answered No
- Set up Nginx: Yes
- Set up SSL: Yes
- SSL email: **typo made here** — entered domain instead of email address
- Set up Systemd: Yes
- Start Ghost: Yes

### Setup errors and fixes

**Error 1: MySQL auth failure**
Root uses socket authentication by default, not password auth. Ghost couldn't connect. Fixed by creating a dedicated MySQL user:

```sql
sudo mysql
CREATE USER 'ghost'@'localhost' IDENTIFIED BY '<password>';
GRANT ALL PRIVILEGES ON ghost_staging.* TO 'ghost'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Then configured Ghost to use this user:
```bash
ghost config --db mysql --dbhost 127.0.0.1 --dbuser ghost --dbname ghost_staging
ghost config set database.connection.password '<password>'
```

Password saved in 1Password.

**Error 2: SSL certificate failure**
Let's Encrypt rejected the SSL registration because the email field contained the domain name instead of a valid email address (typo during setup). Fixed by re-running SSL setup:

```bash
ghost setup ssl
```

### Ghost started successfully
```bash
ghost start
```

Admin interface available at: `https://staging.lauralangdon.io/ghost/`

---

## Phase 4: Headless Ghost + Astro Architecture

### Why Astro instead of a Ghost theme

Ghost themes are Handlebars-based. Rather than learning Handlebars, the plan is to use Astro as the frontend — a framework already familiar from prior work. This is a "headless Ghost" setup:

- **Ghost** runs on the server handling content management, the admin interface, ActivityPub, transactional email, subscriber management, and the Content API
- **Astro** is the public-facing frontend, fetching content from Ghost's Content API and rendering it
- **nginx** sits in front of both, routing requests appropriately

### Why self-hosting makes this work for ActivityPub

On Ghost(Pro), using Astro as a headless frontend creates a split-identity problem: Ghost's ActivityPub actor lives on Ghost's domain, while the Astro frontend lives on a different domain. Followers on Mastodon would be following a different domain than the one visitors see.

Self-hosting solves this because you control nginx. Ghost's ActivityPub endpoints (e.g. `/.well-known/webfinger`, `/activitypub/`) can be proxied through the main domain alongside the Astro frontend. Everything lives at `lauralangdon.io` — Ghost handles ActivityPub behind the scenes, Astro serves the public site, and nginx routes between them transparently.

### Revised setup sequence

1. Configure nginx routing for headless setup
2. Set up Mailgun for transactional email
3. Set up automated backups
4. Set up tmux for SSH session stability
5. Build Astro frontend
6. Import content from Ghost(Pro)
7. DNS cutover

---

## Phase 5: nginx Configuration

Ghost CLI generated two nginx config files automatically:

- `/etc/nginx/sites-enabled/staging.lauralangdon.io.conf` — HTTP (port 80)
- `/etc/nginx/sites-enabled/staging.lauralangdon.io-ssl.conf` — HTTPS (port 443)

Both configs proxy all traffic to Ghost running locally at `127.0.0.1:2368`, with two notable exceptions:

- `/.ghost/activitypub/*` — proxied to `https://ap.ghost.org` (Ghost's hosted ActivityPub service)
- `/.well-known/(webfinger|nodeinfo)` — also proxied to `https://ap.ghost.org`

**Important architectural note:** Ghost 6 uses a Ghost-hosted ActivityPub service (`ap.ghost.org`) rather than running ActivityPub locally on your server. This means even self-hosted Ghost 6 has ActivityPub partially managed by Ghost Inc. The self-hosting advantage is that you control nginx, so all ActivityPub endpoints still appear under your own domain — visitors and followers see `lauralangdon.io`, not `ap.ghost.org`.

When the Astro frontend is ready, the `location /` block will be updated to serve Astro's static build, while Ghost admin, API, and ActivityPub routes remain proxied to Ghost.

SSL is handled by Let's Encrypt via acme.sh, configured automatically by Ghost CLI during setup.

### tmux

Installed tmux to keep server processes running through SSH disconnections (e.g. VPN drops):

```bash
apt install tmux
tmux new -s main
```

To reconnect after a dropped session:
```bash
ssh root@143.198.144.150
tmux attach -t main
```

Note: Warp terminal has limited tmux support. The warning "Seems like your completions are not working" is harmless — tmux works correctly, you just lose Warp's autocomplete inside the session.

---

## Phase 6: Mailgun / Email Setup

Ghost requires a transactional email provider for magic links and subscriber notifications. Mailgun is the recommended provider.

### Account setup
- Created Mailgun account (note: signup may be rejected for some email addresses or when on a VPN — disable VPN if signup fails)
- Added sending domain: `mg.lauralangdon.io` (using a subdomain rather than root domain is best practice)
- Used automatic sender security (Mailgun manages DKIM key rotation)
- Skipped MX records — email receiving is handled by Google Workspace

### DNS verification
Mailgun requires three DNS records for the sending domain:
- 1 TXT record for `mg.lauralangdon.io`
- 2 CNAME records: `pdk1._domainkey.mg.lauralangdon.io` and `pdk2._domainkey.mg.lauralangdon.io`

The TXT record was added successfully in Squarespace. However, Squarespace does not support CNAME records with underscores in the hostname — a known limitation.

### Moving DNS to Cloudflare
To resolve the underscore CNAME issue and gain more DNS flexibility (needed for future domain migration and other work), DNS management for `lauralangdon.io` was moved from Squarespace to Cloudflare (free plan).

Cloudflare imported all existing DNS records automatically, including:
- A records for root domain (Ghost Pro) and staging subdomain (new server)
- MX records for Google Workspace email
- Existing TXT records (SPF, DKIM for Google, AT Protocol/Bluesky verification)

**Important:** The proxy (orange cloud) on the staging A record must be disabled (set to DNS only / grey cloud) to avoid Cloudflare interfering with the server's own SSL certificate.

Nameservers updated at Squarespace to point to Cloudflare. Old Google Domains nameservers (from Squarespace's acquisition of Google Domains) could not be removed through the Squarespace UI — Cloudflare will supersede them once propagation completes.

Propagation in progress — Cloudflare will send an email confirmation when active.

### Pending after Cloudflare activates
- Disable proxy on staging A record
- Add `pdk1._domainkey.mg` and `pdk2._domainkey.mg` CNAME records
- Verify sending domain in Mailgun
- Configure Ghost to use Mailgun SMTP

### Future: domain migration
Plan to migrate primary domain from `lauralangdon.io` to `lauralangdon.com` (registered at GoDaddy) before production cutover. `lauralangdon.io` will redirect to `lauralangdon.com`. Mailgun sending domain will be updated to `mg.lauralangdon.com` at that time.

---

## Phase 7: Backups

### Decision: skip automated Ghost CLI backups for now

After considerable troubleshooting, automated Ghost CLI backups proved difficult to set up reliably due to a user ownership split: `/var/www/ghost` is owned by `ghost-user` (the admin user who ran the installer), while `content/` is owned by the `ghost` system user (uid 998, which the systemd service runs as). Ghost CLI requires the current user to own both the working directory and the content folder, and also calls `sudo` internally for systemd operations — making non-interactive automation impractical without additional configuration.

**Decision:** Rely on DigitalOcean's automatic droplet backups and defer automated Ghost-specific backups until production. At that point, a `mysqldump` + `tar` of the content directory is the recommended approach — it bypasses Ghost CLI entirely, runs cleanly as root, and is straightforward to upload to Backblaze B2.

**Backblaze B2 bucket is ready:** `lauralangdon-ghost-backups` (endpoint: `https://s3.us-west-004.backblazeb2.com`). AWS CLI is installed and configured with a `backblaze` profile for both `ghost-user` and the `ghost` system user. Credentials are in 1Password.

---

## Phase 8: Astro Frontend

### Architecture

Ghost runs headless on port 2368. Astro is the public-facing frontend, fetching content from Ghost's Content API at build time (static site generation). nginx will serve Astro's static output for the main site while proxying Ghost admin, API, and ActivityPub routes to Ghost.

### Why not a Ghost theme

Ghost themes are Handlebars-based. Astro is already familiar, offers full design flexibility, and supports the IndieWeb features planned for the future: webmentions, Mastodon/Bluesky comment syndication, Twitch/YouTube stream embeds, and ActivityPub integration.

### Planned IndieWeb features

- **Ghost ActivityPub**: Ghost 6 federates posts to the fediverse automatically via ap.ghost.org. Self-hosting means all ActivityPub endpoints appear under the primary domain.
- **Webmentions**: webmention.io will collect mentions from Mastodon, Bluesky (via brid.gy), and other IndieWeb sources. Replies to federated posts will appear as comments on the site.
- **Bluesky/AT Protocol**: brid.gy bridges Bluesky replies to webmentions.
- **Social streams**: Twitch and YouTube embed support planned.

### Setup

Created Astro project using the blog template:

```bash
cd /Users/lauralangdon/Repos/website
npm create astro@latest frontend
```

Installed Ghost Content API client:

```bash
cd frontend && npm install @tryghost/content-api
```

Created a custom integration in Ghost Admin (Settings → Integrations → Add custom integration → "Astro Frontend") to obtain a Content API key.

Credentials stored in `frontend/.env`:

```
PUBLIC_GHOST_URL=https://staging.lauralangdon.io
PUBLIC_GHOST_CONTENT_API_KEY=<key>
```

### Ghost API client

`src/lib/ghost.ts` wraps the Ghost Content API:

```typescript
import GhostContentAPI from "@tryghost/content-api";

const api = new GhostContentAPI({
  url: import.meta.env.PUBLIC_GHOST_URL,
  key: import.meta.env.PUBLIC_GHOST_CONTENT_API_KEY,
  version: "v5.0",
});

export async function getPosts() {
  return api.posts.browse({ limit: "all" });
}

export async function getPost(slug: string) {
  return api.posts.read({ slug }, { formats: ["html"] });
}
```

### Pages updated

- `src/pages/blog/index.astro` — fetches all posts from Ghost, renders list
- `src/pages/blog/[...slug].astro` — fetches individual post by slug, renders Ghost HTML with `set:html`
- `src/layouts/BlogPost.astro` — updated Props type to accept Ghost field names (`published_at`, `feature_image`, etc.) instead of Astro content collection types
- `src/consts.ts` — updated `SITE_TITLE` and `SITE_DESCRIPTION`

Ghost's `feature_image` is a URL string, not a local asset, so Astro's `<Image>` component is replaced with a plain `<img>` tag.

### Design system

Color palette derived from custom Warp terminal themes (`dark-pinkish.yaml` and `light-pinkish.yaml` in `~/repos/dotfiles/warp/themes/`). Light/dark mode via `prefers-color-scheme`. CSS custom properties defined in `src/styles/global.css`.

Key colors:
- **Dark mode**: background `#120128`, text `#dfafe9`, accent `#f383af`, accent-2 `#c96ef7`
- **Light mode**: background `#ffffff`, text `#660066`, accent `#e916a6`, accent-2 `#666bff`

Monospace font used for name, tagline, nav, and metadata to reinforce the technical aesthetic. Atkinson Hyperlegible for body text.

### Home page

Hero section with circular profile photo, name, current role (Community Manager @ UC OSPO Network), bio, and social links (GitHub, Mastodon, Bluesky, LinkedIn, Twitch, YouTube). Featured posts grid and recent posts list below, both sourced from Ghost Content API.

### Components updated

- `src/components/Header.astro` — sticky header, monospace site title, clean nav
- `src/components/HeaderLink.astro` — active state styling with accent color
- `src/components/Footer.astro` — minimal footer with copyright and key social links + RSS

### Status

Ghost Content API connected. Home page, blog list, and individual post pages functional. Header, footer, and home page styled. Blog list page, individual post page, about page, and deploy remain.

---

## Phase 9: Content Migration

### Export from Ghost Pro

From Ghost Pro admin → Settings → Labs:
- **Content and settings**: exported as a single JSON file (the equivalent of the legacy `.ghost.json` format)
- **Routes and redirects**: downloaded `routes.yaml` and `redirects.yaml`
- **Members**: no members to export

Note: exported images remain hosted on Ghost Pro's CDN. URLs continue to work post-import. Full image migration can be deferred to production cutover.

### Import into staging

Imported the content/settings JSON via staging Ghost admin → Settings → Labs → Import. Import processes asynchronously; a confirmation email is sent when complete.

Routes and redirects to be imported via the same Labs page once content import is confirmed.

---

## Phase 10: IDE-First Publishing Workflow

Rather than writing posts in Ghost Admin, posts are authored as Markdown files in the repo and pushed to Ghost via the Admin API. Ghost remains the canonical content store (for ActivityPub, email newsletters), but the local file is the source of truth — Ghost Admin is never used for editing.

### Structure

```
frontend/posts/my-post/index.md   # post content + frontmatter
frontend/posts/my-post/image.png  # local images (optional)
```

### Frontmatter fields

```yaml
---
title: Post Title
slug: post-slug           # defaults to directory name
status: draft             # or published
featured: false
tags:
  - tag-name
excerpt: Optional custom excerpt.
---
```

### Publish script

`frontend/scripts/publish.mjs` uses Node's built-in `crypto` to generate a Ghost Admin API JWT (no extra auth library needed), `gray-matter` to parse frontmatter, and `marked` to convert Markdown to HTML.

On publish:
1. Parses frontmatter and Markdown body
2. Finds all local image references (`src="..."` with relative paths)
3. Uploads each image to Ghost via `POST /ghost/api/admin/images/upload/`
4. Rewrites image src attributes to Ghost-hosted URLs
5. Checks if a post with the same slug already exists
6. Creates (POST) or updates (PUT) the post with `?source=html`

Updating a post requires passing `updated_at` from the existing post for optimistic locking.

### Usage

```bash
cd frontend
npm run publish posts/my-post/
```

Start posts as `status: draft`, preview at the UUID URL Ghost returns, then change to `status: published` and run again.

### Dependencies added

- `gray-matter` — frontmatter parsing
- `marked` — Markdown to HTML
- `dotenv` — load `.env` in Node script context

### Ghost Admin API key

Created a custom integration in Ghost Admin (Settings → Integrations) to obtain an Admin API key. Stored in `frontend/.env` as `GHOST_ADMIN_API_KEY` (not committed).

### Permissions fix

Ghost couldn't create `content/images/2026/` on first image upload due to ownership mismatch. Fixed with:

```bash
sudo chown -R ghost:ghost-user /var/www/ghost/content/images
sudo chmod -R 775 /var/www/ghost/content/images
```

### SSH config alias

Added to `~/.ssh/config` for convenience:

```
Host ghost
    HostName 143.198.144.150
    User root
```

---

## Phase 11: Pulling Ghost Posts Locally

To fully support the IDE-first workflow, all existing Ghost posts are mirrored locally as Markdown files so they can be edited and re-published from the repo.

### Pull script

`frontend/scripts/pull.mjs` fetches all posts from Ghost via the Content API, converts the HTML to Markdown using `turndown`, downloads all images locally into the post directory, and writes `posts/slug/index.md` with frontmatter.

```bash
cd frontend
npm run pull
```

Re-running `pull` skips existing posts by default. Pass `--overwrite` to force a refresh.

### Frontmatter fields written by the pull script

```yaml
---
title: Post Title
slug: post-slug
status: published
featured: false
tags:
  - "tag name"
excerpt: Auto-generated excerpt from Ghost.
---
```

Tag names are quoted with `JSON.stringify` to handle special characters (`:`, `#`, etc.) that would otherwise cause YAML parse errors.

### Known issue: images with complex alt text

Images whose alt text contains `[[brackets]]` (a common Ghost card format) produce Markdown like `![alt with [[...]]](url)`, which `marked` cannot parse back to HTML on publish — the image is rendered as a literal text block instead. A fix to the pull or publish script is pending.

### publish-all script

`frontend/scripts/publish-all.mjs` iterates all directories in `posts/` and runs `publish.mjs` for each — useful for bulk re-publishing after a template or style change.

---

## Phase 12: Image Migration

After importing content from Ghost Pro, images in post bodies had URLs rewritten to `staging.lauralangdon.io`, but the actual image files were never copied to the server — only posts created after the import had local images.

### Investigation

Ghost Pro images use Ghost's CDN, which serves files from the `laura-langdon.ghost.io` subdomain. The staging server only had images from `2026/` in `/var/www/ghost/content/images/`. All earlier posts showed alt text instead of images.

### Migration script

`frontend/scripts/migrate-images.mjs` fetches all posts from Ghost, finds `staging.lauralangdon.io` image URLs in each post's HTML, downloads the original files from `laura-langdon.ghost.io` (same URL paths, different domain), and uploads them to the server via `scp`. Already-present files are skipped.

```bash
cd frontend
npm run migrate-images
```

After the migration, all historical post images appeared correctly on staging.

---

## Phase 13: Frontend Polish

### Social icons in footer

Replaced text links in `Footer.astro` with SVG icons using the `simple-icons` npm package (GitHub, Mastodon, Bluesky, RSS). LinkedIn was added as a hardcoded SVG path — LinkedIn filed a DMCA takedown against Simple Icons ([#12546](https://github.com/simple-icons/simple-icons/issues/12546)) so it is no longer available via the package.

### Blog post layout

- Post content centered with `max-width: 680px; margin: 0 auto` on the `article` element
- Inline images constrained to text width with `width: 100%; height: auto` (preserves aspect ratio)
- `figure` wrappers (used by Ghost's image cards) sized to match text width

### Self-hosted fonts

Removed dependency on fontsource npm packages. Fonts are now served from `public/fonts/` with `@font-face` declarations in `global.css`:

- **Atkinson Hyperlegible** (400/700 woff) — body text
- **PT Mono** (400 woff2) — code blocks
- **Nunito Sans**, **Raleway**, **Montserrat** (400/700 woff2) — available for future use

Files were located in the fontsource package directories, copied to `public/fonts/`, and the packages were uninstalled.

### nginx deployment

Static files are served from `/var/www/astro/`. Deployed with:

```bash
rsync -avz --delete dist/ root@143.198.144.150:/var/www/astro/
```

The nginx `location /` block serves the Astro build with `try_files $uri $uri/ $uri.html =404`. Ghost admin, API, content, and ActivityPub routes are proxied to Ghost on port 2368.

---

## Phase 14: Accessibility Audit Fixes

A pa11y CI audit run against the built Astro frontend surfaced two categories of errors across all pages.

### Color contrast (WCAG AA, 4.5:1 minimum)

Several colors in the light mode palette fell just short:

| Element | Old color | Ratio | New color | Ratio |
|---------|-----------|-------|-----------|-------|
| Nav active link (`--accent`) | `#e916a6` | 4.09:1 on white | `#DF0B99` | 4.52:1 |
| `.highlight-card-title` (on `--bg-card: #fff5f8`) | `var(--accent)` | 3.83:1 | `#D60B99` | 4.50:1 |
| Blog post body links / `.job-tag` (`--accent-2`) | `#666bff` | 4.11:1 | `#5A5FF3` | 4.81:1 |
| Inline `code` text (on `--code-bg: #f8f0fc`) | `var(--accent-2)` | 4.31:1 | `#5A59F3` | 4.54:1 |

Dark mode colors all passed (ratios 6.2:1–8.2:1) and were left unchanged.

`#DF0B99` is the lightest pink on that hue that clears 4.5:1 on white. `.highlight-card-title` needed a slightly darker override (`#D60B99`) because its background is `--bg-card` rather than pure white. `#5A5FF3` passes on white and bg-card but not on `--code-bg`, so `code` was given its own hardcoded value.

**Files changed:** `src/styles/global.css`, `src/pages/about.astro`

### Missing alt text on blog listing images

All post cards on `/blog/` wrapped a `<img class="post-image">` inside an `<a>` with `alt=""`. When an image is the sole content of a link, its alt text must describe the link destination.

Initial fix used `post.feature_image_alt` from the Ghost Content API. However, only 6 of 22 posts had `feature_image_alt` populated in Ghost — the remaining 16 were addressed as part of Phase 15 by adding the field to every post's local markdown frontmatter.

**File changed:** `src/pages/blog/index.astro`

---

## Phase 15: Astro Content Collections Migration

The Ghost Content API was not returning `feature_image_alt` for most posts, and the IDE-first authoring workflow (Phase 10) already kept all posts as local markdown files. The logical fix was to cut the Ghost Content API out of the Astro build entirely and read directly from those local files using Astro content collections.

### content.config.ts

Replaced the Ghost API content collection with a glob loader reading `posts/*/index.md`:

```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './posts', pattern: '*/index.md' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    status: z.enum(['published', 'draft']).default('published'),
    featured: z.boolean().default(false),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    excerpt: z.string().optional(),
    feature_image: z.string().optional(),
    feature_image_alt: z.string().optional(),
  }),
});

export const collections = { blog };
```

Astro's `image()` helper was not used for `feature_image` — it is not compatible with relative image paths from subdirectories outside `src/`.

### Pages updated

- `src/pages/blog/index.astro` — replaced Ghost API call with `getCollection('blog')`; all `post.X` references updated to `post.data.X`
- `src/pages/blog/[...slug].astro` — replaced Ghost API with `getCollection` + `render`; uses `<Content />` instead of `set:html`
- `src/pages/index.astro` — replaced `getFeaturedPosts`/`getRecentPosts` with `getCollection('blog')` + filter/slice
- `src/layouts/BlogPost.astro` — added `heroImageAlt?: string` prop, updated `alt` on hero image

### feature_image_alt added to all posts

All 24 posts in `posts/` now have `feature_image_alt` in their frontmatter. Alt text was written or confirmed manually for each image.

### GIF pixel limit fix

Large animated GIFs in post bodies exceeded sharp's default pixel limit and caused build errors. Fixed by adding `sharpImageService({ limitInputPixels: false })` to `astro.config.mjs`.

---

## Phase 16: Linting, Accessibility, and Code Quality

### Alt text for all inline images (MD045)

Every inline body image across all 24 posts now has descriptive alt text. Images were downloaded and visually inspected to write accurate descriptions. Medium CDN images required a browser User-Agent header for curl; some Hashnode CDN images were unavailable and described from surrounding context and feature image alt text.

### Non-descriptive link text (MD059)

Replaced all `[here]` links with descriptive text (e.g. `[Lesson 5 notes]`, `[Predicting a Waiter's Tips]`, `[my reading notes and questions (PDF)]`).

### Spellcheck with cspell

Configured `cspell.config.yaml` with a comprehensive word list for tech terms, proper nouns, and project-specific vocabulary. Initial run caught 10 real typos across 6 posts:

- `embarassed` → `embarrassed`
- `Fortuntately` → `Fortunately`
- `tqhinks` → `thinks`
- `turqoise` → `turquoise`
- `nagnets` → `magnets`
- `tipod` → `tripod`
- `camra` → `camera`
- `kayboard` → `keyboard`
- `absolutel` → `absolutely`

URL patterns and backtick-wrapped code are ignored. Strikethrough Unicode characters are also excluded.

### markdownlint

Configured `.markdownlint-cli2.yaml`. Accessibility rules (MD045, MD059) are enforced. Ghost import formatting artifacts (MD001, MD009, MD027, MD030) and content style rules (MD013, MD024, MD026, MD033, MD034, MD041) are disabled.

### eslint

Configured `eslint.config.mjs` with flat config: `@eslint/js` recommended, `typescript-eslint` recommended, and `eslint-plugin-astro` recommended. Fixed one unnecessary regex escape in `HeaderLink.astro` (`[^\/]+` → `[^/]+`).

### Custom Shiki themes

Created custom `light-pinkish` and `dark-pinkish` Shiki themes based on Warp terminal color schemes. Dark theme uses original ANSI colors unchanged. Light theme colors were darkened to meet WCAG AA contrast (4.5:1) on white, searching for the brightest passing hue near each original color.

Shiki dual-theme output puts light colors inline and dark colors in `--shiki-dark` CSS custom properties, switched via `prefers-color-scheme`. Fixed a CSS bug where a `var(--shiki-light)` rule was overriding Shiki's inline light colors with a nonexistent variable.

**Files added:** `src/themes/dark-pinkish.json`, `src/themes/light-pinkish.json`
**Files changed:** `astro.config.mjs`, `src/styles/global.css`

### Code block UX

- **Copy button:** Client-side script adds a "Copy" button (top-right) to every `pre.astro-code` block using the Clipboard API.
- **Line wrapping:** Code blocks wrap instead of scrolling (`white-space: pre-wrap`, `overflow-x: visible`). Indent-aware wrapping preserves leading whitespace using dynamic `padding-left` / `text-indent` per line.
- **Line height:** Tightened to 1.1 in code blocks (body default is 1.7).
- **Inline code:** Added `white-space: nowrap` to prevent inline code snippets from splitting across lines.
- **Collapsed code block fix:** One Ghost-exported code block in `but-where-does-the-pickle-go` had all lines collapsed onto a single line; restored proper newlines.

**Files changed:** `src/styles/global.css`, `src/layouts/BlogPost.astro`

### Feature image paths

Post `feature_image` frontmatter used relative paths (`./filename.jpg`) that resolved correctly on individual post pages but broke on the homepage card grid (where the path resolves relative to `/`). Copied 9 feature images to `public/images/posts/<slug>/` and updated frontmatter to absolute paths.

### Featured post card date alignment

Dates on featured post cards now align at the bottom of each card regardless of title length, using flexbox with `margin-top: auto` on the date element.

**Files changed:** `src/pages/index.astro`

### Pre-commit hooks with husky + lint-staged

Installed husky v9 at the repo root (where `.git` lives) with a pre-commit hook that runs `cd frontend && npx lint-staged`. lint-staged runs:

- `posts/**/*.md` → markdownlint-cli2 + cspell
- `src/**/*.{astro,ts}` → eslint + cspell

**Files added:** `package.json` (root), `.husky/pre-commit`, `.gitignore` (root node_modules)

### linkinator

Installed for post-build link checking. Not in pre-commit (too slow); intended for CI:

```bash
npm run lint:links  # runs linkinator on dist/
```

---

## Phase 17: Email Subscribe Widget

### Approach

Rather than paying for a third-party newsletter service (Buttondown $9/mo for RSS-to-email, Ghost Pro $15/mo), the subscribe feature uses Ghost's built-in Members API on the self-hosted instance. Ghost handles subscriber storage, double opt-in via magic link, unsubscribe, and sending newsletters when posts are published. Mailgun (already configured for transactional email) handles delivery.

### Frontend implementation

Created a floating subscribe widget that appears on every page:

- **`src/components/SubscribeWidget.astro`** — fixed-position "Subscribe" pill button (bottom-right). Clicking expands a panel with two options:
  - "in your favorite feed reader" + inline RSS button linking to `/rss.xml`
  - "or by email" + email input + Subscribe button
- Panel closes on Escape key or click-outside
- Form POSTs to Ghost's `/members/api/send-magic-link/` with `{ email, emailType: 'subscribe' }`
- Handles loading, success ("Check your inbox!"), error, and rate-limit (429) states
- Styled to match the site's design system: gradient button, monospace headings, CSS custom properties for light/dark mode

The widget is included via `Footer.astro` so it appears on all pages. A standalone `SubscribeForm.astro` component also exists for potential future use in other locations.

### Server-side setup

**nginx:** Already proxied — the existing config groups `/members/` with `/ghost/` and `/content/` routes (line 37 of the SSL config), all forwarded to Ghost on port 2368. No changes needed.

**Ghost admin:**
- Members > Access: set "Who should be able to subscribe to your site" to "Anyone can sign up"
- Newsletters > Email settings: configured Mailgun with domain `mg.lauralangdon.io` and API key

**SMTP port issue:** DigitalOcean blocks outbound SMTP on ports 25, 465, and 587. Ghost's transactional email config was using port 465 and timing out. Fixed by switching to port 2525 (supported by Mailgun as an alternative) in `config.production.json`:

```json
"mail": {
    "from": "Laura Langdon <noreply@mg.lauralangdon.io>",
    "transport": "SMTP",
    "options": {
        "host": "smtp.mailgun.org",
        "port": 2525,
        "secure": false,
        "auth": {
            "user": "postmistress@mg.lauralangdon.io",
            "pass": "<password>"
        }
    }
}
```

The `"service": "Mailgun"` shorthand was removed because it overrides the explicit host/port settings. The `mail.from` address was also added to resolve Ghost's "Missing mail.from config" warning.

SMTP credentials had to be reset in Mailgun dashboard (Sending > Domain settings > SMTP credentials) and updated in Ghost config.

### Cost

Mailgun's flex plan charges per email sent (~$1/1,000 emails). At small subscriber counts, the marginal cost is negligible — e.g., 50 subscribers × 4 posts/month = 200 emails = $0.20/month.

---

## Phase 18: RSS Feed Fixes and Validation

### Content collections migration

`rss.xml.js` was still using the Ghost Content API (`getPosts` from `lib/ghost.ts`), even though Phase 15 moved all pages to local content collections. Updated to use `getCollection('blog')` with the same published/sorted filter used by the rest of the site.

### atom:link self-reference

Added `atom:link rel="self"` to the feed for interoperability — the W3C Feed Validation Service flagged this as a recommendation. Implemented via `@astrojs/rss` `xmlns` and `customData` options.

### Local RSS validator

Created `scripts/validate-rss.mjs` — a zero-dependency script that validates `dist/rss.xml` after build:

- Checks RSS 2.0 version attribute
- Verifies required channel elements (title, description, link)
- Validates each item has title, link, guid, and parseable pubDate
- Confirms all links are full URLs
- Checks for atom:link self-reference

```bash
npm run lint:rss
```

Added to the GitHub Actions workflow (`.github/workflows/a11y.yml`) as a post-build step, before the accessibility audit.

### Hero image optimization

Replaced `<img>` with Astro's `<Image>` component in `BlogPost.astro` for automatic webp conversion and optimization. Added `staging.lauralangdon.io` to allowed image domains in `astro.config.mjs`.

---

## Phase 19: DNS Cutover

*Pending*
