import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { can } from "../services/permissions";
import { Badge, Button, Card, Empty, PageHeader } from "../components/ui";
import { OrderForm } from "../components/OrderForm";
import { SearchInput, Pagination } from "../components/ListTools";
import { date, initials, money } from "../utils/format";
export default function Orders() {
  const { data } = useWorkspace();
  const [create, setCreate] = useState(false);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All orders");
  const [payment, setPayment] = useState("All payments");
  const [page, setPage] = useState(1);
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  useEffect(() => {
    if (params.get("create")) {
      setCreate(true);
      setParams({}, { replace: true });
    }
  }, [params]);
  const rows = data.orders
    .filter(
      (o) =>
        (status === "All orders" || o.status === status) &&
        (payment === "All payments" || o.paymentStatus === payment) &&
        `${o.number} ${data.customers.find((c) => c.id === o.customerId)?.name}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="From checkout to doorstep"
        title="Orders"
        description="Every purchase, payment, and delivery in one view."
        actions={
          can(role, "commerce") && (
            <Button variant="primary" onClick={() => setCreate(true)}>
              <Plus size={16} />
              Create order
            </Button>
          )
        }
      />
      <div className="order-status-tabs">
        {[
          "All orders",
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
        ].map((s) => (
          <button
            className={status === s ? "selected" : ""}
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s}
            <span>
              {s === "All orders"
                ? data.orders.length
                : data.orders.filter((o) => o.status === s).length}
            </span>
          </button>
        ))}
      </div>
      <Card>
        <div className="toolbar">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search orders or customers…"
          />
          <select
            aria-label="Payment filter"
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value);
              setPage(1);
            }}
          >
            {["All payments", "Paid", "Unpaid", "Refunded"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        {!rows.length ? (
          <Empty
            title="No orders found"
            description="Try a different filter or create your first order."
            action={
              can(role, "commerce") && (
                <Button onClick={() => setCreate(true)}>Create order</Button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 10, current * 10).map((o) => {
                  const c = data.customers.find((c) => c.id === o.customerId);
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link className="mono link" to={`/app/orders/${o.id}`}>
                          {o.number}
                        </Link>
                        {o.source === "Simulation" && (
                          <div className="table-sub">Simulation</div>
                        )}
                      </td>
                      <td>
                        <div className="person">
                          <span className="avatar">
                            {initials(c?.name || "?")}
                          </span>
                          <div>
                            <div className="table-main">{c?.name}</div>
                            <div className="table-sub">{c?.company}</div>
                          </div>
                        </div>
                      </td>
                      <td>{date(o.createdAt)}</td>
                      <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td className="table-main">{money(o.total)}</td>
                      <td>
                        <Badge>{o.paymentStatus}</Badge>
                      </td>
                      <td>
                        <Badge>{o.status}</Badge>
                      </td>
                      <td>
                        <Link
                          className="icon-btn"
                          aria-label={`View ${o.number}`}
                          to={`/app/orders/${o.id}`}
                        >
                          <ArrowUpRight size={16} />
                        </Link>
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
      {create && <OrderForm onClose={() => setCreate(false)} />}
    </div>
  );
}
