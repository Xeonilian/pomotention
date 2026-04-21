---
title: 账号与数据
description: 注册、登录、云端同步与 JSON 导入导出；桌面与 PWA 的差异主要是能力是否开放。
---

# 账号与数据

::: tip

- 各端 **注册、登录、合并与退出** 的界面流程一致；差异主要在 **本地存储形态** 与 **JSON 全量导出是否开放**（见下表）。
- **安装与卸载** 见 [安装方式总览](./install-overview.md)；[桌面客户端说明](./desktop-install.md)；[PWA渐进式网页应用说明](./pwa-install.md)。

:::

## 各端能力对照 {#capabilities}

| 能力                 | 桌面客户端 | 桌面 PWA / 网页 | 手机 PWA /网页 |
| -------------------- | ---------- | --------------- | -------------- |
| 注册、登录、云端同步 | 支持       | 支持            | 支持           |
| 全量 JSON **导出**   | 支持       | 不支持          | 不支持         |
| JSON **导入**        | 支持       | 支持            | 不支持         |

## 按钮与状态

|                                                                                按钮图标                                                                                 | 功能说明                           |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------- |
| <img src="/icons/DatabasePerson20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;"> | 打开数据迁移菜单                   |
|     <img src="/icons/Person20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;">      | 未登录，跳转登录页面               |
|     <img src="/icons/Person20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;">     | 已登录，跳转登录页面               |
|     <img src="/icons/Person20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">     | 已登录，有未同步数据，跳转登录页面 |
|   <img src="/icons/CloudSync20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">    | 数据正在同步                       |

## 注册与云端同步 {#account-sync}

- 点击登录按钮<img src="/icons/Person20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">；按界面指引进入注册流程。
- 注册后会尝试向邮箱发送**验证邮件**；收到后点击邮件内链接完成确认。
- 登录后若本地已有未上传数据，将与云端**合并**；登录状态会保持，直至您主动退出登录。

::: tip

- **当前服务端对自动发信有频率限制（约每小时 2 封）**，高峰时可能延迟或暂时发不出。
- 可先**照常使用应用**（本地数据照常可用）；稍后再查收件箱或垃圾邮件；确认邮箱后再登录，即可使用**云端同步**。

:::

## 离线使用 {#offline}

- 未登录时默认为离线模式；功能均可正常使用。
- 已登录后若仅需本地、不再使用云端同步：点击账号区域 **退出登录** <img src="/icons/Person20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">；在 **「退出登录时是否保留本地数据？」** 中选择 **保留**。

## 切换登录账号 {#switch-account}

- 当本次登录的账号与**上一次在本机**登录的账号不一致时，客户端会清空本地业务数据并改为载入新账号的同步数据；避免多账号数据混用。
- **桌面端**：「本机」即当前安装目录对应的一套本地数据。
- **PWA / 网页**：以 **当前浏览器存储分区** 为准；同一浏览器里「仅标签页」与「已安装的 PWA」可能对应不同分区（见下方折叠说明）。
- 更换账号前：请确认数据已可靠同步至云端；若需要 **文件级备份**，须使用 [桌面端 JSON 全量导出](#json-export-desktop)（PWA / 网页无法导出 JSON）。

::: details 展开：为什么「标签页」和「已装的 PWA」里数据可能对不上

- 在同一浏览器、**同一打开方式**（仅标签页 **或** 已安装的 PWA）下，刷新或站点更新后通常沿用**当前存储分区**里的本地数据。
- **换了一种打开方式**（例如从标签页改成用 PWA 打开），会得到**另一份本地库**；云端只同步**工作数据**；不同步设置。
- 从桌面迁 JSON 到 PWA：见 [JSON 导入](#json-import)。

:::

## JSON 全量导出（仅桌面）{#json-export-desktop}

### 当前版本（v0.6.4 及以上）

- 点击 **数据按钮**；打开数据库导入/导出对话框；按需导出并保存 JSON 文件。
- 导出文件请自行妥善保管。

### 旧版客户端（v0.4.4）

- 在 **v0.4.4** 中打开 **帮助页**；通过 **数据同步** 执行**全量数据导出**。
- 导出的 JSON 可用于迁移至当前版本客户端。

## JSON 导入 {#json-import}

::: tip

- **手机PWA / 网页**：不提供该功能。

:::

- 点击数据按钮<img src="/icons/DatabasePerson20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">；打开 **数据库导入导出** 对话框。
- 按引导预览数据并选择覆盖策略（浏览器内通过目录选择器选取含 JSON 的文件夹；桌面端按界面指引选择文件或文件夹）。
- 导入完成后将自动登出；请在确认合并结果无误后，再登录以恢复云端同步。
- 若导入结果不符合预期，可再次打开该对话框；点击 **恢复导入前状态**（在提供该按钮时可用）。

::: warning 导入前请知悉

- 导入会按对话框中的**预览结果**与**覆盖策略**写入本地库；确认前请看清将要合并或替换的范围，误操作可能导致本地数据被覆盖且难以恢复。
- 导入前建议在桌面端先做 **[JSON 全量导出](#json-export-desktop)**，或确认重要内容已随当前账号**同步至云端**。
- 请选择**同一次导出所生成**、且目录结构与官方导出一致的文件夹；勿随意指定无关目录、勿把多份备份混在一个导入流程里胡乱合并，否则可能预览失败、导入失败或出现数据错乱。

:::
