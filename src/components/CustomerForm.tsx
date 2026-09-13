import { Field, Form, Modal } from "./ui";
import type { Customer } from "../db/schema";
import { saveCustomer } from "../services/records";
export function CustomerForm({
  customer,
  onClose,
}: {
  customer?: Customer;
  onClose: () => void;
}) {
  return (
    <Modal
      title={customer ? "Edit customer" : "Add a customer"}
      onClose={onClose}
    >
      <Form
        onCancel={onClose}
        submitLabel={customer ? "Save changes" : "Create customer"}
        onSubmit={async (f) => {
          await saveCustomer(
            {
              name: String(f.get("name")),
              email: String(f.get("email")),
              company: String(f.get("company")),
              phone: String(f.get("phone")),
              address: String(f.get("address")),
              status: f.get("status") as Customer["status"],
              tags: String(f.get("tags"))
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              notes: String(f.get("notes")),
            },
            customer?.id,
          );
        }}
      >
        <div className="form-grid">
          <Field label="Full name">
            <input
              name="name"
              required
              maxLength={200}
              autoFocus
              defaultValue={customer?.name}
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              required
              maxLength={200}
              defaultValue={customer?.email}
            />
          </Field>
          <Field label="Company">
            <input
              name="company"
              maxLength={200}
              defaultValue={customer?.company}
            />
          </Field>
          <Field label="Phone">
            <input
              name="phone"
              type="tel"
              maxLength={40}
              defaultValue={customer?.phone}
            />
          </Field>
        </div>
        <Field label="Address">
          <input
            name="address"
            maxLength={500}
            defaultValue={customer?.address}
          />
        </Field>
        <div className="form-grid">
          <Field label="Status">
            <select name="status" defaultValue={customer?.status || "Active"}>
              {["Active", "Lead", "Inactive"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Tags" hint="Separate tags with commas.">
            <input
              name="tags"
              maxLength={400}
              defaultValue={customer?.tags.join(", ")}
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            name="notes"
            maxLength={5000}
            defaultValue={customer?.notes}
          />
        </Field>
      </Form>
    </Modal>
  );
}
