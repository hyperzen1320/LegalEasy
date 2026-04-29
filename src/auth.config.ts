import type { NextAuthConfig } from "next-auth";

// Edge-safe base config. No DB/Mongoose imports — used by middleware too.
// The full Credentials provider with DB lookup lives in src/auth.ts.

export default {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Auth API endpoints must always be reachable.
      if (pathname.startsWith("/api/auth")) return true;

      // API endpoints — protected at the handler level (JWT or cookie).
      // Don't gate via proxy so mobile JWT requests aren't redirected to /login.
      if (pathname.startsWith("/api/mobile")) return true;
      if (pathname.startsWith("/api/admin")) return true;
      if (pathname.startsWith("/api/app")) return true;

      const isAuthed = !!auth?.user;
      const userType = auth?.user?.userType;

      const isPublic =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/post-login" ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password");

      if (isPublic) {
        // If already signed in and visiting /login, route to their home.
        if (isAuthed && pathname === "/login") {
          const dest = userType === "global_admin" ? "/admin" : "/app";
          return Response.redirect(new URL(dest, request.url));
        }
        return true;
      }

      // Protected routes from here on.
      if (!isAuthed) return false; // triggers redirect to /login

      if (pathname.startsWith("/admin") && userType !== "global_admin") {
        return Response.redirect(new URL("/app", request.url));
      }

      if (pathname.startsWith("/app") && userType === "global_admin") {
        return Response.redirect(new URL("/admin", request.url));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.userType = (user as { userType: string }).userType;
        token.partnerId = (user as { partnerId: string | null }).partnerId;
        token.firstName = (user as { firstName: string }).firstName;
        token.lastName = (user as { lastName: string }).lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error custom fields populated via type augmentation
        session.user.id = token.id;
        // @ts-expect-error custom fields populated via type augmentation
        session.user.userType = token.userType;
        // @ts-expect-error custom fields populated via type augmentation
        session.user.partnerId = token.partnerId;
        // @ts-expect-error custom fields populated via type augmentation
        session.user.firstName = token.firstName;
        // @ts-expect-error custom fields populated via type augmentation
        session.user.lastName = token.lastName;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
