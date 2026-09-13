import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  CheckCheck,
  Trash2,
  Bell,
  Package,
  ShoppingBag,
  Users,
  Sparkles,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { useAction } from "../components/Feedback";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  PageHeader,
} from "../components/ui";
import { SearchInput, Pagination } from "../components/ListTools";
import {
  markAllRead,
  markRead,
  removeNotification,
} from "../notifications/service";
import { relativeTime, date } from "../utils/format";
export default function Notifications() {
  const { data } = useWorkspace();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [type, setType] = useState("All categories");
  const [page, setPage] = useState(1);
  const [remove, setRemove] = useState<string>();
  const { busy, run } = useAction();
  const rows = data.notifications
    .filter(
      (n) =>
        (filter === "All" || !n.read) &&
        (type === "All categories" || n.type === type) &&
        `${n.title} ${n.message}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  return (
    <div className="page-enter">
      <PageHeader
        title="Notifications"
        description="What matters, as it happens."
        actions={
          <Button
            busy={busy}
            onClick={() =>
              void run(markAllRead, "All notifications marked as read.")
            }
          >
            <CheckCheck size={16} />
            Mark all as read
          </Button>
        }
      />
      <Card>
        <div className="toolbar">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search notifications…"
          />
          <select
            aria-label="Read status"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option>All</option>
            <option>Unread</option>
          </select>
          <select
            aria-label="Notification category"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            {[
              "All categories",
              "New order",
              "Low inventory",
              "Payment",
              "Customer",
              "Team activity",
              "AI insight",
              "Warning",
              "Success",
              "System",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        {!rows.length ? (
          <Empty
            title="You’re all caught up"
            description="New updates will appear here as your workspace changes."
          />
        ) : (
          <div className="notification-list">
            {rows.slice((current - 1) * 10, current * 10).map((n) => {
              const Icon =
                n.type === "New order"
                  ? ShoppingBag
                  : n.type === "Low inventory"
                    ? Package
                    : n.type === "Payment"
                      ? CreditCard
                      : n.type === "Customer"
                        ? Users
                        : n.type === "AI insight"
                          ? Sparkles
                          : n.type === "Warning"
                            ? AlertTriangle
                            : Bell;
              return (
                <div key={n.id} className={!n.read ? "unread" : ""}>
                  <span className="notification-icon">
                    <Icon size={19} />
                  </span>
                  <Link
                    to={n.href}
                    onClick={() => void run(() => markRead(n.id))}
                  >
                    <div className="actions">
                      <h3>{n.title}</h3>
                      <Badge>{n.type}</Badge>
                    </div>
                    <p>{n.message}</p>
                    <small title={date(n.createdAt)}>
                      {relativeTime(n.createdAt)}
                    </small>
                  </Link>
                  <div className="actions">
                    {!n.read && (
                      <button
                        className="icon-btn"
                        disabled={busy}
                        aria-label={`Mark ${n.title} as read`}
                        onClick={() => void run(() => markRead(n.id))}
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      aria-label={`Delete ${n.title}`}
                      onClick={() => setRemove(n.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination page={current} total={rows.length} onChange={setPage} />
      </Card>
      {remove && (
        <Confirm
          title="Delete notification?"
          description="This removes the notification from this device. The original business record is preserved."
          onClose={() => setRemove(undefined)}
          onConfirm={() => removeNotification(remove)}
        />
      )}
    </div>
  );
}
