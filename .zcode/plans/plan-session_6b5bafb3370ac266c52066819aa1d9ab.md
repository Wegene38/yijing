# 易经解读 Web App 开发计划

## 目标形态
零依赖纯静态 Web App（HTML + CSS + 原生 JS，传统 script 标签加载）——**双击 index.html 即可用**，无需 npm/构建，天然适配 GitHub Pages 部署。手机、电脑浏览器均可使用。

## 与 GitHub 的结合
1. **数据校验**：内置经文数据生成后，从 GitHub 开源数据集（`jinkerry/yi_64gua` 的 gua.json、`orikami048/bazi-liuyao-database` MIT 数据）拉取做交叉校验
2. **项目托管**：`git init` 规范提交，若 `gh` 已登录则创建 GitHub 仓库并推送，附 GitHub Pages 一键部署说明
3. **开源规范**：README、LICENSE（MIT）、.gitignore

## 功能（四项全做）
1. **起卦占卜**：输入所问之事 → 三枚铜钱六次摇卦（动画）→ 得本卦、识别动爻、推变卦
2. **六十四卦浏览**：64卦网格 + 搜索，每卦展示卦象、卦辞、爻辞、彖传、象传（大象+小象）、白话解读
3. **占卜历史**：localStorage 保存问题、时间、卦象、解读，可回看/删除
4. **六爻纳甲进阶**：完整装卦——八宫归属、世应爻、纳甲干支、六亲（按宫五行与爻支生克）、六神（按日干）、旬空（按日柱）；解读时以「用神」为核心给出六爻断语

## 目录结构
```
易经/
├── index.html
├── css/style.css          # 中国风水墨/宣纸主题，响应式
├── js/
│   ├── data/
│   │   ├── hexagrams-1.js   # 64卦数据（拆4个文件，每16卦）
│   │   ├── hexagrams-2.js
│   │   ├── hexagrams-3.js
│   │   ├── hexagrams-4.js
│   │   └── najia.js         # 八宫、纳甲表、六神起法、五行生克
│   ├── core/
│   │   ├── divination.js    # 摇卦、动爻、变卦推演
│   │   ├── najia-engine.js  # 装卦引擎（纳甲/六亲/六神/世应/旬空）
│   │   └── interpret.js     # 解读组装（经文层+白话层+六爻层）
│   └── app.js               # UI 逻辑、路由（hash）、历史记录
├── scripts/validate.js    # Node 校验脚本（数据完整性+逻辑正确性）
├── README.md / LICENSE / .gitignore
```

## 数据 Schema（每卦）
`name`(卦名)、`full_name`(如"乾为天")、`binary`(自下而上6位)、`palace`(宫)、`judgement`(卦辞)、`judgement_cn`(白话)、`tuan`(彖传)、`image`(大象传)、`lines[6]`(爻辞+小象传+白话+爻题)、`advice`(整体白话建议)。经文为公版古籍，白话解读由我撰写；用 GitHub 开源数据交叉校验 384 条爻辞与卦象二进制。

## 校验（scripts/validate.js，node 运行）
- 64 卦齐全、binary 唯一且与 GitHub 数据一致
- 384 条爻辞无缺失、动爻变卦推演正确（抽查全卦）
- 装卦引擎用《增删卜易》已知卦例核对纳甲/世应/六亲

## 实施顺序
1. 目录 + 数据文件（4 个卦数据 + 纳甲表）→ 2. 校验脚本跑通 → 3. 装卦引擎 → 4. UI（起卦页/卦详情页/浏览页/历史页）→ 5. 纳甲进阶面板 → 6. git 提交 + gh 推送（如可用）+ README 部署说明