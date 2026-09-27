// A local, dependency-free profanity filter — no external moderation API,
// consistent with this project's local-first approach. It normalizes text
// to defeat the common filter-evasion techniques (spacing, leetspeak/symbol
// substitution, punctuation insertion, letter-stretching, Unicode
// lookalikes) before matching against a word list, then substitutes each
// match with a "nicer" word so the message still sends, just cleaned up.
//
// This is NOT bypass-proof — no static word list ever is (genuinely novel
// misspellings and evolving slang will get through). What backstops that
// gap in this app specifically is that every chat message is permanently
// logged and always visible to the club's Sponsor Teacher (see
// src/lib/chat.ts) — a human safety net behind the automated one.
//
// Matching is deliberately EXACT-match only, never substring/`.includes()`.
// A substring check would flag "classy", "assignment", "grass", and "pass"
// as containing "ass" (the classic "Scunthorpe problem") — actively broken
// for a school app whose students are constantly typing "assignment" and
// "class". Common alternate spellings are listed explicitly instead of
// relying on fuzzy substring logic.

const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "3": "e", "@": "a",
  "5": "s", "$": "s", "7": "t", "+": "t", "|": "i",
};

// The handful of non-Latin letters most commonly used to visually spoof
// Latin ones — not exhaustive (full homoglyph coverage is its own deep
// rabbit hole), but covers the realistic cases a student would actually type.
const HOMOGLYPH_MAP: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
  "і": "i", "ѕ": "s", "к": "k", "м": "m", "н": "h", "т": "t", "в": "b",
  "α": "a", "ο": "o", "ρ": "p", "υ": "u", "ι": "i", "ѡ": "w",
};

// canonical term -> nicer substitute. Includes common alternate
// spellings/abbreviations as their own entries (rather than fuzzy substring
// matching) so "fck"/"fuk" are caught without also catching "assignment".
const REPLACEMENTS: Record<string, string> = {
  fuck: "fudge", fck: "fudge", fuk: "fudge", phuck: "fudge", fack: "fudge",
  fucking: "fudging", fcking: "fudging", fukin: "fudging", fuckin: "fudging",
  fucker: "fudger", fuckers: "fudgers",
  shit: "shoot", sht: "shoot", shyt: "shoot", shitty: "shoddy", shitting: "shooting",
  bitch: "jerk", biatch: "jerk", bitches: "jerks",
  bastard: "jerk", bastards: "jerks",
  ass: "butt", azz: "butt", asshole: "jerk", assholes: "jerks",
  damn: "darn", dammit: "dang it", damnit: "dang it",
  hell: "heck",
  crap: "crud", crappy: "cruddy",
  dick: "jerk", dickhead: "jerk", cock: "jerk",
  piss: "pee", pissed: "peeved", pissing: "peeing",
  slut: "jerk", sluts: "jerks", whore: "jerk", whores: "jerks",
  douche: "jerk", douchebag: "jerk",
};

// Slurs / hate speech — fully masked, not substituted with a synonym; there
// isn't a "nicer" version of a slur, and softening one would trivialize
// real harm.
const SLURS = ["nigger", "niggers", "nigga", "niggas", "faggot", "faggots", "fag", "fags", "retard", "retards", "retarded", "chink", "chinks", "spic", "spics", "kike", "kikes", "tranny", "trannies"];

const MASK = "[filtered]";
const MATCH_MAP: Record<string, string> = { ...REPLACEMENTS, ...Object.fromEntries(SLURS.map((s) => [s, MASK])) };

function normalizeChar(ch: string): string {
  return HOMOGLYPH_MAP[ch] ?? LEET_MAP[ch] ?? ch;
}

// Strips everything but letters, folds homoglyphs/leetspeak, collapses 3+
// repeated characters ("fuuuuck" -> "fuc" -> handled below), lowercases.
// Used only to decide whether a chunk of text IS a listed word — never
// shown to anyone.
function normalizeForMatch(raw: string): string {
  const folded = Array.from(raw.toLowerCase()).map(normalizeChar).join("");
  const lettersOnly = folded.replace(/[^a-z]/g, "");
  return lettersOnly.replace(/(.)\1{2,}/g, "$1$1"); // "fuuuuck" -> "fuuck" (3+ same char -> 2)
}

// Exact match is tried first; collapsing every doubled letter is tried only
// as a fallback, never baked into the primary normalized form — many
// legitimately-spelled words on the list ("hell", "asshole") have a real
// double letter, and destructively collapsing it there would break matching
// those words at all. This only ever *adds* detection of a word stretched
// by exactly one extra letter ("fukk" -> "fuk"), it never removes it.
function replacementFor(normalized: string): string | null {
  if (!normalized) return null;
  if (MATCH_MAP[normalized]) return MATCH_MAP[normalized];
  const singled = normalized.replace(/(.)\1/g, "$1");
  return MATCH_MAP[singled] ?? null;
}

// Detects the "f u c k" spacing bypass: short tokens (each on their own
// after a whitespace split) that spell a listed word once concatenated.
// Capped at 6 tokens so it can't run away scanning a long sentence of short
// words, and only ever compares the EXACT joined result — never a substring
// — so "a lot of us said" (many short words) can't accidentally match.
const MAX_SPACED_WINDOW = 6;

export function filterProfanity(text: string): { filtered: string; wasFiltered: boolean } {
  const tokens = text.split(/(\s+)/); // keep whitespace so we can reassemble spacing exactly
  const wordIndices = tokens.map((t, i) => (/\S/.test(t) ? i : -1)).filter((i) => i !== -1);
  const result = [...tokens];
  let wasFiltered = false;

  // Pass 1: single-token exact matches (handles leetspeak, punctuation
  // embedded in a token, repeated letters, homoglyphs — anything with no
  // spaces inside the token itself).
  for (const i of wordIndices) {
    const term = replacementFor(normalizeForMatch(tokens[i]));
    if (term) {
      result[i] = term;
      wasFiltered = true;
    }
  }

  // Pass 2: spaced-out bypass — merge runs of short consecutive word-tokens
  // and check whether they spell something once joined. Only looks at
  // tokens pass 1 didn't already replace, and only tokens of length <= 3
  // (spaced-bypass letters are typed one or two at a time by construction).
  for (let start = 0; start < wordIndices.length; start++) {
    let joined = "";
    for (let end = start; end < Math.min(start + MAX_SPACED_WINDOW, wordIndices.length); end++) {
      const idx = wordIndices[end];
      if (result[idx] !== tokens[idx]) break; // already replaced by pass 1 — stop extending through it
      if (tokens[idx].replace(/\s/g, "").length > 3) break;
      joined += normalizeForMatch(tokens[idx]);
      if (end === start) continue; // a single short token alone was already checked (and missed) by pass 1
      const term = replacementFor(joined);
      if (term) {
        for (let k = start; k <= end; k++) result[wordIndices[k]] = k === start ? term : "";
        wasFiltered = true;
        break;
      }
    }
  }

  return { filtered: result.join("").replace(/ {2,}/g, " ").trim(), wasFiltered };
}
