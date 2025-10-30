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
        this.setupStorageListener();
    }

    setupStorageListener() {
        // Listen for changes to Chrome storage
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local') {
                // Check if resumes, lastUpdateTimes, or jobTitles have changed
                if (changes.resumes || changes.lastUpdateTimes || changes.jobTitles) {
                    this.loadResumes().then(() => {
                        this.renderResumes();
                    });
                }
                
                // Check if master resume has changed
                if (changes.masterResume || changes.masterResumeLastUpdate) {
                    this.loadMasterResume().then(() => {
                        this.renderMasterResumeDetails();
                    });
                }
            }
        });
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
            const data = await chrome.storage.local.get(['resumes', 'lastUpdateTimes', 'jobTitles']);
            this.resumes = data.resumes || {};
            this.lastUpdateTimes = data.lastUpdateTimes || {};
            this.jobTitles = data.jobTitles || {};
            this.filteredResumes = { ...this.resumes };
        } catch (error) {
            console.error('Error loading resumes:', error);
            this.resumes = {};
            this.filteredResumes = {};
            this.jobTitles = {};
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

        // Auto-save when file is selected (to prevent popup closing issue)
        document.getElementById('masterResumeInput').addEventListener('change', () => {
            this.saveMasterResume();
        });

        // Collapsible master resume section
        document.getElementById('master-resume-header').addEventListener('click', () => {
            this.toggleMasterResumeSection();
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
            } else if (target.classList.contains('extract-pdf-btn')) {
                this.extractPDF(url, target);
            } else if (target.classList.contains('delete-btn')) {
                this.deleteResume(url);
            }
        });
    }

    toggleMasterResumeSection() {
        const content = document.getElementById('master-resume-content');
        const icon = document.querySelector('.collapse-icon');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            icon.textContent = '▲';
        } else {
            content.classList.add('collapsed');
            icon.textContent = '▼';
        }
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
            
            // Validate resume format
            const validation = this.validateResumeFormat(content);
            
            if (!validation.isValid) {
                const messageEl = document.getElementById('master-resume-message');
                if (messageEl) {
                    messageEl.textContent = validation.message;
                    messageEl.className = 'validation-message error';
                    messageEl.style.display = 'block';
                    
                    // Hide message after 5 seconds
                    setTimeout(() => {
                        messageEl.style.display = 'none';
                    }, 5000);
                }
                return;
            }
            
            const lastUpdate = Date.now();
            try {
                await chrome.storage.local.set({ 
                    masterResume: content,
                    masterResumeLastUpdate: lastUpdate 
                });
                
                // Show success message
                const messageEl = document.getElementById('master-resume-message');
                if (messageEl) {
                    messageEl.textContent = validation.message;
                    messageEl.className = 'validation-message success';
                    messageEl.style.display = 'block';
                    
                    // Hide message after 3 seconds
                    setTimeout(() => {
                        messageEl.style.display = 'none';
                    }, 3000);
                }
                
                await this.loadMasterResume();
                this.renderMasterResumeDetails();
            } catch (error) {
                console.error('Error saving master resume:', error);
                const messageEl = document.getElementById('master-resume-message');
                if (messageEl) {
                    messageEl.textContent = 'Failed to save master resume.';
                    messageEl.className = 'validation-message error';
                    messageEl.style.display = 'block';
                }
            }
        };
        reader.readAsText(file);
    }

    validateResumeFormat(content) {
        // Count different sections that should be split
        const experienceMatches = content.match(/\\resumeSubheading/g);
        const projectMatches = content.match(/\\resumeProjectHeading/g);
        const experienceCount = experienceMatches ? experienceMatches.length : 0;
        const projectCount = projectMatches ? projectMatches.length : 0;
        
        // Check for essential sections (preamble + document begin/end)
        const hasPreamble = content.includes('\\documentclass');
        const hasDocumentBegin = content.includes('\\begin{document}');
        const hasDocumentEnd = content.includes('\\end{document}');
        
        // Total parts: preamble, experiences, projects, ending
        // We need at least 4 splittable parts
        const totalParts = (hasPreamble ? 1 : 0) + experienceCount + projectCount + (hasDocumentEnd ? 1 : 0);
        
        if (!hasPreamble || !hasDocumentBegin || !hasDocumentEnd || totalParts < 4) {
            return {
                isValid: false,
                message: '❌ Not in Jake\'s Resume format. Please use the template from Overleaf.'
            };
        }
        
        return {
            isValid: true,
            message: `✓ Jake's Resume format confirmed! Found ${experienceCount} experience(s) and ${projectCount} project(s).`
        };
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
        const jobTitle = this.jobTitles[url];

        return `
            <div class="resume-item" data-url="${url}">
                <div class="resume-title-section">
                    <h4 class="resume-job-title">${jobTitle ? this.escapeHtml(jobTitle) : 'Untitled Position'}</h4>
                    <a href="${url}" class="resume-url-link" target="_blank" title="${url}">
                        ${this.escapeHtml(url)}
                    </a>
                </div>
                <div class="resume-meta">
                    <span class="resume-date">${formattedDate}</span>
                </div>
                <div class="resume-actions">
                    <button class="action-btn view-btn" data-url="${url}">View LaTeX</button>
                    <button class="action-btn copy-btn" data-url="${url}">Copy</button>
                    <button class="action-btn extract-pdf-btn" data-url="${url}">Extract PDF</button>
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
            delete this.jobTitles[url];

            await chrome.storage.local.set({ 
                resumes: this.resumes,
                lastUpdateTimes: this.lastUpdateTimes,
                jobTitles: this.jobTitles
            });

            this.renderResumes();
        } catch (error) {
            console.error('Error deleting resume:', error);
        }
    }

    async clearAllResumes() {
        if (!confirm('Are you sure you want to delete all resumes? This action cannot be undone.')) return;

        try {
            await chrome.storage.local.remove(['resumes', 'lastUpdateTimes', 'jobTitles']);
            this.resumes = {};
            this.filteredResumes = {};
            this.lastUpdateTimes = {};
            this.jobTitles = {};
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
                lastUpdateTimes: this.lastUpdateTimes,
                jobTitles: this.jobTitles
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

    async extractPDF(url, buttonElement) {
        const resume = this.resumes[url];
        if (!resume) {
            alert('Resume not found.');
            return;
        }

        const originalText = buttonElement.textContent;
        buttonElement.disabled = true;
        buttonElement.textContent = 'Compiling...';

        try {
            // Import the exportResume function from create.js by loading the script
            // We need to use dynamic import or call the function directly
            // For now, we'll replicate the PDF generation logic here
            
            // Create or get the LaTeX engine
            let latexEngine = window.globalLatexEngine;
            if (!latexEngine) {
                latexEngine = new PdfTeXEngine();
                await latexEngine.loadEngine();
                window.globalLatexEngine = latexEngine;
            }

            latexEngine.writeMemFSFile("main.tex", resume);
            latexEngine.setEngineMainFile("main.tex");
            
            const result = await latexEngine.compileLaTeX();
            
            if (result.status !== 0 || !result.pdf) {
                console.error('PDF compilation failed!');
                console.error('Full log:', result.log);
                throw new Error('PDF compilation failed. Check console for details.');
            }
            
            // Create a blob from the PDF data and trigger download
            const blob = new Blob([result.pdf], { type: 'application/pdf' });
            const pdfUrl = URL.createObjectURL(blob);
            
            // Extract a filename from the URL or use a default
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace(/^www\./, '');
            const jobTitle = this.jobTitles[url];
            const timestamp = new Date().toISOString().split('T')[0];
            const jobTitlePart = jobTitle ? `_${jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : '';
            const filename = `resume_${domain}${jobTitlePart}_${timestamp}.pdf`;
            
            // Trigger download
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pdfUrl);
            
            buttonElement.textContent = 'Downloaded!';
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Error extracting PDF:', error);
            alert('Failed to generate PDF. Check console for details.');
            buttonElement.textContent = originalText;
            buttonElement.disabled = false;
        }
    }

    saveResumeToClipboard(url) {
        const resume = this.resumes[url];
        if (!resume) return;

        navigator.clipboard.writeText(resume).then(() => {
        }).catch(err => {
            console.error('Failed to copy resume:', err);
            alert('Failed to copy to clipboard.');
        });
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

// AI Settings Manager
class AISettingsManager {
    constructor() {
        this.init();
    }

    async init() {
        this.useLocalAICheckbox = document.getElementById('useLocalAI');
        this.geminiApiSection = document.getElementById('gemini-api-section');
        this.apiKeyInputContainer = document.getElementById('api-key-input-container');
        this.geminiApiKeyInput = document.getElementById('geminiApiKey');
        this.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        this.changeKeyBtn = document.getElementById('changeKeyBtn');

        // Load saved settings
        await this.loadSettings();

        // Bind events
        this.bindEvents();
    }

    async loadSettings() {
        try {
            const data = await chrome.storage.local.get(['useLocalAI', 'geminiApiKey']);
            
            // Default to true if not set
            const useLocalAI = data.useLocalAI !== undefined ? data.useLocalAI : true;
            this.useLocalAICheckbox.checked = useLocalAI;
            
            // Store API key state
            this.hasApiKey = !!data.geminiApiKey;
            
            // Load API key if exists
            if (data.geminiApiKey) {
                this.geminiApiKeyInput.value = data.geminiApiKey;
            }

            // Update UI based on toggle state
            this.updateUIState();
        } catch (error) {
            console.error('Error loading AI settings:', error);
        }
    }

    bindEvents() {
        // Toggle switch
        this.useLocalAICheckbox.addEventListener('change', async () => {
            await this.saveSettings();
            this.updateUIState();
        });

        // Save API key button
        this.saveApiKeyBtn.addEventListener('click', async () => {
            await this.saveApiKey();
        });

        // Change key button
        this.changeKeyBtn.addEventListener('click', () => {
            this.showApiKeyInput();
        });
    }

    updateUIState() {
        const useLocalAI = this.useLocalAICheckbox.checked;
        // Update toggle label text
        const toggleTextEl = document.querySelector('.toggle-text');
        if (toggleTextEl) toggleTextEl.textContent = useLocalAI ? 'Local AI' : 'Gemini API';

        if (useLocalAI) {
            // Using Local AI: hide everything related to Gemini
            this.geminiApiSection.hidden = true;
            this.apiKeyInputContainer.hidden = true;
            // hide change key button but keep its layout space
            this.changeKeyBtn.classList.add('hidden');
        } else {
            // Using Gemini API
            if (this.hasApiKey) {
                // API key exists: show "Change Key" button, hide input
                this.changeKeyBtn.classList.remove('hidden');
                this.geminiApiSection.hidden = true;
                this.apiKeyInputContainer.hidden = true;
            } else {
                // No API key: hide button (reserve space), show input
                this.changeKeyBtn.classList.add('hidden');
                this.geminiApiSection.hidden = false;
                this.apiKeyInputContainer.hidden = false;
            }
        }
    }

    showApiKeyInput() {
        // hide the button but preserve its space and show the API key input
        this.changeKeyBtn.classList.add('hidden');
        this.geminiApiSection.hidden = false;
        this.apiKeyInputContainer.hidden = false;
    }

    async saveSettings() {
        try {
            const useLocalAI = this.useLocalAICheckbox.checked;
            await chrome.storage.local.set({ useLocalAI });
        } catch (error) {
            console.error('Error saving AI settings:', error);
        }
    }

    async saveApiKey() {
        try {
            const apiKey = this.geminiApiKeyInput.value.trim();
            if (!apiKey) {
                alert('Please enter a valid API key.');
                return;
            }

            await chrome.storage.local.set({ geminiApiKey: apiKey });
            this.hasApiKey = true;
            alert('API key saved successfully!');
            
            // Update UI to show status instead of input
            this.updateUIState();
        } catch (error) {
            console.error('Error saving API key:', error);
            alert('Failed to save API key.');
        }
    }
}

// Welcome/info box manager
class WelcomeManager {
    constructor() {
        this.init();
    }

    async init() {
        this.overlay = document.getElementById('welcome-overlay');
        this.box = document.getElementById('welcome-box');
        if (!this.overlay || !this.box) return;

        this.gotItBtn = document.getElementById('gotItBtn');
        this.showWelcomeBtn = document.getElementById('showWelcomeBtn');

        try {
            const data = await chrome.storage.local.get(['hideWelcome']);
            const hide = data.hideWelcome;
            if (hide) {
                this.overlay.hidden = true;
                this.overlay.style.display = 'none';
            } else {
                // show overlay as flex container
                this.overlay.hidden = false;
                this.overlay.style.display = 'flex';
            }
        } catch (err) {
            console.error('Error reading welcome state:', err);
        }

        this.bindEvents();
    }

    bindEvents() {
        if (this.gotItBtn) {
            this.gotItBtn.addEventListener('click', async () => {
                try {
                    await chrome.storage.local.set({ hideWelcome: true });
                } catch (err) {
                    console.error('Error saving welcome state:', err);
                }
                if (this.overlay) {
                    this.overlay.hidden = true;
                    this.overlay.style.display = 'none';
                    this.overlay.setAttribute('aria-hidden', 'true');
                }
            });
        }

        if (this.showWelcomeBtn) {
            this.showWelcomeBtn.addEventListener('click', async () => {
                try {
                    await chrome.storage.local.set({ hideWelcome: false });
                } catch (err) {
                    console.error('Error saving welcome state:', err);
                }
                if (this.overlay) {
                    this.overlay.hidden = false;
                    this.overlay.style.display = 'flex';
                    this.overlay.removeAttribute('aria-hidden');
                }
            });
        }
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ResumesExplorer();
        new AISettingsManager();
        new WelcomeManager();
    });
} else {
    new ResumesExplorer();
    new AISettingsManager();
    new WelcomeManager();
}
