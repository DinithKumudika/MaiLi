import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { updateAccountTokens, getAccountByUserId } from "@/lib/services/db-service";

async function refreshAccessToken(account: any) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    // Update account in DB
    await updateAccountTokens(
      account.id,
      refreshedTokens.access_token,
      Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      refreshedTokens.refresh_token ?? account.refresh_token
    );

    return refreshedTokens.access_token;
  } catch (error) {
    console.error("Error refreshing access token", error);
    return null;
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt", // keeping jwt strategy to avoid breaking client-side session expectations
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // On initial sign in, account is provided by NextAuth, but PrismaAdapter also saves it to DB.
      if (account && user) {
        token.userId = user.id;
        return token;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token?.userId) {
        const account = await getAccountByUserId(token.userId as string);

        if (account) {
          let accessToken = account.access_token;
          
          // Check if token expired
          if (account.expires_at && Date.now() > account.expires_at * 1000) {
            accessToken = await refreshAccessToken(account);
            if (!accessToken) {
              session.error = "RefreshAccessTokenError";
            }
          }

          session.accessToken = accessToken;
        }
      }
      
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
