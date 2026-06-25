export interface ShotData {
  shotNumber: number;
  time?: string;
  description: string;
  shootingStyle: string;
  audio: string;
  script: string[];
}

export interface ConceptMeta {
  concept: string;
  tone: string;
  targetAudience: string;
  projectName: string;
}

export type SummariseLoadState = "loading" | "ready" | "error";
