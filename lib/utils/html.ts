/** Reviews are user text. Escape on render, strip on write. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PHONE = /(\+?91[\s-]?)?[6-9]\d{9}\b/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/g;
const ABUSE = /\b(idiot|stupid|chutiya|bhosdi|madarchod|harami|scam)\b/i;

export function moderateReview(text: string, max = 400): { text: string; held: boolean } {
  const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const masked = stripped.replace(PHONE, "•••••").replace(EMAIL, "•••••");
  return { text: masked.slice(0, max), held: ABUSE.test(masked) };
}

export const REVIEW_CHIPS = {
  positive: {
    hi: [
      "Khana bahut tasty tha",
      "Presentation badhiya thi",
      "Waiter bahut polite tha",
      "Service fast thi",
      "Portion size achha tha",
      "Value for money",
      "Ambience accha hai",
      "Safai achhi thi",
      "Family ke saath perfect",
      "Phir aana chahunga",
    ],
    en: [
      "Great food",
      "Beautifully presented",
      "Polite staff",
      "Fast service",
      "Good portions",
      "Value for money",
      "Lovely ambience",
      "Clean and tidy",
      "Great for family",
      "I'd come back",
    ],
  },
  negative: {
    hi: [
      "Khana thanda aaya",
      "Bahut wait karna pada",
      "Waiter ne dhyaan nahi diya",
      "Portion chhota tha",
      "Mehnga laga",
      "Order galat aaya",
      "Table gandi thi",
      "AC theek nahi tha",
      "Taste average tha",
      "Bill mein gadbad thi",
    ],
    en: [
      "Food was cold",
      "Long wait",
      "Waiter didn't check on us",
      "Small portions",
      "Overpriced",
      "Wrong order",
      "Table wasn't clean",
      "AC wasn't working",
      "Average taste",
      "Billing error",
    ],
  },
} as const;

export const RATING_WORDS: Record<number, { hi: string; en: string }> = {
  1: { hi: "Bahut kharab", en: "Very poor" },
  2: { hi: "Theek nahi tha", en: "Not great" },
  3: { hi: "Average raha", en: "Average" },
  4: { hi: "Achha tha", en: "Good" },
  5: { hi: "Zabardast!", en: "Outstanding" },
};
