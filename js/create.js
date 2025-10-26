const LANGUAGE_MODEL_OPTIONS = {
    initialPrompts: [
        { role: 'system', content: 'You are a concise assistant who is an expert in resumes.' }
    ],
    expectedOutputs: [
        { type: "text", languages: ["en"] }
    ],
    monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
            console.log(`Downloaded ${e.loaded * 100}%`);
        });
    },
};

async function createLanguageModel() {
    console.log('Creating language model...');
    const availability = await LanguageModel.availability();

    if (availability === 'unavailable') {
        // The Summarizer API isn't usable.
        return undefined;
    }
    const languageModel = await LanguageModel.create(LANGUAGE_MODEL_OPTIONS);

    return languageModel;
}

/// This function should return the main resume
/// which is used as a root for the generation of other resumes.
const getMasterResume = async () => {
    const data = await chrome.storage.local.get("masterResume");
    return data.masterResume || null;
};

let globalLatexEngine = null;

async function getOrCreateLatexEngine() {
    if (!globalLatexEngine) {
        console.log('Creating new PdfTeXEngine instance...');
        globalLatexEngine = new PdfTeXEngine();
        await globalLatexEngine.loadEngine();
        console.log('PdfTeXEngine loaded and ready');
    }
    return globalLatexEngine;
}

// ------- Progress UI helpers -------
function getProgressEls() {
    return {
        container: document.getElementById('progress-container'),
        status: document.getElementById('progress-status'),
        fill: document.getElementById('progress-fill'),
        latex: document.getElementById('latex-indicator'),
        button: document.getElementById('button-prompt'),
    };
}

function showProgress(visible) {
    const { container } = getProgressEls();
    if (!container) return;
    container.hidden = !visible;
}

function setProgress(percent, statusText) {
    const { fill, status } = getProgressEls();
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (status && statusText) status.textContent = statusText;
}

function setLatexIndicator(visible, text) {
    const { latex, status } = getProgressEls();
    if (latex) latex.hidden = !visible;
    if (status && text) status.textContent = text;
}

function setBusyState(busy) {
    const { button } = getProgressEls();
    if (button) button.disabled = !!busy;
}

async function updateResume(resume, url, jobTitle) {
    // Store the resume with timestamp and job title
    const resumeData = await chrome.storage.local.get(['resumes', 'lastUpdateTimes', 'jobTitles']);
    const resumes = resumeData.resumes || {};
    const lastUpdateTimes = resumeData.lastUpdateTimes || {};
    const jobTitles = resumeData.jobTitles || {};
    
    resumes[url] = resume;
    lastUpdateTimes[url] = Date.now();
    if (jobTitle) {
        jobTitles[url] = jobTitle;
    }
    
    await chrome.storage.local.set({ 
        resumes,
        lastUpdateTimes,
        jobTitles
    });
}

async function exportResume(resume, url) {
    const latexEngine = await getOrCreateLatexEngine();
    latexEngine.writeMemFSFile("main.tex", resume);
    latexEngine.setEngineMainFile("main.tex");
    // r contains PDF binary and compilation log.
    setLatexIndicator(true, 'Compiling LaTeX to PDF…');
    setProgress(80, 'Compiling LaTeX…');
    let r = await latexEngine.compileLaTeX();
    
    console.log('Compilation status:', r.status);
    console.log('Compilation log:', r.log);
    
    if (r.status !== 0 || !r.pdf) {
        console.error('PDF compilation failed!');
        console.error('Full log:', r.log);
        alert('PDF compilation failed. Check console for details.');
        return;
    }
    
    // save the PDF to chrome storage
    const resumeData = await chrome.storage.local.get("exportedResumes");
    const exportedResumes = resumeData.exportedResumes || {};
    exportedResumes[url] = Array.from(r.pdf); // Convert Uint8Array to regular array
    await chrome.storage.local.set({ exportedResumes });
    console.log('PDF saved successfully!');
    setLatexIndicator(false);
    setProgress(100, 'Done');
}

async function main(htmlContent, url) {
    showProgress(true);
    setBusyState(true);
    setProgress(5, 'Initializing language model…');
    const languageModel = await createLanguageModel();
    if (!languageModel) {
        console.error('Language Model unavailable');
        setProgress(0, 'Language Model unavailable');
        setBusyState(false);
        showProgress(false);
        return;
    }
    setProgress(15, 'Loading master resume…');
    const masterResume = await getMasterResume();
    console.log('Creating Resume....');

    // scripts.js
    setProgress(30, 'Parsing page…');
    const resumeResult = await createResume(languageModel, htmlContent, masterResume);
    setProgress(60, 'Saving draft…');
    await updateResume(resumeResult.resume, url, resumeResult.jobTitle);
    console.log('Resume updated');

    console.log('Exporting Resume to PDF....');
    await exportResume(resumeResult.resume, url);
    console.log('Resume exported');
    setBusyState(false);
    setTimeout(() => showProgress(false), 800);
}

// add button listeners
const hook = () => {
    const button = document.getElementById('button-prompt');
    if (button) {
        button.addEventListener('click', async () => {
            button.disabled = true;
            button.textContent = 'Generating...';
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    const injection_result = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            // Return only the serializable innerHTML string
                            return document.documentElement.innerHTML;
                        }
                    });

                    if (injection_result && injection_result[0]) {
                        // The result is an array containing the return value
                        const html_content = injection_result[0].result;
                        // Now you can work with the string content in your main function
                        await main(html_content, tab.url);
                    }
                }
            } catch (error) {
                console.error('Error processing page:', error);
                alert('An error occurred while generating the resume.');
            } finally {
                button.disabled = false;
                button.textContent = 'Generate for Page';
                setBusyState(false);
                setLatexIndicator(false);
                // keep progress visible for failure states; hide only if success handler did
            }
        });
    }
}

(async () => {
    await hook();
})();