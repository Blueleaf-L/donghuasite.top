/* ============================================================
   国产动画资料库 | 主页逻辑 js/index.js
   ------------------------------------------------------------
   职责：
   1. 挂载公共骨架（导航 + 页脚）
   2. 填充收录统计数字（已收录作品数 / 公司数）
   3. 渲染"年度推荐 · 强推荐"横向卡片行
   4. 初始化全站搜索组件
   ============================================================ */
(function () {
  "use strict";

  // 页面加载完成后执行（依赖 tv-data.js 与 common.js 已加载）
  document.addEventListener("DOMContentLoaded", function () {
    // ---- 1. 公共骨架（首页不高亮任何导航项，传 null） ----
    window.App.mountChrome(null);

    // ---- 2. 统计数字 ----
    var stats = window.App.getStats();
    document.getElementById("stat-total").textContent = stats.total.toLocaleString();
    document.getElementById("stat-company").textContent = stats.companies.toLocaleString();

    // ---- 3. 年度推荐 · 强推荐（内部评级细分到"强推荐"的作品） ----
    var topWorks = window.TV_DATA.filter(function (w) {
      return w.rating === "年度推荐 强推荐";
    });
    // 按年份降序（新作在前）
    topWorks.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
    window.App.renderWorkCards(document.getElementById("top-works"), topWorks);

    // ---- 4. 全站搜索 ----
    window.App.initSearch("search-box");
  });
})();
