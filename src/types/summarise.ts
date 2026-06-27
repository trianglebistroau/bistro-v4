export interface ShotData {
  shotNumber: number;
  time?: string;
  description: string;
  shootingStyle: string;
  audio: string;
  script: string[];
}

export interface ConceptMeta {
  projectName: string;
}

export type SummariseLoadState = "loading" | "ready" | "error";

// Result the summarise page renders (and the plan stage seeds from).
export interface SummariseResult {
  meta: ConceptMeta;
  shots: ShotData[];
}
