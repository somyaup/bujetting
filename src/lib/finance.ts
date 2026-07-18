// Core business logic — all pure functions, unit-testable, no I/O.

import { daysInMonth, dayOfMonth } from "./format";

export type Txn = {
  id: string;
  occurred_on: string;
  amount: number;
  kind: "expense" | "income";
  category_id: string | null;
};

export type Category = {
  id: string;
  name: string;
  kind: "expense" | "income";
  is_fixed: boolean;
};

export type Budget = { category_id: string; planned_amount: number };

export type CategoryRollup = {
  category: Category;
  planned: number;
  actual: number;
  forecast: number;
  variance: number;
  status: "ok" | "warn" | "over";
};

/** Forecast for a whole month, with fixed vs variable split. */
export function monthForecast(
  txns: Txn[],
  categories: Category[],
  budgets: Budget[],
  monthKey: string,
) {
  const totalDays = daysInMonth(monthKey);
  const elapsed = Math.max(1, dayOfMonth(monthKey));
  const remaining = Math.max(0, totalDays - elapsed);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const budgetByCat = new Map(budgets.map((b) => [b.category_id, b.planned_amount]));

  const monthTxns = txns.filter((t) => t.occurred_on.startsWith(monthKey.slice(0, 7)));

  let variableActual = 0;
  let fixedActual = 0;
  let incomeActual = 0;
  const perCatActual: Record<string, number> = {};

  for (const t of monthTxns) {
    if (t.kind === "income") { incomeActual += Number(t.amount); continue; }
    const cat = t.category_id ? catById.get(t.category_id) : undefined;
    if (cat?.is_fixed) fixedActual += Number(t.amount);
    else variableActual += Number(t.amount);
    if (t.category_id) perCatActual[t.category_id] = (perCatActual[t.category_id] || 0) + Number(t.amount);
  }

  const variableDailyAvg = variableActual / elapsed;
  const variableForecast = variableActual + variableDailyAvg * remaining;
  const fixedPlanned = categories
    .filter((c) => c.is_fixed && c.kind === "expense")
    .reduce((s, c) => s + (budgetByCat.get(c.id) ?? 0), 0);
  const fixedForecast = Math.max(fixedActual, fixedPlanned);
  const totalForecast = variableForecast + fixedForecast;

  const plannedTotal = categories
    .filter((c) => c.kind === "expense")
    .reduce((s, c) => s + (budgetByCat.get(c.id) ?? 0), 0);
  const actualTotal = variableActual + fixedActual;

  const perCategory: CategoryRollup[] = categories
    .filter((c) => c.kind === "expense")
    .map((c) => {
      const planned = budgetByCat.get(c.id) ?? 0;
      const actual = perCatActual[c.id] ?? 0;
      let forecast: number;
      if (c.is_fixed) forecast = Math.max(actual, planned);
      else {
        const dailyAvg = actual / elapsed;
        forecast = actual + dailyAvg * remaining;
      }
      const variance = planned - forecast;
      const status: CategoryRollup["status"] =
        forecast <= planned * 0.9 ? "ok" : forecast <= planned * 1.05 ? "warn" : "over";
      return { category: c, planned, actual, forecast, variance, status };
    })
    .sort((a, b) => b.actual - a.actual);

  return {
    monthKey,
    elapsed,
    totalDays,
    remaining,
    variableActual,
    variableForecast,
    variableDailyAvg,
    fixedActual,
    fixedPlanned,
    fixedForecast,
    plannedTotal,
    actualTotal,
    totalForecast,
    incomeActual,
    savingsForecast: incomeActual - totalForecast,
    perCategory,
  };
}

export type HealthBand = "excellent" | "good" | "warning" | "critical";

export function healthScore(m: ReturnType<typeof monthForecast>) {
  const utilization = m.plannedTotal > 0 ? m.actualTotal / m.plannedTotal : 0;
  const paceRatio = m.plannedTotal > 0 ? (m.actualTotal / m.plannedTotal) / (m.elapsed / m.totalDays) : 1;
  const overspent = m.perCategory.filter((c) => c.status === "over").length;
  const catTotal = Math.max(1, m.perCategory.length);
  const savingsRate = m.incomeActual > 0 ? Math.max(0, (m.incomeActual - m.totalForecast) / m.incomeActual) : 0;

  const utilScore = 100 - Math.min(100, Math.max(0, (utilization - 0.9) * 300));
  const paceScore = 100 - Math.min(100, Math.max(0, (paceRatio - 1) * 200));
  const overScore = 100 - (overspent / catTotal) * 200;
  const savingsScore = Math.min(100, savingsRate * 200);

  const raw = 0.30 * utilScore + 0.25 * paceScore + 0.25 * overScore + 0.20 * savingsScore;
  const score = Math.round(Math.max(0, Math.min(100, raw)));
  const band: HealthBand =
    score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "warning" : "critical";
  return { score, band };
}

/** Shopping recommendation — mirrors the Apps Script algorithm exactly. */
export type ShoppingItem = {
  id: string;
  name: string;
  priority: number;
  estimated_cost: number;
  status: "pending" | "purchased" | "skipped";
};
export type ShoppingRow = ShoppingItem & {
  running: number;
  band: "buy_now" | "buy_soon" | "low_priority" | "wait";
};
export function shoppingRecommendations(items: ShoppingItem[], budget: number): ShoppingRow[] {
  const green = budget / 3;
  const yellow = (2 * budget) / 3;
  const pending = items.filter((i) => i.status === "pending").sort((a, b) => a.priority - b.priority);
  const purchased = items.filter((i) => i.status !== "pending");
  let running = 0;
  const rows: ShoppingRow[] = [];
  for (const i of pending) {
    running += Number(i.estimated_cost);
    const band: ShoppingRow["band"] =
      running <= green ? "buy_now" :
      running <= yellow ? "buy_soon" :
      running <= budget ? "low_priority" : "wait";
    rows.push({ ...i, running, band });
  }
  for (const i of purchased) rows.push({ ...i, running: 0, band: "buy_now" });
  return rows;
}

export const bandMeta = {
  buy_now:      { label: "BUY NOW",      className: "bg-success/20 text-success border-success/40" },
  buy_soon:     { label: "BUY SOON",     className: "bg-warning/20 text-warning border-warning/40" },
  low_priority: { label: "LOW PRIORITY", className: "bg-accent/20 text-accent border-accent/40" },
  wait:         { label: "WAIT",         className: "bg-muted text-muted-foreground border-border" },
} as const;
