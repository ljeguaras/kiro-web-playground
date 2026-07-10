# Budget Tracker — AI-Powered Expense Management App

## Project Recreation Prompt

Use this prompt to recreate the entire project from scratch in a single session.

---

## PROMPT:

Build a **full-stack AI-powered budget tracker** web app with the following specifications:

### Tech Stack
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4 with custom CSS variables for theming (light/dark mode)
- **Database & Auth**: Supabase (PostgreSQL + Row Level Security + Auth with email/password + Google OAuth)
- **AI**: Google Gemini 2.0 Flash (via REST API, not SDK) for:
  1. Receipt OCR (Gemini Vision — direct image-to-structured-data)
  2. Auto-categorization of expenses from text descriptions
- **Charts**: Recharts (PieChart, BarChart, LineChart)
- **Icons**: lucide-react
- **Fonts**: Geist Sans + Geist Mono (from next/font/google)

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key (free from https://aistudio.google.com/apikey)
```

---

### Database Schema (Supabase)

4 tables with Row Level Security enabled:

1. **profiles** — extends Supabase auth.users
   - `id` UUID (PK, references auth.users ON DELETE CASCADE)
   - `display_name` TEXT nullable
   - `currency` TEXT NOT NULL DEFAULT 'USD'
   - `created_at` TIMESTAMPTZ

2. **categories** — user's expense categories (pre-set defaults + custom)
   - `id` UUID (PK, auto-generated)
   - `user_id` UUID (FK → profiles)
   - `name` TEXT NOT NULL
   - `is_default` BOOLEAN DEFAULT false
   - `created_at` TIMESTAMPTZ

3. **transactions** — income and expenses
   - `id` UUID (PK, auto-generated)
   - `user_id` UUID (FK → profiles)
   - `category_id` UUID nullable (FK → categories, ON DELETE SET NULL)
   - `type` TEXT CHECK ('income' or 'expense')
   - `amount` NUMERIC(12,2) CHECK > 0
   - `note` TEXT nullable
   - `date` DATE DEFAULT CURRENT_DATE
   - `created_at` TIMESTAMPTZ

4. **budgets** — monthly spending limits per category
   - `id` UUID (PK, auto-generated)
   - `user_id` UUID (FK → profiles)
   - `category_id` UUID (FK → categories, ON DELETE CASCADE)
   - `month` DATE NOT NULL
   - `amount` NUMERIC(12,2) CHECK > 0
   - `created_at` TIMESTAMPTZ
   - UNIQUE constraint on (user_id, category_id, month)

RLS Policies: Each table has "Users manage own [resource]" policy using `auth.uid() = id` (profiles) or `auth.uid() = user_id` (others) for ALL operations.

Performance indexes on: transactions(user_id, date DESC), transactions(user_id, category_id), categories(user_id), budgets(user_id, month).

---

### Default Categories (created on signup)
Food, Drinks, Transportation, Bills, Entertainment, Savings, Hygiene, Cleaning, Household

### Supported Currencies
USD, EUR, GBP, INR, JPY, CAD, AUD, PHP, MYR, SGD

---

### App Structure

```
app/
├── layout.tsx              — Root layout (Geist fonts, body classes)
├── globals.css             — Tailwind + custom CSS variables (light/dark theme)
├── page.tsx                — Public landing page (hero, features, how-it-works, footer)
├── (auth)/
│   ├── login/page.tsx      — Login (email/password + "Sign in with Google" button)
│   └── signup/page.tsx     — 2-step signup (Step 1: email/password + Google, Step 2: name + currency)
├── auth/
│   └── callback/route.ts   — OAuth callback (exchanges code for session)
├── (app)/
│   ├── layout.tsx          — Authenticated app shell (sidebar nav + mobile hamburger menu)
│   ├── dashboard/page.tsx  — Dashboard (summary cards, PieChart, BarChart, LineChart, budget progress)
│   ├── scan/page.tsx       — Receipt scanner (upload/camera → Gemini Vision → review items → save)
│   ├── transactions/
│   │   ├── page.tsx        — Transaction list (filters, CSV export, delete)
│   │   └── new/page.tsx    — Add transaction (AI auto-categorization as you type)
│   ├── budgets/page.tsx    — Monthly budgets (add/edit/delete, progress bars, month selector)
│   └── settings/page.tsx   — Settings (profile, category management, delete account)
├── api/
│   ├── categorize/route.ts — POST: Gemini AI categorizes expense from description
│   └── parse-receipt/route.ts — POST: Gemini Vision parses receipt image OR OCR text
middleware.ts               — Supabase session refresh + route protection
lib/
├── supabase/
│   ├── client.ts           — Browser Supabase client (createBrowserClient)
│   ├── server.ts           — Server Supabase client (createServerClient with cookies)
│   └── middleware.ts       — Session update + protected/auth route redirect logic
├── types.ts                — TypeScript interfaces + DEFAULT_CATEGORIES + CURRENCIES
└── utils.ts                — formatCurrency, formatDate, getMonthKey, getMonthName, getCategoryColor
```

---

### Key Features & Behavior

#### 1. Authentication
- Email/password signup with 2-step flow (credentials → profile personalization)
- Google OAuth ("Sign in with Google" / "Sign up with Google") with proper Google color SVG icon
- OAuth callback at `/auth/callback` exchanges code for session
- Middleware protects `/dashboard`, `/scan`, `/transactions`, `/budgets`, `/settings`
- Middleware redirects authenticated users away from `/login` and `/signup`
- On signup: creates profile row + inserts 9 default categories

#### 2. Receipt Scanner (`/scan`)
- Upload image OR take photo (camera capture on mobile)
- Sends image directly to Gemini Vision API as base64 (multipart/form-data)
- NO client-side OCR (no Tesseract) — Gemini reads the image directly
- Gemini extracts: line items (expanded abbreviations), prices, categories, merchant, date, total
- Review step: user can edit item names, categories, prices, remove items
- Save: batch inserts all items as expense transactions into Supabase
- Progress states: upload → processing → review → saving → done → error

#### 3. AI Auto-Categorization (`/transactions/new`)
- As user types in the "Description" field, Gemini AI is called (debounced 600ms)
- API sends user's custom category list to Gemini so it picks from THEIR categories
- When confidence >= 70%, the category dropdown auto-selects
- Shows AI suggestion badge with category name, confidence %, and reasoning
- Falls back to keyword matching if Gemini API key is missing or API fails
- Description field is placed ABOVE the category dropdown so AI can suggest before user manually picks

#### 4. Dashboard (`/dashboard`)
- Summary cards: Income (green), Expenses (red), Balance (blue/red)
- PieChart: spending breakdown by category (current month)
- BarChart: income vs expenses (last 6 months)
- LineChart: daily spending trend (current month)
- Budget progress section: progress bars for each active budget
- Quick action buttons: "Scan Receipt" and "Add Manual"

#### 5. Transactions (`/transactions`)
- List with category badge, amount (green for income, red for expense), date, note
- Filters panel: by category, type (income/expense), date range
- CSV export (Date, Type, Category, Amount, Note)
- Delete individual transactions
- Quick links to Scan and Add pages

#### 6. Budgets (`/budgets`)
- Set monthly budget per category
- Month selector (last 6 months + next 2)
- Progress bars: green (<80%), yellow (80-99%), red (>=100%)
- Summary cards: total budget vs total spent
- Add/delete budget limits (upsert on user_id + category_id + month)

#### 7. Settings (`/settings`)
- Profile: edit display name, change currency
- Categories: add custom categories, delete non-default categories (shows color dot)
- Danger zone: delete account (with double confirmation, cascades all data)

---

### API Routes

#### POST `/api/categorize`
- Input: `{ description: string, amount?: number, categories?: string[] }`
- Uses Gemini 2.0 Flash with temperature 0.1 to categorize
- Prompt instructs Gemini to pick EXACTLY one category from the provided list
- Returns: `{ category: string, confidence: number, reasoning: string }`
- Fallback: keyword-based rules for common expenses when Gemini unavailable

#### POST `/api/parse-receipt`
- Accepts EITHER:
  - `multipart/form-data` with `receipt` file (image/jpeg, png, webp, heic) → Gemini Vision
  - JSON `{ ocrText: string }` → Gemini text parsing (legacy support)
- Returns: `{ items: [{name, category, price}], total, date, merchant }`
- System prompt instructs Gemini to expand abbreviations ("CHK BRST" → "Chicken Breast")
- Categorizes each item into: Food, Drinks, Hygiene, Cleaning, Household, Entertainment, Transportation, Bills, Savings, Other

---

### Styling (globals.css)
- Tailwind CSS 4 with `@theme inline` for CSS variable mapping
- Custom color scheme: primary (blue-600), accent (emerald-500), destructive (red-500)
- Light/dark mode via `prefers-color-scheme: dark` media query
- CSS variables: --background, --foreground, --primary, --primary-foreground, --secondary, --muted, --muted-foreground, --border, --ring, --card, --card-foreground, --destructive, --accent

---

### Navigation (App Layout Sidebar)
Desktop: fixed left sidebar (w-64) with:
- Dashboard (LayoutDashboard icon)
- Scan Receipt (Camera icon)
- Transactions (Receipt icon)
- Budgets (PiggyBank icon)
- Settings (Settings icon)
- Sign Out (LogOut icon) at bottom

Mobile: top header with hamburger menu → dropdown nav overlay

---

### Important Implementation Notes
1. Gemini API is called via REST `fetch()` to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}` — NOT using the `@google/generative-ai` SDK
2. Supabase uses `@supabase/ssr` package with `createBrowserClient` (client) and `createServerClient` (server + middleware)
3. All "protected" pages are under the `(app)` route group which shares the sidebar layout
4. Auth pages are under the `(auth)` route group (no sidebar)
5. Landing page is at root `/` — public, shows hero + features
6. The receipt scanner sends the image as base64 inline data to Gemini, NOT as a URL
7. Categories are user-scoped (each user has their own list, starting with 9 defaults)
8. No email verification required for signup (immediate access after signup)
