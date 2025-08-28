import { Tower } from "./tower";
import type { Phase, PhaseHandler } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PhaseMachine {
    private tower = new Tower(); 
  private phases: Record<Phase, PhaseHandler> = {
    start: async () => {
      return "menu";
    },

    menu: async () => {
      
      
      this.tower.init()
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

        return "move";
      },
  };

  constructor() {
    this.execute("start");
  }

  async execute(phase: Phase) {
    console.groupEnd();
    console.group(`Phase {${phase}}`);
    const nextPhase: Phase = await this.phases[phase]();
    this.execute(nextPhase);
  }
}

