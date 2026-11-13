// Lintel site: scroll reveals, the animated island tour, and the latest-release download link.
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---- Nav: frosted once you scroll ----
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- Reveal on scroll ----
  const revealer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      revealer.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  $$(".reveal, .spot-demo").forEach((el, i) => {
    el.style.transitionDelay = el.closest(".hero") ? `${Math.min(i, 5) * 70}ms` : "";
    revealer.observe(el);
  });

  // ---- Count-up stats ----
  const counter = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      counter.unobserve(e.target);
      const target = Number(e.target.dataset.count), suffix = e.target.dataset.suffix || "";
      if (reduceMotion || target === 0) { e.target.textContent = target + suffix; continue; }
      const start = performance.now(), dur = 1200;
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - p, 4);
        e.target.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => counter.observe(el));

  // ---- Stage: scale the 1000 px screen to fit ----
  const stage = $("#stage"), screen = $("#screen");
  const fit = () => {
    // Fit the whole screen on wide windows; on phones zoom in on the notch and crop the sides.
    const w = stage.clientWidth;
    const s = Math.min(1, Math.max((w - 8) / 1020, w / 640));
    stage.style.setProperty("--s", s);
    screen.style.setProperty("--s", s);
  };
  window.addEventListener("resize", fit);
  fit();

  // Menu-bar clock
  const clock = $("#clock");
  const setClock = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };
  setClock(); setInterval(setClock, 30_000);

  // ---- The island tour ----
  const island = $("#island"), caption = $("#stage-caption");
  const cIcon = $("#c-icon use"), cStatus = $("#c-status");
  const file = $("#dragged-file");
  const steps = $("#claude-steps"), claudeTime = $("#claude-time");
  const noteText = $("#note-text");

  const setState = (state) => { island.dataset.state = state; };
  const say = async (text) => {
    caption.style.opacity = 0;
    await sleep(180);
    caption.textContent = text;
    caption.style.opacity = 1;
  };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // A Claude Code run, with the app's rules: the last three lines, finished steps first, then the
  // step Claude is on, or what it's waiting for. A repeated step counts once.
  const claudeRun = () => {
    let history = [], step = null, waiting = false, message = "";
    return {
      tool(next) {
        waiting = false;
        if (next === step) return;
        if (step) history = [...history, step].slice(-2);
        step = next;
      },
      wait(text) { waiting = true; message = text; },
      get waiting() { return waiting; },
      lines() { return [...history, waiting ? message : (step || "Thinking…")].slice(-3); },
    };
  };
  const renderSteps = (el, run, fresh) => {
    const lines = run.lines();
    el.innerHTML = lines.map((text, i) => {
      const last = i === lines.length - 1;
      const kind = !last ? "done" : run.waiting ? "wait" : "now";
      const icon = { done: "#i-tick", now: "#i-spin", wait: "#i-alert" }[kind];
      return `<div class="${kind}${last && fresh ? " fresh" : ""}"><svg class="ico"><use href="${icon}"/></svg><span>${text}</span></div>`;
    }).join("");
    return lines.length;
  };

  let visible = true, running = false;
  const waitVisible = async () => { while (!visible || document.hidden) await sleep(300); };
  const hold = async (ms, every, fn) => {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      await waitVisible();
      if (fn) fn();
      await sleep(every || ms);
    }
  };

  const scenes = [
    async () => { // today: open the island when nothing's live
      // The visitor's own date and time, so the island agrees with the menu bar clock.
      const now = new Date(), meeting = new Date(now.getTime() + 25 * 60_000);
      const time = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      $(".p-today .band > div > b").textContent = now.toLocaleDateString([], { weekday: "long" });
      $(".p-today .band > div > span").textContent = now.toLocaleDateString([], { day: "numeric", month: "long" });
      $(".p-today .t-time").textContent = time(now);
      $(".p-today .t-card > div > span").textContent = `${time(meeting)} · in 25 min`;
      setState("idle");
      say("Nothing on? Open the island to see your day.");
      await hold(1100);
      setState("today");
      await hold(3600);
    },
    async () => { // timer
      cIcon.setAttribute("href", "#i-timer");
      let s = 299;
      cStatus.textContent = fmt(s);
      setState("timer");
      say("A timer, counting down beside the camera.");
      await hold(3600, 1000, () => { cStatus.textContent = fmt(s--); });
    },
    async () => { // music
      setState("music");
      say("Now Playing — artwork, controls and the album's colour.");
      await hold(4200);
    },
    async () => { // shelf drop
      setState("idle");
      await sleep(500);
      say("Drag a file toward the notch…");
      file.classList.add("show");
      await sleep(600);
      file.classList.add("near");
      await sleep(700);
      setState("drop");
      await sleep(900);
      const keep = $(".drop-tile.keep");
      keep.classList.add("targeted");
      say("…and keep it on the shelf, or send it with AirDrop.");
      await sleep(1500);
      file.classList.add("drop");
      await sleep(350);
      keep.classList.remove("targeted");
      cIcon.setAttribute("href", "#i-tray");
      cStatus.textContent = "1";
      setState("shelf-compact");
      await hold(1800);
      file.className = "dragged-file";
    },
    async () => { // claude
      cIcon.setAttribute("href", "#i-sparkle");
      let t = 12;
      cStatus.textContent = fmt(t);
      setState("claude-compact");
      say("Claude Code is working. You don't have to watch it.");
      await hold(1800, 1000, () => { cStatus.textContent = fmt(t++); });
      const run = claudeRun();
      claudeTime.textContent = fmt(t);
      island.dataset.rows = renderSteps(steps, run, true);
      setState("claude");
      await hold(1000, 1000, () => { claudeTime.textContent = fmt(t++); });
      for (const step of ["Reading NotesModule.swift", "Editing NotesModule.swift", "Run the unit tests"]) {
        run.tool(step);
        island.dataset.rows = renderSteps(steps, run, true);   // the island grows a row at a time
        await hold(1400, 1000, () => { claudeTime.textContent = fmt(t++); });
      }
      await sleep(200);
      $("#banner-title").textContent = "Claude finished in 3m 12s";
      $("#banner-sub").textContent = "lintel";
      setState("banner");
      say("…and tells you the moment it's done.");
      await hold(3000);
    },
    async () => { // system monitor: quiet until something's busy, then the panel
      const speed = $("#m-speed");
      speed.textContent = "Speed test";
      setState("idle");
      say("The System Monitor keeps the notch clear…");
      await hold(1700);
      cIcon.setAttribute("href", "#i-cpu");
      cStatus.textContent = "92%";
      setState("monitor-compact");
      say("…until something's busy.");
      await hold(2000, 500, () => { cStatus.textContent = `${88 + Math.round(Math.random() * 8)}%`; });

      const series = {
        cpu: Array.from({ length: 30 }, (_, i) => 0.35 + 0.5 * (i / 29) + Math.random() * 0.08),
        mem: Array.from({ length: 30 }, () => 0.62 + Math.random() * 0.03),
        net: Array.from({ length: 30 }, (_, i) => 0.15 + 0.6 * Math.abs(Math.sin(i / 4)) * Math.random()),
      };
      const draw = (name, values) => {
        const points = values.map((v, i) => `${(i * 100 / (values.length - 1)).toFixed(1)},${(30 - Math.min(1, v) * 27).toFixed(1)}`);
        $(`#m-${name}-line`).setAttribute("points", points.join(" "));
        $(`#m-${name}-fill`).setAttribute("points", `${points.join(" ")} 100,30 0,30`);
      };
      const step = () => {
        series.cpu.push(Math.min(0.98, 0.84 + Math.random() * 0.12)); series.cpu.shift();
        series.mem.push(0.63 + Math.random() * 0.02); series.mem.shift();
        series.net.push(0.2 + Math.random() * 0.75); series.net.shift();
        Object.entries(series).forEach(([name, values]) => draw(name, values));
        $("#m-cpu").textContent = `${Math.round(series.cpu.at(-1) * 100)}%`;
        $("#m-down").textContent = `↓ ${(series.net.at(-1) * 3.2).toFixed(1)} MB/s`;
        $("#m-up").textContent = `↑ ${40 + Math.round(Math.random() * 80)} KB/s`;
      };
      Object.entries(series).forEach(([name, values]) => draw(name, values));
      setState("monitor");
      say("Open it for live graphs, battery health and a speed test.");
      const start = performance.now();
      await hold(5600, 500, () => {
        step();
        const t = performance.now() - start;
        speed.textContent = t > 3400 ? "↓ 312  ↑ 48 Mbps · 14 ms" : t > 1600 ? "Testing download…" : "Speed test";
      });
    },
    async () => { // clipboard history: ⌃⌥V, then copy an item again
      const rows = $$("#c-rows div");
      const report = rows[2];
      rows.forEach((row) => { row.className = ""; });
      report.querySelector("i").textContent = "▤";
      report.querySelector("em").textContent = "12m";
      setState("clips");
      say("⌃⌥V shows what you copied. Click one to copy it again.");
      await hold(1600);
      report.classList.add("hover");
      report.querySelector("em").textContent = "Copy";
      await hold(900);
      report.classList.add("copied");
      report.querySelector("i").textContent = "✓";
      report.querySelector("em").textContent = "Copied";
      await hold(1600);
    },
    async () => { // quick note
      noteText.textContent = "";
      setState("note");
      say("A quick note from any app with ⌃⌥N.");
      await sleep(700);
      const text = "Groceries for Friday\n– oat milk, basil, lemons\n– call Sam about the trip ✈️";
      for (const ch of text) {
        await waitVisible();
        noteText.textContent += ch;
        await sleep(ch === "\n" ? 260 : 38 + Math.random() * 40);
      }
      await hold(1600);
    },
  ];

  const tour = async () => {
    if (running) return;
    running = true;
    await sleep(900);
    for (;;) {
      for (const scene of scenes) {
        await waitVisible();
        await scene();
        setState("idle");
        await sleep(650);
      }
    }
  };

  if (reduceMotion) {
    setState("music");
    caption.textContent = "Now Playing, right at the notch.";
  } else {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.15 }).observe(stage);
    tour();
  }

  // ---- Claude spotlight: a run that keeps going, always three rows ----
  const dcSteps = $("#dc-steps"), dcTime = $("#dc-time"), dcIcon = $("#dc-icon");
  const dcRun = claudeRun();
  ["Reading ClaudeSection.swift", "Editing ClaudeSection.swift", "Run the unit tests"].forEach((s) => dcRun.tool(s));
  const dcEvents = [
    ["wait", "Claude needs your permission to use Bash"],
    ["tool", "Run the unit tests"],
    ["tool", "Reading app.js"],
    ["tool", "Editing app.js"],
    ["tool", "Searching the code"],
    ["tool", "Committing the changes"],
    ["tool", "Reading ClaudeSection.swift"],
    ["tool", "Editing ClaudeSection.swift"],
    ["tool", "Run the unit tests"],
  ];
  let dcIndex = 0, dcSeconds = 108;
  if (!reduceMotion) {
    setInterval(() => { dcTime.textContent = fmt(++dcSeconds); }, 1000);
    setInterval(() => {
      if (document.hidden) return;
      const [kind, text] = dcEvents[dcIndex];
      dcIndex = (dcIndex + 1) % dcEvents.length;
      if (kind === "wait") dcRun.wait(text); else dcRun.tool(text);
      dcIcon.className = `b-icon ${dcRun.waiting ? "wait" : "claude"}`;
      dcIcon.querySelector("use").setAttribute("href", dcRun.waiting ? "#i-alert" : "#i-sparkle");
      renderSteps(dcSteps, dcRun, true);
    }, 2400);
  }

  // ---- Copy buttons ----
  $$("button[data-copy]").forEach((button) => {
    const label = button.querySelector("span");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText($(button.dataset.copy).textContent.trim());
        label.textContent = "Copied";
      } catch { label.textContent = "Select and copy"; }
      setTimeout(() => { label.textContent = "Copy"; }, 1800);
    });
  });

  // ---- Latest release: direct download link, version and size ----
  fetch("https://api.github.com/repos/Netesh5/lintel/releases/latest", { headers: { Accept: "application/vnd.github+json" } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((release) => {
      const zip = (release.assets || []).find((a) => /^Lintel-.*\.zip$/.test(a.name));
      const version = String(release.tag_name || "").replace(/^v/, "");
      if (zip) {
        $$("a[data-download]").forEach((a) => { if (a.getAttribute("href").startsWith("http")) a.href = zip.browser_download_url; });
        $$("[data-size]").forEach((el) => { el.textContent = `${(zip.size / 1e6).toFixed(1)} MB · `; });
      }
      if (version) {
        $$("[data-version]").forEach((el) => { el.textContent = `Free · Version ${version}`; });
        $$("[data-version-full]").forEach((el) => { el.textContent = `Version ${version}`; });
        $$("[data-version-num]").forEach((el) => { el.textContent = version; });
      }
    })
    .catch(() => { /* Links already point at the latest release page. */ });
})();
