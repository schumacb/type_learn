// Core game logic and state management.

import { game } from './config.js';
import { playLevelUpFanfare, playSound, playSuccessAudio, playWordCompleteSound, speakWordAndWait } from './audio.js';
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

export async function loadGameData() {
    try {
        // Load success messages
        try {
            const res = await fetch('./data/success-messages.json');
            if (res.ok) {
                successMessages = await res.json();
            } else {
                console.warn("Could not load success-messages.json");
                successMessages = [];
            }
        } catch (e) {
            console.warn("Error loading success-messages.json:", e);
            successMessages = [];
        }

        // Load level manifest
        const manifestRes = await fetch('./data/levels.json');
        if (!manifestRes.ok) {
            throw new Error("Could not load level manifest.");
        }
        levelManifest = await manifestRes.json();

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
        function onKey(e) {
            if (done) return;
            if (e.key === "Enter") {
                done = true;
                window.removeEventListener('keydown', onKey, true);
                resolve("enter");
            }
        }
        window.addEventListener('keydown', onKey, true);
        setTimeout(() => {
            if (!done) {
                done = true;
                window.removeEventListener('keydown', onKey, true);
                resolve("timeout");
            }
        }, ms);
    });
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
        const res = await fetch('./data/intro.json');
        if (!res.ok) throw new Error("intro.json not found");
        introData = await res.json();
    } catch (e) {
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
        await speakWordAndWait(text, true, false);
        showTigerAnimation('idle');
        await waitForEnterOrTimeout((typeof pause === "number" ? pause : 0.5) * 1000);
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
        const res = await fetch(`./data/${levelFile}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch level data: ${levelFile}`);
        }
        gameState.currentLevelData = await res.json();
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
    await speakWordAndWait(levelObj.name || "Level", true, gameState.isLevelIntroPlaying);
    showTigerAnimation('idle');
    await new Promise(resolve => setTimeout(resolve, game.introPause));

    if (levelObj.description) {
        displayElement.textContent = levelObj.description;
        showTigerAnimation('talk');
        await speakWordAndWait(levelObj.description, true, gameState.isLevelIntroPlaying);
        showTigerAnimation('idle');
        await new Promise(resolve => setTimeout(resolve, game.introPause));
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

    const keyElement = document.querySelector(`.key[data-key="${key}"]`);
    if (keyElement) {
        keyElement.classList.add('active');
        setTimeout(() => keyElement.classList.remove('active'), 150);
    }

    const levelObj = getCurrentLevelObj();
    const enabledKeys = Array.isArray(levelObj.enabledKeys) ? levelObj.enabledKeys : null;
    const caseSensitive = levelObj.caseSensitive === true;

    let keyToCheck = key;
    let charToCheck = gameState.currentWord[gameState.currentIndex];

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
            setTimeout(generateNewWord, game.levelUpDelay);
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
        await playSuccessAudio(msg.text);
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
