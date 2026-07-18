import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/lib/queries";
import { toast } from "sonner";

export function QuickAdd({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data: cats } = useCategories();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<"expense" | "income">("expense");

  const filtered = (cats ?? []).filter((c) => c.kind === kind);

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("transactions").insert({
        user_id: u.user.id,
        occurred_on: date,
        amount: Number(amount),
        kind,
        category_id: categoryId || null,
        description: description || null,
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setAmount(""); setDescription(""); setCategoryId("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl">Quick add</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (amount) mut.mutate(); }}
          className="mt-4 space-y-4 pb-6"
        >
          <div className="flex gap-2">
            <button type="button" onClick={() => setKind("expense")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${kind==="expense" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>Expense</button>
            <button type="button" onClick={() => setKind("income")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${kind==="income" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>Income</button>
          </div>

          <div>
            <Label>Amount</Label>
            <Input inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0" className="text-3xl h-14 font-display" />
          </div>

          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {filtered.map((c) => (
                <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border ${categoryId===c.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {c.name}
                </button>
              ))}
              {!filtered.length && <span className="text-xs text-muted-foreground">No categories yet</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Groceries" />
            </div>
          </div>

          <Button type="submit" className="w-full h-12" disabled={mut.isPending || !amount}>
            {mut.isPending ? "Adding…" : "Add transaction"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
