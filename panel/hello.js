/* global LanguageModel */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

const buttonPrompt = document.body.querySelector('#button-prompt');
const elementLoading = document.body.querySelector('#loading');
const elementError = document.body.querySelector('#error');
const elementResponse = document.body.querySelector('#response');
const elementResumeLatex = document.body.querySelector('#resume-latex');
const fileInput = document.body.querySelector('#file-input');
const clearFileBtn = document.body.querySelector('#clear-file');

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

const STORAGE_KEY = 'persistedResume';

function renderFile(name, text) {
    show(elementResumeLatex);
    const header = name ? `<h3>${DOMPurify ? DOMPurify.sanitize(name) : name}</h3>` : '';
    const body = (marked && DOMPurify) ? DOMPurify.sanitize(marked.parse(text || '')) : (text || '');
    elementResumeLatex.innerHTML = header + '<pre>' + body + '</pre>';
}

async function saveFile(name, text) {
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: { name, text } });
    } catch (e) {
        console.warn('chrome.storage.local unavailable, falling back to localStorage', e);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, text }));
    }
}

async function loadStoredFile() {
    try {
        const r = await chrome.storage.local.get(STORAGE_KEY);
        const entry = r && r[STORAGE_KEY];
        if (entry && entry.text) {
            renderFile(entry.name, entry.text);
        }
    } catch (e) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const entry = JSON.parse(raw);
                renderFile(entry.name, entry.text);
            } catch (_e) {
                console.error('Failed to parse stored file', _e);
            }
        }
    }
}

fileInput?.addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const text = await f.text();
    renderFile(f.name, text);
    await saveFile(f.name, text);
});

clearFileBtn?.addEventListener('click', async () => {
    try {
        await chrome.storage.local.remove(STORAGE_KEY);
    } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
    }
    elementResumeLatex.innerHTML = '';
    hide(elementResumeLatex);
});

loadStoredFile();

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