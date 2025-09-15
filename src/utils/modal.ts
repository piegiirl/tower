export function endGame(gameState: string, modal: HTMLElement | null) {
  if (gameState === "loss" && modal) {
    modal.classList.add("show");
  }
}

export function restartGame(modal: HTMLElement | null) {
  if (modal) {
    modal.classList.remove("show");
  }
  console.log("Игра перезапущена!");
}