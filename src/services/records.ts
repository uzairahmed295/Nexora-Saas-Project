import { atomic } from "../db/database";
import {
  customerSchema,
  productSchema,
  type Customer,
  type Product,
} from "../db/schema";
import { addActivity, addNotification } from "./events";
import { requirePermission } from "./permissions";
import { now, uid } from "../utils/format";
export async function saveCustomer(input: Partial<Customer>, id?: string) {
  return atomic((d) => {
    requirePermission(d, "commerce");
    const old = d.customers.find((c) => c.id === id);
    if (id && !old) throw new Error("This customer no longer exists.");
    const stamp = now();
    const parsed = customerSchema.safeParse({
      ...old,
      ...input,
      id: old?.id || uid(),
      createdAt: old?.createdAt || stamp,
      updatedAt: stamp,
    });
    if (!parsed.success)
      throw new Error(
        "Check the customer details. A name and valid email are required.",
      );
    const c = parsed.data;
    if (
      d.customers.some(
        (x) => x.id !== c.id && x.email.toLowerCase() === c.email.toLowerCase(),
      )
    )
      throw new Error("A customer with this email already exists.");
    if (old) d.customers = d.customers.map((x) => (x.id === c.id ? c : x));
    else d.customers.push(c);
    addActivity(
      d,
      old ? "Customer updated" : "Customer added",
      `${c.name} · ${c.company || c.email}`,
      "customer",
      c.id,
    );
    if (!old)
      addNotification(
        d,
        "New customer added",
        `${c.name} joined your customer directory.`,
        "Customer",
        `/app/customers/${c.id}`,
        "success",
      );
    return c;
  });
}
export async function deleteCustomer(id: string) {
  await atomic((d) => {
    requirePermission(d, "delete");
    const c = d.customers.find((x) => x.id === id);
    if (!c) throw new Error("This customer no longer exists.");
    if (d.orders.some((o) => o.customerId === id))
      throw new Error(
        "This customer has order history. Set their status to Inactive to preserve financial records.",
      );
    d.customers = d.customers.filter((x) => x.id !== id);
    d.tasks = d.tasks.filter((t) => t.customerId !== id);
    addActivity(d, "Customer deleted", c.name, "customer", id);
  });
}
export async function saveProduct(input: Partial<Product>, id?: string) {
  return atomic((d) => {
    requirePermission(d, "commerce");
    const old = d.products.find((p) => p.id === id);
    if (id && !old) throw new Error("This product no longer exists.");
    const stamp = now();
    const parsed = productSchema.safeParse({
      ...old,
      ...input,
      id: old?.id || uid(),
      createdAt: old?.createdAt || stamp,
      updatedAt: stamp,
    });
    if (!parsed.success)
      throw new Error(
        "Check product details, prices, and non-negative whole-number stock.",
      );
    const p = parsed.data;
    if (
      d.products.some(
        (x) => x.id !== p.id && x.sku.toLowerCase() === p.sku.toLowerCase(),
      )
    )
      throw new Error("This SKU is already in use.");
    if (old) d.products = d.products.map((x) => (x.id === p.id ? p : x));
    else d.products.push(p);
    if (
      p.stock <= p.lowStockThreshold &&
      (!old || old.stock > old.lowStockThreshold)
    )
      addNotification(
        d,
        "Inventory needs attention",
        `${p.name} has ${p.stock} units remaining.`,
        "Low inventory",
        "/app/inventory",
        "warning",
      );
    addActivity(
      d,
      old ? "Product updated" : "Product added",
      `${p.name} · ${p.sku}`,
      "product",
      p.id,
    );
    return p;
  });
}
export async function deleteProduct(id: string) {
  await atomic((d) => {
    requirePermission(d, "delete");
    const p = d.products.find((x) => x.id === id);
    if (!p) throw new Error("This product no longer exists.");
    if (d.orders.some((o) => o.items.some((i) => i.productId === id)))
      throw new Error(
        "This product has order history. Archive it to preserve historical reports.",
      );
    d.products = d.products.filter((x) => x.id !== id);
    addActivity(d, "Product deleted", p.name, "product", id);
  });
}
export async function adjustStock(
  id: string,
  quantity: number,
  reason: string,
) {
  if (!Number.isInteger(quantity) || !quantity)
    throw new Error("Enter a non-zero whole-number adjustment.");
  if (!reason.trim() || reason.length > 500)
    throw new Error("Add a short reason for this adjustment.");
  await atomic((d) => {
    requirePermission(d, "commerce");
    const p = d.products.find((x) => x.id === id);
    if (!p) throw new Error("This product no longer exists.");
    const before = p.stock;
    const after = before + quantity;
    if (after < 0 || after > 1e6)
      throw new Error("The resulting stock must be between 0 and 1,000,000.");
    p.stock = after;
    p.updatedAt = now();
    addActivity(
      d,
      "Stock adjusted",
      `${p.name}: ${before} → ${after}. ${reason.trim()}`,
      "product",
      id,
    );
    if (after <= p.lowStockThreshold && before > p.lowStockThreshold)
      addNotification(
        d,
        "Stock crossed its threshold",
        `${p.name} has ${after} units remaining.`,
        "Low inventory",
        "/app/inventory",
        "warning",
      );
  });
}
