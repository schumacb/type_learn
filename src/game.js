// Core game logic and state management.

import { game } from './config.js';
import { playLevelUpFanfare, playSound, playSuccessAudio, playWordCompleteSound, speakWordAndWait, cancelSpeechPlayback } from './audio.js';
import {
    correctElement,
    createFireworks,
    createParticles,
    displayElement,
    errorsElement,
    highlightNextKey,
    initKeyboard,
    levelDisplayElement,
    levelSelectElement,
    progressElement,
    showTigerAnimation,
    updateDisplay,
    wordIconsElement,
    displaySuccessMessage,
    clearSuccessMessage
} from './ui.js';
import { keyEls } from './ui.js';

let levelManifest = [];
let successMessages = [];

let gameState = {
    currentWord: "",
    currentIcons: [],
    currentIndex: 0,
    correctCount: 0,
    errorCount: 0,
    level: 0,
    progress: 0,
    usedWords: [],
    isLevelIntroPlaying: false,
    gameStarted: false,
    currentLevelData: null,
};
 
async function tryLoadJson(pathRel) {
    // Be robust across dev/build and hosting roots:
    // 1) relative to current page (e.g. ./data/levels.json from /src/index.html)
    // 2) absolute under /src (e.g. /src/data/levels.json) useful with Vite dev
    // 3) module-relative using import.meta.url (bundled builds)
    const attempts = [
        pathRel,
        pathRel.startsWith('./') ? '/src/' + pathRel.slice(2) : pathRel,
        (() => {
            try {
                return new URL(pathRel, import.meta.url).toString();
            } catch {
                return null;
            }
        })(),
    ].filter(Boolean);

    for (const url of attempts) {
        try {
            const res = await fetch(url);
            if (res && res.ok) {
                return await res.json();
            }
        } catch {
            // try next
        }
    }
    throw new Error(`Failed to load JSON from: ${attempts.join(' | ')}`);
}

export async function loadGameData() {
    try {
        // Load success messages
        try {
            successMessages = await tryLoadJson('./data/success-messages.json');
        } catch (e) {
            console.warn("Error loading success-messages.json:", e);
            successMessages = [];
        }

        // Load level manifest
        levelManifest = await tryLoadJson('./data/levels.json');

        if (levelManifest.length === 0) {
            throw new Error("No levels found in manifest.");
        }
        return levelManifest;
    } catch (error) {
        console.error("Fatal Error: Could not load game data.", error);
        displayElement.textContent = "Fehler beim Laden der Spieldaten!";
        return [];
    }
}
// Wait for Enter key or timeout (ms)
export function waitForEnterOrTimeout(ms) {
    return new Promise(resolve => {
        let done = false;

        function cleanup() {
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('pointerdown', onPointer, true);
        }

        function finish(reason) {
            if (done) return;
            done = true;
            cleanup();
            resolve(reason);
        }

        function onKey(e) {
            if (done) return;
            if (e.repeat) return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            if (e.key === 'Enter' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault(); // avoid scroll
                finish('key');
            }
        }

        function onPointer(_e) {
            finish('pointer');
        }

        window.addEventListener('keydown', onKey, true);
        window.addEventListener('pointerdown', onPointer, true);

        setTimeout(() => finish('timeout'), ms);
    });
}

// Skippable user input during speech (no timeout)
function waitForSkipOnly() {
    return new Promise(resolve => {
        let done = false;
        function finish(reason) {
            if (done) return;
            done = true;
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('pointerdown', onPointer, true);
            resolve(reason);
        }
        function onKey(e) {
            if (done) return;
            if (e.repeat) return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault();
                finish('key');
            }
        }
        function onPointer(_e) { finish('pointer'); }
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('pointerdown', onPointer, true);
    });
}

// Speak a line but allow user to skip immediately (cancels audio/TTS)
async function speakSkippable(text) {
    try {
        const result = await Promise.race([
            speakWordAndWait(text, true, false).then(() => 'spoken'),
            waitForSkipOnly().then(() => 'skipped'),
        ]);
        if (result === 'skipped') {
            try { cancelSpeechPlayback(); } catch {}
        }
        return result;
    } catch {
        try { cancelSpeechPlayback(); } catch {}
        return 'skipped';
    }
}

// App intro sequence: loads intro.json, plays TTS and tiger animation
export async function playAppIntro() {
    if (gameState.isAppIntroPlaying) return;
    gameState.isAppIntroPlaying = true;

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    document.querySelectorAll('audio').forEach(a => { try { a.pause(); a.currentTime = 0; } catch {} });

    showTigerAnimation('talk');
    let introData = null;
    try {
        introData = await tryLoadJson('./data/intro.json');
    } catch (e) {
        console.error("Error loading intro.json:", e);
        displayElement.textContent = "Fehler beim Laden des Intros!";
        gameState.isAppIntroPlaying = false;
        showTigerAnimation('hide');
        return;
    }
    const introArr = Array.isArray(introData.intro) ? introData.intro : [];
    for (let i = 0; i < introArr.length; ++i) {
        const { text, pause } = introArr[i];
        displayElement.textContent = text;
        showTigerAnimation('talk');
        let spokenResult = 'spoken';
        try { spokenResult = await speakSkippable(text); } catch (e) {
            console.error("Error speaking intro word:", e);
        }
        showTigerAnimation('idle'); // pause shows frame 0 (no animation)
        if (spokenResult !== 'skipped') {
            await waitForEnterOrTimeout((typeof pause === "number" ? pause : 0.5) * 1000);
        } else {
            break; // skip remaining intro lines if user requested skip
        }
    }
    displayElement.textContent = "";
    gameState.isAppIntroPlaying = false;
    showTigerAnimation('hide');
}

async function loadLevel(levelIndex) {
    if (!levelManifest[levelIndex]) {
        console.error(`Error: Level ${levelIndex} not found in manifest.`);
        return false;
    }
    const levelFile = levelManifest[levelIndex].file;
    try {
        gameState.currentLevelData = await tryLoadJson(`./data/${levelFile}`);
        return true;
    } catch (error) {
        console.error(`Error loading level ${levelIndex}:`, error);
        gameState.currentLevelData = null;
        return false;
    }
}

async function showLevelIntro() {
    const levelObj = getCurrentLevelObj();
    gameState.isLevelIntroPlaying = true;
    showTigerAnimation('talk');

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    document.querySelectorAll('audio').forEach(a => { try { a.pause(); a.currentTime = 0; } catch {} });

    if (!levelObj) {
        gameState.isLevelIntroPlaying = false;
        showTigerAnimation('hide');
        generateNewWord();
        return;
    }

    displayElement.textContent = levelObj.name || "Level";
    let nameResult = 'spoken';
    try { nameResult = await speakSkippable(levelObj.name || "Level"); } catch (e) {
        console.error("Error speaking level intro:", e);
    }
    showTigerAnimation('idle'); // show first frame during pause
    if (nameResult !== 'skipped') {
        await waitForEnterOrTimeout(game.introPause);
    } else {
        displayElement.textContent = "";
        gameState.isLevelIntroPlaying = false;
        showTigerAnimation('hide');
        generateNewWord();
        return;
    }

    if (levelObj.description) {
        displayElement.textContent = levelObj.description;
        showTigerAnimation('talk');
        let descResult = 'spoken';
        try { descResult = await speakSkippable(levelObj.description); } catch (e) {}
        showTigerAnimation('idle'); // show first frame during pause
        if (descResult !== 'skipped') {
            await waitForEnterOrTimeout(game.introPause);
        } else {
            displayElement.textContent = "";
            gameState.isLevelIntroPlaying = false;
            showTigerAnimation('hide');
            generateNewWord();
            return;
        }
    }

    displayElement.textContent = "";
    gameState.isLevelIntroPlaying = false;
    showTigerAnimation('hide');
    generateNewWord();
}

function getCurrentLevelObj() {
    return gameState.currentLevelData;
}

function getWordsForLevel() {
    const levelObj = getCurrentLevelObj();
    if (!levelObj) return [];
    return Array.isArray(levelObj.items) ? levelObj.items : [];
}

function generateNewWord() {
    if (gameState.isLevelIntroPlaying) return;
    const words = getWordsForLevel();
    if (!words || words.length === 0) return;
    if (gameState.usedWords.length >= words.length) gameState.usedWords = [];

    const availableWords = words.filter((_, index) => !gameState.usedWords.includes(index));
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const selectedWord = availableWords[randomIndex];
    const wordIndex = words.indexOf(selectedWord);
    gameState.usedWords.push(wordIndex);

    gameState.currentWord = selectedWord.text;
    gameState.currentIcons = selectedWord.icons;
    gameState.currentIndex = 0;

    const levelObj = getCurrentLevelObj();
    const caseSensitive = levelObj.caseSensitive === true;
    updateDisplay(gameState.currentWord, gameState.currentIndex, caseSensitive);

    wordIconsElement.innerHTML = '';
    (gameState.currentIcons || []).forEach((icon, i) => {
        const iconElement = document.createElement('div');
        iconElement.className = 'icon';
        iconElement.textContent = icon;
        iconElement.style.animationDelay = `${i * 0.2}s`;
        wordIconsElement.appendChild(iconElement);
    });

    speakWordAndWait(gameState.currentWord, false, gameState.isLevelIntroPlaying);
    highlightNextKey(gameState.currentWord, gameState.currentIndex);
}

export function handleKeyPress(key) {
    if (!gameState.gameStarted) return;

    const modifierKeys = [
        'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ContextMenu', 'ScrollLock', 'Pause', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
        ...Array.from({length: 24}, (_, i) => `F${i+1}`)
    ];
    if (modifierKeys.includes(key)) return;

    const keyElement = (keyEls && keyEls.get(key)) || document.querySelector(`.key[data-key="${key}"]`);
    if (keyElement) {
        keyElement.classList.add('active');
        setTimeout(() => keyElement.classList.remove('active'), 150);
    }

    const levelObj = getCurrentLevelObj();
    const enabledKeys = Array.isArray(levelObj.enabledKeys) ? levelObj.enabledKeys : null;
    const caseSensitive = levelObj.caseSensitive === true;

    let keyToCheck = key;
    let charToCheck = (gameState.currentWord || '')[gameState.currentIndex];
    if (charToCheck == null) return;

    if (!caseSensitive) {
        keyToCheck = keyToCheck.toUpperCase();
        charToCheck = charToCheck.toUpperCase();
    }

    if (enabledKeys && !enabledKeys.includes(keyToCheck)) {
        return;
    }

    if (keyToCheck === charToCheck) {
        gameState.correctCount++;
        correctElement.textContent = gameState.correctCount;
        createParticles(key);
        gameState.currentIndex++;
        updateDisplayAndCheckState();
    } else {
        gameState.errorCount++;
        errorsElement.textContent = gameState.errorCount;
        playSound(164.81, 250, 'sine');
        displayElement.classList.add('error-flash');
        setTimeout(() => {
            displayElement.classList.remove('error-flash');
        }, 300);
        if (keyElement) {
            keyElement.classList.add('shake');
            setTimeout(() => keyElement.classList.remove('shake'), 500);
        }
    }
}

function updateDisplayAndCheckState() {
    if (gameState.currentIndex >= gameState.currentWord.length) {
        gameState.progress += game.progressIncrement;
        if (gameState.progress >= 100) {
            gameState.progress = 100;
            levelUp();
        } else {
            playWordCompleteSound();
            createFireworks();
            setTimeout(generateNewWord, game.wordCompleteDelay);
        }
        progressElement.style.width = `${gameState.progress}%`;
    } else {
        playSound(783.99, 150, 'triangle');
        const levelObj = getCurrentLevelObj();
        const caseSensitive = levelObj.caseSensitive === true;
        updateDisplay(gameState.currentWord, gameState.currentIndex, caseSensitive);
        highlightNextKey(gameState.currentWord, gameState.currentIndex);
    }
}

async function levelUp(showSuccessMessage = true) {
    playLevelUpFanfare();
    gameState.level++;
    if (gameState.level > levelManifest.length - 1) gameState.level = levelManifest.length - 1;
    levelDisplayElement.textContent = gameState.level;
    levelSelectElement.value = gameState.level;
    gameState.progress = 0;
    progressElement.style.width = '0%';
    gameState.usedWords = [];

    await loadLevel(gameState.level);

    if (showSuccessMessage) {
        let msg = { text: "Super gemacht!", icon: "🎉" };
        if (Array.isArray(successMessages) && successMessages.length > 0) {
            msg = successMessages[Math.floor(Math.random() * successMessages.length)];
        }
        displaySuccessMessage(msg);
        try { await playSuccessAudio(msg.text); } catch (e) {
            console.error("Error playing success audio:", e);
        }
        await new Promise(resolve => setTimeout(resolve, game.introPause));
        clearSuccessMessage();
    }

    initKeyboard(getCurrentLevelObj(), handleKeyPress);
    await showLevelIntro();
}

export async function levelDown() {
    gameState.level--;
    if (gameState.level < 0) gameState.level = 0;
    levelDisplayElement.textContent = gameState.level;
    levelSelectElement.value = gameState.level;
    gameState.progress = 0;
    progressElement.style.width = '0%';
    gameState.usedWords = [];

    await loadLevel(gameState.level);
    initKeyboard(getCurrentLevelObj(), handleKeyPress);
    await showLevelIntro();
}

export async function setLevel(newLevel) {
    gameState.level = newLevel;
    levelDisplayElement.textContent = gameState.level;
    levelSelectElement.value = gameState.level;
    gameState.progress = 0;
    progressElement.style.width = '0%';
    gameState.usedWords = [];

    await loadLevel(gameState.level);
    initKeyboard(getCurrentLevelObj(), handleKeyPress);
    await showLevelIntro();
}

export async function startGame() {
    if (gameState.gameStarted) return;

    if (levelManifest.length === 0) {
        console.log("Data not loaded yet, awaiting load...");
        await loadGameData();
    }

    await loadLevel(gameState.level);

    gameState.gameStarted = true;
    displayElement.style.cursor = "default";
    await showLevelIntro();
}

export function getGameState() {
    return gameState;
}
