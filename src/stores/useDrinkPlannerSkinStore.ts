// 周/月/年 Planner「喝水统计皮肤」会话态（不落盘）
import { defineStore } from "pinia";
import { ref } from "vue";

export const useDrinkPlannerSkinStore = defineStore("drinkPlannerSkin", () => {
  const active = ref(false);

  function toggle() {
    active.value = !active.value;
  }

  function clear() {
    active.value = false;
  }

  return { active, toggle, clear };
});
