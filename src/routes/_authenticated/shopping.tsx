import { useEffect, useState } from "react";
import { fetchShoppingList, deleteShoppingItemFromSheet, ShoppingItem } from "@/lib/gsheet-sync";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Example: Remaining variable budget (Replace with your actual dynamic budget query)
  const remainingVariableBudget = 500; 

  const appsScriptUrl = localStorage.getItem("gsheet_apps_script_url") || "";

  useEffect(() => {
    if (appsScriptUrl) {
      fetchShoppingList(appsScriptUrl).then((fetched) => {
        // Sort items by priority ascending
        const sorted = fetched.sort((a, b) => a.priority - b.priority);
        setItems(sorted);
        setLoading(false);
      });
    }
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

  // Calculate cumulative price and determine UI color
  let runningTotal = 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Shopping List</span>
            <span className="text-sm font-normal text-muted-foreground">
              Remaining Budget: ₹{remainingVariableBudget.toFixed(2)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading from Google Sheets...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No shopping items found.</p>
          ) : (
            items.map((item) => {
              const prevTotal = runningTotal;
              runningTotal += item.price;

              // Color Logic based on priority accumulation
              let bgColor = "bg-green-100 border-green-300 text-green-900"; // Fully Affordable
              if (prevTotal < remainingVariableBudget && runningTotal > remainingVariableBudget) {
                bgColor = "bg-yellow-100 border-yellow-300 text-yellow-900"; // Edge / Partially Affordable
              } else if (runningTotal > remainingVariableBudget) {
                bgColor = "bg-red-100 border-red-300 text-red-900"; // Out of Budget
              }

              return (
                <div
                  key={item.name}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${bgColor}`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`item-${item.name}`}
                      onCheckedChange={() => handleCheckItem(item)}
                    />
                    <label
                      htmlFor={`item-${item.name}`}
                      className="font-medium cursor-pointer"
                    >
                      {item.name}
                    </label>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold block">₹{item.price.toFixed(2)}</span>
                    <span className="text-xs opacity-70">Priority #{item.priority}</span>
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
