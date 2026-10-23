# 连续三维人物

`web/assets/maolongrui-model.glb` 为可独立导入标准三维软件的 GLB 文件，包含真实顶点、三角网格、法线和嵌入式纹理。网页使用 Three.js 与 OrbitControls 连续环绕、上下俯仰、滚轮/双指缩放，支持自动环绕与重置。

模型通过图像轮廓约束和圆滑截面放样估算人体表面，正面使用已有高分辨率人物图作为纹理，以保留其面部视觉特征。侧面、背面和深度来自先前生成的多角度形象，因此是估算模型，不是本人扫描，仍存在细节不足、局部纹理拉伸和角度接缝。不能保证所有角度的人脸与真人完全一致。

参考仓库 `https://github.com/realingy/ImageBasedModellingEdu` 在本次检查时只包含 SfM 目录；其 CMake 配置引用但未提供 core、util、features、examples，README 介绍的 mvs、surface、texturing 也未提供。未复制其代码，也未声称使用该仓库完成完整摄影测量重建。

## 文件

- `scripts/reconstruct-model.py`：根据项目内人物图生成模型。需要 Python、numpy、scipy、scikit-image、Pillow。
- `model-report.json`：导出统计。
- `src/model-viewer.js`：真实三维查看器源码。
- `web/model-viewer.js`：已打包的查看器，可直接部署。
- `scripts/bundle-viewer.mjs`：运行 `npm run build:viewer` 可重新打包查看器。
- `scripts/model-qa.html`、`scripts/model-dev.mjs`：本地 WebGL 检查，运行 `node scripts/model-dev.mjs` 后访问 `/__modelqa?view=45`。

Cloudflare Static Assets 直接提供 GLB 和查看器文件，API 路由仍由 Worker 处理，避免把较大的三维模型作为 base64 加入 Worker 脚本。

检查包括 GLB 官方格式校验、几何/深度检查，以及浏览器中的连续 3 度角度变化、垂直环绕、缩放与 0/45/90/180 度视图。
