/**
 * 六爻纳甲基础数据表
 * 依据《京房易传》八宫卦系、《增删卜易》装卦法则。
 * 爻位约定：index 0 = 初爻（下），index 5 = 上爻（上），binary 同序（自下而上）。
 */
window.YI_NAJIA = (function () {
  "use strict";

  // 八经卦：二进制（自下而上）、五行
  var TRIGRAMS = {
    "乾": { binary: "111", element: "金" },
    "兑": { binary: "110", element: "金" },
    "离": { binary: "101", element: "火" },
    "震": { binary: "100", element: "木" },
    "巽": { binary: "011", element: "木" },
    "坎": { binary: "010", element: "水" },
    "艮": { binary: "001", element: "土" },
    "坤": { binary: "000", element: "土" }
  };

  // 纳甲：每卦内卦（下卦）/外卦（上卦）各纳一天干，地支自初爻起顺行
  // 内卦地支对应爻位 index 0-2，外卦对应 index 3-5
  var NAJIA = {
    "乾": { inner: { stem: "甲", branches: ["子", "寅", "辰"] }, outer: { stem: "壬", branches: ["午", "申", "戌"] } },
    "坤": { inner: { stem: "乙", branches: ["未", "巳", "卯"] }, outer: { stem: "癸", branches: ["丑", "亥", "酉"] } },
    "震": { inner: { stem: "庚", branches: ["子", "寅", "辰"] }, outer: { stem: "庚", branches: ["午", "申", "戌"] } },
    "巽": { inner: { stem: "辛", branches: ["丑", "亥", "酉"] }, outer: { stem: "辛", branches: ["未", "巳", "卯"] } },
    "坎": { inner: { stem: "戊", branches: ["寅", "辰", "午"] }, outer: { stem: "戊", branches: ["申", "戌", "子"] } },
    "离": { inner: { stem: "己", branches: ["卯", "丑", "亥"] }, outer: { stem: "己", branches: ["酉", "未", "巳"] } },
    "艮": { inner: { stem: "丙", branches: ["辰", "午", "申"] }, outer: { stem: "丙", branches: ["戌", "子", "寅"] } },
    "兑": { inner: { stem: "丁", branches: ["巳", "卯", "丑"] }, outer: { stem: "丁", branches: ["亥", "酉", "未"] } }
  };

  // 京房八宫：每宫八卦，依次为本宫(八纯)、一世、二世、三世、四世、五世、游魂、归魂
  var PALACES = {
    "乾": ["乾", "姤", "遁", "否", "观", "剥", "晋", "大有"],
    "坎": ["坎", "节", "屯", "既济", "革", "丰", "明夷", "师"],
    "艮": ["艮", "贲", "大畜", "损", "睽", "履", "中孚", "渐"],
    "震": ["震", "豫", "解", "恒", "升", "井", "大过", "随"],
    "巽": ["巽", "小畜", "家人", "益", "无妄", "噬嗑", "颐", "蛊"],
    "离": ["离", "旅", "鼎", "未济", "蒙", "涣", "讼", "同人"],
    "坤": ["坤", "复", "临", "泰", "大壮", "夬", "需", "比"],
    "兑": ["兑", "困", "萃", "咸", "蹇", "谦", "小过", "归妹"]
  };

  // 宫名 → 宫五行（即「我」，六亲由此推）
  var PALACE_ELEMENT = {
    "乾": "金", "坎": "水", "艮": "土", "震": "木",
    "巽": "木", "离": "火", "坤": "土", "兑": "金"
  };

  // 卦在宫中位置类型 → 世爻位置（1=初爻 … 6=上爻）；应爻与世爻相隔三位
  var SHI_POSITION = { 0: 6, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 4, 7: 3 };
  var PALACE_TYPE_NAME = ["本宫卦", "一世卦", "二世卦", "三世卦", "四世卦", "五世卦", "游魂卦", "归魂卦"];

  // 六神起法：按日干，自初爻起依次为青龙、朱雀、勾陈、螣蛇、白虎、玄武
  var SIX_GODS = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];
  var SIX_GOD_START = {
    "甲": 0, "乙": 0,                    // 甲乙起青龙
    "丙": 1, "丁": 1,                    // 丙丁起朱雀
    "戊": 2, "己": 3,                    // 戊起勾陈，己起螣蛇
    "庚": 4, "辛": 4,                    // 庚辛起白虎
    "壬": 5, "癸": 5                     // 壬癸起玄武
  };

  // 五行
  var STEM_ELEMENT = { "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土", "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水" };
  var BRANCH_ELEMENT = { "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火", "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水" };
  // 五行相生：木→火→土→金→水→木
  var GENERATES = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
  // 五行相克：木克土，土克水，水克火，火克金，金克木
  var OVERCOMES = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };

  // 六亲（以本宫五行为「我」，对爻支五行论生克）
  // 同我者兄弟；生我者父母；我生者子孙；克我者官鬼；我克者妻财
  function sixRelative(palaceElement, branchElement) {
    if (palaceElement === branchElement) return "兄弟";
    if (GENERATES[branchElement] === palaceElement) return "父母";
    if (GENERATES[palaceElement] === branchElement) return "子孙";
    if (OVERCOMES[branchElement] === palaceElement) return "官鬼";
    if (OVERCOMES[palaceElement] === branchElement) return "妻财";
    return "";
  }

  // 六十甲子
  var STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  function ganZhi(index) {
    return STEMS[index % 10] + BRANCHES[index % 12];
  }

  // 旬空：甲子旬戌亥空 … 甲寅旬子丑空（键 = 旬首甲X 的 index % 12 推算不便，直接给表）
  // 日干支 index n（甲子=0），旬首 index = n - n % 10 的干支；空亡两支如下
  var XUN_KONG = {
    "甲子": ["戌", "亥"], "甲戌": ["申", "酉"], "甲申": ["午", "未"],
    "甲午": ["辰", "巳"], "甲辰": ["寅", "卯"], "甲寅": ["子", "丑"]
  };
  function dayXunKong(dayIndex) {
    var head = dayIndex - (dayIndex % 10); // 旬首（甲子/甲戌/甲申/甲午/甲辰/甲寅）
    return XUN_KONG[ganZhi(head)] || [];
  }

  // 用神选取（按所问类别；关键字匹配在 interpret.js 中做）
  var YONGSHEN_RULES = {
    "父母": { keywords: ["父母", "长辈", "文书", "合同", "证件", "房屋", "车", "考试", "学业", "消息", "信件", "工作单位"], desc: "问父母长辈、文书证件、房屋车产、考试学业，以父母爻为用神" },
    "官鬼": { keywords: ["事业", "官", "官司", "职务", "升迁", "上司", "丈夫", "男友", "疾病", "灾", "鬼"], desc: "问事业官运、官司纠纷、女问姻缘丈夫、疾病灾患，以官鬼爻为用神" },
    "妻财": { keywords: ["财", "钱", "买卖", "生意", "投资", "股票", "妻子", "女友", "雇员"], desc: "问财运买卖、男问姻缘妻子，以妻财爻为用神" },
    "兄弟": { keywords: ["兄弟", "朋友", "同事", "合伙人", "竞争"], desc: "问兄弟朋友、同事合伙，以兄弟爻为用神" },
    "子孙": { keywords: ["子女", "孩子", "晚辈", "宠物", "医药", "医药", "僧道", "解忧"], desc: "问子女晚辈、宠物医药、趋吉避祸，以子孙爻为用神" }
  };

  return {
    TRIGRAMS: TRIGRAMS,
    NAJIA: NAJIA,
    PALACES: PALACES,
    PALACE_ELEMENT: PALACE_ELEMENT,
    SHI_POSITION: SHI_POSITION,
    PALACE_TYPE_NAME: PALACE_TYPE_NAME,
    SIX_GODS: SIX_GODS,
    SIX_GOD_START: SIX_GOD_START,
    STEM_ELEMENT: STEM_ELEMENT,
    BRANCH_ELEMENT: BRANCH_ELEMENT,
    GENERATES: GENERATES,
    OVERCOMES: OVERCOMES,
    sixRelative: sixRelative,
    STEMS: STEMS,
    BRANCHES: BRANCHES,
    ganZhi: ganZhi,
    dayXunKong: dayXunKong,
    YONGSHEN_RULES: YONGSHEN_RULES
  };
})();
