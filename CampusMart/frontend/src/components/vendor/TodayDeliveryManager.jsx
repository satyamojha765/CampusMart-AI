import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

import {
  getSubscriptionsByVendor,
  updateSubscription,
} from "../../features/vendor/services/subscriptionService";

import {
  createDelivery,
  getTodayString,
} from "../../features/vendor/services/deliveryService";

import {
  getOrdersByVendor,
} from "../../features/vendor/services/orderService";

const FILTERS = [
  {
    id: "pending",
    label: "Pending",
  },
  {
    id: "delivered",
    label: "Delivered",
  },
];

const DELIVERY_SECTIONS = [
  {
    id: "food",
    title: "Food Orders",
    icon: "🍽️",
  },
  {
    id: "lunch",
    title: "Lunch",
    icon: "🍱",
  },
  {
    id: "dinner",
    title: "Dinner",
    icon: "🌙",
  },
];

export default function TodayDeliveryManager({
  vendor,
}) {
  const [
    subscribers,
    setSubscribers,
  ] = useState([]);

  const [
    foodOrders,
    setFoodOrders,
  ] = useState([]);

  const [
    deliveries,
    setDeliveries,
  ] = useState([]);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("pending");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    updatingTaskKey,
    setUpdatingTaskKey,
  ] = useState("");

  const [
    updatingSection,
    setUpdatingSection,
  ] = useState("");

  const [
    collapsedSections,
    setCollapsedSections,
  ] = useState({
    food: true,
    lunch: true,
    dinner: true,
  });

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async ({
      silent = false,
    } = {}) => {
      if (!vendor?.id) {
        setSubscribers([]);
        setFoodOrders([]);
        setDeliveries([]);
        setLoading(false);
        setError(
          "Vendor ID nahi mila."
        );
        return;
      }

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          subscriberList,
          orderList,
          deliverySnapshot,
        ] = await Promise.all([
          getSubscriptionsByVendor(
            vendor.id
          ),

          getOrdersByVendor(
            vendor.id
          ),

          getDocs(
            query(
              collection(
                db,
                "deliveries"
              ),
              where(
                "vendorId",
                "==",
                vendor.id
              )
            )
          ),
        ]);

        const safeSubscribers =
          Array.isArray(
            subscriberList
          )
            ? subscriberList
            : [];

        const safeOrders =
          Array.isArray(
            orderList
          )
            ? orderList
            : [];

        const safeDeliveries =
          deliverySnapshot.docs.map(
            (
              deliveryDocument
            ) => ({
              id:
                deliveryDocument.id,

              ...deliveryDocument.data(),
            })
          );

        const activeSubscribers =
          safeSubscribers
            .filter(
              isAcceptedActiveSubscriber
            )
            .sort(
              (
                firstSubscriber,
                secondSubscriber
              ) =>
                getCustomerName(
                  firstSubscriber
                ).localeCompare(
                  getCustomerName(
                    secondSubscriber
                  )
                )
            );

        const acceptedFoodOrders =
          safeOrders
            .filter(
              (order) =>
                getOrderCategory(
                  order
                ) ===
                "individual"
            )
            .filter(
              (order) =>
                isFoodOrderVisible(
                  order,
                  safeDeliveries
                )
            )
            .sort(
              (
                firstOrder,
                secondOrder
              ) =>
                getTimeMs(
                  secondOrder.acceptedAt ||
                    secondOrder.createdAt
                ) -
                getTimeMs(
                  firstOrder.acceptedAt ||
                    firstOrder.createdAt
                )
            );

        setSubscribers(
          activeSubscribers
        );

        setFoodOrders(
          acceptedFoodOrders
        );

        setDeliveries(
          safeDeliveries
        );
      } catch (loadError) {
        console.error(
          "Failed to load deliveries:",
          loadError
        );

        setError(
          loadError?.message ||
            "Deliveries load nahi hui."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [vendor?.id]
  );

  useEffect(() => {
    setActiveFilter(
      "pending"
    );

    setSearchText("");

    setCollapsedSections({
      food: true,
      lunch: true,
      dinner: true,
    });

    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () =>
          setSuccessMessage(
            ""
          ),
        3000
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [successMessage]);

  const monthlyTasks =
    useMemo(() => {
      return subscribers.flatMap(
        (subscriber) =>
          getSubscriberMealSlots(
            subscriber
          ).map(
            (mealSlot) => ({
              key:
                getMonthlyTaskKey(
                  subscriber.id,
                  mealSlot
                ),

              type:
                "monthly",

              sectionId:
                mealSlot,

              mealSlot,

              source:
                subscriber,
            })
          )
      );
    }, [subscribers]);

  const foodTasks =
    useMemo(() => {
      return foodOrders.map(
        (order) => ({
          key:
            getFoodTaskKey(
              order.id
            ),

          type:
            "food",

          sectionId:
            "food",

          mealSlot:
            "food",

          source:
            order,
        })
      );
    }, [foodOrders]);

  const allTasks =
    useMemo(() => {
      return [
        ...foodTasks,
        ...monthlyTasks,
      ];
    }, [
      foodTasks,
      monthlyTasks,
    ]);

  const monthlyDeliveryTracking =
    useMemo(() => {
      const today =
        getTodayString();

      const taskKeys =
        new Set();

      const legacySubscriptionIds =
        new Set();

      deliveries
        .filter(
          (delivery) =>
            delivery?.deliveryDate ===
              today &&
            normalizeText(
              delivery?.status ||
                delivery?.deliveryStatus
            ) ===
              "delivered"
        )
        .forEach(
          (delivery) => {
            const subscriptionId =
              String(
                delivery?.subscriptionId ||
                  ""
              ).trim();

            if (!subscriptionId) {
              return;
            }

            const mealSlot =
              normalizeMealSlot(
                delivery?.mealSlot ||
                  delivery?.deliveryMeal ||
                  delivery?.mealSession
              );

            if (mealSlot) {
              taskKeys.add(
                getMonthlyTaskKey(
                  subscriptionId,
                  mealSlot
                )
              );
            } else {
              legacySubscriptionIds.add(
                subscriptionId
              );
            }
          }
        );

      return {
        taskKeys,
        legacySubscriptionIds,
      };
    }, [deliveries]);

  const isTaskDelivered =
    useCallback(
      (
        task,
        extraTaskKeys =
          new Set()
      ) => {
        if (
          !task?.key ||
          !task?.source
        ) {
          return false;
        }

        if (
          task.type ===
          "food"
        ) {
          if (
            extraTaskKeys.has(
              task.key
            )
          ) {
            return true;
          }

          return isFoodOrderDelivered(
            task.source,
            deliveries
          );
        }

        const subscriberId =
          String(
            task.source.id ||
              ""
          ).trim();

        if (!subscriberId) {
          return false;
        }

        return (
          monthlyDeliveryTracking.taskKeys.has(
            task.key
          ) ||
          extraTaskKeys.has(
            task.key
          ) ||
          monthlyDeliveryTracking.legacySubscriptionIds.has(
            subscriberId
          )
        );
      },
      [
        deliveries,
        monthlyDeliveryTracking,
      ]
    );

  const stats =
    useMemo(() => {
      const deliveredCount =
        allTasks.filter(
          (task) =>
            isTaskDelivered(
              task
            )
        ).length;

      return {
        delivered:
          deliveredCount,

        pending:
          allTasks.length -
          deliveredCount,
      };
    }, [
      allTasks,
      isTaskDelivered,
    ]);

  const filteredTasks =
    useMemo(() => {
      const normalizedSearch =
        searchText
          .trim()
          .toLowerCase();

      return allTasks.filter(
        (task) => {
          const delivered =
            isTaskDelivered(
              task
            );

          const matchesFilter =
            activeFilter ===
              "pending"
              ? !delivered
              : delivered;

          if (!matchesFilter) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const source =
            task.source;

          const searchableText = [
            getCustomerName(
              source
            ),
            getCustomerPhone(
              source
            ),
            getCustomerAddress(
              source
            ),
            task.type ===
            "food"
              ? getFoodItemsSummary(
                  source
                )
              : getPlanLabel(
                  source
                ),
            task.type ===
            "food"
              ? getOrderAmount(
                  source
                )
              : getPreferenceLabel(
                  source
                ),
            task.mealSlot,
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch
          );
        }
      );
    }, [
      allTasks,
      activeFilter,
      searchText,
      isTaskDelivered,
    ]);

  const sectionTasks =
    useMemo(() => {
      return {
        food:
          filteredTasks.filter(
            (task) =>
              task.sectionId ===
              "food"
          ),

        lunch:
          filteredTasks.filter(
            (task) =>
              task.sectionId ===
              "lunch"
          ),

        dinner:
          filteredTasks.filter(
            (task) =>
              task.sectionId ===
              "dinner"
          ),
      };
    }, [filteredTasks]);

  async function saveMonthlyDeliveredTask(
    task,
    extraTaskKeys =
      new Set()
  ) {
    const subscriber =
      task?.source;

    const mealSlot =
      task?.mealSlot;

    if (
      !vendor?.id ||
      !subscriber?.id ||
      !mealSlot
    ) {
      throw new Error(
        "Subscription delivery details incomplete hain."
      );
    }

    if (
      isTaskDelivered(
        task,
        extraTaskKeys
      )
    ) {
      return;
    }

    const deliveredAt =
      Timestamp.now();

    await createDelivery({
      vendorId:
        vendor.id,

      vendorType:
        vendor.vendorType ||
        vendor.category ||
        "tiffin",

      subscriptionId:
        String(
          subscriber.id
        ),

      userId:
        subscriber.userId ||
        "",

      customerName:
        getCustomerName(
          subscriber
        ),

      customerPhone:
        getCustomerPhone(
          subscriber
        ),

      customerAddress:
        getCustomerAddress(
          subscriber
        ),

      mealType:
        subscriber.mealType ||
        subscriber.planType ||
        "",

      mealPreference:
        subscriber.mealPreference ||
        subscriber.preference ||
        "veg",

      mealSlot,

      deliveryMeal:
        mealSlot,

      deliveryDate:
        getTodayString(),

      status:
        "delivered",

      deliveredAt,

      notes:
        subscriber.notes ||
        "",
    });

    const subscriberSlots =
      getSubscriberMealSlots(
        subscriber
      );

    const completedSlots =
      new Set(
        subscriberSlots.filter(
          (slot) =>
            isTaskDelivered(
              {
                key:
                  getMonthlyTaskKey(
                    subscriber.id,
                    slot
                  ),

                type:
                  "monthly",

                source:
                  subscriber,

                mealSlot:
                  slot,
              },
              extraTaskKeys
            )
        )
      );

    completedSlots.add(
      mealSlot
    );

    const allMealsDelivered =
      subscriberSlots.every(
        (slot) =>
          completedSlots.has(
            slot
          )
      );

    const subscriptionUpdate = {
      deliveryStatus:
        allMealsDelivered
          ? "delivered"
          : "partial",
    };

    if (
      mealSlot ===
      "lunch"
    ) {
      subscriptionUpdate.lastLunchDeliveredAt =
        deliveredAt;
    } else {
      subscriptionUpdate.lastDinnerDeliveredAt =
        deliveredAt;
    }

    if (
      allMealsDelivered
    ) {
      subscriptionUpdate.lastDeliveredAt =
        deliveredAt;
    }

    await updateSubscription(
      String(
        subscriber.id
      ),
      subscriptionUpdate
    );
  }

  async function saveFoodDeliveredTask(
    task,
    extraTaskKeys =
      new Set()
  ) {
    const order =
      task?.source;

    if (
      !vendor?.id ||
      !order?.id
    ) {
      throw new Error(
        "Food order delivery details incomplete hain."
      );
    }

    if (
      isTaskDelivered(
        task,
        extraTaskKeys
      )
    ) {
      return;
    }

    const today =
      getTodayString();

    const deliveredAt =
      Timestamp.now();

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "orders",
        order.id
      ),
      {
        orderStatus:
          "delivered",

        deliveryStatus:
          "delivered",

        /*
         * Individual food order COD hai.
         * Delivery complete hote hi payment collected maana jayega,
         * taaki Dashboard revenue mein amount add ho.
         */
        paymentStatus:
          "paid",

        deliveredAt,

        updatedAt:
          serverTimestamp(),
      }
    );

    const existingDelivery =
      findOrderDelivery(
        deliveries,
        order.id
      );

    if (
      existingDelivery?.id
    ) {
      batch.update(
        doc(
          db,
          "deliveries",
          existingDelivery.id
        ),
        {
          status:
            "delivered",

          deliveryDate:
            today,

          deliveredAt,

          updatedAt:
            serverTimestamp(),
        }
      );
    } else {
      const deliveryRef =
        doc(
          collection(
            db,
            "deliveries"
          )
        );

      batch.set(
        deliveryRef,
        {
          orderId:
            order.id,

          orderType:
            "one_time",

          vendorId:
            order.vendorId ||
            vendor.id,

          userId:
            order.userId ||
            "",

          customerName:
            getCustomerName(
              order
            ),

          customerPhone:
            getCustomerPhone(
              order
            ),

          customerAddress:
            getCustomerAddress(
              order
            ),

          items:
            getIndividualItems(
              order
            ),

          totalItems:
            getTotalItemCount(
              order
            ),

          totalAmount:
            getOrderAmount(
              order
            ),

          paymentMethod:
            order.paymentMethod ||
            "cod",

          paymentStatus:
            "paid",

          deliverySlot:
            getFoodOrderMealSlot(
              order
            ),

          deliveryDate:
            today,

          status:
            "delivered",

          deliveredAt,

          notes:
            String(
              order.notes ||
                ""
            ).trim(),

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );
    }

    await batch.commit();
  }

  async function saveDeliveredTask(
    task,
    extraTaskKeys =
      new Set()
  ) {
    if (
      task.type ===
      "food"
    ) {
      await saveFoodDeliveredTask(
        task,
        extraTaskKeys
      );
      return;
    }

    await saveMonthlyDeliveredTask(
      task,
      extraTaskKeys
    );
  }

  async function markDelivered(
    task
  ) {
    if (
      updatingTaskKey ||
      updatingSection
    ) {
      return;
    }

    try {
      setUpdatingTaskKey(
        task.key
      );

      setError("");
      setSuccessMessage("");

      await saveDeliveredTask(
        task
      );

      setSuccessMessage(
        task.type ===
        "food"
          ? `${getCustomerName(
              task.source
            )} ka food order delivered.`
          : `${getCustomerName(
              task.source
            )} ki ${getMealSlotLabel(
              task.mealSlot
            )} delivery complete.`
      );

      await loadData({
        silent: true,
      });
    } catch (deliveryError) {
      console.error(
        "Mark delivered failed:",
        deliveryError
      );

      setError(
        deliveryError?.message ||
          "Delivery mark nahi hui."
      );
    } finally {
      setUpdatingTaskKey(
        ""
      );
    }
  }

  async function markSectionDelivered(
    sectionId,
    tasks
  ) {
    if (
      tasks.length ===
        0 ||
      updatingTaskKey ||
      updatingSection
    ) {
      return;
    }

    const sectionTitle =
      getSectionTitle(
        sectionId
      );

    const confirmed =
      window.confirm(
        `${sectionTitle} ki ${tasks.length} pending deliveries complete mark karni hain?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingSection(
        sectionId
      );

      setError("");
      setSuccessMessage("");

      const completedTaskKeys =
        new Set();

      for (
        const task of tasks
      ) {
        await saveDeliveredTask(
          task,
          completedTaskKeys
        );

        completedTaskKeys.add(
          task.key
        );
      }

      setSuccessMessage(
        `${sectionTitle} ki sab deliveries complete ho gayi.`
      );

      await loadData({
        silent: true,
      });
    } catch (sectionError) {
      console.error(
        "Mark all delivered failed:",
        sectionError
      );

      setError(
        sectionError?.message ||
          "Sab deliveries mark nahi hui."
      );
    } finally {
      setUpdatingSection(
        ""
      );
    }
  }

  function toggleSection(
    sectionId
  ) {
    setCollapsedSections(
      (currentValue) => ({
        ...currentValue,

        [sectionId]:
          !currentValue[
            sectionId
          ],
      })
    );
  }

  const vendorName =
    vendor?.businessName ||
    vendor?.name ||
    "Tiffin Vendor";

  return (
    <div className="min-h-screen bg-[#fffaf5] px-3 pb-28 pt-3 text-slate-950 sm:px-4">
      <header className="rounded-[20px] border border-orange-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-orange-600">
              {vendorName}
            </p>

            <h1 className="mt-0.5 text-xl font-black tracking-tight">
              Today&apos;s Delivery
            </h1>

            <p className="mt-0.5 text-[11px] font-bold text-slate-500">
              Food orders aur monthly tiffin delivery
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadData({
                silent: true,
              })
            }
            disabled={
              refreshing ||
              loading
            }
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-lg disabled:opacity-50"
            aria-label="Refresh deliveries"
          >
            {refreshing
              ? "⏳"
              : "↻"}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat
            label="Pending"
            value={
              stats.pending
            }
            icon="⏳"
          />

          <MiniStat
            label="Delivered"
            value={
              stats.delivered
            }
            icon="✅"
          />
        </div>
      </header>

      <section className="mt-3 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-base">
            🔍
          </span>

          <input
            type="search"
            value={
              searchText
            }
            onChange={(
              event
            ) =>
              setSearchText(
                event.target.value
              )
            }
            placeholder="Search user or item"
            className="h-11 w-full rounded-xl border border-orange-100 bg-white pl-10 pr-9 text-sm font-bold outline-none focus:border-orange-400"
          />

          {searchText && (
            <button
              type="button"
              onClick={() =>
                setSearchText(
                  ""
                )
              }
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-600"
            >
              ✕
            </button>
          )}
        </label>

        <div className="grid shrink-0 grid-cols-2 rounded-xl border border-orange-100 bg-white p-1">
          {FILTERS.map(
            (filter) => {
              const selected =
                activeFilter ===
                filter.id;

              const count =
                filter.id ===
                "pending"
                  ? stats.pending
                  : stats.delivered;

              return (
                <button
                  key={
                    filter.id
                  }
                  type="button"
                  onClick={() =>
                    setActiveFilter(
                      filter.id
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-[11px] font-black ${
                    selected
                      ? "bg-orange-600 text-white"
                      : "text-slate-600"
                  }`}
                >
                  {filter.label}{" "}
                  {count}
                </button>
              );
            }
          )}
        </div>
      </section>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-black text-red-700">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-black text-green-700">
          ✅ {successMessage}
        </div>
      )}

      {loading ? (
        <section className="mt-4">
          <CompactSkeleton />
        </section>
      ) : (
        <div className="mt-4 space-y-4">
          {DELIVERY_SECTIONS.map(
            (section) => (
              <CompactDeliverySection
                key={
                  section.id
                }
                section={
                  section
                }
                tasks={
                  sectionTasks[
                    section.id
                  ]
                }
                activeFilter={
                  activeFilter
                }
                searchText={
                  searchText
                }
                collapsed={
                  collapsedSections[
                    section.id
                  ]
                }
                updatingTaskKey={
                  updatingTaskKey
                }
                updatingSection={
                  updatingSection
                }
                onToggle={() =>
                  toggleSection(
                    section.id
                  )
                }
                onDelivered={
                  markDelivered
                }
                onMarkAll={() =>
                  markSectionDelivered(
                    section.id,
                    sectionTasks[
                      section.id
                    ]
                  )
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function CompactDeliverySection({
  section,
  tasks,
  activeFilter,
  searchText,
  collapsed,
  updatingTaskKey,
  updatingSection,
  onToggle,
  onDelivered,
  onMarkAll,
}) {
  const markingAll =
    updatingSection ===
    section.id;

  return (
    <section className="overflow-hidden rounded-[18px] border border-orange-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={
            onToggle
          }
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl"
          aria-label={`Toggle ${section.title}`}
        >
          {section.icon}
        </button>

        <button
          type="button"
          onClick={
            onToggle
          }
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-950">
              {section.title}
            </h2>

            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">
              {tasks.length}
            </span>
          </div>

          <p className="mt-0.5 text-[11px] font-bold text-slate-500">
            {activeFilter ===
            "pending"
              ? "Pending deliveries"
              : "Completed deliveries"}
          </p>
        </button>

        {activeFilter ===
          "pending" &&
          tasks.length >
            1 && (
            <button
              type="button"
              onClick={
                onMarkAll
              }
              disabled={
                Boolean(
                  updatingTaskKey
                ) ||
                Boolean(
                  updatingSection
                )
              }
              className="shrink-0 rounded-lg bg-green-100 px-2.5 py-2 text-[10px] font-black text-green-700 disabled:opacity-50"
            >
              {markingAll
                ? "Marking..."
                : "✓ Mark all"}
            </button>
          )}

        <button
          type="button"
          onClick={
            onToggle
          }
          className="grid h-8 w-8 shrink-0 place-items-center text-sm font-black text-slate-500"
          aria-label={`Toggle ${section.title}`}
        >
          {collapsed
            ? "⌄"
            : "⌃"}
        </button>
      </div>

      {!collapsed && (
        <div className="border-t border-orange-100">
          {tasks.length ===
          0 ? (
            <CompactEmptyState
              sectionId={
                section.id
              }
              activeFilter={
                activeFilter
              }
              searchText={
                searchText
              }
            />
          ) : (
            tasks.map(
              (
                task,
                index
              ) => (
                <CompactDeliveryRow
                  key={
                    task.key
                  }
                  task={
                    task
                  }
                  index={
                    index
                  }
                  delivered={
                    activeFilter ===
                    "delivered"
                  }
                  updating={
                    updatingTaskKey ===
                    task.key
                  }
                  disabled={
                    Boolean(
                      updatingTaskKey
                    ) ||
                    Boolean(
                      updatingSection
                    )
                  }
                  onDelivered={() =>
                    onDelivered(
                      task
                    )
                  }
                />
              )
            )
          )}
        </div>
      )}
    </section>
  );
}

function CompactDeliveryRow({
  task,
  index,
  delivered,
  updating,
  disabled,
  onDelivered,
}) {
  const source =
    task.source;

  const name =
    getCustomerName(
      source
    );

  const phone =
    getCustomerPhone(
      source
    );

  const address =
    getCustomerAddress(
      source
    );

  const phoneHref =
    buildPhoneHref(
      phone
    );

  const whatsappHref =
    buildWhatsappHref(
      phone,
      name,
      task
    );

  const isFood =
    task.type ===
    "food";

  const remainingDays =
    isFood
      ? null
      : getRemainingDays(
          getSubscriberEndDate(
            source
          )
        );

  return (
    <article className="border-b border-orange-100 px-3 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <Avatar
          index={
            index
          }
          name={
            name
          }
          isFood={
            isFood
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-black text-slate-950">
              {name}
            </h3>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${
                delivered
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {delivered
                ? "DONE"
                : "PENDING"}
            </span>
          </div>

          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
            {phone ||
              "No phone"}{" "}
            •{" "}
            {isFood
              ? getFoodItemsSummary(
                  source
                )
              : getPreferenceLabel(
                  source
                )}

            {remainingDays !==
            null
              ? ` • ${remainingDays}d`
              : ""}
          </p>

          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">
            📍 {address}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {phoneHref && (
            <a
              href={
                phoneHref
              }
              className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-sm"
              aria-label={`Call ${name}`}
            >
              📞
            </a>
          )}

          {whatsappHref && (
            <a
              href={
                whatsappHref
              }
              target="_blank"
              rel="noreferrer"
              className="grid h-8 w-8 place-items-center rounded-lg bg-green-50 text-sm"
              aria-label={`WhatsApp ${name}`}
            >
              💬
            </a>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-black uppercase tracking-wide text-orange-600">
          {isFood
            ? `FOOD ORDER • ₹${formatMoney(
                getOrderAmount(
                  source
                )
              )}`
            : getPlanLabel(
                source
              )}
        </span>

        {delivered ? (
          <span className="shrink-0 rounded-lg bg-green-100 px-3 py-2 text-[10px] font-black text-green-700">
            ✓ Delivered
          </span>
        ) : (
          <button
            type="button"
            onClick={
              onDelivered
            }
            disabled={
              disabled
            }
            className="shrink-0 rounded-lg bg-orange-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50"
          >
            {updating
              ? "Marking..."
              : "Mark delivered"}
          </button>
        )}
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
  icon,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-base">
          {icon}
        </span>

        <span className="text-[11px] font-black uppercase text-slate-500">
          {label}
        </span>
      </div>

      <span className="text-lg font-black text-orange-600">
        {value}
      </span>
    </div>
  );
}

function Avatar({
  index,
  name,
  isFood,
}) {
  const avatars = [
    "👨🏻",
    "👩🏻",
    "👨🏽",
    "👩🏻‍🦱",
  ];

  return (
    <div
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${
        isFood
          ? "bg-orange-50"
          : "bg-[#f1eee8]"
      }`}
      title={name}
    >
      {isFood
        ? "🍽️"
        : avatars[
            index %
              avatars.length
          ]}
    </div>
  );
}

function CompactSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map(
        (section) => (
          <div
            key={
              section
            }
            className="overflow-hidden rounded-[18px] border border-orange-100 bg-white"
          >
            <div className="h-14 animate-pulse bg-slate-50" />

            {[0, 1].map(
              (item) => (
                <div
                  key={
                    item
                  }
                  className="flex animate-pulse gap-3 border-t border-orange-100 p-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />

                  <div className="flex-1">
                    <div className="h-3 w-32 rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-48 rounded bg-slate-100" />
                  </div>
                </div>
              )
            )}
          </div>
        )
      )}
    </div>
  );
}

function CompactEmptyState({
  sectionId,
  activeFilter,
  searchText,
}) {
  let message =
    activeFilter ===
      "pending"
      ? "Koi pending delivery nahi."
      : "Abhi koi delivery complete nahi.";

  if (
    searchText.trim()
  ) {
    message =
      "Search mein user ya item nahi mila.";
  }

  const icon =
    sectionId ===
    "food"
      ? "🍽️"
      : sectionId ===
        "lunch"
      ? "🍱"
      : "🌙";

  return (
    <div className="px-4 py-7 text-center">
      <div className="text-3xl">
        {icon}
      </div>

      <p className="mt-2 text-xs font-black text-slate-500">
        {message}
      </p>
    </div>
  );
}

function isAcceptedActiveSubscriber(
  subscriber
) {
  const status =
    normalizeText(
      subscriber?.status
    );

  if (
    status !==
    "active"
  ) {
    return false;
  }

  const endDate =
    getSubscriberEndDate(
      subscriber
    );

  if (!endDate) {
    return true;
  }

  const remainingDays =
    getRemainingDays(
      endDate
    );

  return (
    remainingDays ===
      null ||
    remainingDays > 0
  );
}

function getSubscriberMealSlots(
  subscriber
) {
  const mealText = [
    subscriber?.mealType,
    subscriber?.planType,
    subscriber?.planName,
    subscriber?.items?.[0]
      ?.mealType,
    subscriber?.items?.[0]
      ?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasLunch =
    mealText.includes(
      "lunch"
    );

  const hasDinner =
    mealText.includes(
      "dinner"
    );

  const hasBoth =
    [
      "both",
      "lunch_dinner",
      "lunch+dinner",
      "lunch + dinner",
      "lunch-dinner",
    ].some(
      (value) =>
        mealText.includes(
          value
        )
    );

  if (
    hasBoth ||
    (
      hasLunch &&
      hasDinner
    )
  ) {
    return [
      "lunch",
      "dinner",
    ];
  }

  if (hasDinner) {
    return [
      "dinner",
    ];
  }

  return [
    "lunch",
  ];
}

function getOrderCategory(
  order
) {
  if (
    String(
      order?.subscriptionId ||
        ""
    ).trim()
  ) {
    return "monthly";
  }

  const orderType =
    normalizeText(
      order?.orderType ||
        order?.type
    ).replace(
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
    return "individual";
  }

  if (
    Array.isArray(
      order?.items
    ) &&
    order.items.some(
      (item) =>
        item?.name ||
        item?.title ||
        item?.quantity
    )
  ) {
    return "individual";
  }

  return "unknown";
}

function isFoodOrderVisible(
  order,
  deliveryList
) {
  const orderStatus =
    normalizeText(
      order?.orderStatus ||
        order?.status
    );

  const deliveryStatus =
    normalizeText(
      order?.deliveryStatus
    );

  if (
    [
      "declined",
      "cancelled",
      "canceled",
    ].includes(
      orderStatus
    ) ||
    [
      "cancelled",
      "canceled",
    ].includes(
      deliveryStatus
    )
  ) {
    return false;
  }

  if (
    orderStatus ===
      "accepted" &&
    deliveryStatus !==
      "delivered"
  ) {
    return true;
  }

  if (
    orderStatus ===
      "delivered" ||
    deliveryStatus ===
      "delivered"
  ) {
    return isFoodOrderDeliveredToday(
      order,
      deliveryList
    );
  }

  return false;
}

function isFoodOrderDelivered(
  order,
  deliveryList
) {
  const orderDelivered =
    normalizeText(
      order?.deliveryStatus
    ) ===
      "delivered" ||
    normalizeText(
      order?.orderStatus
    ) ===
      "delivered";

  if (
    orderDelivered &&
    isFoodOrderDeliveredToday(
      order,
      deliveryList
    )
  ) {
    return true;
  }

  const delivery =
    findOrderDelivery(
      deliveryList,
      order?.id
    );

  return (
    delivery?.deliveryDate ===
      getTodayString() &&
    normalizeText(
      delivery?.status ||
        delivery?.deliveryStatus
    ) ===
      "delivered"
  );
}

function isFoodOrderDeliveredToday(
  order,
  deliveryList
) {
  if (
    isToday(
      order?.deliveredAt
    )
  ) {
    return true;
  }

  const delivery =
    findOrderDelivery(
      deliveryList,
      order?.id
    );

  return (
    delivery?.deliveryDate ===
      getTodayString() &&
    normalizeText(
      delivery?.status ||
        delivery?.deliveryStatus
    ) ===
      "delivered"
  );
}

function findOrderDelivery(
  deliveryList,
  orderId
) {
  const cleanOrderId =
    String(
      orderId ||
        ""
    ).trim();

  if (!cleanOrderId) {
    return null;
  }

  const matches =
    (Array.isArray(
      deliveryList
    )
      ? deliveryList
      : []
    )
      .filter(
        (delivery) =>
          String(
            delivery?.orderId ||
              ""
          ).trim() ===
          cleanOrderId
      )
      .sort(
        (
          firstDelivery,
          secondDelivery
        ) =>
          getTimeMs(
            secondDelivery.deliveredAt ||
              secondDelivery.updatedAt ||
              secondDelivery.createdAt
          ) -
          getTimeMs(
            firstDelivery.deliveredAt ||
              firstDelivery.updatedAt ||
              firstDelivery.createdAt
          )
      );

  return matches[0] ||
    null;
}

function getMonthlyTaskKey(
  subscriptionId,
  mealSlot
) {
  return `${String(
    subscriptionId ||
      ""
  ).trim()}__${mealSlot}`;
}

function getFoodTaskKey(
  orderId
) {
  return `food__${String(
    orderId ||
      ""
  ).trim()}`;
}

function normalizeMealSlot(
  value
) {
  const normalized =
    normalizeText(value);

  if (
    normalized.includes(
      "lunch"
    )
  ) {
    return "lunch";
  }

  if (
    normalized.includes(
      "dinner"
    )
  ) {
    return "dinner";
  }

  return "";
}

function getMealSlotLabel(
  mealSlot
) {
  return mealSlot ===
    "dinner"
    ? "Dinner"
    : "Lunch";
}

function getSectionTitle(
  sectionId
) {
  if (
    sectionId ===
    "food"
  ) {
    return "Food Orders";
  }

  return getMealSlotLabel(
    sectionId
  );
}

function getCustomerName(
  source
) {
  return String(
    source?.customerName ||
      source?.name ||
      source?.userName ||
      "Customer"
  ).trim();
}

function getCustomerPhone(
  source
) {
  return String(
    source?.customerPhone ||
      source?.phone ||
      source?.mobile ||
      ""
  ).trim();
}

function getCustomerAddress(
  source
) {
  return String(
    source?.customerAddress ||
      source?.address ||
      source?.deliveryAddress ||
      "Address unavailable"
  ).trim();
}

function getSubscriberEndDate(
  subscriber
) {
  return (
    subscriber?.endDate ||
    subscriber?.subscriptionEndDate ||
    subscriber?.expiryDate ||
    subscriber?.planEndDate ||
    null
  );
}

function getPlanLabel(
  subscriber
) {
  const type =
    String(
      subscriber?.mealType ||
        subscriber?.planType ||
        subscriber?.planName ||
        "monthly"
    )
      .trim()
      .toLowerCase();

  if (
    type ===
    "lunch"
  ) {
    return "Lunch Only";
  }

  if (
    type ===
    "dinner"
  ) {
    return "Dinner Only";
  }

  if (
    [
      "lunch_dinner",
      "lunch+dinner",
      "lunch + dinner",
      "lunch-dinner",
      "both",
    ].includes(
      type
    )
  ) {
    return "Lunch + Dinner";
  }

  return (
    subscriber?.planName ||
    "Monthly Plan"
  );
}

function getPreferenceLabel(
  subscriber
) {
  const preference =
    normalizeText(
      subscriber?.mealPreference ||
        subscriber?.preference ||
        subscriber?.foodType ||
        "veg"
    );

  return [
    "non-veg",
    "nonveg",
    "non_veg",
  ].includes(
    preference
  )
    ? "Non-Veg"
    : "Veg";
}

function getIndividualItems(
  order
) {
  const items =
    Array.isArray(
      order?.items
    )
      ? order.items
      : [];

  return items
    .map(
      (
        item,
        index
      ) => {
        const name =
          String(
            item?.name ||
              item?.title ||
              `Item ${
                index + 1
              }`
          ).trim();

        const price =
          safeNumber(
            item?.price
          );

        const quantity =
          Math.max(
            1,
            safeNumber(
              item?.quantity ||
                1
            )
          );

        return {
          id:
            String(
              item?.id ||
                `${name}-${index}`
            ),

          name,

          price,

          quantity,

          itemTotal:
            safeNumber(
              item?.itemTotal ??
                item?.total ??
                price *
                  quantity
            ),

          mealSlot:
            String(
              item?.mealSlot ||
                item?.mealType ||
                "both"
            ),
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

function getFoodItemsSummary(
  order
) {
  const items =
    getIndividualItems(
      order
    );

  if (
    items.length ===
    0
  ) {
    return "Food order";
  }

  const visibleItems =
    items
      .slice(
        0,
        2
      )
      .map(
        (item) =>
          `${item.name} x${item.quantity}`
      )
      .join(" • ");

  return items.length >
    2
    ? `${visibleItems} +${
        items.length -
        2
      }`
    : visibleItems;
}

function getTotalItemCount(
  order
) {
  const explicitCount =
    safeNumber(
      order?.totalItems
    );

  if (
    explicitCount > 0
  ) {
    return explicitCount;
  }

  return getIndividualItems(
    order
  ).reduce(
    (
      total,
      item
    ) =>
      total +
      item.quantity,
    0
  );
}

function getOrderAmount(
  order
) {
  const explicitAmount =
    safeNumber(
      order?.totalAmount ??
        order?.price ??
        order?.amount
    );

  if (
    explicitAmount > 0
  ) {
    return explicitAmount;
  }

  return getIndividualItems(
    order
  ).reduce(
    (
      total,
      item
    ) =>
      total +
      item.itemTotal,
    0
  );
}

function getFoodOrderMealSlot(
  order
) {
  const slots =
    new Set(
      getIndividualItems(
        order
      ).map((item) =>
        normalizeText(
          item.mealSlot
        )
      )
    );

  if (
    slots.size ===
    1
  ) {
    return (
      [...slots][0] ||
      "both"
    );
  }

  return "both";
}

function getRemainingDays(
  endDate
) {
  const end =
    toDate(
      endDate
    );

  if (!end) {
    return null;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  end.setHours(
    23,
    59,
    59,
    999
  );

  const millisecondsPerDay =
    1000 *
    60 *
    60 *
    24;

  const difference =
    Math.ceil(
      (
        end.getTime() -
        today.getTime()
      ) /
        millisecondsPerDay
    );

  return Math.max(
    difference,
    0
  );
}

function isToday(
  value
) {
  const date =
    toDate(
      value
    );

  if (!date) {
    return false;
  }

  const today =
    new Date();

  return (
    date.getDate() ===
      today.getDate() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getFullYear() ===
      today.getFullYear()
  );
}

function getTimeMs(
  value
) {
  const date =
    toDate(
      value
    );

  return date
    ? date.getTime()
    : 0;
}

function toDate(
  value
) {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    const convertedDate =
      value.toDate();

    return Number.isNaN(
      convertedDate.getTime()
    )
      ? null
      : convertedDate;
  }

  if (
    typeof value.seconds ===
    "number"
  ) {
    const convertedDate =
      new Date(
        value.seconds *
          1000
      );

    return Number.isNaN(
      convertedDate.getTime()
    )
      ? null
      : convertedDate;
  }

  const convertedDate =
    new Date(
      value
    );

  return Number.isNaN(
    convertedDate.getTime()
  )
    ? null
    : convertedDate;
}

function normalizeText(
  value
) {
  return String(
    value ||
      ""
  )
    .trim()
    .toLowerCase();
}

function safeNumber(
  value
) {
  const number =
    Number(
      value ||
        0
    );

  return Number.isNaN(
    number
  )
    ? 0
    : number;
}

function formatMoney(
  value
) {
  return safeNumber(
    value
  ).toLocaleString(
    "en-IN"
  );
}

function buildPhoneHref(
  phone
) {
  const digits =
    String(
      phone ||
        ""
    ).replace(
      /\D/g,
      ""
    );

  return digits
    ? `tel:${digits}`
    : "";
}

function buildWhatsappHref(
  phone,
  customerName,
  task
) {
  const digits =
    String(
      phone ||
        ""
    ).replace(
      /\D/g,
      ""
    );

  if (!digits) {
    return "";
  }

  const whatsappNumber =
    digits.length ===
    10
      ? `91${digits}`
      : digits;

  const message =
    task.type ===
    "food"
      ? `Hello ${customerName}, aapke food order delivery ke regarding contact kar rahe hain.`
      : `Hello ${customerName}, aaj ki ${getMealSlotLabel(
          task.mealSlot
        ).toLowerCase()} tiffin delivery ke regarding contact kar rahe hain.`;

  return (
    `https://wa.me/${whatsappNumber}` +
    `?text=${encodeURIComponent(
      message
    )}`
  );
}