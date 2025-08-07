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

let gameLevels = [];
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
};

export async function loadGameData() {
    try {
        // Load success messages
        try {
            const res = await fetch('./data/success-messages.json');
            if (res.ok) {
                successMessages = await res.json();
                console.log("Loaded success messages:", successMessages.length);
            } else {
                console.warn("Could not load success-messages.json");
                successMessages = [];
            }
        } catch (e) {
            console.warn("Error loading success-messages.json:", e);
            successMessages = [];
        }

        // Load level data from manifest
        const manifestRes = await fetch('./data/levels.json');
        if (!manifestRes.ok) {
            throw new Error("Could not load level manifest.");
        }
        const levelFiles = await manifestRes.json();

        gameLevels = [];
        for (const levelFile of levelFiles) {
            try {
                const res = await fetch(`./data/${levelFile}`);
                if (!res.ok) {
                    console.warn(`Could not load level file: ${levelFile}`);
                    continue;
                }
                const levelObj = await res.json();
                gameLevels.push(levelObj);
            } catch (e) {
                console.error(`Error loading or parsing level file: ${levelFile}`, e);
            }
        }
        if (gameLevels.length === 0) {
            throw new Error("No level files found.");
        }
        console.log("Loaded " + gameLevels.length + " level files.");
        return gameLevels;
    } catch (error) {
        console.error("Fatal Error: Could not load game data.", error);
        displayElement.textContent = "Fehler beim Laden der Spieldaten!";
        return [];
    }
}

async function showLevelIntro(levelObj) {
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
    return gameLevels[gameState.level] || {};
}

function getWordsForLevel() {
    const levelObj = getCurrentLevelObj();
    if (Array.isArray(levelObj)) {
        return levelObj;
    }
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
    if (gameState.level > gameLevels.length - 1) gameState.level = gameLevels.length - 1;
    levelDisplayElement.textContent = gameState.level;
    levelSelectElement.value = gameState.level;
    gameState.progress = 0;
    progressElement.style.width = '0%';
    gameState.usedWords = [];

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
    await showLevelIntro(gameLevels[gameState.level]);
}

export async function levelDown() {
    gameState.level--;
    if (gameState.level < 0) gameState.level = 0;
    levelDisplayElement.textContent = gameState.level;
    levelSelectElement.value = gameState.level;
    gameState.progress = 0;
    progressElement.style.width = '0%';
    gameState.usedWords = [];
    initKeyboard(getCurrentLevelObj(), handleKeyPress);
    await showLevelIntro(gameLevels[gameState.level]);
}

export async function setLevel(newLevel) {
    gameState.level = newLevel;
    levelDisplayElement.textContent = gameState.level;
    levelSelectElement.value = gameState.level;
    gameState.progress = 0;
    progressElement.style.width = '0%';
    gameState.usedWords = [];
    initKeyboard(getCurrentLevelObj(), handleKeyPress);
    await showLevelIntro(gameLevels[gameState.level]);
}

export async function startGame() {
    if (gameState.gameStarted) return;

    if (gameLevels.length === 0) {
        console.log("Data not loaded yet, awaiting load...");
        gameLevels = await loadGameData();
    }

    gameState.gameStarted = true;
    displayElement.style.cursor = "default";
    await showLevelIntro(gameLevels[gameState.level]);
}

export function getGameState() {
    return gameState;
}
