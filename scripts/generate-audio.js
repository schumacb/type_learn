// A Node.js script to pre-generate all audio files from JSON data files.

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Always load .env from project root, regardless of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import fs from 'fs';

// --- TTS PROVIDER SELECTION ---
let elevenlabs = null;
let openai = null;

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
    const configPath = path.join(__dirname, 'generate-audio.config');
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
    const audioDir = path.join(__dirname, '../src/audio');
    const dataDir = path.join(__dirname, '../src/data');

    // Parse CLI arguments for special modes
    const args = process.argv.slice(2);
    const listMode = args.includes('--list-missing-unused') || args.includes('--list-audio-status');

    if (TTS_PROVIDER === 'elevenlabs' && !XI_API_KEY) {
        console.error("FATAL: XI_API_KEY is not defined for ElevenLabs. Please add it to your .env file.");
        process.exit(1);
    }
    if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir);
    }

    // --- NEW: Load all words from the JSON files ---
    function collectAllWordsAndAudioFilenames() {
        const allWords = new Set();
        const expectedFiles = new Set();
        try {
            const dataFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
            for (const file of dataFiles) {
                const filePath = path.join(dataDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const levelData = JSON.parse(fileContent);

                // Special handling for success-messages.json
                if (file === 'success-messages.json' && Array.isArray(levelData)) {
                    levelData.forEach(msg => {
                        if (msg && typeof msg.text === 'string') {
                            allWords.add(msg.text);
                        }
                    });
                    continue;
                }

                if (Array.isArray(levelData)) {
                    // Legacy format: array of items
                    levelData.forEach(item => {
                        allWords.add(item.text);
                    });
                } else if (levelData && Array.isArray(levelData.items)) {
                    // New format: { items: [...] }
                    if (levelData.name) allWords.add(levelData.name);
                    if (levelData.description) allWords.add(levelData.description);
                    levelData.items.forEach(item => {
                        allWords.add(item.text);
                    });
                }
            }
            for (const word of allWords) {
                expectedFiles.add(`${normalizeFilename(word).toLowerCase()}.mp3`);
            }
        } catch (error) {
            console.error("Could not read data files from the 'data' directory.", error);
            process.exit(1); // Exit if we can't read the data
        }
        return { allWords, expectedFiles };
    }

    // Shared: get missing and unused audio files
    function getAudioFileStatus(expectedFiles, audioDir) {
        const actualFiles = new Set(fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3')));
        const missing = [];
        for (const fname of expectedFiles) {
            if (!actualFiles.has(fname)) missing.push(fname);
        }
        const unused = [];
        for (const fname of actualFiles) {
            if (!expectedFiles.has(fname)) unused.push(fname);
        }
        return { missing, unused, actualFiles };
    }

    const { allWords, expectedFiles } = collectAllWordsAndAudioFilenames();
    // ------------------------------------------------

    // --- LIST MISSING/UNUSED AUDIO FILES MODE ---
    if (listMode) {
        const { missing, unused } = getAudioFileStatus(expectedFiles, audioDir);

        console.log("=== Audio File Status ===");
        console.log(`Missing audio files (${missing.length}):`);
        if (missing.length) {
            missing.forEach(f => console.log("  " + f));
        } else {
            console.log("  None");
        }
        console.log(`\nUnused audio files (${unused.length}):`);
        if (unused.length) {
            unused.forEach(f => console.log("  " + f));
        } else {
            console.log("  None");
        }
        process.exit(0);
    }
    // ------------------------------------------------

    // --- CLEANUP: Remove audio files that are no longer needed ---
    function cleanupUnusedAudioFiles() {
        const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
        let removed = 0;
        for (const file of audioFiles) {
            if (!expectedFiles.has(file)) {
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

    // Normalize filename: underscores for spaces, ASCII for special chars.
    function normalizeFilename(str) {
        return str
            .replaceAll(" ", "_")
            .replaceAll("Ä", "AE")
            .replaceAll("Ö", "OE")
            .replaceAll("Ü", "UE")
            .replaceAll("ä", "ae")
            .replaceAll("ö", "oe")
            .replaceAll("ü", "ue")
            .replaceAll("ß", "SS")
            .replace(/[^A-Za-z0-9_]/g, ""); // Remove any other non-ASCII chars
    }

    async function generateAudioForWord(word) {
        const fileName = `${normalizeFilename(word).toLowerCase()}.mp3`;
        const filePath = path.join(audioDir, fileName);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping "${word}", file already exists.`);
            return;
        }

        // Dynamically import TTS providers if not already loaded
        async function getTTSModule(modulePath) {
            try {
                const mod = await import(modulePath);
                if (mod && typeof mod.generateAudio === 'function') return mod;
                if (mod && mod.default && typeof mod.default.generateAudio === 'function') return mod.default;
                if (mod && mod.default && typeof mod.default === 'object' && typeof mod.default.generateAudio === 'function') return mod.default;
            } catch (e) {
                // ignore
            }
            // Fallback: try CommonJS require via createRequire
            try {
                const { createRequire } = await import('module');
                const require = createRequire(import.meta.url);
                const cjsmod = require(modulePath);
                if (cjsmod && typeof cjsmod.generateAudio === 'function') return cjsmod;
            } catch (e) {
                // ignore
            }
            return null;
        }
        if (TTS_PROVIDER === 'openai' && !openai) {
            openai = await getTTSModule('./openai.js');
        }
        if (TTS_PROVIDER !== 'openai' && !elevenlabs) {
            elevenlabs = await getTTSModule('./elevenlabs.js');
        }

        console.log(`Generating audio for "${word}" using ${TTS_PROVIDER}...`);
        try {
            if (TTS_PROVIDER === 'openai') {
                if (!openai || typeof openai.generateAudio !== 'function') throw new Error('OpenAI TTS module not loaded');
                await openai.generateAudio(word, filePath, OPENAI_VOICE);
            } else {
                if (!elevenlabs || typeof elevenlabs.generateAudio !== 'function') throw new Error('ElevenLabs TTS module not loaded');
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
        // Use shared missing/unused logic
        const { missing, unused, actualFiles } = getAudioFileStatus(expectedFiles, audioDir);

        // Map missing filenames back to words
        // (since filenames are normalized, we need to match them to the original words)
        const normalizedToWord = {};
        for (const word of allWords) {
            normalizedToWord[`${normalizeFilename(word).toLowerCase()}.mp3`] = word;
        }
        const missingWords = missing.map(fname => normalizedToWord[fname]).filter(Boolean);

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