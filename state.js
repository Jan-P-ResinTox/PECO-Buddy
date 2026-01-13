export const appState = {
    currentMode: 'peco_toolkit',
    analysisEngine: 'ai', // 'ai' or 'nlp'
    showTooltips: true,
    showScoreGauge: true,
    authorWorkflow: {
        currentStep: 'step-ideation',
        completedSteps: [],
        ideationData: { scopeText: '', selectedStudyType: null, generatedSuggestions: [], selectedSuggestion: null },
        clarityData: { researchQuestion: '', qualityScore: 0, analysis: null, peco: null, strengths: [], appliedSuggestions: {}, isAnalysisCollapsed: false },
        liveCoAuthorData: { peco: { population: '', exposure: '', comparison: '', outcome: '' }, ambiguities: [] },
        pecoWorkshopData: null,
    },
    nlpTerms: [],
    nlpCurrentPage: 1,
    nlpSearchQuery: '',
    nlpSort: { key: 'term', direction: 'asc' },
    globalApiKey: '', // Kept for state compatibility, though process.env.API_KEY is used for calls
    notebookData: {
        researchScope: '', initialQuestion: '', finalQuestion: '', 
        population: '', exposure: '', comparison: '', outcome: '', notes: ''
    },
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