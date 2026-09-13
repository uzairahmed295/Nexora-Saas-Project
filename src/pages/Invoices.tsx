import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { generateInvoice } from "../services/invoices";
import { can } from "../services/permissions";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Form,
  Modal,
  PageHeader,
} from "../components/ui";
import { Pagination, SearchInput } from "../components/ListTools";
import { date, money } from "../utils/format";
export default function Invoices() {
  const { data } = useWorkspace();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const navigate = useNavigate();
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  const rows = data.invoices
    .filter((i) =>
      `${i.number} ${i.customer.name} ${i.customer.company}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  const eligible = data.orders.filter(
    (o) =>
      o.status !== "Cancelled" &&
      !data.invoices.some((i) => i.orderId === o.id),
  );
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="The details, beautifully organized"
        title="Invoices"
        description="Professional invoices. Ready to print, save, and share."
        actions={
          can(role, "commerce") && (
            <Button variant="primary" onClick={() => setCreate(true)}>
              <Plus size={16} />
              Generate invoice
            </Button>
          )
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
            placeholder="Search invoices…"
          />
          <span className="toolbar-count">{rows.length} invoices</span>
        </div>
        {!rows.length ? (
          <Empty
            title="No invoices found"
            description="Generate your first invoice from an existing order."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Issued</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 10, current * 10).map((i) => {
                  const o = data.orders.find((o) => o.id === i.orderId);
                  return (
                    <tr key={i.id}>
                      <td>
                        <Link
                          className="mono link"
                          to={`/app/invoices/${i.id}`}
                        >
                          {i.number}
                        </Link>
                      </td>
                      <td>
                        <div className="table-main">{i.customer.name}</div>
                        <div className="table-sub">{i.customer.company}</div>
                      </td>
                      <td>{date(i.createdAt)}</td>
                      <td>{date(i.dueDate)}</td>
                      <td>
                        <Badge>
                          {o?.status === "Cancelled"
                            ? "Cancelled"
                            : o?.paymentStatus || "Unpaid"}
                        </Badge>
                      </td>
                      <td className="table-main">{money(i.total)}</td>
                      <td>
                        <Link
                          className="icon-btn"
                          aria-label={`View ${i.number}`}
                          to={`/app/invoices/${i.id}`}
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
      {create && (
        <Modal title="Generate invoice" onClose={() => setCreate(false)}>
          {!eligible.length ? (
            <Empty
              title="All eligible orders are invoiced"
              description="Create a new order to issue another invoice."
              action={
                <Link className="btn primary" to="/app/orders?create=1">
                  Create order
                </Link>
              }
            />
          ) : (
            <Form
              onCancel={() => setCreate(false)}
              submitLabel="Generate invoice"
              onSubmit={async (f) => {
                const i = await generateInvoice(String(f.get("order")));
                navigate(`/app/invoices/${i.id}`);
              }}
            >
              <Field label="Select order">
                <select required name="order" defaultValue="">
                  <option value="" disabled>
                    Choose an order
                  </option>
                  {eligible.map((o) => (
                    <option value={o.id} key={o.id}>
                      {o.number} ·{" "}
                      {data.customers.find((c) => c.id === o.customerId)?.name}{" "}
                      · {money(o.total)}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="muted text-sm">
                The invoice will preserve your company details, customer
                details, and order prices as they are today.
              </p>
            </Form>
          )}
        </Modal>
      )}
    </div>
  );
}
