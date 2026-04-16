# MediaTracer

**MediaTracer** 是一款基于 Electron + Playwright 的现代化桌面端媒体数据采集与任务调度平台。通过可视化的操作界面，帮助用户轻松实现主流媒体平台（如抖音、小红书等）的数据抓取、账号管理与自动化调度。

![MediaTracer](./src/assets/logo.png)

## 🚀 核心特性

- **多模式采集**：支持按**关键词搜索**、**作品/笔记详情**、**创作者主页**三种维度进行数据深度挖掘。
- **定时调度**：内置强大的任务调度引擎，支持一次性执行与循环自动任务（排程），解放双手。
- **多账号复用**：统一的账号与 Cookie 管理，支持本地维护多平台登录态，极大降低重复扫码登录的成本。
- **数据中心**：结构化展示爬取的评论、作品、作者等数据，支持按条件组合筛选、批量删除及**一键导出 Excel** 功能。
- **无感运行**：基于 Playwright 驱动，在系统设置中可配置无头模式（Headless），后台静默抓取数据。
- **数据安全**：使用本地 SQLite 数据库存储所有核心数据与配置，数据完全掌握在自己手中。

## 📸 系统截图

<p align="center">
  <img src="./static/01.png" width="48%" />
  <img src="./static/02.png" width="48%" />
</p>
<p align="center">
  <img src="./static/03.png" width="48%" />
  <img src="./static/04.png" width="48%" />
</p>
<p align="center">
  <img src="./static/05.png" width="48%" />
  <img src="./static/06.png" width="48%" />
</p>

## 🛠️ 技术栈

本项目采用了最新的前端及桌面端技术栈进行构建：
- **核心框架**：[Electron](https://www.electronjs.org/) + [Vue 3](https://vuejs.org/) (Composition API) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**：[Vite](https://vitejs.dev/) + [electron-builder](https://www.electron.build/)
- **自动化抓取**：[Playwright](https://playwright.dev/)
- **UI 组件库**：[Element Plus](https://element-plus.org/) + [Tailwind CSS](https://tailwindcss.com/) / [Lucide Icons](https://lucide.dev/)
- **本地存储**：[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

## 📦 项目结构

```text
electron-app/
├── electron/                 # Electron 主进程代码
│   ├── main/                 # 核心逻辑 (IPC 通信、数据库操作、爬虫控制器等)
│   │   ├── platforms/        # 各平台爬虫实现 (如 dy 等)
│   │   ├── runtime/          # 运行时配置、日志、数据管理
│   │   └── storage/          # SQLite、CSV 等数据存储方案
│   └── preload/              # 预加载脚本 (安全暴露 Node.js API 给渲染进程)
├── src/                      # Vue 3 渲染进程代码
│   ├── assets/               # 静态资源与图标
│   ├── components/           # 全局公共组件
│   ├── router/               # Vue Router 路由配置
│   ├── store/                # Pinia 状态管理
│   └── views/                # 页面视图 (首页、任务、数据中心、账号、设置)
├── package.json              # 项目依赖及构建脚本
└── vite.config.ts            # Vite 与 Electron 插件配置
```

## ⚙️ 快速开始

### 1. 环境准备
请确保你的电脑上已经安装了 Node.js（推荐 v18+ 或 v20+）。由于使用了本地编译的 SQLite 库，如果是 Windows 环境，可能需要安装 [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools)。

### 2. 安装依赖
在 `electron-app` 目录下运行：
```bash
npm install
```

### 3. 开发环境运行
启动本地开发服务器并打开 Electron 应用：
```bash
npm run dev
```

### 4. 生产环境打包
构建并打包为 Windows 平台的安装包（`.exe`）：
```bash
npm run build
```
打包成功后的安装文件将生成在 `dist_app/` 目录下。

## 📖 使用流程指南

1. **配置环境**：首次使用，请进入“系统设置”页面，确认数据库路径、日志目录，并根据需要配置抓取浏览器模式（是否无头模式）。
2. **账号登录**：进入“账号管理”页面，添加需要采集的平台账号，扫码或录入 Cookie 确保账号状态为“有效”。
3. **创建任务**：进入“任务管理 -> 新建采集任务”，选择目标平台，输入关键词/链接，并设定调度策略后启动任务。
4. **监控与导出**：任务运行期间可实时查看运行日志。任务完成后，进入“数据中心”，查看抓取成果并导出所需的数据表格。

## 📄 License
MIT

## ⚠️ 免责声明

> **核心宗旨：本项目开源内容仅供学习与技术交流，请勿用于任何商业用途！**

本仓库提供的所有代码及相关文档均仅供学术探讨和技术研究参考。任何人或组织在未经授权的情况下，严禁将本项目用于商业牟利、非法数据抓取或任何侵犯第三方平台及个人合法权益的行为。因违规使用本仓库代码而产生的任何法律纠纷，本仓库及其开发者概不负责。使用或 Fork 本项目即视为您已阅读并完全同意以下条款。

### 详细免责条款

#### 1. 项目初衷
本项目（简称“MediaTracer”）定位为一款开源的技术学习工具，旨在帮助开发者了解和学习现代桌面端开发（Electron）及自动化测试/爬虫技术（Playwright）。本项目不针对任何特定平台进行恶意攻击，所有代码实现仅作为技术演示。

#### 2. 合规使用承诺
用户在获取、安装和运行本项目时，必须严格遵守所在国家或地区的相关法律法规（包括但不限于《网络安全法》、《数据安全法》等）。用户应独立承担因滥用、非法修改或不当部署本项目代码所带来的全部法律后果。

#### 3. 禁止滥用
本项目禁止被应用于任何灰黑产、商业倒卖、恶意并发攻击或批量窃取用户隐私数据的场景。用户需承诺其使用目的纯粹出于个人技术提升。若发现任何违规行为，开发者有权要求其立即停止使用并删除相关代码。

#### 4. 责任豁免
开发者已在力所能及的范围内确保代码的开源规范与安全性。但不对代码的绝对稳定性、适用性或无错误性提供任何形式的担保。对于因运行本代码导致的设备故障、数据损毁、业务中断或任何直接/间接损失，开发者不承担赔偿责任。

#### 5. 知识产权归属
本项目的核心代码架构及开源实现归开发者所有，受开源协议（MIT License）及相关著作权法保护。在遵循开源协议及本免责声明的前提下，开发者鼓励社区的良性交流与二次开发。

#### 6. 条款变更与解释
本项目开发者保留在法律允许范围内，随时对本免责声明进行修订和解释的权利。条款的更新将在本页面直接生效，不再另行通知。
