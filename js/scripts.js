/// This function takes in a resume text and splits it into shards.
/// Each shard should represent a coherent section of the resume,
/// such as "Work Experience", "Education", etc.
///
/// Returns: Array of object, which is split text.
function shardResume(resumeText) {

}

/// This is the main function that creates a resume from the document.
/// Given a language model and a document, it returns the resume text.
/// This should handle all prompting, and post processing of the resume.
///
/// Returns: Clean latex string of the resume.
async function createResume(languageModel, document, masterResume) {

}

/// This function runs a prompt against the language model,
/// handling errors appropriately.
///
/// Returns: The response from the language model.
async function runPrompt(prompt) {
    try {
        const session = await LanguageModel.create(LANGUAGE_MODEL_OPTIONS);
        return session.prompt(prompt);
    } catch (e) {
        console.log('Prompt failed');
        console.error(e);
        console.log('Prompt:', prompt);
        throw e;
    }
}