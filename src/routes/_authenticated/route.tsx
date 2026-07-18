import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { seedFromWorkbook } from "@/lib/seed.functions";
import { LayoutDashboard, Receipt, ShoppingBag, LineChart, Settings, Plus, LogOut, Wallet } from "lucide-react";
import { QuickAdd } from "@/components/quick-add";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: Receipt, label: "Transactions" },
  { to: "/shopping", icon: ShoppingBag, label: "Shopping" },
  { to: "/analytics", icon: LineChart, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

function AppShell() {
  const queryClient = useQueryClient();
  const nav = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const seedMut = useMutation({
    mutationFn: () => seedFromWorkbook(),
    onSuccess: (r) => {
      if (!r.skipped) toast.success("Your spreadsheet was imported.");
      queryClient.invalidateQueries();
    },
  });

  useEffect(() => { seedMut.mutate(); /* one-time on shell mount */ // eslint-disable-next-line
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-6">
      {/* Desktop side rail */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col p-6 border-r border-border/60 bg-card/40 backdrop-blur">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-primary-foreground">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="font-display text-lg font-semibold">Ledgerly</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted"
                }`}>
                <n.icon className="w-4 h-4" />{n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={signOut} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </aside>

      <main className="lg:ml-60 px-4 py-5 lg:p-8 max-w-6xl">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-3 mb-3 glass-card flex items-center justify-around px-2 py-2">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                <n.icon className="w-5 h-5" />{n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FAB quick add */}
      <button
        onClick={() => setQuickOpen(true)}
        className="fixed bottom-24 lg:bottom-8 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] grid place-items-center active:scale-95 transition"
        aria-label="Add transaction"
      >
        <Plus className="w-6 h-6" />
      </button>

      <QuickAdd open={quickOpen} onOpenChange={setQuickOpen} />
    </div>
  );
}
