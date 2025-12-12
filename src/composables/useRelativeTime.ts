// composables/useRelativeTime.ts
import { ref, computed, onMounted, onUnmounted } from "vue";

export function useRelativeTime(timestamp: Ref<number> | number) {
  const now = ref(Date.now());
  let timer: number | null = null;

  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = Date.now();
    }, 60000); // 每分钟更新
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  const formattedTime = computed(() => {
    const ts = unref(timestamp);
    const diff = now.value - ts;

    if (diff < 60 * 1000) return "刚刚";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60 / 1000)} 分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 60 / 60 / 1000)} 小时前`;

    return new Date(ts).toLocaleString();
  });

  return formattedTime;
}
