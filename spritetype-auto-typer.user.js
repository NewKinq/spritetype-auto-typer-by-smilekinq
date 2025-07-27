// ==UserScript==
// @name         Irys SpriteType Auto Typer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-play, auto-submit, and auto-reload SpriteType by Irys
// @author       Smilekinq
// @match        https://spritetype.irys.xyz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=irys.xyz
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const TYPING_INTERVAL_MS = 150;
    const POST_SUBMIT_WAIT_MS = 1500;
    const RELOAD_WAIT_MS = 2000;

    function typeWord(word) {
        return new Promise((resolve) => {
            const input = document.querySelector("input[type='text']");
            if (!input) return resolve();

            input.value = word;
            input.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true });
                input.dispatchEvent(event);
                resolve();
            }, TYPING_INTERVAL_MS);
        });
    }

    async function autoPlay() {
        const wordElements = document.querySelectorAll('div[style*="position: absolute"][style*="top"]');
        const words = Array.from(wordElements).map(el => el.textContent.trim()).filter(Boolean);

        for (const word of words) {
            await typeWord(word);
        }

        setTimeout(() => {
            const submitBtn = Array.from(document.querySelectorAll("button")).find(btn => btn.textContent.toLowerCase().includes("submit"));
            if (submitBtn) {
                submitBtn.click();
            }

            setTimeout(() => {
                window.location.reload();
            }, RELOAD_WAIT_MS);
        }, POST_SUBMIT_WAIT_MS);
    }

    setTimeout(() => {
        autoPlay();
    }, 3000);
})();
