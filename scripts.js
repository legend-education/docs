(function () {
  var STANDARDS_LINK_CLASS = "legend-standards-link";
  var SIDEBAR_TAGLINE_CLASS = "legend-sidebar-tagline";
  var STANDARDS_TABLE_WRAP_CLASS = "standards-table-wrap";

  function ensureStandardsLink() {
    var navbar = document.getElementById("navbar");
    if (!navbar) return;

    var logoLink = null;
    var anchors = navbar.querySelectorAll("a");
    for (var i = 0; i < anchors.length; i++) {
      if (anchors[i].querySelector("img, svg")) {
        logoLink = anchors[i];
        break;
      }
    }
    if (!logoLink) return;

    var sibling = logoLink.nextElementSibling;
    if (sibling && sibling.classList && sibling.classList.contains(STANDARDS_LINK_CLASS)) {
      return;
    }

    var standardsLink = document.createElement("a");
    standardsLink.href = "/";
    standardsLink.className = STANDARDS_LINK_CLASS;
    standardsLink.textContent = "Standards";
    standardsLink.setAttribute("aria-label", "Standards home");
    logoLink.insertAdjacentElement("afterend", standardsLink);
  }

  // Inject "crafted with love by Legend.org" into the sidebar's bottom
  // section, just above the divider line that sits above the dark-mode
  // toggle. The almond theme renders this as:
  //   .almond-nav-bottom-section
  //     .almond-nav-bottom-section-divider   ← hairline rule
  //     <toggle row>                         ← dark-mode pill, etc.
  // We anchor on the dark-mode toggle (stable aria-label), walk up to the
  // bottom-section wrapper, and insert the tagline before the divider so
  // the existing rule visually separates it from the toggle row.
  function ensureSidebarTagline() {
    var toggle = document.querySelector('[aria-label="Toggle dark mode"]');
    if (!toggle) return;

    var section = toggle.closest('[class*="nav-bottom-section"]');
    if (!section) return;

    var divider = section.querySelector('[class*="nav-bottom-section-divider"]');
    if (!divider) return;

    var prev = divider.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains(SIDEBAR_TAGLINE_CLASS)) {
      return;
    }

    var tagline = document.createElement("p");
    tagline.className = SIDEBAR_TAGLINE_CLASS;
    tagline.appendChild(document.createTextNode("crafted with love by "));
    var link = document.createElement("a");
    link.href = "https://legend.org";
    link.textContent = "Legend.org";
    tagline.appendChild(link);

    section.insertBefore(tagline, divider);
  }

  // Build the interactive state map on the homepage. Source of truth is
  // the existing <table class="state-standards-table"> in index.mdx:
  // we scrape each row once into a name -> {ela, math, ..., rowId} map,
  // then inject /images/us-states.svg, then delegate click + keyboard
  // events at the map's root. Selecting a state highlights its path and
  // renders the popover card; a "View in full table" pill scrolls the
  // matching <tr> into view and briefly flashes its background.
  //
  // Every step is idempotent so the MutationObserver below can fire it
  // freely as Mintlify mounts/unmounts the homepage on SPA navigation.
  function ensureStateMap() {
    var mapEl = document.getElementById("legend-state-map");
    var cardEl = document.getElementById("legend-state-map-card");
    if (!mapEl || !cardEl) return;

    var table = document.querySelector(".state-standards-table");
    if (!table) return;

    var rows = table.querySelectorAll("tbody > tr");
    if (rows.length === 0) return;

    var stateDataMap = mapEl.__legendStateData;
    if (!stateDataMap) {
      stateDataMap = Object.create(null);
      mapEl.__legendStateData = stateDataMap;
    }

    for (var i = 0; i < rows.length; i++) {
      indexRow(rows[i], stateDataMap);
    }

    if (!mapEl.dataset.svgLoaded) {
      mapEl.dataset.svgLoaded = "pending";
      fetch("/images/us-states.svg")
        .then(function (res) {
          if (!res.ok) throw new Error("SVG fetch failed: " + res.status);
          return res.text();
        })
        .then(function (markup) {
          var doc = new DOMParser().parseFromString(markup, "image/svg+xml");
          var svg = doc.querySelector("svg");
          if (!svg) throw new Error("No <svg> in /images/us-states.svg");
          mapEl.innerHTML = "";
          mapEl.appendChild(svg);
          mapEl.dataset.svgLoaded = "true";
          bindMapHandlers(mapEl, cardEl, stateDataMap);
        })
        .catch(function (err) {
          mapEl.dataset.svgLoaded = "error";
          // Surface in the console; the table below the (empty) map
          // remains fully functional, so failure mode is graceful.
          console.error("[legend] state map:", err);
        });
    } else if (mapEl.dataset.svgLoaded === "true") {
      bindMapHandlers(mapEl, cardEl, stateDataMap);
    }
  }

  function indexRow(tr, stateDataMap) {
    var th = tr.querySelector('th[scope="row"]');
    if (!th) return;
    var nameEl = th.querySelector("span");
    var name = (nameEl ? nameEl.textContent : th.textContent).trim();
    if (!name) return;

    if (!tr.id) {
      var slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      tr.id = "state-row-" + slug;
    }
    tr.dataset.state = name;

    if (stateDataMap[name]) return;
    var cells = tr.querySelectorAll("td");
    if (cells.length < 5) return;
    stateDataMap[name] = {
      ela: cells[0].innerHTML,
      math: cells[1].innerHTML,
      science: cells[2].innerHTML,
      socialStudies: cells[3].innerHTML,
      assessments: cells[4].innerHTML,
      rowId: tr.id,
    };
  }

  function bindMapHandlers(mapEl, cardEl, stateDataMap) {
    if (mapEl.dataset.handlersBound !== "true") {
      mapEl.dataset.handlersBound = "true";

      mapEl.addEventListener("click", function (e) {
        var target = e.target.closest && e.target.closest("[data-state]");
        if (!target) return;
        selectState(mapEl, cardEl, stateDataMap, target);
      });

      mapEl.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
        var target = e.target.closest && e.target.closest("[data-state]");
        if (!target) return;
        e.preventDefault();
        selectState(mapEl, cardEl, stateDataMap, target);
      });
    }

    // Seed the card with a default state so the popover renders something
    // useful on first load. Users can pick any other state from there.
    // Gated so it only fires once per map mount (e.g. on SPA re-entry).
    if (mapEl.dataset.initialSelected !== "true") {
      var DEFAULT_STATE = "New York";
      var defaultTarget = mapEl.querySelector(
        '[data-state="' + DEFAULT_STATE + '"]'
      );
      if (defaultTarget && stateDataMap[DEFAULT_STATE]) {
        mapEl.dataset.initialSelected = "true";
        selectState(mapEl, cardEl, stateDataMap, defaultTarget);
      }
    }
  }

  function selectState(mapEl, cardEl, stateDataMap, targetEl) {
    var name = targetEl.getAttribute("data-state");
    var data = stateDataMap[name];
    if (!data) return;

    var prior = mapEl.querySelectorAll('[aria-pressed="true"]');
    for (var i = 0; i < prior.length; i++) prior[i].removeAttribute("aria-pressed");
    targetEl.setAttribute("aria-pressed", "true");

    renderStateCard(cardEl, name, data);
  }

  function renderStateCard(cardEl, name, data) {
    var frag = document.createDocumentFragment();

    var heading = document.createElement("p");
    heading.className = "state-map-card-state-name";
    heading.textContent = name;
    frag.appendChild(heading);

    var dl = document.createElement("dl");
    dl.className = "state-map-card-list";

    var labelled = [
      ["ELA", data.ela],
      ["Math", data.math],
      ["Science", data.science],
      ["Social studies", data.socialStudies],
      ["Assessments", data.assessments],
    ];
    for (var i = 0; i < labelled.length; i++) {
      var dt = document.createElement("dt");
      dt.textContent = labelled[i][0];
      var dd = document.createElement("dd");
      dd.innerHTML = labelled[i][1];
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    frag.appendChild(dl);

    var jump = document.createElement("button");
    jump.type = "button";
    jump.className = "state-map-card-jump";
    jump.textContent = "View in full table";
    jump.addEventListener("click", function () {
      flashRow(data.rowId);
    });
    frag.appendChild(jump);

    cardEl.replaceChildren(frag);
  }

  function flashRow(rowId) {
    var tr = document.getElementById(rowId);
    if (!tr) return;
    tr.scrollIntoView({ behavior: "smooth", block: "center" });
    tr.classList.remove("is-flash");
    // Force a reflow so the animation restarts on a repeated click.
    void tr.offsetWidth;
    tr.classList.add("is-flash");
    setTimeout(function () {
      tr.classList.remove("is-flash");
    }, 1900);
  }

  // Wrap every `<table class="standards-table">` in a horizontally
  // scrollable container so the table can overflow on narrow viewports
  // (phones, tablet portrait) instead of squeezing column text into
  // an unreadable column-of-one. The wrapper owns the rounded chrome
  // and shadow; CSS strips them off the inner table.
  //
  // Done in JS rather than MDX so we don't have to wrap 60+ standards
  // pages by hand and so newly-authored pages get the behavior for
  // free. Idempotent — already-wrapped tables are skipped.
  function ensureStandardsTableWrap() {
    var tables = document.querySelectorAll("table.standards-table");
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      var parent = table.parentNode;
      if (
        parent &&
        parent.classList &&
        parent.classList.contains(STANDARDS_TABLE_WRAP_CLASS)
      ) {
        continue;
      }
      var wrap = document.createElement("div");
      wrap.className = STANDARDS_TABLE_WRAP_CLASS;
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }
  }

  function init() {
    ensureStandardsLink();
    ensureSidebarTagline();
    ensureStandardsTableWrap();
    ensureStateMap();
    var observer = new MutationObserver(function () {
      ensureStandardsLink();
      ensureSidebarTagline();
      ensureStandardsTableWrap();
      ensureStateMap();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
