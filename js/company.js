/* 国产动画资料库 | 公司总览列表逻辑 */
(function () {
  "use strict";

  var state = {
    q: "",
    tech: new Set(),
    sort: "works"
  };

  var companies = [];
  var TECH_ORDER = ["2D", "3D", "三渲二", "混合型", "其他"];
  var bubbleChart = null;

  function buildCompanies() {
    companies = window.App.getAllCompanies().map(function (name) {
      var s = window.App.getCompanyStats(name);
      var compType = null;
      if (window.COMPANIES) {
        var found = window.COMPANIES.filter(function (c) { return c.name === name; })[0];
        if (found && found.type) compType = found.type;
      }
      var techLabel = compType || (s.techMixed ? "混合型" : s.techMain);
      return {
        name: name,
        tech: techLabel,
        total: s.total,
        rated: s.rated,
        recommendRate: s.recommendRate,
        activeYears: s.activeYears,
        sampleEnough: s.sampleEnough
      };
    });
  }

  function initTechChips() {
    var techs = [];
    companies.forEach(function (c) { if (techs.indexOf(c.tech) === -1) techs.push(c.tech); });
    techs.sort(function (a, b) {
      var ia = TECH_ORDER.indexOf(a), ib = TECH_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    var box = document.getElementById("f-tech");
    box.innerHTML = techs.map(function (t) {
      return '<button type="button" class="chip" data-value="' + window.App.escapeHtml(t) + '" aria-pressed="false">' + window.App.escapeHtml(t) + "</button>";
    }).join("");
    box.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var pressed = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", pressed ? "false" : "true");
        if (pressed) state.tech.delete(chip.dataset.value);
        else state.tech.add(chip.dataset.value);
        render();
      });
    });
  }

  function applyFilter() {
    var list = companies.filter(function (c) {
      if (state.q && c.name.indexOf(state.q) === -1) return false;
      if (state.tech.size && !state.tech.has(c.tech)) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (state.sort === "rate") {
        if (a.sampleEnough !== b.sampleEnough) return a.sampleEnough ? -1 : 1;
        return (b.recommendRate || 0) - (a.recommendRate || 0);
      }
      if (state.sort === "years") return b.activeYears - a.activeYears;
      return b.total - a.total;
    });
    return list;
  }

  function rateClass(rate) {
    if (rate == null) return "rate-na";
    if (rate >= 70) return "rate-high";
    if (rate >= 40) return "rate-mid";
    return "rate-low";
  }

  function render() {
    var list = applyFilter();
    document.getElementById("result-count").textContent = list.length;

    var box = document.getElementById("company-list");
    if (!list.length) {
      box.innerHTML =
        '<div class="empty-tip"><div class="et-ico">🏢</div><div class="et-title">没有符合条件的公司</div>请调整筛选条件。</div>';
      return;
    }

    box.innerHTML =
      '<div class="list-panel" style="margin-top:var(--sp-4)"><div class="lp-head"><h2>公司列表</h2><span class="cnt">' +
      list.length + " 家</span></div>" +
      list.map(function (c) {
        var rateHtml = c.sampleEnough
          ? '<span class="' + rateClass(c.recommendRate) + '">' + c.recommendRate + "%</span>"
          : '<span class="rate-na">样本不足</span>';
        return (
          '<div class="list-row">' +
            '<span class="lr-name"><a href="company-detail.html?name=' + encodeURIComponent(c.name) + '">' +
            window.App.escapeHtml(c.name) + "</a></span>" +
            '<span class="lr-sub">' + window.App.escapeHtml(c.tech) + "</span>" +
            '<span class="lr-meta">' +
              c.total + " 部 · " + c.activeYears + " 个年份 · 推荐率 " + rateHtml +
            "</span>" +
          "</div>"
        );
      }).join("") + "</div>";
  }

  /* ============================================================
     制作类型气泡图（ECharts，主题自适应）
     ============================================================ */
  function bubbleColors(t) {
    var ct = window.App.chartTheme();
    var map = {
      "2D": ct.jade,
      "3D": ct.accent,
      "三渲二": ct.gold,
      "混合型": ct.ink,
      "其他": ct.text
    };
    return map[t] || ct.ink;
  }

  function renderBubble() {
    var el = document.getElementById("bubble-chart");
    if (!window.echarts) {
      el.innerHTML = '<p class="db-empty">图表库加载失败（需联网加载 ECharts），列表数据不受影响。</p>';
      return;
    }
    var ct = window.App.chartTheme();

    if (bubbleChart) { bubbleChart.dispose(); bubbleChart = null; }
    bubbleChart = echarts.init(el);

    var seriesData = {};
    companies.forEach(function (c) {
      var key = c.tech;
      if (!seriesData[key]) seriesData[key] = [];
      seriesData[key].push({
        name: c.name,
        value: [c.total, c.sampleEnough ? c.recommendRate : 0, c.total],
        insuf: !c.sampleEnough
      });
    });

    var series = Object.keys(seriesData).map(function (key) {
      return {
        name: key,
        type: "scatter",
        data: seriesData[key],
        symbolSize: function (val) { return Math.max(9, Math.min(44, Math.sqrt(val[2]) * 3.4)); },
        itemStyle: { color: bubbleColors(key), opacity: 0.85 },
        emphasis: { focus: "series", itemStyle: { opacity: 1 } }
      };
    });
    series.forEach(function (s) {
      s.data.forEach(function (d) {
        if (d.insuf) {
          d.itemStyle = { color: ct.text, opacity: 0.28 };
        }
      });
    });

    bubbleChart.setOption({
      grid: { left: 52, right: 28, top: 40, bottom: 44 },
      tooltip: {
        trigger: "item",
        backgroundColor: ct.tooltip.backgroundColor,
        borderColor: ct.tooltip.borderColor,
        textStyle: ct.tooltip.textStyle,
        extraCssText: ct.tooltip.extraCssText,
        formatter: function (p) {
          var d = p.data;
          return (
            "<strong>" + window.App.escapeHtml(d.name) + "</strong><br>" +
            "作品数：" + d.value[0] + "<br>" +
            "推荐率：" + (d.insuf ? "样本不足" : d.value[1] + "%") + "<br>" +
            "制作类型：" + p.seriesName
          );
        }
      },
      legend: { top: 0, textStyle: { color: ct.textStrong } },
      xAxis: {
        type: "value", name: "作品数", min: 0,
        nameTextStyle: { color: ct.text },
        splitLine: { lineStyle: { color: ct.gridLine } },
        axisLabel: { color: ct.text },
        axisLine: { lineStyle: { color: ct.axisLine } }
      },
      yAxis: {
        type: "value", name: "推荐率 %", min: 0, max: 100,
        nameTextStyle: { color: ct.text },
        splitLine: { lineStyle: { color: ct.gridLine } },
        axisLabel: { color: ct.text },
        axisLine: { lineStyle: { color: ct.axisLine } }
      },
      series: series
    });

    bubbleChart.on("click", function (p) {
      if (p.data && p.data.name) {
        location.href = "company-detail.html?name=" + encodeURIComponent(p.data.name);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome("company");
    buildCompanies();
    document.getElementById("stat-count").textContent = companies.length.toLocaleString();

    initTechChips();

    var qInput = document.getElementById("f-q");
    var debounce = null;
    qInput.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { state.q = qInput.value.trim(); render(); }, 200);
    });
    document.getElementById("f-sort").addEventListener("change", function (e) {
      state.sort = e.target.value;
      render();
    });

    render();
    renderBubble();

    window.App.onThemeChange(function () { renderBubble(); });
    window.addEventListener("resize", function () { if (bubbleChart) bubbleChart.resize(); });
    window.App.initReveal();
  });
})();
