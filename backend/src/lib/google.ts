import { prisma } from "./prisma";

/**
 * Fetches the stored Google tokens for a given user.
 * Returns null if none are found.
 */
export async function getGoogleTokensForUser(userId: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope?: string | null;
  token_type?: string | null;
} | null> {
  const record = await prisma.googleToken.findUnique({
    where: { userId },
    select: {
      accessToken: true,
      refreshToken: true,
      expiryDate: true,
      scope: true,
      tokenType: true,
    },
  });
  if (!record) return null;
  return {
    access_token: record.accessToken,
    refresh_token: record.refreshToken,
    // convert JS Date → timestamp ms (or .getTime())
    expiry_date: record.expiryDate.getTime(),
    scope: record.scope,
    token_type: record.tokenType,
  };
}
