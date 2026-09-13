import type { Snapshot, Order, Product } from "../db/schema";
import { round } from "../utils/format";
export type Period = "today" | "7" | "30" | "90" | "year" | "month";
export const periodLabels: Record<Period, string> = {
  today: "Today",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  year: "This year",
  month: "This month",
};
export function dateRange(period: Period, reference = new Date()) {
  const today = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate(),
  );
  const end = today + 86400000;
  const start =
    period === "year"
      ? Date.UTC(reference.getUTCFullYear(), 0, 1)
      : period === "month"
        ? Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1)
        : end - (period === "today" ? 1 : Number(period)) * 86400000;
  return { start, end, previousStart: start - (end - start) };
}
export function recognized(o: Order) {
  return o.status !== "Cancelled" && o.paymentStatus === "Paid";
}
export function revenue(o: Order) {
  return recognized(o) ? round(o.subtotal - o.discount) : 0;
}
export function profit(o: Order) {
  return recognized(o)
    ? round(
        revenue(o) - o.items.reduce((s, i) => s + i.unitCost * i.quantity, 0),
      )
    : 0;
}
export function inventoryStatus(p: Product) {
  return p.stock === 0
    ? "Out of stock"
    : p.stock <= p.lowStockThreshold
      ? "Low stock"
      : p.stock > Math.max(100, p.lowStockThreshold * 10)
        ? "Overstock"
        : "Healthy";
}
export function customerSummary(d: Snapshot, id: string) {
  const orders = d.orders
    .filter((o) => o.customerId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    orders,
    revenue: round(orders.reduce((s, o) => s + revenue(o), 0)),
    lastOrder: orders.find((o) => o.status !== "Cancelled")?.createdAt,
    orderCount: orders.filter((o) => o.status !== "Cancelled").length,
  };
}
const change = (a: number, b: number) =>
  b ? round(((a - b) / Math.abs(b)) * 100) : null;
export function getAnalytics(
  d: Snapshot,
  period: Period = "30",
  reference = new Date(),
) {
  const range = dateRange(period, reference);
  const inRange = (s: string, start: number, end: number) =>
    Date.parse(s) >= start && Date.parse(s) < end;
  const current = d.orders.filter((o) =>
    inRange(o.createdAt, range.start, range.end),
  );
  const previous = d.orders.filter((o) =>
    inRange(o.createdAt, range.previousStart, range.start),
  );
  function metrics(orders: Order[], start: number, end: number) {
    const count = orders.filter((o) => o.status !== "Cancelled").length;
    const customers = d.customers.filter((c) =>
      inRange(c.createdAt, start, end),
    ).length;
    const eligible = d.customers.filter(
      (c) => Date.parse(c.createdAt) < end,
    ).length;
    return {
      revenue: round(orders.reduce((s, o) => s + revenue(o), 0)),
      orders: count,
      customers,
      profit: round(orders.reduce((s, o) => s + profit(o), 0)),
      conversion: eligible
        ? round(
            (new Set(orders.filter(recognized).map((o) => o.customerId)).size /
              eligible) *
              100,
          )
        : 0,
    };
  }
  const values = metrics(current, range.start, range.end);
  const prev = metrics(previous, range.previousStart, range.start);
  const changes = Object.fromEntries(
    Object.keys(values).map((k) => [
      k,
      change(values[k as keyof typeof values], prev[k as keyof typeof prev]),
    ]),
  ) as Record<keyof typeof values, number | null>;
  const days = Math.round((range.end - range.start) / 86400000);
  const bucket =
    days > 90 ? Math.ceil(days / 12) : days > 30 ? 7 : days > 7 ? 3 : 1;
  const trend = [];
  for (let offset = 0; offset < days; offset += bucket) {
    const start = range.start + offset * 86400000;
    const end = Math.min(range.end, start + bucket * 86400000);
    const from = range.previousStart + offset * 86400000;
    const rows = current.filter((o) => inRange(o.createdAt, start, end));
    trend.push({
      date: new Date(start).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      revenue: round(rows.reduce((s, o) => s + revenue(o), 0)),
      previous: round(
        previous
          .filter((o) => inRange(o.createdAt, from, from + (end - start)))
          .reduce((s, o) => s + revenue(o), 0),
      ),
      orders: rows.filter((o) => o.status !== "Cancelled").length,
      customers: d.customers.filter((c) => inRange(c.createdAt, start, end))
        .length,
    });
  }
  const performance = new Map<
    string,
    {
      id: string;
      name: string;
      category: string;
      units: number;
      revenue: number;
    }
  >();
  for (const o of current.filter(recognized))
    for (const item of o.items) {
      const p = performance.get(item.productId) || {
        id: item.productId,
        name: item.name,
        category: item.category,
        units: 0,
        revenue: 0,
      };
      p.units += item.quantity;
      p.revenue = round(
        p.revenue +
          item.quantity *
            item.unitPrice *
            (o.subtotal ? 1 - o.discount / o.subtotal : 1),
      );
      performance.set(item.productId, p);
    }
  const products = [...performance.values()].sort(
    (a, b) => b.revenue - a.revenue,
  );
  const categories = Object.entries(
    products.reduce<Record<string, number>>((a, p) => {
      a[p.category] = (a[p.category] || 0) + p.revenue;
      return a;
    }, {}),
  )
    .map(([name, value]) => ({ name, value: round(value) }))
    .sort((a, b) => b.value - a.value);
  const statuses = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ].map((name) => ({
    name,
    value: current.filter((o) => o.status === name).length,
  }));
  const activeProducts = d.products.filter((p) => p.status === "Active");
  const inventory = ["Healthy", "Low stock", "Out of stock", "Overstock"].map(
    (name) => ({
      name,
      value: activeProducts.filter((p) => inventoryStatus(p) === name).length,
    }),
  );
  return {
    values,
    previous: prev,
    changes,
    trend,
    products,
    categories,
    statuses,
    inventory,
    current,
    range,
    inventoryValue: round(
      activeProducts.reduce((s, p) => s + p.stock * p.cost, 0),
    ),
    inventoryUnits: activeProducts.reduce((s, p) => s + p.stock, 0),
    lowStock: activeProducts.filter((p) => p.stock <= p.lowStockThreshold),
  };
}
