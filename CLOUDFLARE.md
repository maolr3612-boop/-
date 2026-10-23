# Cloudflare 连接 GitHub

目标账户：`199097a542173853dab199100f89cd8c`。
GitHub 仓库：`maolr3612-boop/-`，生产分支：`main`。

## 连接

1. 打开目标 Cloudflare 账户，进入 Workers & Pages，选择创建应用并导入 GitHub 仓库。
2. 在 GitHub 授权 Cloudflare，仅选择 `maolr3612-boop/-` 即可。
3. 选择仓库，使用 Worker 名称 `worker`（与已提供的控制台项目一致），根目录为仓库根目录。
4. 构建命令：`node scripts/build.mjs`。部署命令：`npx wrangler deploy`。
5. 在 R2 创建 `maolongrui-portfolio-works` 存储桶，或将 `wrangler.jsonc` 的 bucket_name 改为已有桶的真实名称。绑定名必须是 `BUCKET`。
6. 完成后，main 分支推送将触发自动构建部署。

仓库中已提供 wrangler.jsonc。账户授权、仓库实际连接及 R2 创建仍需在已登录的 Cloudflare 账户内完成；提交配置文件本身不会完成这些操作。

## 作品库身份与数据

现有线上网站使用 Sites 提供的身份认证。独立部署到 Cloudflare 后，不能信任客户端自行传入的 `oai-authenticated-user-email` 请求头，也不能关闭校验来开放编辑接口。

当前配置通过 AUTH_PROVIDER=cloudflare 将独立站点的作品编辑接口关闭，避免将浏览器自行传入的请求头当作登录身份。浏览作品不受影响。启用编辑前必须实现服务端验证的身份认证（例如验证 Cloudflare Access 的 JWT、受众和签发者），并将作品写入权限限制为所有者。不要移除此保护变量来开放编辑。当前配置只准备托管与 GitHub 构建入口，未替你创建 Access 策略或登录系统。

原有 Sites 网站和云端作品数据不会随 GitHub 连接自动迁移。需要独立迁移已有记录与封面；源码中的「劳务公司」可由导入清单初始化。

参考：https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/

## 当前账户部署状态
账户尚未开通 R2（Cloudflare API 10042）。当前 wrangler.jsonc 不绑定存储，Cloudflare 网站以只读形式展示源码内的作品，并保留完整劳务公司演示页。开通 R2 并创建桶后，可参考 wrangler.r2.example.jsonc 恢复绑定；编辑功能仍需先完成身份验证。

