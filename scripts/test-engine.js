#!/usr/bin/env node
/**
 * 引擎单元测试：node scripts/test-engine.js
 * - 干支纪日锚点（1949-10-01 甲子 / 2000-01-01 戊午）
 * - 乾为天标准装卦（六爻纳甲/六亲/世应）
 * - 摇卦→本变卦推演、朱子断法条目数
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
global.window = {};
for (const f of ["najia.js", "hexagrams-1.js", "hexagrams-2.js", "hexagrams-3.js", "hexagrams-4.js"]) {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(ROOT, "js/data", f), "utf8"));
}
for (const f of ["divination.js", "najia-engine.js", "interpret.js"]) {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(ROOT, "js/core", f), "utf8"));
}
const D = global.window.YI_Divination;
const E = global.window.YI_NajiaEngine;
const I = global.window.YI_Interpret;
const NJ = global.window.YI_NAJIA;

let fails = 0;
const t = (name, actual, expect) => {
  const okEq = JSON.stringify(actual) === JSON.stringify(expect);
  if (!okEq) { fails++; console.error(`  ✗ ${name}\n    期望 ${JSON.stringify(expect)}\n    实际 ${JSON.stringify(actual)}`); }
  else console.log(`  ✓ ${name}`);
};

console.log("【干支纪日】");
t("1949-10-01 为甲子日", E.dayGanZhi(new Date(1949, 9, 1, 12)), "甲子");
t("2000-01-01 为戊午日", E.dayGanZhi(new Date(2000, 0, 1, 12)), "戊午");
t("2026-10-24 日柱", E.dayGanZhi(new Date(2026, 9, 24, 12)), NJ.ganZhi((E.toJDN(2026, 10, 24) - 2451545 + 54 + 60 * 10) % 60));
t("子时换日（23:30 视作次日）",
  E.dayGanZhiIndex(new Date(2000, 0, 1, 23, 30)),
  (E.dayGanZhiIndex(new Date(2000, 0, 2, 0, 30))));

console.log("【乾为天装卦】");
const qian = D.findByBinary("111111");
const asm = E.assemble(qian, [], new Date(2026, 9, 24, 12));
t("乾宫本宫卦", asm.palace.palace, "乾");
t("世应：世上应三", [asm.palace.shi, asm.palace.ying], [6, 3]);
const expectStems = ["甲子", "甲寅", "甲辰", "壬午", "壬申", "壬戌"];
t("六爻纳甲干支", asm.lines.map(l => l.stem + l.branch), expectStems);
t("六亲（子孙子财父官兄父）", asm.lines.map(l => l.relative),
  ["子孙", "妻财", "父母", "官鬼", "兄弟", "父母"]);

console.log("【月建/年干支】");
t("2026-10-24 月建戌（寒露后立冬前）", E.monthBranch(new Date(2026, 9, 24)), "戌");
t("2026 年丙午", E.yearGanZhi(new Date(2026, 9, 24)), "丙午");

console.log("【起卦推演】");
// 构造：初爻老阳(9)、五爻老阴(6)，其余 7/8
const cast = [{ value: 9 }, { value: 8 }, { value: 7 }, { value: 8 }, { value: 6 }, { value: 7 }];
// 逐爻：初9阳=1，二8阴=0，三7阳=1，四8阴=0，五6阴=0，上7阳=1 → 101001 = 贲
t("本卦二进制", D.originalBinary(cast), "101001");
t("本卦为贲", D.findByBinary(D.originalBinary(cast)).name, "贲");
t("动爻位置", D.movingPositions(cast), [0, 4]);
// 变卦：初1→0，五0→1 → 001011 → 渐? 0,0,1,0,1,1: lower=001艮 upper=011巽 = 风山渐
t("变卦二进制", D.changedBinary(cast), "001011");
t("变卦为渐", D.findByBinary(D.changedBinary(cast)).name, "渐");
t("爻题", [D.lineLabel("111111", 0), D.lineLabel("111111", 1), D.lineLabel("000000", 5)], ["初九", "九二", "上六"]);

console.log("【朱子断法】");
t("0动→本卦卦辞", D.readingFocus(0), [{ from: "本卦", line: null }]);
t("1动→本卦动爻", D.readingFocus(1), [{ from: "本卦", line: "moving" }]);
t("6动→变卦卦辞", D.readingFocus(6), [{ from: "变卦", line: null }]);

console.log("【完整解读冒烟】");
const cast2 = cast.map(v => ({ value: v.value }));
const reading = I.composeReading(cast2, "问事业，最近升迁机会如何", new Date(2026, 9, 24, 12));
t("解读含本卦", reading.orig.name, "贲");
t("解读含变卦", reading.changed.name, "渐");
t("用神取官鬼", reading.verdict.yongshen, "官鬼");
if (!reading.verdict.text || reading.verdict.text.length < 20) { fails++; console.error("  ✗ 断语文本过短"); }
else console.log("  ✓ 断语生成正常");
if (reading.focusTexts.length < 1 || !reading.focusTexts[0].text) { fails++; console.error("  ✗ 断辞缺失"); }
else console.log("  ✓ 断辞生成正常（" + reading.focusTexts.map(f => f.label || "卦辞").join("/") + "）");

console.log("─".repeat(40));
if (fails) { console.error(`✗ ${fails} 处失败`); process.exit(1); }
console.log("✓ 引擎测试全部通过");
