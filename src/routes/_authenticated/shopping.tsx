import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fetchShoppingList, deleteShoppingItemFromSheet, ShoppingItem } from "@/lib/gsheet-sync";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from "@/lib/queries";
import { calculateBudgetSummary } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/shopping")({
  component: ShoppingPage,
});

export function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real remaining variable budget from Supabase
  const { transactions, budgetSettings } = useDashboardData();
  const summary = calculateBudgetSummary(transactions, budgetSettings);
  const remainingVariableBudget = summary.variableRemaining;

  // Retrieve Apps Script URL from localStorage or profile settings
  const appsScriptUrl =
    localStorage.getItem("gsheet_apps_script_url") ||
    localStorage.getItem("apps_script_url") ||
    "";

  useEffect(() => {
    let isMounted = true;

    if (!appsScriptUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchShoppingList(appsScriptUrl)
      .then((fetched) => {
        if (!isMounted) return;
        // Sort items by priority ascending (smallest priority number first)
        const sorted = [...fetched].sort((a, b) => a.priority - b.priority);
        setItems(sorted);
      })
      .catch((err) => {
        console.error("Failed to fetch shopping list:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [appsScriptUrl]);

  // Handle checking off an item (Deletes from UI & Google Sheet)
  const handleCheckItem = async (itemToDelete: ShoppingItem) => {
    // 1. Immediately remove from UI
    setItems((prev) => prev.filter((i) => i.name !== itemToDelete.name));

    // 2. Delete from Google Sheet tab
    if (appsScriptUrl) {
      await deleteShoppingItemFromSheet(appsScriptUrl, itemToDelete.name);
    }
  };

  let runningTotal = 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Shopping List</span>
            <span className="text-sm font-normal text-muted-foreground">
              Remaining Budget: ₹{remainingVariableBudget.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!appsScriptUrl ? (
            <div className="text-amber-700 bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm">
              <p className="font-semibold mb-1">Apps Script URL missing!</p>
              <p>Please paste your Google Apps Script Web App URL in <strong>Settings</strong> to connect your shopping list.</p>
            </div>
          ) : loading ? (
            <p className="text-muted-foreground text-sm">Loading from Google Sheets...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No shopping items found in Google Sheets.</p>
          ) : (
            items.map((item) => {
              const prevTotal = runningTotal;
              runningTotal += item.price;

              // Color Logic based on cumulative priority accumulation
              let bgColor = "bg-emerald-50 border-emerald-300 text-emerald-900"; // Fully Affordable
              if (prevTotal < remainingVariableBudget && runningTotal > remainingVariableBudget) {
                bgColor = "bg-amber-50 border-amber-300 text-amber-900"; // Edge / Partially Affordable
              } else if (runningTotal > remainingVariableBudget) {
                bgColor = "bg-rose-50 border-rose-300 text-rose-900"; // Out of Budget
              }

              return (
                <div
                  key={`${item.name}-${item.priority}`}
                  className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${bgColor}`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`item-${item.name}`}
                      onCheckedChange={() => handleCheckItem(item)}
                    />
                    <div>
                      <label
                        htmlFor={`item-${item.name}`}
                        className="font-medium cursor-pointer block"
                      >
                        {item.name}
                      </label>
                      <span className="text-xs opacity-75">Priority #{item.priority}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold block text-base">
                      ₹{item.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs opacity-70">
                      Total so far: ₹{runningTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
