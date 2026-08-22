import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

// Inline schema to avoid @devcreator/db .js resolution issues in webpack
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
}, (t) => [index("platform_accounts_user_platform_idx").on(t.userId, t.platform)]);


export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?connect_error=github`);
  }

  // Exchange code for token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/connect/github/callback`,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?connect_error=github`);
  }

  // Fetch GitHub user info
  const ghUser = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "DevCreator" },
  }).then(r => r.json());

  // Get logged-in session
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?connect_error=github`);
  }

  

  // Upsert user
  let [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    [user] = await db.insert(users).values({
      email: session.user.email,
      name: session.user.name ?? session.user.email,
    }).returning();
  }

  // Upsert platform account
  const [existing] = await db.select().from(platformAccounts).where(
    and(eq(platformAccounts.userId, user.id), eq(platformAccounts.platform, "github"))
  );

  if (existing) {
    await db.update(platformAccounts)
      .set({ accessToken: tokenData.access_token, handle: ghUser.login ?? "", connectedAt: new Date() })
      .where(and(eq(platformAccounts.userId, user.id), eq(platformAccounts.platform, "github")));
  } else {
    await db.insert(platformAccounts).values({
      userId: user.id,
      platform: "github",
      handle: ghUser.login ?? "",
      accessToken: tokenData.access_token,
      followerCount: ghUser.followers ?? 0,
    });
  }

  const res = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?connected=github`);
  res.cookies.set("github_token", tokenData.access_token, {
    httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/",
  });
  return res;
}
