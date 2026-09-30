import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import {
  getWeeklyMenu,
} from "../../features/vendor/services/menuService";
import {
  DEFAULT_WEEKLY_MENU,
  MEAL_TYPES,
  WEEK_DAYS,
} from "../../features/vendor/constants/menuConstants";

const DEFAULT_DAY_ID = WEEK_DAYS?.[0]?.id || "monday";
const DEFAULT_MEAL_TYPE = MEAL_TYPES?.LUNCH || "lunch";

const PAGE_TABS = [
  { id: "weekly", label: "Weekly", icon: "📅" },
  { id: "individual", label: "Items", icon: "🍽️" },
  { id: "prices", label: "Prices", icon: "₹" },
];

const MEAL_TABS = [
  { id: MEAL_TYPES?.LUNCH || "lunch", title: "Lunch", emoji: "🍱" },
  { id: MEAL_TYPES?.DINNER || "dinner", title: "Dinner", emoji: "🌙" },
];

const FOOD_TYPE_TABS = [
  { id: "veg", title: "Veg", emoji: "🌱" },
  { id: "nonVeg", title: "Non-Veg", emoji: "🍗" },
];

const EMPTY_ITEM_FORM = {
  id: "",
  name: "",
  price: "",
  mealSlot: "both",
  foodType: "veg",
  available: true,
};

const EMPTY_MONTHLY_PRICES = {
  veg: {
    lunch: "1800",
    dinner: "1800",
    lunchDinner: "3200",
  },
  nonVeg: {
    lunch: "2200",
    dinner: "2200",
    lunchDinner: "3600",
  },
};

export default function MenuManager({ vendor }) {
  const [activePage, setActivePage] = useState("weekly");
  const [weeklyMenu, setWeeklyMenu] = useState(() =>
    normalizeWeeklyMenu(DEFAULT_WEEKLY_MENU)
  );
  const [savedWeeklyMenu, setSavedWeeklyMenu] = useState(() =>
    normalizeWeeklyMenu(DEFAULT_WEEKLY_MENU)
  );
  const [individualItems, setIndividualItems] = useState([]);

  const [
    monthlyPrices,
    setMonthlyPrices,
  ] = useState(EMPTY_MONTHLY_PRICES);

  const [
    savedMonthlyPrices,
    setSavedMonthlyPrices,
  ] = useState(EMPTY_MONTHLY_PRICES);

  const [activeDay, setActiveDay] = useState(DEFAULT_DAY_ID);
  const [activeMeal, setActiveMeal] = useState(DEFAULT_MEAL_TYPE);
  const [activeFoodType, setActiveFoodType] = useState("veg");
  const [itemSearch, setItemSearch] = useState("");
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const closeItemForm = useCallback(() => {
    setItemFormOpen(false);
    setItemForm(EMPTY_ITEM_FORM);
  }, []);

  const loadMenu = useCallback(
    async ({ silent = false } = {}) => {
      if (!vendor?.id) {
        setLoading(false);
        setError("Vendor ID nahi mila.");
        return;
      }

      try {
        silent ? setRefreshing(true) : setLoading(true);
        setError("");
        setSuccessMessage("");

        const [weeklyMenuData, vendorSnapshot] = await Promise.all([
          getWeeklyMenu(vendor.id),
          getDoc(doc(db, "vendors", vendor.id)),
        ]);

        const vendorData =
          vendorSnapshot.exists()
            ? vendorSnapshot.data()
            : {};

        const normalizedMenu =
          normalizeWeeklyMenu(
            vendorData.weeklyMenu ||
              weeklyMenuData ||
              DEFAULT_WEEKLY_MENU
          );

        setWeeklyMenu(normalizedMenu);
        setSavedWeeklyMenu(normalizedMenu);

        setIndividualItems(
          normalizeIndividualItems(
            vendorData.individualItems || vendorData.foodItems || []
          )
        );

        const normalizedMonthlyPrices =
          normalizeMonthlyPrices(
            vendorData
          );

        setMonthlyPrices(
          normalizedMonthlyPrices
        );

        setSavedMonthlyPrices(
          normalizedMonthlyPrices
        );
      } catch (loadError) {
        console.error("Menu load failed:", loadError);
        setError(loadError?.message || "Menu load nahi hua.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [vendor?.id]
  );

  useEffect(() => {
    setActivePage("weekly");
    setActiveDay(DEFAULT_DAY_ID);
    setActiveMeal(DEFAULT_MEAL_TYPE);
    setActiveFoodType("veg");
    setItemSearch("");
    closeItemForm();
    loadMenu();
  }, [loadMenu, closeItemForm]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = window.setTimeout(() => setSuccessMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const selectedDay = useMemo(
    () =>
      WEEK_DAYS.find((day) => day.id === activeDay) ||
      WEEK_DAYS[0] || {
        id: activeDay,
        label: activeDay,
        fullName: activeDay,
      },
    [activeDay]
  );

  const currentMeal = useMemo(
    () =>
      normalizeMeal(
        weeklyMenu?.[activeDay]?.[activeMeal]?.[
          activeFoodType
        ]
      ),
    [
      weeklyMenu,
      activeDay,
      activeMeal,
      activeFoodType,
    ]
  );

  const savedMeal = useMemo(
    () =>
      normalizeMeal(
        savedWeeklyMenu?.[activeDay]?.[activeMeal]?.[
          activeFoodType
        ]
      ),
    [
      savedWeeklyMenu,
      activeDay,
      activeMeal,
      activeFoodType,
    ]
  );

  const hasWeeklyChanges = useMemo(
    () =>
      JSON.stringify(cleanMealForComparison(currentMeal)) !==
      JSON.stringify(cleanMealForComparison(savedMeal)),
    [currentMeal, savedMeal]
  );

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    const sortedItems = [...individualItems].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    if (!query) return sortedItems;

    return sortedItems.filter((item) =>
      [
        item.name,
        getMealSlotLabel(item.mealSlot),
        getFoodTypeLabel(item.foodType),
        item.price,
        item.available ? "available" : "unavailable",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [individualItems, itemSearch]);

  const availableItemCount = useMemo(
    () => individualItems.filter((item) => item.available !== false).length,
    [individualItems]
  );

  const hasMonthlyPriceChanges =
    useMemo(
      () =>
        JSON.stringify(
          normalizeMonthlyPrices(
            monthlyPrices
          )
        ) !==
        JSON.stringify(
          normalizeMonthlyPrices(
            savedMonthlyPrices
          )
        ),
      [
        monthlyPrices,
        savedMonthlyPrices,
      ]
    );

  function updateCurrentMeal(updates) {
    setError("");
    setSuccessMessage("");

    setWeeklyMenu((previousMenu) => {
      const currentDay = previousMenu?.[activeDay] || {};
      const previousMealGroup = normalizeMealGroup(
        currentDay?.[activeMeal]
      );
      const previousMeal = normalizeMeal(
        previousMealGroup?.[activeFoodType]
      );

      return {
        ...previousMenu,
        [activeDay]: {
          ...currentDay,
          [activeMeal]: {
            ...previousMealGroup,
            [activeFoodType]: {
              ...previousMeal,
              ...updates,
            },
          },
        },
      };
    });
  }

  function addWeeklyItem() {
    updateCurrentMeal({ items: [...(currentMeal.items || []), ""] });
  }

  function updateWeeklyItem(index, value) {
    const items = [...(currentMeal.items || [])];
    items[index] = value;
    updateCurrentMeal({ items });
  }

  function removeWeeklyItem(index) {
    updateCurrentMeal({
      items: [...(currentMeal.items || [])].filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  }

  function resetWeeklyMeal() {
    if (!hasWeeklyChanges) return;
    if (!window.confirm("Unsaved weekly menu changes remove karne hain?")) {
      return;
    }
    updateCurrentMeal(savedMeal);
  }

  async function saveWeeklyMeal() {
    if (!vendor?.id || savingWeekly) return;

    const numericPrice = Number(currentMeal.price || 0);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError("Meal price valid number hona chahiye.");
      return;
    }

    try {
      setSavingWeekly(true);
      setError("");
      setSuccessMessage("");

      const cleanedMeal = {
        items: (currentMeal.items || [])
          .map((item) => String(item || "").trim())
          .filter(Boolean),
        price: numericPrice,
        available: currentMeal.available !== false,
      };

      const currentMealGroup = normalizeMealGroup(
        weeklyMenu?.[activeDay]?.[activeMeal]
      );

      const cleanedMealGroup = {
        ...currentMealGroup,
        [activeFoodType]: cleanedMeal,
      };

      const nextWeeklyMenu =
        normalizeWeeklyMenu({
          ...weeklyMenu,
          [activeDay]: {
            ...weeklyMenu[activeDay],
            [activeMeal]:
              cleanedMealGroup,
          },
        });

      await updateDoc(
        doc(
          db,
          "vendors",
          vendor.id
        ),
        {
          weeklyMenu:
            nextWeeklyMenu,
          updatedAt:
            serverTimestamp(),
        }
      );

      setWeeklyMenu(
        nextWeeklyMenu
      );

      setSavedWeeklyMenu(
        nextWeeklyMenu
      );
      setSuccessMessage(
        `${selectedDay?.label || "Day"} ${getFoodTypeLabel(
          activeFoodType
        )} ${getMealTitle(activeMeal)} menu saved.`
      );
    } catch (saveError) {
      console.error("Weekly menu save failed:", saveError);
      setError(saveError?.message || "Weekly menu save nahi hua.");
    } finally {
      setSavingWeekly(false);
    }
  }

  function toggleItemForm() {
    if (itemFormOpen) {
      closeItemForm();
      return;
    }

    setItemForm(EMPTY_ITEM_FORM);
    setItemFormOpen(true);
    setError("");
    setSuccessMessage("");
  }

  function openEditItemForm(item) {
    setItemForm({
      id: item.id,
      name: item.name,
      price: String(item.price ?? ""),
      mealSlot: item.mealSlot || "both",
      foodType: normalizeFoodType(item.foodType),
      available: item.available !== false,
    });
    setItemFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateItemForm(field, value) {
    setItemForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function persistIndividualItems(nextItems, message) {
    if (!vendor?.id || savingItems) return false;

    try {
      setSavingItems(true);
      setError("");
      setSuccessMessage("");

      const cleanedItems = normalizeIndividualItems(nextItems);

      await updateDoc(doc(db, "vendors", vendor.id), {
        individualItems: cleanedItems,
        updatedAt: serverTimestamp(),
      });

      setIndividualItems(cleanedItems);
      if (message) setSuccessMessage(message);
      return true;
    } catch (saveError) {
      console.error("Individual items save failed:", saveError);
      setError(saveError?.message || "Individual item save nahi hua.");
      return false;
    } finally {
      setSavingItems(false);
    }
  }

  async function saveItemForm() {
    const itemName = itemForm.name.trim();
    const itemPrice = Number(itemForm.price);

    if (!itemName) {
      setError("Item name required hai.");
      return;
    }

    if (Number.isNaN(itemPrice) || itemPrice < 0) {
      setError("Item price valid number hona chahiye.");
      return;
    }

    const duplicateItem = individualItems.find(
      (item) =>
        normalizeText(item.name) === normalizeText(itemName) &&
        item.id !== itemForm.id
    );

    if (duplicateItem) {
      setError("Ye item pehle se added hai.");
      return;
    }

    const editing = Boolean(itemForm.id);
    const nextItem = {
      id: itemForm.id || createItemId(),
      name: itemName,
      price: itemPrice,
      mealSlot: normalizeMealSlot(itemForm.mealSlot),
      foodType: normalizeFoodType(itemForm.foodType),
      available: itemForm.available !== false,
    };

    const nextItems = editing
      ? individualItems.map((item) =>
          item.id === itemForm.id ? nextItem : item
        )
      : [...individualItems, nextItem];

    const saved = await persistIndividualItems(
      nextItems,
      editing ? "Item updated." : "New item added."
    );

    if (saved) {
      closeItemForm();
      setActivePage("individual");
    }
  }

  async function toggleItemAvailability(item) {
    const nextItems = individualItems.map((currentItem) =>
      currentItem.id === item.id
        ? { ...currentItem, available: currentItem.available === false }
        : currentItem
    );

    await persistIndividualItems(
      nextItems,
      item.available === false
        ? "Item available ho gaya."
        : "Item unavailable ho gaya."
    );
  }

  async function removeIndividualItem(item) {
    if (!window.confirm(`${item.name} remove karna hai?`)) return;

    const nextItems = individualItems.filter(
      (currentItem) => currentItem.id !== item.id
    );

    const saved = await persistIndividualItems(nextItems, "Item removed.");
    if (saved && itemForm.id === item.id) closeItemForm();
  }

  async function updateIndividualItem(
    item,
    updates
  ) {
    if (
      !item?.id ||
      savingItems
    ) {
      return false;
    }

    const nextName =
      String(
        updates?.name ??
          item.name ??
          ""
      ).trim();

    const nextPrice =
      Number(
        updates?.price ??
          item.price ??
          0
      );

    if (!nextName) {
      setError(
        "Item name required hai."
      );
      return false;
    }

    if (
      Number.isNaN(
        nextPrice
      ) ||
      nextPrice < 0
    ) {
      setError(
        "Item price valid number hona chahiye."
      );
      return false;
    }

    const duplicateItem =
      individualItems.find(
        (currentItem) =>
          currentItem.id !==
            item.id &&
          normalizeText(
            currentItem.name
          ) ===
            normalizeText(
              nextName
            )
      );

    if (duplicateItem) {
      setError(
        "Ye item pehle se added hai."
      );
      return false;
    }

    const updatedItem = {
      ...item,

      name:
        nextName,

      price:
        nextPrice,

      mealSlot:
        normalizeMealSlot(
          updates?.mealSlot ??
            item.mealSlot
        ),

      foodType:
        normalizeFoodType(
          updates?.foodType ??
            item.foodType
        ),

      available:
        updates?.available !==
        false,
    };

    const nextItems =
      individualItems.map(
        (currentItem) =>
          currentItem.id ===
          item.id
            ? updatedItem
            : currentItem
      );

    return persistIndividualItems(
      nextItems,
      `${nextName} updated.`
    );
  }

  function updateMonthlyPrice(
    preference,
    plan,
    value
  ) {
    setMonthlyPrices(
      (currentPrices) => ({
        ...currentPrices,
        [preference]: {
          ...currentPrices[
            preference
          ],
          [plan]:
            value,
        },
      })
    );

    setError("");
    setSuccessMessage("");
  }

  function resetMonthlyPrices() {
    if (
      !hasMonthlyPriceChanges ||
      savingPrices
    ) {
      return;
    }

    setMonthlyPrices(
      savedMonthlyPrices
    );

    setError("");
    setSuccessMessage("");
  }

  async function saveMonthlyPrices() {
    if (
      !vendor?.id ||
      savingPrices
    ) {
      return;
    }

    const cleanedPrices =
      normalizeMonthlyPrices(
        monthlyPrices
      );

    const values = [
      cleanedPrices.veg.lunch,
      cleanedPrices.veg.dinner,
      cleanedPrices.veg
        .lunchDinner,
      cleanedPrices.nonVeg.lunch,
      cleanedPrices.nonVeg.dinner,
      cleanedPrices.nonVeg
        .lunchDinner,
    ];

    if (
      values.some(
        (value) =>
          Number.isNaN(
            Number(value)
          ) ||
          Number(value) < 0
      )
    ) {
      setError(
        "Sabhi 6 monthly prices valid number hone chahiye."
      );
      return;
    }

    try {
      setSavingPrices(true);
      setError("");
      setSuccessMessage("");

      const numericPrices = {
        veg: {
          lunch:
            Number(
              cleanedPrices.veg
                .lunch
            ),
          dinner:
            Number(
              cleanedPrices.veg
                .dinner
            ),
          lunchDinner:
            Number(
              cleanedPrices.veg
                .lunchDinner
            ),
        },
        nonVeg: {
          lunch:
            Number(
              cleanedPrices.nonVeg
                .lunch
            ),
          dinner:
            Number(
              cleanedPrices.nonVeg
                .dinner
            ),
          lunchDinner:
            Number(
              cleanedPrices.nonVeg
                .lunchDinner
            ),
        },
      };

      await updateDoc(
        doc(
          db,
          "vendors",
          vendor.id
        ),
        {
          monthlyPrices:
            numericPrices,

          // Purane cards/listing ke liye compatibility.
          vegPrice:
            numericPrices.veg
              .lunch,

          nonVegPrice:
            numericPrices.nonVeg
              .lunch,

          monthlyPrice:
            numericPrices.veg
              .lunchDinner,

          updatedAt:
            serverTimestamp(),
        }
      );

      const savedPrices =
        normalizeMonthlyPrices(
          numericPrices
        );

      setMonthlyPrices(
        savedPrices
      );

      setSavedMonthlyPrices(
        savedPrices
      );

      setSuccessMessage(
        "Veg aur Non-Veg ke sabhi 6 monthly prices updated."
      );
    } catch (saveError) {
      console.error(
        "Monthly prices save failed:",
        saveError
      );

      setError(
        saveError?.message ||
          "Monthly prices save nahi hui."
      );
    } finally {
      setSavingPrices(false);
    }
  }

  const vendorName =
    vendor?.businessName || vendor?.name || "Tiffin Vendor";

  if (loading) {
    return <MenuLoadingScreen vendorName={vendorName} />;
  }

  return (
    <div className="min-h-screen bg-[#fffaf5] px-4 pb-28 pt-5 text-slate-950">
      <header className="rounded-[24px] border border-orange-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-orange-600">
              {vendorName}
            </p>
            <h1 className="mt-1 text-2xl font-black">Menu Manager</h1>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Weekly meals aur individual order items manage karo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadMenu({ silent: true })}
            disabled={
              refreshing ||
              savingWeekly ||
              savingItems ||
              savingPrices
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-lg disabled:opacity-50"
            aria-label="Refresh menu"
          >
            {refreshing ? "⏳" : "↻"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-orange-50 p-1.5">
          {PAGE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePage(tab.id)}
              className={`rounded-xl px-3 py-3 text-xs font-black transition ${
                activePage === tab.id
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-600"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700">
          ✅ {successMessage}
        </div>
      )}

      {activePage === "individual" ? (
        <IndividualItemsPanel
          items={filteredItems}
          totalItems={individualItems.length}
          availableItems={availableItemCount}
          search={itemSearch}
          formOpen={itemFormOpen}
          form={itemForm}
          saving={savingItems}
          onSearch={setItemSearch}
          onToggleForm={toggleItemForm}
          onCloseForm={closeItemForm}
          onUpdateForm={updateItemForm}
          onSaveForm={saveItemForm}
          onUpdateItem={updateIndividualItem}
          onRemove={removeIndividualItem}
        />
      ) : activePage === "prices" ? (
        <PriceManagerPanel
          prices={monthlyPrices}
          hasChanges={hasMonthlyPriceChanges}
          saving={savingPrices}
          onUpdate={updateMonthlyPrice}
          onReset={resetMonthlyPrices}
          onSave={saveMonthlyPrices}
        />
      ) : (
        <WeeklyMenuPanel
          activeDay={activeDay}
          activeMeal={activeMeal}
          activeFoodType={activeFoodType}
          selectedDay={selectedDay}
          currentMeal={currentMeal}
          hasChanges={hasWeeklyChanges}
          saving={savingWeekly}
          onDayChange={setActiveDay}
          onMealChange={setActiveMeal}
          onFoodTypeChange={setActiveFoodType}
          onMealUpdate={updateCurrentMeal}
          onAddItem={addWeeklyItem}
          onUpdateItem={updateWeeklyItem}
          onRemoveItem={removeWeeklyItem}
          onReset={resetWeeklyMeal}
          onSave={saveWeeklyMeal}
        />
      )}
    </div>
  );
}

function IndividualItemsPanel({
  items,
  totalItems,
  availableItems,
  search,
  formOpen,
  form,
  saving,
  onSearch,
  onToggleForm,
  onCloseForm,
  onUpdateForm,
  onSaveForm,
  onUpdateItem,
  onRemove,
}) {
  return (
    <div className="mt-4 space-y-4">
      <section className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={
            onToggleForm
          }
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        >
          <div>
            <h2 className="text-lg font-black">
              + Add Item
            </h2>

            <p className="mt-0.5 text-xs font-bold text-slate-500">
              New item ka name, price aur meal time add karo.
            </p>
          </div>

          <span
            className={`grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-lg font-black text-orange-600 transition ${
              formOpen
                ? "rotate-180"
                : ""
            }`}
          >
            ⌄
          </span>
        </button>

        {formOpen && (
          <div className="border-t border-orange-100 bg-orange-50/50 p-4">
            <div className="grid gap-3">
              <label>
                <span className="mb-1.5 block text-xs font-black text-slate-600">
                  Item Name
                </span>

                <input
                  type="text"
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    onUpdateForm(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="Chicken Curry"
                  className="h-12 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-bold outline-none focus:border-orange-400"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <PriceInput
                  label="Price"
                  value={
                    form.price
                  }
                  onChange={(
                    value
                  ) =>
                    onUpdateForm(
                      "price",
                      value
                    )
                  }
                />

                <FoodTypeSelect
                  value={
                    form.foodType
                  }
                  onChange={(
                    value
                  ) =>
                    onUpdateForm(
                      "foodType",
                      value
                    )
                  }
                />

                <MealSlotSelect
                  value={
                    form.mealSlot
                  }
                  onChange={(
                    value
                  ) =>
                    onUpdateForm(
                      "mealSlot",
                      value
                    )
                  }
                />
              </div>

              <AvailabilityButton
                available={
                  form.available
                }
                onClick={() =>
                  onUpdateForm(
                    "available",
                    !form.available
                  )
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={
                    onCloseForm
                  }
                  disabled={
                    saving
                  }
                  className="h-12 rounded-xl border border-orange-200 bg-white text-sm font-black text-orange-600 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    onSaveForm
                  }
                  disabled={
                    saving
                  }
                  className="h-12 rounded-xl bg-orange-600 text-sm font-black text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-orange-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <SmallStat
            label="Total Items"
            value={
              totalItems
            }
          />

          <SmallStat
            label="Available"
            value={
              availableItems
            }
          />
        </div>

        <label className="relative mt-4 block">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">
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
            placeholder="Search added items..."
            className="h-12 w-full rounded-xl border border-orange-100 bg-orange-50/40 pl-10 pr-10 text-sm font-bold outline-none focus:border-orange-400"
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                onSearch("")
              }
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white text-xs font-black text-slate-600"
            >
              ✕
            </button>
          )}
        </label>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
        {items.length ===
        0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-5xl">
              🍽️
            </div>

            <h3 className="mt-3 text-lg font-black">
              No Items Found
            </h3>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {search
                ? "Search change karke try karo."
                : "Add Item se pehla individual order item add karo."}
            </p>
          </div>
        ) : (
          items.map(
            (item) => (
              <IndividualItemRow
                key={
                  item.id
                }
                item={
                  item
                }
                saving={
                  saving
                }
                onUpdate={(
                  updates
                ) =>
                  onUpdateItem(
                    item,
                    updates
                  )
                }
                onRemove={() =>
                  onRemove(
                    item
                  )
                }
              />
            )
          )
        )}
      </section>
    </div>
  );
}

function IndividualItemRow({
  item,
  saving,
  onUpdate,
  onRemove,
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(false);

  const [
    draft,
    setDraft,
  ] = useState(() => ({
    name:
      item.name,

    price:
      String(
        item.price ??
          ""
      ),

    mealSlot:
      item.mealSlot ||
      "both",

    foodType:
      normalizeFoodType(
        item.foodType
      ),

    available:
      item.available !==
      false,
  }));

  useEffect(() => {
    setDraft({
      name:
        item.name,

      price:
        String(
          item.price ??
            ""
        ),

      mealSlot:
        item.mealSlot ||
        "both",

      available:
        item.available !==
        false,
    });
  }, [
    item.id,
    item.name,
    item.price,
    item.mealSlot,
    item.available,
  ]);

  function updateDraft(
    field,
    value
  ) {
    setDraft(
      (currentDraft) => ({
        ...currentDraft,
        [field]:
          value,
      })
    );
  }

  function cancelEditing() {
    setDraft({
      name:
        item.name,

      price:
        String(
          item.price ??
            ""
        ),

      mealSlot:
        item.mealSlot ||
        "both",

      available:
        item.available !==
        false,
    });

    setExpanded(false);
  }

  async function saveChanges() {
    const saved =
      await onUpdate(
        draft
      );

    if (saved) {
      setExpanded(false);
    }
  }

  return (
    <article className="border-b border-orange-100 last:border-b-0">
      <button
        type="button"
        onClick={() =>
          setExpanded(
            (currentValue) =>
              !currentValue
          )
        }
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-orange-50/50"
        aria-expanded={
          expanded
        }
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl">
          🍲
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-black">
              {item.name}
            </h3>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${
                item.available
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {item.available
                ? "AVAILABLE"
                : "OFF"}
            </span>
          </div>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {getFoodTypeLabel(
              item.foodType
            )}{" "}
            •{" "}
            {getMealSlotLabel(
              item.mealSlot
            )}
          </p>
        </div>

        <p className="shrink-0 text-lg font-black text-orange-600">
          ₹
          {formatPriceNumber(
            item.price
          )}
        </p>

        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-lg font-black text-orange-600 transition-transform duration-200 ${
            expanded
              ? "rotate-90"
              : ""
          }`}
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
          <div className="grid gap-3 bg-orange-50/50 p-4">
            <label>
              <span className="mb-1.5 block text-xs font-black text-slate-600">
                Item Name
              </span>

              <input
                type="text"
                value={
                  draft.name
                }
                onChange={(
                  event
                ) =>
                  updateDraft(
                    "name",
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-bold outline-none focus:border-orange-400"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <PriceInput
                label="Item Price"
                value={
                  draft.price
                }
                onChange={(
                  value
                ) =>
                  updateDraft(
                    "price",
                    value
                  )
                }
              />

              <FoodTypeSelect
                value={
                  draft.foodType
                }
                onChange={(
                  value
                ) =>
                  updateDraft(
                    "foodType",
                    value
                  )
                }
              />

              <MealSlotSelect
                value={
                  draft.mealSlot
                }
                onChange={(
                  value
                ) =>
                  updateDraft(
                    "mealSlot",
                    value
                  )
                }
              />
            </div>

            <AvailabilityButton
              available={
                draft.available
              }
              onClick={() =>
                updateDraft(
                  "available",
                  !draft.available
                )
              }
            />

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={
                  cancelEditing
                }
                disabled={
                  saving
                }
                className="h-11 rounded-xl border border-orange-200 bg-white text-xs font-black text-orange-600 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  onRemove
                }
                disabled={
                  saving
                }
                className="h-11 rounded-xl bg-red-50 text-xs font-black text-red-600 disabled:opacity-50"
              >
                Delete
              </button>

              <button
                type="button"
                onClick={
                  saveChanges
                }
                disabled={
                  saving
                }
                className="h-11 rounded-xl bg-orange-600 text-xs font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Update"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-black text-slate-600">
        {label}
      </span>

      <div className="flex h-12 w-full min-w-0 items-center rounded-xl border border-orange-100 bg-white px-3">
        <span className="font-black text-slate-500">
          ₹
        </span>

        <input
          type="number"
          min="0"
          inputMode="numeric"
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
          placeholder="0"
          className="ml-2 w-full min-w-0 flex-1 bg-transparent text-sm font-black outline-none"
        />
      </div>
    </label>
  );
}

function FoodTypeSelect({
  value,
  onChange,
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-black text-slate-600">
        Food Type
      </span>

      <select
        value={
          normalizeFoodType(
            value
          )
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="h-12 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-black outline-none"
      >
        <option value="veg">
          Veg
        </option>

        <option value="nonVeg">
          Non-Veg
        </option>
      </select>
    </label>
  );
}

function MealSlotSelect({
  value,
  onChange,
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-black text-slate-600">
        Show In
      </span>

      <select
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
        className="h-12 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-black outline-none"
      >
        <option value="both">
          Lunch & Dinner
        </option>

        <option value="lunch">
          Lunch
        </option>

        <option value="dinner">
          Dinner
        </option>
      </select>
    </label>
  );
}

function AvailabilityButton({
  available,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex h-12 items-center justify-between rounded-xl border px-3 text-sm font-black ${
        available
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      <span>
        Availability
      </span>

      <span>
        {available
          ? "● Available"
          : "● Unavailable"}
      </span>
    </button>
  );
}

function PriceManagerPanel({
  prices,
  hasChanges,
  saving,
  onUpdate,
  onReset,
  onSave,
}) {
  return (
    <div className="mt-4">
      <section className="rounded-[24px] border border-orange-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
          Monthly Plan Prices
        </p>

        <h2 className="mt-1 text-xl font-black text-slate-950">
          Veg & Non-Veg Plans
        </h2>

        <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
          Lunch, Dinner aur Lunch + Dinner ke prices alag-alag set karo.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <MonthlyPriceGroupEditor
            title="Veg"
            emoji="🌱"
            prices={
              prices.veg
            }
            onUpdate={(
              plan,
              value
            ) =>
              onUpdate(
                "veg",
                plan,
                value
              )
            }
          />

          <MonthlyPriceGroupEditor
            title="Non-Veg"
            emoji="🍗"
            prices={
              prices.nonVeg
            }
            onUpdate={(
              plan,
              value
            ) =>
              onUpdate(
                "nonVeg",
                plan,
                value
              )
            }
          />
        </div>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-black text-blue-800">
            Total 6 Editable Prices
          </p>

          <p className="mt-1 text-[11px] font-bold leading-5 text-blue-700">
            Save karne ke baad user page aur subscription checkout dono par exact selected price show hogi.
          </p>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-[0.8fr_1.4fr] gap-3">
        <button
          type="button"
          onClick={
            onReset
          }
          disabled={
            !hasChanges ||
            saving
          }
          className="h-12 rounded-xl border border-orange-200 bg-white text-sm font-black text-orange-600 disabled:opacity-40"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={
            onSave
          }
          disabled={
            !hasChanges ||
            saving
          }
          className="h-12 rounded-xl bg-orange-600 text-sm font-black text-white disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save 6 Prices"}
        </button>
      </div>
    </div>
  );
}

function MonthlyPriceGroupEditor({
  title,
  emoji,
  prices,
  onUpdate,
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[20px] border border-orange-100 bg-orange-50/50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">
          {emoji}
        </span>

        <div>
          <h3 className="text-base font-black text-slate-950">
            {title}
          </h3>

          <p className="text-[10px] font-bold text-slate-500">
            30-day monthly subscription
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <PriceInput
          label="Lunch Only"
          value={
            prices.lunch
          }
          onChange={(
            value
          ) =>
            onUpdate(
              "lunch",
              value
            )
          }
        />

        <PriceInput
          label="Dinner Only"
          value={
            prices.dinner
          }
          onChange={(
            value
          ) =>
            onUpdate(
              "dinner",
              value
            )
          }
        />

        <PriceInput
          label="Lunch + Dinner"
          value={
            prices.lunchDinner
          }
          onChange={(
            value
          ) =>
            onUpdate(
              "lunchDinner",
              value
            )
          }
        />
      </div>
    </div>
  );
}

function WeeklyMenuPanel({
  activeDay,
  activeMeal,
  activeFoodType,
  selectedDay,
  currentMeal,
  hasChanges,
  saving,
  onDayChange,
  onMealChange,
  onFoodTypeChange,
  onMealUpdate,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReset,
  onSave,
}) {
  return (
    <div className="mt-4">
      <section className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {WEEK_DAYS.map((day) => (
          <button
            key={day.id}
            type="button"
            onClick={() => onDayChange(day.id)}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black ${
              activeDay === day.id
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-orange-100 bg-white text-slate-700"
            }`}
          >
            {day.label}
          </button>
        ))}
      </section>

      <section className="mt-3 grid grid-cols-2 gap-2">
        {MEAL_TABS.map((mealTab) => (
          <button
            key={mealTab.id}
            type="button"
            onClick={() => onMealChange(mealTab.id)}
            className={`rounded-2xl border p-3 text-left ${
              activeMeal === mealTab.id
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-orange-100 bg-white"
            }`}
          >
            <span className="text-2xl">{mealTab.emoji}</span>
            <span className="ml-2 text-sm font-black">{mealTab.title}</span>
          </button>
        ))}
      </section>

      <section className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
        {FOOD_TYPE_TABS.map(
          (foodTab) => (
            <button
              key={
                foodTab.id
              }
              type="button"
              onClick={() =>
                onFoodTypeChange(
                  foodTab.id
                )
              }
              className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                activeFoodType ===
                foodTab.id
                  ? foodTab.id ===
                    "veg"
                    ? "bg-green-600 text-white shadow"
                    : "bg-red-600 text-white shadow"
                  : "bg-orange-50 text-slate-700"
              }`}
            >
              {foodTab.emoji}{" "}
              {foodTab.title}
            </button>
          )
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
        <div className="bg-orange-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                {selectedDay?.fullName || selectedDay?.label}
              </p>
              <h2 className="mt-1 text-xl font-black">
                {getFoodTypeEmoji(activeFoodType)}{" "}
                {getFoodTypeLabel(activeFoodType)}{" "}
                {getMealTitle(activeMeal)}
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                onMealUpdate({ available: !currentMeal.available })
              }
              className={`rounded-full px-3 py-2 text-[10px] font-black ${
                currentMeal.available
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {currentMeal.available ? "● Available" : "● Unavailable"}
            </button>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              Full Meal Price
            </span>
            <div className="flex h-12 items-center rounded-xl bg-white px-3">
              <span className="font-black text-slate-500">₹</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={currentMeal.price}
                onChange={(event) =>
                  onMealUpdate({ price: event.target.value })
                }
                className="ml-2 min-w-0 flex-1 bg-transparent text-base font-black outline-none"
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-orange-100 px-4 py-3">
          <div>
            <h3 className="text-base font-black">Meal Items</h3>
            <p className="text-xs font-bold text-slate-500">
              Monthly/full-meal menu items.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddItem}
            className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-600"
          >
            + Add
          </button>
        </div>

        {(currentMeal.items || []).length === 0 ? (
          <div className="border-t border-orange-100 px-5 py-10 text-center">
            <p className="text-sm font-black text-slate-500">No meal items</p>
          </div>
        ) : (
          <div className="border-t border-orange-100">
            {currentMeal.items.map((item, index) => (
              <WeeklyItemRow
                key={`weekly-${index}`}
                index={index}
                value={item}
                onChange={(value) => onUpdateItem(index, value)}
                onRemove={() => onRemoveItem(index)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-4 grid grid-cols-[0.8fr_1.4fr] gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={!hasChanges || saving}
          className="h-12 rounded-xl border border-orange-200 bg-white text-sm font-black text-orange-600 disabled:opacity-40"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={!hasChanges || saving}
          className="h-12 rounded-xl bg-orange-600 text-sm font-black text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Weekly Menu"}
        </button>
      </div>
    </div>
  );
}

function WeeklyItemRow({ index, value, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 border-b border-orange-100 px-4 py-3 last:border-b-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-50 text-xs font-black text-orange-600">
        {index + 1}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Menu item"
        className="h-10 min-w-0 flex-1 rounded-xl bg-slate-50 px-3 text-sm font-bold outline-none"
      />

      <button
        type="button"
        onClick={onRemove}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 font-black text-red-500"
      >
        ×
      </button>
    </div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-xl bg-orange-50 p-3 text-center">
      <p className="text-xl font-black text-orange-600">{value}</p>
      <p className="mt-0.5 text-[10px] font-black uppercase text-slate-500">
        {label}
      </p>
    </div>
  );
}

function MenuLoadingScreen({ vendorName }) {
  return (
    <div className="min-h-screen bg-[#fffaf5] px-4 pb-28 pt-5">
      <div className="animate-pulse rounded-[24px] border border-orange-100 bg-white p-5">
        <div className="h-3 w-32 rounded bg-slate-100" />
        <div className="mt-3 h-8 w-48 rounded bg-slate-100" />
        <div className="mt-4 h-12 rounded-xl bg-orange-50" />
      </div>

      <div className="mt-4 h-80 animate-pulse rounded-[24px] bg-white" />

      <p className="mt-4 text-center text-sm font-black text-slate-500">
        {vendorName} menu load ho raha hai...
      </p>
    </div>
  );
}

function normalizeWeeklyMenu(sourceMenu) {
  const baseMenu = deepClone(
    DEFAULT_WEEKLY_MENU ||
      {}
  );

  const source =
    sourceMenu &&
    typeof sourceMenu ===
      "object"
      ? sourceMenu
      : {};

  const normalized = {};

  WEEK_DAYS.forEach(
    (day) => {
      const baseDay =
        baseMenu?.[day.id] ||
        {};

      const sourceDay =
        source?.[day.id] ||
        {};

      normalized[day.id] = {};

      MEAL_TABS.forEach(
        (mealTab) => {
          const sourceMeal =
            sourceDay?.[
              mealTab.id
            ];

          const baseMeal =
            baseDay?.[
              mealTab.id
            ];

          normalized[day.id][
            mealTab.id
          ] = normalizeMealGroup(
            sourceMeal,
            baseMeal
          );
        }
      );
    }
  );

  return normalized;
}

function normalizeMealGroup(
  mealGroup,
  fallbackMeal
) {
  const source =
    mealGroup &&
    typeof mealGroup ===
      "object"
      ? mealGroup
      : {};

  const fallback =
    fallbackMeal &&
    typeof fallbackMeal ===
      "object"
      ? fallbackMeal
      : {};

  const hasSeparatedFood =
    Boolean(
      source.veg ||
      source.nonVeg ||
      source.nonveg
    );

  if (hasSeparatedFood) {
    return {
      veg:
        normalizeMeal(
          source.veg ||
          fallback.veg
        ),

      nonVeg:
        normalizeMeal(
          source.nonVeg ||
          source.nonveg ||
          fallback.nonVeg ||
          fallback.nonveg
        ),
    };
  }

  const legacyMeal =
    normalizeMeal({
      ...normalizeMeal(
        fallback
      ),
      ...normalizeMeal(
        source
      ),
    });

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
      items:
        vegItems,
      price:
        legacyMeal.price,
      available:
        legacyMeal.available,
    },

    nonVeg: {
      items:
        nonVegItems,
      price:
        legacyMeal.price,
      available:
        legacyMeal.available,
    },
  };
}

function normalizeMeal(meal) {
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
      source.price ===
        undefined ||
      source.price ===
        null
        ? ""
        : source.price,

    available:
      source.available !==
      false,
  };
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
              createStableLegacyId(
                name,
                index
              ),

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
              createStableLegacyId(
                name,
                index
              )
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


function normalizeMonthlyPrices(
  source = {}
) {
  const direct =
    source?.monthlyPrices ||
    source ||
    {};

  const oldNonVegExtra =
    firstValidMonthlyPrice(
      source?.nonVegMonthlyExtra,
      source?.nonVegSurcharge,
      source?.subscriptionPrices
        ?.nonVegExtra,
      400
    );

  const vegLunch =
    firstValidMonthlyPrice(
      direct?.veg?.lunch,
      source?.subscriptionPrices
        ?.veg?.lunch,
      source?.monthlyPlanPrices
        ?.veg?.lunch,
      source?.subscriptionPrices
        ?.lunch,
      source?.monthlyPlanPrices
        ?.lunch,
      source?.lunchMonthlyPrice,
      source?.vegPrice,
      1800
    );

  const vegDinner =
    firstValidMonthlyPrice(
      direct?.veg?.dinner,
      source?.subscriptionPrices
        ?.veg?.dinner,
      source?.monthlyPlanPrices
        ?.veg?.dinner,
      source?.subscriptionPrices
        ?.dinner,
      source?.monthlyPlanPrices
        ?.dinner,
      source?.dinnerMonthlyPrice,
      source?.vegPrice,
      1800
    );

  const vegLunchDinner =
    firstValidMonthlyPrice(
      direct?.veg?.lunchDinner,
      direct?.veg?.both,
      source?.subscriptionPrices
        ?.veg?.lunchDinner,
      source?.monthlyPlanPrices
        ?.veg?.lunchDinner,
      source?.subscriptionPrices
        ?.lunchDinner,
      source?.subscriptionPrices
        ?.both,
      source?.monthlyPlanPrices
        ?.lunchDinner,
      source?.monthlyPlanPrices
        ?.both,
      source?.bothMonthlyPrice,
      source?.lunchDinnerMonthlyPrice,
      3200
    );

  return {
    veg: {
      lunch:
        normalizePriceField(
          vegLunch
        ),
      dinner:
        normalizePriceField(
          vegDinner
        ),
      lunchDinner:
        normalizePriceField(
          vegLunchDinner
        ),
    },
    nonVeg: {
      lunch:
        normalizePriceField(
          firstValidMonthlyPrice(
            direct?.nonVeg?.lunch,
            direct?.nonveg?.lunch,
            source?.subscriptionPrices
              ?.nonVeg?.lunch,
            source?.monthlyPlanPrices
              ?.nonVeg?.lunch,
            source?.nonVegLunchMonthlyPrice,
            Number(vegLunch) +
              Number(oldNonVegExtra)
          )
        ),
      dinner:
        normalizePriceField(
          firstValidMonthlyPrice(
            direct?.nonVeg?.dinner,
            direct?.nonveg?.dinner,
            source?.subscriptionPrices
              ?.nonVeg?.dinner,
            source?.monthlyPlanPrices
              ?.nonVeg?.dinner,
            source?.nonVegDinnerMonthlyPrice,
            Number(vegDinner) +
              Number(oldNonVegExtra)
          )
        ),
      lunchDinner:
        normalizePriceField(
          firstValidMonthlyPrice(
            direct?.nonVeg
              ?.lunchDinner,
            direct?.nonVeg?.both,
            direct?.nonveg
              ?.lunchDinner,
            source?.subscriptionPrices
              ?.nonVeg
              ?.lunchDinner,
            source?.monthlyPlanPrices
              ?.nonVeg
              ?.lunchDinner,
            source?.nonVegBothMonthlyPrice,
            source?.nonVegLunchDinnerMonthlyPrice,
            Number(vegLunchDinner) +
              Number(oldNonVegExtra)
          )
        ),
    },
  };
}

function firstValidMonthlyPrice(
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

function normalizePriceField(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  const number =
    Number(
      String(
        value
      )
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

  return Number.isNaN(
    number
  )
    ? ""
    : String(
        Math.max(
          0,
          number
        )
      );
}

function cleanMealForComparison(meal) {
  return {
    items: (meal?.items || []).map((item) => String(item || "")),
    price: Number(meal?.price || 0),
    available: meal?.available !== false,
  };
}

function normalizeMealSlot(value) {
  const normalized = normalizeText(value);
  if (normalized === "lunch") return "lunch";
  if (normalized === "dinner") return "dinner";
  return "both";
}

function normalizeFoodType(
  value
) {
  const normalized =
    normalizeText(
      value
    )
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
    normalizeText(
      value
    );

  const nonVegKeywords = [
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
    "biryani chicken",
    "biryani mutton",
  ];

  return nonVegKeywords.some(
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

function getFoodTypeEmoji(
  foodType
) {
  return normalizeFoodType(
    foodType
  ) ===
    "nonVeg"
    ? "🍗"
    : "🌱";
}

function getMealSlotLabel(mealSlot) {
  if (mealSlot === "lunch") return "Lunch";
  if (mealSlot === "dinner") return "Dinner";
  return "Lunch & Dinner";
}

function getMealTitle(mealType) {
  return mealType === (MEAL_TYPES?.DINNER || "dinner")
    ? "Dinner"
    : "Lunch";
}

function getMealEmoji(mealType) {
  return mealType === (MEAL_TYPES?.DINNER || "dinner") ? "🌙" : "🍱";
}

function formatPriceNumber(value) {
  const amount = Number(value || 0);
  return Number.isNaN(amount) ? "0" : amount.toLocaleString("en-IN");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function createItemId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createStableLegacyId(name, index) {
  const slug =
    normalizeText(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";

  return `${slug}-${index}`;
}

function deepClone(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch {
    return {};
  }
}