import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${process.env.NEXTAUTH_URL}/api/connect/linkedin/callback`);
  url.searchParams.set("scope", "openid profile email");
  const from = req.nextUrl.searchParams.get("from");
  if (from) url.searchParams.set("state", `from=${from}`);

  return Response.redirect(url.toString());
}
