import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ArrowUpRight,
  CornerDownLeft,
  Command,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { navigation } from "../layouts/navigation";
import { useWorkspace } from "../store/workspace";
import { searchWorkspace } from "../services/search";
import { repositories } from "../db/database";
import { can } from "../services/permissions";
import { Modal, Empty } from "./ui";
import { useAction } from "./Feedback";
export function CommandPalette() {
  const { data } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const { run } = useAction();
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  useEffect(() => {
    const show = () => {
      setOpen(true);
      setQ("");
      setSelected(0);
    };
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("nexora-command", show);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("nexora-command", show);
    };
  }, []);
  const commands = [
    ...navigation.map((n) => ({
      id: n.path,
      title: n.path === "dashboard" ? "Dashboard" : n.label,
      detail: "Open page",
      category: "Pages",
      path: `/app/${n.path}`,
    })),
    {
      id: "toggle-theme",
      title: "Toggle theme",
      detail: "Switch light / dark mode",
      category: "Commands",
      path: "theme",
    },
    ...(can(role, "commerce")
      ? ["customer", "product", "order"].map((n) => ({
          id: `create-${n}`,
          title: `Create ${n}`,
          detail: "Add a new record",
          category: "Commands",
          path: `/app/${n}s?create=1`,
        }))
      : []),
  ].filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()));
  const results = [...commands, ...searchWorkspace(data, q)];
  const active = Math.min(selected, Math.max(0, results.length - 1));
  function choose(index: number) {
    const r = results[index];
    if (!r) return;
    if (r.path === "theme")
      void run(() =>
        repositories.settings.update(data.settings[0].id, {
          theme: data.settings[0].theme === "light" ? "dark" : "light",
        }),
      );
    else navigate(r.path);
    setOpen(false);
  }
  useEffect(() => {
    document
      .getElementById(`command-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);
  if (!open) return null;
  return (
    <Modal title="Search your workspace" onClose={() => setOpen(false)}>
      <div className="command-input">
        <Search size={19} />
        <input
          autoFocus
          value={q}
          placeholder="Search or jump to…"
          aria-label="Search workspace"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={`command-${active}`}
          onChange={(e) => {
            setQ(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((active + 1) % Math.max(results.length, 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected(
                (active - 1 + results.length) % Math.max(results.length, 1),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              choose(active);
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div id="command-results" role="listbox" className="command-results">
        {results.map((r, i) => (
          <div key={`${r.category}-${r.id}`}>
            {(i === 0 || r.category !== results[i - 1].category) && (
              <div className="command-category">{r.category}</div>
            )}
            <button
              role="option"
              id={`command-${i}`}
              aria-selected={i === active}
              onMouseMove={() => setSelected(i)}
              className={i === active ? "selected" : ""}
              onClick={() => choose(i)}
            >
              <div>
                <strong>{r.title}</strong>
                <small>{r.detail}</small>
              </div>
              <ArrowUpRight size={14} />
            </button>
          </div>
        ))}
        {!results.length && (
          <Empty
            title="No results found"
            description="Try a name, SKU, invoice number, or page."
          />
        )}
      </div>
      <div className="command-footer">
        <span>
          <ArrowUp size={12} />
          <ArrowDown size={12} />
          navigate
        </span>
        <span>
          <CornerDownLeft size={12} />
          open
        </span>
        <span>esc close</span>
      </div>
    </Modal>
  );
}
