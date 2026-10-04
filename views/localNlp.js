import { appState } from '../state.js';
import { PECO_MAP } from '../config.js';

/**
 * Local deterministic vocabulary engine for the PECO Toolkit's offline
 * analysis tier. Extracted from the NLP Toolkit: the PECO flow only needs
 * the matcher and the deterministic analysis, not the vocabulary manager.
 */

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Deterministic vocabulary matcher. Word-boundary aware and diacritic-insensitive:
 * "lead" no longer matches "leadership", and "cafe" matches "café". Each term
 * matches on itself or any of its aliases. Zero model involvement — the output
 * is identical for identical input.
 */
export const findTermMatches = (text) => {
    if (!text) return [];
    const normalizedText = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const matches = [];
    const seen = new Set();
    for (const termObj of appState.nlpTerms) {
        const aliasList = Array.isArray(termObj.aliases)
            ? termObj.aliases
            : (typeof termObj.aliases === 'string' ? termObj.aliases.split(';') : []);
        const variants = [termObj.term, ...aliasList].filter(Boolean);
        for (const variant of variants) {
            const v = String(variant).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            if (!v) continue;
            const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(v)}($|[^\\p{L}\\p{N}])`, 'u');
            if (pattern.test(normalizedText)) {
                const key = `${termObj.term}|${termObj.category}`;
                if (!seen.has(key)) { seen.add(key); matches.push(termObj); }
                break;
            }
        }
    }
    return matches;
};

export const runLocalNlpAnalysis = (text) => {
    const matches = findTermMatches(text);
    const peco = { population: '', exposure: '', comparison: '', outcome: '' };

    matches.forEach(termObj => {
        const currentVal = peco[termObj.category];
        peco[termObj.category] = currentVal ? `${currentVal} ; ${termObj.term}` : termObj.term;
    });

    // Construct analysis object mocking the AI response shape
    const analysis = {
        feedback: Object.keys(PECO_MAP).map(key => {
            const categoryMatches = matches.filter(m => m.category === key);
            if (categoryMatches.length > 0) {
                return {
                    component: key,
                    suggestions: categoryMatches.map(m => ({
                        refined_term: m.term,
                        advisory_message: `Identified "${m.term}" from your local vocabulary.`,
                        counter_consideration: null
                    }))
                };
            } else {
                return {
                    component: key,
                    suggestions: [{
                        refined_term: "Missing",
                        advisory_message: `No terms found for ${PECO_MAP[key].label} in your local vocabulary.`,
                        counter_consideration: "Add relevant terms to the vocabulary to improve offline analysis."
                    }]
                };
            }
        })
    };

    return { peco, analysis };
};
