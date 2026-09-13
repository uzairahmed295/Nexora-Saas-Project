import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Package,
  Truck,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import type { Order } from "../db/schema";
import { updateOrder } from "../services/orders";
import { generateInvoice } from "../services/invoices";
import { can } from "../services/permissions";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  Field,
  PageHeader,
} from "../components/ui";
import { date, money, initials } from "../utils/format";
export default function OrderDetail() {
  const { id } = useParams();
  const { data } = useWorkspace();
  const navigate = useNavigate();
  const o = data.orders.find((o) => o.id === id);
  const [status, setStatus] = useState<Order["status"]>(o?.status || "Pending");
  const [payment, setPayment] = useState<Order["paymentStatus"]>(
    o?.paymentStatus || "Unpaid",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (o) {
      setStatus(o.status);
      setPayment(o.paymentStatus);
    }
  }, [o?.updatedAt, id]);
  if (!o)
    return (
      <Empty
        title="Order not found"
        action={
          <Link className="btn" to="/app/orders">
            Back to orders
          </Link>
        }
      />
    );
  const customer = data.customers.find((c) => c.id === o.customerId)!;
  const invoice = data.invoices.find((i) => i.orderId === o.id);
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  async function save() {
    setBusy(true);
    setError("");
    try {
      await updateOrder(o!.id, status, payment);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "We couldn’t update the order.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-enter">
      <Link to="/app/orders" className="back-link">
        <ArrowLeft size={15} />
        All orders
      </Link>
      <PageHeader
        title={`Order ${o.number}`}
        description={`Placed on ${date(o.createdAt)} · ${o.source === "Simulation" ? "Simulated order" : o.source === "Demo" ? "Demo order" : "Manual order"}`}
        actions={
          <>
            <Badge>{o.status}</Badge>
            {can(role, "commerce") && (
              <Button
                busy={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const i = invoice || (await generateInvoice(o.id));
                    navigate(`/app/invoices/${i.id}`);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "We couldn’t create the invoice.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <FileText size={16} />
                {invoice ? "View invoice" : "Generate invoice"}
              </Button>
            )}
          </>
        }
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="grid-two">
        <div className="stack">
          <Card title="Order items" subtitle={`${o.items.length} products`}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i.productId}>
                      <td>
                        <div className="table-main">{i.name}</div>
                        <div className="mono table-sub">{i.sku}</div>
                      </td>
                      <td>{i.quantity}</td>
                      <td>{money(i.unitPrice)}</td>
                      <td>{money(i.quantity * i.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="order-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>{money(o.subtotal)}</span>
              </div>
              <div className="total-row">
                <span>Discount</span>
                <span>−{money(o.discount)}</span>
              </div>
              <div className="total-row">
                <span>Tax ({o.taxRate}%)</span>
                <span>{money(o.tax)}</span>
              </div>
              <div className="total-row strong">
                <span>Total</span>
                <span>{money(o.total)}</span>
              </div>
            </div>
          </Card>
          <Card title="Order notes">
            <div className="card-body">
              <p className="muted whitespace-pre-wrap">
                {o.notes || "No notes for this order."}
              </p>
            </div>
          </Card>
          <Card title="Order activity">
            <div className="activity-list">
              {data.activities
                .filter((a) => a.entityType === "order" && a.entityId === o.id)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((a) => (
                  <div key={a.id}>
                    <Clock3 size={16} />
                    <div>
                      <strong>{a.title}</strong>
                      <p>
                        {a.description} · {a.actor}
                      </p>
                    </div>
                    <small>{date(a.createdAt)}</small>
                  </div>
                ))}
            </div>
          </Card>
        </div>
        <div className="stack">
          <Card title="Customer">
            <div className="card-body">
              <Link className="person" to={`/app/customers/${customer.id}`}>
                <span className="avatar">{initials(customer.name)}</span>
                <div>
                  <h3>{customer.name}</h3>
                  <p className="muted">{customer.email}</p>
                </div>
              </Link>
              <div className="divider" />
              <p>{customer.company}</p>
              <p className="muted mt-2">{customer.address}</p>
            </div>
          </Card>
          <Card title="Fulfillment & payment">
            <div className="card-body">
              <Field label="Order status">
                <select
                  value={status}
                  disabled={!can(role, "commerce")}
                  onChange={(e) => setStatus(e.target.value as Order["status"])}
                >
                  {[
                    "Pending",
                    "Processing",
                    "Shipped",
                    "Delivered",
                    "Cancelled",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Payment status">
                <select
                  value={payment}
                  disabled={!can(role, "commerce")}
                  onChange={(e) =>
                    setPayment(e.target.value as Order["paymentStatus"])
                  }
                >
                  {["Paid", "Unpaid", "Refunded"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              {can(role, "commerce") && (
                <Button
                  variant="primary"
                  busy={busy}
                  disabled={status === o.status && payment === o.paymentStatus}
                  onClick={() => {
                    if (status === "Cancelled" || payment === "Refunded")
                      setConfirm(true);
                    else void save();
                  }}
                >
                  Update order
                </Button>
              )}
              <p className="muted text-xs mt-4">
                Payment status is a local bookkeeping record. No real money is
                charged or refunded.
              </p>
            </div>
          </Card>
        </div>
      </div>
      {confirm && (
        <Confirm
          title="Confirm order change?"
          description="Cancelling restores inventory and removes this order from recognized revenue. A paid cancelled order is recorded as refunded locally."
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await updateOrder(o.id, status, payment);
          }}
        />
      )}
    </div>
  );
}
