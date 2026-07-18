import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShoppingItems, useShoppingBudget, useWishlist } from "@/lib/queries";
import { shoppingRecommendations, bandMeta } from "@/lib/finance";
import { fmtFull, currentMonthKey } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/shopping")({
  head: () => ({ meta: [{ title: "Shopping — Ledgerly" }] }),
  component: ShoppingPage,
});

function ShoppingPage() {
  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Plan with intent</div>
        <h1 className="font-display text-3xl mt-1">Shopping</h1>
      </header>

      <Tabs defaultValue="personal">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="grocery">Grocery</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
        </TabsList>
        <TabsContent value="personal" className="mt-4"><ShoppingList list="personal" /></TabsContent>
        <TabsContent value="grocery" className="mt-4"><ShoppingList list="grocery" /></TabsContent>
        <TabsContent value="wishlist" className="mt-4"><WishlistView /></TabsContent>
      </Tabs>
    </div>
  );
}

function ShoppingList({ list }: { list: "personal" | "grocery" }) {
  const qc = useQueryClient();
  const monthKey = currentMonthKey();
  const { data: items = [] } = useShoppingItems();
  const { data: budgetRows = [] } = useShoppingBudget(monthKey);
  const budget = budgetRows.find((b) => b.list === list)?.budget_amount ?? 0;

  const rows = useMemo(() => shoppingRecommendations(
    items.filter((i) => i.list === list) as never,
    Number(budget),
  ), [items, list, budget]);

  const running = rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.estimated_cost), 0);
  const remaining = Number(budget) - running;

  const [name, setName] = useState("");
  const [priority, setPriority] = useState("");
  const [cost, setCost] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("shopping_items").insert({
        user_id: u.user!.id, list, name, priority: Number(priority) || 50, estimated_cost: Number(cost) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shopping_items"] }); setName(""); setPriority(""); setCost(""); toast.success("Added"); },
  });

  const setBudget = useMutation({
    mutationFn: async (value: number) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("shopping_budgets").upsert({ user_id: u.user!.id, month: monthKey, list, budget_amount: value }, { onConflict: "user_id,month,list" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping_budgets", monthKey] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "purchased" | "skipped" }) => {
      const { error } = await supabase.from("shopping_items").update({
        status,
        purchased_on: status === "purchased" ? new Date().toISOString().slice(0, 10) : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping_items"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("shopping_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping_items"] }),
  });

  return (
    <div className="space-y-4">
      <Card className="glass-card p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><div className="text-xs text-muted-foreground">Budget</div>
            <Input type="number" value={Number(budget)} onChange={(e) => setBudget.mutate(Number(e.target.value))} className="mt-1 h-8 text-lg font-display" />
          </div>
          <div><div className="text-xs text-muted-foreground">Planned</div>
            <div className="font-display text-xl mt-1">{fmtFull(running)}</div>
          </div>
          <div><div className="text-xs text-muted-foreground">Remaining</div>
            <div className={`font-display text-xl mt-1 ${remaining < 0 ? "text-destructive" : "text-success"}`}>{fmtFull(remaining)}</div>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-3 flex gap-2">
        <Input placeholder="Item" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Priority" type="number" step="0.5" className="w-24" value={priority} onChange={(e) => setPriority(e.target.value)} />
        <Input placeholder="Cost" type="number" className="w-28" value={cost} onChange={(e) => setCost(e.target.value)} />
        <Button onClick={() => name && add.mutate()}><Plus className="w-4 h-4" /></Button>
      </Card>

      <Card className="glass-card divide-y divide-border/60">
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No items yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className={`flex items-center gap-3 p-3 ${r.status !== "pending" ? "opacity-60" : ""}`}>
            <div className="w-9 h-9 rounded-xl bg-muted grid place-items-center text-xs font-medium">{r.priority}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{r.name}</div>
              <div className="text-[11px] text-muted-foreground">{fmtFull(Number(r.estimated_cost))} · running {fmtFull(r.running)}</div>
            </div>
            {r.status === "pending" && (
              <Badge variant="outline" className={`text-[10px] ${bandMeta[r.band].className}`}>{bandMeta[r.band].label}</Badge>
            )}
            {r.status === "purchased" ? (
              <Badge variant="outline" className="bg-success/15 text-success border-success/40">Purchased</Badge>
            ) : (
              <button onClick={() => setStatus.mutate({ id: r.id, status: "purchased" })} className="p-2 rounded-lg hover:bg-muted"><Check className="w-4 h-4 text-success" /></button>
            )}
            <button onClick={() => del.mutate(r.id)} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function WishlistView() {
  const qc = useQueryClient();
  const { data: items = [] } = useWishlist();
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [priority, setPriority] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("wishlist_items").insert({
        user_id: u.user!.id, name, cost: Number(cost), priority: Number(priority) || 5,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlist"] }); setName(""); setCost(""); setPriority(""); },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "to_buy" | "done" }) => {
      await supabase.from("wishlist_items").update({ status, purchased_on: status==="done" ? new Date().toISOString().slice(0,10) : null }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("wishlist_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const toBuy = items.filter((w) => w.status === "to_buy");
  const total = toBuy.reduce((s, w) => s + Number(w.cost), 0);

  return (
    <div className="space-y-4">
      <Card className="glass-card p-4 grid grid-cols-2 gap-3">
        <div><div className="text-xs text-muted-foreground">Open wishlist value</div><div className="font-display text-2xl mt-1">{fmtFull(total)}</div></div>
        <div><div className="text-xs text-muted-foreground">Items to buy</div><div className="font-display text-2xl mt-1">{toBuy.length}</div></div>
      </Card>
      <Card className="glass-card p-3 flex gap-2">
        <Input placeholder="Item" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Cost" type="number" className="w-28" value={cost} onChange={(e) => setCost(e.target.value)} />
        <Input placeholder="Prio" type="number" className="w-20" value={priority} onChange={(e) => setPriority(e.target.value)} />
        <Button onClick={() => name && cost && add.mutate()}><Plus className="w-4 h-4" /></Button>
      </Card>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((w) => (
          <Card key={w.id} className={`glass-card p-4 flex items-center gap-3 ${w.status === "done" ? "opacity-60" : ""}`}>
            <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent grid place-items-center text-xs font-medium">P{w.priority}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{w.name}</div>
              <div className="text-xs text-muted-foreground">{fmtFull(Number(w.cost))}</div>
            </div>
            <button onClick={() => toggle.mutate({ id: w.id, status: w.status === "done" ? "to_buy" : "done" })} className="p-2 rounded-lg hover:bg-muted"><Check className={`w-4 h-4 ${w.status==="done" ? "text-success" : "text-muted-foreground"}`} /></button>
            <button onClick={() => del.mutate(w.id)} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
          </Card>
        ))}
      </div>
    </div>
  );
}
