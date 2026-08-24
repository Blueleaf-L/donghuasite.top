/* 国产动画资料库 | 动画电影列表逻辑 */
(function () {
  "use strict";

  var PAGE_SIZE = 24;
  var visibleCount = PAGE_SIZE;

  var state = {
    q: "", yearFrom: "", yearTo: "",
    tech: new Set(), adaptation: new Set(), grade: new Set(), status: new Set(),
    sort: "year-desc"
  };

  var WORKS = window.TV_DATA.filter(function (w) { return w.type === "movie"; });

  function techDisplay(t) { return window.App.fmtTech(t); }

  function collectValues(getter, displayFn) {
    var map = {};
    WORKS.forEach(function (w) {
      var raw = getter(w);
      if (!raw) return;
      var list = Array.isArray(raw) ? raw : [raw];
      list.forEach(function (v) {
        if (!v) return;
        var key = displayFn ? displayFn(v) : v;
        map[key] = (map[key] || 0) + 1;
      });
    });
    return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
  }

  function buildChips(containerId, values, onToggle) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = values.map(function (v) {
      return '<button type="button" class="chip" data-value="' + window.App.escapeHtml(v) + '" aria-pressed="false">' + window.App.escapeHtml(v) + "</button>";
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

  function initFilters() {
    buildChips("f-tech", collectValues(function (w) { return w.tech; }, techDisplay),
      function (v, on) { on ? state.tech.add(v) : state.tech.delete(v); render(true); });
    buildChips("f-adaptation", collectValues(function (w) { return w.adaptation; }),
      function (v, on) { on ? state.adaptation.add(v) : state.adaptation.delete(v); render(true); });
    buildChips("f-grade", ["年度推荐", "佳作", "还行", "能看", "暂未评级", "不推荐"],
      function (v, on) { on ? state.grade.add(v) : state.grade.delete(v); render(true); });
    buildChips("f-status", ["上映中", "已下映", "网络上映", "未公映"],
      function (v, on) { on ? state.status.add(v) : state.status.delete(v); render(true); });

    document.getElementById("f-q").addEventListener("input", debounce(function () {
      state.q = document.getElementById("f-q").value.trim();
      render(true);
    }, 200));
    document.getElementById("f-year-from").addEventListener("input", function (e) { state.yearFrom = e.target.value; render(true); });
    document.getElementById("f-year-to").addEventListener("input", function (e) { state.yearTo = e.target.value; render(true); });
    document.getElementById("f-sort").addEventListener("change", function (e) { state.sort = e.target.value; render(true); });

    document.getElementById("load-more").addEventListener("click", function () {
      visibleCount += PAGE_SIZE;
      render(false);
    });
  }

  function applyFilter() {
    var list = WORKS.filter(function (w) {
      if (state.q) {
        var hay = w.name + " " + (w.director || "") + " " + (w.company || "");
        if (hay.indexOf(state.q) === -1) return false;
      }
      if (state.yearFrom && w.year && w.year < Number(state.yearFrom)) return false;
      if (state.yearTo && w.year && w.year > Number(state.yearTo)) return false;
      if (state.tech.size && !state.tech.has(techDisplay(w.tech))) return false;
      if (state.adaptation.size) {
        var adList = Array.isArray(w.adaptation) ? w.adaptation : [w.adaptation];
        if (!adList.some(function (a) { return state.adaptation.has(a); })) return false;
      }
      if (state.grade.size && !state.grade.has(w.grade)) return false;
      if (state.status.size && !state.status.has(w.release_status)) return false;
      return true;
    });

    var GRADE_ORDER = { "年度推荐": 1, "佳作": 2, "还行": 3, "能看": 4, "暂未评级": 5, "不推荐": 6 };
    list.sort(function (a, b) {
      switch (state.sort) {
        case "year-desc": return (b.year || 0) - (a.year || 0);
        case "year-asc": return (a.year || 0) - (b.year || 0);
        case "grade": return (GRADE_ORDER[a.grade] || 9) - (GRADE_ORDER[b.grade] || 9);
        case "name": return a.name.localeCompare(b.name, "zh-Hans-CN");
        default: return 0;
      }
    });
    return list;
  }

  function render(reset) {
    if (reset) visibleCount = PAGE_SIZE;
    var list = applyFilter();
    var shown = list.slice(0, visibleCount);
    document.getElementById("result-count").textContent = list.length;
    window.App.renderWorkCards(document.getElementById("work-grid"), shown);
    document.getElementById("load-more-wrap").hidden = visibleCount >= list.length;
  }

  /* 票房格式化（万元） */
  function fmtBoxOffice(v) {
    if (v == null) return "";
    if (v >= 10000) {
      var yi = v / 10000;
      return yi.toFixed(2).replace(/\.?0+$/, "") + " 亿";
    }
    return v.toLocaleString() + " 万";
  }

  function renderBoxOffice() {
    var list = WORKS
      .filter(function (w) { return w.box_office != null; })
      .sort(function (a, b) { return b.box_office - a.box_office; });

    var box = document.getElementById("box-office-list");
    if (!list.length) {
      box.innerHTML = '<div class="list-row"><span class="lr-sub">暂无票房数据，整理中。</span></div>';
      return;
    }
    box.innerHTML = list.map(function (w, i) {
      var rankCls = i === 0 ? "r1" : i === 1 ? "r2" : i === 2 ? "r3" : "rn";
      return (
        '<div class="list-row">' +
          '<span class="rank-badge ' + rankCls + '">' + (i + 1) + "</span>" +
          '<span class="lr-name"><a href="work-detail.html?id=' + w.id + '">' + window.App.escapeHtml(w.name) + "</a></span>" +
          '<span class="lr-sub">' + (w.year || "") + "</span>" +
          '<span class="lr-meta">' + fmtBoxOffice(w.box_office) + " · " + window.App.escapeHtml(w.grade || "未评级") + "</span>" +
        "</div>"
      );
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome("movies");

    var cinema = WORKS.filter(function (w) { return w.box_office != null; }).length;
    var web = WORKS.filter(function (w) { return w.release_status === "网络上映"; }).length;
    document.getElementById("stat-count").textContent = WORKS.length.toLocaleString();
    document.getElementById("stat-cinema").textContent = cinema.toLocaleString();
    document.getElementById("stat-web").textContent = web.toLocaleString();

    initFilters();
    render(true);
    renderBoxOffice();
    window.App.initReveal();
  });
})();
