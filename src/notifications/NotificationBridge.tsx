import { useEffect, useRef } from "react";
import { useWorkspace } from "../store/workspace";
import { useToast } from "../components/Feedback";
import { installAudioUnlock, playSound } from "./sound";
import { showBrowserNotification } from "./service";
export function NotificationBridge() {
  const { data } = useWorkspace();
  const toast = useToast();
  const seen = useRef<Set<string> | null>(null);
  const blockedHint = useRef(false);
  useEffect(installAudioUnlock, []);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(data.notifications.map((n) => n.id));
      return;
    }
    const fresh = data.notifications.filter(
      (n) =>
        !seen.current!.has(n.id) &&
        Date.now() - Date.parse(n.createdAt) < 20000,
    );
    seen.current = new Set(data.notifications.map((n) => n.id));
    const n = fresh[0];
    if (!n) return;
    toast(
      n.title,
      n.sound === "warning"
        ? "warning"
        : n.sound === "success"
          ? "success"
          : "info",
    );
    void playSound(n.sound, data.settings[0].sounds).then((state) => {
      if (state === "blocked" && !blockedHint.current) {
        blockedHint.current = true;
        toast("Click or press a key to enable notification sounds.", "info");
      }
    });
    if (data.settings[0].browserNotifications)
      showBrowserNotification(n.title, n.message, n.id);
  }, [data.notifications, toast]);
  return null;
}
