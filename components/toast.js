export const ToastService = {
    get container() {
        return document.getElementById('toast-container');
    },
    show(message, type = 'info', duration = 4000) {
        if (!this.container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        
        if (duration <= 0) { 
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.className = 'toast-close-btn';
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.onclick = () => {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => toast.remove());
            };
            toast.appendChild(closeBtn);
        }

        this.container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => toast.remove());
            }, duration);
        }
    }
};