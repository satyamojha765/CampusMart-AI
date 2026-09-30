import {
  useEffect,
  useState,
} from "react";

import {
  getVendorById,
  upsertVendor,
} from "../../features/vendor/services/vendorService";

import { useAuth } from "../../context/AuthContext";

const ADMIN_EMAIL =
  "campusmart05@gmail.com";

const EMPTY_FORM = {
  businessName: "",
  tagline: "",
  description: "",

  phone: "",
  whatsapp: "",
  email: "",

  area: "",
  city: "Asansol",
  serviceArea: "",
  address: "",

  vegPrice: "",
  nonVegPrice: "",
  monthlyPrice: "",
  deliveryCharge: "",
  minimumOrder: "",

  openingTime: "09:00",
  closingTime: "22:00",

  imageUrl: "",
  logoUrl: "",
  bannerUrl: "",

  isOpen: true,
  active: true,
  approved: true,
  pickupAvailable: true,
  deliveryAvailable: true,

  status: "active",
};

export default function VendorSettings({
  vendor,
  onVendorUpdated,
}) {
  const {
    currentUser,
    userProfile,
  } = useAuth();

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const email = String(
    currentUser?.email || ""
  )
    .trim()
    .toLowerCase();

  const role = String(
    userProfile?.role || ""
  )
    .trim()
    .toLowerCase();

  const isAdmin =
    email === ADMIN_EMAIL ||
    role === "admin" ||
    role === "superadmin" ||
    role === "super-admin" ||
    userProfile?.isAdmin === true ||
    userProfile?.admin === true;

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      if (!vendor?.id) {
        setLoading(false);
        setMessage(
          "Vendor ID nahi mila."
        );
        return;
      }

      try {
        setLoading(true);
        setMessage("");

        const vendorData =
          await getVendorById(
            vendor.id
          );

        if (!mounted) {
          return;
        }

        setForm(
          createVendorForm({
            ...vendor,
            ...(vendorData || {}),
          })
        );
      } catch (error) {
        console.error(
          "Vendor settings load failed:",
          error
        );

        if (mounted) {
          setMessage(
            error?.message ||
              "Vendor settings load nahi hui."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [vendor?.id]);

  function updateForm(
    fieldName,
    value
  ) {
    setMessage("");

    setForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  }

  async function handleSave() {
    if (!vendor?.id) {
      alert(
        "Vendor ID nahi mila."
      );
      return;
    }

    const businessName =
      form.businessName.trim();

    if (!businessName) {
      alert(
        "Business name required hai."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const updateData = {
        businessName,
        name: businessName,

        tagline:
          form.tagline.trim(),

        description:
          form.description.trim(),

        phone:
          form.phone.trim(),

        whatsapp:
          form.whatsapp.trim(),

        email:
          form.email.trim(),

        area:
          form.area.trim(),

        city:
          form.city.trim() ||
          "Asansol",

        serviceArea:
          form.serviceArea.trim(),

        address:
          form.address.trim(),

        vegPrice:
          toNumber(
            form.vegPrice
          ),

        nonVegPrice:
          toNumber(
            form.nonVegPrice
          ),

        monthlyPrice:
          toNumber(
            form.monthlyPrice
          ),

        deliveryCharge:
          toNumber(
            form.deliveryCharge
          ),

        minimumOrder:
          toNumber(
            form.minimumOrder
          ),

        openingTime:
          form.openingTime ||
          "09:00",

        closingTime:
          form.closingTime ||
          "22:00",

        imageUrl:
          form.imageUrl.trim(),

        logoUrl:
          form.logoUrl.trim(),

        bannerUrl:
          form.bannerUrl.trim(),

        isOpen:
          Boolean(
            form.isOpen
          ),

        pickupAvailable:
          Boolean(
            form.pickupAvailable
          ),

        deliveryAvailable:
          Boolean(
            form.deliveryAvailable
          ),
      };

      if (isAdmin) {
        updateData.active =
          Boolean(form.active);

        updateData.approved =
          Boolean(
            form.approved
          );

        updateData.status =
          form.status ||
          "active";
      }

      const savedVendor =
        await upsertVendor(
          vendor.id,
          updateData
        );

      if (!savedVendor) {
        throw new Error(
          "Vendor save ke baad reload nahi hua."
        );
      }

      setForm(
        createVendorForm(
          savedVendor
        )
      );

      onVendorUpdated?.(
        savedVendor
      );

      const successMessage =
        `${businessName} settings saved successfully.`;

      setMessage(
        successMessage
      );

      alert(
        successMessage
      );
    } catch (error) {
      console.error(
        "Vendor settings save failed:",
        error
      );

      const errorMessage =
        error?.message ||
        "Settings save nahi hui.";

      setMessage(
        errorMessage
      );

      alert(
        errorMessage
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-5">
        <div className="rounded-[28px] bg-white p-7 text-center shadow-xl">
          <div className="text-6xl">
            ⚙️
          </div>

          <h2 className="mt-4 text-xl font-black">
            Loading Settings
          </h2>
        </div>
      </div>
    );
  }

  const vendorName =
    form.businessName ||
    vendor?.businessName ||
    vendor?.name ||
    "Tiffin Vendor";

  return (
    <div className="min-h-screen bg-[#fffaf5] px-4 pb-28 pt-5">
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black">
            Vendor Settings
          </h1>

          {isAdmin && (
            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
              Admin
            </span>
          )}
        </div>

        <p className="mt-1 text-sm font-bold text-slate-500">
          Editing:{" "}
          <span className="text-orange-600">
            {vendorName}
          </span>
        </p>

        <p className="mt-1 break-all text-[11px] font-bold text-slate-400">
          vendors/{vendor?.id}
        </p>
      </header>

      {message && (
        <div className="mt-5 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
          {message}
        </div>
      )}

      <section className="mt-6 rounded-[30px] bg-gradient-to-br from-orange-600 to-amber-500 p-5 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[26px] bg-white/20 text-5xl">
            🍲
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-black">
              {vendorName}
            </h2>

            <p className="mt-1 truncate text-sm font-bold text-white/85">
              {form.tagline ||
                "Homemade Tiffin Service"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <SwitchRow
            title="Open for Orders"
            subtitle={
              form.isOpen
                ? "Customers order kar sakte hain"
                : "Orders temporarily closed hain"
            }
            checked={form.isOpen}
            onChange={() =>
              updateForm(
                "isOpen",
                !form.isOpen
              )
            }
            light
          />
        </div>
      </section>

      {isAdmin && (
        <SettingsCard
          title="Admin Controls"
          admin
        >
          <SwitchRow
            title="Vendor Active"
            subtitle="Vendor ko active ya inactive karo."
            checked={form.active}
            onChange={() =>
              updateForm(
                "active",
                !form.active
              )
            }
          />

          <SwitchRow
            title="Vendor Approved"
            subtitle="Vendor approval control karo."
            checked={form.approved}
            onChange={() =>
              updateForm(
                "approved",
                !form.approved
              )
            }
          />

          <SelectInput
            label="Status"
            value={form.status}
            onChange={(value) =>
              updateForm(
                "status",
                value
              )
            }
            options={[
              {
                value: "active",
                label: "Active",
              },
              {
                value: "inactive",
                label: "Inactive",
              },
              {
                value: "pending",
                label: "Pending",
              },
              {
                value: "suspended",
                label: "Suspended",
              },
            ]}
          />
        </SettingsCard>
      )}

      <SettingsCard title="Business Details">
        <Input
          label="Business Name *"
          value={form.businessName}
          onChange={(value) =>
            updateForm(
              "businessName",
              value
            )
          }
        />

        <Input
          label="Tagline"
          value={form.tagline}
          onChange={(value) =>
            updateForm(
              "tagline",
              value
            )
          }
        />

        <TextArea
          label="Description"
          value={form.description}
          onChange={(value) =>
            updateForm(
              "description",
              value
            )
          }
        />

        <Input
          label="Phone"
          value={form.phone}
          onChange={(value) =>
            updateForm(
              "phone",
              value
            )
          }
          type="tel"
        />

        <Input
          label="WhatsApp"
          value={form.whatsapp}
          onChange={(value) =>
            updateForm(
              "whatsapp",
              value
            )
          }
          type="tel"
        />

        <Input
          label="Email"
          value={form.email}
          onChange={(value) =>
            updateForm(
              "email",
              value
            )
          }
          type="email"
        />
      </SettingsCard>

      <SettingsCard title="Location">
        <Input
          label="Area"
          value={form.area}
          onChange={(value) =>
            updateForm(
              "area",
              value
            )
          }
        />

        <Input
          label="City"
          value={form.city}
          onChange={(value) =>
            updateForm(
              "city",
              value
            )
          }
        />

        <Input
          label="Service Area"
          value={form.serviceArea}
          onChange={(value) =>
            updateForm(
              "serviceArea",
              value
            )
          }
        />

        <TextArea
          label="Full Address"
          value={form.address}
          onChange={(value) =>
            updateForm(
              "address",
              value
            )
          }
        />
      </SettingsCard>

      <SettingsCard title="Prices">
        <div className="grid grid-cols-2 gap-3">
          <PriceInput
            label="Veg"
            value={form.vegPrice}
            onChange={(value) =>
              updateForm(
                "vegPrice",
                value
              )
            }
          />

          <PriceInput
            label="Non-Veg"
            value={
              form.nonVegPrice
            }
            onChange={(value) =>
              updateForm(
                "nonVegPrice",
                value
              )
            }
          />
        </div>

        <PriceInput
          label="Monthly"
          value={
            form.monthlyPrice
          }
          onChange={(value) =>
            updateForm(
              "monthlyPrice",
              value
            )
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <PriceInput
            label="Delivery Charge"
            value={
              form.deliveryCharge
            }
            onChange={(value) =>
              updateForm(
                "deliveryCharge",
                value
              )
            }
          />

          <PriceInput
            label="Minimum Order"
            value={
              form.minimumOrder
            }
            onChange={(value) =>
              updateForm(
                "minimumOrder",
                value
              )
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Delivery Options">
        <SwitchRow
          title="Home Delivery"
          subtitle="Address par delivery available."
          checked={
            form.deliveryAvailable
          }
          onChange={() =>
            updateForm(
              "deliveryAvailable",
              !form.deliveryAvailable
            )
          }
        />

        <SwitchRow
          title="Pickup Available"
          subtitle="Vendor location se pickup."
          checked={
            form.pickupAvailable
          }
          onChange={() =>
            updateForm(
              "pickupAvailable",
              !form.pickupAvailable
            )
          }
        />
      </SettingsCard>

      <SettingsCard title="Business Timing">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Opening"
            value={
              form.openingTime
            }
            onChange={(value) =>
              updateForm(
                "openingTime",
                value
              )
            }
            type="time"
          />

          <Input
            label="Closing"
            value={
              form.closingTime
            }
            onChange={(value) =>
              updateForm(
                "closingTime",
                value
              )
            }
            type="time"
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Images">
        <Input
          label="Main Image URL"
          value={form.imageUrl}
          onChange={(value) =>
            updateForm(
              "imageUrl",
              value
            )
          }
          type="url"
        />

        <Input
          label="Logo URL"
          value={form.logoUrl}
          onChange={(value) =>
            updateForm(
              "logoUrl",
              value
            )
          }
          type="url"
        />

        <Input
          label="Banner URL"
          value={
            form.bannerUrl
          }
          onChange={(value) =>
            updateForm(
              "bannerUrl",
              value
            )
          }
          type="url"
        />
      </SettingsCard>

      <div className="sticky bottom-20 z-30 mt-6 rounded-[24px] border border-orange-100 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-[18px] bg-orange-600 py-4 text-base font-black text-white disabled:opacity-60"
        >
          {saving
            ? "Saving..."
            : `Save ${vendorName}`}
        </button>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  children,
  admin = false,
}) {
  return (
    <section
      className={`mt-5 rounded-[28px] border p-5 shadow-sm ${
        admin
          ? "border-purple-200 bg-purple-50"
          : "border-orange-100 bg-white"
      }`}
    >
      <h2 className="text-lg font-black">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-600">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-2xl border border-orange-100 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-600">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        rows="4"
        className="w-full resize-none rounded-2xl border border-orange-100 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none"
      />
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-600">
        {label}
      </label>

      <div className="flex items-center rounded-2xl border border-orange-100 bg-slate-50 px-4">
        <span className="font-black text-slate-500">
          ₹
        </span>

        <input
          type="number"
          min="0"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="min-w-0 flex-1 bg-transparent px-2 py-3.5 text-sm font-black outline-none"
        />
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black text-slate-600">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-2xl border border-purple-200 bg-white px-4 py-3.5 text-sm font-black"
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function SwitchRow({
  title,
  subtitle,
  checked,
  onChange,
  light = false,
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl p-4 ${
        light
          ? "bg-white/15"
          : "border border-orange-100 bg-slate-50"
      }`}
    >
      <div className="min-w-0">
        <p
          className={`text-sm font-black ${
            light
              ? "text-white"
              : "text-slate-950"
          }`}
        >
          {title}
        </p>

        <p
          className={`mt-1 text-xs font-bold ${
            light
              ? "text-white/80"
              : "text-slate-500"
          }`}
        >
          {subtitle}
        </p>
      </div>

      <button
        type="button"
        onClick={onChange}
        className={`relative h-8 w-14 shrink-0 rounded-full ${
          checked
            ? "bg-green-500"
            : light
            ? "bg-white/30"
            : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow ${
            checked
              ? "left-7"
              : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function createVendorForm(
  data = {}
) {
  return {
    businessName:
      data.businessName ||
      data.name ||
      data.vendorName ||
      "",

    tagline:
      data.tagline || "",

    description:
      data.description || "",

    phone:
      data.phone || "",

    whatsapp:
      data.whatsapp ||
      data.phone ||
      "",

    email:
      data.email || "",

    area:
      data.area ||
      data.location ||
      "",

    city:
      data.city ||
      "Asansol",

    serviceArea:
      data.serviceArea ||
      data.deliveryArea ||
      "",

    address:
      data.address || "",

    vegPrice:
      toInputValue(
        data.vegPrice
      ),

    nonVegPrice:
      toInputValue(
        data.nonVegPrice
      ),

    monthlyPrice:
      toInputValue(
        data.monthlyPrice
      ),

    deliveryCharge:
      toInputValue(
        data.deliveryCharge
      ),

    minimumOrder:
      toInputValue(
        data.minimumOrder
      ),

    openingTime:
      data.openingTime ||
      "09:00",

    closingTime:
      data.closingTime ||
      "22:00",

    imageUrl:
      data.imageUrl ||
      data.image ||
      "",

    logoUrl:
      data.logoUrl ||
      data.logo ||
      "",

    bannerUrl:
      data.bannerUrl ||
      data.coverImage ||
      "",

    isOpen:
      data.isOpen !== false,

    active:
      data.active !== false,

    approved:
      data.approved !== false,

    pickupAvailable:
      data.pickupAvailable !==
      false,

    deliveryAvailable:
      data.deliveryAvailable !==
      false,

    status:
      data.status ||
      (data.active === false
        ? "inactive"
        : "active"),
  };
}

function toInputValue(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value);
}

function toNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const numberValue =
    Number(value);

  if (
    Number.isNaN(
      numberValue
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    numberValue
  );
}
