/* ============================================================
   国产动画资料库 | 作品详情页逻辑 js/work-detail.js
   ------------------------------------------------------------
   职责（模板页，剧集 / 电影共用）：
   1. 从 URL 读取 ?id=xxx，按 id 查作品
   2. 填充详情头：标题、评级徽标、元信息行
   3. 渲染简介 / 评分 / 详细信息表格（按 type 区分字段）
   4. 系列作品区块：数据含 series 字段时启用（见下方注释）

   数据字段说明（tv-data.js 当前结构）：
   id, name, company, adaptation, director, year, rating（内部评级）,
   grade（对外评级）, tech, cover_url, release_date, release_status,
   box_office, type（'tv' 剧集 / 'movie' 电影）
   ============================================================ */
(function () {
  "use strict";

  /** 从 URL 查询串读取参数。 */
  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /**
   * 评级显示规则（设想 §5.1.3）：
   * - 对外显示 grade（"年度推荐/佳作/还行/能看/暂未评级/不推荐"）
   * - 内部细分（rating 如"年度推荐 中推荐"）仅当属"年度推荐"档时对外显示，
   *   低评级（不太行/较差）的细分不对外，统一显示"不推荐"
   */
  function ratingLabel(w) {
    if (w.rating && w.rating.indexOf("年度推荐") === 0) return w.rating;
    return w.grade;
  }

  /**
   * 票房格式化（数据单位为万元）：
   * >= 10000 万（1 亿）→ "1.13 亿"；否则 "8900 万"
   */
  function fmtBoxOffice(v) {
    if (v == null) return "—";
    if (v >= 10000) {
      var yi = v / 10000;
      return yi.toFixed(2).replace(/\.?0+$/, "") + " 亿";
    }
    return v.toLocaleString() + " 万";
  }

  /** 空值兜底显示。 */
  function orEmpty(v) { return v || "待补"; }

  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome(null); // 详情页不在主导航中，不高亮

    var id = getParam("id");
    var work = id ? window.App.getWorkById(id) : null;

    // ---- 作品不存在（参数缺失 / id 无效） ----
    if (!work) {
      var main = document.querySelector(".site-main .container");
      main.innerHTML =
        '<div class="empty-tip" style="margin-top:40px">' +
          '<div class="et-title">未找到该作品</div>' +
          '链接可能已失效，请从列表页重新进入。' +
        "</div>";
      return;
    }

    var isMovie = work.type === "movie";
    var typeLabel = isMovie ? "电影" : "剧集";

    // ---- 面包屑 ----
    document.getElementById("breadcrumb").innerHTML =
      '<a href="index.html">首页</a>' +
      '<span class="sep">/</span>' +
      '<a href="' + (isMovie ? "movies.html" : "series.html") + '">' + (isMovie ? "动画电影" : "剧集动画") + "</a>" +
      '<span class="sep">/</span>' +
      "<span>" + window.App.escapeHtml(work.name) + "</span>";

    // ---- 标题 + 徽标 ----
    document.title = work.name + " | 国产动画资料库";
    document.getElementById("dh-title").textContent = work.name;
    document.getElementById("dh-badges").innerHTML =
      window.App.gradeBadgeHtml(ratingLabel(work)) +
      window.App.tagHtml(typeLabel) +
      window.App.tagHtml(window.App.fmtTech(work.tech));

    // ---- 元信息行（按类型区分字段） ----
    var metaRows = [
      { label: "年份", value: window.App.fmtYear(work.year) },
      { label: "题材", value: window.App.fmtAdaptation(work.adaptation) },
      { label: "导演", value: orEmpty(work.director) }
    ];
    if (work.company) {
      // 公司可多个（数据中为"、"或"/"分隔），逐个链接到公司详情页
      var companyLinks = work.company.split(/[、\/]/).map(function (c) {
        c = c.trim();
        if (!c) return "";
        return '<a href="company-detail.html?name=' + encodeURIComponent(c) + '">' +
          window.App.escapeHtml(c) + "</a>";
      }).join("、");
      metaRows.push({ label: "制作公司", value: companyLinks, html: true });
    } else {
      metaRows.push({ label: "制作公司", value: "待补" });
    }

    document.getElementById("dh-meta").innerHTML = metaRows.map(function (r) {
      return (
        '<div class="dm-row">' +
          '<span class="dm-label">' + r.label + "</span>" +
          '<span class="dm-value">' + (r.html ? r.value : window.App.escapeHtml(r.value)) + "</span>" +
        "</div>"
      );
    }).join("");

    // ---- 封面（无图自动占位） ----
    document.getElementById("dh-cover").innerHTML = window.App.coverHtml(work, typeLabel);

    // ---- 简介（数据有 synopsis 则显示；无则空状态） ----
    if (work.synopsis) {
      document.getElementById("synopsis").textContent = work.synopsis;
    } else {
      document.getElementById("synopsis").innerHTML =
        '<span class="syn-empty">简介整理中，该条目信息将随数据补充逐步完善。</span>';
    }

    // ---- 详细信息表格（按类型） ----
    var infoRows;
    if (isMovie) {
      infoRows = [
        ["上映日期", orEmpty(work.release_date)],
        ["上映状态", work.release_status || "待补"],
        ["票房", fmtBoxOffice(work.box_office)],
        ["技术类型", window.App.fmtTech(work.tech)],
        ["改编来源", window.App.fmtAdaptation(work.adaptation)],
        ["导演", orEmpty(work.director)],
        ["制作公司", work.company || "待补"]
      ];
    } else {
      infoRows = [
        ["播出年份", window.App.fmtYear(work.year)],
        ["开播日期", work.release_date || "待补"],
        ["集数", work.episodes != null ? work.episodes + " 集" : "待补"],
        ["播出平台", work.platform && work.platform.length ? work.platform.join("、") : "待补"],
        ["技术类型", window.App.fmtTech(work.tech)],
        ["改编来源", window.App.fmtAdaptation(work.adaptation)],
        ["导演", orEmpty(work.director)],
        ["制作公司", work.company || "待补"]
      ];
    }
    // 注：播出平台、集数、评分等字段的数据管道见 build-data.py（Excel 表 → tv-data.js）
    document.getElementById("info-sub").textContent = isMovie ? "movie" : "tv";
    document.getElementById("info-table").querySelector("tbody").innerHTML =
      infoRows.map(function (r) {
        return "<tr><th>" + r[0] + "</th><td>" + window.App.escapeHtml(r[1]) + "</td></tr>";
      }).join("");

    // ---- 评分表格（豆瓣 / Bangumi） ----
    // 数据有 douban_score / bgm_score 则显示，无则"暂无评分"；
    // 评分按设想 §5.1.2 定期更新，非实时数据。
    // 注：MAL 已按用户决定移除（数据表仅保留豆瓣与 BGM 两列）。
    var scoreRows = [
      ["豆瓣", work.douban_score],
      ["Bangumi", work.bgm_score]
    ];
    document.getElementById("score-table").querySelector("tbody").innerHTML =
      scoreRows.map(function (r) {
        var val = (r[1] == null)
          ? '<td class="it-empty">暂无评分</td>'
          : "<td>" + r[1] + "</td>";
        return "<tr><th>" + r[0] + "</th>" + val + "</tr>";
      }).join("");

    // ---- 系列作品区块（设想 §5.1.7） ----
    // series_ids 为同系列作品 id 数组（tv-data id）；无系列关联的作品保持隐藏。
    var seriesBlock = document.getElementById("series-block");
    if (work.series_ids && work.series_ids.length) {
      var same = work.series_ids
        .map(function (id) { return window.App.getWorkById(id); })
        .filter(Boolean)
        .sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
      document.getElementById("series-list").innerHTML = same.map(function (w) {
        var current = w.id === work.id;
        return (
          '<div class="series-row' + (current ? " current" : "") + '">' +
            '<span class="sr-year">' + (w.year || "?") + "</span>" +
            '<span class="sr-name">' + (current
              ? window.App.escapeHtml(w.name)
              : '<a href="work-detail.html?id=' + w.id + '">' + window.App.escapeHtml(w.name) + "</a>") + "</span>" +
            '<span class="sr-type">' + (w.type === "movie" ? "电影" : "剧集") + "</span>" +
          "</div>"
        );
      }).join("");
      seriesBlock.hidden = false;
    }
  });
})();
