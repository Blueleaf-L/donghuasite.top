/* 国产动画资料库 | 主页逻辑 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome(null);

    // 统计数字
    var stats = window.App.getStats();
    document.getElementById("stat-total").textContent = stats.total.toLocaleString();
    document.getElementById("stat-company").textContent = stats.companies.toLocaleString();

    // 年度推荐 · 强推荐
    var topWorks = window.TV_DATA.filter(function (w) {
      return w.rating === "年度推荐 强推荐";
    });
    topWorks.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
    window.App.renderWorkCards(document.getElementById("top-works"), topWorks);

    // 横向滚动交互
    var scroller = document.getElementById("top-works");
    var prevBtn = document.getElementById("top-works-prev");
    var nextBtn = document.getElementById("top-works-next");

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

    scroller.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        scroller.scrollLeft += e.deltaY;
      }
    }, { passive: false });

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
    scroller.addEventListener("click", function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
      dragged = false;
    }, true);

    // 全站搜索
    window.App.initSearch("search-box");

    // 滚动显现
    window.App.initReveal();
  });
})();
