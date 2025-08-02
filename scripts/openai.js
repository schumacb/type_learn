import * as fs from 'fs/promises';
import path from 'path';
import https from 'https';

/**
 * Generates speech audio from text using the OpenAI TTS API and writes it to the specified output path.
 * @param {string} word - The text to synthesize.
 * @param {string} outputPath - The file path to write the resulting audio.
 * @returns {Promise<void>}
 * @throws {Error} Throws if the API call fails or file writing fails.
 */
async function generateAudio(word, outputPath, voice) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }

  const selectedVoice = voice || process.env.OPENAI_VOICE || 'alloy';

  const apiUrl = 'https://api.openai.com/v1/audio/speech';
  const requestBody = JSON.stringify({
    model: 'tts-1-hd',
    input: word,
    voice: selectedVoice,
    response_format: 'mp3'
  });

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody)
    }
  };

  await new Promise((resolve, reject) => {
    const req = https.request(apiUrl, options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          reject(new Error(`OpenAI API error: ${res.statusCode} - ${errorData}`));
        });
        return;
      }

      // Collect the audio data as a buffer
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', async () => {
        try {
          const audioBuffer = Buffer.concat(data);
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, audioBuffer);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Request error: ${err.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

export { generateAudio };