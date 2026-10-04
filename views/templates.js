
export const templates = {
    pecoToolkit: `
        <div class="w-full">
            <div id="step-ideation" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">Step 1 <i class="fa-solid fa-check step-done-icon" aria-hidden="true"></i></div>
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Ideation</h3>
                        <p class="text-[12px] text-slate-500 uppercase font-bold tracking-widest">Define research scope and methodology</p>
                    </div>
                </div>
                <div class="step-content"></div>
            </div>
            <div id="step-clarity" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">Step 2 <i class="fa-solid fa-check step-done-icon" aria-hidden="true"></i></div>
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Analysis</h3>
                        <p class="text-[12px] text-slate-500 uppercase font-bold tracking-widest">Extraction, logic audit & advisory</p>
                    </div>
                </div>
                <div class="step-content"></div>
            </div>
            <div id="step-peco-workshop" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">Step 3 <i class="fa-solid fa-check step-done-icon" aria-hidden="true"></i></div>
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Outputs</h3>
                        <p class="text-[12px] text-slate-500 uppercase font-bold tracking-widest">Protocol validation and transparency report</p>
                    </div>
                </div>
                <div class="step-content"></div>
            </div>
        </div>
    `,
    ideationView: `
        <div class="space-y-12">
            <div class="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 shadow-inner">
                <label class="block text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-6">Broad Research Scope</label>
                <textarea id="ideation-scope-input" class="w-full p-8 text-xl font-bold border-none rounded-[2rem] bg-white shadow-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all min-h-[160px]" placeholder="e.g., Effect of prenatal lead exposure on IQ in children..."></textarea>
                <div class="mt-6 space-y-3">
                    <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Try an example</p>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" class="ideation-example-chip bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-bold text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-all" data-scope="Effect of asbestos on lung health in mine workers">Asbestos &amp; lung health in mine workers</button>
                        <button type="button" class="ideation-example-chip bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-bold text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-all" data-scope="Lead exposure and children's IQ">Lead exposure &amp; children's IQ</button>
                        <button type="button" class="ideation-example-chip bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-bold text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-all" data-scope="Effect of bisphenol A on oxidative stress in HepG2 cells">Bisphenol A &amp; oxidative stress in HepG2 cells</button>
                    </div>
                    <p class="text-[10px] text-slate-400 leading-relaxed">New here? Describe the research scope in one or two broad sentences &mdash; the Ideation Engine suggests three structurally distinct questions for you to refine.</p>
                </div>
            </div>
            <div id="ideation-phase-study-type" class="animate-fade-in space-y-10">
                <div class="flex justify-between items-center">
                    <label class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest">Study Methodology</label>
                </div>
                <div id="study-type-selector"></div>
            </div>
            <div class="flex flex-col gap-4">
                <button id="generate-ideation-btn" class="w-full bg-teal-600 text-white py-6 rounded-[2.5rem] font-extrabold uppercase text-sm tracking-widest shadow-xl hover:bg-teal-700 transition-all">Generate Suggestions</button>
                <button id="continue-own-question-btn" class="w-full bg-white text-slate-500 border border-slate-200 py-4 rounded-[2.5rem] font-extrabold uppercase text-xs tracking-widest hover:bg-slate-50 hover:text-slate-700 transition-all" disabled>Continue with my own question</button>
                <p id="generate-hint" class="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest min-h-[1rem]"></p>
            </div>
            <div id="ideation-results-container" class="space-y-6"></div>
        </div>
    `,
    clarityView: `
        <div class="w-full space-y-12">
            <div id="analysis-control-hub" class="bg-white p-12 rounded-[3rem] border shadow-sm">
                <div class="flex justify-between items-center mb-10">
                   <h4 class="text-[12px] font-extrabold uppercase text-slate-400 tracking-widest flex items-center gap-3">
                        <i class="fa-solid fa-brain text-teal-600"></i> Refine PECO Components
                    </h4>
                    <div class="depth-selector" id="depth-selector-group">
                        <button class="depth-btn" data-depth="fast">Fast</button>
                        <button class="depth-btn active" data-depth="standard">Standard</button>
                    </div>
                    <p class="text-[10px] text-slate-400 font-bold mt-3 text-right uppercase tracking-widest">Fast is without Reasoning</p>
                </div>
                <div id="clarity-statement-section" class="mb-8">
                    <label class="block text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Research Question (Read Only)</label>
                    <div id="research-question-display" class="w-full text-lg font-bold p-8 rounded-[2rem] border bg-slate-50/50 italic leading-relaxed shadow-inner min-h-[100px]"></div>
                </div>
                <div class="flex flex-col gap-8">
                    <button id="score-clarity-btn" class="w-full bg-teal-600 text-white py-6 rounded-[2.5rem] font-extrabold uppercase text-xs tracking-widest shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-4">
                        <i class="fa-solid fa-play"></i> Re-Analyse
                    </button>
                </div>
            </div>
            <div id="clarity-dashboard-container"></div>
            <div id="clarity-footer-container"></div>
        </div>
    `,
    pecoWorkshopView: `
        <div class="w-full space-y-12">
            <div class="bg-white p-14 rounded-[3.5rem] border shadow-card text-center space-y-10">
                <div class="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                    <i class="fa-solid fa-award fa-4x"></i>
                </div>
                <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight">Final PECO Question</h2>
                <div id="final-question-display" class="text-2xl font-bold italic text-slate-700 leading-relaxed bg-slate-50 p-12 rounded-[2.5rem] border border-slate-100 shadow-inner"></div>
            </div>
            <div id="final-peco-display"></div>
            <div class="flex flex-col sm:flex-row gap-6">
                <button id="show-transparency-log-workshop-btn" class="flex-1 bg-white border border-slate-200 text-slate-600 py-6 rounded-[2rem] font-extrabold uppercase text-[12px] tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-4">
                    <i class="fa-solid fa-scroll"></i> View Interaction Trace
                </button>
                <button id="view-transparency-report-btn" class="flex-1 bg-teal-600 text-white py-6 rounded-[2rem] font-extrabold uppercase text-[12px] tracking-widest shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-4">
                    <i class="fa-solid fa-file-contract"></i> Full Transparency Report
                </button>
            </div>
        </div>
    `,
    settingsView: `
        <div class="p-4 space-y-12">
            <div class="flex border-b border-slate-200">
                <button class="settings-tab-btn active px-8 py-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-500" data-tab="general">General</button>
                <button class="settings-tab-btn px-8 py-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-500" data-tab="heuristics">Heuristics & Controls</button>
            </div>

            <div id="settings-tab-general" class="settings-tab-content space-y-12 pt-6">
                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Typography & Display Scale</h4>
                    <div class="grid grid-cols-3 gap-6">
                        <button class="font-size-btn border-2 rounded-2xl transition-all" data-size="sm">
                            <span class="btn-preview font-bold text-slate-800">Abc</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Small</span>
                        </button>
                        <button class="font-size-btn border-2 rounded-2xl transition-all" data-size="md">
                            <span class="btn-preview font-bold text-slate-800">Abc</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Medium</span>
                        </button>
                        <button class="font-size-btn border-2 rounded-2xl transition-all" data-size="lg">
                            <span class="btn-preview font-bold text-slate-800">Abc</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Large</span>
                        </button>
                    </div>
                </section>

                <!-- Data Privacy Section Hidden for Beta (Reviewer Toolkit Not Active) -->
                <!--
                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Data Privacy</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                        <div>
                            <label class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Strip Metadata</label>
                            <p class="text-[10px] text-slate-400 mt-1">Automatically remove author, date, and email metadata from uploaded files before analysis.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="settings-strip-metadata-toggle" class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                    </div>
                </section>
                -->

                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Semantic Formatting</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                        <div class="mr-6">
                            <label class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Matrix Tagging</label>
                            <p class="text-[10px] text-slate-400 mt-1 leading-relaxed">Tags biological matrices and measurement sites as {matrix:in:maternal blood} in AI output and rendering. Disable for plain descriptive text throughout.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="settings-matrix-tagging-toggle" class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                    </div>
                </section>

                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Ontology Anchoring</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex items-center justify-between mb-6">
                        <div class="mr-6">
                            <label class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Anchor Terms in MeSH</label>
                            <p class="text-[10px] text-slate-400 mt-1 leading-relaxed">Every suggested term is resolved against the NLM MeSH descriptor lookup, so suggestions carry verified ontology codes instead of plausible guesses. Unanchored terms are visibly flagged — you can deliberately accept any term as unverified free text, and provenance travels with exports.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="settings-terminology-toggle" class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                    </div>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <label for="settings-terminology-mesh-base" class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">MeSH Lookup Endpoint</label>
                        <p class="text-[10px] text-slate-400 mt-1 mb-3 leading-relaxed">Leave empty for the NLM public endpoint (id.nlm.nih.gov). Point at an internal terminology server if the working group hosts one.</p>
                        <input type="text" id="settings-terminology-mesh-base" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="https://id.nlm.nih.gov/mesh/lookup/descriptor">
                    </div>
                </section>

                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Co-Author Assistance Level</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-6">
                        <div class="flex justify-between items-end mb-4">
                            <label for="settings-assistance-slider" class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Logic Depth & Rigor</label>
                            <span id="assistance-level-display" class="text-sm font-bold text-teal-600">Standard</span>
                        </div>
                        <input type="range" id="settings-assistance-slider" min="1" max="5" step="1" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mb-2">
                        <div class="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Minimal</span>
                            <span>Standard</span>
                            <span>Intense</span>
                        </div>
                    </div>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div class="flex justify-between items-end mb-4">
                            <label for="settings-temperature-slider" class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Autonomy & Creativeness (Tether)</label>
                            <span id="temperature-level-display" class="text-sm font-bold text-teal-600">0.0 (Strict Clerk)</span>
                        </div>
                        <input type="range" id="settings-temperature-slider" min="0" max="10" step="1" value="0" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mb-2">
                        <div class="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Strict Clerk (0.0)</span>
                            <span>Balanced (0.5)</span>
                            <span>Creative Architect (1.0)</span>
                        </div>
                        <p class="text-[10px] text-slate-500 mt-4 leading-relaxed">Lower values apply strict "Zero-Shot Prohibition" and tether the model to exact data mimicking a purely clerical parser. Higher values allow creative synthesis and "Dialectical Partner" autonomy for ideation workflows.</p>
                    </div>
                </section>
                
                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Sampling &amp; Token Budget</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-6">
                        <div class="flex justify-between items-end mb-4">
                            <label for="settings-topp-slider" class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Nucleus Sampling (Top-P)</label>
                            <span id="topp-level-display" class="text-sm font-bold text-teal-600">0.95</span>
                        </div>
                        <input type="range" id="settings-topp-slider" min="5" max="100" step="5" value="95" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mb-2">
                        <div class="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Focused (0.05)</span>
                            <span>Balanced (0.95)</span>
                            <span>Full Distribution (1.0)</span>
                        </div>
                        <p class="text-[10px] text-slate-500 mt-4 leading-relaxed">Restricts sampling to the most probable token mass. Note: at Autonomy 0.0 (greedy/temperature 0) providers require top_p of 1, so the custom value is omitted automatically for those calls.</p>
                    </div>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div class="flex justify-between items-end mb-4">
                            <label for="settings-maxtokens-slider" class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Response Token Budget (Max Tokens)</label>
                            <span id="maxtokens-level-display" class="text-sm font-bold text-teal-600">4096</span>
                        </div>
                        <input type="range" id="settings-maxtokens-slider" min="512" max="16384" step="256" value="4096" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mb-2">
                        <div class="flex items-center gap-4 mt-4">
                            <span class="text-[10px] font-bold text-slate-400 uppercase">Manual Input:</span>
                            <input type="number" id="settings-maxtokens-input" value="4096" min="256" max="65536" class="w-28 p-2 border rounded-lg text-xs">
                        </div>
                        <p class="text-[10px] text-slate-500 mt-4 leading-relaxed">Caps the maximum length of each provider response. Lower it for faster, cheaper responses. Large structured outputs (PECO advisory cards) automatically request a minimum of 8192 tokens so they are never truncated mid-JSON.</p>
                    </div>
                </section>

                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Generation Variance</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div class="flex justify-between items-center mb-4">
                            <label for="settings-seed-slider" class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest">Variance Seed</label>
                            <span id="settings-seed-display" class="text-[12px] font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded border border-teal-100">42</span>
                        </div>
                        <input type="range" id="settings-seed-slider" min="0" max="1000" value="42" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600">
                        <div class="flex items-center gap-4 mt-4">
                            <span class="text-[10px] font-bold text-slate-400 uppercase">Manual Input:</span>
                            <input type="number" id="settings-seed-input" value="42" class="w-24 p-2 border rounded-lg text-xs">
                        </div>
                        <p class="text-[10px] text-slate-400 mt-2">Adjusting the seed changes the randomization of AI suggestions. Keep constant for reproducible results.</p>
                    </div>
                </section>

                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Scientific Engine Selection</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <button id="modal-engine-ai-btn" class="p-10 border rounded-[2.5rem] text-left transition-all hover:shadow-lg relative group bg-white">
                            <div class="active-check absolute top-8 right-8 text-teal-600 transition-opacity"><i class="fa-solid fa-circle-check fa-xl"></i></div>
                            <i class="fa-solid fa-brain text-teal-600 text-5xl mb-8"></i>
                            <p class="font-extrabold text-slate-800 uppercase text-[13px] tracking-widest mb-3">AI Co-Author</p>
                            <p class="text-[14px] text-slate-500 leading-relaxed">Advanced logic deconstruction and advisory engine.</p>
                        </button>
                        <button id="modal-engine-nlp-btn" class="p-10 border rounded-[2.5rem] text-left transition-all hover:shadow-lg relative group bg-white">
                            <div class="active-check absolute top-8 right-8 text-teal-600 transition-opacity opacity-0"><i class="fa-solid fa-circle-check fa-xl"></i></div>
                            <i class="fa-solid fa-sliders text-teal-600 text-5xl mb-8"></i>
                            <p class="font-extrabold text-slate-800 uppercase text-[13px] tracking-widest mb-3">NLP Vocabulary</p>
                            <p class="text-[14px] text-slate-500 leading-relaxed">Local dictionary matching for strict parameter control.</p>
                        </button>
                    </div>
                </section>

                <section class="space-y-10 pt-12 border-t">
                    <div class="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-inner">
                        <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                            <i class="fa-solid fa-network-wired text-teal-600"></i> AI Provider Configuration
                        </h4>
                        
                        <div class="mb-6">
                            <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Select Provider</label>
                            <select id="settings-provider-select" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:border-teal-500 shadow-sm">
                                <option value="gemini">Google Gemini (Official)</option>
                                <option value="openai">OpenAI (Native)</option>
                                <option value="anthropic">Anthropic Claude (Native)</option>
                                <option value="perplexity">Perplexity (Native)</option>
                                <option value="mistral">Mistral AI (Native)</option>
                                <option value="local">Local LLM / Custom Endpoint</option>
                            </select>
                        </div>

                        <div id="settings-config-fields" class="space-y-4">
                            <!-- Gemini Fields -->
                            <div id="field-group-gemini" class="provider-field-group space-y-4">
                                <div>
                                    <div class="flex justify-between items-end mb-2">
                                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Gemini API Key</label>
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline">Get your API-Key here</a>
                                    </div>
                                    <input type="password" id="input-gemini-key" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="Paste Google API Key...">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Gemini Model Checkpoint (Pinned)</label>
                                    <select id="settings-gemini-model" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-bold outline-none focus:border-teal-500 shadow-sm">
                                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Pinned Stable & Fast - Recommended)</option>
                                        <option value="gemini-flash-latest">Gemini Flash Latest</option>
                                        <option value="gemini-3.8-flash">Gemini 3.8 Flash (Deep Reasoning)</option>
                                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Complex Protocol Logic)</option>
                                    </select>
                                    <p class="text-[10px] text-slate-400 mt-2 ml-2">Version 0.1.0 pins stable snapshots to eliminate upstream dynamic alias drift and deserialization prolixity.</p>
                                </div>
                            </div>

                            <!-- OpenAI Fields -->
                            <div id="field-group-openai" class="provider-field-group hidden space-y-4">
                                <div>
                                    <div class="flex justify-between items-end mb-2">
                                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">OpenAI API Key</label>
                                        <a href="https://platform.openai.com/api-keys" target="_blank" class="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline">Get your API-Key here</a>
                                    </div>
                                    <input type="password" id="input-openai-key" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="Paste OpenAI API Key...">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Model Name</label>
                                    <input type="text" id="input-openai-model" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="e.g. gpt-4o">
                                </div>
                            </div>
                            
                            <!-- Anthropic Fields -->
                            <div id="field-group-anthropic" class="provider-field-group hidden space-y-4">
                                <div>
                                    <div class="flex justify-between items-end mb-2">
                                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Anthropic API Key</label>
                                        <a href="https://console.anthropic.com/settings/keys" target="_blank" class="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline">Get your API-Key here</a>
                                    </div>
                                    <input type="password" id="input-anthropic-key" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="Paste Anthropic API Key...">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Model Name</label>
                                    <input type="text" id="input-anthropic-model" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="e.g. claude-3-7-sonnet-20250219">
                                </div>
                            </div>

                            <!-- Perplexity Fields -->
                            <div id="field-group-perplexity" class="provider-field-group hidden space-y-4">
                                <div>
                                    <div class="flex justify-between items-end mb-2">
                                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Perplexity API Key</label>
                                        <a href="https://www.perplexity.ai/settings/api" target="_blank" class="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline">Get your API-Key here</a>
                                    </div>
                                    <input type="password" id="input-perplexity-key" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="Paste Perplexity API Key...">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Model Name</label>
                                    <input type="text" id="input-perplexity-model" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="e.g. sonar-pro">
                                </div>
                            </div>

                            <!-- Mistral Fields -->
                            <div id="field-group-mistral" class="provider-field-group hidden space-y-4">
                                <div>
                                    <div class="flex justify-between items-end mb-2">
                                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Mistral API Key</label>
                                        <a href="https://console.mistral.ai/api-keys/" target="_blank" class="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline">Get your API-Key here</a>
                                    </div>
                                    <input type="password" id="input-mistral-key" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="Paste Mistral API Key...">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Model Name</label>
                                    <input type="text" id="input-mistral-model" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="e.g. mistral-large-latest">
                                    <p class="text-[10px] text-slate-400 mt-2 ml-2">Common checkpoints: mistral-large-latest, mistral-small-latest, open-mistral-nemo.</p>
                                </div>
                            </div>

                            <!-- Custom/Local Fields -->
                            <div id="field-group-custom" class="provider-field-group hidden space-y-4">
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Base URL</label>
                                    <input type="text" id="input-custom-url" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="e.g. http://localhost:11434/v1">
                                    <p class="text-[10px] text-slate-400 mt-2 ml-2">Default Ollama: http://localhost:11434/v1 | LM Studio: http://localhost:1234/v1</p>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Model Name</label>
                                    <input type="text" id="input-custom-model" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="e.g. llama3, gpt-4, mistral">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">API Key (Optional for Local)</label>
                                    <input type="password" id="input-custom-key" class="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-mono shadow-sm" placeholder="Bearer Token / API Key">
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-4 mt-8">
                             <button id="save-provider-config-btn" class="flex-grow py-4 bg-slate-800 text-white rounded-[1.5rem] text-[11px] font-extrabold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg">Save Configuration</button>
                             <button id="reset-provider-config-btn" class="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-[1.5rem] text-[11px] font-extrabold uppercase tracking-widest hover:bg-slate-50 transition-all">Reset</button>
                        </div>
                        
                        <div id="provider-status-display" class="hidden mt-6 p-4 rounded-2xl text-center bg-emerald-50 border border-emerald-100">
                             <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Settings Saved</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-8">Connection Self-Test</h4>
                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                        <div>
                            <label class="text-[12px] font-extrabold text-slate-500 uppercase tracking-widest block mb-2">Connection Self-Test</label>
                            <p class="text-[10px] text-slate-400 leading-relaxed">Verify that the configured AI provider responds correctly.</p>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <button id="test-ai-connection-btn" class="flex-1 py-4 bg-slate-800 text-white rounded-[1.5rem] text-[11px] font-extrabold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg">Test AI Provider</button>
                        </div>
                        <div class="space-y-2 text-xs font-bold">
                            <p id="ai-connection-status" class="text-slate-400">AI provider: not tested yet.</p>
                        </div>
                    </div>
                </section>
            </div>

            <div id="settings-tab-heuristics" class="settings-tab-content space-y-8 pt-6 hidden">
                <header class="mb-10">
                    <h4 class="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Scientific Heuristics Control</h4>
                    <p class="text-sm text-slate-500 leading-relaxed">Modify the expert rules used for critiques. Changes here directly influence the Co-Author's advisory logic.</p>
                </header>
                
                <div class="space-y-8" id="heuristics-editor-container">
                    <div class="heuristic-card p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                        <label class="block text-[11px] font-extrabold text-teal-600 uppercase tracking-widest">Comparator Logic</label>
                        <textarea id="heuristic-comparator" class="w-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-4 focus:ring-teal-500/10 outline-none" rows="3"></textarea>
                    </div>
                    <div class="heuristic-card p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                        <label class="block text-[11px] font-extrabold text-teal-600 uppercase tracking-widest">Exposure Specificity</label>
                        <textarea id="heuristic-exposure" class="w-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-4 focus:ring-teal-500/10 outline-none" rows="3"></textarea>
                    </div>
                    <div class="heuristic-card p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                        <label class="block text-[11px] font-extrabold text-teal-600 uppercase tracking-widest">Population Standards</label>
                        <textarea id="heuristic-population" class="w-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-4 focus:ring-teal-500/10 outline-none" rows="3"></textarea>
                    </div>
                    <div class="heuristic-card p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                        <label class="block text-[11px] font-extrabold text-teal-600 uppercase tracking-widest">Outcome Definitions</label>
                        <textarea id="heuristic-outcome" class="w-full p-6 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed focus:ring-4 focus:ring-teal-500/10 outline-none" rows="3"></textarea>
                    </div>
                </div>

                <button id="save-heuristics-btn" class="w-full bg-teal-600 text-white py-6 rounded-[2.5rem] font-extrabold uppercase text-xs tracking-widest shadow-xl hover:bg-teal-700 transition-all">Apply Rules to Engine</button>
            </div>
        </div>
    `,
    userManualView: `
        <div class="flex h-[70vh] overflow-hidden bg-white rounded-b-2xl">
            <!-- Sidebar Navigation -->
            <div class="w-1/3 bg-slate-50 border-r border-slate-200 overflow-y-auto p-6 space-y-2 shrink-0">
                <h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 px-2">Manual Sections</h4>
                <a href="#manual-intro" class="block px-4 py-3 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors">1. Welcome to PECO-Buddy Closed Pilot Alpha 0.1.0</a>
                <a href="#manual-step1" class="block px-4 py-3 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors">2. Step 1: Brainstorming (Ideation)</a>
                <a href="#manual-step2" class="block px-4 py-3 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors">3. Step 2: Checking the Work (Logic Audit)</a>
                <a href="#manual-step3" class="block px-4 py-3 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors">4. Step 3: The Final Result (Outputs)</a>
                <a href="#manual-settings" class="block px-4 py-3 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors">5. Settings & AI Models</a>
            </div>
            
            <!-- Main Content Area -->
            <div class="w-2/3 overflow-y-auto p-8 space-y-12 scroll-smooth">
                <div class="relative mb-8">
                    <input type="text" id="manual-search-input" class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Search the manual...">
                    <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                </div>

                <section id="manual-intro" class="manual-section space-y-4">
                    <h5 class="text-xl font-extrabold text-teal-600">1. Welcome to PECO-Buddy Closed Pilot Alpha 0.1.0!</h5>
                    <p class="text-slate-600 text-sm leading-relaxed">PECO-Buddy is a cognitive scaffolding instrument designed for researchers, environmental toxicologists, and systematic reviewers. Grounded in the principle that semantic sovereignty must remain strictly with the human investigator, it assists in translating unstructured research questions into validated, MeSH-aligned PECO scoping matrices conforming to National Toxicology Program (NTP) Office of Health Assessment and Translation (OHAT) standards.</p>
                    <ul class="list-disc pl-5 text-slate-600 text-sm space-y-2">
                        <li><strong>P (Population):</strong> Who or what is being investigated (species, strain, cohort, life-stage, geographic context).</li>
                        <li><strong>E (Exposure):</strong> Environmental, chemical, or pharmaceutical agent with delivery vehicle/matrix and pathway.</li>
                        <li><strong>C (Comparator):</strong> Unexposed baseline, vehicle control, or alternative reference threshold.</li>
                        <li><strong>O (Outcome):</strong> Biological, toxicological, or clinical endpoint (distinguishing apical manifestations from molecular biomarkers).</li>
                    </ul>
                </section>

                <section id="manual-step1" class="manual-section space-y-4">
                    <h5 class="text-xl font-extrabold text-teal-600">2. Step 1: Brainstorming (Ideation)</h5>
                    <p class="text-slate-600 text-sm leading-relaxed">Define the initial broad research scope and select your intended methodology (Systematic Review, In Vivo Animal, In Vitro, or Epidemiological Cohort). The Ideation Engine generates 3 structurally distinct research questions ending with formal interrogatives, mapping components without ungrounded extrapolations.</p>
                </section>

                <section id="manual-step2" class="manual-section space-y-4">
                    <h5 class="text-xl font-extrabold text-teal-600">3. Step 2: Checking the Work (Logic Audit)</h5>
                    <p class="text-slate-600 text-sm leading-relaxed">The Logic Audit Engine examines components for ambiguity reduction. It provides 5 to 6 advisory cards per component with detailed scientific justifications and counter-considerations. You can freeze components that meet your criteria and synchronize suggestions directly into your protocol.</p>
                </section>

                <section id="manual-step3" class="manual-section space-y-4">
                    <h5 class="text-xl font-extrabold text-teal-600">4. Step 3: The Final Result (Outputs)</h5>
                    <p class="text-slate-600 text-sm leading-relaxed">View the final synthesised research question and PECO matrix. Generate a complete Transparency Report documenting interaction logs, timestamps, engine models, and applied heuristics. Exports are available in JSON, PDF, and clipboard format.</p>
                </section>

                <section id="manual-settings" class="manual-section space-y-4">
                    <h5 class="text-xl font-extrabold text-teal-600">5. Settings, AI Models & Sovereign Architecture</h5>
                    <p class="text-slate-600 text-sm leading-relaxed">Configure provider endpoints, API keys, temperature autonomy, top-P nucleus sampling, token budget, seed variance, and model checkpoints. Version 0.1.0 supports Google Gemini (with pinned models), Anthropic, OpenAI, Perplexity, Mistral AI, and Sovereign Local AI (Ollama, LM Studio, vLLM) for on-premises privacy.</p>
                </section>
            </div>
        </div>
    `,
    versionRationaleView: `
        <div class="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
            <div class="border-b pb-4">
                <span class="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">Post-Mortem & Methodological Commentary</span>
                <h4 class="text-2xl font-extrabold text-slate-800 tracking-tight mt-2">PECO-Buddy Closed Pilot Alpha 0.1.0: Remediation & Architecture</h4>
                <p class="text-xs text-slate-500 mt-1">Reference: Jan-Peter Nilsson (Sept 2026), <em>"Upstream API Drift and the Fragility of AI in Evidence Synthesis: A Post-Mortem Analysis of the PECO-Buddy Implementation Failure."</em> Evidence-Based Toxicology.</p>
            </div>

            <div class="space-y-4">
                <h5 class="text-sm font-extrabold uppercase tracking-widest text-slate-700">1. Forensic Root-Cause Analysis (Beta 0.1.1 Failure Vectors)</h5>
                <p class="text-xs text-slate-600 leading-relaxed">Following ethics clearance in August 2026, pre-flight audits revealed systemic operational failure across commercial preview infrastructure while local application code remained unchanged. Five failure vectors were identified and remediated:</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <strong class="text-rose-700 block">Vector 1: Dynamic Alias Rerouting</strong>
                        <p class="text-slate-600">Targeting dynamic aliases (<code>gemini-flash-preview</code>) exposed backend to unannounced pointer shifts toward conversational builds (3.5/3.6/3.7), introducing narrative wrappers and ungrounded hallucinations.</p>
                        <span class="text-teal-700 font-bold block pt-1">Fix: Pinned stable checkpoints (<code>gemini-3.1-flash-lite</code>, <code>gemini-flash-latest</code>) and local model support.</span>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <strong class="text-rose-700 block">Vector 2: Deprecated Response-Format Schemas</strong>
                        <p class="text-slate-600">Upstream architectural updates silently ignored legacy formatting flags, returning discursive preambles (<em>"Certainly! Here is an evidence-based PECO..."</em>) that crashed JSON deserialization.</p>
                        <span class="text-teal-700 font-bold block pt-1">Fix: Upgraded to @google/genai Type schema enforcement & resilient multi-pass JSON cleansing.</span>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <strong class="text-rose-700 block">Vector 3: Multi-Turn Parameter Stripping</strong>
                        <p class="text-slate-600">SDK session abstractions retained conversation text but dropped systemInstruction and hyperparameters (temp 0.2, top-p 0.8), defaulting to unconstrained generalist behavior.</p>
                        <span class="text-teal-700 font-bold block pt-1">Fix: Immutable zero-inference boundary re-injected on every inference turn.</span>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <strong class="text-rose-700 block">Vector 4: Botnet Mitigation & API Throttling</strong>
                        <p class="text-slate-600">Screening heuristics classified rapid syntactically parallel toxicological batches as synthetic traffic, triggering socket terminations and <code>block_reason: OTHER</code>.</p>
                        <span class="text-teal-700 font-bold block pt-1">Fix: Exponential backoff retries with jitter + zero-throttle sovereign on-premises execution.</span>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 md:col-span-2">
                        <strong class="text-rose-700 block">Vector 5: False-Positive Safety Railguards on Toxicological Lexicons</strong>
                        <p class="text-slate-600">Lowered detection thresholds flagged legitimate hazard descriptors (<em>acute lethal hazard, organ system vulnerability, toxic metabolic intermediate, cord-blood lead</em>) as safety policy violations.</p>
                        <span class="text-teal-700 font-bold block pt-1">Fix: Configured permissive academic research safety profile (<code>BLOCK_NONE</code> across all categories) and diagnostic guidance for sovereign local runtimes.</span>
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                <h5 class="text-sm font-extrabold uppercase tracking-widest text-slate-700">2. The Three-Tier Sovereign Evidence Architecture</h5>
                <div class="space-y-3 text-xs">
                    <div class="p-4 bg-teal-50/60 rounded-2xl border border-teal-100">
                        <strong class="text-teal-800 block text-xs">Layer 1: Deterministic Ontological Grounding</strong>
                        <p class="text-slate-600 mt-0.5">Pre-inference normalization validating chemical identifiers and CAS numbers against PubChem / EPA CompTox and mapping biological endpoints to MeSH, SNOMED CT, and LOINC.</p>
                    </div>
                    <div class="p-4 bg-teal-50/60 rounded-2xl border border-teal-100">
                        <strong class="text-teal-800 block text-xs">Layer 2: Sovereign Open-Weight Inference</strong>
                        <p class="text-slate-600 mt-0.5">Direct integration with institutional inference servers hosting frozen checkpoints (Llama 3.3, BioMistral, Meditron on Ollama or vLLM) ensuring weight immutability across multi-year systematic reviews.</p>
                    </div>
                    <div class="p-4 bg-teal-50/60 rounded-2xl border border-teal-100">
                        <strong class="text-teal-800 block text-xs">Layer 3: Grammar-Constrained Logit Decoding & Atomization</strong>
                        <p class="text-slate-600 mt-0.5">Strict schema compliance and token masking suppressing conversational preambles, enforcing 1:1 concept-to-code fidelity.</p>
                    </div>
                </div>
            </div>
        </div>
    `,
    copyrightView: `
        <div class="p-8 space-y-6">
            <h4 class="text-xl font-extrabold text-slate-800">Copyright & Licence</h4>
            <p class="text-sm text-slate-600 leading-relaxed font-bold">Copyright (c) 2025 All Rights Reserved in Accordance to The Terms Herein</p>

            <div class="space-y-2">
                <h5 class="text-xs font-extrabold uppercase tracking-widest text-slate-500">Concept and Development</h5>
                <p class="text-sm text-slate-700">Joel Chan, Jan-Peter Nilsson, Paul Whaley, Pritchard, C., Lagisz, M.</p>
            </div>
            
            <div class="space-y-2">
                 <h5 class="text-xs font-extrabold uppercase tracking-widest text-slate-500">Toolkit Development</h5>
                 <p class="text-sm text-slate-700">Jan-Peter Nilsson & Joel Chan</p>
            </div>

            <div class="space-y-2">
                 <h5 class="text-xs font-extrabold uppercase tracking-widest text-slate-500">Code</h5>
                 <p class="text-sm text-slate-700">Jan-Peter Nilsson</p>
            </div>

            <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm leading-relaxed text-slate-600 space-y-4">
                 <h5 class="font-bold text-emerald-700 uppercase text-xs tracking-widest">Permissions</h5>
                 <p class="text-emerald-700 font-medium">Permission is hereby granted, to any person obtaining a copy of this software and associated documentation files (the "Software"), to use the Software for its intended purpose, subject to the following conditions:</p>
                 <ul class="list-disc pl-5 space-y-2 text-emerald-700">
                    <li>You are free to use the Beta version of this Software in its original, unmodified form, for trial purposes only. The software may only be used at the server where it is hosted, or as a stand-alone application that has this copyright statement is present, and that it is downloaded from the developers site, or an authorised host.</li>
                    <li>The above copyright notice and this permission notice is included in the version of the Software, approved website or server you use.</li>
                    <li>You acknowledge that using this software, effectively means you are accepting a conditional NDA.</li>
                 </ul>

                 <h5 class="font-bold text-rose-700 uppercase text-xs tracking-widest mt-6">Prohibitions</h5>
                 <p class="text-rose-700 font-medium">Without permission granted from the author of the software, the following actions are expressly forbidden:</p>
                 <ul class="list-disc pl-5 space-y-2 text-rose-700">
                    <li>You may NOT, as a user - or as an invited party - disclose, take screenshots, hand out hosting website address, translate, or in any digital or analogue media or form, record any of the core processes or functions or code of this Software that you may gain knowledge of.</li>
                    <li>You may NOT distribute, modify, adapt, translate, or create derivative works based on the Software's source code.</li>
                    <li>You may NOT decompile, reverse engineer, disassemble, or otherwise attempt to derive the source code for the Software.</li>
                    <li>You may NOT merge or incorporate the Software or its source code into any other software.</li>
                 </ul>

                 <p class="text-xs font-bold text-slate-400 mt-6 uppercase">THIS VERSION OF THE BETA TESTING SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
            </div>
        </div>
    `
};
