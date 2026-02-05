
export const templates = {
    copyrightView: `
        <div class="space-y-6">
            <div class="border-b pb-4">
                <h2 class="text-2xl font-extrabold text-slate-800">Copyright & Licence</h2>
                <p class="text-sm font-bold text-teal-700">Copyright (c) 2025 Evidence-Based Toxicology Collaboration</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p class="font-bold text-slate-500 uppercase tracking-widest mb-1">Concept and Development</p>
                    <p class="text-slate-800">Joel Chan, Jan-Peter Nilsson, Paul Whaley, et al.</p>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p class="font-bold text-slate-500 uppercase tracking-widest mb-1">Toolkit Development & Code</p>
                    <p class="text-slate-800">Jan-Peter Nilsson</p>
                </div>
            </div>

            <div class="p-5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-2xl">
                <h4 class="font-bold text-emerald-800 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                    <i class="fa-solid fa-circle-check"></i> Permissions
                </h4>
                <div class="text-xs text-emerald-900 leading-relaxed space-y-2">
                    <p>Permission is hereby granted, to any person obtaining a copy of this software and associated documentation files (the "Software"), to use the Software for its intended purpose, subject to the following conditions:</p>
                    <ul class="list-disc ml-4 space-y-1">
                        <li>You are free to use the Beta version of this Software in its original, unmodified form, for trial purposes only. The software may only be used at the server where it is hosted, or as a stand-alone application that has this copyright statement is present, and that it is downloaded from the developers site, or an authorised host.</li>
                        <li>The above copyright notice and this permission notice is included in the version of the Software, approved website or server you use.</li>
                        <li>You acknowledge that using this software, effectively means you are accepting a <strong>conditional NDA</strong>.</li>
                    </ul>
                </div>
            </div>

            <div class="p-5 bg-rose-50 border-l-4 border-rose-500 rounded-r-2xl">
                <h4 class="font-bold text-rose-800 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                    <i class="fa-solid fa-circle-xmark"></i> Prohibitions
                </h4>
                <div class="text-xs text-rose-900 leading-relaxed space-y-2 font-medium">
                    <p>Without permission granted from the author of the software, the following actions are expressly forbidden:</p>
                    <ul class="list-disc ml-4 space-y-1">
                        <li>You may NOT, outside the EBTC-Workgroups - or as an invited party - disclose, take screenshots, hand out website address, translate, or in any digital or analogue media or form, record any of the core processes or functions that you may gain knowledge of.</li>
                        <li>You may NOT distribute, modify, adapt, translate, or create derivative works based on the Software's source code.</li>
                        <li>You may NOT decompile, reverse engineer, disassemble, or otherwise attempt to derive the source code for the Software.</li>
                        <li>You may NOT merge or incorporate the Software or its source code into any other software.</li>
                    </ul>
                </div>
            </div>

            <div class="p-4 bg-slate-100 rounded-xl text-[9px] font-mono text-slate-500 leading-tight">
                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </div>
        </div>
    `,
    versionRationaleView: `
        <div class="prose prose-sm max-w-none">
            <h2 class="text-slate-900 font-extrabold tracking-tight">PECO-Buddy v8.1.1: Scientific Evolution</h2>
            <p class="text-slate-600 italic">This rationale details the paradigm shift from Version 7.x to 8.1.1, moving from descriptive assistance to synthetic reasoning.</p>
            
            <div class="space-y-6 mt-6">
                <section>
                    <h4 class="flex items-center gap-2 text-teal-700 font-bold uppercase text-xs tracking-widest">
                        <i class="fa-solid fa-microchip"></i> 1. Generative Synthetic Logic
                    </h4>
                    <p class="text-slate-700 text-xs">v8.1 introduces the <strong>Semantic Co-Pilot</strong>. Unlike previous versions that acted as simple repositories, 8.1 uses high-dimensional LLM embeddings to verify if a research question is logically complete based on PECO components. It audits your scientific reasoning in real-time.</p>
                </section>

                <section>
                    <h4 class="flex items-center gap-2 text-teal-700 font-bold uppercase text-xs tracking-widest">
                        <i class="fa-solid fa-file-shield"></i> 2. The Multi-Section Audit Engine
                    </h4>
                    <p class="text-slate-700 text-xs">Developed specifically for EBTC reviewers, the <strong>Manuscript Auditor</strong> parses Abstract, Methods, and Results as independent vectors, performing cross-sectional comparisons to identify "Phantom Outcomes" or dosage drift—common reasons for peer-review failure.</p>
                </section>

                <section>
                    <h4 class="flex items-center gap-2 text-teal-700 font-bold uppercase text-xs tracking-widest">
                        <i class="fa-solid fa-vial"></i> 3. Comprehensive Methodological Reach
                    </h4>
                    <p class="text-slate-700 text-xs">v8.1 provides native support for <strong>In Vivo, In Vitro, and In Silico</strong> study types, removing the clinical-only bias of earlier versions. It includes specialised extraction rules for cell culture phenotypes and computational parameters.</p>
                </section>

                <section>
                    <h4 class="flex items-center gap-2 text-teal-700 font-bold uppercase text-xs tracking-widest">
                        <i class="fa-solid fa-brain"></i> 4. Hybrid Analysis Framework
                    </h4>
                    <p class="text-slate-700 text-xs">The "Local Rules" engine now works in parallel with the AI engine. This allows researchers to maintain a "Golden Dictionary" of custom terminology that takes precedence over generic AI interpretations, ensuring 100% adherence to specific working group vocabularies.</p>
                </section>
            </div>
        </div>
    `,
    userManualView: `
        <div class="flex flex-col md:flex-row h-[70vh]">
            <aside class="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-100 pr-0 md:pr-6 mb-6 md:mb-0 flex-shrink-0">
                <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Contents</p>
                <nav class="space-y-1 manual-nav">
                    <a href="#manual-welcome" class="manual-nav-link active">Welcome</a>
                    <a href="#manual-api" class="manual-nav-link">1. The API Key</a>
                    <a href="#manual-peco" class="manual-nav-link">2. PECO Toolkit</a>
                    <a href="#manual-audit" class="manual-nav-link">3. Review PECO</a>
                    <a href="#manual-nlp" class="manual-nav-link">4. NLP Toolkit</a>
                    <a href="#manual-saving" class="manual-nav-link">5. Saving & Reports</a>
                </nav>
            </aside>

            <div class="flex-grow flex flex-col min-w-0">
                <div class="sticky top-0 bg-white z-10 pb-4 mb-4 border-b">
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input id="manual-search-input" type="text" class="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold focus:border-teal-500 outline-none transition-all" placeholder="Search the manual (e.g., 'Audit')...">
                    </div>
                </div>

                <div id="manual-content-container" class="space-y-12 overflow-y-auto pr-4 custom-scrollbar flex-grow">
                    <section class="manual-section" id="manual-welcome">
                        <h3 class="text-xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-book-open text-teal-600"></i> Welcome to PECO-Buddy
                        </h3>
                        <div class="text-sm text-slate-600 leading-relaxed space-y-3">
                            <p>Welcome to PECO-Buddy. This application is a <strong>Semantic Co-Author</strong> designed to help researchers strictly define research questions and audit scientific manuscripts. It is not just a chatbot; it is a structured workflow tool.</p>
                        </div>
                    </section>

                    <section class="manual-section" id="manual-api">
                        <h3 class="text-lg font-extrabold text-slate-800 mb-3 uppercase tracking-tight">1. The Brain Key (API Key)</h3>
                        <p class="text-sm text-slate-600 mb-4 italic">To enable the AI intelligence, you must provide a Google Gemini API Key.</p>
                        <ul class="space-y-2 text-sm text-slate-700">
                            <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span> <span>Click the <strong>Settings</strong> icon in the sidebar.</span></li>
                            <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span> <span>Click <strong>Connect Key</strong> to open the safe vault and choose your project key.</span></li>
                            <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span> <span>The key is stored safely in your browser while you work.</span></li>
                        </ul>
                    </section>

                    <section class="manual-section" id="manual-peco">
                        <h3 class="text-lg font-extrabold text-slate-800 mb-3 uppercase tracking-tight">2. Making a Plan (PECO Toolkit)</h3>
                        <p class="text-sm text-slate-600 mb-4 italic">Guides you through 3 easy steps to build a rigorous protocol.</p>
                        <div class="space-y-4">
                            <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                <h4 class="font-bold text-teal-700 text-xs uppercase mb-1">Step 1: Ideation (The Spark)</h4>
                                <p class="text-xs text-slate-600">Type your big science idea (e.g., "Zinc for colds") and pick a <strong>Study Type</strong>. Picking the right type helps the robot think correctly for you!</p>
                            </div>
                            <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                <h4 class="font-bold text-teal-700 text-xs uppercase mb-1">Step 2: Analysis (The Check)</h4>
                                <p class="text-xs text-slate-600">Write your question on the left. The <strong>Co-Pilot</strong> on the right will find your P, E, C, O terms automatically! Click <strong>Analyse</strong> to see if your plan is clear or if it needs more details.</p>
                            </div>
                            <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                <h4 class="font-bold text-teal-700 text-xs uppercase mb-1">Step 3: Outputs (The Treasure)</h4>
                                <p class="text-xs text-slate-600">Review your final plan. You can save it to your <strong>Notebook</strong> or get a report to share with others.</p>
                            </div>
                        </div>
                    </section>

                    <section class="manual-section" id="manual-audit">
                        <h3 class="text-lg font-extrabold text-slate-800 mb-3 uppercase tracking-tight">3. Checking the Work (Review PECO)</h3>
                        <p class="text-sm text-slate-600 mb-4 italic">Audits your written papers for mistakes.</p>
                        <ul class="space-y-3 text-sm text-slate-700">
                            <li class="flex gap-3 items-start"><i class="fa-solid fa-upload text-teal-500 mt-1"></i> <span><strong>Upload:</strong> Drop your PDF or Word file into the box.</span></li>
                            <li class="flex gap-3 items-start"><i class="fa-solid fa-microscope text-teal-500 mt-1"></i> <span><strong>Analysis:</strong> The robot reads your Abstract, Methods, and Results independently.</span></li>
                            <li class="flex gap-3 items-start"><i class="fa-solid fa-flag text-teal-500 mt-1"></i> <span><strong>Report:</strong> If parts don't match (e.g., you said "Rats" in one part but "Mice" in another), the robot flags a <strong>Critical Issue</strong>.</span></li>
                        </ul>
                    </section>

                    <section class="manual-section" id="manual-nlp">
                        <h3 class="text-lg font-extrabold text-slate-800 mb-3 uppercase tracking-tight">4. The Word List (NLP Toolkit)</h3>
                        <p class="text-sm text-slate-600 mb-4 italic">Teach the robot exact words to look for.</p>
                        <p class="text-xs text-slate-600 leading-relaxed mb-4">While the AI guesses what you mean, the <strong>NLP Toolkit</strong> is for exact words. You can add your own words (like "adverse events") and tell the robot they are "Outcomes". You can even share these lists with friends as JSON files!</p>
                    </section>

                    <section class="manual-section" id="manual-saving">
                        <h3 class="text-lg font-extrabold text-slate-800 mb-3 uppercase tracking-tight">5. Saving & Reporting</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <h5 class="font-bold text-slate-800 text-[10px] uppercase mb-1">The Notebook</h5>
                                <p class="text-[10px] text-slate-500">A persistent scratchpad in the sidebar. It saves your work automatically as you go!</p>
                            </div>
                            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <h5 class="font-bold text-slate-800 text-[10px] uppercase mb-1">Project Files (.peco)</h5>
                                <p class="text-[10px] text-slate-500">Download your whole session to your computer and finish it later using Load Project.</p>
                            </div>
                        </div>
                        <div class="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                             <h5 class="font-bold text-indigo-700 text-xs uppercase mb-1">Transparency Report</h5>
                             <p class="text-xs text-indigo-800 leading-relaxed">The main artifact of your work! It contains the Final Protocol, Keywords, and an <strong>Interaction Log</strong>—a list of every conversation you had with the Science Robot for scientific reproducibility.</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    `,
    settingsView: `
        <div class="space-y-8">
            <div>
                <h3 class="font-bold text-slate-800 mb-2">Analysis Engine</h3>
                <p class="text-xs text-slate-500 mb-4">Select how PECO-Buddy identifies concepts in your text.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button id="modal-engine-ai-btn" class="p-5 rounded-3xl border-2 border-slate-100 text-left hover:border-teal-500 transition-all flex flex-col gap-3 group">
                        <div class="flex justify-between items-center">
                            <i class="fa-solid fa-brain text-3xl text-teal-600"></i>
                            <i class="fa-solid fa-circle-check text-teal-600 opacity-0 active-check transition-opacity"></i>
                        </div>
                        <div>
                            <div class="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Generative AI</div>
                            <div class="text-[10px] text-slate-500 mt-1 leading-relaxed">Advanced semantic understanding using Gemini-3-Flash. Recognises context, synonyms, and complex logic.</div>
                        </div>
                    </button>
                    <button id="modal-engine-nlp-btn" class="p-5 rounded-3xl border-2 border-slate-100 text-left hover:border-teal-500 transition-all flex flex-col gap-3 group">
                        <div class="flex justify-between items-center">
                            <i class="fa-solid fa-list-check text-3xl text-indigo-600"></i>
                            <i class="fa-solid fa-circle-check text-teal-600 opacity-0 active-check transition-opacity"></i>
                        </div>
                        <div>
                            <div class="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Local Rules</div>
                            <div class="text-[10px] text-slate-500 mt-1 leading-relaxed">Strict keyword matching using your custom NLP Dictionary. Best for controlled vocabularies.</div>
                        </div>
                    </button>
                </div>
            </div>

            <div>
                <h3 class="font-bold text-slate-800 mb-2">Display Preferences</h3>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <div class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Quality Score Gauge</div>
                        <p class="text-[10px] text-slate-500">Show or hide the visual circular gauge in analysis results.</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="modal-toggle-gauge-btn" class="sr-only peer">
                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                </div>
            </div>
            
            <div class="space-y-4 pt-6 border-t border-slate-100">
                <h3 class="font-bold text-slate-800 mb-2">Randomness Control</h3>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Seed</label>
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center gap-4">
                             <input id="settings-seed-range" type="range" min="1" max="1000" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600">
                             <input id="settings-seed-input" type="number" class="w-20 p-3 rounded-xl text-xs font-mono font-bold border-slate-200 focus:border-teal-500 outline-none bg-white" placeholder="42">
                        </div>
                        <p class="text-[10px] text-slate-500">Deterministic constant for AI reproducibility.</p>
                    </div>
                </div>
            </div>

            <div class="space-y-4 pt-6 border-t border-slate-100">
                <h3 class="font-bold text-slate-800 mb-2">Domain Adaptation (Pro)</h3>
                <p class="text-[10px] text-slate-500 mb-4">Customize the AI persona and logic rules for specific scientific niches.</p>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">AI Domain Context</label>
                        <input id="settings-domain-context" type="text" class="w-full p-3 rounded-xl text-xs font-bold border-slate-200 focus:border-teal-500 outline-none" placeholder="e.g., Toxicology, Material Science...">
                    </div>
                    <div>
                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Logic Anchors & Heuristics</label>
                        <textarea id="settings-logic-anchors" rows="6" class="w-full p-3 rounded-xl text-xs font-mono border-slate-200 focus:border-teal-500 outline-none leading-relaxed custom-scrollbar resize-none" placeholder="Define specific if/then rules..."></textarea>
                    </div>
                    <div class="text-right">
                        <button id="settings-reset-heuristics" class="text-[10px] font-bold text-slate-400 hover:text-teal-600 underline">Reset to Defaults</button>
                    </div>
                </div>
            </div>
            
            <div class="space-y-4 pt-6 border-t border-slate-100">
                <h3 class="font-bold text-slate-800 mb-2">API Configuration</h3>
                <div class="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4">
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex-grow">
                            <div class="text-sm font-extrabold text-slate-800">Gemini API Key</div>
                            <p class="text-[10px] text-slate-500 leading-relaxed mt-1">A paid API key is required. You can connect via AI Studio or enter manually below.</p>
                        </div>
                        <button id="modal-connect-key-btn" class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider whitespace-nowrap shadow-lg">Connect Key</button>
                    </div>
                    <div class="pt-2 border-t border-slate-200">
                        <label class="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Manual Key Override</label>
                        <div class="flex gap-2">
                            <div class="relative flex-grow">
                                <input id="modal-manual-key-input" type="password" class="w-full p-3 rounded-xl text-xs font-mono border-slate-200 focus:border-teal-500 outline-none pr-10" placeholder="Enter API Key manually...">
                                <button id="toggle-key-visibility" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><i class="fa-solid fa-eye"></i></button>
                            </div>
                            <button id="save-manual-key-btn" class="bg-slate-800 text-white px-4 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap shadow hover:bg-black transition-all">Save Key</button>
                        </div>
                    </div>
                </div>
                <div class="text-[10px] text-center text-slate-400">
                    Learn about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" class="underline hover:text-teal-600">API billing & documentation</a>
                </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Environment Info</h4>
                <div class="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>API Connection:</span>
                    <span id="api-connection-status" class="text-teal-600 font-bold uppercase">Ready</span>
                </div>
            </div>
        </div>
    `,
    ideationView: `
        <div class="max-w-5xl mx-auto">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Ideation</h2>
                <p class="text-lg text-slate-500">Provide a research concept to generate structured protocol drafts.</p>
            </div>
            
            <div class="bg-white p-10 rounded-3xl shadow-card border border-slate-100">
                <div class="mb-10">
                    <label class="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">1. Define Research Scope</label>
                    <textarea id="ideation-scope-input" class="w-full h-40 text-xl font-bold resize-none rounded-2xl p-6 transition-all" placeholder="e.g., Use of zinc supplements for reducing duration of common cold symptoms..."></textarea>
                </div>

                <div id="ideation-phase-study-type" class="mb-10 hidden animate-fade-in">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <label class="block text-xs font-extrabold text-slate-400 uppercase tracking-widest">2. Select Targeted Study Methodology</label>
                        <div class="flex p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
                            <button id="toggle-basic-types" class="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all bg-white text-teal-600 shadow-sm">Basic</button>
                            <button id="toggle-extended-types" class="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all text-slate-500 hover:text-slate-800">Extended</button>
                        </div>
                    </div>
                    <div id="study-type-selector" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button id="generate-ideation-btn" class="py-5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-2xl text-sm uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        Generate Suggestions
                    </button>
                    <button id="use-own-question-btn" class="py-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-sm uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        Continue with my own question
                    </button>
                </div>
            </div>

            <div id="ideation-results-container" class="mt-12"></div>
        </div>
    `,
    clarityView: `
        <div class="max-w-6xl mx-auto space-y-8">
            <div id="clarity-dashboard-container"></div>
            
            <div id="clarity-statement-section" class="bg-white p-10 rounded-[2rem] border shadow-sm">
                <div class="flex justify-between items-center mb-6">
                    <label class="block text-xs font-extrabold text-slate-400 uppercase tracking-widest">Finalised Scientific Statement (Read Only)</label>
                    <div id="clarity-status-tag"></div>
                </div>
                <!-- Replaced textarea with a display-ready div for badge rendering -->
                <div id="research-question-display" class="w-full text-xl font-bold p-8 mb-6 rounded-2xl border border-slate-100 bg-slate-50/50 italic leading-relaxed shadow-inner min-h-[120px] select-all cursor-text" aria-readonly="true"></div>
                <button id="score-clarity-btn" class="w-full bg-teal-600 text-white py-5 rounded-2xl font-extrabold uppercase text-sm tracking-widest shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-3">
                    <i class="fa-solid fa-arrows-rotate"></i> UPDATE QUESTION & DASHBOARD
                </button>
            </div>

            <div id="clarity-footer-container"></div>
        </div>
    `,
    pecoWorkshopView: `
        <div class="max-w-4xl mx-auto bg-white p-10 rounded-3xl border shadow-sm">
            <h3 class="text-2xl font-extrabold text-slate-800 mb-8">Final Protocol Design</h3>
            <div id="final-question-display" class="p-6 bg-slate-50 rounded-2xl text-lg font-bold text-slate-700 mb-8 italic border border-slate-100"></div>
            <div id="final-peco-display" class="mb-10"></div>
            <div class="flex flex-wrap justify-between gap-4">
                <button id="save-to-notebook-btn" class="flex-grow bg-teal-600 text-white py-4 px-6 rounded-xl font-extrabold uppercase text-xs">Save to Notebook</button>
                <button id="show-transparency-log-workshop-btn" class="flex-grow bg-white border border-slate-200 text-slate-600 py-4 px-6 rounded-xl font-extrabold uppercase text-xs flex items-center justify-center gap-2"><i class="fa-solid fa-code"></i> Extended Transparency</button>
                <button id="view-transparency-report-btn" class="flex-grow bg-indigo-600 text-white py-4 px-6 rounded-xl font-extrabold uppercase text-xs shadow-lg">View Transparency Report</button>
            </div>
        </div>
    `,
    transparencyReportView: `
        <div id="transparency-report-container" class="max-w-5xl mx-auto space-y-12">
            <div class="bg-white p-12 rounded-[2rem] border shadow-float relative overflow-hidden">
                <div class="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -mr-10 -mt-10"></div>
                
                <div class="flex justify-between items-start mb-12">
                    <div>
                        <h2 class="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Transparency Report</h2>
                        <p class="text-slate-500 font-medium">Generated on <span id="report-timestamp"></span></p>
                    </div>
                    <div class="flex gap-3">
                         <button id="report-show-log-btn" class="bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"><i class="fa-solid fa-code"></i> Transparency Log</button>
                         <button id="report-copy-table-btn" class="bg-slate-100 text-slate-700 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"><i class="fa-solid fa-copy mr-2"></i>Copy Table</button>
                         <button id="report-export-nanopub-btn" class="bg-teal-600 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl transition-all"><i class="fa-solid fa-file-code mr-2"></i>Export Nano-pub</button>
                    </div>
                </div>

                <div class="space-y-10">
                    <section>
                        <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-clipboard-check"></i> Finalised Protocol
                        </h4>
                        <div id="report-final-question" class="text-2xl font-bold text-slate-800 italic leading-relaxed"></div>
                    </section>

                    <section>
                        <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 mb-4">Structured PECO Components</h4>
                        <div id="report-peco-table-wrapper" class="overflow-hidden border rounded-3xl"></div>
                    </section>

                    <section class="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                        <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-clock-rotate-left"></i> Interaction Log Summary
                        </h4>
                        <div id="report-interaction-log" class="space-y-4 max-h-60 overflow-y-auto pr-4 custom-scrollbar">
                             <p class="text-xs text-slate-500 italic">Semantic analysis trail session data available via the Transparency Log button.</p>
                             <div id="report-log-entries" class="space-y-2"></div>
                        </div>
                    </section>
                </div>
                
                <div class="mt-12 pt-8 border-t flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>This Tool is Authorised for EBTC-Workgroup use</span>
                    <span>v8.1.1 Beta Final</span>
                </div>
            </div>
        </div>
    `,
    pecoToolkit: `
        <div id="workflow-nav" class="space-y-6">
            <div id="step-ideation" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">1</div>
                    <span class="text-xs font-extrabold uppercase tracking-widest">Ideation</span>
                </div>
                <div class="step-content"></div>
            </div>
            <div id="step-clarity" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">2</div>
                    <span class="text-xs font-extrabold uppercase tracking-widest">Analysis & Refinement</span>
                </div>
                <div class="step-content"></div>
            </div>
            <div id="step-peco-workshop" class="workflow-step">
                <div class="step-header">
                    <div class="step-number">3</div>
                    <span class="text-xs font-extrabold uppercase tracking-widest">Validation</span>
                </div>
                <div class="step-content"></div>
            </div>
        </div>
    `,
    reviewerToolkit: `
        <div id="reviewer-toolkit-container" class="max-w-4xl mx-auto bg-white p-10 rounded-3xl border shadow-sm text-center">
            <h2 class="text-3xl font-extrabold text-slate-800 mb-4">Manuscript Auditor</h2>
            <p class="text-slate-500 mb-10">Upload your paper to check PECO consistency across sections.</p>
            <div class="border-2 border-dashed border-slate-200 rounded-3xl p-12 mb-8 hover:border-teal-500 transition-colors">
                <input type="file" id="audit-file-upload" class="hidden" accept=".pdf,.docx">
                <label for="audit-file-upload" class="cursor-pointer">
                    <i class="fa-solid fa-cloud-arrow-up text-5xl text-teal-600 mb-4"></i>
                    <p class="text-sm font-bold text-slate-600">Click to upload or drag and drop</p>
                    <p id="audit-file-name" class="text-xs text-teal-600 mt-2 font-mono"></p>
                </label>
            </div>
            <button id="run-audit-btn" class="bg-teal-600 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs shadow-lg">Run Audit</button>
            <div id="audit-report-container" class="text-left"></div>
        </div>
    `,
    nlpToolkit: `
        <div id="nlp-toolkit-container" class="max-w-5xl mx-auto">
            <div class="bg-white p-8 rounded-3xl border shadow-sm mb-8">
                <h3 class="font-extrabold text-slate-800 mb-6 uppercase text-xs tracking-widest">Local Dictionary Rules</h3>
                <div class="flex gap-4 mb-6">
                    <input id="nlp-term-input" class="flex-grow p-4 rounded-xl text-sm font-bold" placeholder="Enter term(s) separated by ;">
                    <select id="nlp-category-select" class="p-4 rounded-xl text-sm font-bold">
                        <option value="population">Population</option>
                        <option value="exposure">Exposure</option>
                        <option value="comparison">Comparator</option>
                        <option value="outcome">Outcome</option>
                    </select>
                    <button id="add-nlp-term-btn" class="bg-teal-600 text-white px-6 rounded-xl font-bold uppercase text-xs shadow-md">Add</button>
                </div>
                <div class="flex justify-between items-center mb-6">
                    <input id="nlp-search-input" class="text-sm p-3 rounded-xl w-64 font-bold" placeholder="Search rules...">
                    <div class="flex gap-4">
                        <button id="import-nlp-rules-btn" class="text-[10px] font-extrabold uppercase text-slate-500 hover:text-teal-600">Import JSON</button>
                        <input type="file" id="import-nlp-rules-input" class="hidden">
                        <button id="export-nlp-rules-btn" class="text-[10px] font-extrabold uppercase text-teal-600 hover:underline">Export JSON</button>
                    </div>
                </div>
                <div id="nlp-table-container" class="overflow-hidden border rounded-2xl"></div>
                <div id="nlp-pagination-controls" class="mt-4 flex justify-between items-center text-xs"></div>
            </div>
        </div>
    `
};
