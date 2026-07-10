export interface Profile {
  id: string;
  display_name: string | null;
  currency: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: "income" | "expense";
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
  // Joined
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  amount: number;
  created_at: string;
  // Joined
  category?: Category;
}

export interface ReceiptItem {
  name: string;
  category: string;
  price: number;
}

export interface ReceiptParseResult {
  items: ReceiptItem[];
  total: number | null;
  date: string | null;
  merchant: string | null;
}

export const DEFAULT_CATEGORIES = [
  "Food",
  "Drinks",
  "Transportation",
  "Bills",
  "Entertainment",
  "Savings",
  "Hygiene",
  "Cleaning",
  "Household",
] as const;

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "\u20ac" },
  { code: "GBP", name: "British Pound", symbol: "\u00a3" },
  { code: "INR", name: "Indian Rupee", symbol: "\u20b9" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00a5" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "PHP", name: "Philippine Peso", symbol: "\u20b1" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];
