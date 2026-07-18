import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Ledgerly" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const emailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "sign_up") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/dashboard" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const googleAuth = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
    else if (!r.redirected) nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-primary-foreground">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="font-display text-xl font-semibold">Ledgerly</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-display font-semibold leading-tight">
            Money, clarified.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Log an expense in ten seconds. Compare planned vs actual vs forecast on every category. Shop with intent.
          </p>
          <div className="mt-8 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Forecast that separates fixed from variable</div>
            <div className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Shopping engine with priority-aware recommendations</div>
            <div className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Health score, insights, and history — every month</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Your data, your control. RLS-secured and export-ready.</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="glass-card p-8 w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold">Welcome</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to continue to Ledgerly.</p>

          <Button onClick={googleAuth} variant="secondary" className="w-full mt-6">
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
            <span className="flex-1 h-px bg-border" /> or <span className="flex-1 h-px bg-border" />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "sign_in" | "sign_up")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="sign_in">Sign in</TabsTrigger>
              <TabsTrigger value="sign_up">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value={mode} className="mt-4">
              <form onSubmit={emailAuth} className="space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "…" : mode === "sign_in" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
