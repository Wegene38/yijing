#!/usr/bin/env node
/**
 * 数据校验脚本：node scripts/validate.js
 * 1. 64 卦齐全、序号正确、二进制唯一且与上下卦组合一致
 * 2. 经文完整性（卦辞/彖/象/384 爻辞+小象/白话/建议）
 * 3. 与 GitHub 开源数据 reference/yi_64gua_gua.json 交叉校验（卦象/卦辞/爻辞）
 * 4. 八宫表与卦象推演一致（本宫→一世→…→游魂→归魂）
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
global.window = {};
for (const f of ["najia.js", "hexagrams-1.js", "hexagrams-2.js", "hexagrams-3.js", "hexagrams-4.js"]) {
  // 数据文件是浏览器脚本（挂在 window 上），Node 中用 vm 方式加载
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(ROOT, "js/data", f), "utf8"));
}
const HEX = global.window.YI_HEXAGRAMS;
const NAJIA = global.window.YI_NAJIA;

let errors = [], warns = [], pass = 0;
const ok = (cond, msg) => { if (cond) pass++; else errors.push(msg); };

/* ---------- 1. 基本结构与卦象 ---------- */
ok(Array.isArray(HEX) && HEX.length === 64, `卦数应为64，实际 ${HEX.length}`);
ok(HEX.every((h, i) => h.id === i + 1), "卦序 id 必须 1..64 连续");

const binSet = new Set(HEX.map(h => h.binary));
ok(binSet.size === 64, `卦象二进制应唯一，实际去重后 ${binSet.size} 个`);
ok(HEX.every(h => /^[01]{6}$/.test(h.binary)), "卦象必须是6位0/1字符串");

// 上下卦组合一致性
const TRI = NAJIA.TRIGRAMS;
const triBin = {};
for (const [name, info] of Object.entries(TRI)) triBin[info.binary] = name;
for (const h of HEX) {
  const lower = triBin[h.binary.slice(0, 3)];
  const upper = triBin[h.binary.slice(3, 6)];
  ok(lower === h.lower && upper === h.upper, `${h.name}卦 上下卦标注(${h.lower}/${h.upper})与二进制(${lower}/${upper})不符`);
}

/* ---------- 2. 经文完整性 ---------- */
for (const h of HEX) {
  const tag = `第${h.id}卦${h.name}`;
  ok(typeof h.name === "string" && h.name.length > 0, `${tag} 缺卦名`);
  ok(typeof h.fullName === "string" && h.fullName.includes(h.name), `${tag} 全称异常: ${h.fullName}`);
  ok(typeof h.judgement === "string" && h.judgement.length >= 3, `${tag} 缺卦辞`);
  ok(typeof h.judgementCn === "string" && h.judgementCn.length >= 8, `${tag} 缺卦辞白话`);
  ok(typeof h.tuan === "string" && h.tuan.startsWith("彖曰"), `${tag} 缺彖传`);
  ok(typeof h.image === "string" && h.image.startsWith("象曰"), `${tag} 缺大象传`);
  ok(Array.isArray(h.lines) && h.lines.length === 6, `${tag} 爻数应为6，实际 ${h.lines && h.lines.length}`);
  if (Array.isArray(h.lines)) {
    h.lines.forEach((l, i) => {
      ok(typeof l.text === "string" && l.text.length >= 2, `${tag} 第${i + 1}爻缺爻辞`);
      ok(typeof l.xiang === "string" && l.xiang.startsWith("象曰"), `${tag} 第${i + 1}爻缺小象传`);
      ok(typeof l.cn === "string" && l.cn.length >= 6, `${tag} 第${i + 1}爻缺白话`);
    });
  }
  ok(typeof h.advice === "string" && h.advice.length >= 15, `${tag} 缺建议`);
  ok(!/[\u4e00-\u9fa5][a-zA-Z]+[a-zA-Z ]/.test(h.advice + h.judgementCn), `${tag} 中文解读中混入英文单词`);
}

/* ---------- 3. 与 GitHub 开源数据交叉校验 ---------- */
const refPath = path.join(ROOT, "reference/yi_64gua_gua.json");
if (fs.existsSync(refPath)) {
  const ref = JSON.parse(fs.readFileSync(refPath, "utf8")).gua;
  // 异体字归一：不同版本刻本的已知变体，视为同一字
  const VARIANTS = { "它": "他", "遯": "遁", "诉": "愬", "啕": "咷", "顒": "颙", "闚": "窥", "豶": "豮", "蔾": "藜", "沬": "沫", "乾": "干", "硕": "鼫" };
  const norm = s => String(s).replace(/[\s，。、；：？！「」『』（）《》"]/g, "")
    .split("").map(c => VARIANTS[c] || c).join("");
  const refByName = {};
  ref.forEach(g => { refByName[norm(g["gua-name"])] = g; });
  let matchedBin = 0, matchedJudge = 0, matchedLines = 0;
  for (const h of HEX) {
    const g = refByName[norm(h.name)];
    if (!g) { warns.push(`参考数据中找不到 ${h.name}`); continue; }
    if (g["gua-xiang"] === h.binary) { matchedBin++; } else { errors.push(`${h.name} 卦象与参考不符: 本=${h.binary} 参=${g["gua-xiang"]}`); }
    // 卦辞：两侧都去掉开头的卦名再比对（「履：虎尾…」vs「履虎尾…」属同一文本）
    const stripName = (s, n) => s.replace(new RegExp("^" + n), "").replace(/^[：:]/, "");
    const mine = stripName(norm(h.judgement), norm(h.name));
    const refJ = stripName(norm(g["gua-detail"]), norm(h.name));
    if (mine === refJ) matchedJudge++;
    else warns.push(`${h.name} 卦辞与参考略有出入（版本差异可能）: 本=${mine} 参=${refJ}`);
    // 爻辞逐条比对
    h.lines.forEach((l, i) => {
      const refLine = norm(g["yao-detail"][i]);
      if (norm(l.text).includes(refLine) || refLine.includes(norm(l.text))) matchedLines++;
      else warns.push(`${h.name} 第${i + 1}爻与参考不符: 本=${norm(l.text)} 参=${refLine}`);
    });
  }
  ok(matchedBin === 64, `卦象比对通过 ${matchedBin}/64`);
  ok(matchedJudge >= 60, `卦辞比对通过 ${matchedJudge}/64（允许个别版本差异）`);
  ok(matchedLines >= 384 * 0.95, `爻辞比对通过 ${matchedLines}/384（允许个别版本差异）`);
  console.log(`交叉校验：卦象 ${matchedBin}/64，卦辞匹配 ${matchedJudge}/64，爻辞匹配 ${matchedLines}/384`);
} else {
  warns.push("未找到 reference/yi_64gua_gua.json，跳过交叉校验");
}

/* ---------- 4. 八宫表校验 ---------- */
const hexByName = {};
HEX.forEach(h => { hexByName[h.name] = h; });
const palaceAll = [];
for (const [palace, names] of Object.entries(NAJIA.PALACES)) {
  ok(names.length === 8, `${palace}宫应有8卦`);
  names.forEach(n => palaceAll.push(n));
  // 本宫卦验证：上卦=下卦=宫名
  const pure = hexByName[names[0]];
  ok(pure && pure.binary.slice(0, 3) === TRI[palace].binary && pure.binary.slice(3, 6) === TRI[palace].binary,
    `${palace}宫首卦 ${names[0]} 应为八纯卦`);
  // 一世~五世：依次变初爻、二爻、三爻、四爻、五爻
  let cur = pure.binary.split("");
  for (let step = 1; step <= 5; step++) {
    cur[step - 1] = cur[step - 1] === "1" ? "0" : "1";
    const expect = cur.join("");
    ok(hexByName[names[step]].binary === expect,
      `${palace}宫${step}世卦 ${names[step]} 期望 ${expect}，实际 ${hexByName[names[step]].binary}`);
  }
  // 游魂：四爻变回
  cur[3] = cur[3] === "1" ? "0" : "1";
  ok(hexByName[names[6]].binary === cur.join(""), `${palace}宫游魂卦 ${names[6]} 推演不符`);
  // 归魂：下三爻变回宫卦
  const gui = cur.join("").slice(0, 3).split("").map(b => b === "1" ? "0" : "1").join("") + cur.join("").slice(3);
  ok(hexByName[names[7]].binary === gui, `${palace}宫归魂卦 ${names[7]} 推演不符`);
}
ok(new Set(palaceAll).size === 64 && palaceAll.every(n => hexByName[n]), "八宫64卦名应无重复且都存在");

/* ---------- 5. 纳甲表基本校验 ---------- */
for (const [tri, v] of Object.entries(NAJIA.NAJIA)) {
  ok(v.inner.branches.length === 3 && v.outer.branches.length === 3, `${tri}纳甲地支应为内3外3`);
  ok(/^[甲乙丙丁戊己庚辛壬癸]$/.test(v.inner.stem) && /^[甲乙丙丁戊己庚辛壬癸]$/.test(v.outer.stem), `${tri}纳甲天干非法`);
}
ok(Object.keys(NAJIA.SIX_GOD_START).length === 10, "六神起法应覆盖十天干");

/* ---------- 6. 全部 JS 文件语法检查（含 UI） ---------- */
for (const f of ["js/app.js", "js/core/divination.js", "js/core/najia-engine.js", "js/core/interpret.js"]) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  new Function(src); // 语法解析（不执行，IIFE 会被定义但不调用）
  pass++;
}
console.log("语法检查：4 个核心/界面脚本通过");

/* ---------- 结果 ---------- */
console.log("─".repeat(50));
warns.slice(0, 10).forEach(w => console.warn("  ⚠ " + w));
if (warns.length > 10) console.warn(`  … 共 ${warns.length} 条提示`);
console.log("─".repeat(50));
if (errors.length) {
  console.error(`✗ 校验失败：${errors.length} 处错误（${pass} 项通过）`);
  errors.slice(0, 20).forEach(e => console.error("  ✗ " + e));
  process.exit(1);
} else {
  console.log(`✓ 全部通过：${pass} 项断言，${warns.length} 条提示`);
}
