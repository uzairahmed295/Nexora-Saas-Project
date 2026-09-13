import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../store/workspace";
import { createOrder } from "../services/orders";
import { Button, Field, Form, Modal } from "./ui";
import { money, round, uid } from "../utils/format";
export function OrderForm({ onClose }: { onClose: () => void }) {
  const { data } = useWorkspace();
  const navigate = useNavigate();
  const [id] = useState(uid);
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(8);
  const subtotal = round(
    items.reduce(
      (s, i) =>
        s +
        (data.products.find((p) => p.id === i.productId)?.price || 0) *
          i.quantity,
      0,
    ),
  );
  const update = (index: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((i, n) => (n === index ? { ...i, ...patch } : i)));
  return (
    <Modal title="Create order" wide onClose={onClose}>
      <Form
        onCancel={onClose}
        submitLabel="Create order"
        onSubmit={async (f) => {
          const o = await createOrder({
            id,
            customerId: String(f.get("customer")),
            items,
            discount,
            taxRate: tax,
            paymentStatus: f.get("payment") as "Paid" | "Unpaid",
            notes: String(f.get("notes")),
            source: "Manual",
          });
          navigate(`/app/orders/${o.id}`);
        }}
      >
        <div className="form-grid">
          <Field label="Customer">
            <select name="customer" required defaultValue="" autoFocus>
              <option value="" disabled>
                Select a customer
              </option>
              {data.customers.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name} · {c.company}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment status">
            <select name="payment">
              <option>Paid</option>
              <option>Unpaid</option>
            </select>
          </Field>
        </div>
        <div className="order-line-heading">
          <span>Order items</span>
          <span className="muted">Prices are in USD</span>
        </div>
        {items.map((item, index) => (
          <div className="order-line" key={index}>
            <Field label={`Product ${index + 1}`}>
              <select
                value={item.productId}
                required
                onChange={(e) => update(index, { productId: e.target.value })}
              >
                <option value="" disabled>
                  Select a product
                </option>
                {data.products
                  .filter((p) => p.status === "Active")
                  .map((p) => (
                    <option value={p.id} key={p.id} disabled={!p.stock}>
                      {p.name} · {money(p.price)} · {p.stock} available
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Quantity">
              <input
                type="number"
                aria-label={`Quantity ${index + 1}`}
                required
                min={1}
                max={10000}
                step={1}
                value={item.quantity}
                onChange={(e) =>
                  update(index, { quantity: Number(e.target.value) })
                }
              />
            </Field>
            <span className="line-total">
              {money(
                (data.products.find((p) => p.id === item.productId)?.price ||
                  0) * item.quantity,
              )}
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove item ${index + 1}`}
              disabled={items.length === 1}
              onClick={() => setItems(items.filter((_, i) => i !== index))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="small"
          disabled={items.length >= 30}
          onClick={() => setItems([...items, { productId: "", quantity: 1 }])}
        >
          <Plus size={14} />
          Add item
        </Button>
        <div className="divider" />
        <div className="form-grid">
          <div>
            <Field label="Notes">
              <textarea
                name="notes"
                maxLength={3000}
                placeholder="Delivery details or internal context…"
              />
            </Field>
          </div>
          <div>
            <div className="form-grid">
              <Field label="Discount (USD)">
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </Field>
              <Field label="Tax (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                />
              </Field>
            </div>
            <div className="total-row">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="total-row">
              <span>Tax</span>
              <span>{money(round(((subtotal - discount) * tax) / 100))}</span>
            </div>
            <div className="total-row strong">
              <span>Order total</span>
              <span>
                {money(round((subtotal - discount) * (1 + tax / 100)))}
              </span>
            </div>
          </div>
        </div>
        <p className="muted text-xs">
          Creating an order reserves stock immediately. Paid orders contribute
          to revenue. Cancelling restores stock.
        </p>
      </Form>
    </Modal>
  );
}
