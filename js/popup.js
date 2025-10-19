const buttonPrompt = document.body.querySelector('#button-prompt');
const elementLoading = document.body.querySelector('#loading');
const elementError = document.body.querySelector('#error');
const elementResponse = document.body.querySelector('#response');
const elementResumeLatex = document.body.querySelector('#resume-latex');

class ResumesExplorer {
    constructor() {
        this.resumes = {};
        this.master_resume = null;
        this.init();
    }

    async init() {
        await this.loadResumes();
        await this.loadMasterResume();
        this.bindEvents();
        this.renderResumes();
        this.renderMasterResumeDetails();
    }

    async loadMasterResume() {
        try {
            const data = await chrome.storage.local.get(['masterResume', 'masterResumeLastUpdate']);
            this.master_resume = data.masterResume || null;
            this.master_resume_last_update = data.masterResumeLastUpdate || null;
        } catch (error) {
            console.error('Error loading master resume details:', error);
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
        document.getElementById('refreshBtn').addEventListener('click', async () => {
            await this.loadResumes();
            this.renderResumes();
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

        // Event delegation for resume actions
        const resumesContainer = document.getElementById('resumes-container');
        resumesContainer.addEventListener('click', (e) => {
            const target = e.target;
            const url = target.dataset.url;

            if (target.classList.contains('view-btn')) {
                this.viewFullResume(url);
            } else if (target.classList.contains('copy-btn')) {
                this.saveResumeToClipboard(url);
                target.textContent = 'Copied!';
                setTimeout(() => target.textContent = 'Copy', 2000);
            } else if (target.classList.contains('delete-btn')) {
                this.deleteResume(url);
            }
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
                await this.loadMasterResume();
                this.renderMasterResumeDetails();
            } catch (error) {
                console.error('Error saving master resume:', error);
                alert('Failed to save master resume.');
            }
        };
        reader.readAsText(file);
    }

    renderResumes() {
        const container = document.getElementById('resumes-container');
        const resumeCount = Object.keys(this.filteredResumes).length;
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
    }

    createResumeHTML(url, resume) {
        const lastUpdate = this.lastUpdateTimes[url];
        const formattedDate = lastUpdate ? this.formatDate(new Date(lastUpdate)) : 'Unknown';
        const truncatedResume = this.truncateText(resume, 150);
        const domain = this.extractDomain(url);

        return `
            <div class="resume-item" data-url="${url}">
                <div class="resume-header">
                    <a href="${url}" class="resume-url" target="_blank" title="${url}">
                        ${this.escapeHtml(domain)}
                    </a>
                    <span class="resume-date">${formattedDate}</span>
                </div>
                <div class="resume-content">${this.escapeHtml(truncatedResume)}</div>
                <div class="resume-actions">
                    <button class="action-btn view-btn" data-url="${url}">View Full</button>
                    <button class="action-btn copy-btn" data-url="${url}">Copy</button>
                    <button class="action-btn delete-btn" data-url="${url}">Delete</button>
                </div>
            </div>
        `;
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

    async saveResumeToClipboard(url) {
        const resume = this.resumes[url];
        if (!resume) return;

        try {
            await navigator.clipboard.writeText(resume);
        } catch (error) {
            console.error('Failed to copy resume to clipboard:', error);
        }
    }

    filterResumes(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        if (!lowerCaseSearchTerm) {
            this.filteredResumes = { ...this.resumes };
        } else {
            this.filteredResumes = Object.entries(this.resumes)
                .filter(([url, resume]) => {
                    return url.toLowerCase().includes(lowerCaseSearchTerm) ||
                           resume.toLowerCase().includes(lowerCaseSearchTerm);
                })
                .reduce((obj, [url, resume]) => {
                    obj[url] = resume;
                    return obj;
                }, {});
        }
        this.renderResumes();
    }

    exportResumes() {
        try {
            const dataStr = JSON.stringify({
                resumes: this.resumes,
                lastUpdateTimes: this.lastUpdateTimes
            }, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'resumes_export.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting resumes:', error);
            alert('Failed to export resumes.');
        }
    }

    viewFullResume(url) {
        const resume = this.resumes[url];
        if (!resume) return;

        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>Resume for ${this.extractDomain(url)}</h3>
                <pre>${this.escapeHtml(resume)}</pre>
            </div>
        `;
        document.body.appendChild(modal);

        const closeButton = modal.querySelector('.close-button');
        closeButton.onclick = () => {
            document.body.removeChild(modal);
        };

        window.onclick = (event) => {
            if (event.target == modal) {
                document.body.removeChild(modal);
            }
        };
    }

    renderMasterResumeDetails() {
        const detailsContainer = document.getElementById('master-resume-details');
        if (this.master_resume) {
            const lastUpdate = this.master_resume_last_update ?
                this.formatDate(new Date(this.master_resume_last_update)) : 'Unknown';
            detailsContainer.innerHTML = `
                <p>
                    Master resume loaded. Last updated: ${lastUpdate}.
                    <br>
                    Length: ${this.master_resume.length} characters.
                </p>
            `;
        } else {
            detailsContainer.innerHTML = '<p>No master resume uploaded.</p>';
        }
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <p>No resumes generated yet.</p>
                <p>Use the fields above to generate a new resume.</p>
            </div>
        `;
    }

    escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ResumesExplorer());
} else {
    new ResumesExplorer();
}
