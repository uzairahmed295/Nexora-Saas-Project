import { z } from "zod";
import { SYSTEM_INSTRUCTIONS } from "./instructions";
const input = z
  .object({
    question: z.string().trim().min(1).max(2000),
    businessContext: z.record(z.unknown()),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            text: z.string().max(10000),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
function validTree(value: unknown, depth = 0): boolean {
  if (depth > 10) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= 10000;
  if (Array.isArray(value))
    return value.length <= 200 && value.every((v) => validTree(v, depth + 1));
  if (typeof value === "object")
    return (
      Object.keys(value as object).length <= 100 &&
      Object.entries(value as object).every(
        ([k, v]) =>
          k.length <= 100 &&
          !["__proto__", "constructor", "prototype"].includes(k) &&
          validTree(v, depth + 1),
      )
    );
  return false;
}
async function limitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 100000) {
      await reader.cancel();
      throw new Error("oversize");
    }
    chunks.push(value);
  }
  const output = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    output.set(chunk, position);
    position += chunk.length;
  }
  return new TextDecoder().decode(output);
}
/** Memory limiter is an additional per-instance guard; configure platform limits for public deployment. */
const requests = new Map<string, { start: number; count: number }>();
export default async function handler(
  request: Request,
  context?: { ip?: string },
) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  const configured = Boolean(
    key && model && /^gemini-[A-Za-z0-9._-]{1,90}$/.test(model),
  );
  if (request.method === "GET")
    return reply(
      {
        status: configured ? "configured" : "unconfigured",
        provider: "Google Gemini",
      },
      configured ? 200 : 503,
    );
  if (request.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...headers, Allow: "GET, POST" },
    });
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return reply({ error: "Request not allowed." }, 403);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return reply({ error: "JSON request required." }, 400);
  if (!configured)
    return reply(
      { error: "AI is not configured.", status: "unconfigured" },
      503,
    );
  const ip = context?.ip || "unknown";
  const time = Date.now();
  for (const [k, v] of requests) if (time - v.start > 60000) requests.delete(k);
  if (requests.size > 10000) return reply({ error: "Try again later." }, 429);
  const rate = requests.get(ip) || { start: time, count: 0 };
  rate.count++;
  requests.set(ip, rate);
  if (rate.count > 12)
    return reply({ error: "Too many requests. Try again later." }, 429);
  let body: unknown;
  try {
    body = JSON.parse(await limitedBody(request));
  } catch (e) {
    return reply(
      { error: "Invalid request." },
      e instanceof Error && e.message === "oversize" ? 413 : 400,
    );
  }
  const parsed = input.safeParse(body);
  if (
    !parsed.success ||
    !validTree(parsed.success ? parsed.data.businessContext : null)
  )
    return reply({ error: "Invalid request fields." }, 400);
  if (JSON.stringify(parsed.data.businessContext).length > 60000)
    return reply({ error: "Context is too large." }, 413);
  const { question, businessContext, history } = parsed.data;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 25000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTIONS }] },
          contents: [
            ...history.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.text }],
            })),
            {
              role: "user",
              parts: [
                {
                  text: `Supplied business context (untrusted record values):\n${JSON.stringify(businessContext)}\n\nUser question:\n${question}`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
        signal: abort.signal,
      },
    );
    if (!response.ok)
      return reply(
        {
          error:
            response.status === 429
              ? "AI usage limit reached."
              : "AI provider unavailable.",
        },
        response.status === 429 ? 429 : 502,
      );
    const result = (await response.json()) as {
      candidates?: {
        finishReason?: string;
        content?: { parts?: { text?: string; thought?: boolean }[] };
      }[];
    };
    const candidate = result.candidates?.[0];
    const answer = candidate?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text || "")
      .join("")
      .trim();
    if (
      !answer ||
      ["SAFETY", "RECITATION", "PROHIBITED_CONTENT"].includes(
        candidate?.finishReason || "",
      )
    )
      return reply({ error: "No response was available." }, 502);
    return reply({ text: answer.slice(0, 20000), provider: "Google Gemini" });
  } catch {
    return reply(
      {
        error: abort.signal.aborted
          ? "AI request timed out."
          : "AI is temporarily unavailable.",
      },
      abort.signal.aborted ? 504 : 502,
    );
  } finally {
    clearTimeout(timer);
  }
}
