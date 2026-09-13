import { atomic } from "../db/database";
import { userSchema, type User } from "../db/schema";
import { requirePermission } from "./permissions";
import { addActivity, addNotification } from "./events";
import { now, uid } from "../utils/format";
export async function saveMember(input: Partial<User>, id?: string) {
  await atomic((d) => {
    requirePermission(d, "team");
    const old = d.users.find((u) => u.id === id);
    if (id && !old) throw new Error("This member no longer exists.");
    const stamp = now();
    const result = userSchema.safeParse({
      ...old,
      ...input,
      id: old?.id || uid(),
      createdAt: old?.createdAt || stamp,
      updatedAt: stamp,
      lastActive: old?.lastActive || stamp,
    });
    if (!result.success)
      throw new Error("Enter a name, valid email, role and status.");
    const u = result.data;
    const actor = d.users.find((x) => x.id === d.settings[0].currentUserId)!;
    if ((u.role === "Owner" || old?.role === "Owner") && actor.role !== "Owner")
      throw new Error("Only the owner can change owner membership.");
    if (old?.id === actor.id && (u.status !== "Active" || u.role !== old.role))
      throw new Error("You cannot disable yourself or change your own role.");
    if (
      d.users.some(
        (x) => x.id !== u.id && x.email.toLowerCase() === u.email.toLowerCase(),
      )
    )
      throw new Error("This email is already in the team.");
    if (old) d.users = d.users.map((x) => (x.id === u.id ? u : x));
    else d.users.push(u);
    if (!d.users.some((x) => x.role === "Owner" && x.status === "Active"))
      throw new Error("Keep at least one active owner.");
    addActivity(
      d,
      old ? "Team profile updated" : "Local team member added",
      `${u.name} · ${u.role}`,
      "team",
      u.id,
    );
    addNotification(
      d,
      old ? "Team profile updated" : "New local team member",
      `${u.name} · ${u.role}. No invitation email was sent.`,
      "Team activity",
      "/app/team",
    );
  });
}
export async function deleteMember(id: string) {
  await atomic((d) => {
    requirePermission(d, "team");
    const actor = d.users.find((x) => x.id === d.settings[0].currentUserId)!;
    const target = d.users.find((u) => u.id === id);
    if (id === actor.id)
      throw new Error("You cannot delete your current profile.");
    if (target?.role === "Owner" && actor.role !== "Owner")
      throw new Error("Only an owner can remove another owner.");
    d.users = d.users.filter((u) => u.id !== id);
    if (!d.users.some((u) => u.role === "Owner" && u.status === "Active"))
      throw new Error("Keep at least one active owner.");
    addActivity(
      d,
      "Local team member removed",
      target?.name || "Team member",
      "team",
      id,
    );
  });
}
export async function switchProfile(id: string) {
  await atomic((d) => {
    const u = d.users.find((u) => u.id === id && u.status === "Active");
    if (!u) throw new Error("Choose an active local profile.");
    d.settings[0].currentUserId = id;
    u.lastActive = now();
    addActivity(
      d,
      "Local profile switched",
      `${u.name} · ${u.role}`,
      "team",
      id,
    );
  });
}
