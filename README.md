# Resume Chrome Extension

This Chrome extension helps you manage and tailor resumes for different job applications directly in your browser. It allows you to store a master resume and automatically generates new, specific resumes for each job application you visit.

## How It Works

The extension is built around a simple but powerful workflow:

1. **Master Resume**: You begin by setting a "master" resume. This is your generic, all-purpose resume that serves as a template.
2. **Job Application Visit**: When you navigate to a webpage that matches a predefined job application site pattern, the extension's background script is activated.
3. **Resume Generation**: The extension creates a new, distinct resume for that specific job application. This new resume is a copy of your master resume, ready to be tailored.
4. **Management**: All your generated resumes are stored and can be managed through the extension's popup.

This allows you to keep track of every resume you've used for each application, without cluttering your file system.

## Features

- **Centralized Resume Storage**: Keeps all your job-specific resumes in one place.
- **Search and Filter**: Quickly find resumes by URL or content.
- **View and Copy**: View full resumes in a modal and copy their content to your clipboard with a single click.
- **Export**: Export all your resume data to a JSON file for backup or external use.
- **Delete**: Clean up old or unused resumes individually or all at once.

## Code Structure

The extension is composed of several key files:

- `manifest.json`: The core file that defines the extension's properties, permissions, and scripts.
- `popup.html` & `css/popup.css`: The HTML and CSS for the main user interface that you see when you click the extension icon.
- `js/popup.js`: The heart of the user interface. It handles loading resumes from storage, rendering them, and managing all user interactions like searching, deleting, and viewing.
- `js/background.js`: The background script that runs independently of the web pages. It is responsible for detecting when the user visits a relevant job application page and initiating the resume creation process.
- `js/content.js`: A script that is injected into the job application webpages. Its primary role would be to extract relevant information from the page, which can then be used to either pre-fill parts of the resume or to name/tag the resume appropriately.
- `assets/`: Contains static assets like the extension's icon.

## Installation and Usage

1. **Build the extension**:

   ```bash
   npm i
   npm run build
   ```

2. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable "Developer mode" in the top right corner.
   - Click "Load unpacked".
   - Select the `dist` folder that was created by the build process.

3. **Using the Extension**:
   - Once installed, you can click the extension's icon in the Chrome toolbar to open the resume management popup.
   - Initially, it will be empty. The process for setting a master resume and generating new ones will depend on the specific implementation of the background and content scripts.
   - As you visit job sites, new resumes will appear in the popup, which you can then manage as needed.
