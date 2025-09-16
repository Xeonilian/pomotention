export enum DialogState {
  NORMAL_CHAT = "normal_chat",
  GATHERING_INFO = "gathering_info",
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
    resources?: string;
  };
  currentStep: number;
}

export interface GuideQuestion {
  key: "goal" | "criteria" | "progress" | "constraints";
  question: string;
}
