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
        this.tower.init();
        return "move";
    },

    move: async () => {

        return "stop";
    },

    stop: async () => {

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

