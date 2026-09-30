import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { COLLECTIONS } from "../firestorePaths";
import { DEFAULT_WEEKLY_MENU } from "../constants/menuConstants";

export async function getWeeklyMenu(vendorId) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  const ref = doc(db, COLLECTIONS.VENDORS, vendorId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return DEFAULT_WEEKLY_MENU;
  }

  const data = snap.data();

  return data.weeklyMenu || DEFAULT_WEEKLY_MENU;
}

export async function saveWeeklyMenu(vendorId, weeklyMenu) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  const ref = doc(db, COLLECTIONS.VENDORS, vendorId);

  await setDoc(
    ref,
    {
      weeklyMenu,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return true;
}

export async function saveMealMenu(vendorId, dayId, mealType, mealData) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  if (!dayId || !mealType) {
    throw new Error("Day and meal type are required");
  }

  const currentMenu = await getWeeklyMenu(vendorId);

  const updatedMenu = {
    ...currentMenu,
    [dayId]: {
      ...currentMenu[dayId],
      [mealType]: {
        items: mealData.items || [],
        price: Number(mealData.price || 0),
        available: mealData.available ?? true,
      },
    },
  };

  await saveWeeklyMenu(vendorId, updatedMenu);

  return updatedMenu;
}

export function getTodayDayId() {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return days[new Date().getDay()];
}

export function getTodayMenu(weeklyMenu) {
  const today = getTodayDayId();
  return weeklyMenu?.[today] || DEFAULT_WEEKLY_MENU[today];
}