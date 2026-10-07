# ZGATRI · 逐光AI

可直接部署到 Cloudflare Pages 的纯静态个人品牌主站。HTML + CSS + 极少量 JavaScript，无第三方字体、图片、框架、运行时依赖或后端。关闭 JavaScript 后内容与导航仍正常可用。

## 本地预览

安装 Node.js 18 或更新版本，在本目录执行：

```sh
npm run dev
```

打开 http://127.0.0.1:4173 。无需 npm install。按 Ctrl+C 停止；如端口占用，先关闭之前的预览进程。

也可使用 Python：`python3 -m http.server 4173 --directory dist`。

检查：`npm run check`。静态文件已完整放在 dist，不需要构建。

## Cloudflare Pages 部署

### 方式一：Git 自动部署（推荐）

1. 将此目录的内容推送到你的 GitHub 或 GitLab 仓库。
2. 在 Cloudflare 的 Workers & Pages 中创建 Pages 项目，连接仓库。
3. 框架选择 None；构建命令填 `exit 0`；输出目录填 `dist`。如果将整个上级目录入库，根目录必须改为本项目所在目录。
4. 部署成功后先检查分配的 pages.dev 地址。
5. 在该 Pages 项目的 Custom domains 中添加 `www.zgatri.com`，按向导完成 DNS 配置并等待证书生效。不要仅自行添加 DNS 而跳过项目绑定。
6. 若需要让 zgatri.com 跳转到 www.zgatri.com，可另外在域名的 Redirect Rules 中配置永久跳转并保留路径和查询参数。本项目不会改动 blog/shop 的 DNS。

### 方式二：直接上传

在 Pages 创建 Direct Upload 项目，上传 `dist` 文件夹或将 dist 内所有文件打成 ZIP 上传。压缩包根目录须直接包含 index.html，不要上传整个源码项目。Direct Upload 项目后续切换 Git 集成通常需新建项目，长期维护优先选方式一。

也可使用官方 CLI：`npx wrangler pages deploy dist --project-name=你的Pages项目名`。首次使用按提示登录。此命令由你实际发布时运行。

官方参考：
- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/configuration/custom-domains/

## 内容与文件

- `dist/index.html`：所有品牌文案、板块、博客和商店入口。
- `dist/styles.css`：颜色、光线几何、桌面/移动布局、键盘焦点和减少动画偏好。
- `dist/main.js`：仅更新页脚年份。
- `dist/404.html`：独立错误页面，避免不存在的路径返回首页。
- `dist/robots.txt` / `sitemap.xml`：搜索引擎爬取与站点地图。
- `dist/_headers`：Cloudflare 响应安全头；普通本地预览不模拟此文件。
- `scripts/`：零依赖的本地预览和静态文件检查工具。

## 上线前内容确认

- Contact 区域提供 Telegram 联系入口：https://t.me/zgatri。
- Projects 当前呈现主站、持续更新的逐光笔记，以及正在营业的逐光小店。
- 博客入口链接到 blog.zgatri.com；逐光小店统一链接到 https://zgatri.trade。
- canonical、Open Graph 和 sitemap 已使用正式域名 https://www.zgatri.com/；更换域名时同步修改。
- 主站由 GitHub `main` 分支触发 Cloudflare Pages 更新；修改站点内容不需要改动 DNS。

## 设计与性能

深空蓝、科技蓝、青色光线；以排版、轨道和抽象光束表达“逐光”。系统字体、本地样式，无外部请求、追踪脚本或 Cookie。网页内容可直接被搜索引擎读取；包含标题、描述、canonical、Open Graph、语义化分区及站点地图。手机采用单列布局。没有真实表单或假提交功能。
