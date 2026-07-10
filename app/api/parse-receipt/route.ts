import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a receipt parser AI. You can analyze both:
1. Raw OCR text from a receipt
2. Receipt images directly

Extract the following:
1. Each line item with its price. Expand abbreviated product names to their full, readable names.
   Common abbreviations:
   - "CHK BRST" = "Chicken Breast"
   - "COLG TP" = "Colgate Toothpaste"
   - "CLNX BLCH" = "Clorox Bleach"
   - "WHL MLK" = "Whole Milk"
   - Use your knowledge to expand any abbreviated names you recognize.
2. Categorize each item into EXACTLY one of these categories: Food, Drinks, Hygiene, Cleaning, Household, Entertainment, Transportation, Bills, Savings, Other
3. Extract the total amount if visible (look for "TOTAL", "SUBTOTAL", "AMOUNT DUE")
4. Extract the date if visible
5. Extract the merchant/store name if visible (usually at the top)

IMPORTANT RULES:
- Always return valid JSON
- If you cannot determine a field, use null
- Prices should be numbers (not strings)
- Be generous with interpretation - make your best guess for abbreviated names
- Category must be one of the allowed values listed above

Return ONLY a JSON object in this exact format (no markdown, no code blocks):
{"items":[{"name":"Full Product Name","category":"Category","price":0.00}],"total":0.00,"date":"YYYY-MM-DD","merchant":"Store Name"}`;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    let requestBody;

    // Handle image upload (Gemini Vision - direct image analysis, no Tesseract needed)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("receipt") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No receipt image provided" },
          { status: 400 }
        );
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Unsupported image format. Use JPEG, PNG, WebP, or HEIC." },
          { status: 400 }
        );
      }

      // Convert file to base64 for Gemini Vision
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      requestBody = {
        contents: [
          {
            parts: [
              { text: `${SYSTEM_PROMPT}\n\nAnalyze this receipt image and return the JSON result.` },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      };
    }
    // Handle JSON body with OCR text (legacy support for Tesseract flow)
    else {
      const { ocrText } = await request.json();

      if (!ocrText || typeof ocrText !== "string") {
        return NextResponse.json(
          { error: "No OCR text or image provided" },
          { status: 400 }
        );
      }

      requestBody = {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `Here is the raw OCR text from a receipt:\n\n${ocrText}\n\nParse this receipt and return the JSON result.` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      };
    }

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      return NextResponse.json(
        { error: "AI service unavailable. Please try again or enter expenses manually." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return NextResponse.json(
        { error: "No response from AI. Please try again." },
        { status: 502 }
      );
    }

    // Clean the response - remove markdown code blocks if present
    let cleanJson = textContent.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Parse the JSON
    const parsed = JSON.parse(cleanJson);

    // Validate structure
    const result = {
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item: { name?: string; category?: string; price?: number }) => ({
            name: item.name || "Unknown Item",
            category: item.category || "Other",
            price: typeof item.price === "number" ? item.price : 0,
          }))
        : [],
      total: typeof parsed.total === "number" ? parsed.total : null,
      date: parsed.date || null,
      merchant: parsed.merchant || null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Parse receipt error:", error);
    return NextResponse.json(
      { error: "Failed to parse receipt. Please try again or enter expenses manually." },
      { status: 500 }
    );
  }
}
