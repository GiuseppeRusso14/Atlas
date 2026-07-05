import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Route raggiungibili senza sessione: pagine di auth e webhook Clerk.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

// Next.js 16: il file si chiama proxy.ts (ex middleware.ts).
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Salta i file statici e gli asset di Next, intercetta tutto il resto.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
