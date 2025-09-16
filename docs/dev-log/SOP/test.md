# 🧪 前端测试入门 SOP (pnpm 版)

## 第一步：安装测试环境

### 1. 安装 Vitest（推荐，Vue 生态首选）

```bash
# 安装测试框架
pnpm add -D vitest

# 安装 Vue 测试工具（如果测试 Vue 组件）
pnpm add -D @vue/test-utils

# 安装 jsdom（模拟浏览器环境）
pnpm add -D jsdom

# 安装类型定义
pnpm add -D @types/node
```

### 2. 配置文件：`vite.config.ts`

```typescript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true, // 全局使用 describe, it, expect
    environment: "jsdom", // 模拟浏览器环境
    setupFiles: ["./src/test/setup.ts"], // 测试前的设置文件（可选）
  },
});
```

### 3. package.json 添加脚本

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest --coverage"
  }
}
```

## 第二步：创建第一个测试

### 1. 文件结构（两种选择）

```
选择A：测试文件放在被测试文件旁边
src/
  services/
    aiService.ts
    aiService.test.ts  👈 测试文件

选择B：专门的测试目录
src/
  services/
    aiService.ts
  __tests__/
    services/
      aiService.test.ts  👈 测试文件
```

### 2. 最简单的测试：`src/services/math.test.ts`

```typescript
// 测试一个简单的函数
import { describe, it, expect } from "vitest";

// 被测试的函数
function add(a: number, b: number) {
  return a + b;
}

// 测试套件
describe("数学函数测试", () => {
  // 单个测试用例
  it("应该能正确相加两个数字", () => {
    // Arrange（准备）
    const a = 2;
    const b = 3;

    // Act（执行）
    const result = add(a, b);

    // Assert（断言）
    expect(result).toBe(5);
  });

  it("应该能处理负数", () => {
    expect(add(-1, 1)).toBe(0);
    expect(add(-5, -3)).toBe(-8);
  });
});
```

## 第三步：运行测试

### 1. 运行所有测试

```bash
pnpm test
# 或
pnpm run test
```

### 2. 只运行一个测试文件

```bash
# 方法1：指定文件名
pnpm test math.test.ts

# 方法2：使用文件路径
pnpm test src/services/math.test.ts

# 方法3：使用模式匹配
pnpm test -- --run math
```

### 3. 只运行一个测试用例

```typescript
// 在测试代码中使用 it.only
describe("数学函数测试", () => {
  it.only("只运行这个测试", () => {
    // 👈 only
    expect(add(2, 3)).toBe(5);
  });

  it("这个测试会被跳过", () => {
    expect(add(1, 1)).toBe(2);
  });
});
```

### 4. 跳过某个测试

```typescript
describe("数学函数测试", () => {
  it("正常运行", () => {
    expect(add(2, 3)).toBe(5);
  });

  it.skip("暂时跳过这个测试", () => {
    // 👈 skip
    expect(add(1, 1)).toBe(2);
  });
});
```

## 第四步：常用测试模式

### 1. AAA 模式（推荐）

```typescript
it("测试描述", () => {
  // Arrange - 准备测试数据
  const input = { name: "John", age: 25 };

  // Act - 执行被测试的操作
  const result = processUser(input);

  // Assert - 验证结果
  expect(result.isValid).toBe(true);
  expect(result.displayName).toBe("John (25)");
});
```

### 2. 测试异步函数

```typescript
it("应该能处理异步操作", async () => {
  // Arrange
  const userId = 123;

  // Act
  const user = await fetchUser(userId);

  // Assert
  expect(user).toBeDefined();
  expect(user.id).toBe(userId);
});
```

### 3. 测试错误情况

```typescript
it("应该在输入无效时抛出错误", () => {
  // Arrange
  const invalidInput = null;

  // Act & Assert
  expect(() => {
    processData(invalidInput);
  }).toThrow("输入不能为空");
});
```

## 第五步：Mock（模拟）依赖

### 1. Mock 简单函数

```typescript
import { vi } from "vitest";

it("应该调用外部 API", async () => {
  // Arrange - 创建 mock
  const mockFetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ data: "test" }),
  });

  // 替换全局 fetch
  global.fetch = mockFetch;

  // Act
  const result = await apiCall("https://example.com");

  // Assert
  expect(mockFetch).toHaveBeenCalledWith("https://example.com");
  expect(result).toEqual({ data: "test" });
});
```

### 2. Mock 整个模块

```typescript
// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

it("应该能保存到本地存储", () => {
  // Act
  saveUserPreference("theme", "dark");

  // Assert
  expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
});
```

## 第六步：测试组织与管理

### 1. 使用 describe 分组

```typescript
describe("用户管理功能", () => {
  describe("创建用户", () => {
    it("应该能创建有效用户", () => {
      // ...
    });

    it("应该拒绝无效邮箱", () => {
      // ...
    });
  });

  describe("删除用户", () => {
    it("应该能删除存在的用户", () => {
      // ...
    });
  });
});
```

### 2. 使用 beforeEach 和 afterEach

```typescript
describe("数据库测试", () => {
  let database: Database;

  beforeEach(() => {
    // 每个测试前都会运行
    database = new Database();
    database.connect();
  });

  afterEach(() => {
    // 每个测试后都会运行
    database.disconnect();
  });

  it("应该能插入数据", () => {
    const result = database.insert({ name: "test" });
    expect(result).toBeTruthy();
  });
});
```

## 第七步：调试测试

### 1. 查看测试覆盖率

```bash
pnpm run test:coverage
```

### 2. 使用 UI 界面

```bash
pnpm run test:ui
# 会打开浏览器界面，可以可视化地运行和调试测试
```

### 3. 调试单个测试

```typescript
it("调试这个测试", () => {
  const result = complexFunction();
  console.log("调试信息:", result); // 👈 可以用 console.log
  expect(result).toBe(expectedValue);
});
```

## 🎯 实战练习清单

### ✅ 第一天：基础设置

- [ ] 安装 vitest 和相关依赖
- [ ] 配置 vite.config.ts
- [ ] 写一个最简单的数学函数测试
- [ ] 成功运行 `pnpm test`

### ✅ 第二天：常用模式

- [ ] 练习 AAA 模式
- [ ] 测试异步函数
- [ ] 测试错误抛出
- [ ] 学会用 `it.only` 运行单个测试

### ✅ 第三天：Mock 练习

- [ ] Mock 一个简单函数
- [ ] Mock localStorage
- [ ] Mock 一个 API 调用

### ✅ 第四天：实际应用

- [ ] 为你的 aiService 写测试
- [ ] 为一个 Vue 组件写测试

## 🚀 快速开始命令合集 (pnpm 版)

```bash
# 一键安装测试环境
pnpm add -D vitest @vue/test-utils jsdom @types/node

# 运行所有测试
pnpm test

# 运行单个文件
pnpm test math.test

# 只运行匹配的测试
pnpm test -- --run "用户创建"

# 监听文件变化自动测试
pnpm test -- --watch

# 显示覆盖率
pnpm test -- --coverage

# 开启UI界面
pnpm test -- --ui

# pnpm 特有：运行时显示详细输出
pnpm test --reporter=verbose

# 并行运行测试（pnpm 默认支持）
pnpm test -- --threads
```

## 💡 pnpm 特有的优势

1. **更快的依赖安装**：硬链接节省空间和时间
2. **更严格的依赖管理**：避免幽灵依赖
3. **更好的 monorepo 支持**：如果你有多包项目
4. **workspace 功能**：可以在根目录统一管理测试

### pnpm workspace 配置示例（如果是 monorepo）

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

```bash
# 在 monorepo 中运行所有包的测试
pnpm -r test

# 只运行特定包的测试
pnpm --filter my-package test
```

## 🎯 师傅的建议（pnpm 版）

1. **充分利用 pnpm 的速度优势**：测试跑得更快，开发体验更好
2. **注意 peer dependencies**：pnpm 对依赖管理更严格，可能会提示缺少的 peer 依赖
3. **使用 .npmrc 配置**：可以在项目根目录配置 pnpm 的行为
4. **利用缓存**：pnpm 的缓存机制让重复安装依赖非常快

### 推荐的 .npmrc 配置

```
# .npmrc
shamefully-hoist=true  # 如果遇到依赖问题可以开启
prefer-frozen-lockfile=true
```
