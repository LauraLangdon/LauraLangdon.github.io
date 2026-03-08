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

## Phase 10: DNS Cutover

*Pending*
