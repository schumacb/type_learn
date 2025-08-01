// A Node.js script to pre-generate all audio files from JSON data files.

require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs');
const path = require('path');

// --- TTS PROVIDER SELECTION ---
const elevenlabs = require('./elevenlabs');
const openai = require('./openai');

/**
 * TTS Provider selection precedence:
 * 1. Use process.env.TTS_PROVIDER if set (from .env).
 * 2. If not set, check for a config.json file in the project root and use its TTS_PROVIDER value if present.
 * 3. If neither is set, default to 'elevenlabs'.
 *
 * Example config.json structure:
 * {
 *   "TTS_PROVIDER": "openai"
 * }
 */
let TTS_PROVIDER = process.env.TTS_PROVIDER;
let OPENAI_VOICE = process.env.OPENAI_VOICE;
let ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE;

try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!TTS_PROVIDER && configData && typeof configData.TTS_PROVIDER === 'string' && configData.TTS_PROVIDER.trim()) {
            TTS_PROVIDER = configData.TTS_PROVIDER.trim();
        }
        if (!OPENAI_VOICE && configData && typeof configData.OPENAI_VOICE === 'string' && configData.OPENAI_VOICE.trim()) {
            OPENAI_VOICE = configData.OPENAI_VOICE.trim();
        }
        if (!ELEVENLABS_VOICE && configData && typeof configData.ELEVENLABS_VOICE === 'string' && configData.ELEVENLABS_VOICE.trim()) {
            ELEVENLABS_VOICE = configData.ELEVENLABS_VOICE.trim();
        }
    }
} catch (err) {
    // Ignore config file errors, fallback to default
}
if (!TTS_PROVIDER) {
    TTS_PROVIDER = 'elevenlabs';
}
// ------------------------------

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

        console.log(`Generating audio for "${word}" using ${TTS_PROVIDER}...`);
        try {
            if (TTS_PROVIDER === 'openai') {
                await openai.generateAudio(word, filePath, OPENAI_VOICE);
            } else {
                await elevenlabs.generateAudio(word, filePath, ELEVENLABS_VOICE);
            }
            console.log(`Successfully saved ${fileName}`);
        } catch (err) {
            console.error(`Error generating audio for "${word}":`, err.message || err);
        }
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