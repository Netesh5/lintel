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
  const steps = $("#claude-steps"), claudeStep = $("#claude-step"), claudeTime = $("#claude-time");
  const noteText = $("#note-text");

  const setState = (state) => { island.dataset.state = state; };
  const say = async (text) => {
    caption.style.opacity = 0;
    await sleep(180);
    caption.textContent = text;
    caption.style.opacity = 1;
  };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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
      steps.innerHTML = "";
      setState("claude");
      const flow = [
        ["Reading NotesModule.swift", "Read NotesModule.swift"],
        ["Editing NotesModule.swift", "Edited NotesModule.swift"],
        ["Run the unit tests", "Ran the unit tests"],
      ];
      for (const [doing, done] of flow) {
        claudeStep.textContent = `${doing} · in lintel`;
        const row = document.createElement("div");
        row.className = "now";
        row.innerHTML = `<svg class="ico"><use href="#i-update"/></svg><span>${doing}</span>`;
        steps.append(row);
        await hold(1300, 1000, () => { claudeTime.textContent = fmt(t++); });
        row.className = "";
        row.innerHTML = `<svg class="ico"><use href="#i-check"/></svg><span>${done}</span>`;
      }
      await sleep(400);
      $("#banner-title").textContent = "Claude finished in 3m 12s";
      $("#banner-sub").textContent = "lintel";
      setState("banner");
      say("…and tells you the moment it's done.");
      await hold(3000);
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

  // ---- Claude spotlight: steps tick by ----
  const dcStep = $("#dc-step"), dcTime = $("#dc-time"), dcTitle = $("#dc-title");
  const dcSteps = [
    ["Claude is working", "Editing ClaudeStatusModule.swift · in lintel"],
    ["Claude is working", "Run the unit tests · in lintel"],
    ["Claude needs you", "In lintel"],
    ["Claude is working", "Committing the changes · in lintel"],
  ];
  let dcIndex = 0, dcSeconds = 108;
  if (!reduceMotion) {
    setInterval(() => { dcTime.textContent = fmt(++dcSeconds); }, 1000);
    setInterval(() => {
      dcIndex = (dcIndex + 1) % dcSteps.length;
      dcStep.style.opacity = 0;
      setTimeout(() => {
        const [title, step] = dcSteps[dcIndex];
        dcTitle.textContent = title;
        dcStep.textContent = step;
        dcStep.style.opacity = 1;
      }, 300);
    }, 2600);
  }

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
