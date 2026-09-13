import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Search,
  ChevronDown,
  PanelLeftClose,
  Menu,
  Sun,
  Moon,
  Bell,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { navigation } from "./navigation";
import { useWorkspace } from "../store/workspace";
import { repositories } from "../db/database";
import { initials } from "../utils/format";
import { NotificationBell } from "../notifications/NotificationBell";
import { useAction } from "../components/Feedback";
export default function AppLayout() {
  const { data } = useWorkspace();
  const { run } = useAction();
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const settings = data.settings[0];
  const user = data.users.find((u) => u.id === settings.currentUserId);
  const current = navigation.find((n) =>
    location.pathname.startsWith(`/app/${n.path}`),
  );
  const unread = data.notifications.filter((n) => !n.read).length;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobile && (
        <button
          aria-label="Close navigation"
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link to="/" className="brand">
          <img src="/icons/nexora.svg" alt="" />
          NEXORA<span className="brand-label">workspace</span>
        </Link>
        <Link
          className="workspace-switch"
          to="/app/settings"
          onClick={() => setMobile(false)}
        >
          <img className="workspace-avatar" src="/icons/nexora.svg" alt="" />
          <div>
            <strong>{settings.companyName}</strong>
            <span>
              {settings.demoMode ? "Demo workspace" : "Local workspace"}
            </span>
          </div>
          <ChevronDown size={15} />
        </Link>
        <nav aria-label="Main navigation">
          {navigation.map((item, i) => (
            <div key={item.path}>
              {(i === 0 || item.group !== navigation[i - 1].group) && (
                <div className="nav-group">{item.group}</div>
              )}
              <NavLink
                to={`/app/${item.path}`}
                onClick={() => setMobile(false)}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <item.icon size={18} />
                {item.label}
                {item.path === "assistant" && (
                  <span className="nav-ai">AI</span>
                )}
                {item.path === "notifications" && unread > 0 && (
                  <span className="nav-count">{unread}</span>
                )}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-dot" />
            <strong>Made for your next move.</strong>
            <p>Your business. One clear view.</p>
            <Link to="/app/assistant">
              Explore your insights <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link to="/app/settings" className="user-menu">
            <span className="avatar">
              {initials(user?.name || "Local user")}
            </span>
            <span>
              <strong>{user?.name || "Local user"}</strong>
              <small>{user?.role || "Local profile"}</small>
            </span>
            <ChevronDown size={14} />
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="muted">Workspace</span>
            <ChevronRight size={13} />
            <strong>{current?.label || "Overview"}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="global-search"
              onClick={() => window.dispatchEvent(new Event("nexora-command"))}
            >
              <Search size={16} />
              <span>Search anything…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="icon-btn"
              aria-label="Toggle theme"
              onClick={() =>
                void run(() =>
                  repositories.settings.update(settings.id, {
                    theme: settings.theme === "light" ? "dark" : "light",
                  }),
                )
              }
            >
              {settings.theme === "light" ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}
            </button>
            <NotificationBell />
            <span className="topbar-separator" />
            <Link
              to="/app/settings"
              className="avatar"
              aria-label="Profile settings"
            >
              {initials(user?.name || "N")}
            </Link>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>
            NEXORA <span className="muted">/ Your intelligent workspace</span>
          </span>
          <span>
            {settings.demoMode ? "Demo data" : "Local data"} · Stored on this
            device
          </span>
        </footer>
      </div>
    </div>
  );
}
