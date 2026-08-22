import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const platformEnum = pgEnum("platform", [
  "linkedin", "instagram", "youtube", "x", "medium", "substack", "github", "notion", "google_drive",
]);

const platformAccounts = pgTable("platform_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  platform: platformEnum("platform").notNull(),
  handle: text("handle").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  followerCount: integer("follower_count").notNull().default(0),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
}, (t) => [index("pa_li_idx").on(t.userId, t.platform)]);


export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get("error");
  const errorDesc = req.nextUrl.searchParams.get("error_description");
  if (error) {
    console.error("[LinkedIn OAuth error]", error, errorDesc);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?connect_error=linkedin&reason=${encodeURIComponent(error + ": " + errorDesc)}`);
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?connect_error=linkedin`);
  }

  // Exchange code for token
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/connect/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?connect_error=linkedin`);
  }

  // Fetch LinkedIn profile
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = await profileRes.json();
  const handle = profile.name ?? profile.email ?? "";
  // Store the URN so we can use it for the Posts API
  const linkedinSub = profile.sub ?? "";

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?connect_error=linkedin`);
  }

  

  let [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    [user] = await db.insert(users).values({
      email: session.user.email,
      name: session.user.name ?? session.user.email,
    }).returning();
  }

  const [existing] = await db.select().from(platformAccounts).where(
    and(eq(platformAccounts.userId, user.id), eq(platformAccounts.platform, "linkedin"))
  );

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : undefined;

  if (existing) {
    await db.update(platformAccounts)
      .set({ accessToken: tokenData.access_token, handle, expiresAt, connectedAt: new Date() })
      .where(and(eq(platformAccounts.userId, user.id), eq(platformAccounts.platform, "linkedin")));
  } else {
    await db.insert(platformAccounts).values({
      userId: user.id, platform: "linkedin", handle,
      accessToken: tokenData.access_token, expiresAt,
    });
  }

  const returnTo = req.nextUrl.searchParams.get("state")?.startsWith("from=")
    ? req.nextUrl.searchParams.get("state")!.replace("from=", "")
    : null;
  const dest = returnTo === "integrations"
    ? `${process.env.NEXTAUTH_URL}/?screen=integrations&connected=linkedin`
    : `${process.env.NEXTAUTH_URL}/?connected=linkedin`;
  return NextResponse.redirect(dest);
}
