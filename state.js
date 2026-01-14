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