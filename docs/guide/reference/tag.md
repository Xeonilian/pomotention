# 标签系统使用方法

## 快速导航

- 我想在标题里快速打标签：见 [从标题输入标签](#从标题输入标签)
- 我想从面板选择标签：见 [从标签管理面板操作](#从标签管理面板操作)
- 我想改颜色或改名称：见 [标签管理](#标签管理)
- 我想在数据页筛选：见 [标签搜索与筛选](#标签搜索与筛选)

## 从标题输入标签

- 在活动标题末尾输入 `#`，触发标签联想列表。
- 输入文本可筛选已有标签，方向键选择后回车关联。
- 未命中时可选择最后一行 `+ 标签`，回车新建并关联。  
  <img src="/tag-input.png" alt="Tag Input" width="300">
- 按住 `ALT/OPT` + 点击 <img src="/icons/Tag16Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;"> 可切换标签显示状态（每列活动清单独立）。
- 标签显示状态下，点击 <img src="/icons/CancelOutlined.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> 删除该标签关联。
  <img src="/tag-toggle.png" alt="Tag Toggle" width="400">

## 从标签管理面板操作

- 每行活动描述输入区右侧有标签按钮：
  - 无标签：<img src="/icons/Tag16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">
  - 已有标签：<img src="/icons/Tag16RegularBlue.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">
- 点击按钮打开 `标签管理面板`，可搜索并切换选中/取消。
- 单活动支持多个标签，建议不超过 10 个以保持界面清晰。
- 未命中可点击 <img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 新建标签。  
  <img src="/tag-manager.png" alt="Tag Manger" width="300">
- 在 `数据页` 打开任意 Todo/Schedule/Activity，也可在信息区使用标签按钮编辑。

## 标签管理

### 颜色编辑

- 点击 <img src="/icons/Heart16Filled.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;"> 修改文字颜色。
- 点击 <img src="/icons/HeartCircle16Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;"> 修改背景颜色。

### 全局编辑

- 双击标签名可重命名。
- 通过 `#` 新建时不支持直接带 `-` 的名称，可在管理面板修改。
- 点击 <img src="/icons/TagDismiss16Regular.svg" width="20" style="display: inline-block; vertical-align: middle; margin:0;"> 删除标签及其全部关联（不可恢复）。

## 标签搜索与筛选

- 在 `数据页` 点击可视标签可筛选左侧 `Activity` 列表。
- 多标签筛选采用 **AND 逻辑**。
- 再次点击已选标签可取消该筛选。
- 搜索区域输入 `#` 可快速选择标签进行筛选。
- 可使用一键清除筛选恢复全部数据。
- 详见 [数据查看](/guide/reference/search)。

## 限制与说明

- 标签操作会计入全局标签统计。
