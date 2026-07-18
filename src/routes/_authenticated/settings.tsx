import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, useProfile, useAllTransactions } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Download, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Ledgerly" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: profile } = useProfile();
  const { data: cats = [] } = useCategories();
  const { data: allTxns = [] } = useAllTransactions();
  const [newCat, setNewCat] = useState("");
  const [newFixed, setNewFixed] = useState(false);

  const updateProfile = useMutation({
    mutationFn: async (patch: Partial<{ currency: string; display_name: string }>) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Saved"); },
  });

  const addCat = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("categories").insert({ user_id: u.user!.id, name: newCat, is_fixed: newFixed });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setNewCat(""); setNewFixed(false); },
  });

  const toggleFixed = useMutation({
    mutationFn: async ({ id, is_fixed }: { id: string; is_fixed: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_fixed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const archiveCat = useMutation({
    mutationFn: async (id: string) => { await supabase.from("categories").update({ archived: true }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(allTxns, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ledgerly-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Preferences</div>
        <h1 className="font-display text-3xl mt-1">Settings</h1>
      </header>

      <Card className="glass-card p-5 space-y-4">
        <h3 className="font-display text-lg">Profile</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Display name</label>
            <Input defaultValue={profile?.display_name ?? ""} onBlur={(e) => updateProfile.mutate({ display_name: e.target.value })} />
          </div>
          <div><label className="text-xs text-muted-foreground">Currency</label>
            <Input defaultValue={profile?.currency ?? "INR"} onBlur={(e) => updateProfile.mutate({ currency: e.target.value.toUpperCase() })} />
          </div>
        </div>
      </Card>

      <Card className="glass-card p-5 space-y-4">
        <h3 className="font-display text-lg">Categories</h3>
        <p className="text-xs text-muted-foreground">Fixed categories (Rent, SIP, EMIs) are excluded from the daily spending pace.</p>
        <div className="flex gap-2">
          <Input placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <input type="checkbox" checked={newFixed} onChange={(e) => setNewFixed(e.target.checked)} /> Fixed
          </label>
          <Button onClick={() => newCat && addCat.mutate()}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="divide-y divide-border/60">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2">
              <span className="flex-1">{c.name}</span>
              {c.is_fixed && <Badge variant="outline" className="bg-accent/15 text-accent border-accent/40">Fixed</Badge>}
              <button onClick={() => toggleFixed.mutate({ id: c.id, is_fixed: !c.is_fixed })} className="text-xs text-muted-foreground hover:text-foreground">
                {c.is_fixed ? "Mark variable" : "Mark fixed"}
              </button>
              <button onClick={() => archiveCat.mutate(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass-card p-5 space-y-3">
        <h3 className="font-display text-lg">Your data</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportJson}><Download className="w-4 h-4 mr-1.5" />Export JSON</Button>
        </div>
      </Card>

      <Card className="glass-card p-5">
        <button onClick={signOut} className="flex items-center gap-2 text-sm text-destructive"><LogOut className="w-4 h-4" />Sign out</button>
      </Card>
    </div>
  );
}
