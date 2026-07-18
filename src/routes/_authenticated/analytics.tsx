import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAllTransactions, useCategories } from "@/lib/queries";
import { fmtFull, monthShort } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Ledgerly" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: txns = [] } = useAllTransactions();
  const { data: cats = [] } = useCategories();
  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);

  const byMonth = useMemo(() => {
    const map: Record<string, { month: string; expense: number; income: number }> = {};
    for (const t of txns) {
      const key = t.occurred_on.slice(0, 7) + "-01";
      map[key] ??= { month: key, expense: 0, income: 0 };
      if (t.kind === "expense") map[key].expense += Number(t.amount);
      else map[key].income += Number(t.amount);
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map((r) => ({ ...r, label: monthShort(r.month), savings: r.income - r.expense }));
  }, [txns]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of txns) {
      if (t.kind !== "expense" || !t.category_id) continue;
      const name = catName.get(t.category_id) ?? "Uncategorised";
      map[name] = (map[name] ?? 0) + Number(t.amount);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [txns, catName]);

  const colors = ["#4ade80", "#f59e0b", "#a78bfa", "#f472b6", "#38bdf8", "#facc15", "#fb7185", "#22d3ee", "#a3e635", "#c084fc"];

  const rolling = useMemo(() => {
    // 30-day rolling average
    const daily: Record<string, number> = {};
    for (const t of txns) {
      if (t.kind !== "expense") continue;
      daily[t.occurred_on] = (daily[t.occurred_on] ?? 0) + Number(t.amount);
    }
    const dates = Object.keys(daily).sort();
    const rows: { date: string; avg: number }[] = [];
    for (let i = 0; i < dates.length; i++) {
      const window = dates.slice(Math.max(0, i - 29), i + 1);
      const sum = window.reduce((s, d) => s + (daily[d] ?? 0), 0);
      rows.push({ date: dates[i], avg: sum / window.length });
    }
    return rows.slice(-90);
  }, [txns]);

  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Insights</div>
        <h1 className="font-display text-3xl mt-1">Analytics</h1>
      </header>

      <Card className="glass-card p-4">
        <h3 className="font-display text-lg mb-3">Monthly cash flow</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={byMonth}>
              <CartesianGrid stroke="oklch(0.28 0.02 260 / 0.4)" vertical={false} />
              <XAxis dataKey="label" fontSize={11} stroke="oklch(0.65 0.02 250)" />
              <YAxis fontSize={11} stroke="oklch(0.65 0.02 250)" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "oklch(0.19 0.025 260)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 12 }} formatter={(v: number) => fmtFull(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill="oklch(0.78 0.16 155)" radius={[6,6,0,0]} />
              <Bar dataKey="expense" fill="oklch(0.68 0.20 25)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="glass-card p-4">
          <h3 className="font-display text-lg mb-3">Top categories</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byCategory.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.19 0.025 260)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 12 }} formatter={(v: number) => fmtFull(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            {byCategory.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i] }} />
                <span className="flex-1">{c.name}</span>
                <span className="text-muted-foreground">{fmtFull(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card p-4">
          <h3 className="font-display text-lg mb-3">30-day rolling daily spend</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={rolling}>
                <CartesianGrid stroke="oklch(0.28 0.02 260 / 0.4)" vertical={false} />
                <XAxis dataKey="date" fontSize={10} stroke="oklch(0.65 0.02 250)" />
                <YAxis fontSize={10} stroke="oklch(0.65 0.02 250)" tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.19 0.025 260)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 12 }} formatter={(v: number) => fmtFull(v)} />
                <Line type="monotone" dataKey="avg" stroke="oklch(0.78 0.16 155)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="glass-card p-4">
        <h3 className="font-display text-lg mb-3">Savings trend</h3>
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={byMonth}>
              <CartesianGrid stroke="oklch(0.28 0.02 260 / 0.4)" vertical={false} />
              <XAxis dataKey="label" fontSize={11} stroke="oklch(0.65 0.02 250)" />
              <YAxis fontSize={11} stroke="oklch(0.65 0.02 250)" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "oklch(0.19 0.025 260)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 12 }} formatter={(v: number) => fmtFull(v)} />
              <Line type="monotone" dataKey="savings" stroke="oklch(0.78 0.13 60)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
