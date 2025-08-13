# 标签系统使用方法

## 1 添加与删除操作

### 1.1 从活动标题输入

- **输入#自动推荐：** 在活动标题文本的末尾输入 `#标签名`，触发标签联想弹窗，显示已有标签列表；
- **筛选与添加**：输入字符筛选到目标标签，方向键上下切换，高亮选中后按回车（Enter），即可关联该标签；
- **新建**：若输入内容未命中已有标签，方向键选择最后一行， 回车将自动「新建」该标签并关联。
- **删除** 在标签显示状态，点击标签<img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 符号删除。

  <img src="/tag-input.png" alt="Tag Input" width="300">

### 1.2 从`标签管理面板`选择

- 每行活动的 任务描述 输入区右侧均有**标签按钮**：
  - **无标签时**：<img src="/icons/Tag16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">
  - **已有标签时**：<img src="/icons/Tag16Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">
- **添加/删除**：点击**标签按钮**，弹出`标签管理面板`，搜索目标标签，每次点击可切换选中/删除状态。
  - 支持每个活动打多个标签，单活动建议不超过 10 个标签以确保界面清晰。
- **新建**：若输入内容未命中已有标签，点击 <img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮添加。
  <img src="/tag-manager.png" alt="Tag Manger" width="300">

### 1.3 活动清单标签显示切换

- **切换标签显示**：按住 `ALT`/ `OPT` + 点击 <img src="/icons/CancelOutlined.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;"> 可切换全部标签显示状态，每列活动清单的可视化状态保持独立。

## 2 标签管理

### 2.1 标签色彩编辑

- 点击 <img src="/icons/Heart16Filled.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;"> 修改文字颜色；
- 点击 <img src="/icons/HeartCircle16Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;"> 修改背景颜色。

### 2.2 全局编辑

- 双击名字，修改已有标签名字；
  - 通过 # 无法生成带有 `-`标签，可到`标签管理面板`修改。
- 点击 <img src="/icons/TagDismiss16Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;"> 删除所有关联的标签，无法恢复。

## 3 重要说明

- 标签选择完成，计入全局标签统计；
- 标签用于筛选/聚合，并与主筛选框组合使用【开发中】。
