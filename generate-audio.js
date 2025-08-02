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
// --------------------

// We wrap the entire script in an async function to use dynamic import() for node-fetch.
async function main() {
    // Dynamically import node-fetch v3, which is an ES-only module.
    const { default: fetch } = await import('node-fetch');
    const audioDir = path.join(__dirname, 'audio');
    const dataDir = path.join(__dirname, 'data');

    if (TTS_PROVIDER === 'elevenlabs' && !XI_API_KEY) {
        console.error("FATAL: XI_API_KEY is not defined for ElevenLabs. Please add it to your .env file.");
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

    // --- CLEANUP: Remove audio files that are no longer needed ---
    function cleanupUnusedAudioFiles() {
        const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
        let removed = 0;
        for (const file of audioFiles) {
            const word = file.slice(0, -4); // Remove .mp3
            if (!allWords.has(word)) {
                const filePath = path.join(audioDir, file);
                fs.unlinkSync(filePath);
                console.log(`Removed unused audio file: ${file}`);
                removed++;
            }
        }
        if (removed === 0) {
            console.log("No unused audio files to remove.");
        } else {
            console.log(`Removed ${removed} unused audio file(s).`);
        }
    }

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

    // Helper: concurrency-limited pool
    async function processWithConcurrencyLimit(items, worker, concurrency = 3) {
        let index = 0;
        let active = 0;
        let results = [];
        return new Promise((resolve, reject) => {
            function next() {
                if (index === items.length && active === 0) {
                    resolve(Promise.all(results));
                    return;
                }
                while (active < concurrency && index < items.length) {
                    const i = index++;
                    active++;
                    const p = Promise.resolve(worker(items[i]))
                        .catch(err => {
                            // Log error but continue
                            console.error(`Error processing item:`, err);
                        })
                        .finally(() => {
                            active--;
                            next();
                        });
                    results.push(p);
                }
            }
            next();
        });
    }

    async function processAllWords() {
        console.log(`Found ${allWords.size} unique words to process.`);
        // Gather missing words only
        const missingWords = [];
        for (const word of allWords) {
            const fileName = `${word}.mp3`;
            const filePath = path.join(audioDir, fileName);
            if (!fs.existsSync(filePath)) {
                missingWords.push(word);
            }
        }
        console.log(`Need to generate ${missingWords.length} audio files (missing).`);

        if (missingWords.length === 0) {
            console.log("No missing audio files. All files are up to date.");
            return;
        }

        // Concurrency limit (now configurable via env, default 2 for ElevenLabs)
        const CONCURRENCY = parseInt(process.env.AUDIO_GEN_CONCURRENCY, 10) || 2;
        console.log(`Using concurrency limit: ${CONCURRENCY}`);
        await processWithConcurrencyLimit(
            missingWords,
            async (word) => {
                await generateAudioForWord(word);
                // Optional: small delay to avoid hammering API
                await new Promise(resolve => setTimeout(resolve, 500));
            },
            CONCURRENCY
        );
        console.log("\nAll audio generation complete!");
    }

    cleanupUnusedAudioFiles();
    await processAllWords();
}

// Execute the main function and catch any unhandled errors.
main().catch(error => {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
});