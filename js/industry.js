/* ============================================================
   国产动画资料库 | 行业资讯页逻辑 js/industry.js
   ------------------------------------------------------------
   职责：从作品数据聚合统计，渲染 5 个 ECharts 图表：
   1. 年度产量趋势（柱状）
   2. 技术类型构成（堆叠柱状）
   3. 评级分布年度变化（堆叠柱状）
   4. 改编来源构成（堆叠柱状）
   5. 公司产量 TOP10（横向柱状，中性统计）

   颜色体系：朱砂单色系 + 纸墨灰阶（与全站一致，见 style.css 令牌）
   离线时（ECharts CDN 加载失败）全部图表降级为文字提示。
   ============================================================ */
(function () {
  "use strict";

  /** 全部作品。 */
  var WORKS = window.TV_DATA || [];

  /* ---- 配色（保持全站单色系） ---- */
  var COLORS = {
    // 技术类型
    tech: { "2D": "#b23a30", "3D": "#6b635a", "三渲二": "#d98a80", "其他": "#c9c2b4" },
    // 评级（优 → 差）
    grade: {
      "年度推荐": "#b23a30", "佳作": "#26221d", "还行": "#8a6f5a",
      "能看": "#a8a092", "暂未评级": "#d6cdbb", "不推荐": "#9a2b23"
    },
    // 改编来源
    adaptation: {
      "原创": "#b23a30", "小说改": "#6b635a", "漫画改": "#d98a80",
      "游戏改": "#a8a092", "其他": "#c9c2b4"
    }
  };

  /* ============================================================
     数据聚合（按年份，仅收录有效年份的作品）
     ============================================================ */

  /** 年份数组（升序，含数据的年份）。 */
  function years() {
    var set = {};
    WORKS.forEach(function (w) { if (w.year) set[w.year] = true; });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }

  /** 年度产量：{ year: count } */
  function yearlyTotal(ys) {
    var map = {};
    ys.forEach(function (y) { map[y] = 0; });
    WORKS.forEach(function (w) { if (w.year && map[w.year] != null) map[w.year]++; });
    return map;
  }

  /** 年度 × 分类 计数：{ year: { key: count } }，keys 为外部传入的类别数组。 */
  function yearlyBy(ys, keys, getter) {
    var map = {};
    ys.forEach(function (y) {
      var m = {};
      keys.forEach(function (k) { m[k] = 0; });
      map[y] = m;
    });
    WORKS.forEach(function (w) {
      if (!w.year || !map[w.year]) return;
      var key = getter(w);
      if (key && map[w.year][key] != null) map[w.year][key]++;
    });
    return map;
  }

  /** 技术类型对外名（"特殊类型" → "其他"）。 */
  function techKey(w) { return w.tech === "特殊类型" ? "其他" : w.tech; }

  /* ============================================================
     图表渲染
     ============================================================ */

  /** 统一降级提示（CDN 离线）。 */
  function fallback(elId) {
    document.getElementById(elId).innerHTML =
      '<p class="db-empty">图表库加载失败（需联网加载 ECharts）。</p>';
  }

  /** 通用 x 轴配置。 */
  function xAxisConfig(cat) {
    return {
      type: "category",
      data: cat,
      axisLine: { lineStyle: { color: "#d6cdbb" } },
      axisLabel: { color: "#766d5f", fontSize: 11 },
      axisTick: { show: false }
    };
  }

  /** 通用 y 轴配置。 */
  function yAxisConfig() {
    return {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: "#eee7da" } },
      axisLabel: { color: "#766d5f", fontSize: 11 }
    };
  }

  /** 堆叠柱状图通用构建。 */
  function stackedBar(elId, cat, keys, dataMap, colors, stackName) {
    var chart = echarts.init(document.getElementById(elId));
    chart.setOption({
      grid: { left: 40, right: 16, top: 36, bottom: 28 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0, textStyle: { color: "#6b635a", fontSize: 12 } },
      xAxis: xAxisConfig(cat),
      yAxis: yAxisConfig(),
      series: keys.map(function (k) {
        return {
          name: k, type: "bar", stack: stackName,
          data: cat.map(function (y) { return dataMap[y][k]; }),
          itemStyle: { color: colors[k] },
          emphasis: { focus: "series" }
        };
      })
    });
    return chart;
  }

  /** 渲染全部图表。 */
  function renderAll() {
    var charts = [];
    var ys = years();
    var cat = ys.map(String);

    // 1. 年度产量趋势（柱状）
    (function () {
      var map = yearlyTotal(ys);
      var chart = echarts.init(document.getElementById("chart-yearly"));
      chart.setOption({
        grid: { left: 40, right: 16, top: 24, bottom: 28 },
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        xAxis: xAxisConfig(cat),
        yAxis: yAxisConfig(),
        series: [{
          name: "新作数", type: "bar",
          data: cat.map(function (y) { return map[Number(y)]; }),
          itemStyle: { color: "#b23a30", borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 18
        }]
      });
      charts.push(chart);
    })();

    // 2. 技术类型构成（堆叠柱状）
    (function () {
      var keys = ["2D", "3D", "三渲二", "其他"];
      var map = yearlyBy(ys, keys, techKey);
      charts.push(stackedBar("chart-tech", cat, keys, map, COLORS.tech, "tech"));
    })();

    // 3. 评级分布年度变化（堆叠柱状）
    (function () {
      var keys = ["年度推荐", "佳作", "还行", "能看", "暂未评级", "不推荐"];
      var map = yearlyBy(ys, keys, function (w) { return w.grade; });
      charts.push(stackedBar("chart-grade", cat, keys, map, COLORS.grade, "grade"));
    })();

    // 4. 改编来源构成（堆叠柱状）
    (function () {
      var keys = ["原创", "小说改", "漫画改", "游戏改", "其他"];
      var map = yearlyBy(ys, keys, function (w) { return w.adaptation; });
      charts.push(stackedBar("chart-adaptation", cat, keys, map, COLORS.adaptation, "adapt"));
    })();

    // 5. 公司产量 TOP10（横向柱状，中性统计）
    (function () {
      var map = {};
      WORKS.forEach(function (w) {
        if (w.company) map[w.company] = (map[w.company] || 0) + 1;
      });
      var top = Object.keys(map)
        .sort(function (a, b) { return map[b] - map[a]; })
        .slice(0, 10)
        .reverse(); // 反转使第一名在顶部
      var chart = echarts.init(document.getElementById("chart-company"));
      chart.setOption({
        grid: { left: 90, right: 40, top: 16, bottom: 24 },
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eee7da" } }, axisLabel: { color: "#766d5f", fontSize: 11 } },
        yAxis: {
          type: "category", data: top,
          axisLine: { lineStyle: { color: "#d6cdbb" } },
          axisLabel: { color: "#6b635a", fontSize: 12 }
        },
        series: [{
          name: "作品数", type: "bar",
          data: top.map(function (c) { return map[c]; }),
          itemStyle: { color: "#6b635a", borderRadius: [0, 3, 3, 0] },
          barMaxWidth: 16
        }]
      });
      charts.push(chart);
    })();

    // 窗口缩放统一自适应
    window.addEventListener("resize", function () {
      charts.forEach(function (c) { c.resize(); });
    });
  }

  /* ============================================================
     启动
     ============================================================ */
  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome("industry");
    if (!window.echarts) {
      ["chart-yearly", "chart-tech", "chart-grade", "chart-adaptation", "chart-company"]
        .forEach(fallback);
      return;
    }
    renderAll();
  });
})();
