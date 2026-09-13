import type { Snapshot, Order } from "../db/schema";
import {
  getAnalytics,
  customerSummary,
  revenue,
  profit,
} from "../services/analytics";
import { round } from "../utils/format";
export function buildBusinessContext(
  d: Snapshot,
  question: string,
  reference = new Date(),
) {
  const q = question.toLowerCase();
  const summary = /summary|health|business|overview|overall/.test(q);
  const wantsRevenue =
    summary ||
    /revenue|sales|profit|month|compar|decreas|increas|order/.test(q);
  const wantsInventory = summary || /stock|inventory|restock|replenish/.test(q);
  const wantsCustomers = summary || /customer|inactive|churn|retention/.test(q);
  const wantsProducts =
    summary || /product|bestsell|best.sell|top|sell.*most/.test(q);
  const wantsActivity = summary || /activity|today|happen/.test(q);
  const context: Record<string, unknown> = {
    asOf: reference.toISOString(),
    timezone: "UTC",
    currency: "USD",
    mode: d.settings[0]?.demoMode
      ? "Demonstration data"
      : "Local workspace data",
    definitions: {
      revenue:
        "Sum of paid, non-cancelled order subtotals less discounts, excluding tax.",
      profit:
        "Recognized revenue less historical order-item costs; excludes operating expenses.",
      customerConversion:
        "Unique paying buyers in a period / CRM contacts created before period end.",
      churnRisk:
        "A heuristic: more than 60 days since last non-cancelled order; not a prediction.",
      missingData:
        "Traffic, marketing spend, return reasons, and external market data are unavailable.",
    },
    coverage: {
      customers: d.customers.length,
      products: d.products.length,
      orders: d.orders.length,
    },
    sections: [] as string[],
  };
  const sections = context.sections as string[];
  const monthStart = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    1,
  );
  const lastMonthStart = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth() - 1,
    1,
  );
  const today = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate(),
  );
  const end = today + 86400000;
  if (wantsRevenue) {
    sections.push("revenue");
    const stats = (start: number, until: number) => {
      const orders = d.orders.filter(
        (o) =>
          Date.parse(o.createdAt) >= start && Date.parse(o.createdAt) < until,
      );
      return {
        start: new Date(start).toISOString(),
        endExclusive: new Date(until).toISOString(),
        revenue: round(orders.reduce((s, o) => s + revenue(o), 0)),
        grossProfit: round(orders.reduce((s, o) => s + profit(o), 0)),
        orders: orders.filter((o) => o.status !== "Cancelled").length,
        unpaidOrders: orders.filter(
          (o) => o.paymentStatus === "Unpaid" && o.status !== "Cancelled",
        ).length,
      };
    };
    const current = stats(monthStart, end),
      last = stats(lastMonthStart, monthStart),
      comparable = stats(
        lastMonthStart,
        Math.min(monthStart, lastMonthStart + end - monthStart),
      );
    context.revenue = {
      lifetime: stats(0, end),
      thisMonth: current,
      lastMonthFull: last,
      lastMonthComparableDays: comparable,
      today: stats(today, end),
      monthToDateChange: comparable.revenue
        ? round(
            ((current.revenue - comparable.revenue) / comparable.revenue) * 100,
          )
        : null,
      dailyTrend: getAnalytics(d, "30", reference).trend,
    };
  }
  if (wantsInventory) {
    sections.push("inventory");
    const active = d.products.filter((p) => p.status === "Active");
    const low = active.filter((p) => p.stock <= p.lowStockThreshold);
    context.inventory = {
      activeProducts: active.length,
      totalUnits: active.reduce((s, p) => s + p.stock, 0),
      totalValueAtCost: round(active.reduce((s, p) => s + p.stock * p.cost, 0)),
      lowestStock: [...active]
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 10)
        .map((p) => ({
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          threshold: p.lowStockThreshold,
        })),
      lowStockCount: low.length,
      lowStock: low
        .slice(0, 40)
        .map((p) => ({
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          threshold: p.lowStockThreshold,
        })),
      recordsOmitted: Math.max(0, low.length - 40),
    };
  }
  if (wantsCustomers) {
    sections.push("customers");
    const rows = d.customers.map((c) => {
      const s = customerSummary(d, c.id);
      return {
        name: c.name,
        status: c.status,
        lastOrder: s.lastOrder || null,
        daysSinceLastOrder: s.lastOrder
          ? Math.floor(
              (reference.getTime() - Date.parse(s.lastOrder)) / 86400000,
            )
          : null,
        daysSinceSignup: Math.floor(
          (reference.getTime() - Date.parse(c.createdAt)) / 86400000,
        ),
        orders: s.orderCount,
        lifetimeRevenue: s.revenue,
      };
    });
    const inactive = rows
      .filter((c) =>
        c.daysSinceLastOrder !== null
          ? c.daysSinceLastOrder > 60
          : c.daysSinceSignup > 60,
      )
      .sort(
        (a, b) =>
          (b.daysSinceLastOrder ?? b.daysSinceSignup) -
          (a.daysSinceLastOrder ?? a.daysSinceSignup),
      );
    context.customers = {
      total: rows.length,
      inactiveThresholdDays: 60,
      inactiveCount: inactive.length,
      inactive: inactive.slice(0, 30),
      recordsOmitted: Math.max(0, inactive.length - 30),
      mostOrders: [...rows].sort((a, b) => b.orders - a.orders).slice(0, 10),
      topCustomers: [...rows]
        .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue)
        .slice(0, 10),
    };
  }
  if (wantsProducts) {
    sections.push("products");
    const a = getAnalytics(d, /month/.test(q) ? "month" : "90", reference);
    context.products = {
      period: /month/.test(q) ? "Current month to date" : "Last 90 days",
      rankedByRevenue: a.products.slice(0, 15),
      rankedByUnits: [...a.products]
        .sort((a, b) => b.units - a.units)
        .slice(0, 15),
      revenueByCategory: a.categories,
      recordsOmitted: Math.max(0, a.products.length - 15),
    };
  }
  if (wantsActivity) {
    sections.push("activity");
    const events = d.activities
      .filter(
        (a) =>
          Date.parse(a.createdAt) >= today && Date.parse(a.createdAt) < end,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    context.activity = {
      date: new Date(today).toISOString(),
      total: events.length,
      events: events
        .slice(0, 25)
        .map((a) => ({ title: a.title, type: a.entityType, at: a.createdAt })),
      recordsOmitted: Math.max(0, events.length - 25),
    };
  }
  if (!sections.length)
    context.note =
      "No matching business context for this question. Ask for revenue, products, inventory, customers or activity. Do not infer missing facts.";
  return context;
}
