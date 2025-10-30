<img src="assets/icon.png" alt="JobTune Logo" width="32" height="32" style="float:left; margin-right:8px;">

## JobTune

### AI-Powered Resume Tailoring Chrome Extension

<br clear="left"/>

JobTune is a Chrome extension that automatically tailors your resume to match specific job postings using AI. It analyzes job descriptions and intelligently selects the most relevant sections from your master resume to create customized, job-specific resumes.

## Features

- **Smart Resume Tailoring**: Automatically analyzes job postings and ranks your resume sections by relevance
- **Dual AI Support**: Choose between Chrome's built-in Local AI or Google's Gemini API
- **PDF Generation**: Compile your tailored LaTeX resumes directly to PDF
- **Resume Management**: Store and manage multiple tailored resumes for different job applications
- **Supported Job Boards**: LinkedIn, Workday, and other popular job sites
- **Fast & Efficient**: Generates tailored resumes in seconds

## Installation

### Prerequisites

- Google Chrome browser (version 120 or later with built-in AI support, or any version with a Gemini API key)
- A master resume in LaTeX format

### Steps

1. Clone this repository:

   ```bash
   git clone https://github.com/AnaCoda/resume-chrome-extension.git
   cd resume-chrome-extension
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in the top-right corner)

4. Click "Load unpacked" and select the `resume-chrome-extension` directory

5. The JobTune extension icon should now appear in your Chrome toolbar

## Setup

### 1. Upload Your Master Resume

1. Click the JobTune extension icon
2. Expand the "Base Resume" section
3. Upload your master resume (`.tex`, `.txt`, or `.md` format)
4. Click "Save Base Resume"

Your master resume should include:

- Multiple work experiences using `\resumeSubheading`
- Multiple projects using `\resumeProjectHeading`
- Other sections (education, skills, etc.)

### 2. Configure AI Settings

Choose your preferred AI provider:

#### Option A: Local AI (Default)

- Toggle "Local AI" to ON (blue)
- No additional configuration needed
- Requires Chrome with built-in AI support

#### Option B: Gemini API

1. Toggle "Local AI" to OFF
2. Enter your [Google Gemini API key](https://aistudio.google.com/app/apikey)
3. Click "Save Key"
4. Click "Change Key" anytime to update your API key

## Usage

### Generating a Tailored Resume

1. Navigate to a supported job posting (LinkedIn, Workday, etc.)
2. Click the JobTune extension icon
3. Click "Tune Current Job"
4. Wait for the AI to analyze and generate your tailored resume
5. Your customized resume will be saved automatically

### Managing Generated Resumes

The extension provides several management features:

- **View LaTeX**: See the LaTeX source code of your tailored resume
- **Copy**: Copy the LaTeX code to your clipboard
- **Extract PDF**: Compile and download the resume as a PDF
- **Delete**: Remove individual resumes
- **Export All**: Export all resumes as JSON
- **Clear All**: Delete all generated resumes

### Supported Job Boards

JobTune currently supports:

- LinkedIn Jobs (`linkedin.com/jobs/*`)
- Workday (`*.myworkdayjobs.com/*/job/*`)
- Generic job posting pages with `/job` in the URL

## How It Works

1. **Page Analysis**: Extracts the job title and description from the current page
2. **Resume Splitting**: Breaks your master resume into individual sections (experiences, projects, etc.)
3. **AI Ranking**: Uses AI to score each section's relevance to the job posting
4. **Smart Selection**: Selects the most relevant sections while ensuring:
   - At least one experience and one project (if available)
   - The result fits within page limits
   - All essential sections are included
5. **LaTeX Generation**: Combines selected sections into a complete LaTeX document
6. **PDF Compilation**: Uses SwiftLaTeX for in-browser PDF generation

## Project Structure

```text
resume-chrome-extension/
├── manifest.json           # Extension configuration
├── popup.html             # Main extension UI
├── css/
│   └── popup.css         # Extension styling
├── js/
│   ├── popup.js          # UI management and resume explorer
│   ├── create.js         # Resume generation workflow
│   ├── scripts.js        # Core AI logic and resume processing
│   └── swiftlatex/       # LaTeX to PDF compilation engine
├── assets/
│   └── icon.png          # Extension icon
└── test-resumes/         # Sample resume files
```

## Technical Details

### AI Models

- **Local AI**: Chrome's built-in Gemini Nano model
- **Gemini API**: Uses `gemini-2.0-flash-exp` model via REST API

### Resume Format

JobTune expects LaTeX resumes with specific commands:

- `\resumeSubheading` for work experiences
- `\resumeProjectHeading` for projects
- `\resumeItemListEnd` to mark section boundaries
- `\section{...}` for major resume sections

### Storage

- Uses Chrome's `chrome.storage.local` API
- Stores master resume, generated resumes, timestamps, and job titles
- All data is stored locally in your browser

## Development

### File Overview

- **popup.js**: Manages the UI, handles resume storage/retrieval, PDF generation
- **create.js**: Orchestrates the resume generation process, handles URL validation
- **scripts.js**: Contains core AI logic including:
  - `splitResume()`: Parses LaTeX resume into sections
  - `rateResumeItems()`: Scores sections against job descriptions
  - `generateBestResume()`: Selects optimal sections
  - `runPrompt()`: Routes AI requests to Local AI or Gemini API

### AI Integration

The extension uses a flexible AI system that supports both local and cloud-based inference:

```javascript
// Automatically routes to appropriate AI backend
const response = await runPrompt(prompt, languageModel, aiConfig);
```

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

## Privacy & Security

- All data is stored locally in your browser
- No data is sent to third parties (except AI API calls)
- When using Gemini API, job descriptions and resume content are sent to Google's servers
- API keys are stored locally and encrypted by Chrome

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Test the extension thoroughly
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

## Future Enhancements

- [ ] Support for more job board websites
- [ ] Cover letter generation
- [ ] Resume templates and styling options
- [ ] Export to Word/PDF formats
- [ ] Multi-page resume support
- [ ] Skills keyword optimization
- [ ] Interview preparation tips based on job description

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [SwiftLaTeX](https://www.swiftlatex.com/) for in-browser LaTeX compilation
- Google Chrome for built-in AI capabilities
- Google for the Gemini API

## Support

For issues, questions, or feature requests, please [open an issue](https://github.com/AnaCoda/resume-chrome-extension/issues) on GitHub.

---

Made for job seekers everywhere
