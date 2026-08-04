import { z } from "zod";

/** 本关只开放 create todo */
export const CaptureTodoIntentSchema = z.object({
  op: z.literal("create").default("create"),
  kind: z.literal("todo"),
  fields: z.object({
    title: z.string().min(1),
    /** 预估番茄数 */
    estPomo: z.number().int().min(1).max(12).optional(),
    /** 相对今天的天数：0=今天，1=明天 */
    dueDayOffset: z.number().int().min(0).max(366).optional(),
  }),
  confidence: z.enum(["high", "low"]),
});

export type CaptureTodoIntent = z.infer<typeof CaptureTodoIntentSchema>;

export const CaptureIntentListSchema = z.union([
  z.array(CaptureTodoIntentSchema),
  CaptureTodoIntentSchema.transform((item) => [item]),
]);

export const TODO_KINDS_HINT =
  "Only kind todo is allowed. Return a JSON array of objects: " +
  '{ "op":"create", "kind":"todo", "fields":{ "title": string, "estPomo"?: number, "dueDayOffset"?: number }, "confidence":"high"|"low" }. ' +
  "dueDayOffset: 0=today, 1=tomorrow. If not a clear create-todo request, return confidence low or empty array. No markdown, JSON only.";
