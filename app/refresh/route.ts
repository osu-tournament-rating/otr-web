import { refreshAccessToken } from "@/app/actions/login";
import { getSession } from "@/app/actions/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const { body } = req;

  // Validate the request came internally (middleware)
  if (!session.refreshToken || (body as any)?.refreshToken !== session.refreshToken) {
    return NextResponse.json({ error: 'Internal route' }, { status: 403 });
  }

  // Request a new access token and update the session
  session.accessToken = await refreshAccessToken(session.refreshToken);
  await session.save();

  return NextResponse.json({ status: 200 });
}