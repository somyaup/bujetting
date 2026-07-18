export const fmtMoney = (n: number, currency = "INR") => {
  const abs = Math.abs(n);
  const short =
    abs >= 1_00_00_000 ? `${(n / 1_00_00_000).toFixed(2)}Cr` :
    abs >= 1_00_000 ? `${(n / 1_00_000).toFixed(2)}L` :
    abs >= 1_000 ? `${(n / 1_000).toFixed(1)}k` :
    n.toFixed(0);
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency + " ";
  return `${symbol}${short}`;
};

export const fmtFull = (n: number, currency = "INR") => {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency + " ";
  return `${symbol}${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
};

export const monthLabel = (isoMonth: string) => {
  const d = new Date(isoMonth);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const monthShort = (isoMonth: string) => {
  const d = new Date(isoMonth);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

export const toMonthKey = (d: Date | string) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export const daysInMonth = (isoMonth: string) => {
  const [y, m] = isoMonth.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export const dayOfMonth = (isoMonth: string) => {
  const now = new Date();
  const [y, m] = isoMonth.split("-").map(Number);
  if (now.getFullYear() !== y || now.getMonth() + 1 !== m) return daysInMonth(isoMonth);
  return now.getDate();
};
