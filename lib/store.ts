import { User, Profile, Category, Transaction, Budget, DEFAULT_CATEGORIES } from "./types";

interface Store {
  users: Map<string, User>;
  usernameIndex: Map<string, string>; // username -> userId
  profiles: Map<string, Profile>;
  categories: Map<string, Category[]>; // userId -> categories
  transactions: Map<string, Transaction[]>; // userId -> transactions
  budgets: Map<string, Budget[]>; // userId -> budgets
}

declare global {
  var __store: Store | undefined;
}

function initStore(): Store {
  return {
    users: new Map(),
    usernameIndex: new Map(),
    profiles: new Map(),
    categories: new Map(),
    transactions: new Map(),
    budgets: new Map(),
  };
}

function getStore(): Store {
  if (!globalThis.__store) {
    globalThis.__store = initStore();
  }
  return globalThis.__store;
}

// Users
export function createUser(
  username: string,
  passwordHash: string,
  displayName?: string,
  currency?: string
): User {
  const store = getStore();
  const id = crypto.randomUUID();
  const user: User = { id, username, passwordHash };
  store.users.set(id, user);
  store.usernameIndex.set(username.toLowerCase(), id);

  // Auto-create profile
  const profile: Profile = {
    id,
    display_name: displayName || username,
    currency: currency || "USD",
    created_at: new Date().toISOString(),
  };
  store.profiles.set(id, profile);

  // Auto-create default categories
  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map((name) => ({
    id: crypto.randomUUID(),
    user_id: id,
    name,
    is_default: true,
    created_at: new Date().toISOString(),
  }));
  store.categories.set(id, defaultCategories);

  // Initialize empty arrays for transactions and budgets
  store.transactions.set(id, []);
  store.budgets.set(id, []);

  return user;
}

export function getUserById(id: string): User | undefined {
  return getStore().users.get(id);
}

export function getUserByUsername(username: string): User | undefined {
  const store = getStore();
  const userId = store.usernameIndex.get(username.toLowerCase());
  if (!userId) return undefined;
  return store.users.get(userId);
}

// Profiles
export function getProfile(userId: string): Profile | undefined {
  return getStore().profiles.get(userId);
}

export function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "display_name" | "currency">>
): Profile | undefined {
  const store = getStore();
  const profile = store.profiles.get(userId);
  if (!profile) return undefined;
  const updated = { ...profile, ...updates };
  store.profiles.set(userId, updated);
  return updated;
}

// Categories
export function getCategories(userId: string): Category[] {
  return getStore().categories.get(userId) || [];
}

export function addCategory(userId: string, name: string): Category {
  const store = getStore();
  const category: Category = {
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    is_default: false,
    created_at: new Date().toISOString(),
  };
  const categories = store.categories.get(userId) || [];
  categories.push(category);
  store.categories.set(userId, categories);
  return category;
}

export function deleteCategory(userId: string, categoryId: string): boolean {
  const store = getStore();
  const categories = store.categories.get(userId) || [];
  const filtered = categories.filter((c) => c.id !== categoryId);
  if (filtered.length === categories.length) return false;
  store.categories.set(userId, filtered);
  return true;
}

// Transactions
export function getTransactions(userId: string): Transaction[] {
  const store = getStore();
  const transactions = store.transactions.get(userId) || [];
  const categories = store.categories.get(userId) || [];
  return transactions.map((t) => ({
    ...t,
    category: categories.find((c) => c.id === t.category_id),
  }));
}

export function addTransaction(
  userId: string,
  data: {
    category_id: string | null;
    type: "income" | "expense";
    amount: number;
    note: string | null;
    date: string;
  }
): Transaction {
  const store = getStore();
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    user_id: userId,
    category_id: data.category_id,
    type: data.type,
    amount: data.amount,
    note: data.note,
    date: data.date,
    created_at: new Date().toISOString(),
  };
  const transactions = store.transactions.get(userId) || [];
  transactions.push(transaction);
  store.transactions.set(userId, transactions);
  return transaction;
}

export function deleteTransaction(
  userId: string,
  transactionId: string
): boolean {
  const store = getStore();
  const transactions = store.transactions.get(userId) || [];
  const filtered = transactions.filter((t) => t.id !== transactionId);
  if (filtered.length === transactions.length) return false;
  store.transactions.set(userId, filtered);
  return true;
}

// Budgets
export function getBudgets(userId: string): Budget[] {
  const store = getStore();
  const budgets = store.budgets.get(userId) || [];
  const categories = store.categories.get(userId) || [];
  return budgets.map((b) => ({
    ...b,
    category: categories.find((c) => c.id === b.category_id),
  }));
}

export function addBudget(
  userId: string,
  data: {
    category_id: string;
    month: string;
    amount: number;
  }
): Budget {
  const store = getStore();
  const budgets = store.budgets.get(userId) || [];

  // Upsert: replace existing budget with same category_id and month
  const existingIndex = budgets.findIndex(
    (b) => b.category_id === data.category_id && b.month === data.month
  );

  const budget: Budget = {
    id: existingIndex >= 0 ? budgets[existingIndex].id : crypto.randomUUID(),
    user_id: userId,
    category_id: data.category_id,
    month: data.month,
    amount: data.amount,
    created_at:
      existingIndex >= 0
        ? budgets[existingIndex].created_at
        : new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    budgets[existingIndex] = budget;
  } else {
    budgets.push(budget);
  }

  store.budgets.set(userId, budgets);
  return budget;
}

export function deleteBudget(userId: string, budgetId: string): boolean {
  const store = getStore();
  const budgets = store.budgets.get(userId) || [];
  const filtered = budgets.filter((b) => b.id !== budgetId);
  if (filtered.length === budgets.length) return false;
  store.budgets.set(userId, filtered);
  return true;
}

// Delete all user data
export function deleteUser(userId: string): boolean {
  const store = getStore();
  const user = store.users.get(userId);
  if (!user) return false;

  store.usernameIndex.delete(user.username.toLowerCase());
  store.users.delete(userId);
  store.profiles.delete(userId);
  store.categories.delete(userId);
  store.transactions.delete(userId);
  store.budgets.delete(userId);

  return true;
}

// Batch add transactions (atomic)
export function addTransactions(
  userId: string,
  items: Array<{
    category_id: string | null;
    type: "income" | "expense";
    amount: number;
    note: string | null;
    date: string;
  }>
): Transaction[] {
  const store = getStore();
  const transactions = store.transactions.get(userId) || [];

  const newTransactions: Transaction[] = items.map((data) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    category_id: data.category_id,
    type: data.type,
    amount: data.amount,
    note: data.note,
    date: data.date,
    created_at: new Date().toISOString(),
  }));

  transactions.push(...newTransactions);
  store.transactions.set(userId, transactions);
  return newTransactions;
}
