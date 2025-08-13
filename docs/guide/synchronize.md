# WebDAV 同步数据说明

## 1 账户准备

### 1.1 坚果云

1. 登录[坚果云](https://www.jianguoyun.com/)，从账户信息进入安全选项
2. 添加应用，输入`pomotention`，点击生成密码，获得应用密码
3. 本软件中提供信息，`帮助页`点击 <img src="/icons/ArrowSync24Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，弹出 `录入设置对话框` 输入：
   - https://dav.jianguoyun.com/dav/
   - 坚果云账号
   - 应用密码
   - 保存路径：`/PomodoroBackup`
     <img src="/sync-1.png" alt="Sync Setting" width="300">
4. 点击`测试`按钮:
   - 如果显示`✔️ 账户测试通过！`，点击确认保存；
   - 如果没有通过测试，无法保存设置，请重新配置。

> [坚果云信息获取参考](https://help.jianguoyun.com/?p=3168)

## 1.2 其他支持 WebDAV 的云盘（通用设置方法）

如果您使用的云盘或服务器本身支持 WebDAV（如 Nextcloud、ownCloud、TeraCLOUD 等），请按照如下方式进行设置：

1. **登录您的云盘或 WebDAV 服务后台，确认已开启 WebDAV 功能**。部分服务或自建平台需在管理后台启用 WebDAV，并设置用于连接的账号与密码。
2. 获取：
   - **WebDAV 服务地址**
   - **用户名**：填写您的云盘账户名，或自建 WebDAV 服务分配的用户名
   - **密码/应用密码**：填写您的登录密码、专用的应用密码或服务方提供的访问密钥（如有）
3. 后续步骤同上。

## 2 云端同步操作

### 2.1 首次同步

1. 完成设置后，再次点击 <img src="/icons/ArrowSync24Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，弹出 `同步对话框`：
   <img src="/sync-2.1.png" alt="Sync First" width="300">
2. 点击 `首次同步（上传本地数据）`。

### 2.2 日常同步

1. 如果软件检测到指定文件存有同步数据，点击点击 <img src="/icons/ArrowSync24Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，弹出 `同步对话框`：
   <img src="/sync-2.2.png" alt="Sync Regular" width="300">
2. 根据 `上传本地数据 - 覆盖云端`，会把当前数据，全部上传至云端，并替换云端的文件。
3. 根据 `下载云端数据 - 覆盖本地`，会把云端数据，全部下载至本地，导入软件，并刷新。

### 2.3 两台电脑的同步流程

1. 电脑 A（有数据）首次同步云端
2. 电脑 B（无数据）从云端下载数据，编辑，同步数据到云端
3. 电脑 A（有数据）从云端下载数据覆盖本地

## 3 本地数据导出

- 从 `录入设置对话框` 点击 `导出数据` 按钮，选择路径后，确认后导出。
- 从 `同步对话框` 点击 `导出数据到本地` 按钮，选择路径后，确认后导出。

## 4 重要说明

- 同步字段包括：

```
export const STORAGE_KEYS = {
  GLOBAL_POMO_COUNT: "globalPomoCount",
  ACTIVITY: "activitySheet",
  TODO: "todayTodo",
  SCHEDULE: "todaySchedule",
  TASK: "taskTrack",
  DAILY_POMOS: "dailyPomos",
  TIMETABLE_WORK: "timeTableBlocks_work",
  TIMETABLE_ENTERTAINMENT: "timeTableBlocks_entertainment",
  WRITING_TEMPLATE: "writingTemplate",
  TAG: "tag",
  GLOBAL_SETTINGS: "globalSettings",
} as const;
```

- 同步采用全量同步，整存整取，如果多台设备存在数据，需要进行手动合并
- 如果自行将相同名字的数据进行合并，可能出现数据冲突，请谨慎操作
