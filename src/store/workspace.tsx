import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useRef,
} from "react";
import { readSnapshot, subscribe } from "../db/database";
import { initialize } from "../db/seed";
import { emptySnapshot, type Snapshot } from "../db/schema";
import { Button, Loading } from "../components/ui";
type Store = { data: Snapshot; refresh: () => Promise<void> };
const Context = createContext<Store | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const token = ++generation.current;
    const next = await readSnapshot();
    if (token === generation.current) setData(next);
  }, []);
  async function boot() {
    setLoading(true);
    setError(false);
    try {
      await initialize();
      await refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void boot();
    return subscribe(() => {
      void refresh().catch(() => setError(true));
    });
  }, [refresh]);
  useEffect(() => {
    const theme = data.settings[0]?.theme || "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("nexora-theme", theme);
    } catch {
      /* Preference persistence is optional. */
    }
  }, [data.settings]);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="empty">
        <h1>We couldn’t open your workspace.</h1>
        <p>
          Allow browser storage, then retry. Your existing data will be kept.
        </p>
        <Button onClick={boot}>Retry</Button>
      </div>
    );
  if (!data.settings.length) return <Loading />;
  return (
    <Context.Provider value={{ data, refresh }}>{children}</Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace unavailable");
  return value;
}
