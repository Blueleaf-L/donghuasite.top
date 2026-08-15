/* ============================================================
   国产动画资料库 | 剧集动画列表逻辑 js/series.js
   ------------------------------------------------------------
   职责：
   1. 挂载公共骨架（导航 + 页脚）
   2. 从数据实际取值生成筛选选项（技术类型 / 改编来源 / 评级）
   3. 组合筛选：关键词 + 年份区间 + 三组多选 chip + 排序
   4. 渲染作品网格

   筛选状态（内存中维护）：
   { q, yearFrom, yearTo, tech:Set, adaptation:Set, grade:Set, sort }
   ============================================================ */
(function () {
  "use strict";

  // 筛选状态
  var state = {
    q: "",
    yearFrom: "",
    yearTo: "",
    tech: new Set(),      // 技术类型多选（显示名）
    adaptation: new Set(),// 改编来源多选
    grade: new Set(),     // 对外评级多选
    sort: "year-desc"
  };

  /** 全部剧集作品（type === 'tv'）。 */
  var WORKS = window.TV_DATA.filter(function (w) { return w.type === "tv"; });

  /** 技术类型对外显示名（数据中的"特殊类型"对外显示"其他"，见设想 §5.1.1）。 */
  function techDisplay(t) { return window.App.fmtTech(t); }

  /**
   * 从数据聚合出某个字段的全部取值，用于生成筛选选项。
   * 返回按出现次数降序的数组。
   */
  function collectValues(getter, displayFn) {
    var map = {};
    WORKS.forEach(function (w) {
      var raw = getter(w);
      if (!raw) return;
      var key = displayFn ? displayFn(raw) : raw;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
  }

  /* ============================================================
     筛选面板生成与事件绑定
     ============================================================ */

  /** 生成一组 chip 多选按钮。onToggle 由外部传入。 */
  function buildChips(containerId, values, onToggle) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = values.map(function (v) {
      return '<button type="button" class="chip" data-value="' + v + '" aria-pressed="false">' + v + "</button>";
    }).join("");
    box.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var pressed = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", pressed ? "false" : "true");
        onToggle(chip.dataset.value, !pressed);
      });
    });
  }

  /** 初始化筛选面板（选项来自数据实际取值）。 */
  function initFilters() {
    // 技术类型：按出现次数排序，优先"全部"之外的常见项
    buildChips("f-tech", collectValues(function (w) { return w.tech; }, techDisplay),
      function (v, on) { on ? state.tech.add(v) : state.tech.delete(v); render(); });

    // 改编来源
    buildChips("f-adaptation", collectValues(function (w) { return w.adaptation; }),
      function (v, on) { on ? state.adaptation.add(v) : state.adaptation.delete(v); render(); });

    // 对外评级（固定顺序：优 → 差，贴合"字典"的阅读习惯）
    buildChips("f-grade", ["年度推荐", "佳作", "还行", "能看", "暂未评级", "不推荐"],
      function (v, on) { on ? state.grade.add(v) : state.grade.delete(v); render(); });

    // 关键词输入（防抖 200ms，避免每敲一个字就全量过滤）
    var qInput = document.getElementById("f-q");
    qInput.addEventListener("input", debounce(function () {
      state.q = qInput.value.trim();
      render();
    }, 200));

    // 年份区间
    document.getElementById("f-year-from").addEventListener("input", function (e) {
      state.yearFrom = e.target.value;
      render();
    });
    document.getElementById("f-year-to").addEventListener("input", function (e) {
      state.yearTo = e.target.value;
      render();
    });

    // 排序
    document.getElementById("f-sort").addEventListener("change", function (e) {
      state.sort = e.target.value;
      render();
    });
  }

  /** 简易防抖。 */
  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* ============================================================
     过滤与渲染
     ============================================================ */

  /** 按当前 state 过滤 + 排序，返回结果数组。 */
  function applyFilter() {
    var list = WORKS.filter(function (w) {
      // 关键词：匹配 作品名 / 导演 / 公司
      if (state.q) {
        var hay = w.name + " " + (w.director || "") + " " + (w.company || "");
        if (hay.indexOf(state.q) === -1) return false;
      }
      // 年份区间（空值不参与过滤）
      if (state.yearFrom && w.year && w.year < Number(state.yearFrom)) return false;
      if (state.yearTo && w.year && w.year > Number(state.yearTo)) return false;
      // 技术类型多选
      if (state.tech.size && !state.tech.has(techDisplay(w.tech))) return false;
      // 改编来源多选
      if (state.adaptation.size && !state.adaptation.has(w.adaptation)) return false;
      // 对外评级多选
      if (state.grade.size && !state.grade.has(w.grade)) return false;
      return true;
    });

    // 排序
    var GRADE_ORDER = { "年度推荐": 1, "佳作": 2, "还行": 3, "能看": 4, "暂未评级": 5, "不推荐": 6 };
    list.sort(function (a, b) {
      switch (state.sort) {
        case "year-desc": return (b.year || 0) - (a.year || 0);
        case "year-asc":  return (a.year || 0) - (b.year || 0);
        case "grade":     return (GRADE_ORDER[a.grade] || 9) - (GRADE_ORDER[b.grade] || 9);
        case "name":      return a.name.localeCompare(b.name, "zh-Hans-CN");
        default:          return 0;
      }
    });
    return list;
  }

  /** 渲染结果数量与作品网格。 */
  function render() {
    var list = applyFilter();
    document.getElementById("result-count").textContent = list.length;
    window.App.renderWorkCards(document.getElementById("work-grid"), list);
  }

  /* ============================================================
     启动
     ============================================================ */
  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome("series");
    // 页头统计
    document.getElementById("stat-count").textContent = WORKS.length.toLocaleString();
    initFilters();
    render();
  });
})();
