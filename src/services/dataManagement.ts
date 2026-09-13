import { z } from "zod";
import { atomic, readSnapshot } from "../db/database";
import { schemas, stores, emptySnapshot, type Snapshot } from "../db/schema";
import { buildDemo, defaultSettings } from "../db/seed";
import { requirePermission } from "./permissions";
import { addActivity } from "./events";
import { round, now } from "../utils/format";
export function validateBackup(value: unknown): Snapshot {
  const envelope = z
    .object({
      format: z.literal("nexora-backup"),
      version: z.literal(1),
      exportedAt: z.string().datetime(),
      data: z.record(z.unknown()),
    })
    .strict()
    .safeParse(value);
  if (!envelope.success)
    throw new Error("This is not a supported NEXORA backup (version 1).");
  const d = emptySnapshot();
  for (const name of stores) {
    const result = z
      .array(schemas[name])
      .max(name === "settings" ? 1 : 30000)
      .safeParse(envelope.data.data[name]);
    if (!result.success)
      throw new Error(`The backup contains invalid ${name} records.`);
    (d[name] as unknown[]) = result.data;
    const ids = d[name].map((r) => r.id);
    if (new Set(ids).size !== ids.length)
      throw new Error(`Duplicate ${name} IDs in this backup.`);
  }
  if (d.settings.length !== 1 || d.settings[0].id !== "workspace")
    throw new Error("The backup needs one valid workspace.");
  const current = d.users.find((u) => u.id === d.settings[0].currentUserId);
  if (
    !current ||
    current.status !== "Active" ||
    !d.users.some((u) => u.role === "Owner" && u.status === "Active")
  )
    throw new Error("The backup needs an active owner and local profile.");
  const customerIds = new Set(d.customers.map((c) => c.id)),
    productIds = new Set(d.products.map((p) => p.id)),
    orderIds = new Set(d.orders.map((o) => o.id)),
    workflowIds = new Set(d.workflows.map((w) => w.id));
  for (const key of ["sku"] as const)
    if (
      new Set(d.products.map((p) => p[key].toLowerCase())).size !==
      d.products.length
    )
      throw new Error("The backup contains duplicate SKUs.");
  if (
    new Set(d.customers.map((c) => c.email.toLowerCase())).size !==
    d.customers.length
  )
    throw new Error("The backup contains duplicate customer emails.");
  if (
    new Set(d.users.map((c) => c.email.toLowerCase())).size !== d.users.length
  )
    throw new Error("The backup contains duplicate team emails.");
  if (
    new Set(d.orders.map((o) => o.number)).size !== d.orders.length ||
    new Set(d.invoices.map((i) => i.number)).size !== d.invoices.length ||
    new Set(d.invoices.map((i) => i.orderId)).size !== d.invoices.length
  )
    throw new Error("The backup contains duplicate order or invoice numbers.");
  for (const o of d.orders) {
    if (
      !customerIds.has(o.customerId) ||
      o.items.some((i) => !productIds.has(i.productId))
    )
      throw new Error("An order references a missing customer or product.");
    if (new Set(o.items.map((i) => i.productId)).size !== o.items.length)
      throw new Error("An order contains duplicate product lines.");
    const subtotal = round(
      o.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    );
    const tax = round(((subtotal - o.discount) * o.taxRate) / 100);
    if (
      o.discount > subtotal ||
      o.subtotal !== subtotal ||
      o.tax !== tax ||
      o.total !== round(subtotal - o.discount + tax)
    )
      throw new Error("An order has inconsistent financial totals.");
    if (
      (o.status === "Cancelled" && o.paymentStatus === "Paid") ||
      (o.status !== "Cancelled" && o.paymentStatus === "Refunded")
    )
      throw new Error("An order has an inconsistent payment status.");
  }
  for (const i of d.invoices) {
    if (!orderIds.has(i.orderId))
      throw new Error("An invoice references a missing order.");
    const o = d.orders.find((o) => o.id === i.orderId)!;
    if (
      JSON.stringify(i.items) !== JSON.stringify(o.items) ||
      i.total !== o.total ||
      i.subtotal !== o.subtotal ||
      i.discount !== o.discount ||
      i.tax !== o.tax ||
      i.taxRate !== o.taxRate
    )
      throw new Error("An invoice does not match its order.");
  }
  for (const t of d.tasks)
    if (
      (t.customerId && !customerIds.has(t.customerId)) ||
      (t.workflowId && !workflowIds.has(t.workflowId))
    )
      throw new Error("A task references a missing customer or workflow.");
  d.settings[0].simulation = false;
  d.settings[0].browserNotifications = false;
  d.settings[0].aiConsent = false;
  return d;
}
export async function exportBackup() {
  const data = await readSnapshot();
  const envelope = {
    format: "nexora-backup",
    version: 1,
    exportedAt: now(),
    data,
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexora-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importBackup(draft: Snapshot) {
  await atomic((d) => {
    requirePermission(d, "data");
    for (const key of stores) (d[key] as unknown[]) = draft[key];
    addActivity(
      d,
      "Backup imported",
      "Workspace data restored from a JSON backup.",
      "system",
    );
  });
}
export async function resetDemo() {
  await atomic((d) => {
    requirePermission(d, "data");
    const settings = d.settings[0];
    const seed = buildDemo();
    seed.settings[0].theme = settings.theme;
    seed.settings[0].onboarded = true;
    for (const key of stores) (d[key] as unknown[]) = seed[key];
  });
}
export async function clearLocalData() {
  await atomic((d) => {
    requirePermission(d, "data");
    const current = d.users.find((u) => u.id === d.settings[0].currentUserId)!;
    const old = d.settings[0];
    for (const key of stores) (d[key] as unknown[]) = [];
    d.users = [{ ...current, role: "Owner", status: "Active" }];
    d.settings = [
      {
        ...defaultSettings(),
        currentUserId: current.id,
        companyName: old.companyName,
        companyEmail: old.companyEmail,
        companyAddress: old.companyAddress,
        onboarded: true,
        demoMode: false,
        theme: old.theme,
      },
    ];
  });
}
