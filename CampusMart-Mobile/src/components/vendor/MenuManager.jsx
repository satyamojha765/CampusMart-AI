import { useEffect, useMemo, useState } from "react";
import {
  getWeeklyMenu,
  saveMealMenu,
} from "../../features/vendor/services/menuService";
import {
  DEFAULT_WEEKLY_MENU,
  MEAL_TYPES,
  WEEK_DAYS,
} from "../../features/vendor/constants/menuConstants";

export default function MenuManager({ vendor }) {
  const [weeklyMenu, setWeeklyMenu] = useState(DEFAULT_WEEKLY_MENU);
  const [activeDay, setActiveDay] = useState("monday");
  const [activeMeal, setActiveMeal] = useState(MEAL_TYPES.LUNCH);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadMenu() {
      if (!vendor?.id) return;

      try {
        setLoading(true);
        const menu = await getWeeklyMenu(vendor.id);

        if (mounted) {
          setWeeklyMenu(menu || DEFAULT_WEEKLY_MENU);
        }
      } catch (error) {
        console.error("Failed to load weekly menu:", error);
        alert(error.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMenu();

    return () => {
      mounted = false;
    };
  }, [vendor?.id]);

  const selectedDay = useMemo(() => {
    return WEEK_DAYS.find((day) => day.id === activeDay);
  }, [activeDay]);

  const currentMeal = useMemo(() => {
    return (
      weeklyMenu?.[activeDay]?.[activeMeal] || {
        items: [],
        price: "",
        available: true,
      }
    );
  }, [weeklyMenu, activeDay, activeMeal]);

  function updateCurrentMeal(updates) {
    setWeeklyMenu((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [activeMeal]: {
          ...prev[activeDay]?.[activeMeal],
          ...updates,
        },
      },
    }));
  }

  function addItem() {
    updateCurrentMeal({
      items: [...(currentMeal.items || []), ""],
    });
  }

  function updateItem(index, value) {
    const items = [...(currentMeal.items || [])];
    items[index] = value;

    updateCurrentMeal({ items });
  }

  function removeItem(index) {
    const items = [...(currentMeal.items || [])].filter((_, i) => i !== index);
    updateCurrentMeal({ items });
  }

  async function handleSave() {
    if (!vendor?.id) return;

    try {
      setSaving(true);

      const cleanedMeal = {
        items: (currentMeal.items || []).map((item) => item.trim()).filter(Boolean),
        price: Number(currentMeal.price || 0),
        available: currentMeal.available ?? true,
      };

      const updatedMenu = await saveMealMenu(
        vendor.id,
        activeDay,
        activeMeal,
        cleanedMeal
      );

      setWeeklyMenu(updatedMenu);
      alert("Menu saved successfully.");
    } catch (error) {
      console.error("Failed to save menu:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-5 pb-24 pt-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-[#111111]">
            Weekly Menu
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Manage lunch and dinner menu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-[14px] bg-orange-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? "Saving" : "Save"}
        </button>
      </header>

      <section className="mt-7 flex gap-2 overflow-x-auto pb-2">
        {WEEK_DAYS.map((day) => (
          <button
            key={day.id}
            type="button"
            onClick={() => setActiveDay(day.id)}
            className={`shrink-0 rounded-[16px] px-5 py-3 text-sm font-black transition ${
              activeDay === day.id
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                : "border border-orange-100 bg-white text-slate-700"
            }`}
          >
            {day.label}
          </button>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <MealTab
          title="Lunch"
          emoji="🍱"
          active={activeMeal === MEAL_TYPES.LUNCH}
          onClick={() => setActiveMeal(MEAL_TYPES.LUNCH)}
        />

        <MealTab
          title="Dinner"
          emoji="🌙"
          active={activeMeal === MEAL_TYPES.DINNER}
          onClick={() => setActiveMeal(MEAL_TYPES.DINNER)}
        />
      </section>

      {loading ? (
        <div className="mt-6 rounded-[24px] bg-white p-8 text-center font-black shadow-sm">
          Loading menu...
        </div>
      ) : (
        <>
          <section className="mt-6 rounded-[28px] border border-orange-100 bg-orange-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-600">
                  {selectedDay?.fullName}
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#111111]">
                  {activeMeal === MEAL_TYPES.LUNCH ? "🍱 Lunch" : "🌙 Dinner"}
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  Add items included in this meal.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateCurrentMeal({
                    available: !currentMeal.available,
                  })
                }
                className={`relative h-8 w-14 rounded-full transition ${
                  currentMeal.available ? "bg-green-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                    currentMeal.available ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="mt-5 rounded-[22px] bg-white p-4">
              <label className="mb-2 block text-xs font-black text-slate-500">
                Meal Price
              </label>

              <div className="flex items-center rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-xl font-black text-slate-500">₹</span>
                <input
                  type="number"
                  value={currentMeal.price}
                  onChange={(e) =>
                    updateCurrentMeal({
                      price: e.target.value,
                    })
                  }
                  placeholder="70"
                  className="ml-2 w-full bg-transparent text-xl font-black outline-none"
                />
              </div>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-[24px] border border-[#f1f1f1] bg-white">
            <div className="border-b border-[#f1f1f1] px-4 py-4">
              <h3 className="text-lg font-black text-[#111111]">Meal Items</h3>
            </div>

            {(currentMeal.items || []).length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-5xl">🍽️</div>
                <h3 className="mt-3 text-lg font-black">No Items</h3>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Add items like Rice, Dal, Roti, Curry.
                </p>
              </div>
            ) : (
              currentMeal.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-[#f1f1f1] px-4 py-3 last:border-b-0"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-50 text-xl">
                    {index + 1}
                  </div>

                  <input
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                    placeholder="Menu item"
                    className="min-w-0 flex-1 bg-transparent text-[16px] font-bold text-[#111111] outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-xl font-black text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </section>

          <button
            type="button"
            onClick={addItem}
            className="mt-5 h-[56px] w-full rounded-[16px] border border-orange-400 bg-white text-[16px] font-black text-orange-600"
          >
            + Add Item
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 h-[58px] w-full rounded-[16px] bg-orange-600 text-[16px] font-black text-white shadow-lg shadow-orange-600/20 disabled:opacity-60"
          >
            {saving ? "Saving Menu..." : "Save Menu"}
          </button>
        </>
      )}
    </div>
  );
}

function MealTab({ title, emoji, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] p-5 text-left transition ${
        active
          ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
          : "border border-orange-100 bg-white text-[#111111]"
      }`}
    >
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 text-lg font-black">{title}</h3>
      <p className={`mt-1 text-xs font-bold ${active ? "text-white/80" : "text-slate-500"}`}>
        Edit {title.toLowerCase()} menu
      </p>
    </button>
  );
}