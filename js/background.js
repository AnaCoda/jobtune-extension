/**
 * Return the last update time for a given URL from local storage.
 */
async function handle_last_update_time(url) {
    const data = await chrome.storage.local.get("lastUpdateTimes");
    const lastUpdateTimes = data.lastUpdateTimes || {};
    return lastUpdateTimes[url] || null;
}

async function handle_update_resume(resume, url) {
    // Update the last update time
    const data = await chrome.storage.local.get("lastUpdateTimes");
    const lastUpdateTimes = data.lastUpdateTimes || {};
    lastUpdateTimes[url] = Date.now();
    await chrome.storage.local.set({ lastUpdateTimes });
    // Store the resume
    const resumeData = await chrome.storage.local.get("resumes");
    const resumes = resumeData.resumes || {};
    resumes[url] = resume;
    await chrome.storage.local.set({ resumes });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
        case "last_update_time":
            handle_last_update_time(sender.tab.url).then(response => {
                sendResponse(response);
            });
            break;
        case "update_resume":
            handle_update_resume(msg.resume, sender.tab.url).then(() => {
                sendResponse({status: "success"});
            });
            break;
        default:
            console.warn("Unknown message type:", msg.type);
    }
    return true; // keep channel open for async response
});
