import { ref } from "vue";
import { useTagStore } from "@/stores/useTagStore";
import { useSettingStore } from "@/stores/useSettingStore";

export const TIMER_INTENT_POPOVER_ID = "timer-intent";

const TAG_TRIGGER_RE = /[#@]([\p{L}\p{N}_]*)$/u;

export function useTimerIntentTags() {
  const tagStore = useTagStore();
  const settingStore = useSettingStore();

  const tagSearchTerm = ref("");
  const popoverTargetId = ref<number | string | null>(null);

  function handleContentInput(ownerId: number | string, content: string): boolean {
    const match = content.match(TAG_TRIGGER_RE);
    if (match) {
      popoverTargetId.value = ownerId;
      tagSearchTerm.value = match[1] ?? "";
      return true;
    }
    if (popoverTargetId.value === ownerId) {
      closePopover();
    }
    return false;
  }

  function clearTagTriggerText(content: string): string {
    return content.replace(TAG_TRIGGER_RE, "").trim();
  }

  function closePopover(): void {
    popoverTargetId.value = null;
    tagSearchTerm.value = "";
  }

  function addTagId(tagId: number): void {
    const ids = settingStore.settings.pomodoroTagIds ?? [];
    if (!ids.includes(tagId)) {
      settingStore.settings.pomodoroTagIds = [...ids, tagId];
    }
    tagStore.touchTagLastUsed(tagId);
  }

  function selectTag(tagId: number, currentText: string): string {
    addTagId(tagId);
    closePopover();
    return clearTagTriggerText(currentText);
  }

  function createTag(name: string, currentText: string, color?: string, backgroundColor?: string): string {
    const tag = tagStore.addTag(name, color ?? "#333333", backgroundColor ?? "#e8e8e8");
    addTagId(tag.id);
    closePopover();
    return clearTagTriggerText(currentText);
  }

  function removeTagId(tagId: number): void {
    const ids = settingStore.settings.pomodoroTagIds ?? [];
    settingStore.settings.pomodoroTagIds = ids.filter((id) => id !== tagId);
  }

  return {
    tagSearchTerm,
    popoverTargetId,
    handleContentInput,
    clearTagTriggerText,
    closePopover,
    selectTag,
    createTag,
    removeTagId,
  };
}
