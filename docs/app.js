// NC Second Chance Tracker
// Reads the CSV files in /data and draws the page. To add a year, add rows to
// data/expunctions_by_statute.csv and data/report_totals.csv; no code changes needed.

const NS = "http://www.w3.org/2000/svg";
const fmt = n => n.toLocaleString("en-US");
const short = n => n >= 1e6 ? (n / 1e6).toFixed(2).replace(/0$/, "") + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n);
const fyLabel = fy => "FY " + fy.replace("-", "–");
const fyShort = fy => "’" + fy.slice(2).replace("-", "–");

// Small CSV parser that handles quoted fields with commas.
function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}
const load = path => fetch(path).then(r => {
  if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
  return r.text();
}).then(parseCSV);

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function stacked(id, years, series, opts) {
  const host = document.getElementById(id);
  host.innerHTML = "";
  const W = 520, H = 280, ml = 48, mr = 8, mt = 26, mb = 30;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.aria }, host);
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
  const tot = years.map((_, i) => series.reduce((s, x) => s + x.v[i], 0));
  const max = niceMax(Math.max(...tot, 1));
  const y = v => mt + (H - mt - mb) * (1 - v / max);
  const lead = Math.round(max / Math.pow(10, Math.floor(Math.log10(max))));
  const ticks = lead % 5 === 0 ? 5 : 4;
  const bw = (W - ml - mr) / years.length, w = Math.min(36, bw * .6);

  (opts.shade || []).forEach(([a, b]) => {
    el("rect", { x: ml + bw * a, y: mt, width: bw * (b - a + 1), height: H - mt - mb, fill: "var(--warn-soft)" }, svg);
    const t = el("text", { x: ml + bw * (a + (b - a + 1) / 2), y: mt - 8, "text-anchor": "middle", style: "fill:var(--warn);font-weight:600" }, svg);
    t.textContent = "automatic paused";
  });
  for (let t = 0; t <= ticks; t++) {
    const v = max * t / ticks;
    el("line", { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: "var(--grid)", "stroke-width": 1 }, svg);
    const tx = el("text", { x: ml - 6, y: y(v) + 4, "text-anchor": "end" }, svg); tx.textContent = short(v);
  }
  years.forEach((fy, i) => {
    const cx = ml + bw * i + bw / 2;
    const visible = series.filter(s => s.v[i] > 0);
    let acc = 0;
    visible.forEach((s, j) => {
      const v = s.v[i], y1 = y(acc + v), gap = acc > 0 ? 2 : 0;
      const isTop = j === visible.length - 1;
      const hh = Math.max(isTop ? 1.5 : 0, y(acc) - y1 - gap);
      acc += v;
      if (hh <= 0) return;
      if (isTop) {
        const r = Math.min(4, hh / 2, w / 2), x0 = cx - w / 2;
        el("path", { d: `M${x0},${y1 + hh}V${y1 + r}Q${x0},${y1} ${x0 + r},${y1}H${x0 + w - r}Q${x0 + w},${y1} ${x0 + w},${y1 + r}V${y1 + hh}Z`, fill: s.c }, svg);
      } else el("rect", { x: cx - w / 2, y: y1, width: w, height: hh, fill: s.c }, svg);
    });
    const lab = el("text", { x: cx, y: H - mb + 16, "text-anchor": "middle" }, svg); lab.textContent = fyShort(fy);
    const tv = el("text", { x: cx, y: y(tot[i]) - 5, "text-anchor": "middle", class: "val" }, svg); tv.textContent = short(tot[i]);
    const hit = el("rect", { x: ml + bw * i, y: mt, width: bw, height: H - mt - mb, fill: "transparent", tabindex: 0 }, svg);
    const show = () => {
      tip.innerHTML = `<div><b>${fyLabel(fy)}</b></div>` +
        series.map(s => `<div class="r"><span><i class="sw" style="background:${s.c}"></i> ${s.n}</span><b>${fmt(s.v[i])}</b></div>`).join("") +
        `<div class="r" style="border-top:1px solid;margin-top:4px;padding-top:4px"><span>Total</span><b>${fmt(tot[i])}</b></div>`;
      tip.hidden = false;
      const sx = host.clientWidth / W;
      tip.style.left = Math.max(95, Math.min(host.clientWidth - 95, cx * sx)) + "px";
      tip.style.top = (Math.max(y(tot[i]), mt + 60) * sx - 8) + "px";
    };
    hit.addEventListener("mouseenter", show); hit.addEventListener("focus", show);
    hit.addEventListener("mouseleave", () => tip.hidden = true); hit.addEventListener("blur", () => tip.hidden = true);
  });
  el("line", { x1: ml, x2: W - mr, y1: y(0), y2: y(0), stroke: "var(--faint)", "stroke-width": 1 }, svg);
}

function tile(num, label, src, flag) {
  return `<div class="tile${flag ? " flag" : ""}"><div class="num">${num}</div><div class="lbl">${label}</div><div class="src">${src}</div></div>`;
}

async function main() {
  const [rows, totals, elig, timeline] = await Promise.all([
    load("data/expunctions_by_statute.csv"), load("data/report_totals.csv"),
    load("data/eligibility_estimates.csv"), load("data/timeline.csv")]);

  const years = totals.map(t => t.fiscal_year).sort();
  const byCat = cat => years.map(fy => rows.filter(r => r.fiscal_year === fy && r.category === cat).reduce((s, r) => s + +r.count, 0));
  const auto = byCat("automatic"), petNon = byCat("petition_nonconviction"),
    adult = byCat("adult_conviction"), youth = byCat("youth_conviction"), other = byCat("other");
  const total = years.map((_, i) => auto[i] + petNon[i] + adult[i] + youth[i] + other[i]);
  const petition = total.map((t, i) => t - auto[i]);
  const last = years.length - 1, latest = years[last];

  // Pause = years with zero automatic expunctions after automatic expunction started.
  const firstAuto = auto.findIndex(v => v > 0), shade = [];
  for (let i = firstAuto + 1; firstAuto >= 0 && i < years.length; i++) {
    if (auto[i] === 0) { if (shade.length && shade.at(-1)[1] === i - 1) shade.at(-1)[1] = i; else shade.push([i, i]); }
  }

  const span = years.slice(-5), spanTotal = total.slice(-5).reduce((a, b) => a + b, 0);
  const autoYears = years.map((_, i) => i).filter(i => i >= firstAuto);
  const autoShare = autoYears.reduce((s, i) => s + auto[i], 0) / autoYears.reduce((s, i) => s + total[i], 0);
  const eligible = +(elig.find(e => e.metric === "eligible_to_clear_conviction") || {}).value || 0;

  document.getElementById("badge").textContent = `Prototype · built from public reports · data through ${fyLabel(latest)}`;
  document.getElementById("tiles").innerHTML =
    tile(short(spanTotal), `expunctions granted, ${fyLabel(span[0])} to ${span.at(-1).replace("-", "–")}`, "AOC annual expunction reports") +
    tile(Math.round(autoShare * 100) + "%", "came through automatic expunction of dismissals and acquittals", `G.S. 15A-146(a4), ${fyLabel(years[firstAuto])} to ${latest.replace("-", "–")}`) +
    tile(fmt(adult[last]), `adult conviction expunctions by petition in ${fyLabel(latest)}`, "G.S. 15A-145.5, nonviolent misdemeanors and felonies") +
    tile("~" + short(eligible), "people estimated eligible to clear a conviction but haven't", "Paper Prisons, NC Second Chance Gap (pre-2020 rules)", true);

  stacked("c1", years, [{ n: "By petition", v: petition, c: "var(--s2)" }, { n: "Automatic", v: auto, c: "var(--s1)" }],
    { aria: "Stacked bars of expunctions per fiscal year, automatic vs petition", shade });
  stacked("c2", years, [
    { n: "Dismissal / not guilty", v: petNon, c: "var(--s2)" }, { n: "Adult convictions", v: adult, c: "var(--s3)" },
    { n: "Under-18 convictions", v: youth, c: "var(--s4)" }, { n: "Other statutes", v: other, c: "var(--s5)" }],
    { aria: "Stacked bars of petition expunctions per fiscal year by type" });

  document.getElementById("gap").innerHTML =
    `<div class="gaprow"><div class="lab"><b>~${fmt(eligible)}</b>estimated eligible to clear a conviction</div><div class="bar big" style="width:100%"></div></div>
     <div class="gaprow"><div class="lab"><b>${fmt(adult[last])}</b>adult conviction expunctions, ${fyLabel(latest)}</div><div class="bar" style="width:${Math.max(.6, adult[last] / eligible * 100).toFixed(2)}%;min-width:3px"></div></div>`;
  document.getElementById("yrs").textContent = adult[last] ? Math.round(eligible / adult[last]) : "—";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  document.getElementById("timeline").innerHTML = timeline.map(t => {
    const [yy, mm, dd] = t.date.split("-");
    return `<li${t.type === "setback" ? ' class="stop"' : ""}><span class="when">${months[+mm - 1]} ${+dd}, ${yy}</span><span class="what">${t.event}</span><span class="muted">${t.detail}</span></li>`;
  }).join("");

  const statutes = [...new Set(rows.map(r => r.statute))];
  const cell = (fy, st) => +(rows.find(r => r.fiscal_year === fy && r.statute === st) || { count: 0 }).count;
  document.getElementById("tbl").innerHTML =
    `<thead><tr><th>Statute</th><th>Covers</th>${years.map(y => `<th>${y}</th>`).join("")}</tr></thead><tbody>` +
    statutes.map(st => {
      const r = rows.find(x => x.statute === st);
      const hl = r.category === "automatic" || r.category === "adult_conviction";
      return `<tr${hl ? ' class="hl"' : ""}><td>${st}</td><td>${r.description}</td>${years.map(fy => `<td>${fmt(cell(fy, st))}</td>`).join("")}</tr>`;
    }).join("") +
    `<tr class="total"><td>Total</td><td></td>${total.map(x => `<td>${fmt(x)}</td>`).join("")}</tr></tbody>`;
}

main().catch(err => {
  document.getElementById("tiles").innerHTML = `<div class="tile flag"><div class="lbl">The data didn't load.</div><div class="src">${err.message}. If you opened index.html straight from your computer, run a local server instead (see README).</div></div>`;
  console.error(err);
});
