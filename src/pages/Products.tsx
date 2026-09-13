import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useWorkspace } from "../store/workspace";
import type { Product } from "../db/schema";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  PageHeader,
} from "../components/ui";
import { ProductForm } from "../components/ProductForm";
import { Pagination, SearchInput } from "../components/ListTools";
import { deleteProduct } from "../services/records";
import { recognized } from "../services/analytics";
import { can } from "../services/permissions";
import { money } from "../utils/format";
export default function Products() {
  const { data } = useWorkspace();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Product | null | undefined>();
  const [remove, setRemove] = useState<Product>();
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("create")) {
      setEdit(null);
      setParams({}, { replace: true });
    }
    if (params.get("q")) {
      setQ(params.get("q")!);
      setPage(1);
    }
  }, [params]);
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  const sales = new Map<string, { units: number; revenue: number }>();
  for (const o of data.orders.filter(recognized))
    for (const i of o.items) {
      const s = sales.get(i.productId) || { units: 0, revenue: 0 };
      s.units += i.quantity;
      s.revenue +=
        i.quantity *
        i.unitPrice *
        (o.subtotal ? 1 - o.discount / o.subtotal : 1);
      sales.set(i.productId, s);
    }
  const rows = data.products
    .filter(
      (p) =>
        (category === "All categories" || p.category === category) &&
        (status === "All statuses" || p.status === status) &&
        `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "price"
        ? b.price - a.price
        : sort === "stock"
          ? a.stock - b.stock
          : sort === "sales"
            ? (sales.get(b.id)?.units || 0) - (sales.get(a.id)?.units || 0)
            : a.name.localeCompare(b.name),
    );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Your collection"
        title="Products"
        description="A thoughtful catalog. Built for the way you sell."
        actions={
          can(role, "commerce") && (
            <Button variant="primary" onClick={() => setEdit(null)}>
              <Plus size={16} />
              Add product
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
            placeholder="Search products or SKU…"
          />
          <select
            aria-label="Product category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            {[
              "All categories",
              ...new Set(data.products.map((p) => p.category)),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Product status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {["All statuses", "Active", "Archived"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Name A–Z</option>
            <option value="price">Highest price</option>
            <option value="stock">Lowest stock</option>
            <option value="sales">Most sold</option>
          </select>
        </div>
        {!rows.length ? (
          <Empty
            title="No products found"
            description="Adjust your filters or add a product to your collection."
            action={
              can(role, "commerce") && (
                <Button onClick={() => setEdit(null)}>Add product</Button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price / cost</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Sales</th>
                  <th>Revenue</th>
                  <th>Actions</th>
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
                          loading="lazy"
                          alt={`${p.name} — illustrative category image`}
                        />
                        <div>
                          <div className="table-main">{p.name}</div>
                          <div className="table-sub mono">{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td>
                      <div>{money(p.price)}</div>
                      <div className="table-sub">{money(p.cost)} cost</div>
                    </td>
                    <td>
                      <span
                        className={
                          p.stock <= p.lowStockThreshold ? "negative" : ""
                        }
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <Badge>{p.status}</Badge>
                    </td>
                    <td>{sales.get(p.id)?.units || 0}</td>
                    <td>{money(sales.get(p.id)?.revenue || 0)}</td>
                    <td>
                      <div className="actions">
                        {can(role, "commerce") && (
                          <button
                            className="icon-btn"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => setEdit(p)}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {can(role, "delete") && (
                          <button
                            className="icon-btn"
                            aria-label={`Delete ${p.name}`}
                            onClick={() => setRemove(p)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
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
        Demo photos illustrate product categories. Sales and revenue reflect
        lifetime paid orders; previous prices are preserved.
      </p>
      {edit !== undefined && (
        <ProductForm
          product={edit || undefined}
          onClose={() => setEdit(undefined)}
        />
      )}
      {remove && (
        <Confirm
          title="Delete product?"
          description={`Remove ${remove.name}? Products with order history must be archived instead.`}
          onClose={() => setRemove(undefined)}
          onConfirm={() => deleteProduct(remove.id)}
        />
      )}
    </div>
  );
}
