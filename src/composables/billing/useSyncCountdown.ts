// src/composables/billing/useSyncCountdown.ts
// 同步有效期倒计时：付费优先，否则试用。复用 getSyncEntitlement 的 60s 缓存。
import { ref, onMounted } from "vue";
import { getSyncEntitlement } from "@/core/billing/entitlement";

const DAY_MS = 24 * 60 * 60 * 1000;

export function useSyncCountdown() {
  /** 形如 "试用剩余 12 天" / "会员剩余 30 天" / "试用今天到期"；无有效期时为 null */
  const label = ref<string | null>(null);
  /** 有效期截止 ISO；无则为 null */
  const until = ref<string | null>(null);
  /** 是否已过期（查过权益且不在试用也不在付费） */
  const expired = ref(false);

  async function refresh() {
    const r = await getSyncEntitlement();
    const now = Date.now();
    const paidEnd = r.paidUntil && new Date(r.paidUntil).getTime() > now ? r.paidUntil : null;
    const trialEnd = r.trialUntil && new Date(r.trialUntil).getTime() > now ? r.trialUntil : null;
    const end = paidEnd ?? trialEnd;
    until.value = end;
    if (!end) {
      // 查过权益但既不在试用也不在付费 → 已过期（no-session 时不算过期，只是没登录）
      expired.value = r.denyReason === "expired";
      label.value = null;
      return;
    }
    expired.value = false;
    // 剩余不足 1 天 → 今天到期；否则向上取整为 N 天（避免 Math.ceil 把 0.5 天也显示成"剩余 1 天"）
    const remainingMs = new Date(end).getTime() - now;
    const kind = paidEnd ? "会员" : "试用";
    label.value = remainingMs < DAY_MS ? `${kind}今天到期` : `${kind}剩余 ${Math.ceil(remainingMs / DAY_MS)} 天`;
  }

  onMounted(refresh);
  return { label, until, expired, refresh };
}
