/* ============================================================
   国产动画资料库 | 全站公共逻辑 common.js
   ------------------------------------------------------------
   职责：
   1. 读取全局数据 window.TV_DATA（由 tv-data.js 提供，勿手改该文件）
   2. 提供全站工具函数（评级徽标、封面占位、作品卡 HTML、转义等）
   3. 挂载公共骨架：顶栏导航（含移动端菜单）+ 页脚（mountChrome）
   4. 首页全站搜索组件（作品 / 公司两种模式）

   使用方式：每个页面在 <body> 末尾依次引入
     <script src="tv-data.js"></script>
     <script src="js/common.js"></script>
     <script src="js/页面专属.js"></script>
   页面结构约定：
     <header class="site-header" id="site-header" data-page="当前页标识"></header>
     <main class="site-main">…</main>
     <footer class="site-footer" id="site-footer"></footer>
   ============================================================ */
(function () {
  "use strict";

  /* 公共命名空间（先初始化，供下方所有 window.App.xxx 挂载使用） */
  window.App = window.App || {};

  /* ============================================================
     1. 数据访问
     ============================================================ */

  /** 全部作品数据（tv-data.js 注入）。加载失败时为空数组。 */
  var DATA = (typeof window !== "undefined" && window.TV_DATA) || [];

  /** 按 id 查作品。找不到返回 null。 */
  window.App.getWorkById = function (id) {
    for (var i = 0; i < DATA.length; i++) {
      if (String(DATA[i].id) === String(id)) return DATA[i];
    }
    return null;
  };

  /** 按公司名查该公司全部作品（跨剧集/电影）。 */
  window.App.getWorksByCompany = function (name) {
    return DATA.filter(function (w) { return w.company === name; });
  };

  /** 按类型过滤：'tv' 剧集 / 'movie' 电影。 */
  window.App.getWorksByType = function (type) {
    return DATA.filter(function (w) { return w.type === type; });
  };

  /** 全部公司名列表（按作品数降序）。 */
  window.App.getAllCompanies = function () {
    var map = {};
    DATA.forEach(function (w) {
      if (w.company) map[w.company] = (map[w.company] || 0) + 1;
    });
    return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
  };

  /** 作品数量统计（首页"已收录 N 部作品"用）。 */
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

  /** HTML 转义（渲染用户数据到 innerHTML 前必用，防 XSS）。 */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** 年份显示：空值/非法显示"年份待补"。 */
  function fmtYear(y) {
    return y ? String(y) : "年份待补";
  }

  /** 技术类型显示：数据中的"特殊类型"对外统一显示为"其他"（设想 §5.1.1）。 */
  function fmtTech(t) {
    if (!t) return "技术类型待补";
    return t === "特殊类型" ? "其他" : t;
  }

  /** 题材（改编来源）显示：空值显示占位。 */
  function fmtAdaptation(a) {
    return a || "改编来源待补";
  }

  /** 对外评级 → 徽标样式类（见 style.css §6）。 */
  function gradeClass(g) {
    switch (g) {
      case "年度推荐": return "badge--annual";
      case "佳作":     return "badge--excellent";
      case "还行":
      case "能看":     return "badge--ok";
      case "暂未评级": return "badge--pending";
      case "不推荐":   return "badge--reject";
      default:         return "badge--ok";
    }
  }

  /** 对外评级 → 徽标 HTML。 */
  function gradeBadgeHtml(g) {
    return '<span class="badge ' + gradeClass(g) + '">' + escapeHtml(g || "未评级") + "</span>";
  }

  /** 通用小标签 HTML（技术类型 / 题材 / 年份等）。 */
  function tagHtml(text) {
    return '<span class="tag">' + escapeHtml(text) + "</span>";
  }

  /* ============================================================
     3. 封面与作品卡渲染
     ============================================================ */

  /**
   * 封面 HTML。
   * - 有 cover_url：<img>，加载失败自动回退占位（onerror 换成占位 DOM）
   * - 无 cover_url：占位（"古籍书名页"风格：宋体作品名 + 类型）
   * typeLabel：'剧集' / '电影'，显示在占位底部
   */
  function coverHtml(work, typeLabel) {
    var url = work.cover_url;
    if (url) {
      // onerror：热链失效（如 B 站防盗链）时立即回退占位，不留破图
      // 注意：JSON 序列化后的双引号必须转义（escapeHtml），否则会截断 HTML 属性
      var payload = escapeHtml(JSON.stringify(work));
      var typePayload = escapeHtml(JSON.stringify(typeLabel));
      return (
        '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(work.name) + '" loading="lazy" ' +
        'onerror="this.outerHTML=window.App.coverPlaceholder(' + payload + ',' + typePayload + ')">'
      );
    }
    return coverPlaceholderHtml(work, typeLabel);
  }

  /** 占位封面 HTML（无图时）。 */
  function coverPlaceholderHtml(work, typeLabel) {
    return (
      '<div class="cover-placeholder" aria-hidden="true">' +
        '<span class="cp-name">' + escapeHtml(work.name) + "</span>" +
        '<span class="cp-type">' + escapeHtml(typeLabel || "") + "</span>" +
      "</div>"
    );
  }

  // onerror 回调里用的引用（coverHtml 的 onerror 字符串里调用）
  window.App.coverPlaceholder = function (work, typeLabel) {
    return coverPlaceholderHtml(work, typeLabel);
  };

  /**
   * 作品卡 HTML（列表页 / 首页通用）。
   * 卡片 = 封面 + 作品名 + 元信息行（年份 · 评级徽标 · 公司）
   */
  function workCardHtml(work) {
    var typeLabel = work.type === "movie" ? "电影" : "剧集";
    return (
      '<a class="work-card" href="work-detail.html?id=' + work.id + '">' +
        '<div class="cover">' + coverHtml(work, typeLabel) + "</div>" +
        '<div class="w-name">' + escapeHtml(work.name) + "</div>" +
        '<div class="w-meta">' +
          tagHtml(fmtYear(work.year)) +
          gradeBadgeHtml(work.grade) +
        "</div>" +
      "</a>"
    );
  }

  /** 批量渲染作品卡到容器（grid 或 h-scroll）。 */
  function renderWorkCards(container, works) {
    if (!works.length) {
      container.innerHTML =
        '<div class="empty-tip"><div class="et-title">暂无作品</div>数据整理中，敬请期待。</div>';
      return;
    }
    container.innerHTML = works.map(workCardHtml).join("");
  }

  /* ============================================================
     4. 公共骨架：导航 + 页脚
     ============================================================ */

  /** 导航项配置。key 同时是 data-page 标识和文件名。 */
  var NAV_ITEMS = [
    { key: "series",    label: "剧集动画", href: "series.html" },
    { key: "movies",    label: "动画电影", href: "movies.html" },
    { key: "company",   label: "公司总览", href: "company.html" },
    { key: "industry",  label: "行业资讯", href: "industry.html" }
  ];

  /**
   * 挂载顶栏 + 页脚。
   * activePage：当前页 key（与 NAV_ITEMS 的 key 对应），用于高亮。
   * 调用时机：DOMContentLoaded 后。
   */
  window.App.mountChrome = function (activePage) {
    // ---- 顶栏 ----
    var header = document.getElementById("site-header");
    if (header) {
      var links = NAV_ITEMS.map(function (item) {
        var cur = item.key === activePage ? ' aria-current="page"' : "";
        return '<li><a href="' + item.href + '"' + cur + ">" + item.label + "</a></li>";
      }).join("");
      header.innerHTML =
        '<div class="container header-inner">' +
          '<a class="brand" href="index.html">' +
            '<span class="seal">典</span><span class="cn">国产动画资料库</span>' +
          "</a>" +
          '<nav class="site-nav" aria-label="主导航"><ul>' + links + "</ul></nav>" +
          '<button class="nav-toggle" aria-label="打开菜单" aria-expanded="false">&#9776;</button>' +
        "</div>" +
        '<nav class="nav-mobile" id="nav-mobile" aria-label="移动端导航"><ul>' + links + "</ul></nav>";

      // 移动端菜单开关
      var toggle = header.querySelector(".nav-toggle");
      var mobile = document.getElementById("nav-mobile");
      if (toggle && mobile) {
        toggle.addEventListener("click", function () {
          var open = mobile.classList.toggle("open");
          toggle.setAttribute("aria-expanded", open ? "true" : "false");
          toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
        });
      }
    }

    // ---- 页脚 ----
    var footer = document.getElementById("site-footer");
    if (footer) {
      footer.innerHTML =
        '<div class="container footer-inner">' +
          "<h3>国产动画资料库</h3>" +
          '<div class="footer-links">' +
            '<a href="index.html">首页</a>' +
            '<a href="legal.html">免责与版权声明</a>' +
          "</div>" +
          '<div class="footer-meta">' +
            "<span>评级仅供参考，作品质量请以自身观看体验为准。</span>" +
            "<span>本站为非营利项目，图片版权归权利方所有，仅作资料展示。</span>" +
            "<span>反馈邮箱：contribute@example.com</span>" +
          "</div>" +
        "</div>";
    }
  };

  /* ============================================================
     5. 全站搜索组件（首页）
     ============================================================ */

  /**
   * 初始化搜索框（作品 / 公司两种模式）。
   * 用法：<div id="search-box"></div>，JS 里 App.initSearch("search-box")
   * 交互：输入即时下拉；方向键选择；回车跳转；点击结果跳转。
   */
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
            '<input type="text" placeholder="搜索作品名、导演、公司…" aria-label="搜索">' +
            '<button class="btn btn--primary" type="button">搜索</button>' +
          "</div>" +
          '<div class="search-dropdown" role="listbox"></div>' +
        "</div>" +
      "</div>";

    var mode = "work";
    var input = box.querySelector("input");
    var dropdown = box.querySelector(".search-dropdown");
    var selected = -1; // 当前键盘选中的结果下标

    // 模式切换：作品 / 公司
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

    /** 执行搜索并渲染下拉。 */
    function runSearch(q) {
      q = q.trim();
      dropdown.classList.remove("open");
      if (!q) return;
      selected = -1;

      var items;
      if (mode === "work") {
        // 作品模式：匹配 作品名 / 导演 / 公司
        items = DATA.filter(function (w) {
          return (
            w.name.indexOf(q) !== -1 ||
            (w.director && w.director.indexOf(q) !== -1) ||
            (w.company && w.company.indexOf(q) !== -1)
          );
        }).slice(0, 8).map(function (w) {
          return {
            href: "work-detail.html?id=" + w.id,
            name: w.name,
            meta: fmtYear(w.year) + " · " + (w.grade || "未评级")
          };
        });
      } else {
        // 公司模式：匹配公司名
        items = window.App.getAllCompanies().filter(function (c) {
          return c.indexOf(q) !== -1;
        }).slice(0, 8).map(function (c) {
          return { href: "company-detail.html?name=" + encodeURIComponent(c), name: c, meta: "公司" };
        });
      }

      if (!items.length) {
        dropdown.innerHTML =
          '<div class="sd-empty">没有找到与「' + escapeHtml(q) + '」相关的结果</div>';
      } else {
        dropdown.innerHTML =
          '<div class="sd-head">' + (mode === "work" ? "作品" : "公司") + "</div>" +
          items.map(function (it, i) {
            return (
              '<button type="button" class="sd-item" role="option" data-i="' + i + '" data-href="' + it.href + '">' +
                '<span class="sd-name">' + escapeHtml(it.name) + "</span>" +
                '<span class="sd-meta">' + escapeHtml(it.meta) + "</span>" +
              "</button>"
            );
          }).join("");
      }
      dropdown.classList.add("open");
      bindDropdown();
    }

    /** 下拉结果点击 / 键盘选择绑定。 */
    function bindDropdown() {
      dropdown.querySelectorAll(".sd-item").forEach(function (el) {
        el.addEventListener("click", function () {
          location.href = el.dataset.href;
        });
      });
    }

    function moveSelection(delta) {
      var items = dropdown.querySelectorAll(".sd-item");
      if (!items.length) return;
      selected = (selected + delta + items.length) % items.length;
      items.forEach(function (el, i) {
        el.setAttribute("aria-selected", i === selected ? "true" : "false");
      });
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
      } else if (e.key === "Escape") {
        dropdown.classList.remove("open");
      }
    });
    // 点击搜索按钮：与回车同行为
    box.querySelector(".search-bar .btn").addEventListener("click", function () {
      var items = dropdown.querySelectorAll(".sd-item");
      if (items.length) location.href = items[0].dataset.href;
    });
    // 点击页面其他处关闭下拉
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target)) dropdown.classList.remove("open");
    });
  };

  /* ============================================================
     5.5 公司统计（公司列表页 / 公司详情页共用）
     ============================================================ */

  /**
   * 计算一家公司的统计指标。
   * @param {string} name 公司名（与作品 company 字段精确匹配）
   * @returns {object} {
   *   works:      全部作品数组
   *   total:      作品总数
   *   rated:      已评级作品数（grade 非"暂未评级"）
   *   recommend:  年度推荐数
   *   recommendRate: 推荐率（0-100，已评级为分母；样本不足时为 null）
   *   goodRate:   良品率（"还行"及以上占比，0-100）
   *   badRate:    翻车率（"不推荐"占比，0-100，数值高代表问题作品多）
   *   seriesRate: 系列化能力占比（数据暂无 series 字段，恒为 0）
   *   hasSeries:  数据是否含 series 字段（当前 false）
   *   techMain:   主要技术类型（"2D"/"3D"/"三渲二"/"其他"）
   *   techMixed:  是否混合型（主要类型占比 < 70% 且类型数 > 1）
   *   activeYears:活跃年份数（不同 year 数量）
   *   years:      各年份作品数映射 { year: count }
   *   sampleEnough: 样本是否足够（已评级 >= 3，设想 §10-5）
   * }
   */
  window.App.getCompanyStats = function (name) {
    var works = DATA.filter(function (w) { return w.company === name; });
    var total = works.length;
    var rated = works.filter(function (w) { return w.grade && w.grade !== "暂未评级"; });
    var ratedCount = rated.length;
    var recommend = rated.filter(function (w) { return w.grade === "年度推荐"; }).length;
    // 良品率："还行"及以上（含年度推荐/佳作/还行/能看）
    var good = rated.filter(function (w) {
      return ["年度推荐", "佳作", "还行", "能看"].indexOf(w.grade) !== -1;
    }).length;
    // 翻车率："不推荐"
    var bad = rated.filter(function (w) { return w.grade === "不推荐"; }).length;

    // 主要技术类型（按作品数），"特殊类型"对外为"其他"
    var techMap = {};
    works.forEach(function (w) {
      var t = w.tech === "特殊类型" ? "其他" : (w.tech || "待补");
      techMap[t] = (techMap[t] || 0) + 1;
    });
    var techKeys = Object.keys(techMap).sort(function (a, b) { return techMap[b] - techMap[a]; });
    var techMain = techKeys[0] || "待补";
    var techMixed = techKeys.length > 1 && (techMap[techMain] / total) < 0.7;

    // 活跃年份
    var yearSet = {};
    works.forEach(function (w) { if (w.year) yearSet[w.year] = true; });
    var activeYears = Object.keys(yearSet).length;

    // 系列化能力：数据暂无 series 字段，返回 0 并标记
    var hasSeries = works.some(function (w) { return w.series; });

    return {
      works: works,
      total: total,
      rated: ratedCount,
      recommend: recommend,
      recommendRate: ratedCount ? Math.round(recommend / ratedCount * 100) : null,
      goodRate: ratedCount ? Math.round(good / ratedCount * 100) : null,
      badRate: ratedCount ? Math.round(bad / ratedCount * 100) : null,
      seriesRate: 0,
      hasSeries: hasSeries,
      techMain: techMain,
      techMixed: techMixed,
      activeYears: activeYears,
      years: yearSet,
      sampleEnough: ratedCount >= 3
    };
  };

  /* ============================================================
     6. 对外导出
     ============================================================ */
  window.App.escapeHtml = escapeHtml;
  window.App.fmtYear = fmtYear;
  window.App.fmtTech = fmtTech;
  window.App.fmtAdaptation = fmtAdaptation;
  window.App.gradeBadgeHtml = gradeBadgeHtml;
  window.App.tagHtml = tagHtml;
  window.App.coverHtml = coverHtml;
  window.App.workCardHtml = workCardHtml;
  window.App.renderWorkCards = renderWorkCards;
})();
