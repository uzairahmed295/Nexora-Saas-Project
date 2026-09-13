import { userMessage } from "../utils/errors";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  X,
  LoaderCircle,
  Inbox,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
export function Button({
  children,
  variant = "",
  busy = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`btn ${variant} ${props.className || ""}`}
    >
      {busy && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`badge ${tone || String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      {children}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="actions">{actions}</div>
    </header>
  );
}
export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title = "Nothing here yet",
  description = "Your records will appear here.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <span>Loading your workspace…</span>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    const prior = document.activeElement as HTMLElement;
    d?.showModal();
    d?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    document.body.classList.add("modal-open");
    return () => {
      d?.close();
      document.body.classList.remove("modal-open");
      prior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <p className="muted">{description}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="danger"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError(userMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
}
export function Metric({
  label,
  value,
  change,
  hint,
}: {
  label: string;
  value: string;
  change: number | null;
  hint?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-comparison">
        {change === null ? (
          <span className="muted">No previous data</span>
        ) : (
          <span className={change >= 0 ? "positive" : "negative"}>
            {change >= 0 ? (
              <ArrowUpRight size={15} />
            ) : (
              <ArrowDownRight size={15} />
            )}{" "}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        <span>{hint || "vs. previous period"}</span>
      </div>
    </div>
  );
}
export function Form({
  children,
  onSubmit,
  submitLabel = "Save changes",
  onCancel,
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  submitLabel?: string;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSubmit(data);
      onCancel();
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {children}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" busy={busy} type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
