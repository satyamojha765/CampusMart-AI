export const WEEK_DAYS = [
  { id: "monday", label: "Mon", fullName: "Monday" },
  { id: "tuesday", label: "Tue", fullName: "Tuesday" },
  { id: "wednesday", label: "Wed", fullName: "Wednesday" },
  { id: "thursday", label: "Thu", fullName: "Thursday" },
  { id: "friday", label: "Fri", fullName: "Friday" },
  { id: "saturday", label: "Sat", fullName: "Saturday" },
  { id: "sunday", label: "Sun", fullName: "Sunday" },
];

export const MEAL_TYPES = {
  LUNCH: "lunch",
  DINNER: "dinner",
};

export const DEFAULT_MEAL = {
  items: [],
  price: "",
  available: true,
};

export const DEFAULT_WEEKLY_MENU = {
  monday: {
    lunch: {
      items: ["Rice", "Dal", "Mixed Veg", "Salad"],
      price: 70,
      available: true,
    },
    dinner: {
      items: ["Roti", "Paneer Curry", "Dal Fry", "Salad"],
      price: 70,
      available: true,
    },
  },
  tuesday: {
    lunch: {
      items: ["Rice", "Dal", "Aloo Bhaja", "Mixed Veg"],
      price: 70,
      available: true,
    },
    dinner: {
      items: ["Roti", "Chana Masala", "Salad"],
      price: 70,
      available: true,
    },
  },
  wednesday: {
    lunch: {
      items: ["Rice", "Dal", "Soya Curry", "Salad"],
      price: 70,
      available: true,
    },
    dinner: {
      items: ["Roti", "Egg Curry", "Dal"],
      price: 90,
      available: true,
    },
  },
  thursday: {
    lunch: {
      items: ["Rice", "Dal", "Mixed Veg", "Papad"],
      price: 70,
      available: true,
    },
    dinner: {
      items: ["Roti", "Paneer Masala", "Salad"],
      price: 80,
      available: true,
    },
  },
  friday: {
    lunch: {
      items: ["Rice", "Dal", "Fish Curry", "Salad"],
      price: 110,
      available: true,
    },
    dinner: {
      items: ["Roti", "Chicken Curry", "Salad"],
      price: 120,
      available: true,
    },
  },
  saturday: {
    lunch: {
      items: ["Rice", "Dal", "Mixed Veg", "Salad"],
      price: 70,
      available: true,
    },
    dinner: {
      items: ["Roti", "Aloo Dum", "Dal Fry"],
      price: 70,
      available: true,
    },
  },
  sunday: {
    lunch: {
      items: ["Rice", "Chicken Curry", "Salad"],
      price: 120,
      available: true,
    },
    dinner: {
      items: ["Roti", "Paneer Curry", "Dal"],
      price: 80,
      available: true,
    },
  },
};