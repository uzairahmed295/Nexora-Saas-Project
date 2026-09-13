import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  UserPlus,
  ArrowUpRight,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  PageHeader,
} from "../components/ui";
import { CustomerForm } from "../components/CustomerForm";
import { SearchInput, Pagination } from "../components/ListTools";
import { customerSummary } from "../services/analytics";
import { deleteCustomer } from "../services/records";
import { can } from "../services/permissions";
import { money, date, initials } from "../utils/format";
import type { Customer } from "../db/schema";
export default function Customers() {
  const { data } = useWorkspace();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All customers");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | null | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<Customer>();
  const [params, setParams] = useSearchParams();
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  useEffect(() => {
    if (params.get("create")) {
      setEditing(null);
      setParams({}, { replace: true });
    }
  }, [params]);
  const rows = data.customers
    .filter(
      (c) =>
        (status === "All customers" || c.status === status) &&
        `${c.name} ${c.email} ${c.company} ${c.tags.join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "revenue"
        ? customerSummary(data, b.id).revenue -
          customerSummary(data, a.id).revenue
        : sort === "newest"
          ? b.createdAt.localeCompare(a.createdAt)
          : a.name.localeCompare(b.name),
    );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Relationships that grow"
        title="Customers"
        description="Know your customers. Build lasting relationships."
        actions={
          can(role, "commerce") && (
            <Button variant="primary" onClick={() => setEditing(null)}>
              <Plus size={16} />
              Add customer
            </Button>
          )
        }
      />
      <div className="summary-row">
        {[
          [Users, "Total customers", data.customers.length],
          [
            UserCheck,
            "Active customers",
            data.customers.filter((c) => c.status === "Active").length,
          ],
          [
            UserPlus,
            "New opportunities",
            data.customers.filter((c) => c.status === "Lead").length,
          ],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Users;
          return (
            <Card key={String(label)}>
              <I size={20} />
              <div>
                <span>{String(label)}</span>
                <strong>{String(value)}</strong>
              </div>
            </Card>
          );
        })}
      </div>
      <Card>
        <div className="toolbar">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search customers…"
          />
          <select
            aria-label="Customer status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {["All customers", "Active", "Lead", "Inactive"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Sort customers"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Name A–Z</option>
            <option value="revenue">Highest revenue</option>
            <option value="newest">Newest first</option>
          </select>
          <span className="toolbar-count">{rows.length} customers</span>
        </div>
        {!rows.length ? (
          <Empty
            title="No customers found"
            description="Adjust your filters or add your first customer."
            action={
              can(role, "commerce") && (
                <Button onClick={() => setEditing(null)}>Add customer</Button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Last order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 10, current * 10).map((c) => {
                  const summary = customerSummary(data, c.id);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link className="person" to={`/app/customers/${c.id}`}>
                          <span className="avatar">{initials(c.name)}</span>
                          <div>
                            <div className="table-main">{c.name}</div>
                            <div className="table-sub">{c.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td>{c.company || "—"}</td>
                      <td>
                        <Badge>{c.status}</Badge>
                      </td>
                      <td>{summary.orderCount}</td>
                      <td className="table-main">{money(summary.revenue)}</td>
                      <td>
                        {summary.lastOrder
                          ? date(summary.lastOrder)
                          : "No orders yet"}
                      </td>
                      <td>
                        <div className="actions">
                          <Link
                            className="icon-btn"
                            aria-label={`View ${c.name}`}
                            to={`/app/customers/${c.id}`}
                          >
                            <ArrowUpRight size={16} />
                          </Link>
                          {can(role, "commerce") && (
                            <button
                              className="icon-btn"
                              aria-label={`Edit ${c.name}`}
                              onClick={() => setEditing(c)}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {can(role, "delete") && (
                            <button
                              className="icon-btn"
                              aria-label={`Delete ${c.name}`}
                              onClick={() => setDeleting(c)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={current} total={rows.length} onChange={setPage} />
      </Card>
      {editing !== undefined && (
        <CustomerForm
          customer={editing || undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete customer?"
          description={`Remove ${deleting.name} from this device? Customers with order history cannot be deleted.`}
          onClose={() => setDeleting(undefined)}
          onConfirm={() => deleteCustomer(deleting.id)}
        />
      )}
    </div>
  );
}
