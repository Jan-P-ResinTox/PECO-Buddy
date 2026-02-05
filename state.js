
export const appState = {
    currentMode: 'peco_toolkit',
    analysisEngine: 'ai', // 'ai' or 'nlp'
    showTooltips: true,
    showScoreGauge: true,
    heuristics: {
        domainContext: "Toxicology and Epidemiology",
        logicAnchors: "- Human + Prenatal/Birth -> Use 'Infants' or 'Children'.\n- Rodent + Prenatal/Birth -> Use 'Pups'.\n- Human + Pregnancy -> Use 'Pregnant Women'.\n- Zebrafish + Early Stage -> Use 'Larvae' or 'Embryos'.",
        baseSeed: 42
    },
    authorWorkflow: {
        currentStep: 'step-ideation',
        completedSteps: [],
        ideationData: { 
            scopeText: '', 
            selectedStudyType: null, 
            generatedSuggestions: [], 
            selectedSuggestion: null,
            generationCount: 0 // Track for deterministic seed +1 logic
        },
        clarityData: { researchQuestion: '', qualityScore: 0, analysis: null, peco: null, strengths: [], appliedSuggestions: {}, isAnalysisCollapsed: false },
        liveCoAuthorData: { peco: { population: '', exposure: '', comparison: '', outcome: '' }, ambiguities: [] },
        pecoWorkshopData: null,
    },
    nlpTerms: [],
    nlpCurrentPage: 1,
    nlpSearchQuery: '',
    nlpSort: { key: 'term', direction: 'asc' },
    globalApiKey: '', 
    notebookData: {
        researchScope: '', initialQuestion: '', finalQuestion: '', 
        population: '', exposure: '', comparison: '', outcome: '', notes: ''
    },
    interactionLog: [], // Complete trail of prompts, contexts, and JSON responses
};

export const dom = {
    mainContent: null,
    saveProjectBtn: null,
    loadProjectBtn: null,
    loadProjectInput: null,
    sidebarNav: null,
    appSidebar: null,
    headerTitle: null,
    headerSubtitle: null,
    appMainContent: null,
    sidebarToggleBtn: null,
    modalPlaceholder: null,
};
