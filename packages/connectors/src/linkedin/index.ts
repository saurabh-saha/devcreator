import type { OAuthTokens, PlatformPost } from "../index.js";

const LINKEDIN_API = "https://api.linkedin.com/v2";

export class LinkedInConnector {
  constructor(private tokens: OAuthTokens) {}

  private async fetch(path: string, options?: RequestInit): Promise<Record<string, unknown>> {
    const res = await fetch(`${LINKEDIN_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`LinkedIn API error: ${res.status} ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  async getProfile(): Promise<{ id: string; name: string; followerCount: number }> {
    const profile = await this.fetch("/me?projection=(id,localizedFirstName,localizedLastName)");
    // Follower count requires a separate endpoint for company pages; personal profiles use networkSize
    return {
      id: profile["id"] as string,
      name: `${profile["localizedFirstName"]} ${profile["localizedLastName"]}`,
      followerCount: 0, // populated by analytics sync job
    };
  }

  async getPosts(authorId: string, count = 20): Promise<PlatformPost[]> {
    const data = await this.fetch(
      `/ugcPosts?q=authors&authors=List(urn:li:person:${authorId})&count=${count}`
    );
    return ((data["elements"] as Record<string, unknown>[]) ?? []).map((el) => {
      const shareContent = (el.specificContent as Record<string, unknown>)?.[
        "com.linkedin.ugc.ShareContent"
      ] as Record<string, unknown> | undefined;
      const commentary = shareContent?.["shareCommentary"] as Record<string, unknown> | undefined;
      const body = (commentary?.["text"] as string) ?? "";
      return {
        platformId: el.id as string,
        body,
        publishedAt: new Date((el.created as Record<string, unknown>)?.["time"] as number),
      };
    });
  }

  static getOAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: "r_liteprofile r_emailaddress w_member_social r_organization_social",
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  static async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const data = (await res.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
}
