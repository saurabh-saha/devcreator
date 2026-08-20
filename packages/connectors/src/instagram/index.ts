import type { OAuthTokens, PlatformPost } from "../index.js";

const GRAPH_API = "https://graph.instagram.com/v21.0";

export class InstagramConnector {
  constructor(private tokens: OAuthTokens) {}

  private async fetch(path: string): Promise<Record<string, unknown>> {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set("access_token", this.tokens.accessToken);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Instagram API error: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  async getProfile(): Promise<{ id: string; username: string; followerCount: number }> {
    const data = await this.fetch("/me?fields=id,username,followers_count");
    return {
      id: data["id"] as string,
      username: data["username"] as string,
      followerCount: data["followers_count"] as number ?? 0,
    };
  }

  async getMedia(userId: string, count = 20): Promise<PlatformPost[]> {
    const data = await this.fetch(
      `/${userId}/media?fields=id,caption,timestamp,permalink,like_count,comments_count&limit=${count}`
    );
    return ((data["data"] as Record<string, unknown>[]) ?? []).map((el) => ({
      platformId: el.id as string,
      body: (el.caption as string) ?? "",
      publishedAt: new Date(el.timestamp as string),
      url: el.permalink as string,
      metrics: {
        likes: el.like_count as number,
        comments: el.comments_count as number,
      },
    }));
  }

  static getOAuthUrl(appId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      app_id: appId,
      redirect_uri: redirectUri,
      scope: "instagram_business_basic,instagram_business_content_publish",
      response_type: "code",
      state,
    });
    return `https://api.instagram.com/oauth/authorize?${params}`;
  }

  static async exchangeCode(
    code: string,
    appId: string,
    appSecret: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const res = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        app_id: appId,
        app_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const data = (await res.json()) as { access_token: string };
    return { accessToken: data.access_token };
  }
}
