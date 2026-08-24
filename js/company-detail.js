/* 国产动画资料库 | 公司详情页逻辑
   （已按设计稿改造：KPI 指标卡 + 评级分布条 替代能力雷达图） */
(function () {
  "use strict";

  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* 评级分布条的六档配色（与评级徽标一致） */
  var GRADE_ORDER = ["年度推荐", "佳作", "还行", "能看", "暂未评级", "不推荐"];
  var GD_COLORS = {
    "年度推荐": "var(--cinnabar)",
    "佳作": "var(--gold)",
    "还行": "var(--jade)",
    "能看": "var(--muted)",
    "暂未评级": "var(--border-strong)",
    "不推荐": "#a14a40"
  };

  function kpiCard(label, value, cls) {
    return '<div class="kpi-card"><div class="k-label">' + window.App.escapeHtml(label) + '</div>' +
      '<div class="k-value ' + (cls || "") + '">' + window.App.escapeHtml(value) + "</div></div>";
  }

  function renderKpi(s) {
    var html =
      kpiCard("作品数", s.total + " 部") +
      kpiCard("活跃年份", s.activeYears + " 年") +
      kpiCard("推荐率", s.sampleEnough ? s.recommendRate + "%" : "样本不足", s.sampleEnough ? "gold" : "") +
      kpiCard("翻车率", s.sampleEnough ? s.badRate + "%" : "样本不足", s.sampleEnough ? "cinnabar" : "");
    document.getElementById("kpi-grid").innerHTML = html;
  }

  function renderGradeDist(s) {
    var counts = {};
    GRADE_ORDER.forEach(function (g) { counts[g] = 0; });
    s.works.forEach(function (w) { if (counts[w.grade] != null) counts[w.grade]++; });
    var total = s.works.length;

    var segHtml = "";
    if (total > 0) {
      GRADE_ORDER.forEach(function (g) {
        var c = counts[g];
        if (c === 0) return;
        var pct = (c / total * 100);
        segHtml += '<div class="gd-seg" style="width:' + pct.toFixed(2) + '%;background:' + GD_COLORS[g] + '" title="' + g + ' ' + c + ' 部"></div>';
      });
    }
    document.getElementById("grade-dist").innerHTML = segHtml ||
      '<div style="font-size:var(--fs-small);color:var(--text-3);align-self:center;padding:0 12px">暂无作品</div>';

    var legend = GRADE_ORDER.map(function (g) {
      return '<span class="gd-item"><span class="gd-swatch" style="background:' + GD_COLORS[g] + '"></span>' +
        g + " · " + counts[g] + " 部</span>";
    }).join("");
    document.getElementById("grade-dist-legend").innerHTML = legend;
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome(null);

    var name = getParam("name");
    if (!name || window.App.getAllCompanies().indexOf(name) === -1) {
      var main = document.querySelector(".site-main .container");
      main.innerHTML =
        '<div class="empty-tip" style="margin-top:40px">' +
          '<div class="et-title">未找到该公司</div>链接可能已失效，请从公司总览重新进入。</div>';
      return;
    }

    var s = window.App.getCompanyStats(name);

    document.getElementById("breadcrumb").innerHTML =
      '<a href="index.html">首页</a><span class="sep">/</span>' +
      '<a href="company.html">公司总览</a><span class="sep">/</span>' +
      "<span>" + window.App.escapeHtml(name) + "</span>";

    document.title = name + " | 国产动画资料库";
    document.getElementById("dh-name").textContent = name;

    var compType = null;
    if (window.COMPANIES) {
      var found = window.COMPANIES.filter(function (c) { return c.name === name; })[0];
      if (found && found.type) compType = found.type;
    }
    var techTag = compType || (s.techMixed ? "混合型" : s.techMain);
    document.getElementById("dh-badges").innerHTML =
      window.App.tagHtml(techTag) +
      (s.sampleEnough ? "" : '<span class="badge badge--pending">样本不足</span>');

    document.getElementById("dh-meta").innerHTML =
      '<div class="dm-row"><span class="dm-label">作品数</span><span class="dm-value">' + s.total + " 部</span></div>" +
      '<div class="dm-row"><span class="dm-label">活跃年份</span><span class="dm-value">' + s.activeYears + " 年</span></div>" +
      '<div class="dm-row"><span class="dm-label">推荐率</span><span class="dm-value">' +
      (s.sampleEnough ? s.recommendRate + "%（已评级 " + s.rated + " 部）" : "样本不足（已评级 " + s.rated + " 部）") +
      "</span></div>";

    renderKpi(s);
    renderGradeDist(s);

    /* ---- 作品时间线 ---- */
    var tlFrom = "", tlTo = "";
    var timelineWorks = s.works.slice().sort(function (a, b) { return (a.year || 9999) - (b.year || 9999); });

    function renderTimeline() {
      var list = timelineWorks.filter(function (w) {
        if (tlFrom && w.year && w.year < Number(tlFrom)) return false;
        if (tlTo && w.year && w.year > Number(tlTo)) return false;
        return true;
      });
      var box = document.getElementById("timeline");
      if (!list.length) {
        box.innerHTML = '<span class="db-empty">该年份范围内暂无作品。</span>';
        return;
      }
      var byYear = {};
      list.forEach(function (w) {
        var y = w.year || "?";
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(w);
      });
      var years = Object.keys(byYear).sort(function (a, b) {
        var na = a === "?" ? 99999 : Number(a);
        var nb = b === "?" ? 99999 : Number(b);
        return na - nb;
      });
      var tlInner = document.createElement("div");
      tlInner.className = "tl-inner";
      tlInner.innerHTML = years.map(function (y) {
        var works = byYear[y];
        return (
          '<div class="tl-year has-works">' +
            '<span class="tl-dot" aria-hidden="true"></span>' +
            '<span class="tl-label">' + y + "</span>" +
            '<div class="tl-items">' +
              works.map(function (w) {
                return (
                  '<a class="tl-item" href="work-detail.html?id=' + w.id + '" title="' +
                  window.App.escapeHtml(w.name) + '">' +
                  window.App.escapeHtml(w.name) +
                  ' <span class="tl-grade">' + window.App.escapeHtml(w.grade || "未评级") + "</span></a>"
                );
              }).join("") +
            "</div></div>"
        );
      }).join("");
      box.innerHTML = "";
      box.appendChild(tlInner);
      document.getElementById("tl-sub").textContent = list.length + " 部";
    }

    var tlBox = document.getElementById("timeline");
    var tlPrev = document.getElementById("tl-prev");
    var tlNext = document.getElementById("tl-next");
    function updateTlNav() {
      var max = tlBox.scrollWidth - tlBox.clientWidth;
      tlPrev.disabled = tlBox.scrollLeft <= 1;
      tlNext.disabled = tlBox.scrollLeft >= max - 1;
    }
    tlPrev.addEventListener("click", function () { tlBox.scrollBy({ left: -tlBox.clientWidth * 0.7, behavior: "smooth" }); });
    tlNext.addEventListener("click", function () { tlBox.scrollBy({ left: tlBox.clientWidth * 0.7, behavior: "smooth" }); });
    tlBox.addEventListener("scroll", updateTlNav);
    window.addEventListener("resize", updateTlNav);
    tlBox.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        tlBox.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    document.getElementById("f-year-from").addEventListener("input", function (e) { tlFrom = e.target.value; renderTimeline(); });
    document.getElementById("f-year-to").addEventListener("input", function (e) { tlTo = e.target.value; renderTimeline(); });

    /* ---- 旗下作品 ---- */
    var gradeSet = new Set();
    var sortMode = "year-desc";
    var GORDER = { "年度推荐": 1, "佳作": 2, "还行": 3, "能看": 4, "暂未评级": 5, "不推荐": 6 };

    var gradeBox = document.getElementById("f-grade");
    ["年度推荐", "佳作", "还行", "能看", "暂未评级", "不推荐"].forEach(function (g) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.value = g;
      chip.setAttribute("aria-pressed", "false");
      chip.textContent = g;
      chip.addEventListener("click", function () {
        var pressed = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", pressed ? "false" : "true");
        if (pressed) gradeSet.delete(g); else gradeSet.add(g);
        renderWorks();
      });
      gradeBox.appendChild(chip);
    });

    document.getElementById("f-sort").addEventListener("change", function (e) {
      sortMode = e.target.value;
      renderWorks();
    });

    function renderWorks() {
      var list = s.works.filter(function (w) { return !gradeSet.size || gradeSet.has(w.grade); });
      list.sort(function (a, b) {
        if (sortMode === "grade") return (GORDER[a.grade] || 9) - (GORDER[b.grade] || 9);
        if (sortMode === "year-asc") return (a.year || 0) - (b.year || 0);
        return (b.year || 0) - (a.year || 0);
      });
      document.getElementById("works-sub").textContent = list.length + " 部（剧集 + 电影）";
      window.App.renderWorkCards(document.getElementById("work-grid"), list);
    }

    renderTimeline();
    renderWorks();
    window.App.initReveal();
  });
})();
