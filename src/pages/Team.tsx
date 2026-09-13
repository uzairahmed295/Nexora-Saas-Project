import { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { useWorkspace } from "../store/workspace";
import {
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  Field,
  Form,
  Modal,
  PageHeader,
} from "../components/ui";
import { SearchInput } from "../components/ListTools";
import { saveMember, deleteMember } from "../services/team";
import { can } from "../services/permissions";
import type { User } from "../db/schema";
import { initials, relativeTime } from "../utils/format";
export default function Team() {
  const { data } = useWorkspace();
  const [edit, setEdit] = useState<User | null | undefined>();
  const [remove, setRemove] = useState<User>();
  const [q, setQ] = useState("");
  const role = data.users.find(
    (u) => u.id === data.settings[0].currentUserId,
  )?.role;
  const rows = data.users.filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Good work happens together"
        title="Team"
        description="The people behind your business."
        actions={
          can(role, "team") && (
            <Button variant="primary" onClick={() => setEdit(null)}>
              <Plus size={16} />
              Add local member
            </Button>
          )
        }
      />
      <div className="info-banner">
        <ShieldCheck size={19} />
        <p>
          This version uses local role profiles. There is no secure sign-in,
          shared access, or email invitation service. Switch profiles in
          Settings to explore permissions.
        </p>
      </div>
      <Card>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search team…" />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="person">
                      <span className="avatar">{initials(u.name)}</span>
                      <div>
                        <div className="table-main">
                          {u.name}
                          {u.id === data.settings[0].currentUserId && (
                            <span className="table-sub"> (you)</span>
                          )}
                        </div>
                        <div className="table-sub">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge>{u.role}</Badge>
                  </td>
                  <td>
                    <Badge>{u.status}</Badge>
                  </td>
                  <td>{relativeTime(u.lastActive)}</td>
                  <td>
                    {can(role, "team") && (
                      <div className="actions">
                        <button
                          className="icon-btn"
                          aria-label={`Edit ${u.name}`}
                          onClick={() => setEdit(u)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn"
                          disabled={u.id === data.settings[0].currentUserId}
                          aria-label={`Delete ${u.name}`}
                          onClick={() => setRemove(u)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="No team members found" />}
      </Card>
      <Card title="Local role permissions" className="mt-6">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Operations</th>
                <th>Team / data management</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Owner</td>
                <td>Full access</td>
                <td>Full access, including owner membership</td>
              </tr>
              <tr>
                <td>Admin</td>
                <td>Full access</td>
                <td>Manage members, import/export/reset</td>
              </tr>
              <tr>
                <td>Manager</td>
                <td>Create/edit business records and automation</td>
                <td>Read only</td>
              </tr>
              <tr>
                <td>Employee</td>
                <td>Read business records; use AI and notifications</td>
                <td>Read only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      {edit !== undefined && (
        <Modal
          title={edit ? "Edit local member" : "Add local member"}
          onClose={() => setEdit(undefined)}
        >
          <Form
            onCancel={() => setEdit(undefined)}
            submitLabel="Save member"
            onSubmit={async (f) => {
              await saveMember(
                {
                  name: String(f.get("name")),
                  email: String(f.get("email")),
                  role: f.get("role") as User["role"],
                  status: f.get("status") as User["status"],
                },
                edit?.id,
              );
            }}
          >
            <Field label="Full name">
              <input
                name="name"
                required
                maxLength={200}
                autoFocus
                defaultValue={edit?.name}
              />
            </Field>
            <Field label="Email">
              <input
                name="email"
                required
                type="email"
                maxLength={200}
                defaultValue={edit?.email}
              />
            </Field>
            <div className="form-grid">
              <Field label="Role">
                <select name="role" defaultValue={edit?.role || "Employee"}>
                  {["Owner", "Admin", "Manager", "Employee"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select name="status" defaultValue={edit?.status || "Active"}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
            </div>
            <p className="muted text-xs">
              This creates a local profile only. No invitation is sent.
            </p>
          </Form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="Remove team member?"
          description={`Delete the local profile for ${remove.name}? Past activity entries are preserved.`}
          onClose={() => setRemove(undefined)}
          onConfirm={() => deleteMember(remove.id)}
        />
      )}
    </div>
  );
}
