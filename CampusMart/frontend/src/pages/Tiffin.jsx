import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";

import { COLLECTIONS } from "../features/vendor/firestorePaths";

export default function Tiffin() {
  const [vendors, setVendors] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let pageActive = true;

    async function loadTiffinVendors() {
      try {
        setLoading(true);
        setError("");

        const vendorsSnapshot =
          await getDocs(
            collection(
              db,
              COLLECTIONS.VENDORS
            )
          );

        if (!pageActive) {
          return;
        }

        const vendorList =
          vendorsSnapshot.docs
            .map((vendorDocument) => ({
              id: vendorDocument.id,
              ...vendorDocument.data(),
            }))
            .filter(isVisibleTiffinVendor)
            .map(normalizeVendor)
            .sort(
              (
                firstVendor,
                secondVendor
              ) =>
                firstVendor.businessName.localeCompare(
                  secondVendor.businessName
                )
            );

        setVendors(vendorList);
      } catch (loadError) {
        console.error(
          "Tiffin vendors load failed:",
          loadError
        );

        if (pageActive) {
          setError(
            loadError?.message ||
              "Tiffin vendors load nahi hue."
          );
        }
      } finally {
        if (pageActive) {
          setLoading(false);
        }
      }
    }

    loadTiffinVendors();

    return () => {
      pageActive = false;
    };
  }, []);

  const filteredVendors =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return vendors;
      }

      return vendors.filter(
        (vendor) => {
          const searchableText = [
            vendor.businessName,
            vendor.tagline,
            vendor.description,
            vendor.area,
            vendor.city,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            query
          );
        }
      );
    }, [vendors, search]);

  return (
    <div className="min-h-screen bg-[#fffaf5] pb-24 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            to="/home"
            className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-2xl font-black text-orange-600"
          >
            ←
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black">
              Tiffin Services
            </h1>

            <p className="text-xs font-bold text-slate-500">
              Choose your favourite vendor
            </p>
          </div>

          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-2xl">
            🍱
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <section className="overflow-hidden rounded-[30px] border border-orange-200 bg-gradient-to-br from-orange-600 to-amber-500 p-6 text-white shadow-xl shadow-orange-600/20">
          <div className="text-6xl">
            🍱
          </div>

          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-white/80">
            CampusMart Tiffin
          </p>

          <h2 className="mt-2 text-4xl font-black leading-tight">
            Ghar jaisa khana,
            <br />
            apne favourite vendor se
          </h2>

          <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/90">
            Menu, price aur subscription
            details check karke apna tiffin
            vendor select karo.
          </p>
        </section>

        <section className="mt-5">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">
              🔍
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search vendor or area..."
              className="h-[56px] w-full rounded-[18px] border border-orange-100 bg-white pl-12 pr-12 text-sm font-bold shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100 font-black text-slate-600"
              >
                ×
              </button>
            )}
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-black text-orange-600">
                Available Near You
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Choose Tiffin Vendor
              </h2>
            </div>

            {!loading && (
              <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-700">
                {filteredVendors.length}{" "}
                Vendors
              </span>
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              ⚠️ {error}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {loading ? (
              <VendorCardsSkeleton />
            ) : filteredVendors.length ===
              0 ? (
              <EmptyVendors
                hasSearch={Boolean(search)}
                onClear={() =>
                  setSearch("")
                }
              />
            ) : (
              filteredVendors.map(
                (vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                  />
                )
              )
            )}
          </div>
        </section>

        <section className="mt-7 rounded-[28px] border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl">
              🛡️
            </div>

            <div>
              <h3 className="text-lg font-black">
                Safe & Easy Subscription
              </h3>

              <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                Har vendor ka menu, price aur
                subscription alag manage hota
                hai. Apni convenience ke
                according vendor select karo.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function VendorCard({ vendor }) {
  const vendorOpen =
    vendor.active !== false &&
    vendor.isOpen !== false;

  const location = [
    vendor.area,
    vendor.city,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <VendorImage vendor={vendor} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-black text-[#111111]">
              {vendor.businessName}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-slate-500">
              {vendor.tagline ||
                "Fresh homemade tiffin service"}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${
              vendorOpen
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {vendorOpen
              ? "● Open"
              : "● Closed"}
          </span>
        </div>

        <div className="mt-4 space-y-2 rounded-2xl bg-orange-50 p-4">
          <InfoRow
            icon="📍"
            value={
              location || "Asansol"
            }
          />

          <InfoRow
            icon="🍱"
            value="Lunch & Dinner Available"
          />

          <InfoRow
            icon="🛵"
            value={
              vendor.deliveryStatus ||
              "Delivery details available"
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <PriceBox
            label="Veg"
            value={vendor.vegPrice}
          />

          <PriceBox
            label="Non-Veg"
            value={vendor.nonVegPrice}
          />

          <PriceBox
            label="Monthly"
            value={vendor.monthlyPrice}
          />
        </div>

        <Link
          to={`/tiffin/${vendor.id}`}
          state={{ vendor }}
          className={`mt-5 block w-full rounded-2xl py-4 text-center text-sm font-black text-white transition active:scale-[0.99] ${
            vendorOpen
              ? "bg-orange-600 shadow-lg shadow-orange-600/20 hover:bg-orange-700"
              : "bg-slate-500"
          }`}
        >
          {vendorOpen
            ? "View Menu & Subscribe →"
            : "View Vendor Details →"}
        </Link>
      </div>
    </article>
  );
}

function VendorImage({ vendor }) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const imageUrl =
    vendor.bannerUrl ||
    vendor.imageUrl ||
    vendor.logoUrl ||
    "";

  return (
    <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-100 to-yellow-50">
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={vendor.businessName}
          onError={() =>
            setImageFailed(true)
          }
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full place-items-center text-7xl">
          🍱
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />

      <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-orange-700 shadow">
        Homemade Food
      </span>
    </div>
  );
}

function InfoRow({ icon, value }) {
  return (
    <div className="flex items-start gap-2 text-sm font-bold text-slate-700">
      <span className="shrink-0">
        {icon}
      </span>

      <span className="line-clamp-1">
        {value}
      </span>
    </div>
  );
}

function PriceBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-3 text-center">
      <p className="text-[10px] font-black uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-orange-600">
        {formatPrice(value)}
      </p>
    </div>
  );
}

function VendorCardsSkeleton() {
  return (
    <>
      {[1, 2].map((item) => (
        <div
          key={item}
          className="animate-pulse overflow-hidden rounded-[28px] border border-orange-100 bg-white"
        >
          <div className="h-44 bg-orange-100" />

          <div className="p-5">
            <div className="h-7 w-2/3 rounded bg-slate-100" />
            <div className="mt-3 h-4 w-full rounded bg-slate-100" />

            <div className="mt-5 h-24 rounded-2xl bg-orange-50" />

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />
            </div>

            <div className="mt-5 h-14 rounded-2xl bg-slate-100" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyVendors({
  hasSearch,
  onClear,
}) {
  return (
    <div className="col-span-full rounded-[28px] border border-orange-100 bg-white px-5 py-14 text-center">
      <div className="text-7xl">
        🍱
      </div>

      <h2 className="mt-4 text-2xl font-black">
        No Tiffin Vendors
      </h2>

      <p className="mt-2 text-sm font-bold text-slate-500">
        {hasSearch
          ? "Search se koi vendor nahi mila."
          : "Active tiffin vendors abhi available nahi hain."}
      </p>

      {hasSearch && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white"
        >
          Clear Search
        </button>
      )}
    </div>
  );
}

function isVisibleTiffinVendor(
  vendor
) {
  const vendorType = String(
    vendor.vendorType ||
      vendor.category ||
      vendor.serviceType ||
      ""
  )
    .trim()
    .toLowerCase();

  const status = String(
    vendor.status || "active"
  )
    .trim()
    .toLowerCase();

  return (
    vendorType === "tiffin" &&
    vendor.active !== false &&
    vendor.approved !== false &&
    status === "active"
  );
}

function normalizeVendor(
  vendor = {}
) {
  const businessName =
    vendor.businessName ||
    vendor.name ||
    vendor.vendorName ||
    "Tiffin Vendor";

  return {
    ...vendor,

    id: vendor.id,

    businessName,

    name: businessName,

    vendorType:
      vendor.vendorType ||
      vendor.category ||
      "tiffin",

    area:
      vendor.area ||
      vendor.location ||
      "",

    city:
      vendor.city || "Asansol",

    tagline:
      vendor.tagline ||
      vendor.description ||
      "",

    active:
      vendor.active !== false,

    isOpen:
      vendor.isOpen !== false,
  };
}

function formatPrice(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Soon";
  }

  const amount = Number(
    String(value)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim()
  );

  if (Number.isNaN(amount)) {
    return `₹${value}`;
  }

  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}