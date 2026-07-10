export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  keywords: string[];
}

// AI-generated category list with keyword patterns for auto-detection
export const CATEGORIES: Category[] = [
  {
    id: "food-dining",
    name: "Food & Dining",
    emoji: "🍔",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    keywords: [
      "restaurant", "food", "lunch", "dinner", "breakfast", "coffee", "cafe",
      "pizza", "burger", "sushi", "starbucks", "mcdonalds", "subway", "chipotle",
      "doordash", "ubereats", "grubhub", "meal", "snack", "bakery", "deli",
      "taco", "noodle", "ramen", "thai", "chinese", "indian", "mexican",
      "brunch", "takeout", "delivery", "eat", "drink", "bar", "pub",
      "jollibee", "kfc", "wendys", "popeyes", "chick-fil-a", "panera",
    ],
  },
  {
    id: "transportation",
    name: "Transportation",
    emoji: "🚗",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    keywords: [
      "uber", "lyft", "taxi", "gas", "fuel", "parking", "toll", "car",
      "bus", "train", "metro", "subway", "flight", "airline", "airfare",
      "grab", "bolt", "diesel", "petrol", "oil change", "mechanic",
      "tire", "registration", "dmv", "insurance", "auto", "vehicle",
      "commute", "transit", "ferry", "bike", "scooter", "rental car",
    ],
  },
  {
    id: "shopping",
    name: "Shopping",
    emoji: "🛍️",
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    keywords: [
      "amazon", "walmart", "target", "costco", "clothes", "shoes", "shirt",
      "pants", "dress", "jacket", "hat", "accessory", "jewelry", "watch",
      "electronics", "gadget", "phone case", "headphones", "mall", "store",
      "shop", "buy", "purchase", "order", "online", "ebay", "etsy",
      "shein", "zara", "h&m", "nike", "adidas", "uniqlo", "gift",
    ],
  },
  {
    id: "groceries",
    name: "Groceries",
    emoji: "🥬",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    keywords: [
      "grocery", "groceries", "supermarket", "whole foods", "trader joe",
      "kroger", "safeway", "aldi", "lidl", "produce", "meat", "vegetables",
      "fruits", "milk", "bread", "eggs", "cheese", "organic", "market",
      "costco food", "sam's club", "pantry", "ingredients", "cooking",
    ],
  },
  {
    id: "bills-utilities",
    name: "Bills & Utilities",
    emoji: "💡",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    keywords: [
      "electric", "electricity", "water", "gas bill", "internet", "wifi",
      "phone bill", "mobile", "rent", "mortgage", "insurance", "cable",
      "streaming", "netflix", "spotify", "hulu", "disney", "hbo",
      "subscription", "utility", "utilities", "bill", "payment", "dues",
      "verizon", "at&t", "t-mobile", "comcast", "pg&e",
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    emoji: "🎬",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    keywords: [
      "movie", "cinema", "theater", "concert", "show", "ticket", "game",
      "gaming", "steam", "playstation", "xbox", "nintendo", "arcade",
      "bowling", "karaoke", "museum", "zoo", "park", "amusement",
      "festival", "event", "sport", "gym membership", "fitness class",
    ],
  },
  {
    id: "health-medical",
    name: "Health & Medical",
    emoji: "🏥",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    keywords: [
      "doctor", "hospital", "pharmacy", "medicine", "prescription", "dental",
      "dentist", "eye", "optometrist", "therapy", "counseling", "health",
      "medical", "clinic", "urgent care", "lab", "test", "vitamin",
      "supplement", "cvs", "walgreens", "insurance copay", "specialist",
    ],
  },
  {
    id: "education",
    name: "Education",
    emoji: "📚",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    keywords: [
      "book", "course", "class", "tuition", "school", "university",
      "udemy", "coursera", "skillshare", "tutorial", "training", "workshop",
      "seminar", "conference", "certification", "exam", "study", "textbook",
      "learning", "education", "library", "supplies",
    ],
  },
  {
    id: "travel",
    name: "Travel",
    emoji: "✈️",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    keywords: [
      "hotel", "airbnb", "hostel", "resort", "vacation", "trip", "travel",
      "booking", "expedia", "kayak", "luggage", "passport", "visa",
      "souvenir", "tour", "excursion", "cruise", "beach", "abroad",
    ],
  },
  {
    id: "personal-care",
    name: "Personal Care",
    emoji: "💈",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    keywords: [
      "haircut", "salon", "spa", "massage", "skincare", "makeup", "beauty",
      "nail", "manicure", "pedicure", "barber", "shampoo", "cosmetics",
      "perfume", "grooming", "self-care", "facial", "waxing",
    ],
  },
  {
    id: "home",
    name: "Home & Living",
    emoji: "🏠",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    keywords: [
      "furniture", "ikea", "home depot", "repair", "cleaning", "laundry",
      "decoration", "garden", "plant", "kitchen", "appliance", "bed",
      "mattress", "curtain", "lamp", "rug", "paint", "tool", "hardware",
      "plumber", "electrician", "maintenance", "renovation",
    ],
  },
  {
    id: "other",
    name: "Other",
    emoji: "📦",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    keywords: [],
  },
];

export function getCategoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
