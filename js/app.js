/**
 * 应用 UI 逻辑：hash 路由 / 起卦流程 / 卦库 / 解读渲染 / 占例
 */
(function () {
  "use strict";

  var D = window.YI_Divination;
  var I = window.YI_Interpret;
  var E = window.YI_NajiaEngine;
  var HEXES = window.YI_HEXAGRAMS;

  var HISTORY_KEY = "yijing_history_v1";
  var currentCast = null;      // 摇卦过程中的爻值
  var currentReading = null;   // 组装完成的解读

  /* ---------- 工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    var p = function (x) { return (x < 10 ? "0" : "") + x; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  var YANG_HTML = '<span></span>';
  var YIN_HTML = '<span></span><span></span>';
  function symbolHTML(binary, small, movingMarks) {
    var cls = "hexagram-symbol" + (small ? " small" : "");
    var html = '<div class="' + cls + '" aria-hidden="true">';
    for (var i = 0; i < 6; i++) {
      var mark = movingMarks ? '<em style="position:absolute;right:-1.3em;top:-0.15em;font-style:normal;font-size:.75em;color:#a63d2f">' + movingMarks[i] + "</em>" : "";
      html += '<div class="yao">' + (binary[i] === "1" ? YANG_HTML : YIN_HTML) + mark + "</div>";
    }
    return html + "</div>";
  }

  /* ---------- 路由 ---------- */
  var views = ["home", "browse", "hexagram", "result", "history"];
  function router() {
    var hash = location.hash.replace(/^#/, "") || "home";
    var name = hash.split("/")[0];
    if (views.indexOf(name) < 0) name = "home";
    views.forEach(function (v) { $("#view-" + v).hidden = v !== name; });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === name ||
        (name === "hexagram" && a.getAttribute("data-nav") === "browse") ||
        (name === "result" && a.getAttribute("data-nav") === "home"));
    });
    if (name === "browse") renderBrowse("");
    if (name === "hexagram") renderHexagramDetail(hash.split("/")[1]);
    if (name === "history") renderHistory();
    if (name === "result" && !$("#result-root").firstChild && currentReading) renderResult(currentReading);
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", router);

  /* ---------- 起卦流程 ---------- */
  var tossing = false;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function tossFlow() {
    if (tossing) return;
    tossing = true;
    var btn = $("#btn-toss");
    btn.disabled = true;
    var status = $("#toss-status");
    var progress = $("#toss-progress");
    var built = $("#built-lines");
    var coins = Array.prototype.slice.call(document.querySelectorAll(".coin"));
    var question = $("#question").value.trim();

    currentCast = [];
    progress.innerHTML = "";
    built.hidden = false;
    built.innerHTML = "";

    var q = question ? "所问：" + esc(question) + "。" : "";
    for (var i = 0; i < 6; i++) {
      status.textContent = "第 " + (i + 1) + " 掷 · 铜钱落案…";
      var t = D.tossOnce();
      // 掷币动画
      coins.forEach(function (c) {
        c.classList.remove("tossing");
        void c.offsetWidth; // 重置动画
        c.classList.add("tossing");
      });
      await sleep(560);
      // 显示结果：背=3（图案面），字=2
      coins.forEach(function (c, idx) {
        var isBack = t.coins[idx] === 3;
        c.classList.toggle("show-back", isBack);
        c.querySelector(".coin-face").textContent = isBack ? "背" : "字";
      });
      currentCast.push(t);
      var m = D.MEANING[t.value];
      var typeName = t.value === 6 ? "老阴 ×（动）" : t.value === 9 ? "老阳 ○（动）" : m.label;
      status.textContent = "第 " + (i + 1) + " 掷：" + t.coins.map(function (c) { return c === 3 ? "背" : "字"; }).join(" · ") +
        " → " + typeName;
      // 进度点
      var dot = el("span", "dot");
      if (t.value === 9) dot.classList.add("moving-yang");
      else if (t.value === 6) dot.classList.add("moving-yin");
      progress.appendChild(dot);
      // 已成之爻（自下而上）
      var posName = ["初", "二", "三", "四", "五", "上"][i];
      var row = el("div", "built-row");
      row.innerHTML = '<span style="width:2.2em;text-align:right">' + posName + "爻</span>" +
        '<span class="yao-line ' + (m.yang ? "yang" : "yin") + '" style="width:110px">' +
        (m.yang ? '<span class="bar"></span>' : '<span class="yin-bars" style="display:flex;gap:14px;width:100%"><span style="height:12px;flex:1;border-radius:2px;background:#2f2a24"></span><span style="height:12px;flex:1;border-radius:2px;background:#2f2a24"></span></span>') +
        "</span>" +
        '<span style="width:5.5em">' + D.lineLabel(D.originalBinary(currentCast), i) + " · " + typeName + "</span>";
      built.appendChild(row);
      await sleep(420);
    }

    status.textContent = "卦成 —— " + q + "正推演本卦变卦…";
    await sleep(700);
    var reading = I.composeReading(currentCast, question, new Date());
    currentReading = reading;
    saveHistory(reading);
    location.hash = "#result";
    renderResult(reading);
    tossing = false;
    btn.disabled = false;
    status.textContent = "静心凝神，点击下方按钮开始";
    // 重置铜钱与进度，便于再占
    setTimeout(function () {
      coins.forEach(function (c) { c.classList.remove("show-back"); c.querySelector(".coin-face").textContent = c.dataset.coin === "0" ? "乾" : c.dataset.coin === "1" ? "坤" : "元"; });
      progress.innerHTML = "";
      built.hidden = true;
      built.innerHTML = "";
    }, 600);
  }

  /* ---------- 解读结果页 ---------- */
  function renderResult(r) {
    var root = $("#result-root");
    root.innerHTML = "";

    var asm = r.assembled;
    var marks = r.cast.map(function (v) { return v === 9 ? "○" : v === 6 ? "×" : ""; });

    var meta = el("div", "result-meta");
    meta.innerHTML =
      (r.question ? "<span>所问：<b>" + esc(r.question) + "</b></span>" : "<span>问运程</span>") +
      "<span>" + fmtTime(r.time) + "</span>" +
      '<span class="gz">' + asm.yearGanZhi + "年 · " + asm.monthBranch + "月建 · " + asm.dayGanZhi + "日" +
      (asm.xunkong.length ? "（旬空 " + asm.xunkong.join("") + "）" : "") + "</span>";
    root.appendChild(meta);

    // 本卦 → 变卦
    var combo = el("div", "hex-combo");
    combo.appendChild(hexSide(r.orig, "本 卦", marks, true));
    if (r.changed) {
      combo.appendChild(el("div", "arrow", "→"));
      combo.appendChild(hexSide(r.changed, "变 卦", null, false));
    } else {
      combo.appendChild(el("div", "hex-side", '<div class="role" style="padding-top:1.4rem">静卦<br><span class="muted" style="letter-spacing:.1em">无动爻，以本卦卦辞断</span></div>'));
    }
    root.appendChild(combo);

    // 断辞（朱子断法）
    if (r.focusTexts.length) {
      var box = el("div", "focus-box");
      r.focusTexts.forEach(function (f) {
        var item = el("div", "focus-item");
        var head = '<span class="f-label">' + esc(f.hex.name) + (f.label ? " · " + esc(f.label) : " · 卦辞") + "</span>";
        item.innerHTML = head + '<div class="f-text">' + esc(f.text) + "</div>" +
          (f.xiang ? '<div class="f-xiang">' + esc(f.xiang) + "</div>" : "") +
          (f.cn ? '<div class="f-cn">' + esc(f.cn) + "</div>" : "");
        box.appendChild(item);
      });
      box.appendChild(el("div", "focus-rule", "—— 断辞取法：朱子《易学启蒙》动爻占法（" +
        (r.moving.length === 0 ? "无动爻以本卦卦辞断" :
         r.moving.length === 1 ? "一爻动以本卦动爻辞断" :
         r.moving.length === 2 ? "二爻动以上动之爻为主" :
         r.moving.length === 3 ? "三爻动以本卦变卦卦辞参断" :
         r.moving.length === 4 ? "四爻动以变卦二静爻断" :
         r.moving.length === 5 ? "五爻动以变卦静爻断" : "六爻全动以变卦卦辞断") + "）"));
      root.appendChild(el("div", "section-title", "断 辞"));
      root.appendChild(box);
    }

    // 白话建议
    root.appendChild(el("div", "section-title", "象 曰 · 白话"));
    var advice = el("div", "advice-box");
    advice.innerHTML = "<p><b>" + esc(r.orig.fullName) + "</b>：" + esc(r.orig.judgementCn) + "</p><p style='margin-top:.5em'>" + esc(r.orig.advice) + "</p>";
    if (r.changed) {
      advice.innerHTML += "<p style='margin-top:.5em'><b>变卦 " + esc(r.changed.fullName) + "</b>：事态趋向——" + esc(r.changed.judgementCn) + "</p>";
    }
    root.appendChild(advice);

    // 六爻纳甲
    root.appendChild(el("div", "section-title", "六 爻 装卦"));
    var wrap = el("div", "najia-wrap");
    var table = el("table", "najia");
    var thead = "<tr><th>爻</th><th>六神</th><th>六亲</th><th>纳甲</th><th>世应</th><th>动静</th><th>旬空</th></tr>";
    var rows = "";
    for (var i = 5; i >= 0; i--) { // 自上爻往下排（传统盘面）
      var ln = asm.lines[i];
      rows += "<tr" + (ln.moving ? ' class="moving-row"' : "") + ">" +
        '<td class="yao-label">' + esc(ln.label) + (ln.yang ? " ⚊" : " ⚋") + "</td>" +
        "<td>" + esc(ln.god) + "</td>" +
        "<td>" + esc(ln.relative) + "</td>" +
        "<td>" + esc(ln.stem + ln.branch) + "</td>" +
        "<td>" + (ln.isShi ? '<span class="shi">世</span>' : ln.isYing ? '<span class="ying">应</span>' : "") + "</td>" +
        "<td>" + (ln.moving ? (ln.yang ? "○ 动" : "× 动") : "静") + "</td>" +
        '<td>' + (ln.xunkong ? '<span class="kong">空</span>' : "") + "</td></tr>";
    }
    table.innerHTML = thead + rows;
    wrap.appendChild(table);
    root.appendChild(wrap);
    root.appendChild(el("p", "najia-condition",
      "本卦属<b>" + esc(asm.palace.palace) + "宫" + esc(asm.palace.type) + "</b>（宫五行" + esc(asm.palace.element) +
      "），世居" + asm.palace.shi + "爻、应在" + asm.palace.ying + "爻。日干支 " + esc(asm.dayGanZhi) +
      "，月建 " + esc(asm.monthBranch) + "，旬空 " + esc(asm.xunkong.join("") || "无") + "。"));

    // 断语
    root.appendChild(el("div", "section-title", "六 爻 断 语"));
    root.appendChild(el("div", "verdict-box", "<b>【用神】</b>" + esc(r.verdict.text)));

    // 操作
    var actions = el("div", "result-actions");
    actions.innerHTML =
      '<a class="btn btn-primary btn-small" href="#home" style="text-decoration:none;display:inline-block">再 占 一 卦</a>' +
      '<a class="btn btn-ghost" href="#hexagram/' + r.orig.id + '" style="text-decoration:none;display:inline-block">通读本卦经文</a>' +
      (r.changed ? '<a class="btn btn-ghost" href="#hexagram/' + r.changed.id + '" style="text-decoration:none;display:inline-block">变卦经文</a>' : "") +
      '<a class="btn btn-ghost" href="#history" style="text-decoration:none;display:inline-block">我的占例</a>';
    root.appendChild(actions);
  }

  function hexSide(hex, role, marks, isOrig) {
    var side = el("div", "hex-side");
    side.innerHTML = '<div class="role">' + role + "</div>" +
      "<h2>" + esc(hex.fullName) + "</h2>" +
      '<div style="display:flex;justify-content:center;margin:.4rem 0">' + symbolHTML(hex.binary, true, marks) + "</div>" +
      (isOrig ? '<div class="palace-note">' + (marks && marks.join("").replace(/[^\○×]/g, "") ? "○ 老阳动 · × 老阴动" : "六爻安静") + "</div>" : '<div class="palace-note">事之终也</div>');
    return side;
  }

  /* ---------- 卦库 ---------- */
  function renderBrowse(keyword) {
    var list = $("#browse-list");
    list.innerHTML = "";
    var k = keyword.trim();
    var palaces = window.YI_NAJIA.PALACES;
    var shown = 0;
    for (var p in palaces) {
      var cards = [];
      palaces[p].forEach(function (name) {
        var h = HEXES.filter(function (x) { return x.name === name; })[0];
        if (!h) return;
        var hay = h.name + h.fullName + h.upper + h.lower;
        if (k && hay.indexOf(k) < 0) return;
        shown++;
        cards.push('<a class="hex-card" href="#hexagram/' + h.id + '">' +
          '<div style="display:flex;justify-content:center">' + symbolHTML(h.binary, true) + "</div>" +
          '<div class="info"><b>' + esc(h.name) + "</b><span>" + esc(h.fullName) + " · 第" + h.id + "卦</span></div></a>");
      });
      if (cards.length) {
        var g = el("div", "palace-group");
        g.innerHTML = '<div class="palace-title"><b>' + p + "宫</b>（五行" + window.YI_NAJIA.PALACE_ELEMENT[p] + "）</div>" +
          '<div class="hex-grid">' + cards.join("") + "</div>";
        list.appendChild(g);
      }
    }
    if (!shown) list.appendChild(el("p", "empty-tip", "无匹配之卦"));
  }

  /* ---------- 卦详情 ---------- */
  function renderHexagramDetail(idStr) {
    var root = $("#hexagram-detail");
    root.innerHTML = "";
    var h = HEXES.filter(function (x) { return String(x.id) === String(idStr); })[0];
    if (!h) { root.innerHTML = '<p class="empty-tip">未找到此卦</p><a class="back-link" href="#browse">← 返回卦库</a>'; return; }

    var pal = E.palaceOf(h);
    root.appendChild(el("a", "back-link", "← 返回卦库")).setAttribute("href", "#browse");

    var head = el("div", "detail-head");
    head.innerHTML =
      '<div style="display:flex;justify-content:center">' + symbolHTML(h.binary) + "</div>" +
      '<div class="names"><h1>' + esc(h.name) + " · " + esc(h.fullName) + "</h1>" +
      '<div class="sub">' + esc(h.lower) + "下" + esc(h.upper) + "上 · 第" + h.id + "卦" + "</div>" +
      '<div class="badge">' + esc(pal.palace) + "宫" + esc(pal.type) + " · 世" + pal.shi + "应" + pal.ying + "</div></div>";
    root.appendChild(head);

    var sc = el("div", "scripture");
    sc.innerHTML =
      scriptBlock("卦 辞", h.judgement, h.judgementCn) +
      scriptBlock("彖 传", h.tuan) +
      scriptBlock("大 象", h.image);
    root.appendChild(el("div", "section-title", "经 文"));
    root.appendChild(sc);

    root.appendChild(el("div", "section-title", "爻 辞"));
    var linesWrap = el("div");
    h.lines.forEach(function (l, i) {
      var item = el("div", "line-item");
      item.innerHTML = '<div class="line-head"><span class="line-label">' + esc(D.lineLabel(h.binary, i)) + "</span>" +
        '<span class="line-text">' + esc(l.text) + "</span></div>" +
        '<div class="line-xiang">' + esc(l.xiang) + "</div>" +
        '<div class="line-cn">' + esc(l.cn) + "</div>";
      linesWrap.appendChild(item);
    });
    if (h.extra) {
      var ex = el("div", "line-item moving");
      ex.innerHTML = '<div class="line-head"><span class="line-label">' + esc(h.extra.label) + "</span>" +
        '<span class="line-text">' + esc(h.extra.text) + "</span></div>" +
        '<div class="line-xiang">' + esc(h.extra.xiang) + "</div>" +
        '<div class="line-cn">' + esc(h.extra.cn || "") + "</div>";
      linesWrap.appendChild(ex);
    }
    root.appendChild(linesWrap);

    root.appendChild(el("div", "section-title", "白 话 小 议"));
    root.appendChild(el("div", "advice-box", esc(h.advice)));
  }

  function scriptBlock(title, text, cn) {
    return '<div style="margin-bottom:.9rem"><div style="font-size:.82rem;letter-spacing:.3em;color:#a63d2f;margin-bottom:.15rem">' + title + "</div>" +
      '<div class="origin">' + esc(text) + "</div>" + (cn ? '<div class="cn">' + esc(cn) + "</div>" : "") + "</div>";
  }

  /* ---------- 占例 ---------- */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveHistory(reading) {
    var list = loadHistory();
    list.unshift({
      id: Date.now(),
      time: reading.time,
      question: reading.question,
      cast: reading.cast
    });
    if (list.length > 100) list.length = 100;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* 隐私模式等 */ }
  }
  function openHistory(entry) {
    var cast = entry.cast.map(function (v) { return { value: v }; });
    currentReading = I.composeReading(cast, entry.question, new Date(entry.time));
    location.hash = "#result";
    renderResult(currentReading);
  }
  function renderHistory() {
    var root = $("#history-list");
    root.innerHTML = "";
    var list = loadHistory();
    if (!list.length) {
      root.innerHTML = '<p class="empty-tip">尚无占例 —— <a href="#home" style="color:#a63d2f">去起一卦</a></p>';
      return;
    }
    list.forEach(function (entry, idx) {
      var cast = entry.cast.map(function (v) { return { value: v }; });
      var orig = D.findByBinary(D.originalBinary(cast));
      var changedBin = D.changedBinary(cast);
      var changed = changedBin ? D.findByBinary(changedBin) : null;
      var item = el("div", "history-item");
      item.innerHTML =
        '<div class="h-q" data-idx="' + idx + '"><b>' + esc(entry.question || "问运程") + "</b>" +
        "<span>" + fmtTime(entry.time) + "</span></div>" +
        '<div class="h-hex" data-idx="' + idx + '">' + symbolHTML(orig.binary, true) +
        '<div class="names">' + esc(orig.name) + (changed ? " → " + esc(changed.name) : "（静）") + "</div></div>" +
        '<button class="btn btn-ghost btn-small" data-del="' + idx + '">删除</button>';
      root.appendChild(item);
    });
    root.querySelectorAll(".h-q, .h-hex").forEach(function (n) {
      n.addEventListener("click", function () { openHistory(list[Number(n.dataset.idx)]); });
    });
    root.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var arr = loadHistory();
        arr.splice(Number(b.dataset.del), 1);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
        renderHistory();
      });
    });
  }

  /* ---------- 事件绑定 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    $("#btn-toss").addEventListener("click", tossFlow);
    $("#question").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !tossing) tossFlow();
    });
    $("#search").addEventListener("input", function () { renderBrowse(this.value); });
    $("#btn-clear-history").addEventListener("click", function () {
      if (confirm("确定清空全部占例？此操作不可恢复。")) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
      }
    });
    router();
  });
})();
