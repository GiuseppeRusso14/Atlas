import { clerkSetup } from "@clerk/testing/playwright";

/** Ottiene il testing token Clerk (bypassa la bot protection nei test). */
export default async function globalSetup() {
  await clerkSetup();
}
