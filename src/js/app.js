// Theme toggle (light / dark)
(function () {
  const html = document.documentElement;
  const btn = document.getElementById("theme-toggle");

  if (!btn) return;

  const stored = localStorage.getItem("pdfsuit-theme");

  if (stored === "light" || stored === "dark") {
    html.setAttribute("data-theme", stored);
  } else {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }

  function updateIcon() {
    const mode = html.getAttribute("data-theme");
    btn.textContent = mode === "dark" ? "🌙" : "☀️";
  }

  updateIcon();

  btn.addEventListener("click", () => {
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("pdfsuit-theme", next);
    updateIcon();
  });
})();

// Set footer year
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();

// Smooth scroll for internal links
(function () {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href").slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();
