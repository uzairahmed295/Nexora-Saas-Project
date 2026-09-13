const endpoint = "/.netlify/functions/gemini";
export type AIStatus =
  "checking" | "configured" | "unconfigured" | "unavailable" | "offline";
export async function getAIStatus(): Promise<AIStatus> {
  if (!navigator.onLine) return "offline";
  try {
    const r = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.headers.get("content-type")?.includes("application/json"))
      return "unavailable";
    const data = await r.json();
    return data.status === "configured"
      ? "configured"
      : data.status === "unconfigured"
        ? "unconfigured"
        : "unavailable";
  } catch {
    return navigator.onLine ? "unavailable" : "offline";
  }
}
export async function askAI(
  question: string,
  businessContext: Record<string, unknown>,
  history: { role: "user" | "assistant"; text: string }[],
  signal: AbortSignal,
) {
  if (!navigator.onLine) throw new Error("AI requires an internet connection.");
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        question,
        businessContext,
        history: history
          .slice(-8)
          .map((m) => ({ ...m, text: m.text.slice(0, 10000) })),
      }),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new Error(
      navigator.onLine
        ? "AI could not connect. Please try again."
        : "AI requires an internet connection.",
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "AI is unavailable here. Deploy to Netlify and configure the Gemini environment variables.",
    );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "This question could not be processed. Try a shorter question.",
      403: "This request was not accepted. Open NEXORA from its own site and retry.",
      413: "This request contains too much context. Start a new conversation.",
      429: "AI is busy or its usage limit has been reached. Please try again later.",
      502: "The AI provider could not complete the request. Retry shortly.",
      503: "AI is not configured. Add GEMINI_API_KEY and GEMINI_MODEL in Netlify.",
      504: "AI took too long to respond. Please retry.",
    };
    throw new Error(
      messages[response.status] ||
        "AI is temporarily unavailable. Please retry.",
    );
  }
  if (typeof body.text !== "string" || !body.text.trim())
    throw new Error("AI returned no answer. Try asking in a different way.");
  return body.text.slice(0, 20000);
}
