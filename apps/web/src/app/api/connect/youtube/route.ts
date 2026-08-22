import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${process.env.NEXTAUTH_URL}/api/connect/youtube/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return Response.redirect(url.toString());
}
