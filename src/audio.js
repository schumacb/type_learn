// Audio-related functions for speech synthesis and sound effects.

import { normalizeFilename } from './utils.js';

let audioContext;
let currentSpokenAudio = null;
let germanVoice = null;

export function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    initializeSpeech();
}

function initializeSpeech() {
    return new Promise((resolve) => {
        let tried = false;
        function findVoice() {
            if (tried) return;
            tried = true;

            const voices = window.speechSynthesis.getVoices();
            germanVoice = voices.find(v => v.lang === 'de-DE' && v.name.includes("Google"))
                || voices.find(v => v.lang === 'de-DE')
                || voices.find(v => v.lang.startsWith("de"));

            if (germanVoice) {
                console.log("✅ Stimme gefunden:", germanVoice.name);
            } else {
                console.warn("⚠️ Keine deutsche Stimme gefunden.");
            }

            window.speechSynthesis.onvoiceschanged = null;
            resolve();
        }

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            findVoice();
        } else {
            window.speechSynthesis.onvoiceschanged = findVoice;
            setTimeout(findVoice, 500); // fallback if event doesn't fire
        }
    });
}

export async function speakWordAndWait(word, force = false, isLevelIntroPlaying) {
    // Only allow playback if not in intro, unless forced (for intro itself)
    if (isLevelIntroPlaying && !force) return;

    // Cancel any previous audio or TTS
    if (currentSpokenAudio) {
        try {
            currentSpokenAudio.pause();
            currentSpokenAudio.currentTime = 0;
        } catch {}
        currentSpokenAudio = null;
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    const fileName = `${normalizeFilename(word).toLowerCase()}.mp3`;
    const localAudioPath = `./audio/${fileName}`;

    try {
        const response = await fetch(localAudioPath);
        if (response.ok) {
            const audioBlob = await response.blob();
            if (!audioBlob.type.startsWith('audio/')) {
                throw new Error("Not audio");
            }
            return await new Promise((resolve) => {
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                currentSpokenAudio = audio;
                audio.addEventListener('ended', () => {
                    URL.revokeObjectURL(audioUrl);
                    if (currentSpokenAudio === audio) currentSpokenAudio = null;
                    resolve();
                });
                audio.addEventListener('error', () => {
                    URL.revokeObjectURL(audioUrl);
                    if (currentSpokenAudio === audio) currentSpokenAudio = null;
                    resolve();
                });
                audio.play();
            });
        }
    } catch (e) {
        // fallback to TTS
    }

    // Fallback: browser TTS
    return new Promise((resolve) => {
        if (!window.speechSynthesis) return resolve();
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'de-DE';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;
        if (germanVoice) {
            utterance.voice = germanVoice;
        }
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
    });
}

export function playSound(frequency, duration, type = 'sine') {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const peakVolume = 0.25;
    const attackTime = 0.05;
    const decayTime = (duration / 1000) - attackTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime);
    oscillator.start(now);
    oscillator.stop(now + duration / 1000);
}

export function playLevelUpFanfare() {
    const C5 = 523.25, G5 = 783.99, C6 = 1046.50, E6 = 1318.51, G6 = 1567.98;
    setTimeout(() => playSound(C5, 100, 'triangle'), 0);
    setTimeout(() => playSound(G5, 100, 'triangle'), 120);
    setTimeout(() => playSound(C6, 250, 'triangle'), 240);
    setTimeout(() => { playSound(E6, 400, 'triangle'); playSound(G6, 400, 'triangle'); }, 550);
}

export function playWordCompleteSound() {
    playSound(523.25, 100, 'sine');
    setTimeout(() => playSound(659.25, 100, 'sine'), 150);
    setTimeout(() => playSound(783.99, 100, 'sine'), 300);
    setTimeout(() => playSound(1046.50, 300, 'sine'), 450);
}

export function playSuccessAudio(text) {
    return new Promise((resolve) => {
        const fileName = `${normalizeFilename(text).toLowerCase()}.mp3`;
        const audioPath = `./audio/${fileName}`;
        const audio = new Audio(audioPath);
        audio.addEventListener('ended', () => resolve());
        audio.addEventListener('error', () => resolve());
        audio.play().catch(() => resolve());
    });
}
