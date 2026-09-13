import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Mail,
  MapPin,
  Phone,
  Building2,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { customerSummary } from "../services/analytics";
import { can } from "../services/permissions";
import { Badge, Button, Card, Empty, PageHeader } from "../components/ui";
import { CustomerForm } from "../components/CustomerForm";
import { date, initials, money, relativeTime } from "../utils/format";
export default function CustomerDetail() {
  const { id } = useParams();
  const { data } = useWorkspace();
  const [edit, setEdit] = useState(false);
  const c = data.customers.find((c) => c.id === id);
  if (!c)
    return (
      <Empty
        title="Customer not found"
        action={
          <Link className="btn" to="/app/customers">
            Back to customers
          </Link>
        }
      />
    );
  const summary = customerSummary(data, c.id);
  const events = data.activities
    .filter(
      (a) =>
        (a.entityType === "customer" && a.entityId === c.id) ||
        (a.entityType === "order" &&
          summary.orders.some((o) => o.id === a.entityId)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  return (
    <div className="page-enter">
      <Link className="back-link" to="/app/customers">
        <ArrowLeft size={15} />
        All customers
      </Link>
      <PageHeader
        title={c.name}
        description={`Customer since ${date(c.createdAt)} · ${c.company || "Independent customer"}`}
        actions={
          can(role, "commerce") && (
            <Button onClick={() => setEdit(true)}>
              <Pencil size={15} />
              Edit customer
            </Button>
          )
        }
      />
      <div className="detail-grid">
        <div className="stack">
          <Card>
            <div className="profile-card">
              <span className="avatar large">{initials(c.name)}</span>
              <h2>{c.name}</h2>
              <p>{c.company}</p>
              <Badge>{c.status}</Badge>
            </div>
            <div className="contact-list">
              <div>
                <Mail size={15} />
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </div>
              <div>
                <Phone size={15} />
                {c.phone || "No phone added"}
              </div>
              <div>
                <MapPin size={15} />
                {c.address || "No address added"}
              </div>
            </div>
            <div className="card-body">
              <h3 className="text-sm mb-3">Tags</h3>
              <div className="actions">
                {c.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
                {!c.tags.length && (
                  <span className="muted text-sm">No tags added</span>
                )}
              </div>
            </div>
          </Card>
          <Card title="Relationship notes">
            <div className="card-body">
              <p className="muted whitespace-pre-wrap">
                {c.notes ||
                  "No notes yet. Edit this customer to add useful context."}
              </p>
            </div>
          </Card>
        </div>
        <div className="stack">
          <div className="detail-stats">
            <div>
              <span>Lifetime revenue</span>
              <strong>{money(summary.revenue)}</strong>
            </div>
            <div>
              <span>Orders</span>
              <strong>{summary.orderCount}</strong>
            </div>
            <div>
              <span>Last order</span>
              <strong>
                {summary.lastOrder ? date(summary.lastOrder) : "—"}
              </strong>
            </div>
          </div>
          <Card title="Purchase history" subtitle="Every order, in one place">
            {!summary.orders.length ? (
              <Empty
                title="No orders yet"
                description="Create their first order to begin a purchase history."
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link
                            className="mono link"
                            to={`/app/orders/${o.id}`}
                          >
                            {o.number}
                          </Link>
                        </td>
                        <td>{date(o.createdAt)}</td>
                        <td>
                          <Badge>{o.status}</Badge>
                        </td>
                        <td>
                          <Badge>{o.paymentStatus}</Badge>
                        </td>
                        <td>{money(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="Activity timeline">
            <div className="activity-list">
              {events.map((e) => (
                <div key={e.id}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{e.title}</strong>
                    <p>{e.description}</p>
                    <small>{e.actor}</small>
                  </div>
                  <small>{relativeTime(e.createdAt)}</small>
                </div>
              ))}
              {!events.length && <Empty title="No activity yet" />}
            </div>
          </Card>
        </div>
      </div>
      {edit && <CustomerForm customer={c} onClose={() => setEdit(false)} />}
    </div>
  );
}
