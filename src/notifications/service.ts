import { atomic } from "../db/database";
export async function markRead(id: string) {
  await atomic((d) => {
    const n = d.notifications.find((n) => n.id === id);
    if (n) n.read = true;
  });
}
export async function markAllRead() {
  await atomic((d) => {
    d.notifications.forEach((n) => {
      n.read = true;
    });
  });
}
export async function removeNotification(id: string) {
  await atomic((d) => {
    d.notifications = d.notifications.filter((n) => n.id !== id);
  });
}
export async function requestBrowserNotifications() {
  if (!("Notification" in window)) return "unsupported";
  if (!window.isSecureContext) return "unsupported";
  return Notification.requestPermission();
}
export function showBrowserNotification(
  title: string,
  message: string,
  id: string,
) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return false;
  try {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg)
            return reg.showNotification(title, {
              body: message,
              icon: "/icons/icon-192.png",
              tag: id,
              data: { href: "/app/notifications" },
            });
          const n = new Notification(title, { body: message, tag: id });
          n.onclick = () => window.focus();
        })
        .catch(() => {});
    else new Notification(title, { body: message, tag: id });
    return true;
  } catch {
    return false;
  }
}
