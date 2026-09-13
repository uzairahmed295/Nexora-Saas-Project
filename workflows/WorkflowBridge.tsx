import { useEffect } from "react";
import { subscribe } from "../db/database";
import { runWorkflows } from "./engine";
import { useToast } from "../components/Feedback";
export function WorkflowBridge() {
  const toast = useToast();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const run = async () => {
      if (stopped) return;
      try {
        await runWorkflows();
      } catch {
        toast(
          "Automation could not run. Retry from the Automation page.",
          "warning",
        );
      }
    };
    let ownWrite = false;
    const schedule = () => {
      if (ownWrite) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        ownWrite = true;
        await run();
        ownWrite = false;
      }, 350);
    };
    const unsubscribe = subscribe(schedule);
    const interval = setInterval(schedule, 60000);
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribe();
    };
  }, [toast]);
  return null;
}
