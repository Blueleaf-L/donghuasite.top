/* ============================================================
   国产动画资料库 | 公司详情页逻辑 js/company-detail.js
   ------------------------------------------------------------
   职责（模板页）：
   1. 从 URL 读取 ?name=xxx，计算公司统计（App.getCompanyStats）
   2. 填充详情头：公司名、类型、统计行
   3. 渲染能力雷达图（5 维客观统计；样本不足显示"数据积累中"）
   4. 渲染作品时间线（横向，按年份排序，年份范围筛选）
   5. 渲染旗下作品列表（评级筛选 + 排序）

   雷达图维度说明（设想 §5.3.3）：
   - 产能：作品总数（按全站最大公司归一化到 0-100）
   - 品控：推荐率（年度推荐 / 已评级）
   - 良品率："还行"及以上 / 已评级
   - 翻车率（反向）："不推荐" / 已评级，数值高代表问题作品多
   - 系列化能力：数据暂无 series 字段，暂为 0（页面注明）
   ============================================================ */
(function () {
  "use strict";

  /** 从 URL 查询串读取参数。 */
  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome(null); // 详情页不在主导航中，不高亮

    var name = getParam("name");

    // ---- 公司不存在 ----
    if (!name || window.App.getAllCompanies().indexOf(name) === -1) {
      var main = document.querySelector(".site-main .container");
      main.innerHTML =
        '<div class="empty-tip" style="margin-top:40px">' +
          '<div class="et-title">未找到该公司</div>' +
          "链接可能已失效，请从公司总览重新进入。" +
        "</div>";
      return;
    }

    var s = window.App.getCompanyStats(name);

    // ---- 面包屑 ----
    document.getElementById("breadcrumb").innerHTML =
      '<a href="index.html">首页</a>' +
      '<span class="sep">/</span>' +
      '<a href="company.html">公司总览</a>' +
      '<span class="sep">/</span>' +
      "<span>" + window.App.escapeHtml(name) + "</span>";

    // ---- 标题 + 徽标 ----
    document.title = name + " | 国产动画资料库";
    document.getElementById("dh-name").textContent = name;
    // 制作类型：优先公司表（companies.js），未录入时按作品聚合推导
    var compType = null;
    if (window.COMPANIES) {
      var found = window.COMPANIES.filter(function (c) { return c.name === name; })[0];
      if (found && found.type) compType = found.type;
    }
    var techTag = compType || (s.techMixed ? "混合型" : s.techMain);
    document.getElementById("dh-badges").innerHTML =
      window.App.tagHtml(techTag) +
      (s.sampleEnough ? "" : '<span class="badge badge--pending">样本不足</span>');

    // ---- 统计行 ----
    document.getElementById("dh-meta").innerHTML =
      '<div class="dm-row"><span class="dm-label">作品数</span><span class="dm-value">' + s.total + " 部</span></div>" +
      '<div class="dm-row"><span class="dm-label">活跃年份</span><span class="dm-value">' + s.activeYears + " 年</span></div>" +
      '<div class="dm-row"><span class="dm-label">推荐率</span><span class="dm-value">' +
      (s.sampleEnough ? s.recommendRate + "%（已评级 " + s.rated + " 部）" : "样本不足（已评级 " + s.rated + " 部）") +
      "</span></div>";

    /* ============================================================
       能力雷达图
       ============================================================ */
    var radarEl = document.getElementById("radar-chart");
    if (!window.echarts) {
      radarEl.innerHTML = '<p class="db-empty">图表库加载失败（需联网加载 ECharts），其余内容不受影响。</p>';
    } else if (!s.sampleEnough) {
      // 样本不足：不画图（设想 §10-5：数据积累中）
      radarEl.innerHTML =
        '<div class="empty-tip"><div class="et-title">数据积累中</div>' +
        "已评级作品不足 3 部，暂不展示能力雷达。</div>";
    } else {
      // 产能归一化：作品数 / 全站最大公司作品数 * 100
      var maxTotal = 1;
      window.App.getAllCompanies().forEach(function (c) {
        var t = window.App.getCompanyStats(c).total;
        if (t > maxTotal) maxTotal = t;
      });
      var capacity = Math.round(s.total / maxTotal * 100);

      var chart = echarts.init(radarEl);
      chart.setOption({
        tooltip: {},
        radar: {
          indicator: [
            { name: "产能", max: 100 },
            { name: "品控（推荐率）", max: 100 },
            { name: "良品率", max: 100 },
            { name: "翻车率（反向）", max: 100 },
            { name: "系列化能力", max: 100 }
          ],
          radius: "65%",
          splitLine: { lineStyle: { color: "#e6dfd2" } },
          splitArea: { areaStyle: { color: ["#fdfcf8", "#f6f4ef"] } },
          axisLine: { lineStyle: { color: "#d6cdbb" } }
        },
        series: [{
          type: "radar",
          data: [{
            value: [capacity, s.recommendRate, s.goodRate, s.badRate, s.seriesRate],
            name: name,
            areaStyle: { color: "rgba(178, 58, 48, 0.15)" },
            lineStyle: { color: "#b23a30", width: 2 },
            itemStyle: { color: "#b23a30" }
          }]
        }]
      });
      window.addEventListener("resize", function () { chart.resize(); });
    }

    /* ============================================================
       作品时间线（横向，按年份排序；年份筛选）
       ============================================================ */
    var tlFrom = "", tlTo = "";
    var timelineWorks = s.works.slice().sort(function (a, b) {
      return (a.year || 9999) - (b.year || 9999);
    });

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
      box.innerHTML = list.map(function (w) {
        var unrated = !w.grade || w.grade === "暂未评级";
        return (
          '<div class="ht-item' + (unrated ? " unrated" : "") + '">' +
            '<span class="ht-dot" aria-hidden="true"></span>' +
            '<span class="ht-year">' + (w.year || "?") + "</span>" +
            '<span class="ht-name"><a href="work-detail.html?id=' + w.id + '">' +
            window.App.escapeHtml(w.name) + "</a></span>" +
          "</div>"
        );
      }).join("");
      document.getElementById("tl-sub").textContent = list.length + " 部";
    }

    document.getElementById("f-year-from").addEventListener("input", function (e) { tlFrom = e.target.value; renderTimeline(); });
    document.getElementById("f-year-to").addEventListener("input", function (e) { tlTo = e.target.value; renderTimeline(); });

    /* ============================================================
       旗下作品列表（评级筛选 + 排序）
       ============================================================ */
    var gradeSet = new Set();
    var sortMode = "year-desc";
    var GRADE_ORDER = { "年度推荐": 1, "佳作": 2, "还行": 3, "能看": 4, "暂未评级": 5, "不推荐": 6 };

    // 评级筛选 chips（固定顺序）
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
      var list = s.works.filter(function (w) {
        return !gradeSet.size || gradeSet.has(w.grade);
      });
      list.sort(function (a, b) {
        if (sortMode === "grade") return (GRADE_ORDER[a.grade] || 9) - (GRADE_ORDER[b.grade] || 9);
        if (sortMode === "year-asc") return (a.year || 0) - (b.year || 0);
        return (b.year || 0) - (a.year || 0);
      });
      document.getElementById("works-sub").textContent = list.length + " 部（剧集 + 电影）";
      window.App.renderWorkCards(document.getElementById("work-grid"), list);
    }

    // ---- 启动渲染 ----
    renderTimeline();
    renderWorks();
  });
})();
