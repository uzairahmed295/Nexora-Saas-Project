import { z } from "zod";
const text = z.string().trim().min(1).max(200);
const iso = z.string().datetime();
const base = { id: text, createdAt: iso, updatedAt: iso };
const amount = z.number().finite().min(0).max(1e9);
export const userSchema = z.object({
  ...base,
  name: text,
  email: z.string().email().max(200),
  role: z.enum(["Owner", "Admin", "Manager", "Employee"]),
  status: z.enum(["Active", "Inactive"]),
  lastActive: iso,
});
export const customerSchema = z.object({
  ...base,
  name: text,
  email: z.string().email().max(200),
  company: z.string().max(200),
  phone: z.string().max(40),
  address: z.string().max(500),
  status: z.enum(["Active", "Lead", "Inactive"]),
  tags: z.array(z.string().max(40)).max(12),
  notes: z.string().max(5000),
});
export const productSchema = z.object({
  ...base,
  name: text,
  description: z.string().max(5000).default(""),
  sku: z.string().trim().min(1).max(50),
  category: text,
  price: amount,
  cost: amount,
  stock: z.number().int().min(0).max(1e6),
  lowStockThreshold: z.number().int().min(0).max(1e5),
  status: z.enum(["Active", "Archived"]),
  image: z
    .string()
    .max(1500000)
    .refine(
      (s) =>
        s === "" ||
        /^\/images\/[a-z0-9-]+\.(webp|png|jpg)$/.test(s) ||
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s),
      "Use a local JPEG, PNG or WebP image.",
    ),
});
export const itemSchema = z.object({
  productId: text,
  name: text,
  sku: text,
  category: text,
  quantity: z.number().int().min(1).max(10000),
  unitPrice: amount,
  unitCost: amount,
});
export const orderSchema = z.object({
  ...base,
  number: text,
  customerId: text,
  items: z.array(itemSchema).min(1).max(100),
  subtotal: amount,
  discount: amount,
  taxRate: z.number().min(0).max(100),
  tax: amount,
  total: amount,
  paymentStatus: z.enum(["Paid", "Unpaid", "Refunded"]),
  status: z.enum([
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ]),
  notes: z.string().max(3000),
  source: z.enum(["Manual", "Demo", "Simulation"]),
});
export const invoiceSchema = z.object({
  ...base,
  number: text,
  orderId: text,
  customer: z.object({
    name: text,
    email: z.string().email(),
    address: z.string().max(500),
    company: z.string().max(200),
  }),
  company: z.object({
    name: text,
    email: z.string().email(),
    address: z.string().max(500),
  }),
  items: z.array(itemSchema).min(1).max(100),
  subtotal: amount,
  discount: amount,
  taxRate: z.number().min(0).max(100),
  tax: amount,
  total: amount,
  dueDate: iso,
});
export const notificationSchema = z.object({
  ...base,
  title: text,
  message: z.string().max(1000),
  type: z.enum([
    "New order",
    "Low inventory",
    "Payment",
    "Customer",
    "Team activity",
    "AI insight",
    "Warning",
    "Success",
    "System",
  ]),
  read: z.boolean(),
  href: z
    .string()
    .max(150)
    .refine((s) => /^\/app\/[a-z0-9/-]+$/.test(s)),
  sound: z.enum(["success", "notification", "warning", "error", "ai"]),
});
export const activitySchema = z.object({
  ...base,
  title: text,
  description: z.string().max(1000),
  entityType: z.enum([
    "customer",
    "product",
    "order",
    "invoice",
    "team",
    "workflow",
    "system",
    "ai",
  ]),
  entityId: z.string().max(200),
  actor: text,
});
export const taskSchema = z.object({
  ...base,
  title: text,
  customerId: z.string().max(200),
  workflowId: z.string().max(200),
  status: z.enum(["Open", "Done"]),
  dueDate: iso,
});
export const workflowSchema = z.object({
  ...base,
  name: text,
  trigger: z.enum(["low_stock", "inactive_customer", "large_order"]),
  threshold: z.number().finite().min(1).max(1e6),
  action: z.enum(["notification", "task"]),
  enabled: z.boolean(),
  matchedIds: z.array(z.string()).max(10000),
  history: z
    .array(
      z.object({
        id: text,
        at: iso,
        description: z.string().max(1000),
        count: z.number().int().min(0),
      }),
    )
    .max(200),
});
export const conversationSchema = z.object({
  ...base,
  title: text,
  messages: z
    .array(
      z.object({
        id: text,
        role: z.enum(["user", "assistant"]),
        text: z.string().max(20000),
        createdAt: iso,
      }),
    )
    .max(100),
});
export const settingsSchema = z.object({
  ...base,
  companyName: text,
  companyEmail: z.string().email(),
  companyAddress: z.string().max(500),
  currentUserId: text,
  onboarded: z.boolean(),
  theme: z.enum(["light", "dark"]),
  sounds: z.boolean(),
  browserNotifications: z.boolean(),
  simulation: z.boolean(),
  demoMode: z.boolean(),
  aiConsent: z.boolean(),
  currency: z.literal("USD"),
  seedDate: iso,
  simulationSequence: z.number().int().min(0),
});
export const schemas = {
  users: userSchema,
  customers: customerSchema,
  products: productSchema,
  orders: orderSchema,
  invoices: invoiceSchema,
  notifications: notificationSchema,
  activities: activitySchema,
  workflows: workflowSchema,
  tasks: taskSchema,
  aiConversations: conversationSchema,
  settings: settingsSchema,
};
export const stores = Object.keys(schemas) as (keyof typeof schemas)[];
export type StoreName = keyof typeof schemas;
export type Entities = { [K in StoreName]: z.infer<(typeof schemas)[K]> };
export type Snapshot = { [K in StoreName]: Entities[K][] };
export type Customer = Entities["customers"];
export type Product = Entities["products"];
export type Order = Entities["orders"];
export type Invoice = Entities["invoices"];
export type User = Entities["users"];
export type Workflow = Entities["workflows"];
export type Settings = Entities["settings"];
export type Conversation = Entities["aiConversations"];
export const emptySnapshot = () =>
  Object.fromEntries(stores.map((s) => [s, []])) as unknown as Snapshot;
