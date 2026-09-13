import { atomic } from "./database";
import {
  emptySnapshot,
  type Snapshot,
  type Order,
  type Settings,
} from "./schema";
import { round } from "../utils/format";
const names = [
  "Ayesha Khan",
  "Daniel Carter",
  "Sofia Martinez",
  "Omar Farooq",
  "Emma Wilson",
  "Ali Hassan",
  "Olivia Chen",
  "Noah Williams",
  "Fatima Ahmed",
  "James Mitchell",
  "Zara Malik",
  "Liam Anderson",
  "Mia Thompson",
  "Hassan Raza",
  "Amelia Taylor",
  "Ethan Brooks",
  "Maryam Sheikh",
  "Lucas Morgan",
  "Isabella Rossi",
  "Ahmed Siddiqui",
  "Harper Evans",
  "Arjun Mehta",
  "Grace Park",
  "Bilal Hussain",
  "Chloe Bennett",
  "Henry Clark",
  "Amina Yusuf",
  "Jack Robinson",
  "Lily Campbell",
  "Usman Tariq",
  "Ella Richardson",
  "Leo Foster",
  "Sarah Mahmood",
  "Benjamin Lewis",
  "Nora Adams",
  "Ibrahim Ali",
  "Ava Peterson",
  "Mason Hughes",
  "Hannah Kim",
  "Hamza Iqbal",
  "Charlotte Reed",
  "Oliver Bell",
  "Sara Abbas",
  "William Cooper",
  "Emily Watson",
  "Yusuf Rahman",
  "Abigail Scott",
  "Sebastian Young",
  "Layla Noor",
  "Samuel Wright",
];
const companies = [
  "Forma Studio",
  "Northstar Design",
  "Atelier Co.",
  "Cedar & Stone",
  "Arc Collective",
  "Fieldwork",
  "Studio Haven",
  "Offset Creative",
  "Kindred Works",
  "Evergreen Labs",
];
const catalog: [string, string, number, number][] = [
  ["Arc Desk Lamp", "Lighting", 129, 57],
  ["Halo Pendant", "Lighting", 249, 116],
  ["Lumen Task Light", "Lighting", 89, 38],
  ["Forma Wall Sconce", "Lighting", 119, 52],
  ["Sol Floor Lamp", "Lighting", 199, 85],
  ["Nova Ceiling Light", "Lighting", 179, 74],
  ["Oak Standing Desk", "Furniture", 649, 318],
  ["Ergo Studio Chair", "Furniture", 389, 178],
  ["Modular Shelf", "Furniture", 279, 121],
  ["Walnut Side Table", "Furniture", 189, 86],
  ["Studio Bench", "Furniture", 329, 148],
  ["Flex Monitor Stand", "Furniture", 89, 37],
  ["Felt Desk Mat", "Accessories", 39, 12],
  ["Aluminum Pen Tray", "Accessories", 29, 8],
  ["Cable Organizer", "Accessories", 19, 5],
  ["Ceramic Desk Cup", "Accessories", 24, 7],
  ["Leather Laptop Sleeve", "Accessories", 69, 24],
  ["Cork Desk Pad", "Accessories", 34, 10],
  ["Studio Headphones", "Electronics", 179, 78],
  ["Wireless Keyboard", "Electronics", 99, 41],
  ["Precision Mouse", "Electronics", 59, 22],
  ["USB-C Workstation", "Electronics", 139, 62],
  ["Focus Speaker", "Electronics", 89, 37],
  ["HD Conference Camera", "Electronics", 129, 54],
  ["Linen Notebook", "Stationery", 22, 6],
  ["Weekly Planner", "Stationery", 28, 8],
  ["Archive Folder Set", "Stationery", 18, 4],
  ["Brass Ballpoint Pen", "Stationery", 32, 9],
  ["Sketchbook A4", "Stationery", 24, 6],
  ["Meeting Journal", "Stationery", 26, 7],
];
export function defaultSettings(anchor = new Date().toISOString()): Settings {
  return {
    id: "workspace",
    createdAt: anchor,
    updatedAt: anchor,
    companyName: "Nexora Studio",
    companyEmail: "hello@nexora.example",
    companyAddress: "28 Design Avenue, Karachi, Pakistan",
    currentUserId: "user-owner",
    onboarded: false,
    theme: "light",
    sounds: true,
    browserNotifications: false,
    simulation: false,
    demoMode: true,
    aiConsent: false,
    currency: "USD",
    seedDate: anchor,
    simulationSequence: 0,
  };
}
/** Reproducible for a given UTC reference date. No random seed or network request. */
export function buildDemo(reference = new Date()): Snapshot {
  const d = emptySnapshot();
  const anchor = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
      12,
    ),
  );
  const at = (days: number, hours = 0) =>
    new Date(
      anchor.getTime() - days * 86400000 - hours * 3600000,
    ).toISOString();
  const base = (id: string, days = 0) => ({
    id,
    createdAt: at(days),
    updatedAt: at(days),
  });
  d.settings = [defaultSettings(anchor.toISOString())];
  d.users = [
    ["user-owner", "Uzair Ahmed", "uzair@nexora.example", "Owner"],
    ["user-2", "Ayesha Khan", "ayesha@nexora.example", "Admin"],
    ["user-3", "Daniel Carter", "daniel@nexora.example", "Manager"],
    ["user-4", "Sofia Martinez", "sofia@nexora.example", "Employee"],
    ["user-5", "Omar Farooq", "omar@nexora.example", "Employee"],
  ].map(([id, name, email, role], i) => ({
    ...base(id, 180),
    name,
    email,
    role: role as "Owner",
    status: "Active",
    lastActive: at(0, i),
  }));
  d.customers = names.map((name, i) => ({
    ...base(`customer-${i + 1}`, Math.max(1, 210 - i * 4)),
    name,
    email: `${name.toLowerCase().replaceAll(" ", ".")}@example.com`,
    company: companies[i % 10],
    phone: `+1 202 555 ${String(100 + i).padStart(4, "0")}`,
    address: `${24 + i * 3} ${["Maple Street", "Cedar Lane", "Park Avenue", "Willow Road", "Oak Street"][i % 5]}, ${["Austin", "Seattle", "Karachi", "Lahore", "London"][i % 5]}`,
    status: i > 43 ? "Lead" : i > 38 ? "Inactive" : "Active",
    tags: [
      ["Design partner", "Wholesale", "Retail", "Priority", "New customer"][
        i % 5
      ],
    ],
    notes: [
      "Prefers warm lighting and natural materials.",
      "Request delivery confirmation before dispatch.",
      "Interested in a quarterly workspace refresh.",
      "Send itemized invoices with every order.",
      "Follow up about the next studio opening.",
    ][i % 5],
  }));
  d.products = catalog.map(([name, category, price, cost], i) => ({
    ...base(`product-${i + 1}`, 240),
    name,
    category,
    price,
    cost,
    description: `${name} from our ${category.toLowerCase()} collection. Selected for everyday studio and office use.`,
    sku: `NX-${category.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
    stock:
      i === 9 || i === 20
        ? 0
        : i % 7 === 0
          ? 4 + (i % 4)
          : 25 + ((i * 17) % 140),
    lowStockThreshold: 10,
    status: "Active",
    image: `/images/${category.toLowerCase()}.jpg`,
  }));
  d.orders = Array.from({ length: 120 }, (_, i) => {
    const days =
      i < 72
        ? Math.floor((i * 30) / 72)
        : 30 + Math.floor(((i - 72) * 100) / 48);
    const customer = d.customers[(i * 7) % 39];
    const actualDays = Math.min(
      days,
      Math.max(
        0,
        Math.floor(
          (anchor.getTime() - Date.parse(customer.createdAt)) / 86400000,
        ) - 1,
      ),
    );
    const items = [0, 1, ...(i % 4 === 0 ? [2] : [])].map((_, j) => {
      const p = d.products[(i * 7 + j * 11) % 30];
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        quantity: 1 + ((i + j) % 3),
        unitPrice: p.price,
        unitCost: p.cost,
      };
    });
    const subtotal = round(
      items.reduce((s, p) => s + p.quantity * p.unitPrice, 0),
    );
    const discount = i % 8 === 0 ? round(subtotal * 0.05) : 0;
    const tax = round((subtotal - discount) * 0.08);
    const status: Order["status"] =
      i % 17 === 0
        ? "Cancelled"
        : i < 4
          ? "Pending"
          : i < 9
            ? "Processing"
            : i < 17
              ? "Shipped"
              : "Delivered";
    return {
      ...base(`order-${i + 1}`, actualDays),
      number: `NX-${String(2400 - i).padStart(5, "0")}`,
      customerId: customer.id,
      items,
      subtotal,
      discount,
      taxRate: 8,
      tax,
      total: round(subtotal - discount + tax),
      paymentStatus:
        status === "Cancelled" ? "Refunded" : i % 11 === 0 ? "Unpaid" : "Paid",
      status,
      notes: i % 5 === 0 ? "Please package fragile items separately." : "",
      source: "Demo",
    };
  });
  d.invoices = d.orders.slice(0, 60).map((o, i) => {
    const customer = d.customers.find((c) => c.id === o.customerId)!;
    return {
      ...base(`invoice-${i + 1}`),
      createdAt: o.createdAt,
      number: `INV-${String(1080 - i).padStart(5, "0")}`,
      orderId: o.id,
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address,
        company: customer.company,
      },
      company: {
        name: d.settings[0].companyName,
        email: d.settings[0].companyEmail,
        address: d.settings[0].companyAddress,
      },
      items: o.items,
      subtotal: o.subtotal,
      discount: o.discount,
      taxRate: o.taxRate,
      tax: o.tax,
      total: o.total,
      dueDate: new Date(Date.parse(o.createdAt) + 30 * 86400000).toISOString(),
    };
  });
  d.activities = d.orders.map((o, i) => ({
    ...base(`activity-${i + 1}`),
    createdAt: o.createdAt,
    title: `Order ${o.number} ${o.status === "Cancelled" ? "cancelled" : "received"}`,
    description: `${d.customers.find((c) => c.id === o.customerId)?.name} · ${o.items.reduce((s, x) => s + x.quantity, 0)} items · ${o.paymentStatus.toLowerCase()}`,
    entityType: "order",
    entityId: o.id,
    actor: i % 3 === 0 ? "Ayesha Khan" : "Uzair Ahmed",
  }));
  d.notifications = Array.from({ length: 24 }, (_, i) => {
    const o = d.orders[i];
    const low = d.products.filter((p) => p.stock <= p.lowStockThreshold)[i % 6];
    return {
      ...base(`notification-${i + 1}`),
      createdAt: at(Math.floor(i / 6), i % 6),
      title:
        i % 3 === 0
          ? `${low.name} needs attention`
          : i % 3 === 1
            ? `New order ${o.number}`
            : `Payment received for ${o.number}`,
      message:
        i % 3 === 0
          ? `${low.stock} units available. Review your inventory.`
          : `${d.customers.find((c) => c.id === o.customerId)?.name} · View the order for details.`,
      type:
        i % 3 === 0 ? "Low inventory" : i % 3 === 1 ? "New order" : "Payment",
      read: i > 7,
      href: i % 3 === 0 ? "/app/inventory" : `/app/orders/${o.id}`,
      sound: i % 3 === 0 ? "warning" : "notification",
    };
  });
  d.workflows = [
    ["Restock alerts", "low_stock", 10, "notification"],
    ["Reconnect with customers", "inactive_customer", 60, "task"],
    ["High-value order review", "large_order", 500, "notification"],
    ["Priority replenishment", "low_stock", 3, "task"],
    ["Quarterly customer check-in", "inactive_customer", 90, "task"],
  ].map(([name, trigger, threshold, action], i) => ({
    ...base(`workflow-${i + 1}`, 60),
    name: String(name),
    trigger: trigger as "low_stock",
    threshold: Number(threshold),
    action: action as "task",
    enabled: i < 3,
    matchedIds: [],
    history: [],
  }));
  d.tasks = Array.from({ length: 10 }, (_, i) => ({
    ...base(`task-${i + 1}`, i),
    title: [
      "Review spring studio proposal",
      "Confirm delivery preferences",
      "Discuss quarterly replenishment",
      "Follow up on workspace refresh",
      "Share updated product selection",
    ][i % 5],
    customerId: d.customers[39 + (i % 10)].id,
    workflowId: "workflow-2",
    status: i > 7 ? "Done" : "Open",
    dueDate: at(-i % 5),
  }));
  return d;
}
export async function initialize() {
  await atomic((d) => {
    if (d.settings.length) return;
    const seed = buildDemo();
    for (const key of Object.keys(seed) as (keyof Snapshot)[])
      (d[key] as unknown[]) = seed[key];
  });
}
