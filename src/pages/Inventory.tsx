import { useState } from "react";
import {
  Package,
  Boxes,
  TriangleAlert,
  Ban,
  Warehouse,
  SlidersHorizontal,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { getAnalytics, inventoryStatus } from "../services/analytics";
import { adjustStock } from "../services/records";
import { can } from "../services/permissions";
import { money } from "../utils/format";
import type { Product } from "../db/schema";
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
export default function Inventory() {
  const { data } = useWorkspace();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All stock");
  const [page, setPage] = useState(1);
  const [product, setProduct] = useState<Product>();
  const a = getAnalytics(data);
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  const rows = data.products
    .filter(
      (p) =>
        p.status === "Active" &&
        (status === "All stock" || inventoryStatus(p) === status) &&
        `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => a.stock - b.stock);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Keep business moving"
        title="Inventory"
        description="Stay ahead of restocks, shortages, and everything in between."
      />
      <div className="inventory-metrics">
        {[
          ["Inventory value", money(a.inventoryValue)],
          ["Total units", a.inventoryUnits],
          ...a.inventory
            .filter((i) => i.name !== "Healthy")
            .map((i) => [i.name, i.value]),
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </Card>
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
            placeholder="Search inventory…"
          />
          <select
            aria-label="Stock status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {[
              "All stock",
              "Low stock",
              "Out of stock",
              "Healthy",
              "Overstock",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {!rows.length ? (
          <Empty
            title="No inventory matches"
            description="Try another search or add a product to begin."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Threshold</th>
                  <th>Stock health</th>
                  <th>Value at cost</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 10, current * 10).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="person">
                        <img
                          className="product-thumb"
                          src={p.image || "/images/accessories.jpg"}
                          alt=""
                          loading="lazy"
                        />
                        <span className="table-main">{p.name}</span>
                      </div>
                    </td>
                    <td className="mono">{p.sku}</td>
                    <td className="table-main">{p.stock}</td>
                    <td>{p.lowStockThreshold}</td>
                    <td>
                      <Badge>{inventoryStatus(p)}</Badge>
                    </td>
                    <td>{money(p.stock * p.cost)}</td>
                    <td>
                      {can(role, "commerce") && (
                        <Button variant="small" onClick={() => setProduct(p)}>
                          <SlidersHorizontal size={13} />
                          Adjust stock
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={current} total={rows.length} onChange={setPage} />
      </Card>
      <p className="metric-note">
        Low stock means at or below the product threshold. Overstock means more
        than 100 units or 10× the threshold, whichever is higher.
      </p>
      {product && (
        <Modal title="Adjust inventory" onClose={() => setProduct(undefined)}>
          <div className="info-banner">
            <Package size={20} />
            <div>
              <strong>{product.name}</strong>
              <p>{product.stock} units currently available</p>
            </div>
          </div>
          <Form
            onCancel={() => setProduct(undefined)}
            submitLabel="Apply adjustment"
            onSubmit={async (f) => {
              await adjustStock(
                product.id,
                Number(f.get("quantity")),
                String(f.get("reason")),
              );
            }}
          >
            <Field
              label="Adjustment"
              hint="Use a positive number for incoming stock or a negative number to remove units."
            >
              <input
                name="quantity"
                autoFocus
                required
                type="number"
                step="1"
                min={-product.stock}
                max={1000000 - product.stock}
                placeholder="e.g. 20 or -5"
              />
            </Field>
            <Field label="Reason">
              <textarea
                name="reason"
                required
                maxLength={500}
                placeholder="Delivery received, physical stock count…"
              />
            </Field>
          </Form>
        </Modal>
      )}
    </div>
  );
}
