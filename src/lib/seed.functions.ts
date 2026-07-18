import { supabase } from "@/integrations/supabase/client";
import seedJson from "@/data/initial-seed.json";

const FIXED_NAMES = new Set(
  ["Rent", "SIP", "EMI", "Insurance", "gym", "electric", "Home"].map((s) => s.toLowerCase()),
);
const INCOME_NAMES = new Set(
  ["Paycheck", "Bonus", "Interest", "Other", "Savings", "Custom category"].map((s) => s.toLowerCase()),
);

type SeedTxn = { date: string; amount: number; description: string; category: string; kind: "expense" | "income"; month: string };
type SeedBudget = { month: string; category: string; planned: number };
type SeedShop = { list: "personal" | "grocery"; name: string; priority: number; cost: number };
type SeedWish = { name: string; cost: number; priority: number; status: string };
type SeedTrip = { name: string; travel: number; visa: number; hotel_per_night: number; transport_per_day: number; food_per_day: number; activities_per_day: number; stay_length: number };
type Seed = {
  transactions: SeedTxn[];
  budgets: SeedBudget[];
  shopping: SeedShop[];
  wishlist: SeedWish[];
  trip_budgets: SeedTrip[];
  shopping_budgets: { personal: number; grocery: number };
};

export async function seedFromWorkbook() {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not signed in");
  const userId = userData.user.id;

  // Skip if already seeded
  const { data: profile } = await supabase.from("profiles").select("seeded_at").eq("id", userId).maybeSingle();
  if (profile?.seeded_at) return { ok: true, skipped: true };

    const data = seedJson as Seed;

    // Collect unique category names + guess kind
    const catMap = new Map<string, { name: string; kind: "expense" | "income"; is_fixed: boolean }>();
    const add = (raw: string) => {
      const name = raw.trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (catMap.has(key)) return;
      const kind = INCOME_NAMES.has(key) ? "income" : "expense";
      const is_fixed = FIXED_NAMES.has(key);
      catMap.set(key, { name, kind, is_fixed });
    };
    for (const t of data.transactions) add(t.category);
    for (const b of data.budgets) add(b.category);

    const catRows = Array.from(catMap.values()).map((c) => ({ ...c, user_id: userId }));
    const { data: insertedCats, error: catErr } = await supabase
      .from("categories")
      .upsert(catRows, { onConflict: "user_id,name,kind" as never, ignoreDuplicates: false })
      .select("id, name, kind");
    if (catErr) throw catErr;

    const catId = new Map<string, string>();
    for (const c of insertedCats ?? []) catId.set(`${c.name.toLowerCase()}|${c.kind}`, c.id);

    const findCatId = (name: string, kind: "expense" | "income") =>
      catId.get(`${name.trim().toLowerCase()}|${kind}`) ?? null;

    // Transactions
    const txnRows = data.transactions.map((t) => ({
      user_id: userId,
      occurred_on: t.date,
      amount: t.amount,
      kind: t.kind,
      category_id: findCatId(t.category, t.kind),
      description: t.description || null,
      source: "seed" as const,
    }));
    if (txnRows.length) {
      const { error } = await supabase.from("transactions").insert(txnRows);
      if (error) throw error;
    }

    // Budgets
    const budgetRows = data.budgets
      .map((b) => ({
        user_id: userId,
        month: b.month,
        category_id: findCatId(b.category, "expense"),
        planned_amount: b.planned,
      }))
      .filter((r) => r.category_id);
    if (budgetRows.length) {
      const { error } = await supabase
        .from("budgets")
        .upsert(budgetRows as never, { onConflict: "user_id,month,category_id" as never });
      if (error) throw error;
    }

    // Shopping items
    if (data.shopping.length) {
      const { error } = await supabase.from("shopping_items").insert(
        data.shopping.map((s) => ({
          user_id: userId,
          list: s.list,
          name: s.name,
          priority: s.priority,
          estimated_cost: s.cost,
        })),
      );
      if (error) throw error;
    }

    // Shopping budgets for current month
    const currentMonth = new Date();
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-01`;
    await supabase.from("shopping_budgets").upsert(
      [
        { user_id: userId, month: monthKey, list: "personal", budget_amount: data.shopping_budgets.personal },
        { user_id: userId, month: monthKey, list: "grocery", budget_amount: data.shopping_budgets.grocery },
      ] as never,
      { onConflict: "user_id,month,list" as never },
    );

    // Wishlist
    if (data.wishlist.length) {
      const { error } = await supabase.from("wishlist_items").insert(
        data.wishlist.map((w) => ({
          user_id: userId,
          name: w.name,
          cost: w.cost,
          priority: w.priority,
          status: w.status === "done" ? "done" : "to_buy",
        })),
      );
      if (error) throw error;
    }

    // Trips
    if (data.trip_budgets.length) {
      const { error } = await supabase.from("trip_budgets").insert(
        data.trip_budgets.map((t) => ({
          user_id: userId,
          name: t.name,
          travel: t.travel,
          visa: t.visa,
          hotel_per_night: t.hotel_per_night,
          transport_per_day: t.transport_per_day,
          food_per_day: t.food_per_day,
          activities_per_day: t.activities_per_day,
          stay_length: t.stay_length,
        })),
      );
      if (error) throw error;
    }

    await supabase
      .from("profiles")
      .update({ seeded_at: new Date().toISOString(), starting_balance: 50000 })
      .eq("id", userId);

  return { ok: true, skipped: false, counts: { transactions: txnRows.length, budgets: budgetRows.length } };
}
