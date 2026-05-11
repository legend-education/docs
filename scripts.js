(function () {
  var STANDARDS_LINK_CLASS = "legend-standards-link";
  var SIDEBAR_TAGLINE_CLASS = "legend-sidebar-tagline";

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

  function init() {
    ensureStandardsLink();
    ensureSidebarTagline();
    var observer = new MutationObserver(function () {
      ensureStandardsLink();
      ensureSidebarTagline();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
