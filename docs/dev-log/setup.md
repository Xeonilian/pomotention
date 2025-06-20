## 环境搭建

### node.js

### pnpm

###

### github 托管

### 软件打包

### 软件 github 发布

#### tag

### 自动更新 update

### 自动发布 github action

### 帮助页面 vitepress + github pages

```
pnpm add -D vitepres
pnpm docs:dev
pnpm docs:build
pnpm docs:depoly
```

config.mts 初始页面布局

- index.md 首页内容(放在 config 里面)
- package.json

```
{
  "scripts": {
    "docs:dev": "vitepress dev",
    "docs:build": "vitepress build",
    "docs:preview": "vitepress preview",
    "deploy": "vitepress build && gh-pages -d .vitepress/dist"
  },
  "devDependencies": {
    "gh-pages": "^6.3.0",
    "vitepress": "^1.6.3"
  }
}

```

- public\logo.png 放 logo
