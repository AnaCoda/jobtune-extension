class ResumesExplorer {
    constructor() {
        this.resumes = {};
        this.filteredResumes = {};
        this.init();
    }

    async init() {
        await this.loadResumes();
        await this.loadMasterResumeDetails();
        this.bindEvents();
        this.renderResumes();
    }

    async loadMasterResumeDetails() {
        try {
            const data = await chrome.storage.local.get(['masterResume', 'masterResumeLastUpdate']);
            const masterResumeDetails = document.getElementById('masterResumeDetails');
            if (data.masterResume) {
                const lastUpdate = data.masterResumeLastUpdate ? new Date(data.masterResumeLastUpdate) : null;
                const formattedDate = lastUpdate ? this.formatDate(lastUpdate) : 'Not available';
                const resumeSnippet = this.truncateText(data.masterResume, 50);
                masterResumeDetails.innerHTML = `
                    <p>Status: Loaded</p>
                    <p>Last Updated: ${formattedDate}</p>
                    <p>Snippet: ${this.escapeHtml(resumeSnippet)}</p>
                `;
            } else {
                masterResumeDetails.innerHTML = '<p>No master resume uploaded.</p>';
            }
        } catch (error) {
            console.error('Error loading master resume details:', error);
            const masterResumeDetails = document.getElementById('masterResumeDetails');
            masterResumeDetails.innerHTML = '<p>Error loading details.</p>';
        }
    }

    async loadResumes() {
        try {
            const data = await chrome.storage.local.get(['resumes', 'lastUpdateTimes']);
            this.resumes = data.resumes || {};
            this.lastUpdateTimes = data.lastUpdateTimes || {};
            this.filteredResumes = { ...this.resumes };
        } catch (error) {
            console.error('Error loading resumes:', error);
            this.resumes = {};
            this.filteredResumes = {};
        }
    }

    bindEvents() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', async () => {
            await this.loadResumes();
            this.renderResumes();
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.filterResumes(e.target.value);
        });

        // Clear all button
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllResumes();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportResumes();
        });

        // Save master resume
        document.getElementById('saveMasterResumeBtn').addEventListener('click', () => {
            this.saveMasterResume();
        });
    }

    async saveMasterResume() {
        const fileInput = document.getElementById('masterResumeInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file to upload.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            const lastUpdate = Date.now();
            try {
                await chrome.storage.local.set({ 
                    masterResume: content,
                    masterResumeLastUpdate: lastUpdate 
                });
                alert('Master resume saved successfully!');
                await this.loadMasterResumeDetails();
            } catch (error) {
                console.error('Error saving master resume:', error);
                alert('Failed to save master resume.');
            }
        };
        reader.readAsText(file);
    }

    filterResumes(query) {
        if (!query.trim()) {
            this.filteredResumes = { ...this.resumes };
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredResumes = {};
            
            Object.entries(this.resumes).forEach(([url, resume]) => {
                if (url.toLowerCase().includes(lowerQuery) || 
                    resume.toLowerCase().includes(lowerQuery)) {
                    this.filteredResumes[url] = resume;
                }
            });
        }
        this.renderResumes();
    }

    renderResumes() {
        const container = document.getElementById('resumesContainer');
        const countElement = document.getElementById('resumeCount');
        
        const resumeCount = Object.keys(this.filteredResumes).length;
        countElement.textContent = `${resumeCount} ${resumeCount === 1 ? 'resume' : 'resumes'}`;

        if (resumeCount === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        const resumesHTML = Object.entries(this.filteredResumes)
            .sort((a, b) => {
                const timeA = this.lastUpdateTimes[a[0]] || 0;
                const timeB = this.lastUpdateTimes[b[0]] || 0;
                return timeB - timeA; // Most recent first
            })
            .map(([url, resume]) => this.createResumeHTML(url, resume))
            .join('');

        container.innerHTML = resumesHTML;
        this.bindResumeEvents();
    }

    createResumeHTML(url, resume) {
        const lastUpdate = this.lastUpdateTimes[url];
        const formattedDate = lastUpdate ? this.formatDate(new Date(lastUpdate)) : 'Unknown';
        const truncatedResume = this.truncateText(resume, 150);
        const domain = this.extractDomain(url);

        return `
            <div class="resume-item" data-url="${this.escapeHtml(url)}">
                <div class="resume-header">
                    <a href="${this.escapeHtml(url)}" class="resume-url" target="_blank" title="${this.escapeHtml(url)}">
                        ${this.escapeHtml(domain)}
                    </a>
                    <span class="resume-date">${formattedDate}</span>
                </div>
                <div class="resume-content">${this.escapeHtml(truncatedResume)}</div>
                <div class="resume-actions">
                    <button class="action-btn view-btn" data-url="${this.escapeHtml(url)}">View Full</button>
                    <button class="action-btn copy-btn" data-url="${this.escapeHtml(url)}">Copy</button>
                    <button class="action-btn delete-btn" data-url="${this.escapeHtml(url)}">Delete</button>
                </div>
            </div>
        `;
    }

    bindResumeEvents() {
        // View full resume
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.getAttribute('data-url');
                this.showFullResume(url);
            });
        });

        // Copy resume
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const url = btn.getAttribute('data-url');
                await this.saveResumeToClipboard(url);
                btn.textContent = 'Copied';
                setTimeout(() => {
                    btn.textContent = 'Copy';
                }, 2000);
            });
        });

        // Delete resume
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const url = btn.getAttribute('data-url');
                await this.deleteResume(url);
            });
        });

        // Click to expand
        document.querySelectorAll('.resume-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('action-btn') && !e.target.closest('.resume-actions')) {
                    const url = item.getAttribute('data-url');
                    this.showFullResume(url);
                }
            });
        });
    }

    showFullResume(url) {
        const resume = this.resumes[url];
        if (!resume) return;

        const modal = this.createModal(url, resume);
        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Close modal events
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    createModal(url, resume) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Full Resume</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-url">${this.escapeHtml(url)}</div>
                <div class="modal-resume">${this.escapeHtml(resume)}</div>
            </div>
        `;
        return modal;
    }

    async deleteResume(url) {
        if (!confirm('Are you sure you want to delete this resume?')) return;

        try {
            delete this.resumes[url];
            delete this.filteredResumes[url];
            delete this.lastUpdateTimes[url];

            await chrome.storage.local.set({ 
                resumes: this.resumes,
                lastUpdateTimes: this.lastUpdateTimes 
            });

            this.renderResumes();
        } catch (error) {
            console.error('Error deleting resume:', error);
        }
    }

    async clearAllResumes() {
        if (!confirm('Are you sure you want to delete all resumes? This action cannot be undone.')) return;

        try {
            await chrome.storage.local.remove(['resumes', 'lastUpdateTimes']);
            this.resumes = {};
            this.filteredResumes = {};
            this.lastUpdateTimes = {};
            this.renderResumes();
        } catch (error) {
            console.error('Error clearing resumes:', error);
        }
    }

    exportResumes() {
        const exportData = {
            exportDate: new Date().toISOString(),
            resumes: Object.entries(this.resumes).map(([url, resume]) => ({
                url,
                resume,
                lastUpdate: this.lastUpdateTimes[url] || null
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getEmptyState() {
        const hasAnyData = Object.keys(this.resumes).length > 0;
        
        if (!hasAnyData) {
            return `
                <div class="no-resumes">
                    <h3>No resumes yet</h3>
                    <p>Visit a job application page to create your first tailored resume!</p>
                </div>
            `;
        } else {
            return `
                <div class="no-resumes">
                    <h3>No matching resumes</h3>
                    <p>Try adjusting your search terms.</p>
                </div>
            `;
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return url.length > 50 ? url.substring(0, 47) + '...' : url;
        }
    }

    formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async saveResumeToClipboard(url) {
        const resume = this.resumes[url];
        if (!resume) return;

        try {
            await navigator.clipboard.writeText(resume);
        } catch (error) {
            console.error('Failed to copy resume to clipboard:', error);
        }
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ResumesExplorer());
} else {
    new ResumesExplorer();
}
