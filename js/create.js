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

async function updateResume(resume, url) {
    // Store the resume with timestamp
    const resumeData = await chrome.storage.local.get(['resumes', 'lastUpdateTimes']);
    const resumes = resumeData.resumes || {};
    const lastUpdateTimes = resumeData.lastUpdateTimes || {};
    
    resumes[url] = resume;
    lastUpdateTimes[url] = Date.now();
    
    await chrome.storage.local.set({ 
        resumes,
        lastUpdateTimes
    });
}

async function exportResume(resume, url) {
    const engine = new PdfTeXEngine();
    await engine.loadEngine();
    engine.writeMemFSFile("main.tex", resume);
    engine.setEngineMainFile("main.tex");
    // r contains PDF binary and compilation log.
    let r = await engine.compileLaTeX();
    
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
}

async function main(htmlContent, url) {

    const languageModel = await createLanguageModel();
    if (!languageModel) {
        console.error('Language Model unavailable');
        return;
    }
    const masterResume = await getMasterResume();
    console.log('Creating Resume....');

    // scripts.js
    const resume = await createResume(languageModel, htmlContent, masterResume)

    await updateResume(resume, url);
    console.log('Resume updated');

    console.log('Exporting Resume to PDF....');
    await exportResume(resume, url);
    console.log('Resume exported');
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
            }
        });
    }
}

(async () => {
    await hook();
})();