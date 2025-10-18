/* global LanguageModel */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

const buttonPrompt = document.body.querySelector('#button-prompt');
const elementLoading = document.body.querySelector('#loading');
const elementError = document.body.querySelector('#error');
const elementResponse = document.body.querySelector('#response');

let session;

async function runPrompt(prompt, params) {
    try {
        if (!session) {
            session = await LanguageModel.create(params);
        }
        return session.prompt(prompt);
    } catch (e) {
        console.log('Prompt failed');
        console.error(e);
        console.log('Prompt:', prompt);
        reset();
        throw e;
    }
}

buttonPrompt.addEventListener('click', async () => {
    const prompt = "Say hello in a funny way"
    const availability = await LanguageModel.availability({ expectedOutputs: [{ type: "text", languages: ["en"] }] });
    console.log('Model availability:', availability);
    showLoading();
    try {
        const params = {
            initialPrompts: [
                { role: 'system', content: 'You are a helpful and friendly assistant.' }
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
        const response = await runPrompt(prompt, params);
        showResponse(response);
    }
    catch (e) {
        showError(e);
    }
});

function showLoading() {
    hide(elementResponse);
    hide(elementError);
    show(elementLoading);
}

function showResponse(response) {
    hide(elementLoading);
    show(elementResponse);
    elementResponse.innerHTML = DOMPurify.sanitize(marked.parse(response));
}

function showError(error) {
    show(elementError);
    hide(elementResponse);
    hide(elementLoading);
    elementError.textContent = error;
}

async function reset() {
    if (session) {
        session.destroy();
    }
    session = null;
}

function show(element) {
    element.removeAttribute('hidden');
}

function hide(element) {
    element.setAttribute('hidden', '');
}