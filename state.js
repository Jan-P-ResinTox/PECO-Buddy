/**
 * Storage that never kills the app. Accessing window.localStorage can itself
 * throw (Safari on file://, locked-down corporate browsers, Node) — a
 * typeof-check does not protect against a throwing getter, so probe it.
 * On failure the app runs on an in-memory store: the session works until
 * the tab closes instead of dying at startup.
 */
export const safeStorage = (() => {
    try {
        const s = window.localStorage;
        const probe = '__peco_buddy_probe__';
        s.setItem(probe, probe);
        s.removeItem(probe);
        return s;
    } catch (_) {
        const mem = new Map();
        return {
            getItem: (k) => (mem.has(k) ? mem.get(k) : null),
            setItem: (k, v) => { mem.set(k, String(v)); },
            removeItem: (k) => { mem.delete(k); }
        };
    }
})();

// Settings read through the guarded accessor (Node regression suite import).
const store = safeStorage;
const readStore = (key) => { try { return store.getItem(key); } catch (e) { return null; } };

export const appState = {
    currentMode: 'peco_toolkit',
    analysisEngine: 'ai', // 'ai' or 'nlp'
    showTooltips: true,
    fontSize: readStore('peco_buddy_font_size') || 'md', // sm, md, lg
    assistanceLevel: parseInt(readStore('peco_buddy_assistance_level') || '3'), // 1 (Min) to 5 (Max)
    autonomyLevel: parseFloat(readStore('peco_buddy_autonomy_level') || '0'), // 0.0 (Clerk) to 1.0 (Architect)
    globalSeed: parseInt(readStore('peco_buddy_seed') || '42'),
    topP: parseFloat(readStore('peco_buddy_top_p') || '0.95'), // Nucleus sampling; providers require top_p = 1 during greedy sampling (temperature 0)
    maxTokens: parseInt(readStore('peco_buddy_max_tokens') || '4096', 10), // Response token budget
    
    // AI Provider Configuration
    aiProvider: readStore('peco_buddy_ai_provider') || 'gemini', 
    geminiModel: readStore('peco_buddy_gemini_model') || 'gemini-3.1-flash-lite',
    aiBaseUrl: readStore('peco_buddy_ai_base_url') || '',
    aiModel: readStore('peco_buddy_ai_model') || '',
    globalApiKey: readStore('peco_buddy_api_key') || '', 
    openaiKey: readStore('peco_buddy_openai_key') || '',
    openaiModel: readStore('peco_buddy_openai_model') || '',
    anthropicKey: readStore('peco_buddy_anthropic_key') || '',
    anthropicModel: readStore('peco_buddy_anthropic_model') || '',
    perplexityKey: readStore('peco_buddy_perplexity_key') || '',
    perplexityModel: readStore('peco_buddy_perplexity_model') || '',
    mistralKey: readStore('peco_buddy_mistral_key') || '',
    mistralModel: readStore('peco_buddy_mistral_model') || '',
    
    // General Settings
    stripMetadata: readStore('peco_buddy_strip_metadata') === 'true',
    matrixTagging: readStore('peco_buddy_matrix_tagging') !== 'false', // {matrix:...} tagging in AI output and rendering

    // Ontology Anchoring (deterministic terminology resolution of AI terms)
    terminologyAnchoring: readStore('peco_buddy_terminology_anchoring') !== 'false',
    terminologyMeshBase: readStore('peco_buddy_terminology_mesh_base') || '', // empty = NLM default endpoint

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
            framing: null, // estimand framing chosen at ideation: group_contrast | dose_response | association | descriptive
            validationFlags: [], // residual deterministic rigor flags surfaced to the user
            analysis: null, 
            peco: null, 
            strengths: [], 
            appliedSuggestions: {}, 
            isAnalysisCollapsed: false, 
            analysisDepth: 'standard', // 'fast', 'standard'
            skipAutoAnalysis: false, // one-shot flag: render handed-over PECO without auto-running analysis
            frozenComponents: {
                population: false,
                exposure: false,
                comparison: false,
                outcome: false
            }
        },
        liveCoAuthorData: { peco: { population: '', exposure: '', comparison: '', outcome: '' }, ambiguities: [], anchors: { population: {}, exposure: {}, comparison: {}, outcome: {} } },
        pecoWorkshopData: null,
    },
    nlpTerms: (() => { try { const loaded = JSON.parse(readStore('peco_buddy_nlp_terms') || '[]'); return Array.isArray(loaded) ? loaded : []; } catch (e) { return []; } })(),

    interactionLog: [],
    // Domain Expertise Heuristics — user-editable in Settings, persisted so a
    // refresh no longer discards customised expert rules.
    heuristics: (() => {
        const defaults = {
            comparator: "Stress the distinction between absolute thresholds (e.g., < 2 µg/dL) and relative controls (e.g., non-exposed group). Absolute values are preferred for regulatory and clinical utility.",
            exposure: "Identify the specific chemical agent, the matrix/vehicle of delivery, and the route of entry. Use 'via' for pathways.",
            population: "Explicitly define life-stage, geographic context, and any inherent vulnerability factors (e.g., genetic or socio-economic).",
            outcome: "Distinguish between apical endpoints (e.g., mortality) and molecular/intermediate biomarkers (e.g., enzyme inhibition)."
        };
        try {
            const saved = JSON.parse(readStore('peco_buddy_heuristics') || 'null');
            return (saved && typeof saved === 'object') ? { ...defaults, ...saved } : defaults;
        } catch (e) { return defaults; }
    })()
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