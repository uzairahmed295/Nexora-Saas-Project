import type { Snapshot, User } from "../db/schema";
export type Permission =
  "view" | "commerce" | "delete" | "team" | "data" | "automation";
export function can(role: User["role"] | undefined, permission: Permission) {
  if (permission === "view") return true;
  if (role === "Owner" || role === "Admin") return true;
  if (role === "Manager")
    return permission === "commerce" || permission === "automation";
  return false;
}
export function requirePermission(d: Snapshot, permission: Permission) {
  const user = d.users.find((u) => u.id === d.settings[0]?.currentUserId);
  if (user?.status !== "Active" || !can(user.role, permission))
    throw new Error(
      "Your local role does not allow this action. Switch to an authorized profile in Settings.",
    );
}
