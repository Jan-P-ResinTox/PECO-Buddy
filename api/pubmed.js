export const fetchPubMedHits = async (query, resultContainer) => {
    if (!query) {
        resultContainer.innerHTML = '';
        return;
    }

    resultContainer.innerHTML = '<div class="flex items-center gap-2 text-slate-600"><div class="loader"></div><span>Searching PubMed...</span></div>';

    const PUBMED_API_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const url = `${PUBMED_API_URL}?db=pubmed&term=${encodeURIComponent(query)}&retmode=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const data = await response.json();

        if (data.esearchresult) {
            if (data.esearchresult.error) {
                resultContainer.innerHTML = `<div class="flex items-center gap-2 text-red-700" title="${data.esearchresult.error}"><i class="fa-solid fa-circle-exclamation"></i><span>Invalid query. Try refining terms.</span></div>`;
            } else if (data.esearchresult.count) {
                const count = parseInt(data.esearchresult.count, 10);
                const searchUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
                resultContainer.innerHTML = `<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-green-700 font-bold hover:underline"><i class="fa-solid fa-check-circle"></i><span>${count.toLocaleString()} potential hits found</span></a>`;
            } else {
                resultContainer.innerHTML = `<div class="flex items-center gap-2 text-yellow-700 font-bold"><i class="fa-solid fa-search"></i><span>0 hits found.</span></div>`;
            }
        } else {
            throw new Error("Unexpected response from PubMed API.");
        }
    } catch (error) {
        console.error("PubMed API error:", error);
        resultContainer.innerHTML = `<div class="flex items-center gap-2 text-red-700" title="${error.message}"><i class="fa-solid fa-wifi"></i><span>Could not connect to PubMed.</span></div>`;
    }
};