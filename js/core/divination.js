/**
 * 起卦核心：三枚铜钱法（六次摇卦）与本变卦推演
 * 铜钱：正面（字）为2，背面（背/图案）为3；三枚之和：
 *   6 = 老阴（动爻，阴动变阳）  8 = 少阴（静）
 *   9 = 老阳（动爻，阳动变阴）  7 = 少阳（静）
 */
window.YI_Divination = (function () {
  "use strict";

  var MEANING = {
    6: { label: "老阴", yang: false, moving: true,  coins: [2, 2, 2] },
    7: { label: "少阳", yang: true,  moving: false, coins: [3, 2, 2] },
    8: { label: "少阴", yang: false, moving: false, coins: [3, 3, 2] },
    9: { label: "老阳", yang: true,  moving: true,  coins: [3, 3, 3] }
  };

  /** 掷三枚铜钱一次，返回 6/7/8/9 */
  function tossOnce() {
    // 每枚：字(概率1/2记2) 背(记3)。三枚之和 ∈ {6,7,8,9}
    var sum = 0, coins = [];
    for (var i = 0; i < 3; i++) {
      var back = Math.random() < 0.5; // 简化为等概率，传统以背为3
      coins.push(back ? 3 : 2);
      sum += back ? 3 : 2;
    }
    return { value: sum, coins: coins };
  }

  /** 六次摇卦（自初爻至上爻），返回爻值数组 [6/7/8/9]×6 */
  function castAll() {
    var lines = [];
    for (var i = 0; i < 6; i++) lines.push(tossOnce());
    return lines;
  }

  /** 由爻值推本卦二进制（自下而上） */
  function originalBinary(cast) {
    return cast.map(function (t) { return MEANING[t.value].yang ? "1" : "0"; }).join("");
  }

  /** 由爻值推变卦二进制：老阴变阳、老阳变阴；无动爻则无变卦 */
  function changedBinary(cast) {
    if (!cast.some(function (t) { return MEANING[t.value].moving; })) return null;
    return cast.map(function (t) {
      var m = MEANING[t.value];
      if (m.moving) return m.yang ? "0" : "1";
      return m.yang ? "1" : "0";
    }).join("");
  }

  /** 动爻位置（0=初爻 … 5=上爻） */
  function movingPositions(cast) {
    var pos = [];
    cast.forEach(function (t, i) { if (MEANING[t.value].moving) pos.push(i); });
    return pos;
  }

  /** 生成爻题：初九/六二/九三/六四/九五/上六 等 */
  function lineLabel(binary, index) {
    var yang = binary[index] === "1";
    var num = yang ? "九" : "六";
    var posName = ["初", "二", "三", "四", "五", "上"][index];
    if (index === 0 || index === 5) return posName + num; // 初九 / 上六
    return num + posName; // 九二 / 六三
  }

  /** 按二进制查卦（依赖数据已加载） */
  function findByBinary(binary) {
    var list = window.YI_HEXAGRAMS || [];
    for (var i = 0; i < list.length; i++) if (list[i].binary === binary) return list[i];
    return null;
  }

  /**
   * 朱子《易学启蒙》动爻断法：返回应重点研读的经文条目
   * 返回 { focus: [{from:"本卦"|"变卦", line:int|null}] }
   */
  function readingFocus(movingCount) {
    switch (movingCount) {
      case 0: return [{ from: "本卦", line: null }];                       // 本卦卦辞
      case 1: return [{ from: "本卦", line: "moving" }];                    // 本卦动爻爻辞
      case 2: return [{ from: "本卦", line: "moving2upper" }];              // 本卦两动爻，以上者为主
      case 3: return [{ from: "本卦", line: null }, { from: "变卦", line: null }]; // 本卦变卦卦辞，本卦为主
      case 4: return [{ from: "变卦", line: "static2lower" }];              // 变卦两静爻，以下者为主
      case 5: return [{ from: "变卦", line: "static" }];                    // 变卦之静爻
      default: return [{ from: "变卦", line: null }];                       // 六爻全动：变卦卦辞（乾坤用九用六）
    }
  }

  return {
    MEANING: MEANING,
    tossOnce: tossOnce,
    castAll: castAll,
    originalBinary: originalBinary,
    changedBinary: changedBinary,
    movingPositions: movingPositions,
    lineLabel: lineLabel,
    findByBinary: findByBinary,
    readingFocus: readingFocus
  };
})();
