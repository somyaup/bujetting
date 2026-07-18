import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("archived", false).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useTransactions(monthKey?: string) {
  return useQuery({
    queryKey: ["transactions", monthKey ?? "all"],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("occurred_on", { ascending: false });
      if (monthKey) {
        const [y, m] = monthKey.split("-").map(Number);
        const start = `${y}-${String(m).padStart(2, "0")}-01`;
        const end = new Date(y, m, 1).toISOString().slice(0, 10);
        q = q.gte("occurred_on", start).lt("occurred_on", end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllTransactions() {
  return useQuery({
    queryKey: ["transactions", "all-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).limit(5000);
      if (error) throw error;
      return data;
    },
  });
}

export function useBudgets(monthKey: string) {
  return useQuery({
    queryKey: ["budgets", monthKey],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("month", monthKey);
      if (error) throw error;
      return data;
    },
  });
}

export function useShoppingItems() {
  return useQuery({
    queryKey: ["shopping_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shopping_items").select("*").order("priority");
      if (error) throw error;
      return data;
    },
  });
}

export function useShoppingBudget(monthKey: string) {
  return useQuery({
    queryKey: ["shopping_budgets", monthKey],
    queryFn: async () => {
      const { data, error } = await supabase.from("shopping_budgets").select("*").eq("month", monthKey);
      if (error) throw error;
      return data;
    },
  });
}

export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlist_items").select("*").order("priority");
      if (error) throw error;
      return data;
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });
}
