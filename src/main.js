import { initAudio } from './audio.js';
import { loadGameData, handleKeyPress, levelDown, setLevel, startGame, getGameState } from './game.js';
import {
    correctElement,
    errorsElement,
    initKeyboard,
    levelDisplayElement,
    levelSelectElement,
    nextLevelButton,
    populateLevelSelector,
    prevLevelButton,
    displayElement
} from './ui.js';

async function initGame() {
    displayElement.textContent = "Klick oder Taste drücken, um zu starten";
    const gameLevels = await loadGameData();
    const gameState = getGameState();

    initKeyboard(gameLevels[gameState.level], handleKeyPress);
    initAudio();

    correctElement.textContent = gameState.correctCount;
    errorsElement.textContent = gameState.errorCount;
    levelDisplayElement.textContent = gameState.level;
    populateLevelSelector(gameLevels);
    levelSelectElement.value = gameState.level;

    prevLevelButton.addEventListener('click', async () => { if (getGameState().gameStarted) { await levelDown(); } });
    nextLevelButton.addEventListener('click', async () => { if (getGameState().gameStarted) { await setLevel(getGameState().level + 1); } });
    levelSelectElement.addEventListener('change', async (e) => { if (getGameState().gameStarted) { await setLevel(parseInt(e.target.value)); } });

    function startOnUserAction(event) {
        if (!getGameState().gameStarted) {
             if (event && event.target) {
                const targetTag = event.target.tagName.toUpperCase();
                if (['INPUT', 'SELECT', 'BUTTON'].includes(targetTag)) {
                    return;
                }
            }
            startGame();
        }
        document.removeEventListener('click', startOnUserAction);
        document.removeEventListener('keydown', startOnUserAction);
    }

    document.addEventListener('click', startOnUserAction);
    document.addEventListener('keydown', startOnUserAction);

    document.addEventListener('keydown', (event) => {
        if (getGameState().gameStarted) {
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }
            if (event.key === ' ') event.preventDefault();
            const key = event.key === 'ß' ? 'ß' : event.key.toUpperCase();

            if (event.key === 'Enter') {
                // In a future update, this could start a new word or level.
            } else {
                handleKeyPress(key);
            }
        }
    });
}

window.onload = initGame;
