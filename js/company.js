/* ============================================================
   国产动画资料库 | 公司总览列表逻辑 js/company.js
   ------------------------------------------------------------
   职责：
   1. 挂载公共骨架（导航 + 页脚）
   2. 从作品数据聚合公司列表（统计指标来自 App.getCompanyStats）
   3. 筛选（关键词 / 制作类型）+ 排序（作品数 / 活跃年份 / 推荐率）
   4. 渲染公司列表（行式）
   5. 渲染制作类型气泡图（ECharts，离线时降级提示）

   品控规则（设想 §5.3.2 / §10-5）：
   - 推荐率 = 年度推荐作品数 / 已评级作品数
   - 已评级 < 3 部 → "样本不足"，不参与推荐率排序（置底），气泡置灰
   ============================================================ */
(function () {
  "use strict";

  // 筛选状态
  var state = {
    q: "",
    tech: new Set(), // 制作类型多选（含"混合型"）
    sort: "works"
  };

  /** 全部公司（名称 + 统计指标）。 */
  var companies = [];

  /** 制作类型显示顺序。 */
  var TECH_ORDER = ["2D", "3D", "三渲二", "混合型", "其他"];

  /** 聚合全部公司的统计。 */
  function buildCompanies() {
    companies = window.App.getAllCompanies().map(function (name) {
      var s = window.App.getCompanyStats(name);
      // 制作类型：混合型优先标注（主要类型占比 < 70% 且不止一种）
      var techLabel = s.techMixed ? "混合型" : s.techMain;
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

  /** 制作类型筛选选项（按数据实际出现顺序 + 混合型）。 */
  function initTechChips() {
    var techs = [];
    companies.forEach(function (c) { if (techs.indexOf(c.tech) === -1) techs.push(c.tech); });
    techs.sort(function (a, b) {
      var ia = TECH_ORDER.indexOf(a), ib = TECH_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    var box = document.getElementById("f-tech");
    box.innerHTML = techs.map(function (t) {
      return '<button type="button" class="chip" data-value="' + t + '" aria-pressed="false">' + t + "</button>";
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

  /** 过滤 + 排序。样本不足的公司不参与"推荐率"排序（恒置底）。 */
  function applyFilter() {
    var list = companies.filter(function (c) {
      if (state.q && c.name.indexOf(state.q) === -1) return false;
      if (state.tech.size && !state.tech.has(c.tech)) return false;
      return true;
    });
    list.sort(function (a, b) {
      // 推荐率排序：样本不足一律置底
      if (state.sort === "rate") {
        if (a.sampleEnough !== b.sampleEnough) return a.sampleEnough ? -1 : 1;
        return (b.recommendRate || 0) - (a.recommendRate || 0);
      }
      if (state.sort === "years") return b.activeYears - a.activeYears;
      return b.total - a.total; // 默认作品数
    });
    return list;
  }

  /** 渲染公司列表。 */
  function render() {
    var list = applyFilter();
    document.getElementById("result-count").textContent = list.length;

    var box = document.getElementById("company-list");
    if (!list.length) {
      box.innerHTML =
        '<div class="empty-tip"><div class="et-title">没有符合条件的公司</div>请调整筛选条件。</div>';
      return;
    }

    box.innerHTML =
      '<div class="list-panel"><div class="lp-head"><h2>公司列表</h2><span class="cnt">' +
      list.length + " 家</span></div>" +
      list.map(function (c) {
        var rateText = c.sampleEnough ? c.recommendRate + "%" : "样本不足";
        var rateHtml = c.sampleEnough
          ? rateText
          : '<span style="color:var(--text-3)">样本不足</span>';
        return (
          '<div class="list-row">' +
            '<span class="lr-name"><a href="company-detail.html?name=' + encodeURIComponent(c.name) + '">' +
            window.App.escapeHtml(c.name) + "</a></span>" +
            '<span class="lr-sub">' + window.App.escapeHtml(c.tech) + "</span>" +
            '<span class="lr-meta">' +
              c.total + " 部作品 · " + c.activeYears + " 个年份 · 推荐率 " + rateHtml +
            "</span>" +
          "</div>"
        );
      }).join("") + "</div>";
  }

  /* ============================================================
     制作类型气泡图（ECharts）
     ============================================================ */

  /** 气泡颜色：按制作类型分配（朱砂体系内变化，保持单色系）。 */
  var BUBBLE_COLORS = {
    "2D": "#b23a30",
    "3D": "#952a21",
    "三渲二": "#d98a80",
    "混合型": "#6b635a",
    "其他": "#a8a092"
  };

  /** 渲染气泡图。无 ECharts（离线）时显示降级提示。 */
  function renderBubble() {
    var el = document.getElementById("bubble-chart");
    if (!window.echarts) {
      el.innerHTML = '<p class="db-empty">图表库加载失败（需联网加载 ECharts），列表数据不受影响。</p>';
      return;
    }

    var chart = echarts.init(el);
    // 按制作类型分组（图例可点选过滤，ECharts legend 自带）
    var seriesData = {};
    companies.forEach(function (c) {
      var key = c.tech;
      if (!seriesData[key]) seriesData[key] = [];
      seriesData[key].push({
        name: c.name,
        value: [
          c.total,                    // X：作品数（产能）
          c.sampleEnough ? c.recommendRate : 0, // Y：推荐率（样本不足置 0）
          c.total                     // 气泡大小：作品数
        ],
        sampleEnough: !c.sampleEnough
      });
    });

    var series = Object.keys(seriesData).map(function (key) {
      return {
        name: key,
        type: "scatter",
        data: seriesData[key],
        symbolSize: function (val) { return Math.max(8, Math.min(40, Math.sqrt(val[2]) * 3)); },
        itemStyle: {
          color: BUBBLE_COLORS[key] || "#a8a092",
          opacity: function () { return 1; }
        },
        emphasis: { focus: "series" }
      };
    });
    // 样本不足的气泡置灰：单独处理 data 级 itemStyle
    series.forEach(function (s) {
      s.data.forEach(function (d) {
        if (d.sampleEnough) {
          d.itemStyle = { color: "#c9c2b4", opacity: 0.7 };
        }
      });
    });

    chart.setOption({
      grid: { left: 48, right: 24, top: 36, bottom: 40 },
      tooltip: {
        trigger: "item",
        formatter: function (p) {
          var d = p.data;
          return (
            "<strong>" + window.App.escapeHtml(d.name) + "</strong><br>" +
            "作品数：" + d.value[0] + "<br>" +
            "推荐率：" + (d.sampleEnough ? d.value[1] + "%" : "样本不足") + "<br>" +
            "制作类型：" + p.seriesName
          );
        }
      },
      legend: { top: 0, data: Object.keys(seriesData) },
      xAxis: {
        type: "value", name: "作品数", min: 0,
        splitLine: { lineStyle: { color: "#eee7da" } }
      },
      yAxis: {
        type: "value", name: "推荐率 %", min: 0, max: 100,
        splitLine: { lineStyle: { color: "#eee7da" } }
      },
      series: series
    });

    // 点击气泡 → 公司详情页
    chart.on("click", function (p) {
      if (p.data && p.data.name) {
        location.href = "company-detail.html?name=" + encodeURIComponent(p.data.name);
      }
    });

    // 窗口缩放自适应
    window.addEventListener("resize", function () { chart.resize(); });
  }

  /* ============================================================
     启动
     ============================================================ */
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
  });
})();
