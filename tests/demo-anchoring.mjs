/**
 * Demo: the anchoring pipeline exactly as the app wires it — suggested terms
 * resolve deterministically against a terminology (fixture client standing in
 * for the NLM MeSH endpoint), chips render per state, the human overrides
 * deliberately, and the export carries provenance.
 * Run: node tests/demo-anchoring.mjs
 */
import {
    anchorTerms, createMeshClient, createAnchorRegistry, anchorChipHtml,
    setUserOverride, selectCandidate, buildExportAnchors, splitPecoTerms
} from '../terminology.js';

// 1. A set of AI-suggested component terms, including a delimited compound.
const extractedComponents = {
    population: 'children',
    exposure: 'lead',
    comparison: 'vehicle control',
    outcome: 'lead ; arsenic & cadmium' // & (AND) and ; (OR) split into terms
};
const terms = Object.values(extractedComponents).flatMap(splitPecoTerms);
console.log('TERMS SPLIT FOR LOOKUP:', terms);

// 2. Fixture client standing in for the NLM MeSH descriptor endpoint.
const MESH = {
    'children': [{ resource: 'http://id.nlm.nih.gov/mesh/D007223', label: 'children' }],
    'lead': [{ resource: 'http://id.nlm.nih.gov/mesh/D007852', label: 'lead' }],
    'arsenic': [{ resource: 'http://id.nlm.nih.gov/mesh/D001152', label: 'arsenic' }],
    'cadmium': [{ resource: 'http://id.nlm.nih.gov/mesh/D002104', label: 'cadmium' }],
    'vehicle control': [] // no ontology concept — the human decides
};
const client = createMeshClient({
    fetchImpl: async (url) => {
        const label = decodeURIComponent(String(url).match(/label=([^&]*)/)?.[1] || '');
        return { ok: true, json: async () => MESH[label] || [] };
    }
});

// 3. Deterministic resolution: parallel, never throwing, results cached.
const registry = createAnchorRegistry();
const summary = await anchorTerms(terms, { client, registry });
console.log('RESOLUTION SUMMARY:', JSON.stringify(summary));
for (const t of terms) {
    const e = registry.get(t);
    console.log(`  ${t.padEnd(16)} -> ${e.state}${e.anchor ? ` ${e.anchor.system} ${e.anchor.code}` : ''}`);
}

// 4. The chips the UI renders next to each term.
console.log('\nCHIPS RENDERED:');
for (const t of terms) {
    console.log(`  ${t}: ${anchorChipHtml(registry.get(t)).slice(0, 120)}...`);
}

// 5. The human decides on the unanchored comparator: deliberate free text.
setUserOverride(registry, 'vehicle control');
console.log('\nAFTER HUMAN OVERRIDE ("vehicle control"):');
console.log('  ', anchorChipHtml(registry.get('vehicle control')).slice(0, 120), '...');

// 6. A partial match would open the candidate picker; here the human picks.
registry.set({
    term: 'oxidative stress', state: 'partial', anchor: null, source: 'mesh',
    candidates: [{ system: 'MeSH', code: 'D018486', display: 'Oxidative Stress', score: 60 }]
});
selectCandidate(registry, 'oxidative stress', registry.get('oxidative stress').candidates[0]);
console.log('AFTER HUMAN PICK ("oxidative stress"):');
console.log('  ', anchorChipHtml(registry.get('oxidative stress')).slice(0, 120), '...');

// 7. The nanopublication export carries durable anchor provenance.
const exportTerms = Object.values(extractedComponents).flatMap(splitPecoTerms).concat(['oxidative stress']);
const exported = buildExportAnchors(exportTerms, registry);
console.log('\nEXPORTED PROTOCOL ANCHORS (durable, JSON-serialisable):');
console.log(JSON.stringify(exported, null, 2));
