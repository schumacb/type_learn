// elevenlabs.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Generates audio for the given text using the ElevenLabs API and writes it to the specified output path.
 * @param {string} word - The text to synthesize.
 * @param {string} outputPath - The file path to write the resulting audio (should end with .mp3).
 * @returns {Promise<void>} Resolves when the file is written, rejects on error.
 */
async function generateAudio(word, outputPath, voiceId) {
    const XI_API_KEY = process.env.XI_API_KEY;
    const selectedVoiceId = voiceId || process.env.ELEVENLABS_VOICE || "NBqeXKdZHweef6y0B67V";

    if (!XI_API_KEY) {
        throw new Error("XI_API_KEY is not defined. Please set it in your environment or .env file.");
    }

    // Dynamically import node-fetch v3 (ESM-only)
    const { default: fetch } = await import('node-fetch');

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
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
        const errText = await response.text().catch(() => '');
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Ensure the output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, audioBuffer);
}

module.exports = { generateAudio };