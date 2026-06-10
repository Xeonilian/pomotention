export type PomodoroStep = {
  type: "work" | "break";
  /** 分钟（经典序列） */
  duration?: number;
  /** 秒（HIIT 等亚分钟步） */
  durationSec?: number;
};

export type ParsedPomoSequence = {
  steps: PomodoroStep[];
  isHiit: boolean;
  totalWorkSec: number;
  /** HIIT 执行意图展示文案 */
  hiitExpression?: string;
};

const HIIT_PREFIX_RE = /^HIITs?\s*=\s*/i;
const HIIT_BLOCK_RE = /\(\s*(\d+)\s*\+\s*(\d+)\s*\)\s*[x×*]\s*(\d+)/gi;

type HiitBlock = { workSec: number; breakSec: number; reps: number };

/** 执行意图展示：(45s +15s) x rep 8+(60s +20s) x rep 6 */
export function formatHiitExpressionDisplay(blocks: ReadonlyArray<HiitBlock>): string {
  return blocks.map(({ workSec, breakSec, reps }) => `(${workSec}s +${breakSec}s) x rep ${reps}`).join("+");
}

export function stepDurationSec(step: PomodoroStep): number {
  if (step.durationSec != null && step.durationSec > 0) return step.durationSec;
  return (step.duration ?? 0) * 60;
}

export function stepDurationMin(step: PomodoroStep): number {
  return stepDurationSec(step) / 60;
}

function parseExplicitWorkDuration(token: string): number {
  const explicitWorkDuration = Number.parseInt(token, 10);
  if (!Number.isFinite(explicitWorkDuration) || explicitWorkDuration < 1 || explicitWorkDuration > 60) {
    throw new Error(`Invalid work time: ${token}. Allowed range: 1-60.`);
  }
  return explicitWorkDuration;
}

function tryParseHiit(input: string): ParsedPomoSequence | null {
  if (!HIIT_PREFIX_RE.test(input)) return null;

  const body = input.replace(HIIT_PREFIX_RE, "").trim();
  if (!body) throw new Error("HIIT 表达式为空。");

  const blocks: HiitBlock[] = [];
  let consumed = "";
  HIIT_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HIIT_BLOCK_RE.exec(body)) !== null) {
    const workSec = Number.parseInt(match[1], 10);
    const breakSec = Number.parseInt(match[2], 10);
    const reps = Number.parseInt(match[3], 10);
    if (workSec < 1 || breakSec < 1 || reps < 1) {
      throw new Error(`HIIT 块 (${match[1]}+${match[2]})×${match[3]} 的数值须 ≥ 1。`);
    }
    blocks.push({ workSec, breakSec, reps });
    consumed += match[0];
  }

  if (blocks.length === 0) {
    throw new Error("无效的 HIIT 格式。示例：HIITs=(45+15)×8+(60+20)*6");
  }

  const remainder = body.replace(/\(\s*\d+\s*\+\s*\d+\s*\)\s*[x×*]\s*\d+/gi, "").replace(/\+/g, "").trim();
  if (remainder) {
    throw new Error(`HIIT 表达式无法解析：「${remainder}」`);
  }

  const steps: PomodoroStep[] = [];
  let totalWorkSec = 0;
  for (const block of blocks) {
    for (let i = 0; i < block.reps; i++) {
      steps.push({ type: "work", durationSec: block.workSec });
      steps.push({ type: "break", durationSec: block.breakSec });
      totalWorkSec += block.workSec;
    }
  }

  return { steps, isHiit: true, totalWorkSec, hiitExpression: formatHiitExpressionDisplay(blocks) };
}

/** 经典 🍅+05 / w25 序列 */
export function parseClassicSequence(sequence: string, getDefaultWorkDurationMinutes: () => number): PomodoroStep[] {
  const validBreakTimes = ["01", "02", "05", "10", "15", "30", "60"];
  const firstStepMatch = sequence.match(/🍅\d*|w\d+|\d+/i);
  if (!firstStepMatch) return [];

  const trimmed = sequence.substring(firstStepMatch.index || 0);
  const steps = trimmed.split("+").map((step) => step.trim());
  return steps.map((step) => {
    if (/^🍅\d+$/u.test(step)) {
      return { type: "work", duration: parseExplicitWorkDuration(step.slice(2)) };
    }
    if (/^w\d+$/i.test(step)) {
      return { type: "work", duration: parseExplicitWorkDuration(step.slice(1)) };
    }
    if (step.includes("🍅")) {
      return { type: "work", duration: getDefaultWorkDurationMinutes() };
    }
    const breakTime = step.padStart(2, "0");
    if (!validBreakTimes.includes(breakTime)) {
      throw new Error(`Invalid break time: ${step}. Allowed break times: ${validBreakTimes.join(", ")}`);
    }
    return { type: "break", duration: Number.parseInt(breakTime, 10) };
  });
}

export function parsePomoSequenceInput(
  sequence: string,
  getDefaultWorkDurationMinutes: () => number,
): ParsedPomoSequence {
  const trimmed = sequence.trim();
  const hiit = tryParseHiit(trimmed);
  if (hiit) return hiit;

  const steps = parseClassicSequence(trimmed, getDefaultWorkDurationMinutes);
  const totalWorkSec = steps.filter((s) => s.type === "work").reduce((sum, s) => sum + stepDurationSec(s), 0);
  return { steps, isHiit: false, totalWorkSec };
}
