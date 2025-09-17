import { Tower } from "./tower";
import type { Phase, PhaseHandler } from "./types";
import { endGame, restartGame } from "./utils/modal";
import { Howl } from 'howler';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PhaseMachine {
  private modal = document.getElementById("gameOverModal");
  private tower = new Tower();
  private stackSound: Howl;

  constructor() {
    this.stackSound = new Howl({
      src: ['/src/music.ogg'], 
      volume: 0.3,
    });
    this.execute("start");
  }

  private phases: Record<Phase, PhaseHandler> = {
    start: async () => {
      return "menu";
    },

    menu: async () => {
      // Сбрасываем параметры звука
      this.stackSound.volume(0.3);
      this.stackSound.rate(1.0);
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
        // Увеличиваем громкость и высоту звука
        const volume = Math.min(1.0, 0.3 + this.tower.SLAB_INDEX * 0.02); // Меньший шаг для плавного роста
        const rate = Math.min(3.0, 1 + this.tower.SLAB_INDEX * 0.05); // Увеличили максимум до 3.0
        this.stackSound.volume(volume);
        this.stackSound.rate(rate);
        this.stackSound.play();
        console.log('Playing sound, volume:', volume, 'rate:', rate, 'SLAB_INDEX:', this.tower.SLAB_INDEX);
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