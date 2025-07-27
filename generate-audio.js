// A Node.js script to pre-generate all audio files from JSON data files.

require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// The API Key is now loaded securely from an environment variable
const XI_API_KEY = process.env.XI_API_KEY;
const VOICE_ID = "NBqeXKdZHweef6y0B67V";
// --------------------

// We wrap the entire script in an async function to use dynamic import() for node-fetch.
async function main() {
    // Dynamically import node-fetch v3, which is an ES-only module.
    const { default: fetch } = await import('node-fetch');

    const audioDir = path.join(__dirname, 'audio');
    const dataDir = path.join(__dirname, 'data');

    if (!XI_API_KEY) {
        console.error("FATAL: XI_API_KEY is not defined. Please create a .env file and add your ElevenLabs API key.");
        process.exit(1);
    }
    if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir);
    }

    // --- NEW: Load all words from the JSON files ---
    const allWords = new Set();
    try {
        const dataFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
        for (const file of dataFiles) {
            const filePath = path.join(dataDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const levelData = JSON.parse(fileContent);
            levelData.forEach(item => {
                allWords.add(item.text);
            });
        }
    } catch (error) {
        console.error("Could not read data files from the 'data' directory.", error);
        process.exit(1); // Exit if we can't read the data
    }
    // ------------------------------------------------

    async function generateAudioForWord(word) {
        const fileName = `${word}.mp3`;
        const filePath = path.join(audioDir, fileName);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping "${word}", file already exists.`);
            return;
        }

        console.log(`Generating audio for "${word}"...`);
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': XI_API_KEY,
            },
            body: JSON.stringify({
                text: word,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                lang: 'de'
            }),
        });

        if (!response.ok) {
            console.error(`Error generating audio for "${word}": ${response.status} ${response.statusText}`);
            return;
        }

        // node-fetch v3 uses the standard .arrayBuffer(), which returns a generic ArrayBuffer.
        // We convert it to a Node.js Buffer before writing to the file.
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(filePath, audioBuffer);
        console.log(`Successfully saved ${fileName}`);
    }

    async function processAllWords() {
        console.log(`Found ${allWords.size} unique words to process.`);
        for (const word of allWords) {
            await generateAudioForWord(word);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log("\nAll audio generation complete!");
    }

    await processAllWords();
}

// Execute the main function and catch any unhandled errors.
main().catch(error => {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
});