// UI-related functions for DOM manipulation, keyboard creation, and visual effects.

import { fingerColors, fingerMap, homeRowKeys, keyboardLayout, rowOffsets, splitPoints } from './config.js';
import { getRandomColor } from './utils.js';

export const displayElement = document.getElementById('display');
export const keyboardElement = document.getElementById('keyboard');
export const progressElement = document.getElementById('progress');
export const correctElement = document.getElementById('correct');
export const errorsElement = document.getElementById('errors');
export const levelDisplayElement = document.getElementById('levelDisplay');
export const wordIconsElement = document.getElementById('wordIcons');
export const keyEls = new Map();
export const levelSelectElement = document.getElementById('levelSelect');
export const prevLevelButton = document.getElementById('prevLevel');
export const nextLevelButton = document.getElementById('nextLevel');

let currentKeyElement = null;

export function initKeyboard(level, handleKeyPress) {
    keyboardElement.innerHTML = '';
    const splitContainer = document.createElement('div');
    splitContainer.className = 'keyboard-split';
    const leftKeyboardHalf = document.createElement('div');
    leftKeyboardHalf.className = 'keyboard-half';
    const rightKeyboardHalf = document.createElement('div');
    rightKeyboardHalf.className = 'keyboard-half';

    // Get enabledKeys for the current level (if any)
    let enabledKeys = null;
    if (Array.isArray(level.enabledKeys)) {
        enabledKeys = level.enabledKeys.map(k => k.toUpperCase());
    }

    function createKeyElement(key) {
        const keyElement = document.createElement('div');
        keyElement.className = 'key'; keyElement.setAttribute('role','button'); keyElement.setAttribute('tabindex','0'); keyElement.setAttribute('aria-label', key === ' ' ? 'Leertaste' : key);
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
        
        try { keyEls.set(key, keyElement); } catch (e) {
            console.error("Error registering key element in keyEls map:", e);
            throw e;
        }
        return keyElement;
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

function cssEscapeAttr(v){ return String(v).replace(/"/g,'\\"'); }
export function highlightNextKey(currentWord, currentIndex) {
    if (currentKeyElement) {
        currentKeyElement.classList.remove('highlight');
        currentKeyElement.style.background = 'rgba(255, 255, 255, 0.25)';
    }
    const nextChar = currentWord[currentIndex];
    if (!nextChar) return;
    currentKeyElement = (keyEls && keyEls.get(nextChar)) || document.querySelector(`.key[data-key="${cssEscapeAttr(nextChar)}"]`);
    if (currentKeyElement) {
        currentKeyElement.classList.add('highlight');
        const finger = fingerMap[nextChar] || 'kleiner';
        currentKeyElement.style.background = fingerColors[finger];
    }
}

export function updateDisplay(currentWord, currentIndex, caseSensitive) {
    let displayWord = currentWord;
    if (!caseSensitive) {
        displayWord = displayWord.toUpperCase();
    }
    displayElement.textContent = displayWord.split('').map((char, i) => i === currentIndex ? `[${char}]` : char).join('');
}

export function populateLevelSelector(levelManifest) {
    levelSelectElement.innerHTML = "";
    levelManifest.forEach((level, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = `${idx} - ${level.name}`;
        if (level.description) {
            option.title = level.description;
        }
        levelSelectElement.appendChild(option);
    });
}

export function createParticles(key) {
    const keyElement = document.querySelector(`.key[data-key="${key}"]`);
    if (!keyElement) return;

    const rect = keyElement.getBoundingClientRect();
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

export function createFireworks() {
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

export function showTigerAnimation(state) {
    if (wordIconsElement) {
        if (state === 'talk') {
            wordIconsElement.innerHTML = '<div class="tiger-talk-animation"></div>';
            const tigerDiv = wordIconsElement.querySelector('.tiger-talk-animation');
            if (tigerDiv) {
                tigerDiv.classList.add('tiger-talk-animation');
                tigerDiv.style.backgroundImage = "";
                tigerDiv.style.backgroundPosition = "";
                tigerDiv.style.backgroundSize = "";
            }
        } else if (state === 'idle') {
            const tigerDiv = wordIconsElement.querySelector('.tiger-talk-animation');
            if (tigerDiv) {
                tigerDiv.classList.remove('tiger-talk-animation');
                tigerDiv.style.backgroundImage = "url('./avatars/tiger/talk-animation.png')";
                tigerDiv.style.width = "308px";
                tigerDiv.style.height = "320px";
                tigerDiv.style.backgroundSize = "1024px 1024px";
                tigerDiv.style.backgroundPosition = "-40px -32px";
            }
        } else {
            wordIconsElement.innerHTML = '';
        }
    }
}

export function displaySuccessMessage(msg) {
    displayElement.textContent = msg.text;
    wordIconsElement.innerHTML = `<div class="icon">${msg.icon}</div>`;
}

export function clearSuccessMessage() {
    displayElement.textContent = "";
    wordIconsElement.textContent = "";
}
