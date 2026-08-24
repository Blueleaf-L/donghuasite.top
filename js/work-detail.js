/* 国产动画资料库 | 作品详情页逻辑（剧集/电影共用） */
(function () {
  "use strict";

  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function ratingLabel(w) {
    if (w.rating && w.rating.indexOf("年度推荐") === 0) return w.rating;
    return w.grade;
  }

  function fmtBoxOffice(v) {
    if (v == null) return "—";
    if (v >= 10000) {
      var yi = v / 10000;
      return yi.toFixed(2).replace(/\.?0+$/, "") + " 亿";
    }
    return v.toLocaleString() + " 万";
  }

  function orEmpty(v) { return v || "待补"; }

  function scoreCard(source, value) {
    var has = value != null;
    return (
      '<div class="score-card">' +
        '<div class="sc-source">' + window.App.escapeHtml(source) + "</div>" +
        '<div class="sc-value' + (has ? "" : " na") + '">' + (has ? value : "暂无") + "</div>" +
      "</div>"
    );
  }

  function platformHtml(platforms) {
    if (!platforms || !platforms.length) return "待补";
    return platforms.map(function (p) {
      return '<span class="platform"><span class="p-dot" style="--c:' + window.App.platformColor(p) + '"></span>' +
        window.App.escapeHtml(p) + "</span>";
    }).join('<span style="margin:0 4px"></span>');
  }

  function seriesCardHtml(w, current) {
    var typeLabel = w.type === "movie" ? "电影" : "剧集";
    return (
      '<a class="work-card series-card' + (current ? " is-current" : "") + '" href="work-detail.html?id=' + w.id + '">' +
        '<div class="cover">' + window.App.coverHtml(w, typeLabel) + "</div>" +
        '<div class="w-name">' + window.App.escapeHtml(w.name) + "</div>" +
        '<div class="w-meta">' + window.App.tagHtml(window.App.fmtYear(w.year)) + window.App.gradeBadgeHtml(w.grade) + "</div>" +
      "</a>"
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.App.mountChrome(null);

    var id = getParam("id");
    var work = id ? window.App.getWorkById(id) : null;

    if (!work) {
      var main = document.querySelector(".site-main .container");
      main.innerHTML =
        '<div class="empty-tip" style="margin-top:40px">' +
          '<div class="et-title">未找到该作品</div>链接可能已失效，请从列表页重新进入。</div>';
      return;
    }

    var isMovie = work.type === "movie";
    var typeLabel = isMovie ? "电影" : "剧集";

    document.getElementById("breadcrumb").innerHTML =
      '<a href="index.html">首页</a><span class="sep">/</span>' +
      '<a href="' + (isMovie ? "movies.html" : "series.html") + '">' + (isMovie ? "动画电影" : "剧集动画") + "</a>" +
      '<span class="sep">/</span><span>' + window.App.escapeHtml(work.name) + "</span>";

    document.title = work.name + " | 国产动画资料库";
    document.getElementById("dh-title").textContent = work.name;
    document.getElementById("dh-badges").innerHTML =
      window.App.gradeBadgeHtml(ratingLabel(work)) +
      window.App.tagHtml(typeLabel) +
      window.App.tagHtml(window.App.fmtTech(work.tech));

    var metaRows = [
      { label: "年份", value: window.App.fmtYear(work.year) },
      { label: "题材", value: (work.adaptation && work.adaptation.length ? work.adaptation.join("、") : "改编来源待补") },
      { label: "导演", value: orEmpty(work.director) }
    ];
    if (work.company) {
      var companyLinks = work.company.split(/[、\/]/).map(function (c) {
        c = c.trim();
        if (!c) return "";
        return '<a href="company-detail.html?name=' + encodeURIComponent(c) + '">' + window.App.escapeHtml(c) + "</a>";
      }).join("、");
      metaRows.push({ label: "制作公司", value: companyLinks, html: true });
    } else {
      metaRows.push({ label: "制作公司", value: "待补" });
    }
    document.getElementById("dh-meta").innerHTML = metaRows.map(function (r) {
      return (
        '<div class="dm-row"><span class="dm-label">' + r.label + "</span>" +
        '<span class="dm-value">' + (r.html ? r.value : window.App.escapeHtml(r.value)) + "</span></div>"
      );
    }).join("");

    document.getElementById("dh-cover").innerHTML = window.App.coverHtml(work, typeLabel);

    if (work.synopsis) {
      document.getElementById("synopsis").textContent = work.synopsis;
    } else {
      document.getElementById("synopsis").innerHTML = '<span class="syn-empty">简介整理中，该条目信息将随数据补充逐步完善。</span>';
    }

    // 详细信息表
    var adaptText = work.adaptation && work.adaptation.length ? work.adaptation.join("、") : "待补";
    var infoRows;
    if (isMovie) {
      infoRows = [
        { label: "上映日期", value: orEmpty(work.release_date) },
        { label: "上映状态", value: work.release_status || "待补" },
        { label: "票房", value: fmtBoxOffice(work.box_office) },
        { label: "片长", value: work.runtime != null ? work.runtime + " 分钟" : "待补" },
        { label: "技术类型", value: window.App.fmtTech(work.tech) },
        { label: "改编来源", value: adaptText },
        { label: "导演", value: orEmpty(work.director) },
        { label: "制作公司", value: work.company || "待补" }
      ];
    } else {
      infoRows = [
        { label: "播出年份", value: window.App.fmtYear(work.year) },
        { label: "开播日期", value: work.release_date || "待补" },
        { label: "集数", value: work.episodes != null ? work.episodes + " 集" : "待补" },
        { label: "播出平台", value: platformHtml(work.platform), html: true },
        { label: "技术类型", value: window.App.fmtTech(work.tech) },
        { label: "改编来源", value: adaptText },
        { label: "导演", value: orEmpty(work.director) },
        { label: "制作公司", value: work.company || "待补" }
      ];
    }
    document.getElementById("info-sub").textContent = isMovie ? "movie" : "tv";
    document.getElementById("info-table").querySelector("tbody").innerHTML =
      infoRows.map(function (r) {
        return "<tr><th>" + r.label + "</th><td>" + (r.html ? r.value : window.App.escapeHtml(r.value)) + "</td></tr>";
      }).join("");

    // 评分卡
    var scoreRows = isMovie
      ? [["豆瓣", work.douban_score], ["IMDb", work.imdb_score], ["Bangumi", work.bgm_score]]
      : [["豆瓣", work.douban_score], ["Bangumi", work.bgm_score]];
    document.getElementById("score-grid").innerHTML =
      scoreRows.map(function (r) { return scoreCard(r[0], r[1]); }).join("");

    // 系列作品（横向滑动卡片）
    var seriesBlock = document.getElementById("series-block");
    if (work.series_ids && work.series_ids.length) {
      var same = work.series_ids
        .map(function (sid) {
          var wid = (typeof sid === "object" && sid) ? sid.id : sid;
          return window.App.getWorkById(wid);
        })
        .filter(Boolean)
        .sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
      if (same.length) {
        document.getElementById("series-list").innerHTML =
          same.map(function (w) { return seriesCardHtml(w, w.id === work.id); }).join("");
        seriesBlock.hidden = false;
      }
    }

    window.App.initReveal();
  });
})();
