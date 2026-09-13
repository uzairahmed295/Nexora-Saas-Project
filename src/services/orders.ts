import { z } from "zod";
import { atomic } from "../db/database";
import type { Order, Snapshot } from "../db/schema";
import { addActivity, addNotification } from "./events";
import { requirePermission } from "./permissions";
import { now, round, uid, money } from "../utils/format";
const inputSchema = z.object({
  id: z.string().min(1).max(200),
  customerId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(10000),
      }),
    )
    .min(1)
    .max(100),
  discount: z.number().finite().min(0).max(1e9),
  taxRate: z.number().min(0).max(100),
  paymentStatus: z.enum(["Paid", "Unpaid"]),
  notes: z.string().max(3000),
  source: z.enum(["Manual", "Simulation"]).default("Manual"),
});
export type OrderInput = z.input<typeof inputSchema>;
function moveStock(d: Snapshot, order: Order, direction: 1 | -1) {
  for (const item of order.items) {
    const p = d.products.find((p) => p.id === item.productId);
    if (!p) throw new Error("A product is unavailable. Refresh and try again.");
    const stock = p.stock + direction * item.quantity;
    if (stock < 0)
      throw new Error(
        `Insufficient stock for ${p.name}. ${p.stock} units are available.`,
      );
    const before = p.stock;
    p.stock = stock;
    p.updatedAt = now();
    if (before > p.lowStockThreshold && stock <= p.lowStockThreshold)
      addNotification(
        d,
        "Low stock alert",
        `${p.name} has ${stock} units available.`,
        "Low inventory",
        "/app/inventory",
        "warning",
      );
  }
}
export function createOrderInDraft(d: Snapshot, raw: OrderInput) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error("Check the customer, order items, quantities, and totals.");
  const input = parsed.data;
  const existing = d.orders.find((o) => o.id === input.id);
  if (existing) return existing;
  const customer = d.customers.find((c) => c.id === input.customerId);
  if (!customer) throw new Error("Select an existing customer.");
  const quantities = new Map<string, number>();
  for (const i of input.items)
    quantities.set(
      i.productId,
      (quantities.get(i.productId) || 0) + i.quantity,
    );
  const items = [...quantities].map(([id, quantity]) => {
    const p = d.products.find((p) => p.id === id);
    if (!p || p.status !== "Active")
      throw new Error("One of the products is unavailable.");
    if (quantity > 10000)
      throw new Error("An item exceeds the quantity limit.");
    return {
      productId: id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      quantity,
      unitPrice: p.price,
      unitCost: p.cost,
    };
  });
  const subtotal = round(
    items.reduce((s, p) => s + p.quantity * p.unitPrice, 0),
  );
  if (input.discount > subtotal)
    throw new Error("The discount cannot exceed the subtotal.");
  const discount = round(input.discount);
  const tax = round(((subtotal - discount) * input.taxRate) / 100);
  const stamp = now();
  const sequence =
    Math.max(
      2400,
      ...d.orders.map((o) => Number(o.number.replace("NX-", "")) || 0),
    ) + 1;
  const order: Order = {
    id: input.id,
    createdAt: stamp,
    updatedAt: stamp,
    number: `NX-${String(sequence).padStart(5, "0")}`,
    customerId: customer.id,
    items,
    subtotal,
    discount,
    taxRate: input.taxRate,
    tax,
    total: round(subtotal - discount + tax),
    paymentStatus: input.paymentStatus,
    status: "Processing",
    notes: input.notes.trim(),
    source: input.source,
  };
  moveStock(d, order, -1);
  d.orders.unshift(order);
  addActivity(
    d,
    `Order ${order.number} created`,
    `${customer.name} · ${money(order.total)} · ${input.source.toLowerCase()}`,
    "order",
    order.id,
  );
  addNotification(
    d,
    `New order ${order.number}`,
    `${customer.name} placed an order for ${money(order.total)}.`,
    "New order",
    `/app/orders/${order.id}`,
    "success",
  );
  return order;
}
export async function createOrder(input: OrderInput) {
  return atomic((d) => {
    requirePermission(d, "commerce");
    return createOrderInDraft(d, input);
  });
}
export async function updateOrder(
  id: string,
  status: Order["status"],
  payment: Order["paymentStatus"],
) {
  const statusSchema = z.enum([
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ]);
  const paymentSchema = z.enum(["Paid", "Unpaid", "Refunded"]);
  if (
    !statusSchema.safeParse(status).success ||
    !paymentSchema.safeParse(payment).success
  )
    throw new Error("Select a valid order and payment status.");
  await atomic((d) => {
    requirePermission(d, "commerce");
    const order = d.orders.find((o) => o.id === id);
    if (!order) throw new Error("This order no longer exists.");
    const oldStatus = order.status;
    const oldPayment = order.paymentStatus;
    if (status === oldStatus && payment === oldPayment) return;
    if (status !== "Cancelled" && payment === "Refunded")
      throw new Error(
        "A refunded order must be cancelled. Reopening requires Paid or Unpaid status.",
      );
    if (status === "Cancelled" && oldStatus !== "Cancelled") {
      moveStock(d, order, 1);
      payment = oldPayment === "Paid" ? "Refunded" : "Unpaid";
    } else if (status !== "Cancelled" && oldStatus === "Cancelled")
      moveStock(d, order, -1);
    if (status === "Cancelled" && payment === "Paid") payment = "Refunded";
    order.status = status;
    order.paymentStatus = payment;
    order.updatedAt = now();
    addActivity(
      d,
      `Order ${order.number} updated`,
      `${oldStatus} → ${status} · ${payment}`,
      "order",
      id,
    );
    if (oldPayment !== payment)
      addNotification(
        d,
        `Payment ${payment.toLowerCase()}`,
        `${order.number} · ${money(order.total)}`,
        "Payment",
        `/app/orders/${id}`,
        "success",
      );
  });
}
