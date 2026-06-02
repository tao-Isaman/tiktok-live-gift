// Curated catalog of well-known TikTok gifts used by the picker.
//
// This is intentionally a hand-picked subset (~50) spanning all price tiers —
// the full TikTok catalog is 400+, region-dependent, and rotates seasonally, so
// for a layout builder we only need recognizable ones. Each gift renders as its
// bundled image when one exists (see gift-images.json, populated by
// `npm run gifts:build`), otherwise the emoji fallback.
//
// ⚠️ Gift names are property of TikTok / ByteDance. This tool is unofficial and
// not endorsed by TikTok.

import giftImages from "./gift-images.json";

export interface Gift {
  id: string;
  name: string;
  coins: number;
  emoji: string;
}

export type GiftTier = "basic" | "casual" | "mid" | "premium" | "flagship";

export function tierOf(coins: number): GiftTier {
  if (coins < 5) return "basic";
  if (coins < 100) return "casual";
  if (coins < 1000) return "mid";
  if (coins < 10000) return "premium";
  return "flagship";
}

/** Bundled image path for a gift, if it was downloaded by the build script. */
export function giftImage(id: string): string | undefined {
  return (giftImages as Record<string, string>)[id];
}

export const GIFTS: Gift[] = [
  // basic (1–4 coins)
  { id: "rose", name: "Rose", coins: 1, emoji: "🌹" },
  { id: "tiktok", name: "TikTok", coins: 1, emoji: "🎵" },
  { id: "heart", name: "Heart", coins: 1, emoji: "❤️" },
  { id: "gg", name: "GG", coins: 1, emoji: "🆒" },
  { id: "like", name: "Like", coins: 1, emoji: "👍" },
  { id: "ice-cream", name: "Ice Cream Cone", coins: 1, emoji: "🍦" },
  // casual (5–99)
  { id: "finger-heart", name: "Finger Heart", coins: 5, emoji: "🫰" },
  { id: "friendship-necklace", name: "Friendship Necklace", coins: 7, emoji: "📿" },
  { id: "rosa", name: "Rosa", coins: 10, emoji: "🌷" },
  { id: "perfume", name: "Perfume", coins: 20, emoji: "🌸" },
  { id: "doughnut", name: "Doughnut", coins: 30, emoji: "🍩" },
  { id: "star", name: "Star", coins: 99, emoji: "⭐" },
  { id: "cap", name: "Cap", coins: 99, emoji: "🧢" },
  { id: "paper-crane", name: "Paper Crane", coins: 99, emoji: "🕊️" },
  // mid (100–999)
  { id: "hand-hearts", name: "Hand Hearts", coins: 100, emoji: "🫶" },
  { id: "confetti", name: "Confetti", coins: 100, emoji: "🎊" },
  { id: "gamepad", name: "Gamepad", coins: 100, emoji: "🎮" },
  { id: "hat-and-mustache", name: "Hat and Mustache", coins: 199, emoji: "🎩" },
  { id: "sunglasses", name: "Sunglasses", coins: 199, emoji: "🕶️" },
  { id: "lock-and-key", name: "Lock and Key", coins: 199, emoji: "🔐" },
  { id: "corgi", name: "Corgi", coins: 299, emoji: "🐕" },
  { id: "money-gun", name: "Money Gun", coins: 500, emoji: "💸" },
  { id: "coral", name: "Coral", coins: 499, emoji: "🪸" },
  { id: "swan", name: "Swan", coins: 699, emoji: "🦢" },
  { id: "train", name: "Train", coins: 899, emoji: "🚂" },
  // premium (1,000–9,999)
  { id: "galaxy", name: "Galaxy", coins: 1000, emoji: "🌌" },
  { id: "disco-ball", name: "Disco Ball", coins: 1000, emoji: "🪩" },
  { id: "mishka-bear", name: "Mishka Bear", coins: 1000, emoji: "🧸" },
  { id: "fireworks", name: "Fireworks", coins: 1088, emoji: "🎆" },
  { id: "diamond-ring", name: "Diamond Ring", coins: 1500, emoji: "💍" },
  { id: "chasing-the-dream", name: "Chasing the Dream", coins: 1500, emoji: "✨" },
  { id: "whale-diving", name: "Whale Diving", coins: 2150, emoji: "🐋" },
  { id: "motorcycle", name: "Motorcycle", coins: 2988, emoji: "🏍️" },
  { id: "mermaid", name: "Mermaid", coins: 2988, emoji: "🧜‍♀️" },
  { id: "private-jet", name: "Private Jet", coins: 4888, emoji: "🛩️" },
  { id: "unicorn-fantasy", name: "Unicorn Fantasy", coins: 5000, emoji: "🦄" },
  { id: "airplane", name: "Airplane", coins: 6000, emoji: "✈️" },
  { id: "sports-car", name: "Sports Car", coins: 7000, emoji: "🏎️" },
  { id: "yacht", name: "Yacht", coins: 8999, emoji: "🛥️" },
  // flagship (10,000+)
  { id: "interstellar", name: "Interstellar", coins: 10000, emoji: "🌠" },
  { id: "planet", name: "Planet", coins: 15000, emoji: "🪐" },
  { id: "castle-fantasy", name: "Castle Fantasy", coins: 20000, emoji: "🏰" },
  { id: "dragon", name: "Dragon Flame", coins: 26999, emoji: "🐉" },
  { id: "phoenix", name: "Phoenix", coins: 25999, emoji: "🐦‍🔥" },
  { id: "lion", name: "Lion", coins: 29999, emoji: "🦁" },
  { id: "tiktok-universe", name: "TikTok Universe", coins: 44999, emoji: "🌟" },
];
