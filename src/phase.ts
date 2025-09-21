import { Tower } from "./tower";
import type { Phase, PhaseHandler } from "./types";
import { endGame, restartGame } from "./utils/modal";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PhaseMachine {
  private modal = document.getElementById("gameOverModal");
  private tower = new Tower();

  constructor() {
    this.execute("start");
  }

  private phases: Record<Phase, PhaseHandler> = {
    start: async () => {
      return "menu";
    },

    menu: async () => {
      this.tower.init();
      await new Promise<void>((resolve) => {
        const onClick = () => {
          document.removeEventListener("pointerdown", onClick);
          resolve();
        };
        document.addEventListener("pointerdown", onClick);
      });
      return "move";
    },

    move: async () => {
      this.tower.updateScore();
      this.tower.addSlab();
      await new Promise<void>((resolve) => {
        const onClick = () => {
          document.removeEventListener("pointerdown", onClick);
          resolve();
        };
        document.addEventListener("pointerdown", onClick);
      });
      return "stop";
    },

    stop: async () => {
      this.tower.stopSlab();
      return "place";
    },

    place: async () => {
      if (this.tower.cutCurrentSlab()) {
        return "move";
      }
      return 'lose';
    },

    lose: async () => {
      if (this.modal) {
        endGame("loss", this.modal);
        await new Promise<void>((resolve) => {
          (window as any).restartGame = () => {
            restartGame(this.modal);
            resolve();
          };
        });
      }
      return "menu";
    },
  };

  async execute(phase: Phase) {
    console.groupEnd();
    console.group(`Phase {${phase}}`);
    const nextPhase: Phase = await this.phases[phase]();
    this.execute(nextPhase);
  }
}