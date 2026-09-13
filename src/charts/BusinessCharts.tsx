import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { compactMoney } from "../utils/format";
import { Empty } from "../components/ui";
const colors = ["#6865df", "#aaa6f0", "#86bdd0", "#bed2e6", "#dddff4"];
const tooltip = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 12,
};
const axis = {
  tick: { fill: "var(--muted)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
};
export function RevenueChart({
  data,
}: {
  data: { date: string; revenue: number; previous: number }[];
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Revenue over the selected period, compared with the previous period"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ left: 8, right: 20, top: 15, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7975e6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#7975e6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <XAxis dataKey="date" {...axis} minTickGap={24} />
          <YAxis {...axis} tickFormatter={compactMoney} width={58} />
          <Tooltip
            contentStyle={tooltip}
            formatter={(v) => compactMoney(Number(v))}
          />
          <Area
            name="Previous period"
            type="monotone"
            dataKey="previous"
            stroke="#b7becd"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="transparent"
          />
          <Area
            name="Revenue"
            type="monotone"
            dataKey="revenue"
            stroke="#6865df"
            strokeWidth={2.7}
            fill="url(#revenue-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ColumnChart({
  data,
  dataKey = "orders",
  money = false,
}: {
  data: Record<string, string | number>[];
  dataKey?: string;
  money?: boolean;
}) {
  return (
    <div
      className="chart small-chart"
      role="img"
      aria-label={`${dataKey} by period`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ left: 0, right: 20, bottom: 0, top: 10 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <XAxis dataKey="date" {...axis} minTickGap={20} />
          <YAxis
            {...axis}
            width={45}
            allowDecimals={false}
            tickFormatter={money ? compactMoney : undefined}
          />
          <Tooltip contentStyle={tooltip} />
          <Bar
            dataKey={dataKey}
            fill="#8883e7"
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function DonutChart({
  data,
  label = "Total",
  isMoney = false,
}: {
  data: { name: string; value: number }[];
  label?: string;
  isMoney?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total)
    return (
      <Empty
        title="No data in this period"
        description="Try a broader date range."
      />
    );
  return (
    <div className="donut-wrap">
      <div
        className="donut"
        role="img"
        aria-label={data
          .map((d) => `${d.name}: ${isMoney ? compactMoney(d.value) : d.value}`)
          .join(", ")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.filter((d) => d.value > 0)}
              dataKey="value"
              innerRadius="72%"
              outerRadius="95%"
              paddingAngle={3}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data
                .filter((d) => d.value > 0)
                .map((d) => (
                  <Cell
                    key={d.name}
                    fill={
                      colors[
                        data.findIndex((x) => x.name === d.name) % colors.length
                      ]
                    }
                  />
                ))}
            </Pie>
            <Tooltip
              contentStyle={tooltip}
              formatter={(v) => (isMoney ? compactMoney(Number(v)) : v)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-label">
          <strong>{isMoney ? compactMoney(total) : total}</strong>
          <span>{label}</span>
        </div>
      </div>
      <div className="chart-legend">
        {data.map((d, i) => (
          <div key={d.name}>
            <span>
              <i style={{ background: colors[i % colors.length] }} />
              {d.name}
            </span>
            <strong>{isMoney ? compactMoney(d.value) : d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
