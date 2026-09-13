import { useState } from "react";
import type { Product } from "../db/schema";
import { Field, Form, Modal } from "./ui";
import { saveProduct } from "../services/records";
export function ProductForm({
  product,
  onClose,
}: {
  product?: Product;
  onClose: () => void;
}) {
  const [image, setImage] = useState(
    product?.image || "/images/accessories.jpg",
  );
  const [imageError, setImageError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  return (
    <Modal title={product ? "Edit product" : "Add a product"} onClose={onClose}>
      <Form
        onCancel={onClose}
        submitLabel={product ? "Save changes" : "Create product"}
        onSubmit={async (f) => {
          if (imageBusy)
            throw new Error("Wait for your image to finish loading.");
          if (imageError) throw new Error(imageError);
          await saveProduct(
            {
              name: String(f.get("name")),
              description: String(f.get("description")),
              sku: String(f.get("sku")).toUpperCase(),
              category: String(f.get("category")),
              price: Number(f.get("price")),
              cost: Number(f.get("cost")),
              stock: Number(f.get("stock")),
              lowStockThreshold: Number(f.get("threshold")),
              status: f.get("status") as Product["status"],
              image,
            },
            product?.id,
          );
        }}
      >
        <div className="upload-field">
          <img src={image || "/images/accessories.jpg"} alt="Product preview" />
          <Field
            label="Product image"
            hint="Optional JPEG, PNG or WebP, up to 1 MB. Stored on this device."
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Product image file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (
                  f.size > 1000000 ||
                  !["image/png", "image/jpeg", "image/webp"].includes(f.type)
                ) {
                  setImageError("Choose a JPEG, PNG or WebP image under 1 MB.");
                  return;
                }
                setImageError("");
                setImageBusy(true);
                const reader = new FileReader();
                reader.onload = () => {
                  setImage(String(reader.result));
                  setImageBusy(false);
                };
                reader.onerror = () => {
                  setImageError("We couldn’t read that image.");
                  setImageBusy(false);
                };
                reader.readAsDataURL(f);
              }}
            />
            {imageError && <small className="negative">{imageError}</small>}
          </Field>
        </div>
        <Field label="Product name">
          <input
            required
            name="name"
            maxLength={200}
            autoFocus
            defaultValue={product?.name}
          />
        </Field>
        <div className="form-grid">
          <Field label="SKU">
            <input
              required
              name="sku"
              maxLength={50}
              defaultValue={product?.sku}
            />
          </Field>
          <Field label="Category">
            <input
              name="category"
              required
              maxLength={200}
              list="categories"
              defaultValue={product?.category || "Accessories"}
            />
            <datalist id="categories">
              {[
                "Lighting",
                "Furniture",
                "Accessories",
                "Electronics",
                "Stationery",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </datalist>
          </Field>
          <Field label="Price (USD)">
            <input
              required
              type="number"
              name="price"
              min="0"
              step="0.01"
              max="1000000000"
              defaultValue={product?.price}
            />
          </Field>
          <Field label="Cost (USD)">
            <input
              required
              type="number"
              name="cost"
              min="0"
              step="0.01"
              max="1000000000"
              defaultValue={product?.cost}
            />
          </Field>
          <Field label="Stock">
            <input
              required
              type="number"
              name="stock"
              min="0"
              step="1"
              max="1000000"
              defaultValue={product?.stock || 0}
            />
          </Field>
          <Field label="Low-stock threshold">
            <input
              required
              type="number"
              name="threshold"
              min="0"
              step="1"
              max="100000"
              defaultValue={product?.lowStockThreshold ?? 10}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            name="description"
            maxLength={5000}
            defaultValue={product?.description}
            placeholder="Materials, dimensions, features, or care details…"
          />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={product?.status || "Active"}>
            <option>Active</option>
            <option>Archived</option>
          </select>
        </Field>
      </Form>
    </Modal>
  );
}
