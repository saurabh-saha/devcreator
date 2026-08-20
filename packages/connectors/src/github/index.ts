import type { OAuthTokens } from "../index.js";

const GH_API = "https://api.github.com";

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  topics: string[];
  readmeContent: string | null;
  url: string;
}

export class GitHubConnector {
  constructor(private tokens: OAuthTokens) {}

  private async fetch(path: string) {
    const res = await fetch(`${GH_API}${path}`, {
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async getUser(): Promise<{ login: string; name: string; bio: string | null }> {
    return this.fetch("/user");
  }

  async getPublicRepos(username: string): Promise<GitHubRepo[]> {
    const repos = await this.fetch(`/users/${username}/repos?sort=updated&per_page=30`);
    return Promise.all(
      (repos as Record<string, unknown>[]).map(async (r) => {
        let readmeContent: string | null = null;
        try {
          const readme = await this.fetch(`/repos/${username}/${r.name}/readme`);
          readmeContent = atob(readme.content.replace(/\n/g, ""));
        } catch {
          // repo may not have a README
        }
        return {
          name: r.name as string,
          description: (r.description as string) ?? null,
          language: (r.language as string) ?? null,
          stargazersCount: r.stargazers_count as number,
          topics: (r.topics as string[]) ?? [],
          readmeContent,
          url: r.html_url as string,
        };
      })
    );
  }

  static getOAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user public_repo",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  static async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string
  ): Promise<OAuthTokens> {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = (await res.json()) as { access_token: string };
    return { accessToken: data.access_token };
  }
}
