# Budget Tracker - Smart Expense Management

A web application that makes expense tracking effortless. Snap a receipt, and AI identifies each item, expands abbreviations, and categorizes them automatically.

## Features

- **AI-Powered Receipt Scanning**: Take a photo of any receipt. AI understands abbreviated merchant names (e.g., "CHK BRST" -> "Chicken Breast") and auto-categorizes items (Food, Hygiene, Cleaning, etc.)
- **Manual Transaction Entry**: Quick form for adding income/expenses
- **Monthly Budgets**: Set spending limits per category with visual progress tracking
- **Dashboard**: Pie charts, bar charts, and line charts for spending insights
- **CSV Export**: Download filtered transaction data
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS (responsive, semantic HTML)
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **OCR**: Tesseract.js (client-side, zero cost)
- **AI Analysis**: Google Gemini API (free tier: 1500 req/day)
- **Charts**: Recharts
- **Deployment**: Vercel (free tier)

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Enable Google OAuth in Authentication > Providers (optional)

### 3. Get Gemini API Key

1. Go to [ai.google.dev](https://ai.google.dev)
2. Create a free API key
3. Free tier: 15 requests/minute, 1500 requests/day

### 4. Configure Environment

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

```bash
npx vercel
```

Add environment variables in Vercel project settings.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login/Signup pages
│   ├── (app)/           # Authenticated app pages
│   │   ├── dashboard/   # Charts & overview
│   │   ├── scan/        # Receipt OCR scanning
│   │   ├── transactions/# List & add transactions
│   │   ├── budgets/     # Monthly budget management
│   │   └── settings/    # Profile & categories
│   ├── api/
│   │   └── parse-receipt/ # Gemini AI receipt parsing
│   └── auth/callback/   # OAuth callback
├── lib/
│   ├── supabase/        # Supabase client config
│   ├── ocr.ts           # Tesseract.js OCR utilities
│   ├── types.ts         # TypeScript types
│   └── utils.ts         # Helper functions
└── middleware.ts        # Auth route protection
```

## How Receipt Scanning Works

1. User captures/uploads a receipt image
2. Image is preprocessed (grayscale, contrast) using Canvas API
3. Tesseract.js (WASM) extracts raw text in the browser
4. Raw text is sent to Gemini AI which:
   - Identifies each line item
   - Expands abbreviated names (e.g., "COLG TP MNT" -> "Colgate Toothpaste Mint")
   - Categorizes items (Food, Drinks, Hygiene, Cleaning, Household, etc.)
   - Extracts prices, total, and date
5. User reviews/edits the itemized results
6. Confirmed items are saved as individual transactions

## License

MIT
