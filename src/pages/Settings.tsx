import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  UserRound,
  Palette,
  Bell,
  Sparkles,
  Database,
  Monitor,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Volume2,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { atomic, repositories } from "../db/database";
import {
  userSchema,
  type Settings as WorkspaceSettings,
  type Snapshot,
} from "../db/schema";
import { Button, Card, Confirm, Field, PageHeader } from "../components/ui";
import { useToast, useAction } from "../components/Feedback";
import { switchProfile } from "../services/team";
import { can, requirePermission } from "../services/permissions";
import {
  exportBackup,
  validateBackup,
  importBackup,
  resetDemo,
  clearLocalData,
} from "../services/dataManagement";
import { requestBrowserNotifications } from "../notifications/service";
import { playSound, unlockAudio, type Sound } from "../notifications/sound";
import { getAIStatus, type AIStatus } from "../ai/service";
import { usePWA, installPWA, applyPWAUpdate } from "../services/pwa";
import { simulateEvent } from "../services/simulation";
const tabs = [
  ["profile", "Profile & workspace", UserRound],
  ["appearance", "Appearance", Palette],
  ["notifications", "Notifications", Bell],
  ["ai", "AI Assistant", Sparkles],
  ["data", "Data management", Database],
  ["device", "Device & app", Monitor],
] as const;
export default function Settings() {
  const { data } = useWorkspace();
  const [tab, setTab] = useState("profile");
  const [confirm, setConfirm] = useState<"reset" | "clear" | "import">();
  const [backup, setBackup] = useState<Snapshot>();
  const [status, setStatus] = useState<AIStatus>("checking");
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined"
      ? Notification.permission
      : "unsupported",
  );
  const s = data.settings[0];
  const user = data.users.find((u) => u.id === s.currentUserId)!;
  const toast = useToast();
  const { busy, run } = useAction();
  const pwa = usePWA();
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void getAIStatus().then(setStatus);
  }, []);
  const update = (patch: Partial<WorkspaceSettings>) =>
    run(() => repositories.settings.update(s.id, patch), "Settings saved.");
  return (
    <div className="page-enter">
      <PageHeader
        title="Settings"
        description="Make your workspace work for you."
      />
      <div className="settings-layout">
        <nav aria-label="Settings sections" className="settings-nav">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {tab === "profile" && (
            <>
              <Card
                title="Your profile"
                subtitle="Your identity in this local workspace"
              >
                <form
                  className="card-body"
                  key={user.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(
                      () =>
                        atomic((d) => {
                          const current = d.users.find(
                            (u) => u.id === d.settings[0].currentUserId,
                          )!;
                          const result = userSchema.safeParse({
                            ...current,
                            name: String(f.get("name")),
                            email: String(f.get("email")),
                          });
                          if (!result.success)
                            throw new Error("Enter a name and valid email.");
                          if (
                            d.users.some(
                              (u) =>
                                u.id !== current.id &&
                                u.email.toLowerCase() ===
                                  result.data.email.toLowerCase(),
                            )
                          )
                            throw new Error(
                              "This email is already used by another profile.",
                            );
                          Object.assign(current, result.data);
                        }),
                      "Profile saved.",
                    );
                  }}
                >
                  <div className="form-grid">
                    <Field label="Full name">
                      <input
                        name="name"
                        required
                        maxLength={200}
                        defaultValue={user.name}
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={200}
                        defaultValue={user.email}
                      />
                    </Field>
                  </div>
                  <Button type="submit" variant="primary" busy={busy}>
                    Save profile
                  </Button>
                </form>
              </Card>
              <Card
                title="Workspace information"
                subtitle="Used on newly generated invoices"
              >
                <form
                  className="card-body"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(
                      () =>
                        atomic((d) => {
                          requirePermission(d, "data");
                          const name = String(f.get("company")).trim(),
                            email = String(f.get("email")).trim();
                          if (!name || !email.includes("@"))
                            throw new Error(
                              "Enter a company name and valid email.",
                            );
                          Object.assign(d.settings[0], {
                            companyName: name,
                            companyEmail: email,
                            companyAddress: String(f.get("address")).trim(),
                          });
                        }),
                      "Workspace saved.",
                    );
                  }}
                >
                  <div className="form-grid">
                    <Field label="Company name">
                      <input
                        name="company"
                        required
                        maxLength={200}
                        defaultValue={s.companyName}
                        disabled={!can(user.role, "data")}
                      />
                    </Field>
                    <Field label="Company email">
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={200}
                        defaultValue={s.companyEmail}
                        disabled={!can(user.role, "data")}
                      />
                    </Field>
                  </div>
                  <Field label="Address">
                    <textarea
                      name="address"
                      maxLength={500}
                      defaultValue={s.companyAddress}
                      disabled={!can(user.role, "data")}
                    />
                  </Field>
                  {can(user.role, "data") && (
                    <Button variant="primary" type="submit" busy={busy}>
                      Save workspace
                    </Button>
                  )}
                </form>
              </Card>
              <Card
                title="Local profile switcher"
                subtitle="Explore demo permissions. This is not secure authentication."
              >
                <div className="card-body">
                  <Field label="Active profile">
                    <select
                      disabled={busy}
                      value={s.currentUserId}
                      onChange={(e) =>
                        void run(
                          () => switchProfile(e.target.value),
                          "Local profile switched.",
                        )
                      }
                    >
                      {data.users
                        .filter((u) => u.status === "Active")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} · {u.role}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
              </Card>
            </>
          )}
          {tab === "appearance" && (
            <Card
              title="Appearance"
              subtitle="Choose how NEXORA looks on this device."
            >
              <div className="card-body">
                <div className="theme-options">
                  {(["light", "dark"] as const).map((theme) => (
                    <button
                      key={theme}
                      disabled={busy}
                      className={`theme-choice ${s.theme === theme ? "selected" : ""}`}
                      onClick={() => void update({ theme })}
                    >
                      {theme === "light" ? (
                        <Sun size={24} />
                      ) : (
                        <Moon size={24} />
                      )}
                      <strong>
                        {theme === "light" ? "Light" : "Dark"} theme
                      </strong>
                      {s.theme === theme && <CheckCircle2 size={17} />}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
          {tab === "notifications" && (
            <>
              <Card title="Notifications" subtitle="Stay informed, your way.">
                <SettingRow
                  title="Notification sounds"
                  description="Short, locally generated sounds for workspace events."
                >
                  <Toggle
                    label="Notification sounds"
                    checked={s.sounds}
                    disabled={busy}
                    onChange={() => void update({ sounds: !s.sounds })}
                  />
                </SettingRow>
                <SettingRow
                  title="Browser notifications"
                  description={`Permission: ${permission}. In-app notifications always remain available.`}
                >
                  <Button
                    variant="small"
                    busy={busy}
                    onClick={() =>
                      void run(async () => {
                        const result = await requestBrowserNotifications();
                        setPermission(result);
                        if (result === "granted") {
                          await repositories.settings.update(s.id, {
                            browserNotifications: !s.browserNotifications,
                          });
                          toast(
                            s.browserNotifications
                              ? "Browser notifications disabled."
                              : "Browser notifications enabled.",
                          );
                        } else
                          toast(
                            result === "unsupported"
                              ? "Browser notifications are unavailable. In-app notifications are active."
                              : "Permission was not granted. In-app notifications are active.",
                            "info",
                          );
                      })
                    }
                  >
                    {s.browserNotifications ? "Disable" : "Enable"}
                  </Button>
                </SettingRow>
                <div className="card-body">
                  <h3>Preview sounds</h3>
                  <p className="muted text-sm mt-2 mb-4">
                    Browsers need a click or keypress before playing audio.
                    Sound previews use this interaction.
                  </p>
                  <div className="actions">
                    {(
                      [
                        "success",
                        "notification",
                        "warning",
                        "error",
                        "ai",
                      ] as Sound[]
                    ).map((sound) => (
                      <Button
                        key={sound}
                        variant="small"
                        disabled={!s.sounds}
                        onClick={async () => {
                          await unlockAudio();
                          const r = await playSound(sound, s.sounds);
                          if (r === "blocked")
                            toast(
                              "Your browser blocked audio. Check site sound permissions.",
                              "info",
                            );
                        }}
                      >
                        <Volume2 size={14} />
                        {sound === "ai" ? "AI response" : sound}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}
          {tab === "ai" && (
            <Card
              title="AI Assistant"
              subtitle="Google Gemini through a serverless boundary."
            >
              <SettingRow
                title="Service status"
                description={
                  status === "configured"
                    ? "Environment is configured. A successful answer verifies provider access."
                    : status === "unconfigured"
                      ? "Add GEMINI_API_KEY and GEMINI_MODEL in Netlify."
                      : status === "offline"
                        ? "AI requires an internet connection."
                        : "The Netlify AI function is unavailable on this host."
                }
              >
                <Button
                  variant="small"
                  busy={status === "checking"}
                  onClick={() => {
                    setStatus("checking");
                    void getAIStatus().then(setStatus);
                  }}
                >
                  Check connection
                </Button>
              </SettingRow>
              <SettingRow
                title="AI data sharing"
                description="Send relevant business context and conversation text to Google Gemini when you ask a question."
              >
                <Toggle
                  label="AI data sharing"
                  disabled={busy}
                  checked={s.aiConsent}
                  onChange={() => void update({ aiConsent: !s.aiConsent })}
                />
              </SettingRow>
              <div className="card-body">
                <div className="info-banner">
                  <ShieldCheck size={19} />
                  <p>
                    API keys are never collected or stored in this browser.
                    Configure secrets only in Netlify environment variables.
                  </p>
                </div>
                <p className="muted text-sm">
                  The assistant provides analysis only. It cannot change orders,
                  delete customers, or perform actions. All important changes
                  stay under your control.
                </p>
              </div>
            </Card>
          )}
          {tab === "data" && (
            <>
              <Card title="Demo & simulation">
                <SettingRow
                  title="Demo content"
                  description={
                    s.demoMode
                      ? "This workspace contains demonstration records. Reset recreates the dataset."
                      : "You are using a local workspace without the demo label."
                  }
                >
                  <span className="badge">
                    {s.demoMode ? "Demo mode" : "Local data"}
                  </span>
                </SettingRow>
                <SettingRow
                  title="Live demo simulation"
                  description="Creates one small, labeled order about every 45 seconds while this tab is visible. Stock and reports update normally."
                >
                  <Toggle
                    label="Live demo simulation"
                    checked={s.simulation}
                    disabled={
                      busy || !s.demoMode || !can(user.role, "commerce")
                    }
                    onChange={() => void update({ simulation: !s.simulation })}
                  />
                </SettingRow>
                {s.simulation && (
                  <div className="card-body">
                    <Button
                      busy={busy}
                      onClick={() =>
                        void run(simulateEvent, "Demo event processed.")
                      }
                    >
                      <RotateCcw size={15} />
                      Simulate one event now
                    </Button>
                  </div>
                )}
              </Card>
              <Card
                title="Data management"
                subtitle="Keep a backup before replacing or clearing records."
              >
                <SettingRow
                  title="Export workspace"
                  description="Download all records, settings, and conversations as JSON. Backups contain your business data."
                >
                  <Button
                    busy={busy}
                    onClick={() => void run(exportBackup, "Backup downloaded.")}
                  >
                    <Download size={15} />
                    Export JSON
                  </Button>
                </SettingRow>
                <SettingRow
                  title="Import backup"
                  description="Validate and replace this workspace with a NEXORA JSON backup."
                >
                  <Button
                    disabled={!can(user.role, "data") || busy}
                    onClick={() => file.current?.click()}
                  >
                    <Upload size={15} />
                    Import JSON
                  </Button>
                  <input
                    hidden
                    ref={file}
                    type="file"
                    accept="application/json,.json"
                    aria-label="Import backup file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      void run(async () => {
                        if (f.size > 20000000)
                          throw new Error(
                            "Choose a backup smaller than 20 MB.",
                          );
                        let parsed: unknown;
                        try {
                          parsed = JSON.parse(await f.text());
                        } catch {
                          throw new Error("This file is not valid JSON.");
                        }
                        const validated = validateBackup(parsed);
                        setBackup(validated);
                        setConfirm("import");
                      });
                    }}
                  />
                </SettingRow>
                <SettingRow
                  title="Reset demo data"
                  description="Replace all records and conversations with the original demo dataset."
                >
                  <Button
                    disabled={!can(user.role, "data") || busy}
                    onClick={() => setConfirm("reset")}
                  >
                    <RotateCcw size={15} />
                    Reset demo
                  </Button>
                </SettingRow>
                <SettingRow
                  title="Clear local business data"
                  description="Remove business records and conversations. Keep your current profile and company details in an empty workspace."
                >
                  <Button
                    variant="danger"
                    disabled={!can(user.role, "data") || busy}
                    onClick={() => setConfirm("clear")}
                  >
                    <Trash2 size={15} />
                    Clear data
                  </Button>
                </SettingRow>
              </Card>
            </>
          )}
          {tab === "device" && (
            <Card title="Device & application">
              <SettingRow
                title="Offline availability"
                description={
                  {
                    ready:
                      "All production app assets have been cached for offline use.",
                    caching: "Preparing the app for offline use…",
                    development:
                      "Offline caching is available in the production build.",
                    unavailable:
                      "Service workers require HTTPS and a supported browser.",
                    error:
                      "Offline caching failed. Reconnect and reload to retry.",
                  }[pwa.status]
                }
              >
                <span className="badge">{pwa.status}</span>
              </SettingRow>
              <SettingRow
                title="Install NEXORA"
                description={
                  pwa.installed
                    ? "NEXORA is installed on this device."
                    : pwa.installable
                      ? "Install a standalone app window on this device."
                      : "Use your browser’s Install app or Add to Home Screen option when available."
                }
              >
                <Button
                  disabled={!pwa.installable}
                  onClick={() =>
                    void run(async () => {
                      const result = await installPWA();
                      toast(
                        result === "accepted"
                          ? "NEXORA installed."
                          : "Installation dismissed.",
                        "info",
                      );
                    })
                  }
                >
                  <Download size={15} />
                  Install app
                </Button>
              </SettingRow>
              {pwa.updateReady && (
                <SettingRow
                  title="Update available"
                  description="Reload to activate the latest app version."
                >
                  <Button onClick={applyPWAUpdate}>Update & reload</Button>
                </SettingRow>
              )}
              <SettingRow
                title="Storage persistence"
                description="Request protection from automatic browser storage cleanup. Export backups for portability."
              >
                <Button
                  busy={busy}
                  onClick={() =>
                    void run(async () => {
                      if (!navigator.storage?.persist) {
                        toast(
                          "Persistent storage is unavailable in this browser.",
                          "info",
                        );
                        return;
                      }
                      const granted = await navigator.storage.persist();
                      toast(
                        granted
                          ? "Persistent storage granted."
                          : "The browser did not grant persistent storage. Keep regular backups.",
                        granted ? "success" : "info",
                      );
                    })
                  }
                >
                  Request persistence
                </Button>
              </SettingRow>
              <div className="card-body">
                <p className="muted text-sm">
                  Workspace data stays in this browser and is not synchronized
                  across devices. Clearing browser storage removes it. AI
                  requires internet. Workflow checks and simulation run only
                  while the app is open.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
      {confirm && (
        <Confirm
          title={
            confirm === "import"
              ? "Replace workspace from backup?"
              : confirm === "reset"
                ? "Reset all demo data?"
                : "Clear local business data?"
          }
          description={
            confirm === "import"
              ? `Import ${backup?.customers.length} customers, ${backup?.products.length} products and ${backup?.orders.length} orders? Existing records will be replaced. AI sharing, simulation, and browser notifications will be disabled.`
              : "This replaces your business data on this device. Export a backup first if you need to keep it. This cannot be undone."
          }
          onClose={() => {
            setConfirm(undefined);
            setBackup(undefined);
          }}
          onConfirm={async () => {
            if (confirm === "import" && backup) await importBackup(backup);
            else if (confirm === "reset") await resetDemo();
            else await clearLocalData();
            toast("Workspace data updated.");
          }}
        />
      )}
    </div>
  );
}
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={`switch ${checked ? "on" : ""}`}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
