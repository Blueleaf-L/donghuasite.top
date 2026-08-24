/* 国产动画资料库 | 数据统计页逻辑
   （「年度推荐占比走势」折线替代原「评级分布堆叠柱」） */
(function () {
  "use strict";

  var WORKS = window.TV_DATA || [];
  var charts = [];

  function palette() {
    var ct = window.App.chartTheme();
    return {
      tech: { "2D": ct.jade, "3D": ct.accent, "三渲二": ct.gold, "其他": ct.ink },
      adaptation: {
        "原创": ct.accent, "小说改": ct.jade, "漫画改": ct.gold,
        "游戏改": "#7f9cc4", "神话传说改": "#b0815a", "剧集改": ct.ink, "其他": "#9a9a94"
      }
    };
  }

  function years() {
    var set = {};
    WORKS.forEach(function (w) { if (w.year) set[w.year] = true; });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }

  function yearlyTotal(ys) {
    var map = {};
    ys.forEach(function (y) { map[y] = 0; });
    WORKS.forEach(function (w) { if (w.year && map[w.year] != null) map[w.year]++; });
    return map;
  }

  function yearlyBy(ys, keys, getter) {
    var map = {};
    ys.forEach(function (y) {
      var m = {};
      keys.forEach(function (k) { m[k] = 0; });
      map[y] = m;
    });
    WORKS.forEach(function (w) {
      if (!w.year || !map[w.year]) return;
      var raw = getter(w);
      var list = Array.isArray(raw) ? raw : [raw];
      list.forEach(function (key) { if (key && map[w.year][key] != null) map[w.year][key]++; });
    });
    return map;
  }

  function techKey(w) { return w.tech === "特殊类型" ? "其他" : w.tech; }

  function disposeAll() {
    charts.forEach(function (c) { try { c.dispose(); } catch (e) {} });
    charts = [];
  }

  function axisTheme(ct) {
    return {
      axisLine: { lineStyle: { color: ct.axisLine } },
      axisLabel: { color: ct.text, fontSize: 11 },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: ct.gridLine } }
    };
  }

  function tipTheme(ct) {
    return {
      backgroundColor: ct.tooltip.backgroundColor,
      borderColor: ct.tooltip.borderColor,
      textStyle: ct.tooltip.textStyle,
      extraCssText: ct.tooltip.extraCssText
    };
  }

  function stackedBar(elId, cat, keys, dataMap, colors, stackName) {
    var ct = window.App.chartTheme();
    var chart = echarts.init(document.getElementById(elId));
    charts.push(chart);
    chart.setOption({
      grid: { left: 40, right: 16, top: 40, bottom: 28 },
      tooltip: Object.assign({ trigger: "axis", axisPointer: { type: "shadow" } }, tipTheme(ct)),
      legend: { top: 0, textStyle: { color: ct.textStrong, fontSize: 12 } },
      xAxis: Object.assign({ type: "category", data: cat }, axisTheme(ct)),
      yAxis: Object.assign({ type: "value", minInterval: 1 }, axisTheme(ct)),
      series: keys.map(function (k) {
        return {
          name: k, type: "bar", stack: stackName,
          data: cat.map(function (y) { return dataMap[y][k]; }),
          itemStyle: { color: colors[k] },
          emphasis: { focus: "series" }
        };
      })
    });
  }

  function renderAll() {
    disposeAll();
    var ct = window.App.chartTheme();
    var col = palette();
    var ys = years();
    var cat = ys.map(String);

    // 1. 年度产量趋势
    (function () {
      var map = yearlyTotal(ys);
      var chart = echarts.init(document.getElementById("chart-yearly"));
      charts.push(chart);
      chart.setOption({
        grid: { left: 40, right: 16, top: 24, bottom: 28 },
        tooltip: Object.assign({ trigger: "axis", axisPointer: { type: "shadow" } }, tipTheme(ct)),
        xAxis: Object.assign({ type: "category", data: cat }, axisTheme(ct)),
        yAxis: Object.assign({ type: "value", minInterval: 1 }, axisTheme(ct)),
        series: [{
          name: "新作数", type: "bar",
          data: cat.map(function (y) { return map[Number(y)]; }),
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: ct.accent }, { offset: 1, color: ct.jade }
            ])
          },
          barMaxWidth: 20
        }]
      });
    })();

    // 2. 技术类型构成
    stackedBar("chart-tech", cat, ["2D", "3D", "三渲二", "其他"],
      yearlyBy(ys, ["2D", "3D", "三渲二", "其他"], techKey), col.tech, "tech");

    // 3. 年度推荐占比走势（折线）
    (function () {
      var rates = {};
      ys.forEach(function (y) {
        var rated = WORKS.filter(function (w) { return w.year === y && w.grade && w.grade !== "暂未评级"; });
        var good = rated.filter(function (w) { return w.grade === "年度推荐" || w.grade === "佳作"; });
        rates[y] = rated.length ? +(good.length / rated.length * 100).toFixed(1) : null;
      });
      var chart = echarts.init(document.getElementById("chart-recommend"));
      charts.push(chart);
      chart.setOption({
        grid: { left: 44, right: 24, top: 24, bottom: 28 },
        tooltip: Object.assign({
          trigger: "axis",
          formatter: function (p) {
            var d = p[0];
            return d.value == null
              ? d.axisValue + " 年<br>暂无已评级作品"
              : d.axisValue + " 年<br>推荐 + 佳作占比：" + d.value + "%";
          }
        }, tipTheme(ct)),
        xAxis: Object.assign({ type: "category", data: cat, boundaryGap: false }, axisTheme(ct)),
        yAxis: Object.assign({ type: "value", min: 0, max: 100 }, axisTheme(ct), {
          axisLabel: { color: ct.text, fontSize: 11, formatter: "{value}%" }
        }),
        series: [{
          name: "年度推荐+佳作占比", type: "line",
          data: cat.map(function (y) { return rates[Number(y)]; }),
          smooth: true, connectNulls: false,
          symbol: "circle", symbolSize: 6,
          lineStyle: { width: 2.5, color: ct.cinnabar },
          itemStyle: { color: ct.cinnabar },
          areaStyle: { color: "rgba(194,64,47,0.09)" }
        }]
      });
    })();

    // 4. 改编来源构成
    stackedBar("chart-adaptation", cat, ["原创", "小说改", "漫画改", "游戏改", "神话传说改", "剧集改", "其他"],
      yearlyBy(ys, ["原创", "小说改", "漫画改", "游戏改", "神话传说改", "剧集改", "其他"], function (w) { return w.adaptation; }),
      col.adaptation, "adapt");

    // 5. 公司产量 TOP10
    (function () {
      var map = {};
      WORKS.forEach(function (w) { if (w.company) map[w.company] = (map[w.company] || 0) + 1; });
      var top = Object.keys(map)
        .sort(function (a, b) { return map[b] - map[a]; })
        .slice(0, 10)
        .reverse();
      var chart = echarts.init(document.getElementById("chart-company"));
      charts.push(chart);
      chart.setOption({
        grid: { left: 110, right: 48, top: 16, bottom: 24 },
        tooltip: Object.assign({ trigger: "axis", axisPointer: { type: "shadow" } }, tipTheme(ct)),
        xAxis: Object.assign({ type: "value", minInterval: 1 }, axisTheme(ct)),
        yAxis: {
          type: "category", data: top,
          axisLine: { lineStyle: { color: ct.axisLine } },
          axisLabel: { color: ct.textStrong, fontSize: 12 },
          axisTick: { show: false }
        },
        series: [{
          name: "作品数", type: "bar",
          data: top.map(function (c) { return map[c]; }),
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: ct.jade }, { offset: 1, color: ct.accent }
            ])
          },
          barMaxWidth: 16
        }]
      });
    })();
  }

  function fallback() {
    ["chart-yearly", "chart-tech", "chart-recommend", "chart-adaptation", "chart-company"]
      .forEach(function (elId) {
        document.getElementById(elId).innerHTML = '<p class="db-empty">图表库加载失败（需联网加载 ECharts）。</p>';
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome("industry");
    if (!window.echarts) { fallback(); return; }
    renderAll();
    window.App.onThemeChange(function () { renderAll(); });
    window.addEventListener("resize", function () { charts.forEach(function (c) { c.resize(); }); });
    window.App.initReveal();
  });
})();
