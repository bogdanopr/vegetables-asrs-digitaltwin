import type { VegetableType } from '../types';

const VEGETABLES: VegetableType[] = ['Tomato', 'Lettuce', 'Carrot', 'Eggplant', 'Corn', 'Onion'];

// Simple Levenshtein distance for typos
const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

export const findClosestVegetable = (word: string): VegetableType | null => {
    const lower = word.toLowerCase();

    // Exact match check (fast path)
    const exact = VEGETABLES.find(v => v.toLowerCase() === lower || v.toLowerCase() + 's' === lower);
    if (exact) return exact;

    // Fuzzy match
    let bestMatch: VegetableType | null = null;
    let minDist = 3; // Max allowed typos

    VEGETABLES.forEach(v => {
        // Check singular and plural forms against the word
        const distSingular = levenshteinDistance(v.toLowerCase(), lower);
        const distPlural = levenshteinDistance(v.toLowerCase() + 's', lower);
        const dist = Math.min(distSingular, distPlural);

        if (dist < minDist) {
            minDist = dist;
            bestMatch = v;
        }
    });

    return bestMatch;
};

export const parseUserOrder = (text: string): { type: VegetableType, count: number }[] => {
    const orders: { type: VegetableType, count: number }[] = [];

    // Normalize text
    const cleanText = text.toLowerCase();

    // Split into phrases by punctuation to handle "I want x, but I don't want y"
    const phrases = cleanText.split(/[,.;]/);

    phrases.forEach(phrase => {
        // Check for strong negation words inside the phrase
        const isNegative = /(no|not|don't|dont|never|hate)/.test(phrase);
        if (isNegative) return; // Skip negative phrases completely

        // Tokenize to find number + word pairs
        // We look for patterns like "3 [word]" or "three [word]"
        // For simplicity, let's stick to regex extracting numbers first, then looking ahead for closest veg

        // Strategy: separate words, find number, look at next word.
        const words = phrase.split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const num = parseInt(word);

            if (!isNaN(num) && num > 0) {
                // Look ahead for vegetable candidate (check next 2 words)
                let foundType: VegetableType | null = null;

                if (i + 1 < words.length) foundType = findClosestVegetable(words[i + 1]);
                if (!foundType && i + 2 < words.length) foundType = findClosestVegetable(words[i + 2]);

                if (foundType) {
                    orders.push({ type: foundType, count: num });
                    // Skip next words to avoid double counting
                    i++;
                }
            }
        }
    });

    return orders;
};
