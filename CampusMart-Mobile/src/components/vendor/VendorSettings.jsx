import { useEffect, useState } from "react";
import { getVendorById, upsertVendor } from "../../features/vendor/services/vendorService";

export default function VendorSettings({ vendor }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    businessName: vendor?.businessName || "Maa'r Ranna",
    phone: "",
    email: "",
    address: "",
    city: "Asansol",
    area: "",
    imageUrl: "",
    bannerUrl: "",
    openingTime: "09:00",
    closingTime: "22:00",
    isOpen: true,
  });

  useEffect(() => {
    async function loadVendor() {
      if (!vendor?.id) return;

      try {
        setLoading(true);

        const data = await getVendorById(vendor.id);

        if (data) {
          setForm({
            businessName: data.businessName || vendor.businessName || "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
            city: data.city || "Asansol",
            area: data.area || "",
            imageUrl: data.imageUrl || "",
            bannerUrl: data.bannerUrl || "",
            openingTime: data.openingTime || "09:00",
            closingTime: data.closingTime || "22:00",
            isOpen: data.isOpen ?? true,
          });
        }
      } catch (error) {
        console.error("Failed to load vendor settings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadVendor();
  }, [vendor?.id]);

  function updateForm(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave() {
    if (!vendor?.id) return;

    try {
      setSaving(true);

      await upsertVendor(vendor.id, {
        ...form,
        ownerId: vendor.ownerId || "maar-ranna",
        vendorType: vendor.vendorType || "tiffin",
        status: "active",
      });

      alert("Settings saved successfully.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen px-5 pt-5">
        <div className="rounded-[26px] bg-white p-6 text-center font-black shadow-sm">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pb-6 pt-5">
      <header>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="mt-1 text-sm font-bold text-slate-500">
          Manage your business profile.
        </p>
      </header>

      <section className="mt-6 rounded-[28px] bg-orange-600 p-5 text-white shadow-lg shadow-orange-600/20">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/20 text-4xl">
            🍲
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-black">
              {form.businessName || "Maa'r Ranna"}
            </h2>
            <p className="mt-1 text-sm font-bold opacity-90">
              Homemade Tiffin Service
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3">
          <div>
            <p className="text-sm font-black">Business Status</p>
            <p className="text-xs font-bold opacity-80">
              {form.isOpen ? "Open for orders" : "Closed now"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => updateForm("isOpen", !form.isOpen)}
            className={`relative h-8 w-14 rounded-full transition ${
              form.isOpen ? "bg-green-400" : "bg-white/30"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                form.isOpen ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <SettingsCard title="Business Details">
          <Input
            label="Business Name"
            value={form.businessName}
            onChange={(v) => updateForm("businessName", v)}
          />

          <Input
            label="Phone Number"
            value={form.phone}
            onChange={(v) => updateForm("phone", v)}
            placeholder="Example: 9876543210"
          />

          <Input
            label="Email"
            value={form.email}
            onChange={(v) => updateForm("email", v)}
            placeholder="business@email.com"
          />

          <Input
            label="Area"
            value={form.area}
            onChange={(v) => updateForm("area", v)}
            placeholder="Example: Burnpur, Asansol"
          />

          <Input
            label="City"
            value={form.city}
            onChange={(v) => updateForm("city", v)}
          />

          <TextArea
            label="Full Address"
            value={form.address}
            onChange={(v) => updateForm("address", v)}
            placeholder="Full pickup / business address"
          />
        </SettingsCard>

        <SettingsCard title="Business Timing">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Opening Time"
              type="time"
              value={form.openingTime}
              onChange={(v) => updateForm("openingTime", v)}
            />

            <Input
              label="Closing Time"
              type="time"
              value={form.closingTime}
              onChange={(v) => updateForm("closingTime", v)}
            />
          </div>
        </SettingsCard>

        <SettingsCard title="Media">
          <Input
            label="Logo / Image URL"
            value={form.imageUrl}
            onChange={(v) => updateForm("imageUrl", v)}
            placeholder="Paste image URL"
          />

          <Input
            label="Banner URL"
            value={form.bannerUrl}
            onChange={(v) => updateForm("bannerUrl", v)}
            placeholder="Paste banner URL"
          />
        </SettingsCard>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full rounded-[18px] bg-orange-600 py-4 text-sm font-black text-white shadow-lg shadow-orange-600/20 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

function SettingsCard({ title, children }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-orange-100 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows="4"
        className="w-full rounded-2xl border border-orange-100 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
  );
}