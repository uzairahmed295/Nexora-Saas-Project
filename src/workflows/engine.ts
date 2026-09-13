import type { Snapshot, Workflow } from "../db/schema";
import { atomic } from "../db/database";
import { addActivity, addNotification } from "../services/events";
import { requirePermission } from "../services/permissions";
import { customerSummary } from "../services/analytics";
import { workflowSchema } from "../db/schema";
import { now, uid } from "../utils/format";
/** Edge-triggered; persisted matches prevent repeating the same action on refresh. */
export function evaluateWorkflows(d: Snapshot, reference = new Date()) {
  let count = 0;
  for (const w of d.workflows.filter((w) => w.enabled)) {
    const matches: { id: string; name: string; customerId: string }[] =
      w.trigger === "low_stock"
        ? d.products
            .filter((p) => p.status === "Active" && p.stock < w.threshold)
            .map((p) => ({
              id: p.id,
              name: `${p.name}: ${p.stock} units available`,
              customerId: "",
            }))
        : w.trigger === "inactive_customer"
          ? d.customers
              .filter((c) => {
                const last = customerSummary(d, c.id).lastOrder || c.createdAt;
                return (
                  (reference.getTime() - Date.parse(last)) / 86400000 >
                  w.threshold
                );
              })
              .map((c) => ({
                id: c.id,
                name: `Follow up with ${c.name}`,
                customerId: c.id,
              }))
          : d.orders
              .filter((o) => o.status !== "Cancelled" && o.total > w.threshold)
              .map((o) => ({
                id: o.id,
                name: `Review ${o.number}: $${o.total.toFixed(2)}`,
                customerId: o.customerId,
              }));
    const fresh = matches.filter((m) => !w.matchedIds.includes(m.id));
    w.matchedIds = matches.map((m) => m.id);
    if (!fresh.length) continue;
    const stamp = reference.toISOString();
    if (w.action === "task") {
      for (const match of fresh)
        d.tasks.push({
          id: uid(),
          createdAt: stamp,
          updatedAt: stamp,
          title: match.name,
          customerId: match.customerId,
          workflowId: w.id,
          status: "Open",
          dueDate: new Date(reference.getTime() + 3 * 86400000).toISOString(),
        });
    } else
      addNotification(
        d,
        w.name,
        `${fresh.length} new match${fresh.length === 1 ? "" : "es"}. ${fresh
          .slice(0, 2)
          .map((m) => m.name)
          .join("; ")}`,
        "System",
        "/app/automation",
        w.trigger === "low_stock" ? "warning" : "notification",
      );
    w.history.unshift({
      id: uid(),
      at: stamp,
      description: `${fresh.length} ${w.action === "task" ? "follow-up task(s) created" : "record(s) included in notification"}.`,
      count: fresh.length,
    });
    w.history = w.history.slice(0, 100);
    w.updatedAt = stamp;
    addActivity(
      d,
      `Workflow: ${w.name}`,
      `${fresh.length} new matches · ${w.action}`,
      "workflow",
      w.id,
    );
    count += fresh.length;
  }
  return count;
}
export async function runWorkflows() {
  return atomic((d) => evaluateWorkflows(d));
}
export async function saveWorkflow(input: Partial<Workflow>, id?: string) {
  await atomic((d) => {
    requirePermission(d, "automation");
    const old = d.workflows.find((w) => w.id === id);
    if (id && !old) throw new Error("This workflow no longer exists.");
    const stamp = now();
    const reset =
      old &&
      (input.trigger !== old.trigger ||
        input.threshold !== old.threshold ||
        input.action !== old.action);
    const parsed = workflowSchema.safeParse({
      ...old,
      ...input,
      id: old?.id || uid(),
      createdAt: old?.createdAt || stamp,
      updatedAt: stamp,
      matchedIds: reset ? [] : old?.matchedIds || [],
      history: old?.history || [],
    });
    if (!parsed.success)
      throw new Error(
        "Check the workflow name, trigger, threshold and action.",
      );
    const w = parsed.data;
    if (old) d.workflows = d.workflows.map((x) => (x.id === w.id ? w : x));
    else d.workflows.push(w);
    addActivity(
      d,
      old ? "Workflow updated" : "Workflow created",
      w.name,
      "workflow",
      w.id,
    );
  });
}
export async function toggleWorkflow(id: string) {
  await atomic((d) => {
    requirePermission(d, "automation");
    const w = d.workflows.find((w) => w.id === id);
    if (w) {
      w.enabled = !w.enabled;
      w.updatedAt = now();
      addActivity(
        d,
        w.enabled ? "Workflow enabled" : "Workflow paused",
        w.name,
        "workflow",
        w.id,
      );
    }
  });
}
export async function deleteWorkflow(id: string) {
  await atomic((d) => {
    requirePermission(d, "automation");
    const w = d.workflows.find((w) => w.id === id);
    d.workflows = d.workflows.filter((w) => w.id !== id);
    d.tasks.forEach((t) => {
      if (t.workflowId === id) t.workflowId = "";
    });
    addActivity(d, "Workflow deleted", w?.name || "Workflow", "workflow", id);
  });
}
