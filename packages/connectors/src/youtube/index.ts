import type { OAuthTokens, PlatformPost } from "../index.js";

const YT_API = "https://www.googleapis.com/youtube/v3";

export class YouTubeConnector {
  constructor(private tokens: OAuthTokens) {}

  private async fetch(path: string) {
    const res = await fetch(`${YT_API}${path}`, {
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
    });
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async getChannel(): Promise<{ id: string; title: string; subscriberCount: number }> {
    const data = await this.fetch(
      "/channels?part=snippet,statistics&mine=true"
    );
    const channel = data.items?.[0];
    return {
      id: channel.id,
      title: channel.snippet.title,
      subscriberCount: parseInt(channel.statistics.subscriberCount ?? "0"),
    };
  }

  async getVideos(channelId: string, maxResults = 20): Promise<PlatformPost[]> {
    const search = await this.fetch(
      `/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=${maxResults}`
    );
    const videoIds = (search.items ?? []).map((v: Record<string, unknown>) => v.id?.videoId).filter(Boolean).join(",");
    if (!videoIds) return [];

    const stats = await this.fetch(
      `/videos?part=snippet,statistics&id=${videoIds}`
    );

    return (stats.items ?? []).map((v: Record<string, unknown>) => ({
      platformId: v.id as string,
      title: (v.snippet as Record<string, unknown>).title as string,
      body: (v.snippet as Record<string, unknown>).description as string,
      publishedAt: new Date((v.snippet as Record<string, unknown>).publishedAt as string),
      url: `https://youtube.com/watch?v=${v.id}`,
      metrics: {
        views: parseInt(String((v.statistics as Record<string, unknown>).viewCount ?? "0")),
        likes: parseInt(String((v.statistics as Record<string, unknown>).likeCount ?? "0")),
        comments: parseInt(String((v.statistics as Record<string, unknown>).commentCount ?? "0")),
      },
    }));
  }

  static getOAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  static async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
}
