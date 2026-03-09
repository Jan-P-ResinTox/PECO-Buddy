export const appState = {
    currentMode: 'peco_toolkit',
    analysisEngine: 'ai', // 'ai' or 'nlp'
    showTooltips: true,
    fontSize: localStorage.getItem('peco_buddy_font_size') || 'md', // sm, md, lg
    assistanceLevel: parseInt(localStorage.getItem('peco_buddy_assistance_level') || '3'), // 1 (Min) to 5 (Max)
    globalSeed: parseInt(localStorage.getItem('peco_buddy_seed') || '42'),
    
    // AI Provider Configuration
    aiProvider: localStorage.getItem('peco_buddy_ai_provider') || 'gemini', // 'gemini', 'openai', 'local'
    aiBaseUrl: localStorage.getItem('peco_buddy_ai_base_url') || '',
    aiModel: localStorage.getItem('peco_buddy_ai_model') || '',
    globalApiKey: localStorage.getItem('peco_buddy_api_key') || '', 
    
    // General Settings
    stripMetadata: localStorage.getItem('peco_buddy_strip_metadata') === 'true',

    authorWorkflow: {
        currentStep: 'step-ideation',
        completedSteps: [],
        ideationData: { 
            scopeText: '', 
            selectedStudyType: null, 
            generatedSuggestions: [], 
            selectedSuggestion: null,
            generationCount: 0 
        },
        clarityData: { 
            researchQuestion: '', 
            analysis: null, 
            peco: null, 
            strengths: [], 
            appliedSuggestions: {}, 
            isAnalysisCollapsed: false, 
            analysisDepth: 'standard', // 'standard', 'thorough'
            frozenComponents: {
                population: false,
                exposure: false,
                comparison: false,
                outcome: false
            }
        },
        liveCoAuthorData: { peco: { population: '', exposure: '', comparison: '', outcome: '' }, ambiguities: [] },
        pecoWorkshopData: null,
    },
    nlpTerms: [],
    nlpCurrentPage: 1,
    nlpSearchQuery: '',
    nlpSort: { key: 'term', direction: 'asc' },
    
    interactionLog: [],
    // Domain Expertise Heuristics
    heuristics: {
        comparator: "Stress the distinction between absolute thresholds (e.g., < 2 µg/dL) and relative controls (e.g., non-exposed group). Absolute values are preferred for regulatory and clinical utility.",
        exposure: "Identify the specific chemical agent, the matrix/vehicle of delivery, and the route of entry. Use 'via' for pathways.",
        population: "Explicitly define life-stage, geographic context, and any inherent vulnerability factors (e.g., genetic or socio-economic).",
        outcome: "Distinguish between apical endpoints (e.g., mortality) and molecular/intermediate biomarkers (e.g., enzyme inhibition)."
    }
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