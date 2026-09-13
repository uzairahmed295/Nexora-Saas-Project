import { useMemo, useState } from "react";
import { useWorkspace } from "../store/workspace";
import { getAnalytics, type Period } from "../services/analytics";
import { Card, Metric, PageHeader, Empty } from "../components/ui";
import { PeriodSelect } from "../components/PeriodSelect";
import {
  RevenueChart,
  ColumnChart,
  DonutChart,
} from "../charts/BusinessCharts";
import { money, compactMoney } from "../utils/format";
export default function Analytics() {
  const { data } = useWorkspace();
  const [period, setPeriod] = useState<Period>("30");
  const a = useMemo(() => getAnalytics(data, period), [data, period]);
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Business intelligence"
        title="Analytics"
        description="The full picture. Every number connected to your business."
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />
      <div className="metric-grid">
        {(
          ["revenue", "orders", "customers", "profit", "conversion"] as const
        ).map((k) => (
          <Metric
            key={k}
            label={
              {
                revenue: "Net revenue",
                orders: "Orders",
                customers: "New customers",
                profit: "Gross profit",
                conversion: "Customer conversion",
              }[k]
            }
            value={
              k === "revenue" || k === "profit"
                ? compactMoney(a.values[k])
                : k === "conversion"
                  ? `${a.values[k]}%`
                  : String(a.values[k])
            }
            change={a.changes[k]}
          />
        ))}
      </div>
      <Card
        title="Revenue performance"
        subtitle="Paid sales excluding tax · equal-length previous period comparison · UTC"
        className="mb-6"
      >
        <RevenueChart data={a.trend} />
      </Card>
      <div className="grid-equal">
        <Card title="Order volume">
          <ColumnChart data={a.trend} />
        </Card>
        <Card title="Customer acquisition">
          <ColumnChart data={a.trend} dataKey="customers" />
        </Card>
      </div>
      <div className="grid-three">
        <Card title="Revenue by category">
          <DonutChart data={a.categories} isMoney />
        </Card>
        <Card title="Order distribution">
          <DonutChart data={a.statuses} />
        </Card>
        <Card
          title="Current inventory"
          subtitle="Current stock, independent of date filter"
        >
          <DonutChart data={a.inventory} />
        </Card>
      </div>
      <Card
        title="Product performance"
        subtitle="Paid sales · discounts allocated proportionally"
      >
        {!a.products.length ? (
          <Empty title="No product sales in this period" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Units sold</th>
                  <th>Net revenue</th>
                  <th>Revenue share</th>
                </tr>
              </thead>
              <tbody>
                {a.products.map((p) => (
                  <tr key={p.id}>
                    <td className="table-main">{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.units}</td>
                    <td>{money(p.revenue)}</td>
                    <td>
                      <div className="share-bar">
                        <span
                          style={{
                            width: `${a.values.revenue ? (p.revenue / a.values.revenue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      {a.values.revenue
                        ? ((p.revenue / a.values.revenue) * 100).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="metric-note">
        Revenue excludes tax and unpaid/cancelled orders. Profit uses historical
        item costs. Conversion measures CRM contacts who placed a paid order;
        website traffic is not tracked. Inventory reflects current stock;
        historical stock snapshots are not recorded.
      </p>
    </div>
  );
}
