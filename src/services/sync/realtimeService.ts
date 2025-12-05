// src/services/realtimeService.ts
import { supabase } from "@/core/services/supabase";
import { downloadAll } from "@/services/sync";

const subscriptions: Array<any> = [];

function handleBroadcastPayload(table: string, payload: any) {
  try {
    const event = payload.event ?? payload.type ?? payload.action ?? payload?.payload?.type;
    const tgOp = payload?.payload?.record?.operation ?? payload?.payload?.op ?? payload?.op;

    const op = (event || tgOp || payload?.eventType || payload?.type || "").toString().toUpperCase();

    if (["INSERT", "UPDATE", "DELETE"].includes(op) || op === "") {
      downloadAll(0);
      console.log(`[Realtime] ${table} => triggered downloadAll due to event:`, op || "unknown");
    } else {
      console.log(`[Realtime] ${table} => ignored event:`, op);
    }
  } catch (err) {
    console.error("[Realtime] 处理广播负载时出错:", err);
  }
}

function createChannelSubscriptions(tables: string[]) {
  if (!supabase) {
    console.warn("[Realtime] Supabase 客户端未初始化，跳过频道订阅。");
    return;
  }

  tables.forEach((table) => {
    try {
      const topic = `room:${table}`;
      const channel = supabase!.channel(topic, { config: { private: true } });

      channel
        .on("broadcast", { event: "*" }, (payload) => {
          handleBroadcastPayload(table, payload);
        })
        .subscribe((status) => {
          console.log(`[Realtime] 频道 ${topic} 订阅状态:`, status);
        });

      subscriptions.push({ channel, topic });
    } catch (err) {
      console.error(`[Realtime] 创建 ${table} 频道失败:`, err);
    }
  });
}

function cleanupSubscriptions() {
  try {
    subscriptions.forEach((sub) => {
      try {
        if (sub?.channel?.unsubscribe) {
          sub.channel.unsubscribe();
          console.log(`[Realtime] 已取消对频道 ${sub.topic ?? sub.channel?.name ?? "unknown"} 的订阅`);
        }
      } catch (e) {
        console.warn("[Realtime] 取消订阅时出错:", e);
      }
    });
  } finally {
    subscriptions.length = 0;
  }
}

export { createChannelSubscriptions, cleanupSubscriptions };
