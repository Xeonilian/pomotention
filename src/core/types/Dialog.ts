// core/types/Dialog.ts
export enum DialogState {
  NORMAL_CHAT = "normal_chat",
  GATHERING_INFO = "gathering_info",
  CONFIRMING_PROMPT = "confirming_prompt",
  API_CALLING = "api_calling",
}

export interface TaskPlanningContext {
  state: DialogState;
  gatheredInfo: {
    goal?: string;
    criteria?: string;
    progress?: string;
    timeline?: string;
    experience?: string;
    constraints?: string;
    vision?: string;
    team_resource?: string;
    success_criteria?: string;
    deliverables?: string;
    blockers?: string;
  };
  currentStep: number;
}

export interface GuideQuestion {
  key:
    | "goal"
    | "criteria"
    | "progress"
    | "constraints"
    | "vision"
    | "success_criteria"
    | "timeline"
    | "team_resource"
    | "blockers"
    | "deliverables";
  question: string;
}
