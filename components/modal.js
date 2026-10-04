export const showModal = (title, content, callback, footerCallback, isReportModal = false) => {
    const modalPlaceholder = document.getElementById('modal-placeholder');
    const modalClass = isReportModal ? 'report-modal-container' : 'modal-container';
    // Content must live inside a scrollable .modal-body / .report-modal-content
    // wrapper; bare content overflows the height-capped flex modal card and
    // renders outside it. Auto-wrap any call site that omits the wrapper.
    const hasScrollWrapper = /class\s*=\s*["'][^"']*(?:modal-body|report-modal-content)/.test(content || '');
    const safeContent = hasScrollWrapper ? content : `<div class="modal-body">${content || ''}</div>`;
    const modalHtml = `
        <div id="doc-modal" class="modal-overlay">
            <div class="${modalClass}">
                <div class="modal-header">
                    <span>${title}</span>
                    <button id="header-close-modal-btn" aria-label="Close modal">&times;</button>
                </div>
                ${safeContent}
            </div>
        </div>
    `;
    modalPlaceholder.innerHTML = modalHtml;
    const modalOverlay = modalPlaceholder.querySelector('#doc-modal');
    const modalBody = modalOverlay.querySelector('.modal-body, .report-modal-content');
    
    setTimeout(() => modalOverlay.classList.add('visible'), 10);
    
    const closeModal = () => {
        modalOverlay.classList.remove('visible');
        document.removeEventListener('keydown', onKeydown);
        modalOverlay.addEventListener('transitionend', () => modalPlaceholder.innerHTML = '', { once: true });
    };

    // Escape closes the top modal — keyboard parity with every click target.
    const onKeydown = (e) => {
        if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKeydown);

    modalOverlay.querySelector('#header-close-modal-btn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    if (modalBody) { 
        modalBody.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = modalBody.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    targetElement.classList.add('highlight-section');
                    setTimeout(() => {
                        targetElement.classList.remove('highlight-section');
                    }, 1500);
                }
            }
        });
    }
    if (callback) callback(modalOverlay, closeModal);
    if (footerCallback) footerCallback(modalOverlay, closeModal);
};