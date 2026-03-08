import GhostContentAPI from "@tryghost/content-api";

const api = new GhostContentAPI({
  url: import.meta.env.PUBLIC_GHOST_URL,
  key: import.meta.env.PUBLIC_GHOST_CONTENT_API_KEY,
  version: "v5.0",
});

export async function getPosts() {
  return api.posts.browse({ limit: "all" });
}

export async function getFeaturedPosts() {
  return api.posts.browse({ filter: "featured:true", limit: "all" });
}

export async function getRecentPosts(limit = 5) {
  return api.posts.browse({ limit, order: "published_at DESC" });
}

export async function getPost(slug: string) {
  return api.posts.read({ slug }, { formats: ["html"] });
}

export async function getPages() {
  return api.pages.browse({ limit: "all" });
}
