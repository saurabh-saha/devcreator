import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
const platformEnum = pgEnum("platform", ["linkedin","instagram","youtube","x","medium","substack","github","notion","google_drive"]);
const platformAccounts = pgTable("platform_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  platform: platformEnum("platform").notNull(),
  handle: text("handle").notNull(),
  accessToken: text("access_token").notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
}, (t) => [index("pa_test_idx").on(t.userId, t.platform)]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = drizzle(postgres(process.env.DATABASE_URL!));
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) return NextResponse.json({ error: "No user" });

  const [acc] = await db.select().from(platformAccounts)
    .where(and(eq(platformAccounts.userId, user.id), eq(platformAccounts.platform, "linkedin")));
  if (!acc) return NextResponse.json({ error: "LinkedIn not connected" });

  // Fetch LinkedIn userinfo to get the sub (person URN)
  const uinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${acc.accessToken}` },
  });
  const uinfo = await uinfoRes.json();

  if (!uinfo.sub) return NextResponse.json({ error: "No sub in userinfo", uinfo });

  const authorUrn = encodeURIComponent(`urn:li:person:${uinfo.sub}`);

  // Try multiple versions to find one that's active
  const versions = ["202501", "202502", "202503", "202504", "202505", "202506", "202507", "202508"];
  let posts: any = null;
  let workingVersion = "";

  for (const v of versions) {
    const res = await fetch(
      `https://api.linkedin.com/rest/posts?author=${authorUrn}&q=author&count=5`,
      {
        headers: {
          Authorization: `Bearer ${acc.accessToken}`,
          "LinkedIn-Version": v,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    const data = await res.json();
    if (res.status !== 426) { // 426 = bad version
      posts = data;
      workingVersion = v;
      break;
    }
  }

  return NextResponse.json({ uinfo: { name: uinfo.name, sub: uinfo.sub }, workingVersion, posts });
}
