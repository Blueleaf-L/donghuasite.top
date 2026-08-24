/* ============================================================
   国产动画资料库 | 全站公共逻辑 common.js
   ------------------------------------------------------------
   职责：
   1. 数据访问（TV_DATA / COMPANIES）
   2. 全站工具（评级徽标、片名卡占位、作品卡、转义、平台色点、技术类型色）
   3. 公共骨架：顶栏（含主题切换）+ 移动底部悬浮胶囊 Dock + 页脚
   4. 主题管理（浅色默认 / 深色可选，localStorage 记忆，图表联动）
   5. 全站搜索组件、滚动显现、Toast、回顶
   ============================================================ */
(function () {
  "use strict";

  window.App = window.App || {};

  /* ============================================================
     1. 数据访问
     ============================================================ */
  var DATA = (typeof window !== "undefined" && window.TV_DATA) || [];

  window.App.getWorkById = function (id) {
    for (var i = 0; i < DATA.length; i++) {
      if (String(DATA[i].id) === String(id)) return DATA[i];
    }
    return null;
  };
  window.App.getWorksByCompany = function (name) {
    return DATA.filter(function (w) { return w.company === name; });
  };
  window.App.getWorksByType = function (type) {
    return DATA.filter(function (w) { return w.type === type; });
  };
  window.App.getAllCompanies = function () {
    var map = {};
    DATA.forEach(function (w) { if (w.company) map[w.company] = (map[w.company] || 0) + 1; });
    return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
  };
  window.App.getStats = function () {
    var tv = 0, movie = 0, companies = {};
    DATA.forEach(function (w) {
      if (w.type === "movie") movie++; else tv++;
      if (w.company) companies[w.company] = true;
    });
    return { total: DATA.length, tv: tv, movie: movie, companies: Object.keys(companies).length };
  };

  /* ============================================================
     2. 格式化工具
     ============================================================ */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  window.App.escapeHtml = escapeHtml;

  function fmtYear(y) { return y ? String(y) : "年份待补"; }
  window.App.fmtYear = fmtYear;

  function fmtTech(t) {
    if (!t) return "技术类型待补";
    return t === "特殊类型" ? "其他" : t;
  }
  window.App.fmtTech = fmtTech;

  function fmtAdaptation(a) { return a || "改编来源待补"; }
  window.App.fmtAdaptation = fmtAdaptation;

  /* 评级六档 → 徽标类（§1.3） */
  function gradeClass(g) {
    switch (g) {
      case "年度推荐": return "badge--annual";
      case "佳作": return "badge--excellent";
      case "还行": return "badge--fine";
      case "能看": return "badge--watchable";
      case "暂未评级": return "badge--pending";
      case "不推荐": return "badge--reject";
      default: return "badge--watchable";
    }
  }
  function gradeBadgeHtml(g) {
    return '<span class="badge ' + gradeClass(g) + '">' + escapeHtml(g || "未评级") + "</span>";
  }
  window.App.gradeBadgeHtml = gradeBadgeHtml;

  function tagHtml(text) {
    return '<span class="tag">' + escapeHtml(text) + "</span>";
  }
  window.App.tagHtml = tagHtml;

  /* 技术类型 → 片名卡颜色（CSS 变量引用，随主题联动） */
  var TECH_VARS = {
    "2D": "var(--jade)",
    "3D": "var(--accent)",
    "三渲二": "var(--gold)",
    "其他": "var(--muted)",
    "待补": "var(--muted)"
  };
  window.App.techColorVar = function (tech) {
    return TECH_VARS[tech] || TECH_VARS["待补"];
  };

  /* 平台 → 色点色值（§1.5） */
  var PLATFORM_COLORS = {
    "腾讯视频": "#e0a52e",
    "哔哩哔哩": "#fb7299",
    "优酷": "#1e88e5",
    "爱奇艺": "#00be06"
  };
  window.App.platformColor = function (name) {
    return PLATFORM_COLORS[name] || "#8a857c";
  };

  /* ============================================================
     3. 片名卡与作品卡
     ============================================================ */

  /** 片名卡：无海报时的封面占位（竖排标题 + 技术类型色条 + 年份）。 */
  function coverPlaceholderHtml(work, typeLabel) {
    var tech = fmtTech(work.tech);
    var color = TECH_VARS[tech] || TECH_VARS["待补"];
    var bottom = work.year ? escapeHtml(String(work.year)) : escapeHtml(typeLabel || "");
    return (
      '<div class="cover-placeholder" style="--ph-color:' + color + '" aria-hidden="true">' +
        '<span class="cp-title">' + escapeHtml(work.name) + "</span>" +
        '<span class="cp-bar"></span>' +
        '<span class="cp-year">' + bottom + "</span>" +
      "</div>"
    );
  }

  function coverHtml(work, typeLabel) {
    var url = work.cover_url;
    if (url) {
      var payload = escapeHtml(JSON.stringify(work));
      var typePayload = escapeHtml(JSON.stringify(typeLabel));
      return (
        '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(work.name) + '" loading="lazy" ' +
        'class="lazy" onload="this.classList.add(\'loaded\')" ' +
        'onerror="this.outerHTML=window.App.coverPlaceholder(' + payload + ',' + typePayload + ')">'
      );
    }
    return coverPlaceholderHtml(work, typeLabel);
  }
  window.App.coverPlaceholder = function (work, typeLabel) { return coverPlaceholderHtml(work, typeLabel); };
  window.App.coverHtml = coverHtml;

  function workCardHtml(work) {
    var typeLabel = work.type === "movie" ? "电影" : "剧集";
    var seal = work.grade === "年度推荐"
      ? '<span class="cover-seal" title="年度推荐">荐</span>'
      : "";
    return (
      '<a class="work-card" href="work-detail.html?id=' + work.id + '">' +
        '<div class="cover">' + seal + coverHtml(work, typeLabel) + "</div>" +
        '<div class="w-name">' + escapeHtml(work.name) + "</div>" +
        '<div class="w-meta">' + tagHtml(fmtYear(work.year)) + gradeBadgeHtml(work.grade) + "</div>" +
      "</a>"
    );
  }
  window.App.workCardHtml = workCardHtml;

  function renderWorkCards(container, works) {
    if (!works.length) {
      container.innerHTML =
        '<div class="empty-tip"><div class="et-title">没有符合条件的作品</div>请调整筛选条件。</div>';
      return;
    }
    container.innerHTML = works.map(workCardHtml).join("");
  }
  window.App.renderWorkCards = renderWorkCards;

  /* ============================================================
     4. 主题管理（浅色默认）
     ============================================================ */
  var THEME_KEY = "gcan-theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }
  function setTheme(theme) {
    if (theme === "light") { document.documentElement.removeAttribute("data-theme"); }
    else { document.documentElement.setAttribute("data-theme", "dark"); }
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
  }
  window.App.isDark = function () { return currentTheme() === "dark"; };
  window.App.toggleTheme = function () { setTheme(currentTheme() === "dark" ? "light" : "dark"); };
  window.App.onThemeChange = function (fn) {
    window.addEventListener("themechange", function (e) { fn(e.detail.theme); });
  };

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
    // 默认浅色（无 data-theme 属性即浅色）
  }

  window.App.chartTheme = function () {
    var dark = window.App.isDark();
    return {
      text: dark ? "#7d7a72" : "#8a857c",
      textStrong: dark ? "#b0aca4" : "#5f5b54",
      gridLine: dark ? "#2a2d31" : "#e8e4da",
      axisLine: dark ? "#3a3e43" : "#d6d1c4",
      accent: dark ? "#5b8ba0" : "#2f4f5e",
      gold: dark ? "#c99a4a" : "#a67e3a",
      jade: dark ? "#5a978c" : "#3f7d72",
      cinnabar: dark ? "#d95a47" : "#c2402f",
      ink: dark ? "#7d7a72" : "#8a857c",
      tooltip: {
        backgroundColor: dark ? "#26282c" : "#ffffff",
        borderColor: dark ? "#3a3e43" : "#d6d1c4",
        textStyle: { color: dark ? "#ece9e4" : "#1b1a17" },
        extraCssText: "box-shadow:0 8px 24px rgba(0,0,0,0.18);border-radius:8px;"
      }
    };
  };

  /* ============================================================
     5. 公共骨架：顶栏 + Dock + 页脚
     ============================================================ */
  var NAV_ITEMS = [
    { key: "series", label: "剧集动画", short: "剧集", href: "series.html", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 3l3 3M16 3l-3 3"/></svg>' },
    { key: "movies", label: "动画电影", short: "电影", href: "movies.html", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/></svg>' },
    { key: "company", label: "公司总览", short: "公司", href: "company.html", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M14 9h5a1 1 0 0 1 1 1v11"/><path d="M2 21h20"/><path d="M6.5 8h1M6.5 12h1M6.5 16h1M10.5 8h1M10.5 12h1"/></svg>' },
    { key: "industry", label: "数据统计", short: "统计", href: "industry.html", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-6M22 20H2"/></svg>' }
  ];

  var ICONS = {
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
  };

  window.App.mountChrome = function (activePage) {
    initTheme();

    var header = document.getElementById("site-header");
    if (header) {
      var links = NAV_ITEMS.map(function (item) {
        var cur = item.key === activePage ? ' aria-current="page"' : "";
        return '<li><a href="' + item.href + '"' + cur + ">" + item.label + "</a></li>";
      }).join("");
      header.innerHTML =
        '<div class="container header-inner">' +
          '<a class="brand" href="index.html">' +
            '<span class="brand-seal">典</span>' +
            '<span class="brand-text">' +
              '<span class="brand-cn">国产动画资料库</span>' +
              '<span class="brand-en">DONGHUA</span>' +
            "</span>" +
          "</a>" +
          '<nav class="site-nav" aria-label="主导航"><ul>' + links + "</ul></nav>" +
          '<div class="header-actions">' +
            '<a class="icon-btn" href="index.html" aria-label="搜索" title="搜索">' + ICONS.search + "</a>" +
            '<button class="icon-btn" id="theme-toggle" type="button" aria-label="切换深浅色" title="切换深浅色">' + ICONS.moon + ICONS.sun + "</button>" +
          "</div>" +
        "</div>";

      var themeBtn = document.getElementById("theme-toggle");
      if (themeBtn) themeBtn.addEventListener("click", function () { window.App.toggleTheme(); });

      var headerEl = header;
      var onScroll = function () { headerEl.classList.toggle("scrolled", window.scrollY > 8); };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // 移动端底部悬浮胶囊 Dock
    var dock = document.getElementById("mobile-dock");
    if (dock) {
      var dockLinks = NAV_ITEMS.map(function (item) {
        var cur = item.key === activePage ? ' aria-current="page"' : "";
        return '<li><a href="' + item.href + '"' + cur + ">" + item.icon + "<span>" + item.short + "</span></a></li>";
      }).join("");
      dock.innerHTML = "<ul>" + dockLinks + "</ul>";
    }

    // 页脚
    var footer = document.getElementById("site-footer");
    if (footer) {
      footer.innerHTML =
        '<div class="container footer-inner">' +
          '<div class="footer-top">' +
            '<div class="footer-brand">' +
              '<a class="brand" href="index.html">' +
                '<span class="brand-seal">典</span>' +
                '<span class="brand-text"><span class="brand-cn">国产动画资料库</span><span class="brand-en">DONGHUA</span></span>' +
              "</a>" +
              "<p>收录剧集动画与动画电影的信息、制作公司、评分与评级，独立于平台之外，供爱好者查阅参考。</p>" +
            "</div>" +
            '<div class="footer-col"><h4>浏览</h4><ul>' +
              '<li><a href="series.html">剧集动画</a></li>' +
              '<li><a href="movies.html">动画电影</a></li>' +
              '<li><a href="company.html">公司总览</a></li>' +
              '<li><a href="industry.html">数据统计</a></li>' +
            "</ul></div>" +
            '<div class="footer-col"><h4>关于</h4><ul>' +
              '<li><a href="legal.html">免责与版权声明</a></li>' +
            "</ul></div>" +
          "</div>" +
          '<div class="footer-meta">' +
            "<span>评级仅供参考，作品质量请以自身观看体验为准。</span>" +
            "<span>本站为非营利项目 · 图片版权归权利方所有 · 仅作资料展示</span>" +
            "<span>反馈邮箱：contribute@example.com</span>" +
          "</div>" +
        "</div>";
    }

    // 回顶
    if (!document.querySelector(".back-to-top")) {
      var backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "back-to-top";
      backBtn.setAttribute("aria-label", "回到顶部");
      backBtn.innerHTML = ICONS.up;
      backBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
      document.body.appendChild(backBtn);
      var onBackScroll = function () { backBtn.classList.toggle("show", window.scrollY > 700); };
      window.addEventListener("scroll", onBackScroll, { passive: true });
      onBackScroll();
    }
  };

  /* ============================================================
     6. 滚动显现 / Toast
     ============================================================ */
  window.App.initReveal = function () {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  };

  window.App.toast = function (msg) {
    var t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  };

  /* ============================================================
     7. 全站搜索组件（首页）
     ============================================================ */
  function highlight(text, q) {
    var esc = escapeHtml(text);
    var eq = escapeHtml(q);
    if (!q) return esc;
    var idx = esc.toLowerCase().indexOf(eq.toLowerCase());
    if (idx === -1) return esc;
    return esc.slice(0, idx) + "<b>" + esc.slice(idx, idx + eq.length) + "</b>" + esc.slice(idx + eq.length);
  }

  window.App.initSearch = function (containerId) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML =
      '<div class="search-hero">' +
        '<div class="segmented" role="group" aria-label="搜索范围">' +
          '<button class="btn" data-mode="work" aria-pressed="true">作品</button>' +
          '<button class="btn" data-mode="company" aria-pressed="false">公司</button>' +
        "</div>" +
        '<div class="search-wrap">' +
          '<div class="search-bar">' +
            '<span class="sb-icon">' + ICONS.search + "</span>" +
            '<input type="text" placeholder="搜索作品名、导演、公司…" aria-label="搜索">' +
            '<button class="btn btn--primary" type="button">搜索</button>' +
          "</div>" +
          '<div class="search-dropdown" role="listbox"></div>' +
        "</div>" +
      "</div>";

    var mode = "work";
    var input = box.querySelector("input");
    var dropdown = box.querySelector(".search-dropdown");
    var selected = -1;

    box.querySelectorAll(".segmented .btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        mode = btn.dataset.mode;
        box.querySelectorAll(".segmented .btn").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        input.placeholder = mode === "work" ? "搜索作品名、导演、公司…" : "搜索公司名…";
        runSearch(input.value);
      });
    });

    function runSearch(q) {
      q = (q || "").trim();
      dropdown.classList.remove("open");
      if (!q) return;
      selected = -1;
      var items;
      if (mode === "work") {
        items = DATA.filter(function (w) {
          return (w.name && w.name.indexOf(q) !== -1) ||
            (w.director && w.director.indexOf(q) !== -1) ||
            (w.company && w.company.indexOf(q) !== -1);
        }).slice(0, 8).map(function (w) {
          return { href: "work-detail.html?id=" + w.id, name: w.name, meta: fmtYear(w.year) + " · " + (w.grade || "未评级") };
        });
      } else {
        items = window.App.getAllCompanies().filter(function (c) { return c.indexOf(q) !== -1; })
          .slice(0, 8).map(function (c) {
            return { href: "company-detail.html?name=" + encodeURIComponent(c), name: c, meta: "公司" };
          });
      }
      if (!items.length) {
        dropdown.innerHTML = '<div class="sd-empty">没有找到与「' + escapeHtml(q) + '」相关的结果</div>';
      } else {
        dropdown.innerHTML =
          '<div class="sd-head">' + (mode === "work" ? "作品" : "公司") + "</div>" +
          items.map(function (it, i) {
            return (
              '<button type="button" class="sd-item" role="option" data-i="' + i + '" data-href="' + it.href + '">' +
                '<span class="sd-name">' + highlight(it.name, q) + "</span>" +
                '<span class="sd-meta">' + escapeHtml(it.meta) + "</span>" +
              "</button>"
            );
          }).join("");
      }
      dropdown.classList.add("open");
      bindDropdown();
    }

    function bindDropdown() {
      dropdown.querySelectorAll(".sd-item").forEach(function (el) {
        el.addEventListener("click", function () { location.href = el.dataset.href; });
      });
    }
    function moveSelection(delta) {
      var items = dropdown.querySelectorAll(".sd-item");
      if (!items.length) return;
      selected = (selected + delta + items.length) % items.length;
      items.forEach(function (el, i) { el.setAttribute("aria-selected", i === selected ? "true" : "false"); });
      items[selected].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", function () { runSearch(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveSelection(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveSelection(-1); }
      else if (e.key === "Enter") {
        var items = dropdown.querySelectorAll(".sd-item");
        if (selected >= 0 && items[selected]) location.href = items[selected].dataset.href;
        else if (items.length) location.href = items[0].dataset.href;
      } else if (e.key === "Escape") { dropdown.classList.remove("open"); }
    });
    box.querySelector(".search-bar .btn").addEventListener("click", function () {
      var items = dropdown.querySelectorAll(".sd-item");
      if (items.length) location.href = items[0].dataset.href;
    });
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target)) dropdown.classList.remove("open");
    });
  };

  /* ============================================================
     8. 公司统计
     ============================================================ */
  window.App.getCompanyStats = function (name) {
    var works = DATA.filter(function (w) { return w.company === name; });
    var total = works.length;
    var rated = works.filter(function (w) { return w.grade && w.grade !== "暂未评级"; });
    var ratedCount = rated.length;
    var recommend = rated.filter(function (w) { return w.grade === "年度推荐"; }).length;
    var good = rated.filter(function (w) { return ["年度推荐", "佳作", "还行", "能看"].indexOf(w.grade) !== -1; }).length;
    var bad = rated.filter(function (w) { return w.grade === "不推荐"; }).length;

    var techMap = {};
    works.forEach(function (w) {
      var t = w.tech === "特殊类型" ? "其他" : (w.tech || "待补");
      techMap[t] = (techMap[t] || 0) + 1;
    });
    var techKeys = Object.keys(techMap).sort(function (a, b) { return techMap[b] - techMap[a]; });
    var techMain = techKeys[0] || "待补";
    var techMixed = techKeys.length > 1 && (techMap[techMain] / total) < 0.7;

    var yearSet = {};
    works.forEach(function (w) { if (w.year) yearSet[w.year] = true; });
    var activeYears = Object.keys(yearSet).length;

    return {
      works: works, total: total, rated: ratedCount, recommend: recommend,
      recommendRate: ratedCount ? Math.round(recommend / ratedCount * 100) : null,
      goodRate: ratedCount ? Math.round(good / ratedCount * 100) : null,
      badRate: ratedCount ? Math.round(bad / ratedCount * 100) : null,
      seriesRate: 0,
      hasSeries: works.some(function (w) { return w.series; }),
      techMain: techMain, techMixed: techMixed,
      activeYears: activeYears, years: yearSet,
      sampleEnough: ratedCount >= 3
    };
  };
})();
