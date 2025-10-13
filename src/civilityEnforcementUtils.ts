/**
 * Civility Enforcement Utilities
 *
 * Functions for detecting and filtering inappropriate content
 */

// List of forbidden words (in lowercase for case-insensitive matching)
const FORBIDDEN_WORDS = [
    // Profanity
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "damn",
    "hell",
    "crap",
    "piss",
    "dick",
    "cock",
    "pussy",
    "whore",
    "slut",
    "fag",
    "nigger",
    "nigga",
    "retard",
    "cunt",

    // Common variations and intentional misspellings
    "fuk",
    "fck",
    "sh1t",
    "b1tch",
    "a$$hole",
    "d1ck",
    "c0ck",
    "pu$$y",
    "cnt",

    // Hate speech and slurs (add more as needed)
    "kike",
    "spic",
    "chink",
    "wetback",
];

/**
 * Result of forbidden word detection
 */
export interface ForbiddenWordsResult {
    /** The sanitized text with forbidden words replaced by XXXX */
    sanitizedText: string;
    /** The number of forbidden words found */
    forbiddenWordCount: number;
    /** Whether any forbidden words were found */
    hasForbiddenWords: boolean;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects and replaces forbidden words in text
 *
 * @param text - The text to scan for forbidden words
 * @param findFirstForbiddenWord - If true, stops after finding the first forbidden word
 * @returns Object containing sanitized text, count of forbidden words, and detection flag
 *
 * @example
 * ```typescript
 * const result = findForbiddenWords("This is a test shit");
 * // result.sanitizedText = "This is a test XXXX"
 * // result.forbiddenWordCount = 1
 * // result.hasForbiddenWords = true
 * ```
 *
 * @example
 * ```typescript
 * const result = findForbiddenWords("fuck this shit", true);
 * // result.sanitizedText = "XXXX this shit" (only first word replaced)
 * // result.forbiddenWordCount = 1
 * // result.hasForbiddenWords = true
 * ```
 */
export function findForbiddenWords(
    text: string,
    findFirstForbiddenWord: boolean = false
): ForbiddenWordsResult {
    let sanitizedText = text;
    let forbiddenWordCount = 0;

    // If findFirstForbiddenWord mode, we stop after first match
    if (findFirstForbiddenWord) {
        for (const forbiddenWord of FORBIDDEN_WORDS) {
            // Create a case-insensitive regex that matches whole words or word boundaries
            // This prevents matching "hello" when forbidden word is "hell"
            const regex = new RegExp(`\\b${escapeRegex(forbiddenWord)}\\b`, 'i');

            if (regex.test(sanitizedText)) {
                sanitizedText = sanitizedText.replace(regex, 'XXXX');
                forbiddenWordCount = 1;
                break; // Stop after first forbidden word found
            }
        }
    } else {
        // Check all forbidden words
        for (const forbiddenWord of FORBIDDEN_WORDS) {
            // Create a global case-insensitive regex that matches whole words
            const regex = new RegExp(`\\b${escapeRegex(forbiddenWord)}\\b`, 'gi');

            // Count matches before replacing
            const matches = sanitizedText.match(regex);
            if (matches) {
                forbiddenWordCount += matches.length;
                sanitizedText = sanitizedText.replace(regex, 'XXXX');
            }
        }
    }

    return {
        sanitizedText,
        forbiddenWordCount,
        hasForbiddenWords: forbiddenWordCount > 0
    };
}

/**
 * Checks if text contains any forbidden words (without modifying the text)
 *
 * @param text - The text to check
 * @returns True if forbidden words are found, false otherwise
 *
 * @example
 * ```typescript
 * const hasProf = containsForbiddenWords("This is clean"); // false
 * const hasProf2 = containsForbiddenWords("This is shit"); // true
 * ```
 */
export function containsForbiddenWords(text: string): boolean {
    for (const forbiddenWord of FORBIDDEN_WORDS) {
        const regex = new RegExp(`\\b${escapeRegex(forbiddenWord)}\\b`, 'i');
        if (regex.test(text)) {
            return true;
        }
    }
    return false;
}

/**
 * Gets the list of forbidden words (for administrative purposes)
 * Returns a copy to prevent modification of the original list
 *
 * @returns Array of forbidden words
 */
export function getForbiddenWordsList(): string[] {
    return [...FORBIDDEN_WORDS];
}

/**
 * Adds a new forbidden word to the list
 * Note: This only affects the current session. For persistent changes,
 * modify the FORBIDDEN_WORDS constant directly.
 *
 * @param word - The word to add (will be converted to lowercase)
 */
export function addForbiddenWord(word: string): void {
    const lowercaseWord = word.toLowerCase().trim();
    if (lowercaseWord && !FORBIDDEN_WORDS.includes(lowercaseWord)) {
        FORBIDDEN_WORDS.push(lowercaseWord);
    }
}

/**
 * Removes a word from the forbidden list
 * Note: This only affects the current session.
 *
 * @param word - The word to remove
 * @returns True if word was removed, false if it wasn't in the list
 */
export function removeForbiddenWord(word: string): boolean {
    const lowercaseWord = word.toLowerCase().trim();
    const index = FORBIDDEN_WORDS.indexOf(lowercaseWord);
    if (index !== -1) {
        FORBIDDEN_WORDS.splice(index, 1);
        return true;
    }
    return false;
}
