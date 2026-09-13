import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity as ActivityIcon } from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { Badge, Card, Empty, PageHeader } from "../components/ui";
import { Pagination, SearchInput } from "../components/ListTools";
import { date, relativeTime } from "../utils/format";
export default function Activity() {
  const { data } = useWorkspace();
  const [q, setQ] = useState("");
  const [type, setType] = useState("All activity");
  const [page, setPage] = useState(1);
  const rows = data.activities
    .filter(
      (a) =>
        (type === "All activity" || a.entityType === type) &&
        `${a.title} ${a.description} ${a.actor}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 15)));
  return (
    <div className="page-enter">
      <PageHeader
        title="Activity"
        description="A shared record of every move in your workspace."
      />
      <Card>
        <div className="toolbar">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search activity…"
          />
          <select
            aria-label="Activity type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            {[
              "All activity",
              "customer",
              "product",
              "order",
              "invoice",
              "team",
              "workflow",
              "system",
              "ai",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="activity-list full">
          {rows.slice((current - 1) * 15, current * 15).map((a) => (
            <div key={a.id}>
              <span className="activity-symbol">
                <ActivityIcon size={16} />
              </span>
              <div>
                <strong>{a.title}</strong>
                <p>{a.description}</p>
                <small>
                  {a.actor} · {date(a.createdAt)}
                </small>
              </div>
              <Badge>{a.entityType}</Badge>
              <small>{relativeTime(a.createdAt)}</small>
            </div>
          ))}
        </div>
        {!rows.length && (
          <Empty
            title="No activity found"
            description="Workspace changes appear here automatically."
          />
        )}
        <Pagination
          page={current}
          total={rows.length}
          pageSize={15}
          onChange={setPage}
        />
      </Card>
    </div>
  );
}
