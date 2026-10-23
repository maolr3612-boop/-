# 毛龙锐个人网站

黑金风格个人履历网站，包含八个双语知识模块、可连续环绕、俯仰与缩放的三维人物模型、云端可编辑作品库，以及「劳务公司」完整网站演示。

当前入口：https://mao-longrui-website.cocoafairy13.chatgpt.site/

入口内嵌 Cloudflare 生产网站 https://worker.maolr3612.workers.dev/ 。生产环境目前使用内置作品清单，未绑定 R2，作品编辑入口关闭；添加作品通过修改 `worker/imports.json` 并重新部署完成。下文的云端编辑说明适用于原有 Sites 身份与 R2 托管环境。

## 公开作品演示

- FitLead AI：https://fitlead-portfolio.maolr3612.workers.dev/ 。独立静态导出的前端，支持首页、评估步骤、咨询与隐私页面。评估提交、AI 方案及账户服务未接入后台，页面显示演示提示。
- 筑境：https://zhujing-portfolio.maolr3612.workers.dev/ 。独立静态站点，提供品牌页与本地设计工作台；账号、云端保存与 AI 服务未接入后台。
- 劳务公司：生产网站 `/projects/laowu/index.html#/home`，登录、收藏和报名使用浏览器本地存储。

三张作品封面统一保存在 `web/assets/covers/`。独立演示部署文件位于同级工作区的 `portfolio-projects/fitlead` 与 `portfolio-projects/zhujing`，没有修改原本地项目或复制后端配置和密钥。两个演示使用独立 Cloudflare Worker；主站重新部署不会覆盖演示站点。

## 运行

需要 Node.js 22 或更新版本，无第三方运行依赖。

```sh
node scripts/build.mjs
node --test scripts/library.test.mjs scripts/import.test.mjs
node scripts/dev.mjs
```

本地访问 http://127.0.0.1:4173/ 。开发服务器模拟所有者身份，作品保存在内存中，重启后清除。请勿将开发服务器作为生产服务器使用。

## 文件结构

- `web/`：网站页面、样式、脚本和人物素材。
- `web/projects/laowu/`：「劳务公司」网站及封面。
- `worker/index.js`：生产服务入口，包含作品读写、上传校验及权限控制。
- `worker/imports.json`：用户指定的作品导入清单。导入后保留云端编辑结果，删除后不再自动添加。
- `scripts/build.mjs`：将静态页面与素材打包进 Worker，生成 `dist/server/index.js`。
- `.openai/hosting.json`：现有 Sites 网站身份及 R2 存储绑定。

## 托管与数据

当前生产托管由 Sites 提供，使用名为 `BUCKET` 的 R2 绑定保存作品信息及封面。网站由 Sites 访问策略保护，只有已验证的所有者可修改作品。

GitHub 仓库用于保存源码。完整功能不能直接部署到静态 GitHub Pages：作品库依赖 Worker、R2 和 Sites 注入的身份请求头。如果迁移到其他平台，需要迁移存储并替换身份验证，不能直接移除权限校验。

将此仓库连接到原有 Sites 项目时，应保留 `.openai/hosting.json` 中的项目 ID，通过 Sites 工作流构建、保存版本并部署。请勿将任何令牌写入源码或提交到 GitHub。

现有云端作品记录及用户后续上传的封面不包含在源码仓库中；更换存储平台时需另行迁移。

## 作品管理

登录现有网站后进入「作品库」：点击「添加作品」新建，点击「管理作品」编辑或删除。支持 PNG、JPG、WebP 封面，最大 5 MB，以及分类、标签、介绍和项目链接。

人物现已使用真实 GLB 网格进行连续三维展示。模型由图像估算重建，侧背面细节与纹理仍有局限，详见 MODEL.md。Google Fonts 无法访问时使用系统字体。

