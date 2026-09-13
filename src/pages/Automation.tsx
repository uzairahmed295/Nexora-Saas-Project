import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Workflow as WorkflowIcon,
  ArrowRight,
  Zap,
  Pencil,
  Trash2,
  History,
  Play,
  Check,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { useAction } from "../components/Feedback";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  Field,
  Form,
  Modal,
  PageHeader,
} from "../components/ui";
import type { Workflow } from "../db/schema";
import {
  saveWorkflow,
  toggleWorkflow,
  deleteWorkflow,
  runWorkflows,
} from "../workflows/engine";
import { atomic } from "../db/database";
import { can, requirePermission } from "../services/permissions";
import { date, relativeTime } from "../utils/format";
const triggerText = {
  low_stock: "Inventory below",
  inactive_customer: "Customer inactive for",
  large_order: "Order total above",
};
export default function Automation() {
  const { data } = useWorkspace();
  const [edit, setEdit] = useState<Workflow | null | undefined>();
  const [remove, setRemove] = useState<Workflow>();
  const [history, setHistory] = useState<string>();
  const [tab, setTab] = useState("workflows");
  const { busy, run } = useAction();
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  const allowed = can(role, "automation");
  const current = data.workflows.find((w) => w.id === history);
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="A little less busywork"
        title="Automation"
        description="Let your workspace take care of the follow-through."
        actions={
          allowed && (
            <>
              <Button
                busy={busy}
                onClick={() =>
                  void run(async () => {
                    await runWorkflows();
                  }, "Workflows checked. New matches were processed.")
                }
              >
                <Play size={15} />
                Run checks
              </Button>
              <Button variant="primary" onClick={() => setEdit(null)}>
                <Plus size={16} />
                Create workflow
              </Button>
            </>
          )
        }
      />
      <div className="info-banner">
        <Zap size={17} />
        <span>
          Workflows run on this device while NEXORA is open. Conditions are
          rechecked on changes and every minute.
        </span>
      </div>
      <div className="order-status-tabs">
        <button
          className={tab === "workflows" ? "selected" : ""}
          onClick={() => setTab("workflows")}
        >
          Workflows<span>{data.workflows.length}</span>
        </button>
        <button
          className={tab === "tasks" ? "selected" : ""}
          onClick={() => setTab("tasks")}
        >
          Follow-up tasks
          <span>{data.tasks.filter((t) => t.status === "Open").length}</span>
        </button>
      </div>
      {tab === "workflows" ? (
        <div className="workflow-grid">
          {data.workflows.map((w) => (
            <Card key={w.id}>
              <div className="workflow-top">
                <span className="workflow-icon">
                  <WorkflowIcon size={20} />
                </span>
                <Badge tone={w.enabled ? "active" : "inactive"}>
                  {w.enabled ? "Enabled" : "Paused"}
                </Badge>
                {allowed && (
                  <button
                    role="switch"
                    aria-checked={w.enabled}
                    className={`switch ${w.enabled ? "on" : ""}`}
                    aria-label={`Enable ${w.name}`}
                    disabled={busy}
                    onClick={() => void run(() => toggleWorkflow(w.id))}
                  >
                    <span />
                  </button>
                )}
              </div>
              <div className="workflow-body">
                <h2>{w.name}</h2>
                <div className="workflow-condition">
                  <span>WHEN</span>
                  <p>
                    {triggerText[w.trigger]}{" "}
                    <strong>
                      {w.threshold}
                      {w.trigger === "inactive_customer"
                        ? " days"
                        : w.trigger === "low_stock"
                          ? " units"
                          : " USD"}
                    </strong>
                  </p>
                  <ArrowRight size={15} />
                </div>
                <div className="workflow-condition">
                  <span>THEN</span>
                  <p>
                    {w.action === "task"
                      ? "Create a follow-up task"
                      : "Send an in-app notification"}
                  </p>
                </div>
              </div>
              <div className="workflow-footer">
                <button
                  className="btn ghost small"
                  onClick={() => setHistory(w.id)}
                >
                  <History size={14} />
                  {w.history.length} executions
                </button>
                <div>
                  {allowed && (
                    <>
                      <button
                        className="icon-btn"
                        aria-label={`Edit ${w.name}`}
                        onClick={() => setEdit(w)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Delete ${w.name}`}
                        onClick={() => setRemove(w)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {!data.workflows.length && (
            <Empty
              title="Create your first workflow"
              description="Turn recurring checks into consistent follow-through."
              action={
                allowed && (
                  <Button onClick={() => setEdit(null)}>Create workflow</Button>
                )
              }
            />
          )}
        </div>
      ) : (
        <Card
          title="Follow-up tasks"
          subtitle="Tasks created by your workspace and workflow rules"
        >
          <div className="task-list">
            {[...data.tasks]
              .sort(
                (a, b) =>
                  a.status.localeCompare(b.status) ||
                  b.createdAt.localeCompare(a.createdAt),
              )
              .map((t) => (
                <div key={t.id}>
                  <button
                    aria-label={`${t.status === "Done" ? "Reopen" : "Complete"} ${t.title}`}
                    className={`task-check ${t.status === "Done" ? "done" : ""}`}
                    disabled={!allowed || busy}
                    onClick={() =>
                      void run(() =>
                        atomic((d) => {
                          requirePermission(d, "automation");
                          const task = d.tasks.find((x) => x.id === t.id);
                          if (task)
                            task.status =
                              task.status === "Open" ? "Done" : "Open";
                        }),
                      )
                    }
                  >
                    {t.status === "Done" && <Check size={15} />}
                  </button>
                  <div>
                    <h3
                      className={
                        t.status === "Done" ? "line-through muted" : ""
                      }
                    >
                      {t.title}
                    </h3>
                    <p>
                      Due {date(t.dueDate)}{" "}
                      {t.customerId && (
                        <>
                          ·{" "}
                          <Link
                            className="link"
                            to={`/app/customers/${t.customerId}`}
                          >
                            Customer details
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <Badge>{t.status}</Badge>
                </div>
              ))}
            {!data.tasks.length && (
              <Empty
                title="No follow-up tasks"
                description="Workflow tasks will appear here."
              />
            )}
          </div>
        </Card>
      )}
      {edit !== undefined && (
        <WorkflowForm
          workflow={edit || undefined}
          onClose={() => setEdit(undefined)}
        />
      )}
      {remove && (
        <Confirm
          title="Delete workflow?"
          description={`Remove ${remove.name} and its execution history? Existing follow-up tasks will be preserved.`}
          onClose={() => setRemove(undefined)}
          onConfirm={() => deleteWorkflow(remove.id)}
        />
      )}
      {current && (
        <Modal
          title={`${current.name} · History`}
          onClose={() => setHistory(undefined)}
        >
          {current.history.length ? (
            <div className="activity-list">
              {current.history.map((h) => (
                <div key={h.id}>
                  <div>
                    <strong>{h.description}</strong>
                    <p>{new Date(h.at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No executions yet"
              description="When a new record matches, its execution will appear here."
            />
          )}
        </Modal>
      )}
    </div>
  );
}
function WorkflowForm({
  workflow,
  onClose,
}: {
  workflow?: Workflow;
  onClose: () => void;
}) {
  return (
    <Modal
      title={workflow ? "Edit workflow" : "Create workflow"}
      onClose={onClose}
    >
      <Form
        onCancel={onClose}
        submitLabel="Save workflow"
        onSubmit={async (f) => {
          await saveWorkflow(
            {
              name: String(f.get("name")),
              trigger: f.get("trigger") as Workflow["trigger"],
              threshold: Number(f.get("threshold")),
              action: f.get("action") as Workflow["action"],
              enabled: f.get("enabled") === "on",
            },
            workflow?.id,
          );
        }}
      >
        <Field label="Workflow name">
          <input
            autoFocus
            required
            maxLength={200}
            name="name"
            defaultValue={workflow?.name}
          />
        </Field>
        <Field label="When">
          <select
            name="trigger"
            defaultValue={workflow?.trigger || "low_stock"}
          >
            <option value="low_stock">Inventory is below a threshold</option>
            <option value="inactive_customer">
              Customer is inactive for more than N days
            </option>
            <option value="large_order">Order total is above a value</option>
          </select>
        </Field>
        <Field
          label="Threshold"
          hint="Units, days, or USD, depending on the trigger."
        >
          <input
            type="number"
            required
            min={1}
            max={1000000}
            name="threshold"
            defaultValue={workflow?.threshold || 10}
          />
        </Field>
        <Field label="Then">
          <select
            name="action"
            defaultValue={workflow?.action || "notification"}
          >
            <option value="notification">Create notification</option>
            <option value="task">Create follow-up task</option>
          </select>
        </Field>
        <label className="check-label">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={workflow?.enabled ?? true}
          />
          Enable this workflow
        </label>
        <p className="muted text-xs mt-4">
          Editing conditions resets matching history for that rule. New matches
          may include existing records.
        </p>
      </Form>
    </Modal>
  );
}
