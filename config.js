export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
export const EBI_OLS_BASE_URL = 'https://www.ebi.ac.uk/ols4/api';
export const NOTEBOOK_STORAGE_KEY = 'pecoBuddyNotebookData';

export const PECO_MAP = {
    population: { label: "Population", color: "#E91E63", purpose: "a population group (e.g., human, animal model), focusing on MeSH trees for 'Persons', 'Age Groups', or 'Organisms'" },
    exposure: { label: "Exposure", color: "#4CAF50", purpose: "a pharmacological, therapeutic, or environmental intervention/exposure, focusing on the 'Chemicals and Drugs', 'Therapeutics', or 'Phenomena and Processes' MeSH trees" },
    comparison: { label: "Comparator", color: "#00BCD4", purpose: "a pharmacological, therapeutic, or environmental intervention, focusing on the 'Chemicals and Drugs', 'Therapeutics', or 'Phenomena and Processes' MeSH trees" },
    outcome: { label: "Outcome", color: "#FFC107", purpose: "a clinical, toxicological, or biological endpoint, sign, or symptom, focusing on MeSH trees for 'Signs and Symptoms', 'Pathological Conditions', or 'Therapeutic Outcomes'" }
};

export const MODE_CONFIG = {
    peco_toolkit: { title: "PECO Toolkit", subtitle: "A guided workflow from concept to PECO analysis" },
    review_peco: { title: "Review PECO", subtitle: "Tools for manuscript consistency auditing" },
    nlp: { title: "NLP Toolkit", subtitle: "Manage custom term lists for local analysis" }
};