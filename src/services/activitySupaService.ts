// src/core/services/activityService.ts
import { supabase } from "@/core/services/supabase";

class ActivityService {
  /**
   * 上传活动（使用加密函数）
   */
  async uploadActivity(activity: {
    id: number;
    title: string;
    class: "S" | "T";
    lastModified: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("用户未登录");

      // ⭐ 调用 SECURITY DEFINER 函数
      const { error } = await supabase.rpc("insert_activity", {
        p_id: activity.id,
        p_user_id: userData.user.id,
        p_title: activity.title,
        p_class: activity.class,
        p_last_modified: activity.lastModified,
      });

      if (error) {
        console.error("❌ 插入错误:", error);
        throw error;
      }

      console.log("✅ 活动已上传（加密存储）");
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ 上传失败:", message);
      return { success: false, error: message };
    }
  }

  /**
   * 获取活动列表（自动解密）
   */
  async getActivities(): Promise<any[]> {
    try {
      // ⭐ 调用查询函数
      const { data, error } = await supabase.rpc("get_activities");

      if (error) {
        console.error("❌ 查询错误:", error);
        throw error;
      }

      console.log("✅ 获取到", data?.length || 0, "条活动");
      return data || [];
    } catch (error) {
      console.error("❌ 获取活动失败:", error);
      return [];
    }
  }

  /**
   * 更新活动
   */
  async updateActivity(activity: {
    id: number;
    title: string;
    class: "S" | "T";
    lastModified: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("update_activity", {
        p_id: activity.id,
        p_title: activity.title,
        p_class: activity.class,
        p_last_modified: activity.lastModified,
      });

      if (error) throw error;

      console.log("✅ 活动已更新");
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ 更新失败:", message);
      return { success: false, error: message };
    }
  }

  /**
   * 删除活动
   */
  async deleteActivity(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("delete_activity", {
        p_id: id,
      });

      if (error) throw error;

      console.log("✅ 活动已删除");
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ 删除失败:", message);
      return { success: false, error: message };
    }
  }
}

export const activityService = new ActivityService();
