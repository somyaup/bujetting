import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllTransactions, useCategories } from "@/lib/queries";
import { fmtFull } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Ledgerly" }] }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const qc = useQueryClient();
  const { data: txns = [] } = useAllTransactions();
  const { data: cats = [] } = useCategories();
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");

  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return txns.filter((t) => {
      if (catFilter && t.category_id !== catFilter) return false;
      if (!term) return true;
      return (
        (t.description ?? "").toLowerCase().includes(term) ||
        catName.get(t.category_id ?? "")?.toLowerCase().includes(term) ||
        String(t.amount).includes(term)
      );
    });
  }, [txns, q, catFilter, catName]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); toast.success("Deleted"); },
  });

  const exportCsv = () => {
    const rows = [["date","amount","kind","category","description"]];
    for (const t of filtered) rows.push([t.occurred_on, String(t.amount), t.kind, catName.get(t.category_id ?? "") ?? "", t.description ?? ""]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totals = filtered.reduce(
    (acc, t) => {
      if (t.kind === "expense") acc.exp += Number(t.amount);
      else acc.inc += Number(t.amount);
      return acc;
    },
    { exp: 0, inc: 0 },
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Ledger</div>
          <h1 className="font-display text-3xl mt-1">Transactions</h1>
        </div>
        <Button variant="secondary" onClick={exportCsv}><Download className="w-4 h-4 mr-1.5" />Export</Button>
      </header>

      <Card className="glass-card p-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-muted-foreground text-xs">Expenses</div><div className="font-display text-xl mt-0.5">{fmtFull(totals.exp)}</div></div>
          <div><div className="text-muted-foreground text-xs">Income</div><div className="font-display text-xl mt-0.5 text-success">{fmtFull(totals.inc)}</div></div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search description, category, amount…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCatFilter("")} className={`px-3 py-1 rounded-full text-xs border shrink-0 ${!catFilter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>All</button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCatFilter(c.id)} className={`px-3 py-1 rounded-full text-xs border shrink-0 ${catFilter===c.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>{c.name}</button>
          ))}
        </div>
      </Card>

      <Card className="glass-card p-1 divide-y divide-border/60">
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No transactions match.</div>}
        {filtered.slice(0, 500).map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-muted/40 rounded-lg">
            <div className={`w-10 h-10 rounded-xl grid place-items-center text-xs ${t.kind==="income" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
              {(catName.get(t.category_id ?? "") ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{t.description || catName.get(t.category_id ?? "") || "—"}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span>{t.occurred_on}</span>
                <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{catName.get(t.category_id ?? "") ?? "Uncategorised"}</Badge>
              </div>
            </div>
            <div className={`font-medium ${t.kind==="income" ? "text-success" : ""}`}>
              {t.kind==="income" ? "+" : "−"}{fmtFull(Number(t.amount))}
            </div>
            <button onClick={() => del.mutate(t.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {filtered.length > 500 && <div className="p-3 text-center text-xs text-muted-foreground">Showing 500 of {filtered.length}. Filter to narrow.</div>}
      </Card>
    </div>
  );
}
