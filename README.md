# Car Service Tool

> 面向 Klook 租车业务前端开发 & QA 的一体化 Chrome 扩展，集合调试开关、Cookie/请求头工厂、AB 实验切换、Network+ DevTools 面板等高频小工具，减少手动改 Cookie / LocalStorage / URL 参数的重复劳动。

- **Manifest Version**: 3
- **当前版本**: 1.0
- **生效域名**: `*.klook.com` · `*.klook.io` · `*.klooktest.com` · `localhost`

## 功能总览

扩展主界面分为左右两栏，分别承载「环境/调试开关」和「数据制造/请求改写」两类能力，DevTools 中额外提供 Network+ 面板用于抓包审计。

### Popup · 左栏

| 模块 | 说明 |
| --- | --- |
| **CLIENT SOURCE** | 一键切换客源国，写入 `localStorage.carRentalCountry` 并刷新当前 Tab；内置 CN/HK/TW/US/KR/TH/MY/JP/SG/AU/PH/NZ 等常用站点，可自定义国家代码。 |
| **DEBUG FLAGS** | 7 个常用调试开关：<br>· `InHouseTracking` → `localStorage.__inhouse:debug`<br>· `Galileo Log` → `localStorage.__galileo_debug`<br>· `TextId Overlay` → URL 参数 `cmstextid=1`<br>· `Guest Checkout` → URL 参数 `util=guest_checkout`<br>· `Log Debug` → Cookie `log-debug=test_car_rental`（后端 30 分钟有效）<br>· `Report Log` → `localStorage.__clientReport:debug`<br>· `SSR Service` → `klooktest` 域名 URL 参数 `type=new`，用于切换 klook-new-web / ssr-carrental 服务 |
| **TOOLS** | 快捷入口：<br>· [JS2JSON](https://llo85un5qepz.meoo.info/) 转换工具<br>· 测量模式：Figma 式页面标注，悬停看元素尺寸，点击锁定元素后悬停其他元素显示间距，同时右上角浮出 CSS Peeper 风格样式面板（字体/颜色/盒模型，点击行复制值），`↑`/`↓` 切换 DOM 层级，`Esc` 退出（再次点击按钮也可关闭）<br>· 视觉对比：把 Figma 设计稿截图叠在页面上走查还原度——Figma 里 Copy as PNG 后在页面 `Cmd/Ctrl+V` 粘贴（或拖入/导入文件），拖拽+方向键对齐（Shift 步进 10px），支持叠加透明度/差异高亮（像素一致处为黑）/左右分屏三种模式，2x 导出自动缩半，「穿透」可让鼠标穿过图片操作页面，`Esc` 退出。 |

### Popup · 右栏

| 模块 | 说明 |
| --- | --- |
| **AB EXPERIMENT** | 写入 Cookie `kepler_id` 触发 Kepler AB SDK 强制分流；支持手动填入或从配置中心 (`config.json`) 拉取的实验下拉列表（Insurance / Detail Page Revamp / TPL / SCOP / PAT_SCOP / CR_SRP 等）。 |
| **HKID GENERATOR** | 按香港身份证规则生成符合校验位的随机 ID，并自动复制到剪贴板，常用于注册/下单 KYC 字段填值。 |
| **REQUEST HEADERS** | 基于 `chrome.declarativeNetRequest` 动态规则注入任意请求头（默认 `x-klook-mesh-lane`），支持从配置中心同步通道列表（默认 / 预发 / 测试 A·B / 灰度 / 压测）。规则覆盖 main_frame / sub_frame / xhr / other，作用域限 Klook 站点和 localhost。 |
| **_PT TOKEN** | 读取 / 写入 / 清除 httpOnly Cookie `_pt`，用于复制登录态、跨环境切换账号；读取时自动写剪贴板，并缓存到 `chrome.storage.sync.savedPtValue` 便于二次粘贴。 |

### DevTools · Network+ 面板

扩展注册了独立的 DevTools 页（[devtools/](devtools/)），通过 [injected/page-hook.js](injected/page-hook.js) 在 `MAIN` world 提前于 `document_start` 注入，对 `XHR / fetch / document` 等请求做全量录制：

- 工具栏：录制开关、Clear、URL 过滤（支持 `method:` `status:` `-keyword` 语法）、按类型筛选、HAR / JSON 导出。
- 列表 + 详情双栏布局，记录持久化在 IndexedDB（[lib/store.js](lib/store.js)）。
- 抓包数据先由 page-hook 通过 `window.postMessage` 中转 → [content.js](content.js) 转发到 background → DevTools 面板订阅展示。

## 目录结构

```
car-service-tool/
├── manifest.json          # MV3 清单（permissions / host_permissions / 内容脚本配置）
├── popup.html / popup.js  # 主面板 UI 与全部交互逻辑
├── car-tool.css           # popup 样式
├── content.js             # 内容脚本：同步页面态到 chrome.storage + 中转 Network+ 抓包
├── background.js          # Service Worker（webRequest 头注入旧实现，保留兼容）
├── injected/
│   └── page-hook.js       # MAIN world 注入：劫持 XHR/fetch 抓包
├── devtools/              # Network+ DevTools 面板（panel.html/js/css）
├── lib/                   # 抓包数据层（curl.js / filter.js / har.js / store.js）
├── images/                # 扩展图标 + 国家旗帜（country/）
├── config.json            # 内置兜底配置（实验 + meshLane 通道）
├── options.html / .js     # 预留选项页（manifest 中已注释）
└── README.md
```

## 安装与开发

1. `git clone` 本仓库到本地。
2. 打开 Chrome → `chrome://extensions/` → 右上角开启「开发者模式」。
3. 点击「加载已解压的扩展程序」→ 选择本目录。
4. 在 Klook 站点（含 klooktest / localhost）页面，点击工具栏的车标图标即可使用。
5. 若需 Network+：F12 打开 DevTools，切换到 `Network+` 标签页。

> 修改 `popup.js` / `content.js` 后，回到扩展管理页点击「重新加载」按钮即可生效；修改 `manifest.json` 通常需要重新加载扩展并刷新页面。

## 远程配置

实验列表与 mesh lane 通道默认从 `http://www.xiaoqi.fan/config.json` 拉取（见 [popup.js](popup.js) `loadConfig()`），结构与 [config.json](config.json) 一致：

```json
{
  "experiments": [
    { "group": "Insurance", "variants": [{ "label": "...", "value": "CR_insurance_migration-Control" }] }
  ],
  "meshLane": [
    { "name": "默认通道", "value": "f1000" }
  ]
}
```

更新远程 JSON 即可在所有用户侧热更新选项，不需要发版。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `storage` | 存储调试开关状态、`_pt` 缓存、自定义请求头配置 |
| `cookies` | 读写 `_pt` 等 httpOnly Cookie |
| `tabs` + `activeTab` + `scripting` | 在当前 Tab 注入并执行调试脚本（切站点、切环境、刷新页面） |
| `declarativeNetRequest` + `WithHostAccess` | 动态注入请求头（mesh lane 等） |
| `host_permissions` | 限定能力作用域为 Klook 域名 + localhost + 远程配置 host |

## 常见使用场景

- **复现线上 Bug**：切到目标客源国 → 设置 mesh lane → 粘贴线上 `_pt` 登录态，几步完成现场还原。
- **测试 AB 实验**：在下拉中选择对照/实验组 → 点击 `SET ID` → 自动刷新。
- **看埋点**：开 `InHouseTracking` 与 `Galileo Log` 即可在 Console 看到完整埋点。
- **链路审计**：DevTools → Network+ 录制 → 导出 HAR/JSON 给 QA 或后端复盘。
- **下单流程联调**：HKID 一键生成 + Guest Checkout 模式 + Log Debug 后端日志三件套。

## TODO / 已知限制

- `background.js` 中 `webRequest.onBeforeSendHeaders` 已被 `declarativeNetRequest` 方案取代，仅保留作历史参考。
- `options.html` 暂未启用，`manifest.json` 中该字段已注释。
- 当前域名白名单针对 Klook 体系，迁移到其它站点需修改 `manifest.json` 的 `host_permissions` 和 `popup.js` 中的正则。
