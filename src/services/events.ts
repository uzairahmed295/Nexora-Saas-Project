import type { Snapshot, Entities } from "../db/schema";
import { uid, now } from "../utils/format";
export function addActivity(
  d: Snapshot,
  title: string,
  description: string,
  entityType: Entities["activities"]["entityType"],
  entityId = "",
) {
  const stamp = now();
  d.activities.unshift({
    id: uid(),
    createdAt: stamp,
    updatedAt: stamp,
    title,
    description,
    entityType,
    entityId,
    actor:
      d.users.find((u) => u.id === d.settings[0]?.currentUserId)?.name ||
      "Workspace",
  });
}
export function addNotification(
  d: Snapshot,
  title: string,
  message: string,
  type: Entities["notifications"]["type"],
  href = "/app/notifications",
  sound: Entities["notifications"]["sound"] = "notification",
) {
  const stamp = now();
  d.notifications.unshift({
    id: uid(),
    createdAt: stamp,
    updatedAt: stamp,
    title,
    message,
    type,
    href,
    sound,
    read: false,
  });
}
