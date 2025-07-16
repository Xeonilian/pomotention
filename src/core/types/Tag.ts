// core/types/Tag.ts

/**
 * 标签基本数据结构
 */
export interface Tag {
  id: number;
  name: string;
  color: string; // 文字颜色
  backgroundColor: string; // 背景颜色
  createdAt: number;
  updatedAt: number;
}

/**
 * 带使用统计的标签（用于显示标签使用频率）
 */
export interface TagWithCount extends Tag {
  count: number; // 该标签被使用的次数
}

/**
 * 单个标签解析结果
 * 用于实时解析单个标签（如用户输入 "#工作 " 后的解析结果）
 */
export interface TagParseResult {
  tagName: string; // 标签名称（不包含 #）
  isNew: boolean; // 是否为新标签（未保存到数据库）
  tag?: Tag; // 如果是已存在标签，返回完整标签信息
  position: {
    start: number; // 标签在文本中的起始位置
    end: number; // 标签在文本中的结束位置
  };
}

/**
 * 标签在编辑器中的渲染信息
 * 用于在输入框中显示带样式的标签
 */
export interface TagRenderInfo {
  name: string; // 标签名称
  color: string; // 文字颜色
  backgroundColor: string; // 背景颜色
  isNew: boolean; // 是否为新标签
  tagId?: number; // 标签ID（新标签没有）
  clickable: boolean; // 是否可点击
}

/**
 * 标签解析配置
 */
export interface TagParseConfig {
  mode: "edit" | "display"; // 编辑模式或展示模式
  defaultColor?: string; // 新标签默认文字颜色
  defaultBackgroundColor?: string; // 新标签默认背景颜色
}

/**
 * 创建标签时的输入参数
 */
export interface TagCreateInput {
  name: string;
  color?: string;
  backgroundColor?: string;
}

/**
 * 更新标签时的输入参数
 */
export interface TagUpdateInput {
  name?: string;
  color?: string;
  backgroundColor?: string;
}

/**
 * 标签下拉弹窗的位置信息
 * 用于控制弹窗在用户输入 # 时的显示位置
 */
export interface TagDropdownPosition {
  x: number; // 弹窗的 x 坐标
  y: number; // 弹窗的 y 坐标
  show: boolean; // 是否显示弹窗
  inputElement?: HTMLElement; // 触发弹窗的输入框元素
}

/**
 * 预定义的颜色选项（用于颜色选择器）
 */
export interface TagColorOption {
  color: string;
  backgroundColor: string;
  label: string;
}
