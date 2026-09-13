import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Send,
  Copy,
  RotateCcw,
  Trash2,
  MessageSquare,
  WifiOff,
  ArrowUpRight,
  ShieldCheck,
  LoaderCircle,
  PanelLeft,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { repositories } from "../db/database";
import { buildBusinessContext } from "../ai/context";
import { askAI, getAIStatus, type AIStatus } from "../ai/service";
import {
  newConversation,
  addUserMessage,
  saveAIReply,
  clearConversation,
  deleteConversation,
} from "../ai/conversations";
import { useOnline } from "../services/network";
import { Button, Confirm, PageHeader } from "../components/ui";
import { useToast, useAction } from "../components/Feedback";
import { playSound } from "../notifications/sound";
import { initials } from "../utils/format";
const prompts = [
  "Analyze this month's revenue",
  "Find low-stock products",
  "Find inactive customers",
  "Give me a business health summary",
  "Show my top products",
];
export default function Assistant() {
  const { data } = useWorkspace();
  const [active, setActive] = useState<string>();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AIStatus>("checking");
  const [remove, setRemove] = useState<"clear" | "delete">();
  const [showHistory, setShowHistory] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const online = useOnline();
  const toast = useToast();
  const action = useAction();
  const conv = data.aiConversations.find((c) => c.id === active);
  const settings = data.settings[0];
  const user = data.users.find((u) => u.id === settings.currentUserId);
  const statusText = {
    checking: "Checking service…",
    configured: "Gemini configured",
    unconfigured: "Setup required",
    unavailable: "Service unavailable",
    offline: "Offline",
  };
  async function check() {
    setStatus("checking");
    setStatus(await getAIStatus());
  }
  useEffect(() => {
    void check();
  }, [online]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conv?.messages.length, busy]);
  async function send(prompt = input, retry = false, regenerate = false) {
    const question = prompt.trim();
    if (busy || !question) return;
    if (!online) {
      setError("AI requires an internet connection.");
      return;
    }
    if (!settings.aiConsent) {
      setError("Enable AI data sharing below before sending a question.");
      return;
    }
    if (question.length > 2000) {
      setError("Keep your question under 2,000 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const c = new AbortController();
    controller.current = c;
    const timer = setTimeout(() => c.abort(), 30000);
    let id = active;
    try {
      if (!id) {
        id = await newConversation();
        setActive(id);
      }
      if (!retry && !regenerate) {
        await addUserMessage(id, question);
        setInput("");
      }
      const history =
        (await repositories.aiConversations.getById(id))?.messages || [];
      const lastUserIndex = history.map((m) => m.role).lastIndexOf("user");
      const previous = history.slice(0, lastUserIndex);
      const context = buildBusinessContext(
        data,
        [
          ...previous
            .filter((m) => m.role === "user")
            .slice(-2)
            .map((m) => m.text),
          question,
        ].join(" "),
      );
      const answer = await askAI(question, context, previous, c.signal);
      await saveAIReply(id, answer, regenerate);
      setStatus("configured");
      void playSound("ai", settings.sounds);
    } catch (e) {
      setError(
        c.signal.aborted
          ? "AI took too long to respond. Please retry."
          : e instanceof Error
            ? e.message
            : "AI is temporarily unavailable. Please retry.",
      );
    } finally {
      clearTimeout(timer);
      controller.current = null;
      setBusy(false);
    }
  }
  const lastQuestion = conv?.messages
    .filter((m) => m.role === "user")
    .at(-1)?.text;
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Intelligence, with context"
        title="NEXORA Assistant"
        description="Ask better questions. Make your next move with confidence."
        actions={
          <div
            className={`service-state ${online && status === "configured" ? "ready" : ""}`}
          >
            <span />
            {online ? statusText[status] : "Offline"}
          </div>
        }
      />
      <div className="ai-workspace">
        <aside className={`ai-sidebar ${showHistory ? "show" : ""}`}>
          <Button
            disabled={busy}
            onClick={() => {
              setActive(undefined);
              setError("");
              setInput("");
              setShowHistory(false);
            }}
          >
            <Plus size={15} />
            New conversation
          </Button>
          <div className="nav-group">Your conversations</div>
          <div className="ai-history">
            {[...data.aiConversations]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((c) => (
                <button
                  disabled={busy}
                  key={c.id}
                  className={active === c.id ? "active" : ""}
                  onClick={() => {
                    setActive(c.id);
                    setError("");
                    setShowHistory(false);
                  }}
                >
                  <MessageSquare size={15} />
                  <span>{c.title}</span>
                </button>
              ))}
            {!data.aiConversations.length && (
              <p className="muted text-xs px-3">
                Your conversations will be saved here.
              </p>
            )}
          </div>
          <div className="ai-privacy">
            <ShieldCheck size={17} />
            <p>
              Relevant business context is sent only when you ask. Your database
              stays on this device.
            </p>
          </div>
        </aside>
        <section className="ai-chat">
          <div className="ai-chat-top">
            <button
              className="icon-btn ai-history-toggle"
              aria-label="Toggle conversation history"
              onClick={() => setShowHistory(!showHistory)}
            >
              <PanelLeft size={18} />
            </button>
            <strong>{conv?.title || "A fresh perspective starts here"}</strong>
            {conv && (
              <div className="actions">
                <button
                  className="icon-btn"
                  disabled={busy}
                  aria-label="Clear conversation"
                  onClick={() => setRemove("clear")}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="icon-btn"
                  disabled={busy}
                  aria-label="Delete conversation"
                  onClick={() => setRemove("delete")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="ai-messages" aria-live="polite">
            {!conv?.messages.length && (
              <div className="ai-welcome">
                <div className="ai-orb">
                  <Sparkles size={30} />
                </div>
                <h2>
                  Your business has a story.
                  <br />
                  Let’s make sense of it.
                </h2>
                <p>
                  From revenue trends to your next restock, ask about the data
                  already in your workspace.
                </p>
                <div className="prompt-grid">
                  {prompts.map((p) => (
                    <button
                      key={p}
                      disabled={busy || !online}
                      onClick={() => {
                        setInput(p);
                      }}
                    >
                      <span>{p}</span>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {conv?.messages.map((m, i) => (
              <div key={m.id} className={`chat-message ${m.role}`}>
                <span className="avatar">
                  {m.role === "assistant" ? (
                    <Sparkles size={16} />
                  ) : (
                    initials(user?.name || "You")
                  )}
                </span>
                <div>
                  <strong>{m.role === "assistant" ? "NEXORA" : "You"}</strong>
                  <p>{m.text}</p>
                  {m.role === "assistant" && (
                    <div className="response-actions">
                      <button
                        className="btn ghost small"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(m.text);
                            toast("Response copied.");
                          } catch {
                            toast(
                              "Copy is unavailable. Select the response text to copy it.",
                              "info",
                            );
                          }
                        }}
                      >
                        <Copy size={13} />
                        Copy
                      </button>
                      {i === conv.messages.length - 1 && (
                        <button
                          className="btn ghost small"
                          disabled={busy || !online}
                          onClick={() => void send(lastQuestion, true, true)}
                        >
                          <RotateCcw size={13} />
                          Regenerate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="chat-message assistant">
                <span className="avatar">
                  <Sparkles size={16} />
                </span>
                <div>
                  <strong>Reviewing your business context</strong>
                  <div className="typing">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            )}
            <div ref={end} />
          </div>
          {!online && (
            <div className="ai-notice">
              <WifiOff size={20} />
              <div>
                <strong>AI requires an internet connection.</strong>
                <p>Your saved conversations remain available offline.</p>
              </div>
              <Button onClick={() => void check()}>Retry</Button>
            </div>
          )}
          {online &&
            (status === "unconfigured" || status === "unavailable") && (
              <div className="ai-notice">
                <Sparkles size={19} />
                <div>
                  <strong>
                    {status === "unconfigured"
                      ? "Gemini setup required"
                      : "AI service is unavailable here"}
                  </strong>
                  <p>
                    AI needs the Netlify Function and its Gemini environment
                    variables.
                  </p>
                </div>
                <Button onClick={() => void check()}>Retry</Button>
              </div>
            )}
          {error && (
            <div className="ai-error" role="alert">
              <span>{error}</span>
              {lastQuestion && online && (
                <Button
                  variant="small"
                  disabled={busy}
                  onClick={() =>
                    void send(
                      lastQuestion,
                      true,
                      conv?.messages.at(-1)?.role === "assistant",
                    )
                  }
                >
                  Retry
                </Button>
              )}
            </div>
          )}
          {!settings.aiConsent && (
            <div className="ai-consent">
              <p>
                AI questions send relevant totals, product names, customer
                names, and recent conversation text to Google Gemini. Contact
                emails, addresses, and customer notes are excluded from the
                context engine.
              </p>
              <Button
                variant="small"
                busy={action.busy}
                onClick={() =>
                  void action.run(() =>
                    repositories.settings.update(settings.id, {
                      aiConsent: true,
                    }),
                  )
                }
              >
                Enable AI data sharing
              </Button>
            </div>
          )}
          <form
            className="ai-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              rows={2}
              aria-label="Ask NEXORA"
              placeholder="Ask about your business…"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="submit"
              className="btn primary"
              aria-label="Send question"
              disabled={!input.trim() || busy || !online || !settings.aiConsent}
            >
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Send size={17} />
              )}
            </button>
          </form>
          <p className="ai-disclaimer">
            AI can make mistakes. Verify important decisions against your
            records. No actions are executed by the assistant.
          </p>
        </section>
      </div>
      {remove && active && (
        <Confirm
          title={
            remove === "clear" ? "Clear conversation?" : "Delete conversation?"
          }
          description="This removes saved messages from this device and cannot be undone."
          onClose={() => setRemove(undefined)}
          onConfirm={async () => {
            if (remove === "clear") await clearConversation(active);
            else {
              await deleteConversation(active);
              setActive(undefined);
            }
          }}
        />
      )}
    </div>
  );
}
