import { atomic } from "../db/database";
import { now, uid } from "../utils/format";
export async function newConversation() {
  return atomic((d) => {
    const stamp = now();
    const c = {
      id: uid(),
      createdAt: stamp,
      updatedAt: stamp,
      title: "New conversation",
      messages: [],
    };
    d.aiConversations.unshift(c);
    return c.id;
  });
}
export async function addUserMessage(id: string, text: string) {
  await atomic((d) => {
    const c = d.aiConversations.find((c) => c.id === id);
    if (!c) throw new Error("This conversation is no longer available.");
    if (c.messages.length >= 96)
      throw new Error("This conversation is full. Start a new conversation.");
    const stamp = now();
    c.messages.push({ id: uid(), createdAt: stamp, role: "user", text });
    c.title = c.messages.find((m) => m.role === "user")!.text.slice(0, 60);
    c.updatedAt = stamp;
  });
}
export async function saveAIReply(
  id: string,
  text: string,
  regenerate = false,
) {
  await atomic((d) => {
    const c = d.aiConversations.find((c) => c.id === id);
    if (!c) throw new Error("This conversation is no longer available.");
    if (regenerate && c.messages.at(-1)?.role === "assistant") c.messages.pop();
    const stamp = now();
    c.messages.push({ id: uid(), createdAt: stamp, role: "assistant", text });
    c.updatedAt = stamp;
  });
}
export async function clearConversation(id: string) {
  await atomic((d) => {
    const c = d.aiConversations.find((c) => c.id === id);
    if (c) {
      c.messages = [];
      c.title = "New conversation";
      c.updatedAt = now();
    }
  });
}
export async function deleteConversation(id: string) {
  await atomic((d) => {
    d.aiConversations = d.aiConversations.filter((c) => c.id !== id);
  });
}
