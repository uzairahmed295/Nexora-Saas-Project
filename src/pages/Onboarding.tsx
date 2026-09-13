import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  ChartNoAxesCombined,
  Users,
  Workflow,
} from "lucide-react";
import { useWorkspace } from "../store/workspace";
import { atomic } from "../db/database";
import { Button, Field } from "../components/ui";
import { useAction } from "../components/Feedback";
export default function Onboarding() {
  const { data, refresh } = useWorkspace();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { busy, run } = useAction();
  const s = data.settings[0];
  const u = data.users.find((u) => u.id === s.currentUserId)!;
  const next = params.get("next");
  const target =
    next && /^\/app\/[a-z/-]+$/.test(next) ? next : "/app/dashboard";
  return (
    <div className="onboarding">
      <section className="onboarding-story">
        <Link to="/" className="brand">
          <img src="/icons/nexora.svg" alt="" />
          NEXORA
        </Link>
        <div>
          <span className="eyebrow">Your next chapter starts here</span>
          <h1>
            A little more clarity.
            <br />A lot more possibility.
          </h1>
          <p>
            Bring the moving parts of your business into a workspace that makes
            sense.
          </p>
          <ul>
            <li>
              <ChartNoAxesCombined size={20} />
              Understand your business at a glance
            </li>
            <li>
              <Users size={20} />
              Keep customer relationships close
            </li>
            <li>
              <Workflow size={20} />
              Give routine work a rhythm
            </li>
          </ul>
        </div>
        <small>Run your business from one intelligent workspace.</small>
      </section>
      <section className="onboarding-form">
        <div>
          <span className="badge">Local workspace setup</span>
          <h2>Make yourself at home.</h2>
          <p>Choose the profile and company details for this device.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await atomic((d) => {
                  const user = d.users.find(
                    (u) => u.id === d.settings[0].currentUserId,
                  )!;
                  user.name = String(f.get("name")).trim();
                  user.email = String(f.get("email")).trim();
                  d.settings[0].companyName = String(f.get("company")).trim();
                  d.settings[0].onboarded = true;
                });
                await refresh();
                navigate(target);
              });
            }}
          >
            <Field label="Your name">
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={u.name}
                autoComplete="name"
              />
            </Field>
            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                maxLength={200}
                defaultValue={u.email}
                autoComplete="email"
              />
            </Field>
            <Field label="Company name">
              <input
                name="company"
                required
                maxLength={200}
                defaultValue={s.companyName}
                autoComplete="organization"
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              busy={busy}
              className="w-full"
            >
              Enter workspace <ArrowRight size={16} />
            </Button>
          </form>
          <button
            className="btn ghost w-full mt-2"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await atomic((d) => {
                  d.settings[0].onboarded = true;
                });
                await refresh();
                navigate(target);
              })
            }
          >
            Continue with demo profile
          </button>
          <div className="onboarding-note">
            <ShieldCheck size={18} />
            <p>
              This is a local demo profile, not an online account. No password,
              secure authentication, or shared workspace is created. Data is
              saved in this browser.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
