import { initAudio, resumeAudio } from './audio.js';
// Ensure AudioContext starts after first user gesture and swallow AbortError globally
try {
  window.addEventListener('pointerdown', () => { try { resumeAudio(); } catch(e) { console.error("Error resuming audio on pointerdown:", e); } }, { once: true, passive: true });
  window.addEventListener('keydown', () => { try { resumeAudio(); } catch(e) { console.error("Error resuming audio on keydown:", e); } }, { once: true, passive: true });
  window.addEventListener('unhandledrejection', (e) => {
    const err = e?.reason;
    const name = err?.name || '';
    const msg  = (err && err.message) ? err.message : String(err || '');
    const isAbort =
        /AbortError/i.test(name) ||
        /\babort(ed)?\b/i.test(msg);
    if (isAbort) {
        e.preventDefault(); // expected during audio/tts cancellations
        return;
    }
    // Surface everything else so bugs don't get hidden
    console.error('Unhandled promise rejection:', err);
    });
} catch (e) {
  console.error("Error during global initialization:", e);
  throw e;
}
import { loadGameData, handleKeyPress, levelDown, setLevel, startGame, getGameState, playAppIntro } from './game.js';
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

    initAudio();
    if (Array.isArray(gameLevels) && gameLevels.length > 0) {
        // Initialize UI only when data is available; otherwise keep the start message visible
        initKeyboard(gameLevels[gameState.level], handleKeyPress);
        correctElement.textContent = gameState.correctCount;
        errorsElement.textContent = gameState.errorCount;
        levelDisplayElement.textContent = gameState.level;
        populateLevelSelector(gameLevels);
        levelSelectElement.value = gameState.level;
    }

    prevLevelButton.addEventListener('click', async () => { await levelDown(); });
    nextLevelButton.addEventListener('click', async () => { await setLevel(getGameState().level + 1); });
    levelSelectElement.addEventListener('change', async (e) => { await setLevel(parseInt(e.target.value)); });

    async function startOnUserAction(event) {
        if (!getGameState().gameStarted) {
             if (event && event.target) {
                const targetTag = event.target.tagName.toUpperCase();
                if (['INPUT', 'SELECT', 'BUTTON'].includes(targetTag)) {
                    return;
                }
            }
            await playAppIntro();
            startGame();
        }
        document.removeEventListener('click', startOnUserAction);
        document.removeEventListener('keydown', startOnUserAction);
    }

    document.addEventListener('click', startOnUserAction);
    document.addEventListener('keydown', startOnUserAction);

    document.addEventListener('keydown', (event) => { if (event.repeat) return;
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