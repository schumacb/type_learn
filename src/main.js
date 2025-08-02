// German keyboard layout (uppercase) - simplified
const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß'],
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
    ['Y', 'X', 'C', 'V', 'B', 'N', 'M'],
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
    ' ': 'zeige'
};

let gameLevels = [];

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

// DOM elements
const displayElement = document.getElementById('display');
const keyboardElement = document.getElementById('keyboard');
const progressElement = document.getElementById('progress');
const correctElement = document.getElementById('correct');
const errorsElement = document.getElementById('errors');
const levelDisplayElement = document.getElementById('levelDisplay');
const successMessage = document.getElementById('successMessage');
const wordIconsElement = document.getElementById('wordIcons');
const levelSelectElement = document.getElementById('levelSelect');
const prevLevelButton = document.getElementById('prevLevel');
const nextLevelButton = document.getElementById('nextLevel');

// Audio context for sound generation
let audioContext;

async function loadGameData() {
    try {
        const levelCount = levelSelectElement.options.length;
        const fetchPromises = [];
        for (let i = 0; i < levelCount; i++) {
            fetchPromises.push(fetch(`./data/level-${i}.json`).then(res => res.json()));
        }
        // Wait for all files to be fetched and parsed concurrently
        gameLevels = await Promise.all(fetchPromises);
        console.log("All game data loaded successfully.");
    } catch (error) {
        console.error("Fatal Error: Could not load game data.", error);
        displayElement.textContent = "Fehler beim Laden der Spieldaten!";
    }
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
    if (level > 5) level = 5;
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
        leftKeys.forEach(key => leftRowElement.appendChild(createKeyElement(key)));
        leftKeyboardHalf.appendChild(leftRowElement);

        const rightKeys = row.slice(splitPoint);
        const rightRowElement = document.createElement('div');
        rightRowElement.className = 'keyboard-row';
        rightRowElement.style.justifyContent = 'flex-start';
        rightRowElement.style.position = 'relative';
        rightRowElement.style.left = `${offset}px`;
        rightKeys.forEach(key => rightRowElement.appendChild(createKeyElement(key)));
        rightKeyboardHalf.appendChild(rightRowElement);
    });

    splitContainer.appendChild(leftKeyboardHalf);
    splitContainer.appendChild(rightKeyboardHalf);
    keyboardElement.appendChild(splitContainer);

    const spaceRowLayout = keyboardLayout[keyboardLayout.length - 1];
    const spaceRowElement = document.createElement('div');
    spaceRowElement.className = 'keyboard-row';
    spaceRowElement.style.justifyContent = 'center';
    const spaceKeyElement = createKeyElement(spaceRowLayout[0]);
    spaceRowElement.appendChild(spaceKeyElement);
    keyboardElement.appendChild(spaceRowElement);
}

function getWordsForLevel() {
    return gameLevels[level] || [];
}

function generateNewWord() {
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
    displayElement.textContent = currentWord.split('').map((char, i) => i === currentIndex ? `[${char}]` : char).join('');
    wordIconsElement.innerHTML = '';
    (currentIcons || []).forEach((icon, i) => { // Added safeguard for missing icons
        const iconElement = document.createElement('div');
        iconElement.className = 'icon';
        iconElement.textContent = icon;
        iconElement.style.animationDelay = `${i * 0.2}s`;
        wordIconsElement.appendChild(iconElement);
    });

    speakWord(currentWord);
    highlightNextKey();
}

async function speakWord(word) {
    // Priority 1: Try to play the pre-generated local audio file.
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
    const fileName = `${normalizeFilename(word)}.mp3`;
    const localAudioPath = `./audio/${fileName}`;

    try {
        const response = await fetch(localAudioPath);
        if (response.ok) {
            const audioBlob = await response.blob();
            console.log(`Blob type for "${word}":`, audioBlob.type);
            if (!audioBlob.type.startsWith('audio/')) {
                console.error(`Blob for "${word}" is not a valid audio type:`, audioBlob.type);
            } else {
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl));
                audio.play();
                console.log(`Played "${word}" from local file: ${localAudioPath}`);
                return;
            }
        } else {
            console.warn(`Local file for "${word}" not found at ${localAudioPath} (${response.status}). Falling back to browser TTS.`);
        }
    } catch (error) {
        console.error(`Error loading local file for "${word}" from ${localAudioPath}:`, error);
    }

    // Priority 2: If local file fails, fall back to the browser's default voice.
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'de-DE';
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    if (germanVoice) {
        utterance.voice = germanVoice;
    }
    speechSynthesis.speak(utterance);
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

    // Check if the key matches the current character
    if (key === currentWord[currentIndex]) {
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
        displayElement.textContent = currentWord.split('').map((char, i) => i === currentIndex ? `[${char}]` : char).join('');
        highlightNextKey();
    }
}

function playWordCompleteSound() {
    playSound(523.25, 100, 'sine');
    setTimeout(() => playSound(659.25, 100, 'sine'), 150);
    setTimeout(() => playSound(783.99, 100, 'sine'), 300);
    setTimeout(() => playSound(1046.50, 300, 'sine'), 450);
}

function levelUp() {
    playLevelUpFanfare();
    level++;
    if (level > 5) level = 5;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;
    progress = 0;
    progressElement.style.width = '0%';
    usedWords = [];
    successMessage.style.display = 'block';
    setTimeout(() => { successMessage.style.display = 'none'; }, 2000);
}

function levelDown() {
    level--;
    if (level < 0) level = 0;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;
    progress = 0;
    progressElement.style.width = '0%';
    usedWords = [];
}

function setLevel(newLevel) {
    level = newLevel;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;
    progress = 0;
    progressElement.style.width = '0%';
    usedWords = [];
    generateNewWord();
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
    generateNewWord();
}

async function initGame() {
    displayElement.textContent = "Lade Spieldaten...";
    await loadGameData(); // Load data as soon as the page opens

    initKeyboard();
    await startGame();

    correctElement.textContent = correctCount;
    errorsElement.textContent = errorCount;
    levelDisplayElement.textContent = level;
    levelSelectElement.value = level;
    
    // All button event listeners remain the same
    prevLevelButton.addEventListener('click', () => { if (gameStarted) { levelDown(); generateNewWord(); } });
    nextLevelButton.addEventListener('click', () => { if (gameStarted) { goToNextLevel(); generateNewWord(); } });
    levelSelectElement.addEventListener('change', (e) => { if (gameStarted) { setLevel(parseInt(e.target.value)); } });
}

window.onload = initGame;