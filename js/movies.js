/* ============================================================
   国产动画资料库 | 动画电影列表逻辑 js/movies.js
   ------------------------------------------------------------
   职责：
   1. 挂载公共骨架（导航 + 页脚）
   2. 生成筛选选项（技术类型 / 改编来源 / 评级 / 上映状态）
   3. 组合筛选 + 排序 + 渲染作品网格
   4. 渲染票房排行榜（仅院线电影，按票房降序）

   复用说明：与 js/series.js 逻辑相同，区别在于
   - 数据源为 type === 'movie'
   - 多一组"上映状态"筛选（release_status：已下映 / 网络上映）
   - 渲染票房排行榜区块
   ============================================================ */
(function () {
  "use strict";

  // 筛选状态
  var state = {
    q: "",
    yearFrom: "",
    yearTo: "",
    tech: new Set(),
    adaptation: new Set(),
    grade: new Set(),
    status: new Set(),    // 上映状态多选
    sort: "year-desc"
  };

  /** 全部电影作品（type === 'movie'）。 */
  var WORKS = window.TV_DATA.filter(function (w) { return w.type === "movie"; });

  /** 技术类型对外显示名。 */
  function techDisplay(t) { return window.App.fmtTech(t); }

  /** 收集字段取值（按出现次数降序）。 */
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

  /** 生成 chip 多选组。 */
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

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /** 初始化筛选面板。 */
  function initFilters() {
    buildChips("f-tech", collectValues(function (w) { return w.tech; }, techDisplay),
      function (v, on) { on ? state.tech.add(v) : state.tech.delete(v); render(); });
    buildChips("f-adaptation", collectValues(function (w) { return w.adaptation; }),
      function (v, on) { on ? state.adaptation.add(v) : state.adaptation.delete(v); render(); });
    buildChips("f-grade", ["年度推荐", "佳作", "还行", "能看", "暂未评级", "不推荐"],
      function (v, on) { on ? state.grade.add(v) : state.grade.delete(v); render(); });
    // 上映状态：固定顺序，空值数据不在此列
    buildChips("f-status", ["已下映", "网络上映"],
      function (v, on) { on ? state.status.add(v) : state.status.delete(v); render(); });

    var qInput = document.getElementById("f-q");
    qInput.addEventListener("input", debounce(function () {
      state.q = qInput.value.trim();
      render();
    }, 200));

    document.getElementById("f-year-from").addEventListener("input", function (e) { state.yearFrom = e.target.value; render(); });
    document.getElementById("f-year-to").addEventListener("input", function (e) { state.yearTo = e.target.value; render(); });
    document.getElementById("f-sort").addEventListener("change", function (e) { state.sort = e.target.value; render(); });
  }

  /** 过滤 + 排序。 */
  function applyFilter() {
    var list = WORKS.filter(function (w) {
      if (state.q) {
        var hay = w.name + " " + (w.director || "") + " " + (w.company || "");
        if (hay.indexOf(state.q) === -1) return false;
      }
      if (state.yearFrom && w.year && w.year < Number(state.yearFrom)) return false;
      if (state.yearTo && w.year && w.year > Number(state.yearTo)) return false;
      if (state.tech.size && !state.tech.has(techDisplay(w.tech))) return false;
      if (state.adaptation.size && !state.adaptation.has(w.adaptation)) return false;
      if (state.grade.size && !state.grade.has(w.grade)) return false;
      if (state.status.size && !state.status.has(w.release_status)) return false;
      return true;
    });

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

  /** 渲染结果数量与网格。 */
  function render() {
    var list = applyFilter();
    document.getElementById("result-count").textContent = list.length;
    window.App.renderWorkCards(document.getElementById("work-grid"), list);
  }

  /* ============================================================
     票房排行榜
     ============================================================ */

  /**
   * 票房格式化（数据单位为万元）：
   * >= 10000 万（1 亿）→ "1.13 亿"；否则 "8900 万"
   */
  function fmtBoxOffice(v) {
    if (v == null) return "";
    if (v >= 10000) {
      var yi = v / 10000;
      // 去掉多余的小数零（1.10 → 1.1）
      return yi.toFixed(2).replace(/\.?0+$/, "") + " 亿";
    }
    return v.toLocaleString() + " 万";
  }

  /** 渲染票房榜：仅 box_office 有值的院线电影，降序排列。 */
  function renderBoxOffice() {
    var list = WORKS
      .filter(function (w) { return w.box_office != null; })
      .sort(function (a, b) { return b.box_office - a.box_office; });

    var box = document.getElementById("box-office-list");
    if (!list.length) {
      box.innerHTML = '<div class="list-empty">暂无票房数据，整理中。</div>';
      return;
    }
    box.innerHTML = list.map(function (w, i) {
      return (
        '<div class="list-row">' +
          '<span class="lr-rank">' + (i + 1) + "</span>" +
          '<span class="lr-name"><a href="work-detail.html?id=' + w.id + '">' + w.name + "</a></span>" +
          '<span class="lr-sub">' + (w.year || "") + "</span>" +
          '<span class="lr-meta">' + fmtBoxOffice(w.box_office) + " · " + (w.grade || "未评级") + "</span>" +
        "</div>"
      );
    }).join("");
  }

  /* ============================================================
     启动
     ============================================================ */
  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome("movies");

    // 页头统计：总数 / 院线（有票房的）/ 网络上映
    var cinema = WORKS.filter(function (w) { return w.box_office != null; }).length;
    var web = WORKS.filter(function (w) { return w.release_status === "网络上映"; }).length;
    document.getElementById("stat-count").textContent = WORKS.length.toLocaleString();
    document.getElementById("stat-cinema").textContent = cinema.toLocaleString();
    document.getElementById("stat-web").textContent = web.toLocaleString();

    initFilters();
    render();
    renderBoxOffice();
  });
})();
