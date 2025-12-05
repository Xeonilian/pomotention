import { runMigrations } from "@/services/migrationService";

export async function initialMigrate() {
  const report = await runMigrations(); // 等待迁移完成
  const errors: string[] = [];

  // 检查迁移结果中的错误
  if (report.errors.length > 0) {
    console.error("⚠️ [Sync] 迁移过程中出现错误", report.errors);
    errors.push(...report.errors.map((e: any) => `迁移错误: ${e}`));
  }

  if (report.cleaned.length) {
    console.log(`✅ [Sync] 清理了 ${report.cleaned.length} 个废弃 key`);
  }

  if (report.migrated.length) {
    console.log(`✅ [Sync] 迁移了 ${report.migrated.length} 个数据集`);
  }
}
