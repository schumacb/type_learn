// German keyboard layout (uppercase) - simplified
const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß'],
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
    ['Y', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.'],
    [' '] // Space bar
];

// Split points for keyboard halves (6|7, T|Z, G|H, B|N)
const splitPoints = [6, 5, 5, 5]; // Index where to split each row

// Home row keys for finger positioning
const homeRowKeys = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'];

// Finger colors for visual guidance
const fingerColors = {
    'kleiner': '#FF6B6B',   // Pinky
    'ring': '#4ECDC4',      // Ring finger
    'mittel': '#FFD166',    // Middle finger
    'zeige': '#1B98E0'      // Index finger
};

// Finger mapping for each key
const fingerMap = {
    '1': 'kleiner', '2': 'ring', '3': 'mittel', '4': 'zeige',
    '5': 'zeige', '6': 'zeige', '7': 'zeige', '8': 'mittel', '9': 'ring',
    '0': 'kleiner', 'ß': 'kleiner',
    'Q': 'kleiner', 'W': 'ring', 'E': 'mittel', 'R': 'zeige', 'T': 'zeige',
    'Z': 'zeige', 'U': 'zeige', 'I': 'mittel', 'O': 'ring', 'P': 'kleiner',
    'Ü': 'kleiner',
    'A': 'kleiner', 'S': 'ring', 'D': 'mittel', 'F': 'zeige', 'G': 'zeige',
    'H': 'zeige', 'J': 'zeige', 'K': 'mittel', 'L': 'ring', 'Ö': 'kleiner',
    'Ä': 'kleiner',
    'Y': 'kleiner', 'X': 'ring', 'C': 'mittel', 'V': 'zeige',
    'B': 'zeige', 'N': 'zeige', 'M': 'zeige',
    ',': 'kleiner', '.': 'kleiner',
    ' ': 'zeige'
};

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
        .replace(/[^A-Za-z0-9_]/g, "");
}
let gameLevels = [];
let successMessages = [];

// Current game state
let currentWord = "";
let currentIcons = [];
let currentIndex = 0;
let correctCount = 0;
let errorCount = 0;
let level = 0;
let progress = 0;
let currentKeyElement = null;
let speechSynthesis = window.speechSynthesis;
let usedWords = [];
let germanVoice = null;
const audioCache = new Map();
let currentSpokenAudio = null;

// DOM elements
const displayElement = document.getElementById('display');
const keyboardElement = document.getElementById('keyboard');
const progressElement = document.getElementById('progress');
const correctElement = document.getElementById('correct');
const errorsElement = document.getElementById('errors');
const levelDisplayElement = document.getElementById('levelDisplay');
const wordIconsElement = document.getElementById('wordIcons');
const levelSelectElement = document.getElementById('levelSelect');
const prevLevelButton = document.getElementById('prevLevel');
const nextLevelButton = document.getElementById('nextLevel');

// Audio context for sound generation
let audioContext;

async function loadGameData() {
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

        // Dynamically determine the number of level files by trying to fetch until a 404 is hit
        let i = 0;
        gameLevels = [];
        while (true) {
            try {
                const res = await fetch(`./data/level-${i}.json`);
                if (!res.ok) break;
                const contentType = res.headers.get("content-type") || "";
                console.log(`Loading level file: level-${i}.json (status: ${res.status}, content-type: ${contentType})`);
                if (!contentType.includes("application/json")) {
                    console.warn(`Skipping level-${i}.json: not JSON (content-type: ${contentType})`);
                    break;
                }
                try {
                    const levelObj = await res.json();
                    gameLevels.push(levelObj);
                } catch (e) {
                    console.error("Error parsing level JSON for level-" + i + ".json:", e);
                }
                i++;
            } catch (e) {
                break;
            }
        }
        if (gameLevels.length === 0) {
            throw new Error("No level files found.");
        }
        console.log("Loaded " + gameLevels.length + " level files.");
        populateLevelSelector();
    } catch (error) {
        console.error("Fatal Error: Could not load game data.", error);
        displayElement.textContent = "Fehler beim Laden der Spieldaten!";
    }
}

// Global flag to block actions during intro
let isLevelIntroPlaying = false;

// Show level intro: name, pause, description, pause, then start level
async function showLevelIntro(levelObj) {
    isLevelIntroPlaying = true;
    // Cancel any ongoing speech/audio
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    // Try to stop any playing HTML5 audio (best effort)
    document.querySelectorAll('audio').forEach(a => { try { a.pause(); a.currentTime = 0; } catch {} });

    if (!levelObj) {
        isLevelIntroPlaying = false;
        generateNewWord();
        return;
    }
    // Show level name
    displayElement.textContent = levelObj.name || "Level";
    await speakWordAndWait(levelObj.name || "Level", true);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Show description
    if (levelObj.description) {
        displayElement.textContent = levelObj.description;
        await speakWordAndWait(levelObj.description, true);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Hide intro and start level
    displayElement.textContent = "";
    isLevelIntroPlaying = false;
    generateNewWord();
}

function populateLevelSelector() {
    levelSelectElement.innerHTML = "";
    gameLevels.forEach((levelObj, idx) => {
        let name = (levelObj && levelObj.name) ? levelObj.name : `Level ${idx}`;
        let desc = (levelObj && levelObj.description) ? levelObj.description : "";
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = `${idx} - ${name}`;
        if (desc) option.title = desc;
        levelSelectElement.appendChild(option);
    });
}

// Helper function to create a single key element
function createKeyElement(key) {
    const keyElement = document.createElement('div');
    keyElement.className = 'key';
    keyElement.textContent = key === ' ' ? 'Leertaste' : key;
    keyElement.dataset.key = key;

    if (key === ' ') {
        keyElement.classList.add('space');
    }

    if (homeRowKeys.includes(key)) {
        keyElement.classList.add('finger-home');
    }

    const finger = fingerMap[key] || 'kleiner';
    const color = fingerColors[finger];
    keyElement.style.borderColor = color;

    keyElement.addEventListener('click', () => handleKeyPress(key));
    return keyElement;
}

function goToNextLevel() {
    level++;
    if (level > gameLevels.length - 1) level = gameLevels.length - 1;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;
    progress = 0;
    progressElement.style.width = '0%';
    usedWords = [];
}

const rowOffsets = [0, -30, -5, 20];

function initKeyboard() {
    keyboardElement.innerHTML = '';
    const splitContainer = document.createElement('div');
    splitContainer.className = 'keyboard-split';
    const leftKeyboardHalf = document.createElement('div');
    leftKeyboardHalf.className = 'keyboard-half';
    const rightKeyboardHalf = document.createElement('div');
    rightKeyboardHalf.className = 'keyboard-half';

    // Get enabledKeys for the current level (if any)
    let enabledKeys = null;
    const levelObj = getCurrentLevelObj();
    if (Array.isArray(levelObj.enabledKeys)) {
        enabledKeys = levelObj.enabledKeys.map(k => k.toUpperCase());
    }

    function createKeyWithDisable(key) {
        const keyElement = createKeyElement(key);
        if (enabledKeys && !enabledKeys.includes(key.toUpperCase())) {
            keyElement.classList.add('disabled');
            keyElement.style.pointerEvents = 'none';
            keyElement.style.opacity = '0.5';
        }
        return keyElement;
    }

    keyboardLayout.forEach((row, rowIndex) => {
        if (row[0] === ' ') return;
        const offset = rowOffsets[rowIndex] || 0;
        const splitPoint = splitPoints[rowIndex];

        const leftKeys = row.slice(0, splitPoint);
        const leftRowElement = document.createElement('div');
        leftRowElement.className = 'keyboard-row';
        leftRowElement.style.justifyContent = 'flex-end';
        leftRowElement.style.position = 'relative';
        leftRowElement.style.left = `${offset}px`;
        leftKeys.forEach(key => leftRowElement.appendChild(createKeyWithDisable(key)));
        leftKeyboardHalf.appendChild(leftRowElement);

        const rightKeys = row.slice(splitPoint);
        const rightRowElement = document.createElement('div');
        rightRowElement.className = 'keyboard-row';
        rightRowElement.style.justifyContent = 'flex-start';
        rightRowElement.style.position = 'relative';
        rightRowElement.style.left = `${offset}px`;
        rightKeys.forEach(key => rightRowElement.appendChild(createKeyWithDisable(key)));
        rightKeyboardHalf.appendChild(rightRowElement);
    });

    splitContainer.appendChild(leftKeyboardHalf);
    splitContainer.appendChild(rightKeyboardHalf);
    keyboardElement.appendChild(splitContainer);

    const spaceRowLayout = keyboardLayout[keyboardLayout.length - 1];
    const spaceRowElement = document.createElement('div');
    spaceRowElement.className = 'keyboard-row';
    spaceRowElement.style.justifyContent = 'center';
    const spaceKeyElement = createKeyWithDisable(spaceRowLayout[0]);
    spaceRowElement.appendChild(spaceKeyElement);
    keyboardElement.appendChild(spaceRowElement);
}

function getCurrentLevelObj() {
    return gameLevels[level] || {};
}

function getWordsForLevel() {
    const levelObj = getCurrentLevelObj();
    if (Array.isArray(levelObj)) {
        // Legacy support
        return levelObj;
    }
    return Array.isArray(levelObj.items) ? levelObj.items : [];
}

function generateNewWord() {
    if (isLevelIntroPlaying) return; // Block during intro
    const words = getWordsForLevel();
    if (!words || words.length === 0) return; // Safeguard
    if (usedWords.length >= words.length) usedWords = [];
    
    const availableWords = words.filter((_, index) => !usedWords.includes(index));
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const selectedWord = availableWords[randomIndex];
    const wordIndex = words.indexOf(selectedWord);
    usedWords.push(wordIndex);

    // Use the consistent 'text' property from our JSON files
    currentWord = selectedWord.text;
    currentIcons = selectedWord.icons;

    currentIndex = 0;
    const levelObj = getCurrentLevelObj();
    const caseSensitive = levelObj.caseSensitive === true;
    let displayWord = currentWord;
    if (!caseSensitive) {
        displayWord = displayWord.toUpperCase();
    }
    displayElement.textContent = displayWord.split('').map((char, i) => i === currentIndex ? `[${char}]` : char).join('');
    wordIconsElement.innerHTML = '';
    (currentIcons || []).forEach((icon, i) => { // Added safeguard for missing icons
        const iconElement = document.createElement('div');
        iconElement.className = 'icon';
        iconElement.textContent = icon;
        iconElement.style.animationDelay = `${i * 0.2}s`;
        wordIconsElement.appendChild(iconElement);
    });

    speakWord(currentWord); // will not play if intro is running
    highlightNextKey();
}

async function speakWordAndWait(word, force = false) {
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

// Legacy: speakWord for compatibility (does not wait)
function speakWord(word) {
    speakWordAndWait(word, false);
}

function highlightNextKey() {
    if (currentKeyElement) {
        currentKeyElement.classList.remove('highlight');
        currentKeyElement.style.background = 'rgba(255, 255, 255, 0.25)';
    }
    const nextChar = currentWord[currentIndex];
    if (!nextChar) return;
    currentKeyElement = document.querySelector(`.key[data-key="${nextChar}"]`);
    if (currentKeyElement) {
        currentKeyElement.classList.add('highlight');
        const finger = fingerMap[nextChar] || 'kleiner';
        currentKeyElement.style.background = fingerColors[finger];
    }
}

function playSound(frequency, duration, type = 'sine') {
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

function playLevelUpFanfare() {
    const C5 = 523.25, G5 = 783.99, C6 = 1046.50, E6 = 1318.51, G6 = 1567.98;
    setTimeout(() => playSound(C5, 100, 'triangle'), 0);
    setTimeout(() => playSound(G5, 100, 'triangle'), 120);
    setTimeout(() => playSound(C6, 250, 'triangle'), 240);
    setTimeout(() => { playSound(E6, 400, 'triangle'); playSound(G6, 400, 'triangle'); }, 550);
}

function handleKeyPress(key) {
    if (!gameStarted) return; // Ignore key presses before the game starts

    // Ignore modifier keys and function keys
    const modifierKeys = [
        'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ContextMenu', 'ScrollLock', 'Pause', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
        // Function keys F1-F24
        ...Array.from({length: 24}, (_, i) => `F${i+1}`)
    ];
    if (modifierKeys.includes(key)) return;

    // Highlight the pressed key
    const keyElement = document.querySelector(`.key[data-key="${key}"]`);
    if (keyElement) {
        keyElement.classList.add('active');
        setTimeout(() => keyElement.classList.remove('active'), 150);
    }

    // Check if the key is allowed in this level
    const levelObj = getCurrentLevelObj();
    const enabledKeys = Array.isArray(levelObj.enabledKeys) ? levelObj.enabledKeys : null;
    const caseSensitive = levelObj.caseSensitive === true;

    let keyToCheck = key;
    let charToCheck = currentWord[currentIndex];

    if (!caseSensitive) {
        keyToCheck = keyToCheck.toUpperCase();
        charToCheck = charToCheck.toUpperCase();
    }

    if (enabledKeys && !enabledKeys.includes(keyToCheck)) {
        // Ignore keys not enabled for this level
        // No error is counted, no feedback is given
        return;
    }

    if (keyToCheck === charToCheck) {
        // --- CORRECT KEY PRESS ---
        correctCount++;
        correctElement.textContent = correctCount;
        createParticles(keyElement);

        currentIndex++;
        updateDisplayAndCheckState();
    } else {
        // --- INCORRECT KEY PRESS ---
        errorCount++;
        errorsElement.textContent = errorCount;
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
    // Word finished?
    if (currentIndex >= currentWord.length) {
        progress += 10;
        if (progress >= 100) {
            // Level finished!
            progress = 100;
            levelUp(); // Plays fanfare and shows message
            setTimeout(generateNewWord, 2000); // Longer wait for fanfare
        } else {
            // Just the word is finished
            playWordCompleteSound();
            createFireworks();
            setTimeout(generateNewWord, 1000);
        }
        progressElement.style.width = `${progress}%`;
    } else {
        // Just a correct key press
        playSound(783.99, 150, 'triangle');
        const levelObj = getCurrentLevelObj();
        const caseSensitive = levelObj.caseSensitive === true;
        let displayWord = currentWord;
        if (!caseSensitive) {
            displayWord = displayWord.toUpperCase();
        }
        displayElement.textContent = displayWord.split('').map((char, i) => i === currentIndex ? `[${char}]` : char).join('');
        highlightNextKey();
    }
}

function playWordCompleteSound() {
    playSound(523.25, 100, 'sine');
    setTimeout(() => playSound(659.25, 100, 'sine'), 150);
    setTimeout(() => playSound(783.99, 100, 'sine'), 300);
    setTimeout(() => playSound(1046.50, 300, 'sine'), 450);
}

async function levelUp(showSuccessMessage = true) {
    playLevelUpFanfare();
    level++;
    if (level > gameLevels.length - 1) level = gameLevels.length - 1;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;
    progress = 0;
    progressElement.style.width = '0%';
    usedWords = [];

    if (showSuccessMessage) {
        // Pick a random success message
        let msg = { text: "Super gemacht!", icon: "🎉" };
        if (Array.isArray(successMessages) && successMessages.length > 0) {
            msg = successMessages[Math.floor(Math.random() * successMessages.length)];
        }
        // Show message in display area and word-icons area
        displayElement.textContent = msg.text;
        wordIconsElement.innerHTML = `<div class="icon">${msg.icon}</div>`;

        // Play audio for the message and wait for it to finish
        await playSuccessAudio(msg.text);

        // Wait an additional 0.5s before clearing and starting next level
        await new Promise(resolve => setTimeout(resolve, 500));
        displayElement.textContent = "";
        wordIconsElement.textContent = "";
    }

    initKeyboard();
    await showLevelIntro(gameLevels[level]);
}

// Play audio for a success message (matches normalization in generate-audio.js)
function playSuccessAudio(text) {
    return new Promise((resolve) => {
        const fileName = `${normalizeFilename(text).toLowerCase()}.mp3`;
        const audioPath = `./audio/${fileName}`;
        const audio = new Audio(audioPath);
        audio.addEventListener('ended', () => resolve());
        audio.addEventListener('error', () => resolve());
        audio.play().catch(() => resolve());
    });
}

async function levelDown() {
    level--;
    if (level < 0) level = 0;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;
    progress = 0;
    progressElement.style.width = '0%';
    usedWords = [];
    initKeyboard();
    await showLevelIntro(gameLevels[level]);
}

async function setLevel(newLevel) {
    level = newLevel;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;
    progress = 0;
    progressElement.style.width = '0%';
    usedWords = [];
    initKeyboard();
    await showLevelIntro(gameLevels[level]);
}

function createParticles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;
        particle.style.backgroundColor = getRandomColor();
        document.body.appendChild(particle);
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 100;
        const duration = 0.5 + Math.random() * 0.5;
        particle.animate([
            { transform: 'translate(0, 0)', opacity: 1 },
            { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`, opacity: 0 }
        ], { duration: duration * 1000, easing: 'ease-out' });
        setTimeout(() => { particle.remove(); }, duration * 1000);
    }
}

function createFireworks() {
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = `${Math.random() * window.innerWidth}px`;
            firework.style.top = `${Math.random() * window.innerHeight / 2}px`;
            firework.style.backgroundColor = getRandomColor();
            document.body.appendChild(firework);
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 200;
            const duration = 1 + Math.random() * 1;
            firework.animate([
                { transform: 'translate(0, 0)', opacity: 1, width: '5px', height: '5px' },
                { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`, opacity: 0, width: '2px', height: '2px' }
            ], { duration: duration * 1000, easing: 'ease-out' });
            setTimeout(() => { firework.remove(); }, duration * 1000);
        }, i * 300);
    }
}

function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#1B98E0', '#C44569', '#F8B500', '#6C5CE7'];
    return colors[Math.floor(Math.random() * colors.length)];
}

document.addEventListener('keydown', (event) => {
    // Only handle game-related key presses if the game has actually started
    if (gameStarted) {
        // Ignore modifier keys
        if (
            event.ctrlKey || event.altKey || event.metaKey ||
            ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ContextMenu', 'ScrollLock', 'Pause', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
            // Function keys F1-F24
            ...Array.from({length: 24}, (_, i) => `F${i+1}`)
            ].includes(event.key)
        ) {
            return;
        }
        if (event.key === ' ') event.preventDefault();
        const key = event.key === 'ß' ? 'ß' : event.key.toUpperCase();

        // Allow 'Enter' to generate a new word only during the game
        if (event.key === 'Enter') {
            generateNewWord();
        } else {
            handleKeyPress(key);
        }
    }
});

let gameStarted = false;

function initializeSpeech() {
    return new Promise((resolve) => {
        let tried = false;
        function findVoice() {
            if (tried) return;
            tried = true;

            const voices = speechSynthesis.getVoices();
            germanVoice = voices.find(v => v.lang === 'de-DE' && v.name.includes("Google"))
                || voices.find(v => v.lang === 'de-DE')
                || voices.find(v => v.lang.startsWith("de"));

            if (germanVoice) {
                console.log("✅ Stimme gefunden:", germanVoice.name);
            } else {
                console.warn("⚠️ Keine deutsche Stimme gefunden.");
            }

            speechSynthesis.onvoiceschanged = null;
            resolve();
        }

        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            findVoice();
        } else {
            speechSynthesis.onvoiceschanged = findVoice;
            setTimeout(findVoice, 500); // fallback if event doesn't fire
        }
    });
}

async function startGame(event) {
    if (event && event.target) {
        const targetTag = event.target.tagName.toUpperCase();
        if (['INPUT', 'SELECT', 'BUTTON'].includes(targetTag)) {
            if (event.type === 'click') { displayElement.addEventListener('click', (e) => startGame(e), { once: true }); }
            else if (event.type === 'keydown') { document.addEventListener('keydown', (e) => startGame(e), { once: true }); }
            return;
        }
    }
    if (gameStarted) return;
    
    // Ensure data is loaded before starting
    if (gameLevels.length === 0) {
        console.log("Data not loaded yet, awaiting load...");
        await loadGameData();
    }

    gameStarted = true;

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    displayElement.style.cursor = "default";
    await showLevelIntro(gameLevels[level]);
}

async function initGame() {
    displayElement.textContent = "Klick oder Taste drücken, um zu starten";
    await loadGameData(); // Load data as soon as the page opens

    initKeyboard();

    correctElement.textContent = correctCount;
    errorsElement.textContent = errorCount;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;

    // Updated button event listeners to use async/await and not call generateNewWord directly
    prevLevelButton.addEventListener('click', async () => { if (gameStarted) { await levelDown(); } });
    nextLevelButton.addEventListener('click', async () => { if (gameStarted) { await levelUp(false); } });
    levelSelectElement.addEventListener('change', async (e) => { if (gameStarted) { await setLevel(parseInt(e.target.value)); } });

    // Click or keydown anywhere to start
    function startOnUserAction() {
        if (!gameStarted) {
            startGame();
        }
        document.removeEventListener('click', startOnUserAction);
        document.removeEventListener('keydown', startOnUserAction);
    }
    document.addEventListener('click', startOnUserAction);
    document.addEventListener('keydown', startOnUserAction);
}

window.onload = initGame;