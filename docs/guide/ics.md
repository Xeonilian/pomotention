# 日程导出使用方法

## 1 数据和按钮说明

### 1.1 按钮一览表

|                                                                                 按钮图标                                                                                  | 功能说明                             |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------- |
|     <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 10px;">      | 生成 QR 码或打开保存对话框           |
|    <img src="/icons/Previous24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;">     | 跳转到前一天/周/月                   |
|      <img src="/icons/Next24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;">       | 跳转到后一天/周/月                   |
| <img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 6px;"> | 切换视图：在日、周、月视图中滚动切换 |

### 1.2 数据说明

- 导出内容遵循 iCalendar 标准（ICS），字段包括：

  - `UID`：事件唯一标识
  - `SUMMARY`：事件标题
  - `DTSTART` / `DTEND`：开始/结束时间，含时区
  - `DESCRIPTION`：地点/优先级

- `Todo` 待办任务：

  - 无开始结束时间：导出为`全天事件`
  - 有开始时间：`[开始时间，番茄数 x30]`
  - 有开始结束时间：`[开始时间，结束时间]`

- `Schedule` 预约任务：

  - 有开始时间与时长： `[开始时间，开始时间+时长]`
  - 有开始时间无时长： `[开始时间，系统默认]`
    - 不同系统可能重复开始时间，或增加 1h

  <img src="/dev-log/ui-checks/20250912-qr-icr-full-after.png" alt="Export QR" width="500">

## 2 操作步骤

## 2.1 通过二维码导出单条任务

1. 在任何视图中选中一条任务，任务背景变为黄色高亮。
2. 点击 <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮，打开二维码。
3. 手机扫描二维码，弹出导入提醒，根据需求进行编辑并确认。

   - ios 系统使用照相机扫描；
   - 安卓系统使用系统的扫描功能，非照相机；
   - 可扫描下方二维码尝试。

    <img src="/dev-log/ui-checks/20250912-qr-icr-code-after.png" alt="Export QR" width="250">

## 2.2 通过 icr 文件导出多条任务

1. 点击 <img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮，切换任务计划日、周、月视图；
2. 点击 <img src="/icons/Previous24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;"> <img src="/icons/Next24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;"> 选择导出范围；
3. 点击 <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，弹出保存路径对话框，输入文件名 `*.icr` 。
4. 选择路径，保存，推荐手机可直接访问的云盘位置。
5. 在手机上打开 `.icr` 文件，激活日历导入流程，保存。

## 3 重要说明

- **确认时间与时区**：导出前确保事件开始/结束时间正确，避免跨时区误差。
- **隐私**：ICS/二维码会包含事件详情（标题、备注、地点等），分享前请确认无敏感信息。
- **更新同步**：导出的 `.ics` 文件是一次性快照，后续在本应用修改事件并不会自动同步到外部日历；需要时请重新导出。
- **重复导入**：若同一 UID 被多次导入，某些日历会创建重复项，请先删除旧事件或合并。
