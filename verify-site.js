/* ============================================================
   全站验证脚本（临时，验证后删除）
   - 打开每个页面，截图（桌面 1280 宽 + 移动 390 宽）
   - 收集 console 错误 / 页面报错
   - 检查关键内容是否渲染
   ============================================================ */
const { chromium } = require(process.env.PLAYWRIGHT_DIR);
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:8123/";
const SHOT = process.env.SHOT_DIR || path.join(process.env.TEMP || ".", "site_shots");
fs.mkdirSync(SHOT, { recursive: true });

// 页面清单：[路径, 可选查询参数]
const PAGES = [
  ["index.html", null],
  ["series.html", null],
  ["movies.html", null],
  ["work-detail.html", "?id=5"],
  ["work-detail.html", "?id=140"],
  ["work-detail.html", "?id=99999"],   // 不存在 id，测空状态
  ["company.html", null],
  ["company-detail.html", "?name=" + encodeURIComponent("视美")],
  ["company-detail.html", "?name=" + encodeURIComponent("不存在的公司")], // 空状态
  ["industry.html", null],
  ["legal.html", null],
  ["404.html", null]
];

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const [file, qs] of PAGES) {
    const url = BASE + file + (qs ? qs : "");
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
    page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 200)));
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 }).catch((e) => errors.push("NAV: " + e.message.slice(0, 120)));
    await page.waitForTimeout(1200); // 等 ECharts 渲染

    const tag = (file.replace(".html", "") + (qs ? qs.replace(/[?&=]/g, "-").slice(0, 30) : "")).replace(/[^\w-]/g, "");
    await page.screenshot({ path: path.join(SHOT, tag + "-desktop.png"), fullPage: true });

    // 检查关键容器是否有内容
    const checks = await page.evaluate(() => {
      const out = {};
      const sel = (id) => {
        const el = document.getElementById(id);
        return el ? (el.textContent || "").trim().slice(0, 60) : "MISSING";
      };
      out.title = document.title;
      out.mainText = (document.querySelector("main")?.textContent || "").trim().slice(0, 80);
      return out;
    });
    results.push({ url, errors, checks });
    await page.close();

    // 移动端
    const mp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mp.goto(url, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await mp.waitForTimeout(800);
    await mp.screenshot({ path: path.join(SHOT, tag + "-mobile.png"), fullPage: true });
    await mp.close();
  }
  await browser.close();

  // 输出报告
  let failed = 0;
  for (const r of results) {
    const status = r.errors.length ? "ERRORS" : "OK";
    if (r.errors.length) failed++;
    console.log(`[${status}] ${r.url}`);
    console.log(`   title: ${r.checks.title}`);
    console.log(`   main:  ${r.checks.mainText}`);
    r.errors.forEach((e) => console.log(`   ! ${e}`));
  }
  console.log(failed ? `FAILED_PAGES=${failed}` : "ALL_PAGES_OK");
  console.log("SHOTS_IN=" + SHOT);
})();
