# 日程导出使用方法

## 快速导航

- 我想导出单条任务到手机日历：见 [二维码导出单条任务](#二维码导出单条任务)
- 我想批量导出某个范围：见 [ics 文件导出多条任务](#ics-文件导出多条任务)
- 我想确认导出字段：见 [导出数据规则](#导出数据规则)
- 我想避免常见问题：见 [限制与说明](#限制与说明)

## 常用按钮

| 按钮图标 | 功能说明 |
| :---: | :--- |
| <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 10px;"> | 生成二维码或打开保存对话框 |
| <img src="/icons/Previous24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;"> | 跳转到前一天/周/月 |
| <img src="/icons/Next24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;"> | 跳转到后一天/周/月 |
| <img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 6px;"> | 切换日/周/月视图 |

## 导出数据规则

- 导出遵循 iCalendar（ICS）标准，包含字段：
  - `UID`
  - `SUMMARY`
  - `DTSTART` / `DTEND`（含时区）
  - `DESCRIPTION`（地点/优先级）
- `Todo` 导出规则：
  - 无开始结束：导出为全天事件
  - 有开始无结束：按 `[开始时间, 番茄数 x 30min]`
  - 有开始有结束：按 `[开始时间, 结束时间]`
- `Schedule` 导出规则：
  - 有开始和时长：按 `[开始时间, 开始时间 + 时长]`
  - 有开始无时长：按系统默认时长导出（不同系统可能出现重复起始或 +1h）

<img src="/dev-log/ui-checks/20250912-qr-ics-full-after.png" alt="Export QR" width="500">

## 二维码导出单条任务

1. 在任意视图选中一条任务（黄色高亮）。
2. 点击 <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 打开二维码。
3. 用手机扫描并按系统提示导入日历。
4. 平台说明：
   - iOS：使用系统相机扫码
   - Android：建议使用系统扫码入口

<img src="/dev-log/ui-checks/20250912-qr-ics-code-after.png" alt="Export QR" width="250">

## ICS 文件导出多条任务

1. 点击 <img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 选择日/周/月视图。
2. 使用 <img src="/icons/Previous24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;"> / <img src="/icons/Next24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;"> 定位导出范围。
3. 点击 <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">，在保存窗口输入 `*.ics` 文件名并保存。
4. 在手机或日历应用中打开该文件并完成导入。

## 限制与说明

- 导出前请确认时间和时区设置，避免跨时区偏差。
- ICS/二维码包含标题、备注、地点等信息，分享前请确认隐私。
- `.ics` 为一次性快照，后续修改不会自动同步，需重新导出。
- 重复导入同一 `UID` 时，部分日历会产生重复项。
