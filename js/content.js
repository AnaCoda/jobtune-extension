
LANGUAGE_MODEL_OPTIONS = {
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
/// How frequently to update resumes.
/// If the same page is visted multiple times within this interval,
/// the resume will not be updated again.
const UPDATE_INTERVAL = 1000 * 60 * 60 * 24; // 24 hours

async function runPrompt(prompt) {
    try {
        const session = await LanguageModel.create(LANGUAGE_MODEL_OPTIONS);
        return session.prompt(prompt);
    } catch (e) {
        console.log('Prompt failed');
        console.error(e);
        console.log('Prompt:', prompt);
        reset();
        throw e;
    }
}

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

const shouldUpdate = async () => {
  const last_update_time = await chrome.runtime.sendMessage({type: "last_update_time"});
  if (last_update_time && (Date.now() - last_update_time < UPDATE_INTERVAL)) {
    return false;
  }
  return true;
};

const updateResume = async (resume, url) => {
  await chrome.runtime.sendMessage({type: "update_resume", resume, url});
}

/// This function should return the main resume
/// which is used as a root for the generation of other resumes.
const getMasterResume = async () => {
  const data = await chrome.storage.local.get("masterResume");
  return data.masterResume || null;
};

/// This is the main function that creates a resume from the document.
/// Given a language model and a document, it returns the resume text.
/// This should handle all prompting, and post processing of the resume.
///
/// Returns: Clean latex string of the resume.
async function createResume(languageModel, document) {

}

async function awake (document){
  
  if (!await shouldUpdate()) {
    console.log('Already updated recently, skipping...');
    return;
  }

  const languageModel = await createLanguageModel();
  if (!languageModel) {
    console.error('Language Model unavailable');
    return;
  }
  console.log('Creating Resume....');

  // const article = document.querySelector('article');
  const resume = await createResume(languageModel, document)

  updateResume(resume, document.URL);
  console.log('Resume updated');
}

(async () => {
    await awake(document);
})();