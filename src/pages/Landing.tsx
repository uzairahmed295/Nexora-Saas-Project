import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  ChartNoAxesCombined,
  Users,
  Package,
  Workflow,
  ShieldCheck,
  WifiOff,
  Command,
  Check,
  Layers,
  ShoppingBag,
  Plus,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { getAnalytics } from "../services/analytics";
import { RevenueChart } from "../charts/BusinessCharts";
import { compactMoney, money, initials } from "../utils/format";
export default function Landing() {
  const { data } = useWorkspace();
  const a = getAnalytics(data);
  const launch = data.settings[0].onboarded ? "/app/dashboard" : "/onboarding";
  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Website navigation">
        <Link to="/" className="brand">
          <img src="/icons/nexora.svg" alt="" />
          NEXORA
        </Link>
        <div className="landing-links">
          <a href="#features">Platform</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#security">Your data</a>
          <a href="#faq">FAQ</a>
        </div>
        <Link className="btn primary" to={launch}>
          Open workspace <ArrowUpRight size={15} />
        </Link>
      </nav>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-tag">
              <span />A clearer way to run your business
            </div>
            <h1>
              Run your business
              <br />
              from one
              <br />
              <em>intelligent workspace.</em>
            </h1>
            <p>
              Your customers, operations, and next big decision.
              <br className="desktop-break" /> Finally, connected in NEXORA.
            </p>
            <div className="actions">
              <Link to={launch} className="btn primary">
                Explore Demo <ArrowRight size={17} />
              </Link>
              <Link
                to={
                  data.settings[0].onboarded
                    ? "/app/assistant"
                    : "/onboarding?next=/app/assistant"
                }
                className="btn"
              >
                <Sparkles size={17} />
                Try AI Assistant
              </Link>
            </div>
            <div className="hero-footnote">
              <span>
                <Check size={14} />
                No database server
              </span>
              <span>
                <Check size={14} />
                Works offline
              </span>
              <span>
                <Check size={14} />
                Your data, your device
              </span>
            </div>
          </div>
          <div className="hero-live-card">
            <div className="hero-live-top">
              <img
                className="mini-brand"
                src="/icons/nexora.svg"
                alt="Nexora"
              />
              <strong>Your business, in focus</strong>
              <span className="badge">Live local data</span>
            </div>
            <div className="hero-metrics">
              <div>
                <span>Revenue · last 30 days</span>
                <strong>{compactMoney(a.values.revenue)}</strong>
                <small>
                  {a.changes.revenue === null
                    ? "No prior-period data"
                    : `${a.changes.revenue >= 0 ? "+" : ""}${a.changes.revenue.toFixed(1)}% vs. previous period`}
                </small>
              </div>
              <div>
                <span>Orders</span>
                <strong>{a.values.orders}</strong>
                <small>Connected to your records</small>
              </div>
            </div>
            <RevenueChart data={a.trend} />
            <div className="hero-signal">
              <span className="insight-icon">
                <Sparkles size={19} />
              </span>
              <div>
                <strong>Your next move is already in your data.</strong>
                <p>{a.lowStock.length} products need a stock review.</p>
              </div>
              <Link to="/app/inventory" aria-label="Review inventory">
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </section>
        <section className="landing-ribbon">
          <span>
            Less switching.
            <br />
            <strong>More moving forward.</strong>
          </span>
          {[
            [Users, "Customer relationships"],
            [Layers, "Business operations"],
            [ChartNoAxesCombined, "Connected analytics"],
            [Sparkles, "Context-aware AI"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Users;
            return (
              <div key={String(label)}>
                <I size={21} />
                {String(label)}
              </div>
            );
          })}
        </section>
        <section id="features" className="landing-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">One workspace. The whole picture.</span>
              <h2>
                Keep everything
                <br />
                moving in the same direction.
              </h2>
            </div>
            <p>
              From a first customer to a fulfilled order, the details stay
              connected. So you can focus on what comes next.
            </p>
          </div>
          <div className="landing-feature-grid">
            {[
              [
                Users,
                "Relationships, remembered",
                "A useful customer timeline with purchase history, notes, and the details that make service personal.",
                "customers",
              ],
              [
                Package,
                "Operations, in sync",
                "Keep products, stock, orders, and invoices connected through every change.",
                "products",
              ],
              [
                ChartNoAxesCombined,
                "Numbers that tell a story",
                "Explore revenue, products, customers, and inventory from a single source of truth.",
                "analytics",
              ],
            ].map(([Icon, title, desc, path]) => {
              const I = Icon as typeof Users;
              return (
                <Link
                  to={`/app/${path}`}
                  className="landing-feature"
                  key={String(title)}
                >
                  <I size={24} />
                  <h3>{String(title)}</h3>
                  <p>{String(desc)}</p>
                  <span>
                    Explore {String(path)} <ArrowUpRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        <section id="intelligence" className="landing-section feature-split">
          <div>
            <span className="eyebrow">Intelligence with context</span>
            <h2>
              Ask your business
              <br />a better question.
            </h2>
            <p>
              “What changed this month?” “Which customers need a follow-up?”
              NEXORA brings relevant records to Gemini, so the conversation
              starts with your actual business.
            </p>
            <ul className="feature-checks">
              <li>
                <Check size={17} />
                Relevant context, without sending your entire database
              </li>
              <li>
                <Check size={17} />
                Saved conversations and useful follow-up questions
              </li>
              <li>
                <Check size={17} />
                You review decisions and stay in control
              </li>
            </ul>
            <Link className="btn" to="/app/assistant">
              Meet your assistant <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="question-board">
            <Sparkles size={26} />
            <span>Start with a question</span>
            {[
              "Analyze this month’s revenue",
              "Find customers we should reconnect with",
              "Show me our top-performing products",
            ].map((p) => (
              <Link to="/app/assistant" key={p}>
                <span>{p}</span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            <small>
              Gemini requires internet and server-side configuration.
            </small>
          </div>
        </section>
        <section className="landing-section feature-split reverse">
          <div className="landing-numbers">
            <span className="eyebrow">Current workspace · last 30 days</span>
            <div>
              <span>Net revenue</span>
              <strong>{money(a.values.revenue)}</strong>
            </div>
            <div>
              <span>Gross profit</span>
              <strong>{money(a.values.profit)}</strong>
            </div>
            <div>
              <span>Customer conversion</span>
              <strong>{a.values.conversion}%</strong>
            </div>
            <Link to="/app/analytics">
              Explore the numbers <ArrowRight size={16} />
            </Link>
          </div>
          <div>
            <span className="eyebrow">See beyond the spreadsheet</span>
            <h2>
              A clear view.
              <br />A confident next step.
            </h2>
            <p>
              Compare periods, understand your best sellers, and spot changes
              early. Every number on this page is calculated from the local
              workspace records.
            </p>
            <Link to="/app/analytics" className="btn">
              Explore analytics <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <section className="landing-section feature-split">
          <div>
            <span className="eyebrow">Customer relationships</span>
            <h2>
              Remember the details.
              <br />
              Build the relationship.
            </h2>
            <p>
              A shared view of customer notes, tags, orders, and activity helps
              every interaction start with a little more context.
            </p>
            <Link className="btn" to="/app/customers">
              Explore the CRM <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="landing-contacts">
            {data.customers.slice(0, 4).map((c) => (
              <Link key={c.id} to={`/app/customers/${c.id}`}>
                <span className="avatar">{initials(c.name)}</span>
                <div>
                  <strong>{c.name}</strong>
                  <span>{c.company}</span>
                </div>
                <span className="badge active">{c.status}</span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            {!data.customers.length && (
              <p>Your customer relationships begin here.</p>
            )}
          </div>
        </section>
        <section className="landing-section feature-split reverse">
          <div className="automation-example">
            <div>
              <span>WHEN</span>
              <Package size={22} />
              <strong>Inventory drops below 10</strong>
            </div>
            <ArrowRight size={23} />
            <div>
              <span>THEN</span>
              <Workflow size={22} />
              <strong>Create a restock notification</strong>
            </div>
            <small>Example workflow · runs while your workspace is open</small>
          </div>
          <div>
            <span className="eyebrow">Thoughtful automation</span>
            <h2>
              Give the routine work
              <br />a little momentum.
            </h2>
            <p>
              Set a condition, choose an action, and see every execution. Create
              restock alerts, follow-up tasks, and high-value order
              notifications.
            </p>
            <Link className="btn" to="/app/automation">
              Explore workflows <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <section id="security" className="landing-section security-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">Clear boundaries. More control.</span>
              <h2>
                Your workspace.
                <br />
                On your terms.
              </h2>
            </div>
          </div>
          <div className="landing-feature-grid">
            {[
              [
                DatabaseIcon,
                "Local by design",
                "Your application records live in IndexedDB on this device. Export a JSON backup whenever you need it.",
              ],
              [
                ShieldCheck,
                "Secrets stay server-side",
                "The Gemini API key belongs in Netlify environment variables. It is never stored in the browser.",
              ],
              [
                WifiOff,
                "Built to keep going",
                "Once cached, your core workspace works offline. The app clearly shows when AI is unavailable.",
              ],
            ].map(([Icon, title, description]) => {
              const I = Icon as typeof Users;
              return (
                <div className="security-item" key={String(title)}>
                  <I size={23} />
                  <h3>{String(title)}</h3>
                  <p>{String(description)}</p>
                </div>
              );
            })}
          </div>
          <p className="security-note">
            Local profiles demonstrate roles; this version does not provide
            secure production authentication or cross-device synchronization.
          </p>
        </section>
        <section id="faq" className="landing-section faq-section">
          <div>
            <span className="eyebrow">A few useful answers</span>
            <h2>
              Before you make
              <br />
              yourself at home.
            </h2>
          </div>
          <div>
            {[
              [
                "Do I need a database server?",
                "No. The application uses IndexedDB in your browser. Node.js is needed only for development and builds; there is no local backend or database server.",
              ],
              [
                "What works without internet?",
                "Once the production app is cached, your dashboard, CRM, catalog, inventory, orders, invoices, analytics, search and settings remain available. Gemini requires internet.",
              ],
              [
                "Is the demo a real shared team account?",
                "No. Profiles and roles are stored locally to demonstrate workflows. Real authentication, team invitations, synchronization, and online payments are outside this browser-first version.",
              ],
              [
                "How does the AI use my data?",
                "After you enable AI data sharing and ask a question, the frontend selects relevant business context. A Netlify Function sends that context to Gemini using a server-side API key.",
              ],
              [
                "Can I take my records with me?",
                "Yes. Export a JSON backup in Settings. Importing validates the backup and asks for confirmation before replacing existing data.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <PlusIcon />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="landing-cta">
          <Sparkles size={25} />
          <h2>
            Your next move starts
            <br />
            with a clearer view.
          </h2>
          <p>Bring your business into one intelligent workspace.</p>
          <Link to={launch} className="btn primary">
            Explore NEXORA <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Link className="brand" to="/">
          <img src="/icons/nexora.svg" alt="" />
          NEXORA
        </Link>
        <span>Run your business from one intelligent workspace.</span>
        <Link to="/app/settings">
          Workspace settings <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
const DatabaseIcon = Layers;
function PlusIcon() {
  return <Plus size={18} className="faq-plus" />;
}
