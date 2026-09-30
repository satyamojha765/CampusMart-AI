import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getTodayDayId,
  getWeeklyMenu,
} from "../features/vendor/services/menuService";

import {
  DEFAULT_WEEKLY_MENU,
} from "../features/vendor/constants/menuConstants";

import {
  getVendorById,
} from "../features/vendor/services/vendorService";

import {
  createOrder,
} from "../features/vendor/services/orderService";

import {
  collection,
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

const VIEW_OPTIONS = [
  {
    id: "individual",
    title: "Instant Order",
    subtitle: "Item select karke abhi order karo",
    icon: "🍽️",
  },
  {
    id: "monthly",
    title: "Monthly Order",
    subtitle: "30-day lunch/dinner plan",
    icon: "📅",
  },
];

export default function TiffinVendorDetails() {
  const { vendorId } =
    useParams();

  const navigate =
    useNavigate();

  const { currentUser } =
    useAuth();

  const [vendor, setVendor] =
    useState(null);

  const [
    weeklyMenu,
    setWeeklyMenu,
  ] = useState(
    DEFAULT_WEEKLY_MENU
  );

  const [
    activeView,
    setActiveView,
  ] = useState("individual");

  const [
    foodSearch,
    setFoodSearch,
  ] = useState("");

  const [
    quantities,
    setQuantities,
  ] = useState({});

  const [
    checkoutOpen,
    setCheckoutOpen,
  ] = useState(false);

  const [
    customerName,
    setCustomerName,
  ] = useState(
    currentUser?.displayName ||
      ""
  );

  const [
    customerPhone,
    setCustomerPhone,
  ] = useState("");

  const [
    customerAddress,
    setCustomerAddress,
  ] = useState("");

  const [orderNotes, setOrderNotes] =
    useState("");

  const [
    placingOrder,
    setPlacingOrder,
  ] = useState(false);

  const [
    orderSuccess,
    setOrderSuccess,
  ] = useState("");

  const [
    myFoodOrders,
    setMyFoodOrders,
  ] = useState([]);

  const [
    loadingMyFoodOrders,
    setLoadingMyFoodOrders,
  ] = useState(false);

  const [
    myFoodOrdersError,
    setMyFoodOrdersError,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let pageActive = true;

    async function loadVendor() {
      if (!vendorId) {
        setError(
          "Vendor ID nahi mila."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          vendorData,
          menuData,
        ] = await Promise.all([
          getVendorById(
            vendorId
          ),

          getWeeklyMenu(
            vendorId
          ),
        ]);

        if (!pageActive) {
          return;
        }

        if (!vendorData) {
          setVendor(null);

          setError(
            "Tiffin vendor nahi mila."
          );

          return;
        }

        setVendor({
          id: vendorId,
          ...vendorData,

          businessName:
            vendorData.businessName ||
            vendorData.name ||
            "Tiffin Vendor",

          active:
            vendorData.active !==
            false,

          isOpen:
            vendorData.isOpen !==
            false,

          individualItems:
            normalizeIndividualItems(
              vendorData.individualItems ||
                vendorData.foodItems ||
                []
            ),
        });

        setWeeklyMenu(
          menuData ||
            DEFAULT_WEEKLY_MENU
        );
      } catch (loadError) {
        console.error(
          "Vendor details load failed:",
          loadError
        );

        if (pageActive) {
          setError(
            loadError?.message ||
              "Vendor details load nahi hui."
          );
        }
      } finally {
        if (pageActive) {
          setLoading(false);
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
      currentUser?.displayName &&
      !customerName
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
      setMyFoodOrders([]);
      setLoadingMyFoodOrders(false);
      setMyFoodOrdersError("");

      return undefined;
    }

    setLoadingMyFoodOrders(true);
    setMyFoodOrdersError("");

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

    const unsubscribe =
      onSnapshot(
        ordersQuery,
        (snapshot) => {
          const currentVendorId =
            normalizeVendorId(
              vendorId
            );

          const userOrders =
            snapshot.docs
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
                    order.vendorId
                  ) ===
                    currentVendorId &&
                  isIndividualFoodOrder(
                    order
                  )
              )
              .sort(
                (
                  firstOrder,
                  secondOrder
                ) =>
                  getOrderTimeMs(
                    secondOrder.createdAt
                  ) -
                  getOrderTimeMs(
                    firstOrder.createdAt
                  )
              )
              .slice(
                0,
                5
              );

          setMyFoodOrders(
            userOrders
          );

          setLoadingMyFoodOrders(
            false
          );

          setMyFoodOrdersError(
            ""
          );
        },
        (statusError) => {
          console.error(
            "User food order status load failed:",
            statusError
          );

          setMyFoodOrders([]);
          setLoadingMyFoodOrders(false);

          setMyFoodOrdersError(
            statusError?.message ||
              "Order status load nahi hua."
          );
        }
      );

    return () =>
      unsubscribe();
  }, [
    currentUser?.uid,
    vendorId,
  ]);

  useEffect(() => {
    if (!orderSuccess) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () =>
          setOrderSuccess(
            ""
          ),
        3500
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [orderSuccess]);

  const todayDayId =
    getTodayDayId();

  const todayMenu =
    useMemo(() => {
      return (
        weeklyMenu?.[
          todayDayId
        ] ||
        DEFAULT_WEEKLY_MENU[
          todayDayId
        ]
      );
    }, [
      weeklyMenu,
      todayDayId,
    ]);

  const availableIndividualItems =
    useMemo(() => {
      return (
        vendor?.individualItems ||
        []
      )
        .filter(
          (item) =>
            item.available !==
            false
        )
        .sort(
          (
            firstItem,
            secondItem
          ) =>
            firstItem.name.localeCompare(
              secondItem.name
            )
        );
    }, [vendor]);

  const filteredIndividualItems =
    useMemo(() => {
      const query =
        foodSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return availableIndividualItems;
      }

      return availableIndividualItems.filter(
        (item) => {
          const searchableText = [
            item.name,
            item.price,
            getMealSlotLabel(
              item.mealSlot
            ),
            getFoodTypeLabel(
              item.foodType
            ),
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            query
          );
        }
      );
    }, [
      availableIndividualItems,
      foodSearch,
    ]);

  const cartItems =
    useMemo(() => {
      return availableIndividualItems
        .map(
          (item) => ({
            ...item,

            quantity:
              Number(
                quantities[
                  item.id
                ] ||
                  0
              ),
          })
        )
        .filter(
          (item) =>
            item.quantity > 0
        );
    }, [
      availableIndividualItems,
      quantities,
    ]);

  const cartItemCount =
    useMemo(() => {
      return cartItems.reduce(
        (
          total,
          item
        ) =>
          total +
          item.quantity,
        0
      );
    }, [cartItems]);

  const cartTotal =
    useMemo(() => {
      return cartItems.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.price ||
              0
          ) *
            item.quantity,
        0
      );
    }, [cartItems]);

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  if (!vendor || error) {
    return (
      <ErrorScreen
        message={error}
      />
    );
  }

  const vendorName =
    vendor.businessName ||
    vendor.name ||
    "Tiffin Vendor";

  const location =
    vendor.deliveryArea ||
    vendor.area ||
    vendor.city ||
    "Asansol";

  const vendorOpen =
    vendor.active !== false &&
    vendor.isOpen !== false;

  function updateQuantity(
    itemId,
    change
  ) {
    if (!vendorOpen) {
      return;
    }

    setQuantities(
      (currentQuantities) => {
        const currentValue =
          Number(
            currentQuantities[
              itemId
            ] ||
              0
          );

        const nextValue =
          Math.max(
            0,
            currentValue +
              change
          );

        return {
          ...currentQuantities,
          [itemId]:
            nextValue,
        };
      }
    );
  }

  function openCheckout() {
    if (
      cartItems.length ===
      0
    ) {
      return;
    }

    if (!currentUser) {
      alert(
        "Order place karne ke liye login required hai."
      );

      navigate(
        "/login"
      );

      return;
    }

    setCheckoutOpen(
      true
    );

    setOrderSuccess("");
  }

  function closeCheckout() {
    if (placingOrder) {
      return;
    }

    setCheckoutOpen(
      false
    );
  }

  async function placeIndividualOrder(
    event
  ) {
    event.preventDefault();

    if (!currentUser) {
      alert(
        "Please login first."
      );

      return;
    }

    if (
      !customerName.trim() ||
      !customerPhone.trim() ||
      !customerAddress.trim()
    ) {
      alert(
        "Name, phone aur address fill karo."
      );

      return;
    }

    if (
      cartItems.length ===
      0
    ) {
      alert(
        "Cart empty hai."
      );

      return;
    }

    try {
      setPlacingOrder(
        true
      );

      const cleanItems =
        cartItems.map(
          (item) => ({
            id:
              item.id,

            name:
              item.name,

            price:
              Number(
                item.price ||
                  0
              ),

            quantity:
              item.quantity,

            mealSlot:
              item.mealSlot,

            itemTotal:
              Number(
                item.price ||
                  0
              ) *
              item.quantity,
          })
        );

      await createOrder({
        orderType:
          "one_time",

        vendorId:
          vendor.id,

        vendorType:
          vendor.vendorType ||
          vendor.category ||
          "tiffin",

        userId:
          currentUser.uid,

        customerName:
          customerName.trim(),

        customerPhone:
          customerPhone.trim(),

        customerAddress:
          customerAddress.trim(),

        items:
          cleanItems,

        totalItems:
          cartItemCount,

        totalAmount:
          cartTotal,

        paymentMethod:
          "cod",

        paymentStatus:
          "pending",

        orderStatus:
          "pending",

        deliveryStatus:
          "pending",

        notes:
          orderNotes.trim(),
      });

      setQuantities({});
      setOrderNotes("");
      setCheckoutOpen(
        false
      );

      setOrderSuccess(
        "Order place ho gaya. Live status neeche update hota rahega."
      );
    } catch (orderError) {
      console.error(
        "Individual order failed:",
        orderError
      );

      alert(
        orderError?.message ||
          "Order place nahi hua."
      );
    } finally {
      setPlacingOrder(
        false
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf5] pb-36 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <Link
            to="/tiffin"
            className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-xl font-black text-orange-600"
          >
            ←
          </Link>

          <div className="min-w-0 px-3 text-center">
            <h1 className="truncate text-base font-black">
              {vendorName}
            </h1>

            <p className="text-[11px] font-bold text-slate-500">
              Tiffin Service
            </p>
          </div>

          <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-xl">
            🍱
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        <section className="overflow-hidden rounded-[24px] border border-orange-200 bg-gradient-to-br from-orange-600 to-amber-500 p-5 text-white shadow-lg shadow-orange-600/20">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
                Homemade Tiffin
              </p>

              <h2 className="mt-1.5 truncate text-3xl font-black leading-tight">
                {vendorName}
              </h2>

              <p className="mt-2 text-sm font-bold leading-5 text-white/90">
                {vendor.tagline ||
                  "Ghar jaisa khana, har din."}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${
                vendorOpen
                  ? "bg-white/20 text-white"
                  : "bg-red-500/40 text-white"
              }`}
            >
              {vendorOpen
                ? "● Open"
                : "● Closed"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <HeroInfo
              icon="📍"
              value={
                location
              }
            />

            <HeroInfo
              icon="🛵"
              value={
                vendor.deliveryStatus ||
                "Delivery Available"
              }
            />
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-2 rounded-[20px] border border-orange-100 bg-white p-1.5 shadow-sm">
          {VIEW_OPTIONS.map(
            (option) => {
              const selected =
                activeView ===
                option.id;

              return (
                <button
                  key={
                    option.id
                  }
                  type="button"
                  onClick={() =>
                    setActiveView(
                      option.id
                    )
                  }
                  className={`rounded-[15px] p-3 text-left transition ${
                    selected
                      ? "bg-orange-600 text-white shadow"
                      : "bg-orange-50/50 text-slate-700"
                  }`}
                >
                  <div className="text-xl">
                    {option.icon}
                  </div>

                  <h3 className="mt-1 text-xs font-black">
                    {option.title}
                  </h3>

                  <p
                    className={`mt-0.5 text-[9px] font-bold ${
                      selected
                        ? "text-white/80"
                        : "text-slate-500"
                    }`}
                  >
                    {option.subtitle}
                  </p>
                </button>
              );
            }
          )}
        </section>

        {orderSuccess && (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700">
            ✅ {orderSuccess}
          </div>
        )}

        {currentUser && (
          <MyFoodOrdersStatus
            orders={
              myFoodOrders
            }
            loading={
              loadingMyFoodOrders
            }
            error={
              myFoodOrdersError
            }
          />
        )}

        {activeView ===
        "individual" ? (
          <IndividualOrderSection
            vendorOpen={
              vendorOpen
            }
            search={
              foodSearch
            }
            onSearch={
              setFoodSearch
            }
            items={
              filteredIndividualItems
            }
            totalAvailableItems={
              availableIndividualItems.length
            }
            quantities={
              quantities
            }
            onIncrease={(
              itemId
            ) =>
              updateQuantity(
                itemId,
                1
              )
            }
            onDecrease={(
              itemId
            ) =>
              updateQuantity(
                itemId,
                -1
              )
            }
          />
        ) : (
          <MonthlyPlanSection
            vendor={
              vendor
            }
            vendorOpen={
              vendorOpen
            }
            todayMenu={
              todayMenu
            }
          />
        )}
      </main>

      {activeView ===
        "individual" &&
        cartItemCount >
          0 && (
          <CartBar
            itemCount={
              cartItemCount
            }
            total={
              cartTotal
            }
            onOpen={
              openCheckout
            }
          />
        )}

      {checkoutOpen && (
        <CheckoutModal
          vendorName={
            vendorName
          }
          cartItems={
            cartItems
          }
          total={
            cartTotal
          }
          customerName={
            customerName
          }
          customerPhone={
            customerPhone
          }
          customerAddress={
            customerAddress
          }
          notes={
            orderNotes
          }
          placingOrder={
            placingOrder
          }
          onCustomerName={
            setCustomerName
          }
          onCustomerPhone={
            setCustomerPhone
          }
          onCustomerAddress={
            setCustomerAddress
          }
          onNotes={
            setOrderNotes
          }
          onClose={
            closeCheckout
          }
          onSubmit={
            placeIndividualOrder
          }
        />
      )}
    </div>
  );
}

function MyFoodOrdersStatus({
  orders,
  loading,
  error,
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(false);

  if (
    !loading &&
    !error &&
    orders.length ===
      0
  ) {
    return null;
  }

  const latestOrder =
    orders[0] ||
    null;

  const latestStatus =
    latestOrder
      ? getUserOrderStatus(
          latestOrder
        )
      : null;

  return (
    <section className="mt-4 overflow-hidden rounded-[18px] border border-orange-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() =>
          setExpanded(
            (currentValue) =>
              !currentValue
          )
        }
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-orange-50/50"
        aria-expanded={
          expanded
        }
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-lg">
          📦
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-600">
            Live Status
          </p>

          <div className="mt-0.5 flex items-center gap-2">
            <h2 className="truncate text-sm font-black text-slate-950">
              My Food Orders
            </h2>

            {!loading &&
              !error &&
              latestStatus && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black ${latestStatus.badgeClass}`}
                >
                  {latestStatus.label}
                </span>
              )}
          </div>

          <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">
            {loading
              ? "Status loading..."
              : error
              ? "Status unavailable"
              : `${orders.length} recent order${
                  orders.length ===
                  1
                    ? ""
                    : "s"
                }`}
          </p>
        </div>

        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl font-black text-orange-600 transition-transform duration-200 ${
            expanded
              ? "rotate-90"
              : ""
          }`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ${
          expanded
            ? "grid-rows-[1fr] border-t border-orange-100"
            : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2].map(
                (item) => (
                  <div
                    key={
                      item
                    }
                    className="animate-pulse rounded-2xl bg-slate-50 p-3"
                  >
                    <div className="h-3 w-32 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-48 rounded bg-slate-100" />
                    <div className="mt-3 h-9 rounded-xl bg-slate-100" />
                  </div>
                )
              )}
            </div>
          ) : error ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm font-black text-red-600">
                ⚠️ Order status load nahi hua
              </p>

              <p className="mt-1 break-words text-xs font-bold text-slate-500">
                {error}
              </p>
            </div>
          ) : (
            <div>
              {orders.map(
                (order) => (
                  <MyFoodOrderStatusRow
                    key={
                      order.id
                    }
                    order={
                      order
                    }
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MyFoodOrderStatusRow({
  order,
}) {
  const status =
    getUserOrderStatus(
      order
    );

  const itemsText =
    getFoodOrderItemsText(
      order
    );

  const shortOrderId =
    String(
      order.id ||
        ""
    )
      .slice(
        -8
      )
      .toUpperCase();

  return (
    <article className="border-b border-orange-100 px-4 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Order #
            {shortOrderId ||
              "------"}
          </p>

          <h3 className="mt-1 truncate text-sm font-black text-slate-950">
            {itemsText}
          </h3>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {formatOrderDate(
              order.createdAt
            )}{" "}
            •{" "}
            {formatPrice(
              getFoodOrderTotal(
                order
              )
            )}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black ${status.badgeClass}`}
        >
          {status.label}
        </span>
      </div>

      <div
        className={`mt-3 rounded-2xl border px-3 py-3 ${status.messageClass}`}
      >
        <p className="text-xs font-black">
          {status.icon}{" "}
          {status.title}
        </p>

        <p className="mt-1 text-[11px] font-bold leading-5">
          {status.message}
        </p>
      </div>
    </article>
  );
}

function getUserOrderStatus(
  order
) {
  const rawStatus =
    String(
      order?.orderStatus ||
        order?.deliveryStatus ||
        order?.status ||
        "pending"
    )
      .trim()
      .toLowerCase();

  if (
    [
      "declined",
      "rejected",
      "cancelled",
      "canceled",
    ].includes(
      rawStatus
    )
  ) {
    return {
      label:
        "DECLINED",

      title:
        "Order Declined",

      message:
        "Vendor is order ko accept nahi kar paaya. Is order ki delivery nahi hogi.",

      icon:
        "❌",

      badgeClass:
        "bg-red-100 text-red-700",

      messageClass:
        "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (
    rawStatus ===
    "delivered"
  ) {
    return {
      label:
        "DELIVERED",

      title:
        "Order Delivered",

      message:
        "Aapka food order successfully deliver ho gaya.",

      icon:
        "✅",

      badgeClass:
        "bg-green-100 text-green-700",

      messageClass:
        "border-green-200 bg-green-50 text-green-700",
    };
  }

  if (
    [
      "accepted",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "out-for-delivery",
    ].includes(
      rawStatus
    )
  ) {
    return {
      label:
        "ACCEPTED",

      title:
        "Order Accepted",

      message:
        "Vendor ne aapka order accept kar liya hai. Delivery process mein hai.",

      icon:
        "🍳",

      badgeClass:
        "bg-blue-100 text-blue-700",

      messageClass:
        "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label:
      "PENDING",

    title:
      "Waiting for Confirmation",

    message:
      "Vendor ne abhi order accept ya decline nahi kiya hai.",

    icon:
      "⏳",

    badgeClass:
      "bg-yellow-100 text-yellow-700",

    messageClass:
      "border-yellow-200 bg-yellow-50 text-yellow-700",
  };
}

function isIndividualFoodOrder(
  order
) {
  if (
    String(
      order?.subscriptionId ||
        ""
    ).trim()
  ) {
    return false;
  }

  const orderType =
    String(
      order?.orderType ||
        order?.type ||
        ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  if (
    [
      "one_time",
      "individual",
      "individual_items",
      "food_order",
      "one_time_food",
    ].includes(
      orderType
    )
  ) {
    return true;
  }

  return (
    Array.isArray(
      order?.items
    ) &&
    order.items.some(
      (item) =>
        item?.name ||
        item?.title
    )
  );
}

function getFoodOrderItemsText(
  order
) {
  const items =
    Array.isArray(
      order?.items
    )
      ? order.items
      : [];

  if (
    items.length ===
    0
  ) {
    return "Individual Food Order";
  }

  const visibleItems =
    items
      .slice(
        0,
        2
      )
      .map(
        (item) => {
          const name =
            String(
              item?.name ||
                item?.title ||
                "Food Item"
            ).trim();

          const quantity =
            Math.max(
              1,
              Number(
                item?.quantity ||
                  1
              )
            );

          return `${name} × ${quantity}`;
        }
      )
      .join(" • ");

  return items.length >
    2
    ? `${visibleItems} +${
        items.length -
        2
      } more`
    : visibleItems;
}

function getFoodOrderTotal(
  order
) {
  const directTotal =
    Number(
      order?.totalAmount ??
        order?.amount ??
        order?.price ??
        0
    );

  if (
    !Number.isNaN(
      directTotal
    ) &&
    directTotal > 0
  ) {
    return directTotal;
  }

  const items =
    Array.isArray(
      order?.items
    )
      ? order.items
      : [];

  return items.reduce(
    (
      total,
      item
    ) => {
      const price =
        Number(
          item?.price ||
            0
        );

      const quantity =
        Number(
          item?.quantity ||
            1
        );

      return (
        total +
        (
          Number.isNaN(
            price
          )
            ? 0
            : price
        ) *
          (
            Number.isNaN(
              quantity
            )
              ? 1
              : quantity
          )
      );
    },
    0
  );
}

function formatOrderDate(
  value
) {
  const date =
    convertOrderDate(
      value
    );

  if (!date) {
    return "Date unavailable";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      hour:
        "numeric",

      minute:
        "2-digit",

      hour12:
        true,
    }
  );
}

function getOrderTimeMs(
  value
) {
  const date =
    convertOrderDate(
      value
    );

  return date
    ? date.getTime()
    : 0;
}

function convertOrderDate(
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

function IndividualOrderSection({
  vendorOpen,
  search,
  onSearch,
  items,
  totalAvailableItems,
  quantities,
  onIncrease,
  onDecrease,
}) {
  const vegItems =
    items.filter(
      (item) =>
        normalizeFoodType(
          item.foodType
        ) ===
        "veg"
    );

  const nonVegItems =
    items.filter(
      (item) =>
        normalizeFoodType(
          item.foodType
        ) ===
        "nonVeg"
    );

  return (
    <section className="mt-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            Instant Order
          </p>

          <h2 className="mt-1 text-xl font-black">
            Choose Your Food
          </h2>
        </div>

        <span className="rounded-full bg-orange-100 px-3 py-1.5 text-[10px] font-black text-orange-700">
          {totalAvailableItems} Items
        </span>
      </div>

      <label className="relative mt-3 block">
        <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-lg">
          🔍
        </span>

        <input
          type="search"
          value={
            search
          }
          onChange={(
            event
          ) =>
            onSearch(
              event.target.value
            )
          }
          placeholder="Search veg or non-veg item..."
          className="h-12 w-full rounded-[16px] border border-orange-100 bg-white pl-10 pr-10 text-sm font-bold shadow-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />

        {search && (
          <button
            type="button"
            onClick={() =>
              onSearch("")
            }
            className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-600"
          >
            ✕
          </button>
        )}
      </label>

      {!vendorOpen && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          Vendor currently closed hai. Items dekh sakte ho, instant order abhi place nahi hoga.
        </div>
      )}

      {items.length ===
      0 ? (
        <div className="mt-4 rounded-[22px] border border-orange-100 bg-white px-5 py-12 text-center shadow-sm">
          <div className="text-5xl">
            🍽️
          </div>

          <h3 className="mt-3 text-lg font-black">
            No Food Item Found
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {search
              ? "Search change karke dobara try karo."
              : "Vendor ne abhi instant order items add nahi kiye hain."}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FoodTypeItemList
            title="Veg Items"
            emoji="🌱"
            items={
              vegItems
            }
            quantities={
              quantities
            }
            vendorOpen={
              vendorOpen
            }
            onIncrease={
              onIncrease
            }
            onDecrease={
              onDecrease
            }
          />

          <FoodTypeItemList
            title="Non-Veg Items"
            emoji="🍗"
            items={
              nonVegItems
            }
            quantities={
              quantities
            }
            vendorOpen={
              vendorOpen
            }
            onIncrease={
              onIncrease
            }
            onDecrease={
              onDecrease
            }
          />
        </div>
      )}
    </section>
  );
}

function FoodTypeItemList({
  title,
  emoji,
  items,
  quantities,
  vendorOpen,
  onIncrease,
  onDecrease,
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-orange-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-orange-100 bg-orange-50/60 px-4 py-3">
        <h3 className="text-sm font-black text-slate-950">
          {emoji} {title}
        </h3>

        <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-orange-700">
          {items.length} Items
        </span>
      </div>

      {items.length ===
      0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-black text-slate-500">
            Abhi koi {title.toLowerCase()} available nahi hai.
          </p>
        </div>
      ) : (
        items.map(
          (item) => (
            <FoodItemRow
              key={
                item.id
              }
              item={
                item
              }
              quantity={
                Number(
                  quantities[
                    item.id
                  ] ||
                  0
                )
              }
              disabled={
                !vendorOpen
              }
              onIncrease={() =>
                onIncrease(
                  item.id
                )
              }
              onDecrease={() =>
                onDecrease(
                  item.id
                )
              }
            />
          )
        )
      )}
    </section>
  );
}

function FoodItemRow({
  item,
  quantity,
  disabled,
  onIncrease,
  onDecrease,
}) {
  return (
    <article className="flex items-center gap-3 border-b border-orange-100 px-3 py-3.5 last:border-b-0">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl">
        🍲
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-black text-slate-950">
          {item.name}
        </h3>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-base font-black text-orange-600">
            {formatPrice(
              item.price
            )}
          </p>

          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
            {getFoodTypeLabel(
              item.foodType
            )}{" "}
            •{" "}
            {getMealSlotLabel(
              item.mealSlot
            )}
          </span>
        </div>
      </div>

      {quantity >
      0 ? (
        <div className="flex h-10 shrink-0 items-center overflow-hidden rounded-xl border border-orange-200 bg-white">
          <button
            type="button"
            onClick={
              onDecrease
            }
            disabled={
              disabled
            }
            className="grid h-full w-10 place-items-center text-lg font-black text-orange-600 disabled:opacity-40"
          >
            −
          </button>

          <span className="grid h-full min-w-9 place-items-center bg-orange-50 px-2 text-sm font-black text-slate-950">
            {quantity}
          </span>

          <button
            type="button"
            onClick={
              onIncrease
            }
            disabled={
              disabled
            }
            className="grid h-full w-10 place-items-center text-lg font-black text-orange-600 disabled:opacity-40"
          >
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={
            onIncrease
          }
          disabled={
            disabled
          }
          className="h-10 shrink-0 rounded-xl border border-orange-300 bg-orange-50 px-4 text-xs font-black text-orange-600 disabled:opacity-40"
        >
          ADD +
        </button>
      )}
    </article>
  );
}

function MonthlyPlanSection({
  vendor,
  vendorOpen,
  todayMenu,
}) {
  const lunchMenu =
    normalizeWeeklyMealGroup(
      todayMenu?.lunch
    );

  const dinnerMenu =
    normalizeWeeklyMealGroup(
      todayMenu?.dinner
    );

  return (
    <section className="mt-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-orange-600">
          Monthly Order
        </p>

        <h2 className="mt-1 text-xl font-black">
          Daily Tiffin Plans
        </h2>

        <p className="mt-1 text-xs font-bold text-slate-500">
          Veg aur Non-Veg menu alag-alag diya gaya hai.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TodayFoodTypeMenu
          title="Veg Menu"
          emoji="🌱"
          lunch={
            lunchMenu.veg
          }
          dinner={
            dinnerMenu.veg
          }
        />

        <TodayFoodTypeMenu
          title="Non-Veg Menu"
          emoji="🍗"
          lunch={
            lunchMenu.nonVeg
          }
          dinner={
            dinnerMenu.nonVeg
          }
        />
      </div>

      <MonthlyPriceOverview
        vendor={
          vendor
        }
      />

      <Link
        to={`/subscribe-tiffin/${vendor.id}`}
        state={{ vendor }}
        className={`mt-4 block w-full rounded-[18px] py-4 text-center text-sm font-black text-white shadow-lg transition active:scale-[0.99] ${
          vendorOpen
            ? "bg-orange-600 shadow-orange-600/25 hover:bg-orange-700"
            : "pointer-events-none bg-slate-400 shadow-none"
        }`}
      >
        {vendorOpen
          ? "📅 Start Monthly Order"
          : "Vendor Currently Closed"}
      </Link>

      <div className="mt-4 rounded-[20px] border border-blue-100 bg-blue-50 p-4">
        <h3 className="text-sm font-black text-blue-900">
          Monthly Order Flow
        </h3>

        <p className="mt-1 text-xs font-bold leading-5 text-blue-700">
          Request vendor ke Orders section mein jayega. Accept hone ke baad subscriber aur daily delivery mein add hoga.
        </p>
      </div>
    </section>
  );
}

function TodayFoodTypeMenu({
  title,
  emoji,
  lunch,
  dinner,
}) {
  return (
    <section className="rounded-[22px] border border-orange-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 px-1 py-1">
        <span className="text-2xl">
          {emoji}
        </span>

        <h3 className="text-base font-black text-slate-950">
          {title}
        </h3>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <MealCard
          icon="🍱"
          title="Today's Lunch"
          meal={
            lunch
          }
        />

        <MealCard
          icon="🌙"
          title="Today's Dinner"
          meal={
            dinner
          }
        />
      </div>
    </section>
  );
}

function CartBar({
  itemCount,
  total,
  onOpen,
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-100 bg-white/95 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-[18px] bg-slate-950 px-4 py-3 text-white shadow-xl">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-white/60">
            {itemCount} Items
          </p>

          <p className="mt-0.5 text-lg font-black">
            {formatPrice(
              total
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={
            onOpen
          }
          className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white"
        >
          View Cart →
        </button>
      </div>
    </div>
  );
}

function CheckoutModal({
  vendorName,
  cartItems,
  total,
  customerName,
  customerPhone,
  customerAddress,
  notes,
  placingOrder,
  onCustomerName,
  onCustomerPhone,
  onCustomerAddress,
  onNotes,
  onClose,
  onSubmit,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 px-4 py-5"
      onClick={
        onClose
      }
    >
      <div className="mx-auto flex h-full max-w-md items-end">
        <form
          onSubmit={
            onSubmit
          }
          onClick={(
            event
          ) =>
            event.stopPropagation()
          }
          className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl"
        >
          <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                Instant Order
              </p>

              <h2 className="mt-1 text-xl font-black">
                {vendorName}
              </h2>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                placingOrder
              }
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xl font-black disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <section className="mt-4 overflow-hidden rounded-2xl border border-orange-100">
            {cartItems.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="flex items-center justify-between gap-3 border-b border-orange-100 px-3 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black">
                      {item.name}
                    </h3>

                    <p className="mt-0.5 text-xs font-bold text-slate-500">
                      {formatPrice(
                        item.price
                      )} ×{" "}
                      {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-black text-orange-600">
                    {formatPrice(
                      Number(
                        item.price
                      ) *
                        item.quantity
                    )}
                  </p>
                </div>
              )
            )}

            <div className="flex items-center justify-between bg-orange-50 px-3 py-3">
              <p className="text-sm font-black">
                Total
              </p>

              <p className="text-lg font-black text-orange-600">
                {formatPrice(
                  total
                )}
              </p>
            </div>
          </section>

          <div className="mt-4 grid gap-3">
            <CheckoutField
              label="Customer Name"
              value={
                customerName
              }
              onChange={
                onCustomerName
              }
              placeholder="Your name"
            />

            <CheckoutField
              label="Phone Number"
              value={
                customerPhone
              }
              onChange={
                onCustomerPhone
              }
              placeholder="10 digit mobile number"
              type="tel"
            />

            <label>
              <span className="mb-1.5 block text-xs font-black text-slate-600">
                Delivery Address
              </span>

              <textarea
                value={
                  customerAddress
                }
                onChange={(
                  event
                ) =>
                  onCustomerAddress(
                    event.target.value
                  )
                }
                placeholder="Room/PG name, area and landmark"
                rows={3}
                className="w-full resize-none rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-3 text-sm font-bold outline-none focus:border-orange-400"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-black text-slate-600">
                Notes (Optional)
              </span>

              <input
                type="text"
                value={
                  notes
                }
                onChange={(
                  event
                ) =>
                  onNotes(
                    event.target.value
                  )
                }
                placeholder="Less spicy, call before delivery..."
                className="h-12 w-full rounded-xl border border-orange-100 bg-orange-50/40 px-3 text-sm font-bold outline-none focus:border-orange-400"
              />
            </label>

            <div className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-3">
              <div>
                <p className="text-xs font-black text-green-800">
                  Payment Method
                </p>

                <p className="mt-0.5 text-[10px] font-bold text-green-700">
                  Pay when order arrives
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-green-700">
                COD
              </span>
            </div>

            <button
              type="submit"
              disabled={
                placingOrder
              }
              className="h-14 rounded-[16px] bg-orange-600 text-sm font-black text-white shadow-lg shadow-orange-600/20 disabled:opacity-50"
            >
              {placingOrder
                ? "Placing Order..."
                : `Place Order • ${formatPrice(
                    total
                  )}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckoutField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-black text-slate-600">
        {label}
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="h-12 w-full rounded-xl border border-orange-100 bg-orange-50/40 px-3 text-sm font-bold outline-none focus:border-orange-400"
      />
    </label>
  );
}

function HeroInfo({
  icon,
  value,
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5">
      <span className="shrink-0">
        {icon}
      </span>

      <span className="truncate text-xs font-black">
        {value}
      </span>
    </div>
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
          Loading Tiffin Vendor
        </h2>

        <p className="mt-2 text-sm font-bold text-slate-500">
          Menu aur vendor details load ho rahi hain...
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({
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
          {message ||
            "Tiffin vendor details nahi mili."}
        </p>

        <Link
          to="/tiffin"
          className="mt-6 block rounded-2xl bg-orange-600 px-5 py-4 font-black text-white"
        >
          Back to Tiffin Services
        </Link>
      </div>
    </div>
  );
}

function MealCard({
  icon,
  title,
  meal,
}) {
  const available =
    meal?.available !== false;

  const items =
    Array.isArray(
      meal?.items
    )
      ? meal.items
      : [];

  return (
    <div
      className={`rounded-[20px] border p-4 shadow-sm ${
        available
          ? "border-orange-200 bg-orange-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {icon}
          </span>

          <h3 className="text-sm font-black">
            {title}
          </h3>
        </div>

        <span
          className={`rounded-full px-2 py-1 text-[9px] font-black ${
            available
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {available
            ? "OPEN"
            : "CLOSED"}
        </span>
      </div>

      <div className="mt-3 min-h-[70px] rounded-xl bg-white/80 p-3 text-xs font-bold text-slate-700">
        {items.length > 0 ? (
          items.map(
            (
              item,
              index
            ) => (
              <p
                key={`${item}-${index}`}
                className="mt-1 first:mt-0"
              >
                • {item}
              </p>
            )
          )
        ) : (
          <p className="text-center text-slate-500">
            Menu will be updated soon
          </p>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-white px-3 py-2.5 text-center text-base font-black text-orange-600">
        {formatPrice(
          meal?.price
        )}
      </div>
    </div>
  );
}

function MonthlyPriceOverview({
  vendor,
}) {
  const prices =
    normalizeVendorMonthlyPrices(
      vendor
    );

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <MonthlyPriceGroup
        title="Veg"
        emoji="🌱"
        prices={
          prices.veg
        }
      />

      <MonthlyPriceGroup
        title="Non-Veg"
        emoji="🍗"
        prices={
          prices.nonVeg
        }
      />
    </div>
  );
}

function MonthlyPriceGroup({
  title,
  emoji,
  prices,
}) {
  return (
    <div className="rounded-[20px] border border-orange-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xl">
          {emoji}
        </span>

        <h3 className="text-sm font-black text-slate-900">
          {title} Monthly
        </h3>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MonthlyPriceCell
          title="Lunch"
          price={
            prices.lunch
          }
        />

        <MonthlyPriceCell
          title="Dinner"
          price={
            prices.dinner
          }
        />

        <MonthlyPriceCell
          title="Both"
          price={
            prices.lunchDinner
          }
        />
      </div>
    </div>
  );
}

function MonthlyPriceCell({
  title,
  price,
}) {
  return (
    <div className="min-w-0 rounded-[14px] bg-orange-50 px-2 py-3 text-center">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-1 truncate text-xs font-black text-orange-600 sm:text-sm">
        {formatPrice(
          price
        )}
      </p>
    </div>
  );
}

function normalizeVendorMonthlyPrices(
  vendor = {}
) {
  const direct =
    vendor?.monthlyPrices ||
    {};

  const nonVegExtra =
    getFirstVendorPrice(
      vendor?.nonVegMonthlyExtra,
      vendor?.nonVegSurcharge,
      vendor?.subscriptionPrices
        ?.nonVegExtra,
      400
    );

  const vegLunch =
    getFirstVendorPrice(
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
      1800
    );

  const vegDinner =
    getFirstVendorPrice(
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
      1800
    );

  const vegLunchDinner =
    getFirstVendorPrice(
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
      3200
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
        getFirstVendorPrice(
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
        getFirstVendorPrice(
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
        getFirstVendorPrice(
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

function getFirstVendorPrice(
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
      !Number.isNaN(amount) &&
      amount >= 0
    ) {
      return amount;
    }
  }

  return 0;
}


function normalizeIndividualItems(
  items
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(
      (
        item,
        index
      ) => {
        if (
          typeof item ===
          "string"
        ) {
          const name =
            item.trim();

          return {
            id:
              `legacy-${index}`,

            name,

            price:
              0,

            mealSlot:
              "both",

            foodType:
              inferFoodTypeFromName(
                name
              ),

            available:
              true,
          };
        }

        const name =
          String(
            item?.name ||
            item?.title ||
            ""
          ).trim();

        const price =
          Number(
            item?.price ??
            item?.amount ??
            0
          );

        return {
          id:
            String(
              item?.id ||
              `item-${index}`
            ),

          name,

          price:
            Number.isNaN(
              price
            )
              ? 0
              : Math.max(
                  0,
                  price
                ),

          mealSlot:
            normalizeMealSlot(
              item?.mealSlot ||
              item?.mealType ||
              item?.availableFor ||
              "both"
            ),

          foodType:
            normalizeFoodType(
              item?.foodType ||
              item?.dietType ||
              item?.category ||
              inferFoodTypeFromName(
                name
              )
            ),

          available:
            item?.available !==
            false,
        };
      }
    )
    .filter(
      (item) =>
        Boolean(
          item.name
        )
    );
}

function normalizeWeeklyMealGroup(
  mealGroup
) {
  const source =
    mealGroup &&
    typeof mealGroup ===
      "object"
      ? mealGroup
      : {};

  if (
    source.veg ||
    source.nonVeg ||
    source.nonveg
  ) {
    return {
      veg:
        normalizeDisplayMeal(
          source.veg
        ),

      nonVeg:
        normalizeDisplayMeal(
          source.nonVeg ||
          source.nonveg
        ),
    };
  }

  const legacyMeal =
    normalizeDisplayMeal(
      source
    );

  const vegItems = [];
  const nonVegItems = [];

  legacyMeal.items.forEach(
    (item) => {
      if (
        inferFoodTypeFromName(
          item
        ) ===
        "nonVeg"
      ) {
        nonVegItems.push(
          item
        );
      } else {
        vegItems.push(
          item
        );
      }
    }
  );

  return {
    veg: {
      ...legacyMeal,
      items:
        vegItems,
    },

    nonVeg: {
      ...legacyMeal,
      items:
        nonVegItems,
    },
  };
}

function normalizeDisplayMeal(
  meal
) {
  const source =
    meal &&
    typeof meal ===
      "object"
      ? meal
      : {};

  return {
    items:
      Array.isArray(
        source.items
      )
        ? source.items.map(
            (item) =>
              String(
                item ??
                ""
              )
          )
        : [],

    price:
      source.price,

    available:
      source.available !==
      false,
  };
}

function normalizeFoodType(
  value
) {
  const normalized =
    String(
      value ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s_-]+/g,
        ""
      );

  if (
    [
      "nonveg",
      "nonvegetarian",
      "meat",
    ].includes(
      normalized
    )
  ) {
    return "nonVeg";
  }

  return "veg";
}

function inferFoodTypeFromName(
  value
) {
  const text =
    String(
      value ||
      ""
    )
      .trim()
      .toLowerCase();

  const keywords = [
    "chicken",
    "egg",
    "anda",
    "fish",
    "machh",
    "machli",
    "mutton",
    "meat",
    "prawn",
    "shrimp",
    "keema",
    "kebab",
  ];

  return keywords.some(
    (keyword) =>
      text.includes(
        keyword
      )
  )
    ? "nonVeg"
    : "veg";
}

function getFoodTypeLabel(
  foodType
) {
  return normalizeFoodType(
    foodType
  ) ===
    "nonVeg"
    ? "Non-Veg"
    : "Veg";
}


function normalizeMealSlot(
  value
) {
  const normalized =
    String(
      value ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    normalized ===
    "lunch"
  ) {
    return "lunch";
  }

  if (
    normalized ===
    "dinner"
  ) {
    return "dinner";
  }

  return "both";
}

function getMealSlotLabel(
  mealSlot
) {
  if (
    mealSlot ===
    "lunch"
  ) {
    return "Lunch";
  }

  if (
    mealSlot ===
    "dinner"
  ) {
    return "Dinner";
  }

  return "Lunch & Dinner";
}

function formatPrice(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Price Soon";
  }

  const amount =
    Number(
      String(value)
        .replace(
          /₹/g,
          ""
        )
        .replace(
          /,/g,
          ""
        )
        .trim()
    );

  if (
    Number.isNaN(
      amount
    )
  ) {
    return `₹${value}`;
  }

  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}