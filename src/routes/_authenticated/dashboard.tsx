import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTransactions, useBudgets, useCategories, useAllTransactions, useProfile } from "@/lib/queries";
import { monthForecast, healthScore } from "@/lib/finance";
import { fmtFull, monthLabel, currentMonthKey, monthShort } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Ledgerly" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "INR";

  const { data: cats = [] } = useCategories();
  const { data: budgets = [] } = useBudgets(monthKey);
  const { data: txns = [] } = useTransactions(monthKey);
  const { data: allTxns = [] } = useAllTransactions();

  const prevMonth = shiftMonth(monthKey, -1);
  const prevTxns = useMemo(() => allTxns.filter((t) => t.occurred_on.startsWith(prevMonth.slice(0, 7))), [allTxns, prevMonth]);

  const roll = useMemo(() => monthForecast(txns as never, cats as never, budgets as never, monthKey), [txns, cats, budgets, monthKey]);
  const prevRoll = useMemo(() => monthForecast(prevTxns as never, cats as never, [], prevMonth), [prevTxns, cats, prevMonth]);
  const health = useMemo(() => healthScore(roll), [roll]);

  const utilization = roll.plannedTotal > 0 ? Math.min(100, (roll.actualTotal / roll.plannedTotal) * 100) : 0;
  const dailySpend = roll.variableActual / Math.max(1, roll.elapsed);
  const bandColor = { excellent: "text-success", good: "text-primary", warning: "text-warning", critical: "text-destructive" }[health.band];

  const insights = generateInsights(roll, prevRoll);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Overview</div>
          <h1 className="font-display text-3xl mt-1">{monthLabel(monthKey)}</h1>
        </div>
        <div className="flex items-center gap-1 glass-card px-1 py-1">
          <button onClick={() => setMonthKey(shiftMonth(monthKey, -1))} className="p-2 hover:bg-muted rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
          <div className="px-3 text-sm min-w-[110px] text-center">{monthShort(monthKey)}</div>
          <button onClick={() => setMonthKey(shiftMonth(monthKey, 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </header>

      <Card className="glass-card p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric label="Planned" value={fmtFull(roll.plannedTotal, currency)} />
          <Metric label="Actual" value={fmtFull(roll.actualTotal, currency)} sub={`${roll.elapsed}/${roll.totalDays} days`} />
          <Metric label="Forecast" value={fmtFull(roll.totalForecast, currency)}
            sub={roll.totalForecast > roll.plannedTotal ? `${fmtFull(roll.totalForecast - roll.plannedTotal, currency)} over` : `${fmtFull(roll.plannedTotal - roll.totalForecast, currency)} under`}
            subClass={roll.totalForecast > roll.plannedTotal ? "text-destructive" : "text-success"} />
          <Metric label="Savings (forecast)" value={fmtFull(roll.savingsForecast, currency)}
            subClass={roll.savingsForecast >= 0 ? "text-success" : "text-destructive"} />
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Budget utilisation</span><span>{utilization.toFixed(0)}%</span>
          </div>
          <Progress value={utilization} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="glass-card p-5 lg:col-span-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Health score</div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className={`font-display text-6xl ${bandColor}`}>{health.score}</div>
            <div className={`text-sm capitalize ${bandColor}`}>{health.band}</div>
          </div>
          <div className="mt-4 space-y-1.5 text-sm">
            <Row k="Daily spend" v={fmtFull(dailySpend, currency)} />
            <Row k="Days remaining" v={String(roll.remaining)} />
            <Row k="Fixed forecast" v={fmtFull(roll.fixedForecast, currency)} />
            <Row k="Variable forecast" v={fmtFull(roll.variableForecast, currency)} />
          </div>
        </Card>

        <Card className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-display text-lg">Insights</h3>
          </div>
          <div className="space-y-2">
            {insights.length === 0 && <div className="text-sm text-muted-foreground">Log more this month to unlock insights.</div>}
            {insights.map((i, idx) => (
              <div key={idx} className={`flex items-start gap-2 text-sm p-3 rounded-lg bg-muted/40`}>
                {i.direction === "up" ? <TrendingUp className="w-4 h-4 text-destructive mt-0.5" /> : <TrendingDown className="w-4 h-4 text-success mt-0.5" />}
                <span>{i.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="glass-card p-5">
        <h3 className="font-display text-lg mb-4">Categories</h3>
        <div className="space-y-2.5">
          {roll.perCategory.map((c) => (
            <div key={c.category.id} className="grid grid-cols-12 items-center gap-2 text-sm">
              <div className="col-span-4 truncate flex items-center gap-2">
                {c.category.is_fixed && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                <span>{c.category.name}</span>
              </div>
              <div className="col-span-6">
                <Progress value={c.planned > 0 ? Math.min(100, (c.actual / c.planned) * 100) : 0} />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                  <span>{fmtFull(c.actual, currency)} / {fmtFull(c.planned, currency)}</span>
                  <span>fc {fmtFull(c.forecast, currency)}</span>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <Badge variant="outline"
                  className={c.status==="over" ? "bg-destructive/15 text-destructive border-destructive/40"
                    : c.status==="warn" ? "bg-warning/15 text-warning border-warning/40"
                    : "bg-success/15 text-success border-success/40"}>
                  {c.status==="over" ? "Over" : c.status==="warn" ? "Tight" : "On track"}
                </Badge>
              </div>
            </div>
          ))}
          {!roll.perCategory.length && <div className="text-sm text-muted-foreground">No expense categories yet.</div>}
        </div>
      </Card>

      <Card className="glass-card p-5">
        <h3 className="font-display text-lg mb-1">Fixed vs Variable</h3>
        <p className="text-xs text-muted-foreground mb-4">Fixed costs (rent, SIP, EMIs) are excluded from the daily spending pace and added back to the total forecast.</p>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Fixed" value={fmtFull(roll.fixedForecast, currency)} sub="expected" />
          <Metric label="Variable" value={fmtFull(roll.variableForecast, currency)} sub="expected" />
          <Metric label="Total" value={fmtFull(roll.totalForecast, currency)} sub="expected" />
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, sub, subClass }: { label: string; value: string; sub?: string; subClass?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-display text-2xl mt-0.5">{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${subClass ?? "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}

function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function generateInsights(m: ReturnType<typeof monthForecast>, prev: ReturnType<typeof monthForecast>) {
  const out: { text: string; direction: "up" | "down" }[] = [];
  for (const c of m.perCategory.slice(0, 8)) {
    if (c.status === "over" && c.forecast > c.planned * 1.1) {
      out.push({ text: `${c.category.name} is projected to exceed budget by ${(((c.forecast - c.planned) / c.planned) * 100).toFixed(0)}%.`, direction: "up" });
    }
    const prevActual = prev.perCategory.find((p) => p.category.id === c.category.id)?.actual ?? 0;
    if (prevActual > 100 && c.actual > prevActual * 1.3) {
      out.push({ text: `${c.category.name} spending has increased ${(((c.actual - prevActual) / prevActual) * 100).toFixed(0)}% vs last month.`, direction: "up" });
    }
  }
  if (m.incomeActual > 0 && m.savingsForecast > 0) {
    const rate = ((m.savingsForecast / m.incomeActual) * 100).toFixed(0);
    out.push({ text: `Projected savings rate is ${rate}% this month.`, direction: "down" });
  }
  return out.slice(0, 5);
}
