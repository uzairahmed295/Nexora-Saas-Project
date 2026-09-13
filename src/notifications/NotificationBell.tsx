import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { useAction } from "../components/Feedback";
import { markAllRead, markRead } from "./service";
import { relativeTime } from "../utils/format";
import { Empty } from "../components/ui";
export function NotificationBell() {
  const { data } = useWorkspace();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { busy, run } = useAction();
  const unread = data.notifications.filter((n) => !n.read).length;
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <div className="bell-wrap" ref={root}>
      <button
        className="icon-btn notification-bell"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={19} />
        {unread > 0 && <span />}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="card-heading">
            <h2>
              Notifications{" "}
              <span className="muted text-xs">{unread} unread</span>
            </h2>
            <button
              className="icon-btn"
              disabled={busy}
              aria-label="Mark all notifications as read"
              onClick={() => void run(markAllRead)}
            >
              <CheckCheck size={16} />
            </button>
          </div>
          {[...data.notifications]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5)
            .map((n) => (
              <Link
                key={n.id}
                className={`notification-preview ${!n.read ? "unread" : ""}`}
                to={n.href}
                onClick={() => {
                  void run(() => markRead(n.id));
                  setOpen(false);
                }}
              >
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <small>{relativeTime(n.createdAt)}</small>
                </div>
              </Link>
            ))}
          {!data.notifications.length && <Empty title="You’re all caught up" />}
          <Link
            className="notification-all"
            to="/app/notifications"
            onClick={() => setOpen(false)}
          >
            View all notifications <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
