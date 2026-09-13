import { atomic } from "../db/database";
import { requirePermission } from "./permissions";
import { addActivity, addNotification } from "./events";
import { now, uid } from "../utils/format";
export async function generateInvoice(orderId: string) {
  return atomic((d) => {
    requirePermission(d, "commerce");
    const existing = d.invoices.find((i) => i.orderId === orderId);
    if (existing) return existing;
    const o = d.orders.find((o) => o.id === orderId);
    if (!o) throw new Error("The order was not found.");
    if (o.status === "Cancelled")
      throw new Error("An invoice cannot be issued for a cancelled order.");
    const c = d.customers.find((c) => c.id === o.customerId)!;
    const s = d.settings[0];
    const stamp = now();
    const sequence =
      Math.max(
        1080,
        ...d.invoices.map((i) => Number(i.number.replace("INV-", "")) || 0),
      ) + 1;
    const invoice = {
      id: uid(),
      createdAt: stamp,
      updatedAt: stamp,
      number: `INV-${String(sequence).padStart(5, "0")}`,
      orderId: o.id,
      customer: {
        name: c.name,
        email: c.email,
        address: c.address,
        company: c.company,
      },
      company: {
        name: s.companyName,
        email: s.companyEmail,
        address: s.companyAddress,
      },
      items: structuredClone(o.items),
      subtotal: o.subtotal,
      discount: o.discount,
      taxRate: o.taxRate,
      tax: o.tax,
      total: o.total,
      dueDate: new Date(Date.parse(stamp) + 30 * 86400000).toISOString(),
    };
    d.invoices.unshift(invoice);
    addActivity(
      d,
      `Invoice ${invoice.number} created`,
      `Issued for order ${o.number}`,
      "invoice",
      invoice.id,
    );
    addNotification(
      d,
      `Invoice ${invoice.number} generated`,
      `Ready for ${c.name}.`,
      "Success",
      `/app/invoices/${invoice.id}`,
      "success",
    );
    return invoice;
  });
}
