import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureSignedIn } from "@/lib/auto-auth";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    try {
      await ensureSignedIn();
    } catch {
      throw redirect({ to: "/auth" });
    }
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
