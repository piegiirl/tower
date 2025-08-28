export type Phase = string;

export type PhaseHandler = () => Promise<Phase>;