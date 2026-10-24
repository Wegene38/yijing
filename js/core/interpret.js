/**
 * 解读引擎：组装经文断辞（朱子动爻断法）+ 六爻用神分析 + 白话建议
 */
window.YI_Interpret = (function () {
  "use strict";

  var NJ = function () { return window.YI_NAJIA; };

  /** 按问题关键词选用神；无匹配时以世爻为用神（问自身运程） */
  function pickYongshen(question) {
    var rules = NJ().YONGSHEN_RULES;
    var q = String(question || "");
    var best = null;
    for (var rel in rules) {
      for (var i = 0; i < rules[rel].keywords.length; i++) {
        if (q.indexOf(rules[rel].keywords[i]) >= 0) {
          if (!best) best = rel;
        }
      }
    }
    return best || "shi"; // "shi" 表示以世爻为用神
  }

  /** 用神旺衰分析（简明规则法：月建、日辰生扶，旬空、动爻生克） */
  function analyzeYongshen(assembled, yongshenRel) {
    var NJD = NJ();
    var rel = yongshenRel === "shi" ? null : yongshenRel;
    var target = null;
    for (var i = 0; i < assembled.lines.length; i++) {
      var ln = assembled.lines[i];
      if (rel ? ln.relative === rel : ln.isShi) { target = ln; break; }
    }
    if (!target) {
      // 卦中无用神爻：以世爻代之并注明
      for (var j = 0; j < assembled.lines.length; j++) {
        if (assembled.lines[j].isShi) { target = assembled.lines[j]; break; }
      }
      return { line: target, missing: true, rel: rel || "世爻" };
    }

    var el = target.branchElement;
    var me = el;                       // 用神五行
    var monthEl = assembled.monthBranchElement;
    var dayEl = assembled.dayBranchElement;
    var G = NJD.GENERATES, O = NJD.OVERCOMES;

    var score = 0, notes = [];
    // 月建
    if (monthEl === me) { score += 2; notes.push("月建比扶，旺"); }
    else if (G[monthEl] === me) { score += 2; notes.push("月建生扶，旺"); }
    else if (O[monthEl] === me) { score -= 2; notes.push("月建克伤，衰"); }
    // 日辰
    if (dayEl === me) { score += 2; notes.push("日辰比扶，旺"); }
    else if (G[dayEl] === me) { score += 2; notes.push("日辰生扶，旺"); }
    else if (O[dayEl] === me) { score -= 2; notes.push("日辰克伤，衰"); }
    // 旬空
    if (target.xunkong) { score -= 1; notes.push("用神旬空，事有延迟或虚象"); }
    // 动爻生克
    for (var k = 0; k < assembled.lines.length; k++) {
      var mv = assembled.lines[k];
      if (!mv.moving || mv.position === target.position) continue;
      if (G[mv.branchElement] === me) { score += 1; notes.push("动爻「" + mv.relative + "」生用神"); }
      if (O[mv.branchElement] === me) { score -= 1; notes.push("动爻「" + mv.relative + "」克用神"); }
    }

    var level = score >= 3 ? "旺相" : score >= 1 ? "中和偏旺" : score >= -1 ? "中和" : score >= -3 ? "偏衰" : "衰弱";
    return { line: target, missing: false, rel: rel || "世爻", score: score, level: level, notes: notes };
  }

  /** 六爻断语文本 */
  function najiaVerdict(assembled, question) {
    var rel = pickYongshen(question);
    var ana = analyzeYongshen(assembled, rel);
    var parts = [];
    if (ana.missing) {
      parts.push("卦中未见「" + ana.rel + "」爻（卦变之象），暂以世爻参断。");
    } else {
      var ln = ana.line;
      parts.push("用神取「" + ana.rel + "」：" + ln.label + "，" + ln.stem + ln.branch +
        "（" + ln.branchElement + "），" + (ln.isShi ? "持世，" : "") + "旺衰判为「" + ana.level + "」。");
    }
    if (ana.notes && ana.notes.length) parts.push("参断：" + ana.notes.join("；") + "。");
    // 结论倾向
    var s = ana.score || 0;
    if (ana.line && ana.line.xunkong) parts.push("用神旬空，所问之事目前尚虚，宜待出空（约旬内十日）之期再图。");
    if (s >= 2) parts.push("断曰：用神得力，所谋有望，可积极推进。");
    else if (s >= 0) parts.push("断曰：用神中和，成事在人与时机，稳步推进为宜。");
    else parts.push("断曰：用神受制，事多阻碍，宜缓图、宜借力、不宜强求。");
    return { yongshen: ana.rel, analysis: ana, text: parts.join("") };
  }

  /** 依朱子断法取应读经文 */
  function focusTexts(origHex, changedHex, moving) {
    var D = window.YI_Divination;
    var focus = D.readingFocus(moving.length);
    var out = [];
    focus.forEach(function (f) {
      var hex = f.from === "本卦" ? origHex : changedHex;
      if (!hex) return;
      var lineIdx = null;
      if (f.line === "moving") lineIdx = moving[0];
      else if (f.line === "moving2upper") lineIdx = moving[moving.length - 1];
      else if (f.line === "static") {
        for (var i = 0; i < 6; i++) if (moving.indexOf(i) < 0) lineIdx = i;
      } else if (f.line === "static2lower") {
        var statics = [];
        for (var j = 0; j < 6; j++) if (moving.indexOf(j) < 0) statics.push(j);
        lineIdx = statics.length ? statics[0] : null;
      }
      if (lineIdx === null) {
        out.push({ from: f.from, hex: hex, line: null, text: hex.judgement, cn: hex.judgementCn });
      } else {
        var L = hex.lines[lineIdx];
        out.push({ from: f.from, hex: hex, line: lineIdx, label: D.lineLabel(hex.binary, lineIdx), text: L.text, xiang: L.xiang, cn: L.cn });
      }
    });
    // 六爻全动之乾坤特例：用九/用六
    if (moving.length === 6 && origHex.extra) {
      out.push({ from: "本卦", hex: origHex, line: -1, label: origHex.extra.label, text: origHex.extra.text, xiang: origHex.extra.xiang, cn: origHex.extra.cn, special: true });
    }
    return out;
  }

  /** 组装完整卦例解读 */
  function composeReading(cast, question, date) {
    var D = window.YI_Divination;
    var origBin = D.originalBinary(cast);
    var changedBin = D.changedBinary(cast);
    var moving = D.movingPositions(cast);
    var orig = D.findByBinary(origBin);
    var changed = changedBin ? D.findByBinary(changedBin) : null;
    var assembled = window.YI_NajiaEngine.assemble(orig, moving, date);
    var verdict = najiaVerdict(assembled, question);
    var texts = focusTexts(orig, changed, moving);
    return {
      question: question,
      time: date.toISOString(),
      cast: cast.map(function (t) { return t.value; }),
      moving: moving,
      orig: orig,
      changed: changed,
      assembled: assembled,
      verdict: verdict,
      focusTexts: texts
    };
  }

  return {
    pickYongshen: pickYongshen,
    analyzeYongshen: analyzeYongshen,
    najiaVerdict: najiaVerdict,
    focusTexts: focusTexts,
    composeReading: composeReading
  };
})();
