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

    // ---- 3.5 强推荐横滚交互（PC：按钮 / 滚轮 / 鼠标拖拽） ----
    var scroller = document.getElementById("top-works");
    var prevBtn = document.getElementById("top-works-prev");
    var nextBtn = document.getElementById("top-works-next");

    // 按钮可用状态：已到边界则禁用
    function updateNavState() {
      var max = scroller.scrollWidth - scroller.clientWidth;
      prevBtn.disabled = scroller.scrollLeft <= 1;
      nextBtn.disabled = scroller.scrollLeft >= max - 1;
    }
    function scrollByStep(dir) {
      scroller.scrollBy({ left: dir * scroller.clientWidth * 0.8, behavior: "smooth" });
    }
    prevBtn.addEventListener("click", function () { scrollByStep(-1); });
    nextBtn.addEventListener("click", function () { scrollByStep(1); });
    scroller.addEventListener("scroll", updateNavState);
    window.addEventListener("resize", updateNavState);
    updateNavState();

    // 滚轮：容器内滚动时将垂直滚轮转换为水平滚动
    scroller.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        scroller.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // 鼠标拖拽滚动；拖拽超过 5px 视为"拖动"而非"点击"，阻止误跳转
    var drag = { down: false, startX: 0, startLeft: 0 };
    var dragged = false;
    scroller.addEventListener("pointerdown", function (e) {
      drag.down = true;
      drag.startX = e.clientX;
      drag.startLeft = scroller.scrollLeft;
      scroller.classList.add("dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!drag.down) return;
      var dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 5) dragged = true;
      scroller.scrollLeft = drag.startLeft - dx;
    });
    window.addEventListener("pointerup", function () {
      drag.down = false;
      scroller.classList.remove("dragging");
    });
    // 拖拽后的 click 拦截（捕获阶段）
    scroller.addEventListener("click", function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
      dragged = false;
    }, true);

    // ---- 4. 全站搜索 ----
    window.App.initSearch("search-box");
  });
})();
