export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

export const PECO_MAP = {
    population: { label: "Population", color: "#ec4899", purpose: "a population group (e.g., human, animal model), focusing on MeSH trees for 'Persons', 'Age Groups', or 'Organisms'" },
    exposure: { label: "Exposure", color: "#22c55e", purpose: "a pharmacological, therapeutic, or environmental intervention/exposure, focusing on the 'Chemicals and Drugs', 'Therapeutics', or 'Phenomena and Processes' MeSH trees" },
    comparison: { label: "Comparator", color: "#06b6d4", purpose: "a pharmacological, therapeutic, or environmental intervention, focusing on the 'Chemicals and Drugs', 'Therapeutics', or 'Phenomena and Processes' MeSH trees" },
    outcome: { label: "Outcome", color: "#eab308", purpose: "a clinical, toxicological, or biological endpoint, sign, or symptom, focusing on MeSH trees for 'Signs and Symptoms', 'Pathological Conditions', or 'Therapeutic Outcomes'" }
};

export const MODE_CONFIG = {
    peco_toolkit: { title: "PECO Toolkit", subtitle: "A guided workflow from concept to a final PECO question" }
};