import type { Snapshot } from "../db/schema";
export type SearchResult = {
  id: string;
  title: string;
  detail: string;
  category: string;
  path: string;
};
export function searchWorkspace(data: Snapshot, query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const match = (s: string) => s.toLowerCase().includes(q);
  const groups: SearchResult[][] = [
    data.customers
      .filter((c) => match(`${c.name} ${c.company} ${c.email}`))
      .map((c) => ({
        id: c.id,
        title: c.name,
        detail: c.company || c.email,
        category: "Customers",
        path: `/app/customers/${c.id}`,
      })),
    data.products
      .filter((p) => match(`${p.name} ${p.sku} ${p.category}`))
      .map((p) => ({
        id: p.id,
        title: p.name,
        detail: `${p.sku} · ${p.stock} in stock`,
        category: "Products",
        path: `/app/products?q=${encodeURIComponent(p.sku)}`,
      })),
    data.orders
      .filter((o) =>
        match(
          `${o.number} ${data.customers.find((c) => c.id === o.customerId)?.name}`,
        ),
      )
      .map((o) => ({
        id: o.id,
        title: o.number,
        detail: o.status,
        category: "Orders",
        path: `/app/orders/${o.id}`,
      })),
    data.invoices
      .filter((i) => match(`${i.number} ${i.customer.name}`))
      .map((i) => ({
        id: i.id,
        title: i.number,
        detail: i.customer.name,
        category: "Invoices",
        path: `/app/invoices/${i.id}`,
      })),
    data.notifications
      .filter((n) => match(`${n.title} ${n.message}`))
      .map((n) => ({
        id: n.id,
        title: n.title,
        detail: n.type,
        category: "Notifications",
        path: n.href,
      })),
  ];
  return groups.flatMap((g) => g.slice(0, 6));
}
