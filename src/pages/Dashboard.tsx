import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  ArrowRight,
  Package,
  Clock3,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { getAnalytics, type Period } from "../services/analytics";
import { Badge, Card, Empty, Metric, PageHeader } from "../components/ui";
import { PeriodSelect } from "../components/PeriodSelect";
import {
  RevenueChart,
  ColumnChart,
  DonutChart,
} from "../charts/BusinessCharts";
import { money, compactMoney, initials, relativeTime } from "../utils/format";
export default function Dashboard() {
  const { data } = useWorkspace();
  const [period, setPeriod] = useState<Period>("30");
  const a = useMemo(() => getAnalytics(data, period), [data, period]);
  const user = data.users.find((u) => u.id === data.settings[0].currentUserId);
  return (
    <div className="page-enter">
      <PageHeader
        title={`A clearer view of your business.`}
        description={`Welcome back, ${user?.name.split(" ")[0] || "there"}. Here’s what’s happening in your workspace.`}
        actions={
          <>
            <PeriodSelect value={period} onChange={setPeriod} />
            <Link className="btn primary" to="/app/orders?create=1">
              <Plus size={16} />
              Create order
            </Link>
          </>
        }
      />
      <div className="metric-grid">
        {(
          ["revenue", "orders", "customers", "profit", "conversion"] as const
        ).map((key) => (
          <Metric
            key={key}
            label={
              {
                revenue: "Total revenue",
                orders: "Orders",
                customers: "New customers",
                profit: "Gross profit",
                conversion: "Customer conversion",
              }[key]
            }
            value={
              key === "revenue" || key === "profit"
                ? compactMoney(a.values[key])
                : key === "conversion"
                  ? `${a.values[key]}%`
                  : String(a.values[key])
            }
            change={a.changes[key]}
          />
        ))}
      </div>
      <div className="grid-two">
        <Card
          title="Revenue overview"
          subtitle="Net sales, excluding tax · UTC"
          action={
            <div className="inline-legend">
              <span>
                <i />
                Current
              </span>
              <span>
                <i />
                Previous
              </span>
            </div>
          }
        >
          <div className="chart-summary">
            {money(a.values.revenue)}
            <span>this period</span>
          </div>
          <RevenueChart data={a.trend} />
        </Card>
        <Card
          title="Revenue by category"
          subtitle="Where your business is growing"
        >
          <DonutChart data={a.categories} label="Net revenue" isMoney />
        </Card>
      </div>
      <div className="insight-strip">
        <div className="insight-icon">
          <Sparkles size={21} />
        </div>
        <div>
          <h3>Your next decision, backed by data.</h3>
          <p>
            {a.lowStock.length > 0
              ? `${a.lowStock.length} products are at or below their restock threshold. Get a focused analysis from your AI assistant.`
              : "Turn your orders, customer history, and sales trends into a useful business summary."}
          </p>
        </div>
        <Link to="/app/assistant" className="btn">
          Ask NEXORA <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="grid-two">
        <Card
          title="Recent orders"
          subtitle="Your latest customer purchases"
          action={
            <Link className="link text-sm" to="/app/orders">
              View all <ArrowUpRight size={13} />
            </Link>
          }
        >
          {!data.orders.length ? (
            <Empty title="No orders yet" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="align-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.orders]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .slice(0, 5)
                    .map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link
                            to={`/app/orders/${o.id}`}
                            className="mono link"
                          >
                            {o.number}
                          </Link>
                        </td>
                        <td>
                          <div className="person">
                            <span className="avatar">
                              {initials(
                                data.customers.find(
                                  (c) => c.id === o.customerId,
                                )?.name || "?",
                              )}
                            </span>
                            <span>
                              {
                                data.customers.find(
                                  (c) => c.id === o.customerId,
                                )?.name
                              }
                            </span>
                          </div>
                        </td>
                        <td>
                          <Badge>{o.status}</Badge>
                        </td>
                        <td className="align-right table-main">
                          {money(o.total)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card
          title="Top products"
          subtitle="Ranked by net revenue"
          action={
            <Link
              className="icon-btn"
              aria-label="View products"
              to="/app/products"
            >
              <ArrowUpRight size={18} />
            </Link>
          }
        >
          <div className="product-ranking">
            {a.products.slice(0, 4).map((p, i) => (
              <div key={p.id}>
                <span className="rank">0{i + 1}</span>
                <img
                  loading="lazy"
                  src={
                    data.products.find((x) => x.id === p.id)?.image ||
                    "/images/accessories.jpg"
                  }
                  alt=""
                />
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.units} units sold</small>
                </div>
                <span>{compactMoney(p.revenue)}</span>
              </div>
            ))}
            {!a.products.length && <Empty title="No sales yet" />}
          </div>
        </Card>
      </div>
      <div className="grid-three">
        <Card title="Sales by period" subtitle="Non-cancelled orders">
          <ColumnChart data={a.trend} />
        </Card>
        <Card title="Customer growth" subtitle="New contacts in your CRM">
          <ColumnChart data={a.trend} dataKey="customers" />
        </Card>
        <Card title="Order status" subtitle="All orders in this period">
          <DonutChart data={a.statuses} label="Orders" />
        </Card>
      </div>
      <div className="grid-two">
        <Card
          title="Workspace activity"
          action={
            <Link className="link text-sm" to="/app/activity">
              View timeline <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="activity-list">
            {[...data.activities]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 4)
              .map((e) => (
                <div key={e.id}>
                  <span className="activity-symbol">
                    <Clock3 size={16} />
                  </span>
                  <div>
                    <strong>{e.title}</strong>
                    <p>{e.description}</p>
                  </div>
                  <small>{relativeTime(e.createdAt)}</small>
                </div>
              ))}
          </div>
        </Card>
        <Card
          title="Inventory health"
          subtitle={`${a.inventoryUnits.toLocaleString()} units · ${compactMoney(a.inventoryValue)} at cost`}
        >
          <DonutChart data={a.inventory} label="Products" />
        </Card>
      </div>
      <p className="metric-note">
        Revenue counts paid, non-cancelled orders before tax. Gross profit
        subtracts recorded item costs. Customer conversion is paying customers ÷
        all eligible CRM contacts in the period.
      </p>
    </div>
  );
}
