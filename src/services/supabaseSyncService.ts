// src/services/supabaseSyncService.ts

import { supabase } from "@/core/services/supabase";
import { getCurrentUser } from "@/core/services/authServicve";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import type { Tag } from "@/core/types/Tag";
import type { Template } from "@/core/types/Template";
import type { Block } from "@/core/types/Block";
import {
  loadActivities,
  loadTodos,
  loadSchedules,
  loadTasks,
  loadTags,
  loadTemplates,
  loadTimeBlocks,
  loadDailyPomos,
  loadGlobalPomoCount,
  loadGlobalSettings,
  saveActivities,
  saveTodos,
  saveSchedules,
  saveTasks,
  saveTags,
  saveTemplates,
  saveTimeBlocks,
  saveDailyPomos,
  saveGlobalPomoCount,
  saveGlobalSettings,
} from "./localStorageService";

/**
 * 上传本地数据到 Supabase
 */
export async function uploadToSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "用户未登录" };
    }

    // 1. 上传 Activities
    const activities = loadActivities();
    if (activities.length > 0) {
      const activityInserts = activities.map((a) => ({
        id: a.id,
        user_id: user.id,
        title: a.title,
        class: a.class,
        project_id: a.projectId || null,
        est_pomo_i: a.estPomoI || null,
        due_date: a.dueDate || null,
        due_range: a.dueRange as any,
        interruption: a.interruption || null,
        status: a.status || null,
        location: a.location || null,
        pomo_type: a.pomoType || null,
        is_untaetigkeit: a.isUntaetigkeit || null,
        task_id: a.taskId || null,
        tag_ids: a.tagIds || null,
        parent_id: a.parentId,
      }));
      const { error } = await supabase.from("activities").upsert(activityInserts as any);
      if (error) throw error;
    }

    // 2. 上传 Todos
    const todos = loadTodos();
    if (todos.length > 0) {
      const todoInserts = todos.map((t) => ({
        id: t.id,
        user_id: user.id,
        activity_id: t.activityId,
        activity_title: t.activityTitle,
        project_name: t.projectName || null,
        task_id: t.taskId || null,
        est_pomo: t.estPomo || null,
        real_pomo: t.realPomo || null,
        status: t.status || null,
        priority: t.priority,
        pomo_type: t.pomoType || null,
        due_date: t.dueDate || null,
        done_time: t.doneTime || null,
        start_time: t.startTime || null,
        interruption: t.interruption || null,
        position_index: t.positionIndex || null,
        global_index: t.globalIndex || null,
      }));
      const { error } = await supabase.from("todos").upsert(todoInserts as any);
      if (error) throw error;
    }

    // 3. 上传 Schedules
    const schedules = loadSchedules();
    if (schedules.length > 0) {
      const scheduleInserts = schedules.map((s) => ({
        id: s.id,
        user_id: user.id,
        activity_id: s.activityId,
        activity_title: s.activityTitle,
        activity_due_range: s.activityDueRange as any,
        task_id: s.taskId || null,
        status: s.status || null,
        project_name: s.projectName || null,
        location: s.location || null,
        done_time: s.doneTime || null,
        is_untaetigkeit: s.isUntaetigkeit || null,
        interruption: s.interruption || null,
      }));
      const { error } = await supabase.from("schedules").upsert(scheduleInserts as any);
      if (error) throw error;
    }

    // 4. 上传 Tasks
    const tasks = loadTasks();
    if (tasks.length > 0) {
      const taskInserts = tasks.map((t) => ({
        id: t.id,
        user_id: user.id,
        activity_title: t.activityTitle,
        project_name: t.projectName || null,
        description: t.description || null,
        source: t.source,
        source_id: t.sourceId,
        energy_records: t.energyRecords as any,
        reward_records: t.rewardRecords as any,
        interruption_records: t.interruptionRecords as any,
        starred: t.starred || null,
      }));
      const { error } = await supabase.from("tasks").upsert(taskInserts as any);
      if (error) throw error;
    }

    // 5. 上传 Tags
    const tags = loadTags();
    if (tags.length > 0) {
      const tagInserts = tags.map((t) => ({
        id: t.id,
        user_id: user.id,
        name: t.name,
        color: t.color,
        background_color: t.backgroundColor,
        count: t.count,
      }));
      const { error } = await supabase.from("tags").upsert(tagInserts as any);
      if (error) throw error;
    }

    // 6. 上传 Templates
    const templates = loadTemplates();
    if (templates.length > 0) {
      const templateInserts = templates.map((t) => ({
        id: t.id,
        user_id: user.id,
        title: t.title,
        content: t.content,
      }));
      const { error } = await supabase.from("templates").upsert(templateInserts as any);
      if (error) throw error;
    }

    // 7. 上传 Time Blocks
    const workBlocks = loadTimeBlocks("work", []);
    const entertainmentBlocks = loadTimeBlocks("entertainment", []);
    const allBlocks = [
      ...workBlocks.map((b) => ({ ...b, block_type: "work" as const })),
      ...entertainmentBlocks.map((b) => ({ ...b, block_type: "entertainment" as const })),
    ];
    if (allBlocks.length > 0) {
      const blockInserts = allBlocks.map((b) => ({
        id: b.id,
        user_id: user.id,
        block_type: b.block_type,
        category: b.category,
        start_time: b.start,
        end_time: b.end,
      }));
      const { error } = await supabase.from("time_blocks").upsert(blockInserts as any);
      if (error) throw error;
    }

    // 8. 上传 Daily Pomos
    const dailyPomos = loadDailyPomos();
    const dailyPomosArray = Object.entries(dailyPomos).map(([date, data]) => ({
      user_id: user.id,
      date,
      count: data.count,
      diff: data.diff,
    }));
    if (dailyPomosArray.length > 0) {
      const { error } = await supabase.from("daily_pomos").upsert(dailyPomosArray as any);
      if (error) throw error;
    }

    // 9. 上传 Global Pomo Count
    const globalPomoCount = loadGlobalPomoCount();
    const { error: pomoError } = await supabase.from("global_pomo_count").upsert({
      user_id: user.id,
      count: globalPomoCount,
    } as any);
    if (pomoError) throw pomoError;

    // 10. 上传 Settings
    const settings = loadGlobalSettings();
    const { error: settingsError } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      settings: settings as any,
    } as any);
    if (settingsError) throw settingsError;

    return { success: true };
  } catch (error: any) {
    console.error("上传失败:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 从 Supabase 下载数据到本地
 */
export async function downloadFromSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "用户未登录" };
    }

    // 1. 下载 Activities
    const { data: activities, error: activitiesError } = await supabase.from("activities").select("*").eq("user_id", user.id);
    if (activitiesError) throw activitiesError;
    if (activities && activities.length > 0) {
      const localActivities: Activity[] = activities.map((a: any) => ({
        id: a.id,
        title: a.title,
        class: a.class,
        projectId: a.project_id ?? undefined,
        estPomoI: a.est_pomo_i ?? undefined,
        dueDate: a.due_date ?? undefined,
        dueRange: a.due_range ?? undefined,
        interruption: a.interruption ?? undefined,
        status: a.status ?? undefined,
        location: a.location ?? undefined,
        pomoType: a.pomo_type ?? undefined,
        isUntaetigkeit: a.is_untaetigkeit ?? undefined,
        taskId: a.task_id ?? undefined,
        tagIds: a.tag_ids ?? undefined,
        parentId: a.parent_id,
      }));
      saveActivities(localActivities);
    }

    // 2. 下载 Todos
    const { data: todos, error: todosError } = await supabase.from("todos").select("*").eq("user_id", user.id);
    if (todosError) throw todosError;
    if (todos && todos.length > 0) {
      const localTodos: Todo[] = todos.map((t: any) => ({
        id: t.id,
        activityId: t.activity_id,
        activityTitle: t.activity_title,
        projectName: t.project_name ?? undefined,
        taskId: t.task_id ?? undefined,
        estPomo: t.est_pomo ?? undefined,
        realPomo: t.real_pomo ?? undefined,
        status: t.status ?? undefined,
        priority: t.priority,
        pomoType: t.pomo_type ?? undefined,
        dueDate: t.due_date ?? undefined,
        doneTime: t.done_time ?? undefined,
        startTime: t.start_time ?? undefined,
        interruption: t.interruption ?? undefined,
        positionIndex: t.position_index ?? undefined,
        globalIndex: t.global_index ?? undefined,
      }));
      saveTodos(localTodos);
    }

    // 3. 下载 Schedules
    const { data: schedules, error: schedulesError } = await supabase.from("schedules").select("*").eq("user_id", user.id);
    if (schedulesError) throw schedulesError;
    if (schedules && schedules.length > 0) {
      const localSchedules: Schedule[] = schedules.map((s: any) => ({
        id: s.id,
        activityId: s.activity_id,
        activityTitle: s.activity_title,
        activityDueRange: s.activity_due_range,
        taskId: s.task_id ?? undefined,
        status: s.status ?? undefined,
        projectName: s.project_name ?? undefined,
        location: s.location ?? undefined,
        doneTime: s.done_time ?? undefined,
        isUntaetigkeit: s.is_untaetigkeit ?? undefined,
        interruption: s.interruption ?? undefined,
      }));
      saveSchedules(localSchedules);
    }

    // 4. 下载 Tasks
    const { data: tasks, error: tasksError } = await supabase.from("tasks").select("*").eq("user_id", user.id);
    if (tasksError) throw tasksError;
    if (tasks && tasks.length > 0) {
      const localTasks: Task[] = tasks.map((t: any) => ({
        id: t.id,
        activityTitle: t.activity_title,
        projectName: t.project_name ?? undefined,
        description: t.description ?? undefined,
        source: t.source,
        sourceId: t.source_id,
        energyRecords: t.energy_records || [],
        rewardRecords: t.reward_records || [],
        interruptionRecords: t.interruption_records || [],
        starred: t.starred ?? undefined,
      }));
      saveTasks(localTasks);
    }

    // 5. 下载 Tags
    const { data: tags, error: tagsError } = await supabase.from("tags").select("*").eq("user_id", user.id);
    if (tagsError) throw tagsError;
    if (tags && tags.length > 0) {
      const localTags: Tag[] = tags.map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        backgroundColor: t.background_color,
        count: t.count || 0,
      }));
      saveTags(localTags);
    }

    // 6. 下载 Templates
    const { data: templates, error: templatesError } = await supabase.from("templates").select("*").eq("user_id", user.id);
    if (templatesError) throw templatesError;
    if (templates && templates.length > 0) {
      const localTemplates: Template[] = templates.map((t: any) => ({
        id: t.id,
        title: t.title,
        content: t.content || "",
      }));
      saveTemplates(localTemplates);
    }

    // 7. 下载 Time Blocks
    const { data: timeBlocks, error: timeBlocksError } = await supabase.from("time_blocks").select("*").eq("user_id", user.id);
    if (timeBlocksError) throw timeBlocksError;
    if (timeBlocks && timeBlocks.length > 0) {
      const workBlocks: Block[] = timeBlocks
        .filter((b: any) => b.block_type === "work")
        .map((b: any) => ({
          id: b.id,
          category: b.category,
          start: b.start_time,
          end: b.end_time,
        }));
      const entertainmentBlocks: Block[] = timeBlocks
        .filter((b: any) => b.block_type === "entertainment")
        .map((b: any) => ({
          id: b.id,
          category: b.category,
          start: b.start_time,
          end: b.end_time,
        }));
      saveTimeBlocks("work", workBlocks);
      saveTimeBlocks("entertainment", entertainmentBlocks);
    }

    // 8. 下载 Daily Pomos
    const { data: dailyPomos, error: dailyPomosError } = await supabase.from("daily_pomos").select("*").eq("user_id", user.id);
    if (dailyPomosError) throw dailyPomosError;
    if (dailyPomos && dailyPomos.length > 0) {
      const pomosRecord: Record<string, { count: number; diff: number }> = {};
      dailyPomos.forEach((p: any) => {
        pomosRecord[p.date] = {
          count: p.count || 0,
          diff: p.diff || 0,
        };
      });
      saveDailyPomos(pomosRecord);
    }

    // 9. 下载 Global Pomo Count
    const { data: globalPomo, error: globalPomoError } = await supabase
      .from("global_pomo_count")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (globalPomoError && globalPomoError.code !== "PGRST116") throw globalPomoError;
    if (globalPomo) {
      saveGlobalPomoCount((globalPomo as any).count || 0);
    }

    // 10. 下载 Settings
    const { data: settings, error: settingsError } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
    if (settingsError && settingsError.code !== "PGRST116") throw settingsError;
    if (settings) {
      saveGlobalSettings((settings as any).settings);
    }

    return { success: true };
  } catch (error: any) {
    console.error("下载失败:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 首次同步：检查云端是否有数据，没有则上传
 */
export async function firstTimeSync(): Promise<{ success: boolean; hasCloudData: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, hasCloudData: false, error: "用户未登录" };
    }

    // 检查云端是否有数据
    const { data, error } = await supabase.from("user_settings").select("user_id").eq("user_id", user.id).single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const hasCloudData = !!data;

    if (!hasCloudData) {
      // 云端无数据，上传本地数据
      const uploadResult = await uploadToSupabase();
      return { ...uploadResult, hasCloudData: false };
    }

    return { success: true, hasCloudData: true };
  } catch (error: any) {
    console.error("首次同步失败:", error);
    return { success: false, hasCloudData: false, error: error.message };
  }
}
