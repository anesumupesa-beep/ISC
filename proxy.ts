import { auth } from "@/lib/auth/server";

// Redirects signed-out visitors to /sign-in (which, with its subpaths, the SDK always allows).
export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  // Everything except auth routes, sign-up, Next internals, the PWA files and any static file with an extension.
  matcher: [
    "/((?!api/auth|sign-up|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|fonts/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|txt|xml|json)$).*)",
  ],
};
