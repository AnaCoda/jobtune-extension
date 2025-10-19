// Enum for resume item types
const ResumeItemType = {
    EXPERIENCE: 'EXPERIENCE',
    PROJECT: 'PROJECT',
    OTHER: 'OTHER'
};

/// Class representing a resume item
class ResumeItem {
    constructor(type, content, alwaysInclude = false) {
        this.type = type;
        this.content = content;
        this.humanReadableContent = content.replace(/\\[a-zA-Z]+/g, '').replace(/\{|\}/g, '').trim();
        this.alwaysInclude = alwaysInclude;
    }
}

/// This function takes in a resume text and splits it into ResumeItem objects.
/// For now, each ResumeItem represents either an experience, project, or other content.
///
/// Returns: Array of ResumeItem objects
function splitResume(resumeText) {
    const items = [];
    
    // Find ALL sections dynamically
    const sectionPattern = /\\section\{([^}]+)\}/g;
    const sections = [];
    let match;
    
    while ((match = sectionPattern.exec(resumeText)) !== null) {
        sections.push({
            name: match[1],
            start: match.index,
            end: -1 
        });
    }
    
    // Calculate end positions for each section
    for (let i = 0; i < sections.length; i++) {
        if (i < sections.length - 1) {
            sections[i].end = sections[i + 1].start;
        } else {
            sections[i].end = resumeText.length;
        }
    }
    
    // Now find all \resumeSubheading and \resumeProjectHeading with their positions
    const allMatches = [];
    
    // Find all \resumeSubheading
    const subheadingPattern = /\\resumeSubheading/g;
    while ((match = subheadingPattern.exec(resumeText)) !== null) {
        // Find which section this belongs to
        const containingSection = sections.find(s => match.index >= s.start && match.index < s.end);
        
        // Only include if it's in a section that looks like Experience/Work/Employment
        if (containingSection && /experience|work|employment/i.test(containingSection.name)) {
            allMatches.push({
                index: match.index,
                type: ResumeItemType.EXPERIENCE
            });
        }
        // Otherwise, it's probably Education or something else - we'll skip it
    }
    
    // Find all \resumeProjectHeading
    const projectHeadingPattern = /\\resumeProjectHeading/g;
    while ((match = projectHeadingPattern.exec(resumeText)) !== null) {
        // Find which section this belongs to
        const containingSection = sections.find(s => match.index >= s.start && match.index < s.end);
        
        // Only include if it's in a section that looks like Projects
        if (containingSection && /project/i.test(containingSection.name)) {
            allMatches.push({
                index: match.index,
                type: ResumeItemType.PROJECT
            });
        }
    }
    
    // Sort matches by position
    allMatches.sort((a, b) => a.index - b.index);
    
    // Build the items array
    let currentIndex = 0;
    
    for (let i = 0; i < allMatches.length; i++) {
        const startMatch = allMatches[i];
        
        // Add content before this match as OTHER
        if (startMatch.index > currentIndex) {
            const beforeContent = resumeText.substring(currentIndex, startMatch.index);
            if (beforeContent.trim()) {
                items.push(new ResumeItem(ResumeItemType.OTHER, beforeContent, true));
            }
        }
        
        // Find which section this item belongs to
        const containingSection = sections.find(s => startMatch.index >= s.start && startMatch.index < s.end);
        const sectionEnd = containingSection ? containingSection.end : resumeText.length;
        
        // Find the end of this item (look for \resumeItemListEnd)
        const searchStart = startMatch.index;
        const endPattern = /\\resumeItemListEnd/g;
        endPattern.lastIndex = searchStart;
        
        const endMatch = endPattern.exec(resumeText);
        if (endMatch && endMatch.index < sectionEnd) {
            // Found an end marker within the same section
            const endIndex = endMatch.index + endMatch[0].length;
            const itemContent = resumeText.substring(startMatch.index, endIndex);
            items.push(new ResumeItem(startMatch.type, itemContent, false));
            currentIndex = endIndex;
        } else {
            // If no end found within section, take until next match or end of section
            let nextBoundary = sectionEnd;
            if (i + 1 < allMatches.length && allMatches[i + 1].index < sectionEnd) {
                nextBoundary = allMatches[i + 1].index;
            }
            const itemContent = resumeText.substring(startMatch.index, nextBoundary);
            items.push(new ResumeItem(startMatch.type, itemContent, false));
            currentIndex = nextBoundary;
        }
    }
    
    // Add any remaining content as OTHER
    if (currentIndex < resumeText.length) {
        const remainingContent = resumeText.substring(currentIndex);
        if (remainingContent.trim()) {
            items.push(new ResumeItem(ResumeItemType.OTHER, remainingContent, true));
        }
    }
    
    return items;
}

/// This function rates each ResumeItem against a job description.
/// Items marked as alwaysInclude get the maximum score.
/// 
/// Returns: Array of scores (numbers between 0 and 1) corresponding to each ResumeItem
async function rateResumeItems(resumeItems, jobDescription) {
    const scores = [];
    
    for (const item of resumeItems) {
        // Always include items get max score
        if (item.alwaysInclude) {
            scores.push(1.0);
            continue;
        }
        
        // Skip rating OTHER items (they should all be alwaysInclude anyway)
        if (item.type === ResumeItemType.OTHER) {
            scores.push(1.0);
            continue;
        }
        
        // Rate the item against the job description (TODO)
        scores.push(0.5);
    }
    return scores;
}

/// This function creates the best possible resume by selecting items based on scores
/// and ensuring the result fits within the page limit.
/// 
/// Returns: String containing the final LaTeX resume text
function generateBestResume(resumeItems, scores, pageLimit = 1) {
    // Create array of items with their scores and indices
    const scoredItems = resumeItems.map((item, index) => ({
        item,
        score: scores[index],
        index
    }));
    
    // Separate always include items from optional items
    const alwaysInclude = scoredItems.filter(si => si.item.alwaysInclude || si.item.type === ResumeItemType.OTHER);
    const optional = scoredItems.filter(si => !si.item.alwaysInclude && si.item.type !== ResumeItemType.OTHER);
    
    // Sort optional items by score (descending)
    optional.sort((a, b) => b.score - a.score);
    
    // Start with all always-include items
    const selectedItems = [...alwaysInclude];
    
    // Add optional items in order of relevance
    // TODO: In a real implementation, we would need to render to PDF and check page count
    const maxContentLength = pageLimit * 3500;
    let currentLength = selectedItems.reduce((sum, si) => sum + si.item.content.length, 0);
    
    for (const scoredItem of optional) {
        const itemLength = scoredItem.item.content.length;
        if (currentLength + itemLength <= maxContentLength) {
            selectedItems.push(scoredItem);
            currentLength += itemLength;
        }
    }
    
    // Sort selected items back to original order to maintain resume structure
    selectedItems.sort((a, b) => a.index - b.index);
    
    // Concatenate all selected items
    return selectedItems.map(si => si.item.content).join('');
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

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ResumeItemType,
        ResumeItem,
        splitResume,
        rateResumeItems,
        generateBestResume,
        estimateMaxContentLength
    };
}