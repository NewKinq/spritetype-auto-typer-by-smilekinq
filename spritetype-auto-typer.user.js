(async () => {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const getRandomDelay = () => {
    // 50–70 WPM = roughly 180ms to 250ms per character
    return Math.floor(Math.random() * (250 - 180 + 1)) + 180;
  };

  const getWord = () => {
    const wordBox = document.querySelector(".word-box");
    return wordBox ? wordBox.innerText.trim() : "";
  };

  const typeWord = async (word) => {
    const input = document.querySelector("input[type='text']");
    for (let letter of word) {
      input.value += letter;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await delay(getRandomDelay());
    }
    input.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
    input.value = "";
  };

  let gameOver = false;

  const observer = new MutationObserver(() => {
    const button = document.querySelector("button.text-sm");
    if (button && button.innerText.includes("Restart")) {
      gameOver = true;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  while (!gameOver) {
    const word = getWord();
    if (word) {
      await typeWord(word);
    }
    await delay(50); // slight delay to avoid tight loop
  }

  // Auto-submit score and reload page
  const submitBtn = document.querySelector("button.text-sm");
  if (submitBtn && submitBtn.innerText.includes("Submit score")) {
    submitBtn.click();
    await delay(1000);
    location.reload();
  }
})();