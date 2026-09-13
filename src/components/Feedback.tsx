import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  Component,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { Button } from "./ui";
import { uid } from "../utils/format";
import { userMessage } from "../utils/errors";
type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
};
const Context = createContext<(message: string, type?: Toast["type"]) => void>(
  () => {},
);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = uid();
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
    },
    [],
  );
  return (
    <Context.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div className={`toast ${t.type}`} key={t.id}>
            {t.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : t.type === "info" ? (
              <Info size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{t.message}</span>
            <button
              className="icon-btn"
              onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
export const useToast = () => useContext(Context);
export function useAction() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function run(fn: () => Promise<unknown>, message?: string) {
    setBusy(true);
    try {
      await fn();
      if (message) toast(message);
    } catch (e) {
      toast(userMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="empty">
          <h1>Something went wrong.</h1>
          <p>Your saved data is still on this device.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      );
    return this.props.children;
  }
}
