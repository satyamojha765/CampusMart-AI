import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Timestamp,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  db,
} from "../firebase";

import {
  useAuth,
} from "../context/AuthContext";

import {
  createSubscription,
} from "../features/vendor/services/subscriptionService";

import {
  createOrder,
} from "../features/vendor/services/orderService";

import {
  getVendorById,
} from "../features/vendor/services/vendorService";

const DEFAULT_VENDOR_ID =
  "maar-ranna";

const DEFAULT_PLAN_OPTIONS = {
  LUNCH: {
    id: "lunch",
    title: "Lunch Only",
    emoji: "🍱",
    price: 1800,
    description:
      "Monthly lunch tiffin",
  },

  DINNER: {
    id: "dinner",
    title: "Dinner Only",
    emoji: "🌙",
    price: 1800,
    description:
      "Monthly dinner tiffin",
  },

  BOTH: {
    id: "lunch_dinner",
    title: "Lunch + Dinner",
    emoji: "🍱🌙",
    price: 3200,
    description:
      "Monthly lunch and dinner",
  },
};

export default function TiffinSubscribe() {
  const navigate = useNavigate();

  const location =
    useLocation();

  const {
    vendorId: routeVendorId,
  } = useParams();

  const {
    currentUser,
  } = useAuth();

  const queryVendorId =
    new URLSearchParams(
      location.search
    ).get("vendorId");

  const stateVendor =
    location.state?.vendor ||
    null;

  const vendorId =
    normalizeVendorId(
      routeVendorId ||
        location.state?.vendorId ||
        stateVendor?.id ||
        queryVendorId ||
        DEFAULT_VENDOR_ID
    );

  const [vendor, setVendor] =
    useState(() =>
      normalizeVendor({
        ...(stateVendor || {}),
        id: vendorId,
      })
    );

  const [loadingVendor, setLoadingVendor] =
    useState(true);

  const [vendorError, setVendorError] =
    useState("");

  const [
    customerName,
    setCustomerName,
  ] = useState(
    currentUser?.displayName ||
      ""
  );

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    address,
    setAddress,
  ] = useState("");

  const [
    selectedPlan,
    setSelectedPlan,
  ] = useState("lunch");

  const [
    mealPreference,
    setMealPreference,
  ] = useState("veg");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    checkingSubscription,
    setCheckingSubscription,
  ] = useState(
    Boolean(
      currentUser?.uid
    )
  );

  const [
    existingMonthlyPlan,
    setExistingMonthlyPlan,
  ] = useState(null);

  const [
    subscriptionCheckError,
    setSubscriptionCheckError,
  ] = useState("");

  useEffect(() => {
    let pageActive = true;

    async function loadVendor() {
      if (!vendorId) {
        setVendorError(
          "Vendor ID nahi mila."
        );

        setLoadingVendor(false);

        return;
      }

      try {
        setLoadingVendor(true);
        setVendorError("");

        const vendorData =
          await getVendorById(
            vendorId
          );

        if (!pageActive) {
          return;
        }

        if (
          !vendorData &&
          !stateVendor
        ) {
          setVendorError(
            `Tiffin vendor "${vendorId}" nahi mila.`
          );

          return;
        }

        setVendor(
          normalizeVendor({
            ...(stateVendor || {}),
            ...(vendorData || {}),
            id: vendorId,
          })
        );
      } catch (error) {
        console.error(
          "Subscription vendor load failed:",
          error
        );

        if (pageActive) {
          setVendorError(
            error?.message ||
              "Vendor details load nahi hui."
          );
        }
      } finally {
        if (pageActive) {
          setLoadingVendor(false);
        }
      }
    }

    loadVendor();

    return () => {
      pageActive = false;
    };
  }, [vendorId]);

  useEffect(() => {
    if (
      !customerName &&
      currentUser?.displayName
    ) {
      setCustomerName(
        currentUser.displayName
      );
    }
  }, [
    currentUser?.displayName,
    customerName,
  ]);

  useEffect(() => {
    if (
      !currentUser?.uid ||
      !vendorId
    ) {
      setExistingMonthlyPlan(
        null
      );

      setSubscriptionCheckError(
        ""
      );

      setCheckingSubscription(
        false
      );

      return undefined;
    }

    let listenerActive = true;
    let subscriptionDocs = [];
    let orderDocs = [];
    let subscriptionsLoaded = false;
    let ordersLoaded = false;

    setCheckingSubscription(
      true
    );

    setSubscriptionCheckError(
      ""
    );

    function updateEligibility() {
      if (
        !listenerActive ||
        !subscriptionsLoaded ||
        !ordersLoaded
      ) {
        return;
      }

      try {
        const existingPlan =
          evaluateBlockingMonthlyPlanDocs(
            subscriptionDocs,
            orderDocs,
            vendorId
          );

        setExistingMonthlyPlan(
          existingPlan
        );

        setSubscriptionCheckError(
          ""
        );
      } catch (checkError) {
        console.error(
          "Existing subscription live check failed:",
          checkError
        );

        setExistingMonthlyPlan(
          null
        );

        setSubscriptionCheckError(
          checkError?.message ||
            "Existing subscription verify nahi hui."
        );
      } finally {
        setCheckingSubscription(
          false
        );
      }
    }

    const subscriptionsQuery =
      query(
        collection(
          db,
          "subscriptions"
        ),
        where(
          "userId",
          "==",
          currentUser.uid
        )
      );

    const ordersQuery =
      query(
        collection(
          db,
          "orders"
        ),
        where(
          "userId",
          "==",
          currentUser.uid
        )
      );

    const unsubscribeSubscriptions =
      onSnapshot(
        subscriptionsQuery,
        (snapshot) => {
          subscriptionDocs =
            snapshot.docs;

          subscriptionsLoaded =
            true;

          updateEligibility();
        },
        (checkError) => {
          console.error(
            "Subscription live listener failed:",
            checkError
          );

          if (
            listenerActive
          ) {
            setCheckingSubscription(
              false
            );

            setExistingMonthlyPlan(
              null
            );

            setSubscriptionCheckError(
              checkError?.message ||
                "Subscription status live update nahi hui."
            );
          }
        }
      );

    const unsubscribeOrders =
      onSnapshot(
        ordersQuery,
        (snapshot) => {
          orderDocs =
            snapshot.docs;

          ordersLoaded =
            true;

          updateEligibility();
        },
        (checkError) => {
          console.error(
            "Monthly order live listener failed:",
            checkError
          );

          if (
            listenerActive
          ) {
            setCheckingSubscription(
              false
            );

            setExistingMonthlyPlan(
              null
            );

            setSubscriptionCheckError(
              checkError?.message ||
                "Monthly order status live update nahi hua."
            );
          }
        }
      );

    return () => {
      listenerActive = false;

      unsubscribeSubscriptions();
      unsubscribeOrders();
    };
  }, [
    currentUser?.uid,
    vendorId,
  ]);

  const monthlyPrices =
    useMemo(
      () =>
        normalizeMonthlyPrices(
          vendor
        ),
      [vendor]
    );

  const selectedPreferenceKey =
    mealPreference ===
    "non-veg"
      ? "nonVeg"
      : "veg";

  const planOptions =
    useMemo(() => {
      const selectedPrices =
        monthlyPrices[
          selectedPreferenceKey
        ];

      return {
        LUNCH: {
          ...DEFAULT_PLAN_OPTIONS.LUNCH,
          price:
            selectedPrices.lunch,
        },

        DINNER: {
          ...DEFAULT_PLAN_OPTIONS.DINNER,
          price:
            selectedPrices.dinner,
        },

        BOTH: {
          ...DEFAULT_PLAN_OPTIONS.BOTH,
          price:
            selectedPrices
              .lunchDinner,
        },
      };
    }, [
      monthlyPrices,
      selectedPreferenceKey,
    ]);

  const plan =
    Object.values(
      planOptions
    ).find(
      (item) =>
        item.id === selectedPlan
    ) ||
    planOptions.LUNCH;

  const price =
    Number(
      plan.price ||
      0
    );

  const vegSelectedPlanPrice =
    getSelectedPlanPrice(
      monthlyPrices.veg,
      selectedPlan
    );

  const nonVegSelectedPlanPrice =
    getSelectedPlanPrice(
      monthlyPrices.nonVeg,
      selectedPlan
    );

  const vendorName =
    vendor?.businessName ||
    vendor?.name ||
    "Tiffin Vendor";

  const vendorType =
    vendor?.vendorType ||
    vendor?.category ||
    "tiffin";

  const vendorOpen =
    vendor?.active !== false &&
    vendor?.isOpen !== false;

  const minimumStartDate =
    getTodayDateString();

  function getEndDate(
    dateString
  ) {
    const date =
      createLocalDate(
        dateString
      );

    date.setDate(
      date.getDate() + 30
    );

    return date;
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !customerName.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !startDate
    ) {
      alert(
        "Please fill all required fields"
      );

      return;
    }

    if (!currentUser) {
      alert(
        "Please login first"
      );

      return;
    }

    if (!vendorId) {
      alert(
        "Vendor ID missing hai."
      );

      return;
    }

    if (vendorError) {
      alert(
        "Vendor details available nahi hain."
      );

      return;
    }

    if (!vendorOpen) {
      alert(
        `${vendorName} abhi subscription accept nahi kar raha hai.`
      );

      return;
    }

    if (
      checkingSubscription
    ) {
      alert(
        "Existing subscription check ho rahi hai. Ek moment wait karo."
      );

      return;
    }

    if (
      subscriptionCheckError
    ) {
      alert(
        "Existing subscription verify nahi hui. Page refresh karke dobara try karo."
      );

      return;
    }

    if (
      existingMonthlyPlan
    ) {
      alert(
        getExistingPlanMessage(
          existingMonthlyPlan,
          vendorName
        )
      );

      return;
    }

    const cleanPhone =
      phone.replace(/\D/g, "");

    if (
      cleanPhone.length < 10
    ) {
      alert(
        "Valid phone number enter karo."
      );

      return;
    }

    const selectedStartDate =
      createLocalDate(
        startDate
      );

    if (
      Number.isNaN(
        selectedStartDate.getTime()
      )
    ) {
      alert(
        "Valid start date select karo."
      );

      return;
    }

    try {
      setSaving(true);

      const latestExistingPlan =
        await findBlockingMonthlyPlan(
          currentUser.uid,
          vendorId
        );

      if (
        latestExistingPlan
      ) {
        setExistingMonthlyPlan(
          latestExistingPlan
        );

        alert(
          getExistingPlanMessage(
            latestExistingPlan,
            vendorName
          )
        );

        return;
      }

      const startTimestamp =
        Timestamp.fromDate(
          selectedStartDate
        );

      const endTimestamp =
        Timestamp.fromDate(
          getEndDate(startDate)
        );

      const subscriptionId =
        await createSubscription({
          vendorId,

          vendorName,

          businessName:
            vendorName,

          vendorType,

          userId:
            currentUser.uid,

          userEmail:
            currentUser.email ||
            "",

          customerName:
            customerName.trim(),

          customerPhone:
            phone.trim(),

          phone:
            phone.trim(),

          customerAddress:
            address.trim(),

          address:
            address.trim(),

          planName:
            plan.title,

          planType:
            "monthly",

          mealType:
            selectedPlan,

          mealPreference,

          price,

          startDate:
            startTimestamp,

          endDate:
            endTimestamp,

          totalDays: 30,

          status: "active",

          notes:
            notes.trim(),
        });

      await createOrder({
        vendorId,

        vendorName,

        businessName:
          vendorName,

        vendorType,

        userId:
          currentUser.uid,

        userEmail:
          currentUser.email ||
          "",

        subscriptionId,

        customerName:
          customerName.trim(),

        customerPhone:
          phone.trim(),

        phone:
          phone.trim(),

        customerAddress:
          address.trim(),

        address:
          address.trim(),

        planName:
          plan.title,

        planType:
          "monthly",

        mealType:
          selectedPlan,

        mealPreference,

        items: [
          {
            name: `${plan.title} Monthly Tiffin`,

            mealType:
              selectedPlan,

            mealPreference,

            quantity: 1,

            price,
          },
        ],

        totalAmount:
          price,

        price,

        paymentStatus:
          "pending",

        orderStatus:
          "pending",

        deliveryStatus:
          "pending",

        deliveryDate:
          startTimestamp,

        startDate:
          startTimestamp,

        endDate:
          endTimestamp,

        totalDays: 30,

        notes:
          notes.trim(),
      });

      alert(
        `${vendorName} monthly subscription request submitted!`
      );

      navigate(
        `/tiffin/${vendorId}`
      );
    } catch (error) {
      console.error(
        "Subscription submission failed:",
        error
      );

      alert(
        error?.message ||
          "Subscription submit nahi hui."
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loadingVendor ||
    (
      Boolean(
        currentUser?.uid
      ) &&
      checkingSubscription
    )
  ) {
    return (
      <LoadingScreen />
    );
  }

  if (vendorError) {
    return (
      <VendorErrorScreen
        message={vendorError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf5] pb-24 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
          <Link
            to={`/tiffin/${vendorId}`}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-2xl font-black text-orange-700"
          >
            ←
          </Link>

          <div className="min-w-0 px-3 text-center">
            <h1 className="truncate text-xl font-black">
              Monthly Plan
            </h1>

            <p className="truncate text-xs font-bold text-slate-500">
              {vendorName}
            </p>
          </div>

          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-2xl">
            🍱
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-5">
        <section className="rounded-[30px] border border-orange-200 bg-gradient-to-r from-orange-100 to-yellow-50 p-6 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-6xl">
                🍱
              </div>

              <h2 className="mt-4 text-3xl font-black text-orange-700">
                Subscribe{" "}
                {vendorName}
              </h2>

              <p className="mt-2 font-bold leading-6 text-slate-700">
                Choose lunch,
                dinner, or both
                for monthly
                homemade tiffin
                service.
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${
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

          <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm font-black text-orange-700">
            Current Plan:{" "}
            {formatPrice(price)}{" "}
            / month
          </div>
        </section>

        {existingMonthlyPlan ? (
          <ExistingMonthlyPlanCard
            existingPlan={
              existingMonthlyPlan
            }
            vendorId={
              vendorId
            }
            vendorName={
              vendorName
            }
          />
        ) : subscriptionCheckError ? (
          <SubscriptionCheckErrorCard
            message={
              subscriptionCheckError
            }
          />
        ) : (
          <form
            onSubmit={
              handleSubmit
            }
            className="mt-5 grid gap-4"
          >
          <InputBox
            label="Full Name *"
            value={
              customerName
            }
            onChange={
              setCustomerName
            }
            placeholder="Enter your name"
          />

          <InputBox
            label="Phone Number *"
            value={phone}
            onChange={setPhone}
            placeholder="Enter WhatsApp/mobile number"
            type="tel"
            inputMode="numeric"
          />

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Delivery Address *
            </label>

            <textarea
              value={address}
              onChange={(
                event
              ) =>
                setAddress(
                  event.target.value
                )
              }
              placeholder="Hostel / PG / full delivery address"
              rows="4"
              className="w-full rounded-3xl border border-orange-100 bg-white px-4 py-4 font-bold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Meal Plan *
            </label>

            <div className="grid gap-3">
              {Object.values(
                planOptions
              ).map(
                (item) => (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedPlan(
                        item.id
                      )
                    }
                    className={`rounded-3xl border p-4 text-left transition active:scale-[0.99] ${
                      selectedPlan ===
                      item.id
                        ? "border-orange-500 bg-orange-50 shadow-sm"
                        : "border-orange-100 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">
                          {
                            item.emoji
                          }{" "}
                          {
                            item.title
                          }
                        </h3>

                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {
                            item.description
                          }
                        </p>
                      </div>

                      <p className="shrink-0 text-lg font-black text-orange-600">
                        {formatPrice(
                          item.price
                        )}
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Food Preference *
            </label>

            <div className="grid grid-cols-2 gap-3">
              <PreferenceButton
                active={
                  mealPreference ===
                  "veg"
                }
                title="Veg"
                emoji="🌱"
                subtitle={`${formatPrice(
                  vegSelectedPlanPrice
                )}/month`}
                onClick={() =>
                  setMealPreference(
                    "veg"
                  )
                }
              />

              <PreferenceButton
                active={
                  mealPreference ===
                  "non-veg"
                }
                title="Non-Veg"
                emoji="🍗"
                subtitle={`${formatPrice(
                  nonVegSelectedPlanPrice
                )}/month`}
                onClick={() =>
                  setMealPreference(
                    "non-veg"
                  )
                }
              />
            </div>
          </div>

          <InputBox
            label="Start Date *"
            value={startDate}
            onChange={setStartDate}
            type="date"
            min={
              minimumStartDate
            }
          />

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(
                event
              ) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Example: No onion, deliver after 1 PM..."
              rows="3"
              className="w-full rounded-3xl border border-orange-100 bg-white px-4 py-4 font-bold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-500">
              Selected Vendor
            </p>

            <h3 className="mt-2 text-xl font-black text-orange-700">
              🍱 {vendorName}
            </h3>

            <div className="my-4 h-px bg-orange-100" />

            <p className="text-sm font-black text-slate-500">
              Selected Plan
            </p>

            <h3 className="mt-2 text-xl font-black">
              {plan.emoji}{" "}
              {plan.title}
            </h3>

            <p className="mt-1 text-sm font-bold capitalize text-slate-500">
              {mealPreference}
            </p>

            <p className="mt-1 text-sm font-bold text-slate-500">
              30 days
            </p>

            <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-center text-2xl font-black text-orange-600">
              {formatPrice(
                price
              )}{" "}
              / month
            </div>
          </div>

          <button
            type="submit"
            disabled={
              saving ||
              !vendorOpen
            }
            className="mt-2 rounded-3xl bg-orange-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-600/25 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-70 disabled:shadow-none"
          >
            {saving
              ? "Submitting..."
              : vendorOpen
              ? `Subscribe ${vendorName}`
              : "Vendor Currently Closed"}
          </button>
          </form>
        )}
      </main>
    </div>
  );
}

function ExistingMonthlyPlanCard({
  existingPlan,
  vendorId,
  vendorName,
}) {
  const pending =
    existingPlan.kind ===
    "pending";

  const source =
    existingPlan.data ||
    {};

  const endDate =
    getSubscriptionEndDate(
      source
    );

  return (
    <section className="mt-5 rounded-[30px] border border-orange-200 bg-white p-6 text-center shadow-lg">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-orange-50 text-5xl">
        {pending
          ? "⏳"
          : "✅"}
      </div>

      <h2 className="mt-5 text-2xl font-black text-slate-950">
        {pending
          ? "Monthly Request Already Pending"
          : "Monthly Subscription Already Active"}
      </h2>

      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
        {pending
          ? `${vendorName} ke liye aapka monthly plan request pehle se pending hai. Vendor ke accept ya decline karne tak naya request nahi bhej sakte.`
          : `${vendorName} ka ek monthly subscription pehle se active hai. Current subscription khatam hone ke baad hi naya plan le sakte hain.`}
      </p>

      <div className="mt-5 rounded-3xl bg-orange-50 p-4 text-left">
        <PlanDetailRow
          label="Vendor"
          value={
            vendorName
          }
        />

        <PlanDetailRow
          label="Plan"
          value={
            getExistingPlanLabel(
              source
            )
          }
        />

        <PlanDetailRow
          label="Status"
          value={
            pending
              ? "Approval Pending"
              : "Active"
          }
        />

        {!pending &&
          endDate && (
            <PlanDetailRow
              label="Valid Until"
              value={
                formatPlanDate(
                  endDate
                )
              }
            />
          )}
      </div>

      <Link
        to={`/tiffin/${vendorId}`}
        className="mt-6 block rounded-2xl bg-orange-600 px-5 py-4 font-black text-white shadow-lg shadow-orange-600/20"
      >
        Back to {vendorName}
      </Link>
    </section>
  );
}

function PlanDetailRow({
  label,
  value,
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-orange-100 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-sm font-black text-slate-500">
        {label}
      </span>

      <span className="max-w-[60%] text-right text-sm font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}

function SubscriptionCheckErrorCard({
  message,
}) {
  return (
    <section className="mt-5 rounded-[30px] border border-red-200 bg-white p-6 text-center shadow-lg">
      <div className="text-6xl">
        ⚠️
      </div>

      <h2 className="mt-4 text-2xl font-black text-red-600">
        Subscription Check Failed
      </h2>

      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
        {message}
      </p>

      <button
        type="button"
        onClick={() =>
          window.location.reload()
        }
        className="mt-6 w-full rounded-2xl bg-orange-600 px-5 py-4 font-black text-white"
      >
        Refresh and Check Again
      </button>
    </section>
  );
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fffaf5] px-5">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-xl">
        <div className="text-6xl">
          🍱
        </div>

        <h2 className="mt-4 text-xl font-black">
          Loading Subscription
        </h2>

        <p className="mt-2 text-sm font-bold text-slate-500">
          Vendor aur plan
          details load ho rahi
          hain...
        </p>
      </div>
    </div>
  );
}

function VendorErrorScreen({
  message,
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fffaf5] px-5">
      <div className="w-full max-w-md rounded-[28px] border border-red-100 bg-white p-6 text-center shadow-xl">
        <div className="text-6xl">
          ⚠️
        </div>

        <h1 className="mt-4 text-2xl font-black text-red-600">
          Vendor Not Found
        </h1>

        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
          {message}
        </p>

        <Link
          to="/tiffin"
          className="mt-6 block rounded-2xl bg-orange-600 px-5 py-4 font-black text-white"
        >
          Back to Tiffin
          Services
        </Link>
      </div>
    </div>
  );
}

function InputBox({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  inputMode,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
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
        placeholder={
          placeholder
        }
        min={min}
        inputMode={
          inputMode
        }
        className="w-full rounded-3xl border border-orange-100 bg-white px-4 py-4 font-bold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
      />
    </div>
  );
}

function PreferenceButton({
  active,
  title,
  emoji,
  subtitle,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-4 text-left font-black transition active:scale-[0.99] ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-700"
          : "border-orange-100 bg-white text-slate-800"
      }`}
    >
      {emoji} {title}

      <span className="mt-1 block text-sm font-bold opacity-80">
        {subtitle}
      </span>
    </button>
  );
}

async function findBlockingMonthlyPlan(
  userId,
  vendorId
) {
  const cleanUserId =
    String(
      userId ||
        ""
    ).trim();

  const cleanVendorId =
    normalizeVendorId(
      vendorId
    );

  if (
    !cleanUserId ||
    !cleanVendorId
  ) {
    return null;
  }

  const userSubscriptionsQuery =
    query(
      collection(
        db,
        "subscriptions"
      ),
      where(
        "userId",
        "==",
        cleanUserId
      )
    );

  const userOrdersQuery =
    query(
      collection(
        db,
        "orders"
      ),
      where(
        "userId",
        "==",
        cleanUserId
      )
    );

  const [
    subscriptionSnapshot,
    orderSnapshot,
  ] = await Promise.all([
    getDocs(
      userSubscriptionsQuery
    ),

    getDocs(
      userOrdersQuery
    ),
  ]);

  return evaluateBlockingMonthlyPlanDocs(
    subscriptionSnapshot.docs,
    orderSnapshot.docs,
    cleanVendorId
  );
}

function evaluateBlockingMonthlyPlanDocs(
  subscriptionDocuments,
  orderDocuments,
  vendorId
) {
  const cleanVendorId =
    normalizeVendorId(
      vendorId
    );

  if (!cleanVendorId) {
    return null;
  }

  const matchingSubscriptions =
    subscriptionDocuments
      .map(
        (
          subscriptionDocument
        ) => ({
          id:
            subscriptionDocument.id,

          ...subscriptionDocument.data(),
        })
      )
      .filter(
        (subscription) =>
          normalizeVendorId(
            subscription.vendorId ||
              subscription.vendor?.id
          ) ===
          cleanVendorId
      )
      .sort(
        (
          firstSubscription,
          secondSubscription
        ) =>
          getDocumentTimeMs(
            secondSubscription
          ) -
          getDocumentTimeMs(
            firstSubscription
          )
      );

  const matchingOrders =
    orderDocuments
      .map(
        (
          orderDocument
        ) => ({
          id:
            orderDocument.id,

          ...orderDocument.data(),
        })
      )
      .filter(
        (order) =>
          normalizeVendorId(
            order.vendorId ||
              order.vendor?.id
          ) ===
          cleanVendorId
      )
      .filter(
        isMonthlyOrder
      )
      .sort(
        (
          firstOrder,
          secondOrder
        ) =>
          getDocumentTimeMs(
            secondOrder
          ) -
          getDocumentTimeMs(
            firstOrder
          )
      );

  const pendingOrder =
    matchingOrders.find(
      (order) => {
        /*
         * Declined/cancelled order kabhi bhi
         * pending blocker nahi hoga, chahe purana
         * orderStatus galti se pending hi kyon na ho.
         */
        if (
          isClosedMonthlyOrder(
            order
          )
        ) {
          return false;
        }

        if (
          !isPendingMonthlyOrder(
            order
          )
        ) {
          return false;
        }

        const linkedSubscriptionId =
          String(
            order.subscriptionId ||
              ""
          ).trim();

        if (
          !linkedSubscriptionId
        ) {
          return true;
        }

        const linkedSubscription =
          matchingSubscriptions.find(
            (subscription) =>
              subscription.id ===
              linkedSubscriptionId
          );

        return !(
          linkedSubscription &&
          isClosedSubscription(
            linkedSubscription
          )
        );
      }
    );

  if (pendingOrder) {
    return {
      kind:
        "pending",

      id:
        pendingOrder.id,

      data:
        pendingOrder,
    };
  }

  const blockingSubscription =
    matchingSubscriptions.find(
      (subscription) => {
        if (
          !isBlockingSubscription(
            subscription
          )
        ) {
          return false;
        }

        const linkedOrders =
          matchingOrders.filter(
            (order) =>
              String(
                order.subscriptionId ||
                  ""
              ).trim() ===
              subscription.id
          );

        /*
         * Subscription document stale active reh gaya ho,
         * lekin uske saare linked monthly orders decline /
         * cancel ho chuke hon, toh user ko block nahi karna.
         */
        if (
          linkedOrders.length >
            0 &&
          linkedOrders.every(
            isClosedMonthlyOrder
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    blockingSubscription
  ) {
    return {
      kind:
        "active",

      id:
        blockingSubscription.id,

      data:
        blockingSubscription,
    };
  }

  /*
   * Saare monthly orders declined/cancelled hon
   * aur koi valid pending/active subscription na ho,
   * toh user turant naya monthly order kar sakta hai.
   */
  return null;
}


function isMonthlyOrder(
  order
) {
  if (
    String(
      order?.subscriptionId ||
        ""
    ).trim()
  ) {
    return true;
  }

  const orderType =
    normalizeStatusText(
      order?.orderType ||
        order?.type
    ).replace(
      /[\s-]+/g,
      "_"
    );

  const planType =
    normalizeStatusText(
      order?.planType
    );

  return (
    [
      "monthly",
      "monthly_subscription",
      "subscription",
      "tiffin_subscription",
    ].includes(
      orderType
    ) ||
    planType ===
      "monthly"
  );
}

function isPendingMonthlyOrder(
  order
) {
  if (
    isClosedMonthlyOrder(
      order
    )
  ) {
    return false;
  }

  const status =
    getMonthlyOrderStatus(
      order
    );

  return [
    "pending",
    "requested",
    "awaiting_approval",
  ].includes(
    status
  );
}

function isClosedMonthlyOrder(
  order
) {
  const statuses = [
    order?.orderStatus,
    order?.status,
    order?.deliveryStatus,
    order?.decisionStatus,
    order?.approvalStatus,
  ]
    .map(
      normalizeStatusText
    )
    .filter(
      Boolean
    );

  const closedStatuses = [
    "declined",
    "rejected",
    "cancelled",
    "canceled",
    "removed",
    "expired",
    "completed",
    "ended",
    "inactive",
  ];

  if (
    statuses.some(
      (status) =>
        closedStatuses.includes(
          status
        )
    )
  ) {
    return true;
  }

  return Boolean(
    order?.cancelledAt ||
    order?.canceledAt ||
    order?.declinedAt ||
    order?.rejectedAt
  );
}

function isAcceptedUnexpiredMonthlyOrder(
  order
) {
  const status =
    getMonthlyOrderStatus(
      order
    );

  if (
    ![
      "accepted",
      "confirmed",
      "approved",
      "preparing",
      "active",
    ].includes(
      status
    )
  ) {
    return false;
  }

  return !isPlanExpired(
    getSubscriptionEndDate(
      order
    )
  );
}

function getMonthlyOrderStatus(
  order
) {
  return normalizeStatusText(
    order?.orderStatus ||
      order?.status ||
      order?.deliveryStatus ||
      "pending"
  );
}

function isClosedSubscription(
  subscription
) {
  const status =
    normalizeStatusText(
      subscription?.status
    );

  if (
    [
      "removed",
      "cancelled",
      "canceled",
      "declined",
      "rejected",
      "expired",
      "completed",
      "ended",
      "inactive",
    ].includes(
      status
    )
  ) {
    return true;
  }

  return isPlanExpired(
    getSubscriptionEndDate(
      subscription
    )
  );
}

function isBlockingSubscription(
  subscription
) {
  const status =
    normalizeStatusText(
      subscription?.status
    );

  if (
    [
      "removed",
      "cancelled",
      "canceled",
      "declined",
      "rejected",
      "expired",
      "completed",
      "ended",
      "inactive",
    ].includes(
      status
    )
  ) {
    return false;
  }

  if (
    [
      "pending",
      "requested",
      "awaiting_approval",
    ].includes(
      status
    )
  ) {
    return true;
  }

  const endDate =
    getSubscriptionEndDate(
      subscription
    );

  if (
    isPlanExpired(
      endDate
    )
  ) {
    return false;
  }

  if (
    [
      "active",
      "accepted",
      "confirmed",
      "approved",
      "running",
    ].includes(
      status
    )
  ) {
    return true;
  }

  return Boolean(
    endDate
  );
}

function getSubscriptionEndDate(
  source
) {
  return (
    source?.endDate ||
    source?.subscriptionEndDate ||
    source?.expiryDate ||
    source?.planEndDate ||
    null
  );
}

function isPlanExpired(
  value
) {
  if (!value) {
    return false;
  }

  const endDate =
    toPlanDate(
      value
    );

  if (!endDate) {
    return false;
  }

  endDate.setHours(
    23,
    59,
    59,
    999
  );

  return (
    endDate.getTime() <
    Date.now()
  );
}

function getExistingPlanMessage(
  existingPlan,
  vendorName
) {
  if (
    existingPlan?.kind ===
    "pending"
  ) {
    return `${vendorName} ke liye aapka monthly request already pending hai. Vendor decision ke baad hi naya request bhej sakte hain.`;
  }

  const endDate =
    getSubscriptionEndDate(
      existingPlan?.data
    );

  return endDate
    ? `Aapka ${vendorName} monthly subscription ${formatPlanDate(
        endDate
      )} tak active hai. Iske khatam hone ke baad naya plan le sakte hain.`
    : `Aapka ${vendorName} monthly subscription already active hai. Current subscription khatam hone ke baad hi naya plan le sakte hain.`;
}

function getExistingPlanLabel(
  source
) {
  const mealType =
    normalizeStatusText(
      source?.mealType
    );

  if (
    mealType ===
    "lunch"
  ) {
    return "Lunch Only";
  }

  if (
    mealType ===
    "dinner"
  ) {
    return "Dinner Only";
  }

  if (
    [
      "lunch_dinner",
      "lunch+dinner",
      "lunch-dinner",
      "both",
    ].includes(
      mealType
    )
  ) {
    return "Lunch + Dinner";
  }

  return (
    source?.planName ||
    "Monthly Plan"
  );
}

function formatPlanDate(
  value
) {
  const date =
    toPlanDate(
      value
    );

  if (!date) {
    return "--";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
}

function toPlanDate(
  value
) {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    const date =
      value.toDate();

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  if (
    typeof value.seconds ===
    "number"
  ) {
    const date =
      new Date(
        value.seconds *
          1000
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const date =
    new Date(
      value
    );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function getDocumentTimeMs(
  documentData
) {
  return (
    toPlanDate(
      documentData?.createdAt ||
        documentData?.acceptedAt ||
        documentData?.startDate
    )?.getTime() ||
    0
  );
}

function normalizeStatusText(
  value
) {
  return String(
    value ||
      ""
  )
    .trim()
    .toLowerCase();
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

    id:
      vendor.id || "",

    businessName,

    name: businessName,

    vendorType:
      vendor.vendorType ||
      vendor.category ||
      "tiffin",

    active:
      vendor.active !== false,

    isOpen:
      vendor.isOpen !== false,
  };
}

function normalizeVendorId(
  value
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getValidPrice(
  ...values
) {
  for (
    const value of values
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    const amount =
      Number(
        String(value)
          .replace(/₹/g, "")
          .replace(/,/g, "")
          .trim()
      );

    if (
      !Number.isNaN(
        amount
      ) &&
      amount >= 0
    ) {
      return amount;
    }
  }

  return 0;
}

function formatPrice(
  value
) {
  const amount =
    getValidPrice(
      value,
      0
    );

  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}

function normalizeMonthlyPrices(
  vendor = {}
) {
  const direct =
    vendor?.monthlyPrices ||
    {};

  const nonVegExtra =
    getValidPrice(
      vendor?.nonVegMonthlyExtra,
      vendor?.nonVegSurcharge,
      vendor?.subscriptionPrices
        ?.nonVegExtra,
      400
    );

  const vegLunch =
    getValidPrice(
      direct?.veg?.lunch,
      vendor?.subscriptionPrices
        ?.veg?.lunch,
      vendor?.monthlyPlanPrices
        ?.veg?.lunch,
      vendor?.subscriptionPrices
        ?.lunch,
      vendor?.monthlyPlanPrices
        ?.lunch,
      vendor?.lunchMonthlyPrice,
      DEFAULT_PLAN_OPTIONS
        .LUNCH.price
    );

  const vegDinner =
    getValidPrice(
      direct?.veg?.dinner,
      vendor?.subscriptionPrices
        ?.veg?.dinner,
      vendor?.monthlyPlanPrices
        ?.veg?.dinner,
      vendor?.subscriptionPrices
        ?.dinner,
      vendor?.monthlyPlanPrices
        ?.dinner,
      vendor?.dinnerMonthlyPrice,
      DEFAULT_PLAN_OPTIONS
        .DINNER.price
    );

  const vegLunchDinner =
    getValidPrice(
      direct?.veg
        ?.lunchDinner,
      direct?.veg?.both,
      vendor?.subscriptionPrices
        ?.veg?.lunchDinner,
      vendor?.monthlyPlanPrices
        ?.veg?.lunchDinner,
      vendor?.subscriptionPrices
        ?.lunchDinner,
      vendor?.subscriptionPrices
        ?.both,
      vendor?.monthlyPlanPrices
        ?.lunchDinner,
      vendor?.monthlyPlanPrices
        ?.both,
      vendor?.bothMonthlyPrice,
      vendor?.lunchDinnerMonthlyPrice,
      DEFAULT_PLAN_OPTIONS
        .BOTH.price
    );

  return {
    veg: {
      lunch:
        vegLunch,
      dinner:
        vegDinner,
      lunchDinner:
        vegLunchDinner,
    },
    nonVeg: {
      lunch:
        getValidPrice(
          direct?.nonVeg?.lunch,
          direct?.nonveg?.lunch,
          vendor?.subscriptionPrices
            ?.nonVeg?.lunch,
          vendor?.monthlyPlanPrices
            ?.nonVeg?.lunch,
          vendor?.nonVegLunchMonthlyPrice,
          Number(vegLunch) +
            Number(nonVegExtra)
        ),
      dinner:
        getValidPrice(
          direct?.nonVeg?.dinner,
          direct?.nonveg?.dinner,
          vendor?.subscriptionPrices
            ?.nonVeg?.dinner,
          vendor?.monthlyPlanPrices
            ?.nonVeg?.dinner,
          vendor?.nonVegDinnerMonthlyPrice,
          Number(vegDinner) +
            Number(nonVegExtra)
        ),
      lunchDinner:
        getValidPrice(
          direct?.nonVeg
            ?.lunchDinner,
          direct?.nonVeg?.both,
          direct?.nonveg
            ?.lunchDinner,
          vendor?.subscriptionPrices
            ?.nonVeg
            ?.lunchDinner,
          vendor?.monthlyPlanPrices
            ?.nonVeg
            ?.lunchDinner,
          vendor?.nonVegBothMonthlyPrice,
          vendor?.nonVegLunchDinnerMonthlyPrice,
          Number(vegLunchDinner) +
            Number(nonVegExtra)
        ),
    },
  };
}

function getSelectedPlanPrice(
  prices,
  selectedPlan
) {
  if (
    selectedPlan ===
    "dinner"
  ) {
    return prices.dinner;
  }

  if (
    selectedPlan ===
    "lunch_dinner"
  ) {
    return prices.lunchDinner;
  }

  return prices.lunch;
}

function createLocalDate(
  dateString
) {
  const [
    year,
    month,
    day,
  ] = String(
    dateString
  )
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}

function getTodayDateString() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}