import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { Badge, Button, Empty, PageHeader } from "../components/ui";
import { date, money } from "../utils/format";
export default function InvoiceDetail() {
  const { id } = useParams();
  const { data } = useWorkspace();
  const i = data.invoices.find((i) => i.id === id);
  if (!i)
    return (
      <Empty
        title="Invoice not found"
        action={
          <Link className="btn" to="/app/invoices">
            Back to invoices
          </Link>
        }
      />
    );
  const o = data.orders.find((o) => o.id === i.orderId);
  return (
    <div className="invoice-page page-enter">
      <div className="no-print">
        <Link className="back-link" to="/app/invoices">
          <ArrowLeft size={15} />
          All invoices
        </Link>
        <PageHeader
          title={i.number}
          description="A complete record of your order."
          actions={
            <Button variant="primary" onClick={() => window.print()}>
              <Printer size={16} />
              Print / Save PDF
            </Button>
          }
        />
      </div>
      <article className="invoice-document">
        <div className="invoice-top">
          <div>
            <div className="invoice-brand">
              <img src="/icons/nexora.svg" alt="" />
              <strong>{i.company.name}</strong>
            </div>
            <p>{i.company.address}</p>
            <p>{i.company.email}</p>
          </div>
          <div className="align-right">
            <div className="invoice-label">INVOICE</div>
            <span className="mono">{i.number}</span>
            <div className="mt-3">
              <Badge>
                {o?.status === "Cancelled"
                  ? "Cancelled"
                  : o?.paymentStatus || "Unpaid"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="invoice-parties">
          <div>
            <span className="eyebrow">Billed to</span>
            <h3>{i.customer.name}</h3>
            <p>{i.customer.company}</p>
            <p>{i.customer.address}</p>
            <p>{i.customer.email}</p>
          </div>
          <div>
            <div>
              <span>Issue date</span>
              <strong>{date(i.createdAt)}</strong>
            </div>
            <div>
              <span>Due date</span>
              <strong>{date(i.dueDate)}</strong>
            </div>
            <div>
              <span>Order number</span>
              <strong>{o?.number}</strong>
            </div>
            <div>
              <span>Currency</span>
              <strong>USD</strong>
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th className="align-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {i.items.map((item) => (
                <tr key={item.productId}>
                  <td>
                    <div className="table-main">{item.name}</div>
                    <div className="table-sub mono">{item.sku}</div>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitPrice)}</td>
                  <td className="align-right">
                    {money(item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="invoice-summary">
          <div className="total-row">
            <span>Subtotal</span>
            <span>{money(i.subtotal)}</span>
          </div>
          <div className="total-row">
            <span>Discount</span>
            <span>−{money(i.discount)}</span>
          </div>
          <div className="total-row">
            <span>Tax ({i.taxRate}%)</span>
            <span>{money(i.tax)}</span>
          </div>
          <div className="total-row strong">
            <span>Total</span>
            <span>{money(i.total)}</span>
          </div>
        </div>
        <div className="invoice-thanks">
          <h3>Thank you for your business.</h3>
          <p>Questions about this invoice? Contact {i.company.email}.</p>
          <small>
            Generated with NEXORA.{" "}
            {o?.source === "Demo"
              ? "Demonstration invoice — no payment is due."
              : "Payment status is maintained in this local workspace."}
          </small>
        </div>
      </article>
    </div>
  );
}
