# <img src="./assets/icon.png" alt="Logo" width="30" style="vertical-align: middle; margin-right: 8px;" /> JobTune <!-- markdownlint-disable-line MD033 -->

**Keep your comprehensive base resume, let AI create focused one-page versions.**

JobTune intelligently shortens your multi-page resume by selecting only the most relevant experiences and projects for each job application. Upload your complete resume once, then generate tailored single-page versions that highlight what matters most to each employer.

## How It Works

**Your base resume can have everything** - all your experiences, projects, skills, and achievements across multiple pages.

**JobTune creates one-page versions** by:

1. Analyzing the job posting to understand what's important
2. Scoring each of your experiences and projects by relevance
3. Intelligently selecting the best-fit sections
4. Generating a focused, single-page resume tailored to that specific job

## Quick Start

1. Load extension in Chrome (`chrome://extensions/` → Developer mode → Load unpacked)
2. Upload your complete base LaTeX resume in the "Base Resume" section. This should be *Jake's Resume Format*.
3. Choose AI: Local AI (default) or Gemini API (requires [API key](https://aistudio.google.com/app/apikey))
4. Navigate to a LinkedIn or Workday job posting
5. Click "Tune Current Job" - AI will automatically select and generate your tailored one-page resume

## Usage

**Generate Tailored Resume**: On any job posting, click "Tune Current Job" and the AI will:

- Extract the job requirements
- Rank all your experiences and projects by relevance
- Select the top matches that fit on one page
- Create a focused resume that highlights your most relevant qualifications

**Manage Your Resumes**: Each tailored version is saved and accessible from the extension:

- View LaTeX source to see what was selected
- Copy to clipboard for editing
- Extract as PDF for applications
- Compare different versions to see what the AI prioritized

## Troubleshooting

### Local AI Issues

- **Error: "Language Model unavailable"**: Your Chrome version may not support built-in AI. Try using Gemini API instead.
- Update to Chrome 120+ or enable AI features in `chrome://flags`

### Gemini API Issues

- **Error: "Invalid API key"**: Verify your API key at [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Error: "API rate limit exceeded"**: Wait a few minutes and try again
- Check your API quota in the Google Cloud Console

### PDF Generation Issues

- Ensure your LaTeX is valid
- Check the browser console for compilation errors
- Verify all LaTeX packages used are supported by SwiftLaTeX

### Job Page Not Supported

- Currently supports LinkedIn and Workday job postings
- For other sites, the extension will show: "Please navigate to a supported job posting page"
