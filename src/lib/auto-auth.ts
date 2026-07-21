import { supabase } from "@/integrations/supabase/client";

const APP_EMAIL = import.meta.env.VITE_APP_EMAIL as string | undefined;
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD as string | undefined;

// Ensures there's a logged-in Supabase session before the app shows any
// screen. Uses one fixed account (credentials come from GitHub Actions
// secrets at build time — see .github/workflows/deploy-pages.yml) instead
// of showing a sign-in form. Returns the session, or throws if the fixed
// account isn't configured/confirmed yet (falls back to the manual /auth
// page in that case).
export async function ensureSignedIn() {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return existing.session;

  if (!APP_EMAIL || !APP_PASSWORD) {
    throw new Error(
      "VITE_APP_EMAIL / VITE_APP_PASSWORD are not set — add them as GitHub secrets, or sign in manually.",
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: APP_EMAIL,
    password: APP_PASSWORD,
  });
  if (error || !data.session) {
    throw error ?? new Error("Auto sign-in failed");
  }
  return data.session;
}
