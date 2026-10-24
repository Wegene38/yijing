/**
 * 装卦引擎：纳甲干支、六亲、六神、世应、旬空
 * 干支纪日以 2000-01-01（儒略日 2451545）为 戊午日（序号54，甲子=0）锚定，
 * 与 1949-10-01 甲子日 互验一致。子时（23:00 后）按传统换次日日柱。
 */
window.YI_NajiaEngine = (function () {
  "use strict";

  var JDN_2000_01_01 = 2451545; // 该日为戊午日
  var GANZHI_2000_01_01 = 54;

  /** 公历(本地)年月日 → 儒略日数 */
  function toJDN(y, m, d) {
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 2440588;
  }

  /** 当日干支序号（甲子=0），date 为 Date 对象；23 点后进为次日 */
  function dayGanZhiIndex(date) {
    var d = new Date(date.getTime());
    if (d.getHours() >= 23) d.setDate(d.getDate() + 1); // 子时换日
    var jdn = toJDN(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var idx = (jdn - JDN_2000_01_01 + GANZHI_2000_01_01) % 60;
    return (idx + 60) % 60;
  }

  function dayGanZhi(date) {
    return window.YI_NAJIA.ganZhi(dayGanZhiIndex(date));
  }

  /** 月建地支（按十二节近似日期，误差±1天内）
   *  注意：小寒在每年1月，跨年场景不参与比较，仅作为立春前的默认月建 */
  var JIEQI = [
    { month: 2, day: 4, branch: "寅" },  // 立春
    { month: 3, day: 6, branch: "卯" },  // 惊蛰
    { month: 4, day: 5, branch: "辰" },  // 清明
    { month: 5, day: 6, branch: "巳" },  // 立夏
    { month: 6, day: 6, branch: "午" },  // 芒种
    { month: 7, day: 7, branch: "未" },  // 小暑
    { month: 8, day: 8, branch: "申" },  // 立秋
    { month: 9, day: 8, branch: "酉" },  // 白露
    { month: 10, day: 8, branch: "戌" }, // 寒露
    { month: 11, day: 7, branch: "亥" }, // 立冬
    { month: 12, day: 7, branch: "子" }  // 大雪
  ];
  function monthBranch(date) {
    var m = date.getMonth() + 1, d = date.getDate();
    var branch = "丑"; // 小寒至立春前属丑月
    for (var i = 0; i < JIEQI.length; i++) {
      var j = JIEQI[i];
      var passed = (m > j.month) || (m === j.month && d >= j.day);
      if (passed) branch = j.branch;
    }
    return branch;
  }

  /** 年干支（以立春分界，近似 2/4） */
  function yearGanZhi(date) {
    var y = date.getFullYear();
    if (date.getMonth() === 0 || (date.getMonth() === 1 && date.getDate() < 4)) y -= 1;
    var idx = (y - 1984) % 60;
    return window.YI_NAJIA.ganZhi((idx + 60) % 60);
  }

  /** 查卦所属宫及世应 */
  function palaceOf(hexagram) {
    var NJ = window.YI_NAJIA;
    var palaces = NJ.PALACES;
    for (var p in palaces) {
      var idx = palaces[p].indexOf(hexagram.name);
      if (idx >= 0) {
        return {
          palace: p,
          element: NJ.PALACE_ELEMENT[p],
          type: NJ.PALACE_TYPE_NAME[idx],
          shi: NJ.SHI_POSITION[idx],      // 1..6
          ying: ((NJ.SHI_POSITION[idx] + 2) % 6) + 1
        };
      }
    }
    return null;
  }

  /**
   * 装卦：给定卦象二进制与摇卦结果（含动爻），返回逐爻装配表
   * @param hexagram 卦数据（本卦）
   * @param moving   动爻位置数组（0基）
   * @param date     Date
   */
  function assemble(hexagram, moving, date) {
    var NJ = window.YI_NAJIA;
    var pal = palaceOf(hexagram);
    var dayIdx = dayGanZhiIndex(date);
    var dayGZ = NJ.ganZhi(dayIdx);
    var dayStem = dayGZ[0], dayBranch = dayGZ[1];
    var monthB = monthBranch(date);
    var xunkong = NJ.dayXunKong(dayIdx);
    var godStart = NJ.SIX_GOD_START[dayStem];
    var lowerTri = hexagram.binary.slice(0, 3), upperTri = hexagram.binary.slice(3, 6);
    var triNameByBin = {};
    for (var t in NJ.TRIGRAMS) triNameByBin[NJ.TRIGRAMS[t].binary] = t;

    var lines = [];
    for (var i = 0; i < 6; i++) {
      var triName = triNameByBin[i < 3 ? lowerTri : upperTri];
      var najia = NJ.NAJIA[triName][i < 3 ? "inner" : "outer"];
      var branch = najia.branches[i % 3];
      var stem = najia.stem;
      var branchEl = NJ.BRANCH_ELEMENT[branch];
      lines.push({
        position: i + 1,                       // 1..6（初..上）
        label: window.YI_Divination.lineLabel(hexagram.binary, i),
        yang: hexagram.binary[i] === "1",
        stem: stem, branch: branch,
        branchElement: branchEl,
        relative: NJ.sixRelative(pal.element, branchEl),
        god: NJ.SIX_GODS[(godStart + i) % 6],
        moving: moving.indexOf(i) >= 0,
        isShi: pal.shi === i + 1,
        isYing: pal.ying === i + 1,
        xunkong: xunkong.indexOf(branch) >= 0
      });
    }
    return {
      palace: pal,
      lines: lines,
      dayGanZhi: dayGZ,
      dayStem: dayStem, dayBranch: dayBranch,
      dayStemElement: NJ.STEM_ELEMENT[dayStem],
      dayBranchElement: NJ.BRANCH_ELEMENT[dayBranch],
      monthBranch: monthB,
      monthBranchElement: NJ.BRANCH_ELEMENT[monthB],
      xunkong: xunkong,
      yearGanZhi: yearGanZhi(date)
    };
  }

  return {
    dayGanZhi: dayGanZhi,
    dayGanZhiIndex: dayGanZhiIndex,
    monthBranch: monthBranch,
    yearGanZhi: yearGanZhi,
    palaceOf: palaceOf,
    assemble: assemble,
    toJDN: toJDN
  };
})();
