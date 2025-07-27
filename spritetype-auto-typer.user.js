// ==UserScript==
// @name         SpriteType Auto Typer by Smilekinq
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-play, auto-submit, and auto-reload SpriteType forever 🧠
// @author       @Smilekinq
// @match        https://spritetype.irys.xyz/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    setTimeout(() => {
        const script = document.createElement('script');
        script.textContent = `(${autoTyper.toString()})();`;
        document.body.appendChild(script);
    }, 3000); // wait 3 seconds for site to load

    function autoTyper() {
        const TYPING_INTERVAL_MS = 150;
        const MAX_RESTARTS = 1000;
        const RESTART_KEY = '__sprite_restart_count';
        let autoTypeInterval = null, currentWordCharsTyped = 0, gameData = null;
        let restartCount = Number(localStorage.getItem(RESTART_KEY) || '0');

        function findReactElementsAndFibers() {
            const inputElement = document.querySelector('input[type="text"][autoFocus]');
            if (!inputElement) return null;
            const inputReactKey = Object.keys(inputElement).find(key => key.startsWith('__reactFiber$'));
            if (!inputReactKey) return null;
            const inputFiberNode = inputElement[inputReactKey];
            let gameComponentFiber = inputFiberNode;
            while (gameComponentFiber) {
                if (
                    gameComponentFiber.memoizedProps &&
                    gameComponentFiber.memoizedProps.selectedTime !== undefined &&
                    typeof gameComponentFiber.memoizedProps.onStatsUpdate === 'function'
                ) {
                    return { inputElement, inputFiberNode, gameComponentFiber };
                }
                gameComponentFiber = gameComponentFiber.return;
            }
            return null;
        }

        function getGameState(inputElement, inputFiberNode, gameComponentFiber) {
            let currentHook = gameComponentFiber.memoizedState;
            if (!currentHook) return null;
            const allGameHookStates = [];
            let tempHook = currentHook;
            while (tempHook) {
                allGameHookStates.push(tempHook.memoizedState);
                tempHook = tempHook.next;
            }

            const gameStateValue = allGameHookStates.find(state => typeof state === 'string' && (state === "waiting" || state === "typing" || state === "finished"));
            const currentWordIndexValue = allGameHookStates.find(state => typeof state === 'number' && state >= 0);
            const wordsArrayValue = allGameHookStates.find(state => Array.isArray(state) && state.every(item => typeof item === 'string'));
            let currentInputValueValue = inputFiberNode.memoizedProps.value;
            if (currentInputValueValue === undefined) {
                currentInputValueValue = allGameHookStates.find(state => typeof state === 'string' && state !== gameStateValue);
            }

            const onChangeHandler = inputFiberNode.memoizedProps.onChange;
            const onKeyDownHandler = inputFiberNode.memoizedProps.onKeyDown;

            if (
                gameStateValue !== undefined &&
                currentWordIndexValue !== undefined &&
                currentInputValueValue !== undefined &&
                wordsArrayValue !== undefined &&
                onChangeHandler &&
                inputElement
            ) {
                return {
                    gameState: { value: gameStateValue },
                    currentWordIndex: { value: currentWordIndexValue },
                    currentInputValue: { value: currentInputValueValue },
                    wordsArray: { value: wordsArrayValue },
                    onChange: onChangeHandler,
                    onKeyDown: onKeyDownHandler,
                    inputElement: inputElement
                };
            }

            return null;
        }

        async function typeCharacter(char) {
            const input = gameData.inputElement;
            const currentInputValue = input.value;
            const newInputValue = currentInputValue + char;
            input.focus();

            const keyDownEvent = new KeyboardEvent('keydown', {
                key: char,
                code: `Key${char.toUpperCase()}`,
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(keyDownEvent);
            gameData.onKeyDown(keyDownEvent);

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(input, newInputValue);

            const inputEvent = new Event('input', { bubbles: true });
            Object.defineProperty(inputEvent, 'target', { value: input, writable: false });
            input.dispatchEvent(inputEvent);
            gameData.onChange({ target: { value: newInputValue } });

            await new Promise(resolve => setTimeout(resolve, 10));

            const keyUpEvent = new KeyboardEvent('keyup', {
                key: char,
                code: `Key${char.toUpperCase()}`,
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(keyUpEvent);
        }

        async function typeSpace() {
            const input = gameData.inputElement;
            const newInputValue = input.value + ' ';
            input.focus();

            const keyDownEvent = new KeyboardEvent('keydown', {
                key: ' ',
                code: 'Space',
                keyCode: 32,
                which: 32,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(keyDownEvent);
            gameData.onKeyDown(keyDownEvent);

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(input, newInputValue);

            const inputEvent = new Event('input', { bubbles: true });
            Object.defineProperty(inputEvent, 'target', { value: input, writable: false });
            input.dispatchEvent(inputEvent);
            gameData.onChange({ target: { value: newInputValue } });

            await new Promise(resolve => setTimeout(resolve, 10));

            const keyUpEvent = new KeyboardEvent('keyup', {
                key: ' ',
                code: 'Space',
                keyCode: 32,
                which: 32,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(keyUpEvent);

            currentWordCharsTyped = 0;
        }

        async function autoTypeStep() {
            if (!gameData) {
                const foundFibers = findReactElementsAndFibers();
                if (!foundFibers) return;
                const extractedGameData = getGameState(foundFibers.inputElement, foundFibers.inputFiberNode, foundFibers.gameComponentFiber);
                if (!extractedGameData) {
                    stopAutoType();
                    return;
                }
                gameData = extractedGameData;
            }

            const currentGameState = gameData.gameState.value;
            const words = gameData.wordsArray.value;
            const currentWordIndex = gameData.currentWordIndex.value;
            const targetWord = words[currentWordIndex];

            if (currentGameState === "finished") {
                stopAutoType();
                restartCount++;
                console.log(`✅ Game finished. Restart #${restartCount}`);
                if (restartCount > MAX_RESTARTS) {
                    console.log("⛔ Max restarts reached.");
                    return;
                }
                localStorage.setItem(RESTART_KEY, String(restartCount));
                setTimeout(() => {
                    const submitBtn = [...document.querySelectorAll('div.text-white.font-bold.font-gt-pressura')].find(div => div.innerText.trim().toLowerCase() === 'submit to leaderboard');
                    if (submitBtn) {
                        const btn = submitBtn.closest('button');
                        if (btn) btn.click();
                    }
                    setTimeout(() => {
                        console.log("🔄 Reloading page to restart...");
                        location.reload();
                    }, 3000);
                }, 1000);
                return;
            }

            if (currentGameState === "waiting") {
                const firstWord = words[0];
                if (firstWord && firstWord.length > 0) {
                    await typeCharacter(firstWord[0]);
                    currentWordCharsTyped = 1;
                    const foundFibers = findReactElementsAndFibers();
                    if (foundFibers) {
                        gameData = getGameState(foundFibers.inputElement, foundFibers.inputFiberNode, foundFibers.gameComponentFiber);
                    }
                }
                return;
            }

            if (currentGameState === "typing") {
                if (!targetWord) {
                    stopAutoType();
                    return;
                }
                if (currentWordCharsTyped < targetWord.length) {
                    await typeCharacter(targetWord[currentWordCharsTyped]);
                    currentWordCharsTyped++;
                } else {
                    await typeSpace();
                }
                const foundFibers = findReactElementsAndFibers();
                if (foundFibers) {
                    gameData = getGameState(foundFibers.inputElement, foundFibers.inputFiberNode, foundFibers.gameComponentFiber);
                }
            }
        }

        function startAutoType(intervalMs = TYPING_INTERVAL_MS) {
            if (autoTypeInterval) return;
            autoTypeInterval = setInterval(autoTypeStep, intervalMs);
        }

        function stopAutoType() {
            if (autoTypeInterval) {
                clearInterval(autoTypeInterval);
                autoTypeInterval = null;
                currentWordCharsTyped = 0;
                gameData = null;
            }
        }

        window.startSpriteTypeAutoType = startAutoType;
        window.stopSpriteTypeAutoType = stopAutoType;
        console.log(`🟢 SpriteType Auto-Typer Loaded. Restart #${restartCount}`);
        startAutoType();
    }
})();