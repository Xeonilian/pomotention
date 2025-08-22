import { invoke } from "@tauri-apps/api/core";

export async function chatByTauri(userText: string) {
  const messages = [{ role: "user", content: userText }];

  const res = await invoke<{ content: string }>("chat_completion", {
    input: {
      messages,
      model: "moonshot-v1-8k",
      temperature: 0.7,
      stream: false,
    },
  });

  return res.content;
}
