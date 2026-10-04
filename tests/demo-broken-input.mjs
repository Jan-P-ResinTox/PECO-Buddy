/**
 * Demo: a deliberately broken AI ideation response flowing through the rigor
 * pipeline exactly as the ideation call site wires it (validate -> ONE repair
 * -> apply-only-if-clean -> non-enumerable flags -> badge markup).
 * Run: node tests/demo-broken-input.mjs
 */
import { validateIdeation, resolveIdeationRepair, attachFlags } from '../validation.js';
import { escapeHtml } from '../utils.js';

// 1. The AI returns the classic BPA defect (PW feedback, Apr 24 2026):
//    association + comparison language in one question, "baseline conditions"
//    as the comparator, degree qualifiers leaked out of every component.
const aiResponse = {
    questions: [
        {
            full_statement: 'Does elevated bisphenol A concentration correlate with higher oxidative stress indicators in HepG2 cell cultures compared with baseline conditions?',
            framing: 'association',
            population: 'HepG2 cells',
            exposure: 'bisphenol A concentration',
            comparison: 'baseline conditions',
            outcome: 'oxidative stress indicators'
        }
    ]
};
const studyType = 'In Vitro Study';

// 2. Deterministic validators fire (no LLM).
const flagged = validateIdeation(aiResponse.questions, studyType);
console.log('FLAGGED:', JSON.stringify(flagged, null, 2));

// 3. ONE repair call returns a still-defective "fix" (framing conflict remains).
const badRepair = {
    questions: [{
        full_statement: 'Does elevated bisphenol A correlate with oxidative stress indicators compared with untreated control?',
        framing: 'association',
        population: 'HepG2 cells',
        exposure: 'bisphenol A',
        comparison: 'untreated control',
        outcome: 'oxidative stress indicators'
    }]
};
const resolution = resolveIdeationRepair(aiResponse.questions, badRepair.questions, studyType);
console.log('REPAIR APPLIED:', resolution.applied, '(still dirty -> original kept)');

// 4. Residual flags ride on the payload NON-ENUMERABLY.
const residual = validateIdeation(resolution.questions, studyType);
residual.forEach(entry => attachFlags(resolution.questions[entry.index], entry.flags));

// 5. Exports/saves never persist the flags.
const exported = JSON.stringify(resolution.questions[0]);
console.log('EXPORT CONTAINS FLAGS:', exported.includes('validationFlags'));
console.log('UI READS FLAGS:', resolution.questions[0].validationFlags.length, 'flag(s)');

// 6. The badge markup the suggestion card renders (same template as renderSuggestions).
const q = resolution.questions[0];
const badges = (q.validationFlags || []).map(f =>
    `<span class="text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg" title="${escapeHtml(f.detail)}"><i class="fa-solid fa-triangle-exclamation mr-1"></i>${escapeHtml(f.code.replace(/_/g, ' '))}</span>`
).join('');
console.log('\nBADGES RENDERED ON THE CARD:');
console.log(badges);
