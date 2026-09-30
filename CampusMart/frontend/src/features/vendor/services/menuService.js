import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";
import { COLLECTIONS } from "../firestorePaths";
import { DEFAULT_WEEKLY_MENU } from "../constants/menuConstants";

const PRIMARY_VENDOR_COLLECTION = "vendors";

const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const MEAL_TYPES = [
  "lunch",
  "dinner",
];

export async function getWeeklyMenu(vendorId) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  /*
   * Latest MenuManager vendors/{vendorId} document mein save karta hai.
   * Merge ke baad COLLECTIONS.VENDORS alag value ho jaaye, tab bhi
   * user page ko correct menu mil sake isliye dono locations check hongi.
   */
  const collectionNames = [
    PRIMARY_VENDOR_COLLECTION,
    COLLECTIONS?.VENDORS,
  ].filter(
    (value, index, array) =>
      Boolean(value) &&
      array.indexOf(value) === index
  );

  for (const collectionName of collectionNames) {
    const vendorRef = doc(
      db,
      collectionName,
      vendorId
    );

    const vendorSnapshot =
      await getDoc(vendorRef);

    if (!vendorSnapshot.exists()) {
      continue;
    }

    const vendorData =
      vendorSnapshot.data() || {};

    const storedMenu =
      extractWeeklyMenu(vendorData);

    if (storedMenu) {
      return normalizeWeeklyMenu(
        storedMenu
      );
    }
  }

  return normalizeWeeklyMenu(
    DEFAULT_WEEKLY_MENU
  );
}

export async function saveWeeklyMenu(
  vendorId,
  weeklyMenu
) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  const normalizedMenu =
    normalizeWeeklyMenu(
      weeklyMenu
    );

  const vendorRef = doc(
    db,
    PRIMARY_VENDOR_COLLECTION,
    vendorId
  );

  await setDoc(
    vendorRef,
    {
      weeklyMenu:
        normalizedMenu,

      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return normalizedMenu;
}

export async function saveMealMenu(
  vendorId,
  dayId,
  mealType,
  mealData,
  foodType
) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  const normalizedDayId =
    normalizeDayId(dayId);

  const normalizedMealType =
    normalizeMealType(mealType);

  if (
    !normalizedDayId ||
    !normalizedMealType
  ) {
    throw new Error(
      "Valid day and meal type are required"
    );
  }

  const currentMenu =
    await getWeeklyMenu(
      vendorId
    );

  const currentDay =
    currentMenu?.[
      normalizedDayId
    ] || {};

  const currentMealGroup =
    normalizeMealGroup(
      currentDay?.[
        normalizedMealType
      ]
    );

  let nextMealGroup;

  const requestedFoodType =
    normalizeFoodType(
      foodType ||
        mealData?.foodType
    );

  if (
    requestedFoodType &&
    (
      mealData?.foodType ||
      foodType
    )
  ) {
    nextMealGroup = {
      ...currentMealGroup,

      [requestedFoodType]:
        normalizeMeal(
          mealData
        ),
    };
  } else if (
    isSeparatedMealGroup(
      mealData
    )
  ) {
    nextMealGroup =
      normalizeMealGroup(
        mealData,
        currentMealGroup
      );
  } else {
    /*
     * Purane MenuManager ka flat meal format bhi support hoga.
     * User page ise Veg/Non-Veg mein automatically split kar lega.
     */
    nextMealGroup =
      normalizeLegacyMeal(
        mealData
      );
  }

  const updatedMenu = {
    ...currentMenu,

    [normalizedDayId]: {
      ...currentDay,

      [normalizedMealType]:
        nextMealGroup,
    },
  };

  return saveWeeklyMenu(
    vendorId,
    updatedMenu
  );
}

export function getTodayDayId() {
  /*
   * Tiffin business India mein hai, isliye device/server timezone ke
   * difference se wrong day select nahi hoga.
   */
  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    }
  )
    .format(new Date())
    .toLowerCase();
}

export function getTodayMenu(
  weeklyMenu
) {
  const normalizedMenu =
    normalizeWeeklyMenu(
      weeklyMenu
    );

  const todayDayId =
    getTodayDayId();

  return (
    normalizedMenu?.[
      todayDayId
    ] ||
    normalizeWeeklyMenu(
      DEFAULT_WEEKLY_MENU
    )?.[todayDayId]
  );
}

function extractWeeklyMenu(
  vendorData
) {
  const candidates = [
    vendorData?.weeklyMenu,
    vendorData?.menu?.weeklyMenu,
    vendorData?.weeklyMenus,
    vendorData?.menu,
  ];

  return (
    candidates.find(
      looksLikeWeeklyMenu
    ) ||
    null
  );
}

function looksLikeWeeklyMenu(
  value
) {
  if (!isObject(value)) {
    return false;
  }

  return WEEK_DAYS.some(
    (dayId) =>
      isObject(
        value?.[dayId]
      ) ||
      isObject(
        value?.[
          capitalize(dayId)
        ]
      )
  );
}

function normalizeWeeklyMenu(
  sourceMenu
) {
  const fallbackMenu =
    cloneValue(
      DEFAULT_WEEKLY_MENU ||
        {}
    );

  const source =
    isObject(sourceMenu)
      ? sourceMenu
      : {};

  const normalizedMenu = {};

  WEEK_DAYS.forEach(
    (dayId) => {
      const sourceDay =
        getDayValue(
          source,
          dayId
        );

      const fallbackDay =
        getDayValue(
          fallbackMenu,
          dayId
        );

      normalizedMenu[
        dayId
      ] = {};

      MEAL_TYPES.forEach(
        (mealType) => {
          normalizedMenu[
            dayId
          ][mealType] =
            normalizeMealGroup(
              sourceDay?.[
                mealType
              ],
              fallbackDay?.[
                mealType
              ]
            );
        }
      );
    }
  );

  return normalizedMenu;
}

function normalizeMealGroup(
  mealGroup,
  fallbackMealGroup
) {
  const source =
    isObject(mealGroup)
      ? mealGroup
      : {};

  const fallback =
    isObject(
      fallbackMealGroup
    )
      ? fallbackMealGroup
      : {};

  if (
    isSeparatedMealGroup(
      source
    )
  ) {
    return {
      veg:
        normalizeMeal(
          source.veg,
          fallback.veg
        ),

      nonVeg:
        normalizeMeal(
          source.nonVeg ||
            source.nonveg,
          fallback.nonVeg ||
            fallback.nonveg
        ),
    };
  }

  const hasLegacySource =
    Array.isArray(
      source.items
    ) ||
    source.price !==
      undefined ||
    source.available !==
      undefined;

  if (hasLegacySource) {
    return splitLegacyMeal(
      normalizeMeal(
        source
      )
    );
  }

  if (
    isSeparatedMealGroup(
      fallback
    )
  ) {
    return {
      veg:
        normalizeMeal(
          fallback.veg
        ),

      nonVeg:
        normalizeMeal(
          fallback.nonVeg ||
            fallback.nonveg
        ),
    };
  }

  return splitLegacyMeal(
    normalizeMeal(
      fallback
    )
  );
}

function normalizeLegacyMeal(
  meal
) {
  const normalizedMeal =
    normalizeMeal(
      meal
    );

  return {
    items:
      normalizedMeal.items,

    price:
      normalizedMeal.price,

    available:
      normalizedMeal.available,
  };
}

function splitLegacyMeal(
  meal
) {
  const vegItems = [];
  const nonVegItems = [];

  meal.items.forEach(
    (item) => {
      if (
        inferFoodTypeFromName(
          item
        ) === "nonVeg"
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
        meal.price,

      available:
        meal.available,
    },

    nonVeg: {
      items:
        nonVegItems,

      price:
        meal.price,

      available:
        meal.available,
    },
  };
}

function normalizeMeal(
  meal,
  fallbackMeal
) {
  const source =
    isObject(meal)
      ? meal
      : {};

  const fallback =
    isObject(
      fallbackMeal
    )
      ? fallbackMeal
      : {};

  const rawItems =
    Array.isArray(
      source.items
    )
      ? source.items
      : Array.isArray(
          fallback.items
        )
      ? fallback.items
      : [];

  const rawPrice =
    source.price !==
      undefined &&
    source.price !==
      null
      ? source.price
      : fallback.price;

  const rawAvailable =
    source.available !==
      undefined
      ? source.available
      : fallback.available;

  return {
    items:
      rawItems
        .map(
          normalizeMenuItem
        )
        .filter(Boolean),

    price:
      normalizePrice(
        rawPrice
      ),

    available:
      rawAvailable !==
      false,
  };
}

function normalizeMenuItem(
  item
) {
  if (
    typeof item ===
    "string" ||
    typeof item ===
    "number"
  ) {
    return String(
      item
    ).trim();
  }

  if (isObject(item)) {
    return String(
      item.name ||
        item.title ||
        item.label ||
        ""
    ).trim();
  }

  return "";
}

function normalizePrice(
  value
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value === ""
  ) {
    return "";
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

  return Number.isNaN(
    amount
  )
    ? value
    : amount;
}

function normalizeDayId(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  return WEEK_DAYS.includes(
    normalized
  )
    ? normalized
    : "";
}

function normalizeMealType(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  return MEAL_TYPES.includes(
    normalized
  )
    ? normalized
    : "";
}

function normalizeFoodType(
  value
) {
  const normalized =
    String(
      value || ""
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

  if (
    [
      "veg",
      "vegetarian",
    ].includes(
      normalized
    )
  ) {
    return "veg";
  }

  return "";
}

function inferFoodTypeFromName(
  value
) {
  const text =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

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

function isSeparatedMealGroup(
  value
) {
  return Boolean(
    isObject(value) &&
      (
        value.veg ||
        value.nonVeg ||
        value.nonveg
      )
  );
}

function getDayValue(
  menu,
  dayId
) {
  if (!isObject(menu)) {
    return {};
  }

  return (
    menu?.[dayId] ||
    menu?.[
      capitalize(dayId)
    ] ||
    {}
  );
}

function capitalize(
  value
) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function isObject(
  value
) {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

function cloneValue(
  value
) {
  try {
    return JSON.parse(
      JSON.stringify(
        value || {}
      )
    );
  } catch {
    return {};
  }
}