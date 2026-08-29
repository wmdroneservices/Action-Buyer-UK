/* Live navigation for the current reverse-basket valuation system. */
(function () {
  "use strict";
  const BASKET_KEY = "gearCashOutQuoteBasket";
  const NAV_ID = "live-quote-nav";

  function clean(value) { return String(value || "").trim().toLowerCase(); }
  function isPlaceholder(value) { const text = clean(value); return !text || /^[-–—]/.test(text) || /\bselect\b.*\b(model|package|accessory|manufacturer)\b/.test(text); }
  function isCompleteItem(item) {
    if (!item || typeof item !== "object") return false;
    if (isPlaceholder(item.category) || isPlaceholder(item.categoryName)) return false;
    if (isPlaceholder(item.manufacturer) || isPlaceholder(item.manufacturerName)) return false;
    if (isPlaceholder(item.model) || isPlaceholder(item.modelName)) return false;
    if (item.category === "drone" && (isPlaceholder(item.package) || isPlaceholder(item.packageName))) return false;
    return true;
  }
  function readBasket() {
    try {
      const value = JSON.parse(localStorage.getItem(BASKET_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      const valid = value.filter(isCompleteItem);
      if (valid.length !== value.length) localStorage.setItem(BASKET_KEY, JSON.stringify(valid));
      return valid;
    } catch (_) { return []; }
  }
  function isValuationPage() { return /(^|\/)valuation\.html$/i.test(window.location.pathname); }
  function removeNavigation() { document.getElementById(NAV_ID)?.remove(); }
  async function isStaff() {
    try {
      const auth = window.actionBuyerAuth;
      const session = await auth?.getSession();
      if (!session?.user?.id) return false;
      const { data } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
      return !!data;
    } catch (_) { return false; }
  }
  function loadCustomerTheme() {
    if (!document.getElementById("gear-cashout-customer-theme")) {
      const link = document.createElement("link");
      link.id = "gear-cashout-customer-theme";
      link.rel = "stylesheet";
      link.href = "customer.css?v=20260828-1";
      document.head.appendChild(link);
    }
    if (!document.getElementById("gear-cashout-customer-overrides")) {
      const link = document.createElement("link");
      link.id = "gear-cashout-customer-overrides";
      link.rel = "stylesheet";
      link.href = "customer-overrides.css?v=20260828-3";
      document.head.appendChild(link);
    }
    if (!document.getElementById("gear-cashout-hero-image-overrides")) {
      const link = document.createElement("link");
      link.id = "gear-cashout-hero-image-overrides";
      link.rel = "stylesheet";
      link.href = "hero-image-overrides.css?v=20260829-1";
      document.head.appendChild(link);
    }
    document.body.classList.add("customer-page");
  }
  function updateNavigation() {
    const navList = document.querySelector("header .nav-list");
    if (!navList) return;
    const basket = readBasket();
    if (!basket.length) { removeNavigation(); return; }
    const itemWord = basket.length === 1 ? "item" : "items";
    const label = `Your Quote (${basket.length} ${itemWord})`;
    let existing = document.getElementById(NAV_ID);
    if (!existing) { existing = document.createElement("li"); existing.id = NAV_ID; const link = document.createElement("a"); existing.appendChild(link); navList.appendChild(existing); }
    const link = existing.querySelector("a");
    link.href = "valuation.html";
    link.textContent = label;
    link.setAttribute("aria-label", `Resume your saved quote with ${basket.length} ${itemWord}`);
  }
  function applyHomepageHeroImages() {
    if (!document.body.classList.contains("home")) return;
    const images = document.querySelectorAll(".home .hero-images .hero-image img");
    if (images.length < 3) return;

    const heroAssets = [
      {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/DJI_Mavic_4_Pro.jpg",
        alt: "DJI Mavic 4 Pro drone in a natural outdoor setting",
        title: "DJI Mavic 4 Pro — Benlisquare, CC BY-SA 4.0"
      },
      {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/GoPro_H%C3%A9ro_13_Black_-_02.jpg",
        alt: "GoPro HERO13 Black action camera",
        title: "GoPro HERO13 Black — François de Dijon, CC BY-SA 4.0"
      },
      {
        src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/2024_Dron_DJI_Mini_4_Pro_(14).jpg",
        alt: "DJI Mini 4 Pro drone",
        title: "DJI Mini 4 Pro — Jacek Halicki, CC BY-SA 4.0"
      }
    ];

    images.forEach((img, index) => {
      const asset = heroAssets[index];
      if (!asset) return;
      if (img.dataset.heroAsset !== asset.src) {
        img.src = asset.src;
        img.alt = asset.alt;
        img.title = asset.title;
        img.dataset.heroAsset = asset.src;
      }
    });

    const heroImages = document.querySelector(".home .hero-images");
    if (heroImages && !document.getElementById("hero-image-credits")) {
      const credits = document.createElement("div");
      credits.id = "hero-image-credits";
      credits.className = "hero-image-credits";
      credits.innerHTML = 'Hero images: <a href="https://commons.wikimedia.org/wiki/File:DJI_Mavic_4_Pro.jpg" target="_blank" rel="noopener">Benlisquare</a>, <a href="https://commons.wikimedia.org/wiki/File:GoPro_H%C3%A9ro_13_Black_-_02.jpg" target="_blank" rel="noopener">François de Dijon</a> and <a href="https://commons.wikimedia.org/wiki/File:2024_Dron_DJI_Mini_4_Pro_(14).jpg" target="_blank" rel="noopener">Jacek Halicki</a> — CC BY-SA 4.0.';
      heroImages.insertAdjacentElement("afterend", credits);
    }
  }
  function applyHomepageVisualFixes() {
    if (!document.body.classList.contains("home")) return;
    applyHomepageHeroImages();

    const footerLogo = document.querySelector(".home .footer-brand img");
    if (footerLogo && !footerLogo.dataset.footerVariant) {
      const footerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 190"><defs><linearGradient id="orange" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6a2a"/><stop offset="1" stop-color="#e84a10"/></linearGradient></defs><g transform="translate(92 92)"><circle r="82" fill="#f7f3ea"/><circle r="70" fill="#0b0d0f" stroke="#f7f3ea" stroke-width="4"/><path d="M0-62 L14-14 L62 0 L14 14 L0 62 L-14 14 L-62 0 L-14-14 Z" fill="#f7f3ea"/><path d="M0-58 L11-11 L58 0 L11 11 L0 58 L-11 11 L-58 0 L-11-11 Z" fill="url(#orange)"/><path d="M0-58 L11-11 L0 0 Z" fill="#0b0d0f"/><path d="M0 58 L-11 11 L0 0 Z" fill="#c6ff3d"/><circle r="7" fill="#f7f3ea"/></g><text x="190" y="92" textLength="195" lengthAdjust="spacingAndGlyphs" font-family="Arial Narrow,Arial,sans-serif" font-size="102" font-weight="800" fill="#fff">Gear</text><text x="392" y="92" textLength="205" lengthAdjust="spacingAndGlyphs" font-family="Arial Narrow,Arial,sans-serif" font-size="102" font-weight="800" fill="url(#orange)">Cash</text><text x="604" y="92" textLength="175" lengthAdjust="spacingAndGlyphs" font-family="Arial Narrow,Arial,sans-serif" font-size="102" font-weight="800" fill="#fff">Out</text><path d="M192 114 H780" stroke="#ff5a1f" stroke-width="6" stroke-linecap="round"/><text x="194" y="150" font-family="Arial,sans-serif" font-size="20" font-weight="800" letter-spacing="3.2" fill="#fff">WE BUY. YOU GET PAID.</text></svg>`;
      footerLogo.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(footerSvg);
      footerLogo.dataset.footerVariant = "white";
    }
  }
  function clearSubmittedBasket() { try { localStorage.removeItem(BASKET_KEY); } catch (_) {} window.dispatchEvent(new CustomEvent("gearCashOutBasketChanged")); updateNavigation(); }
  function watchSubmission() {
    if (!isValuationPage()) return;
    const form = document.getElementById("quote-form");
    if (!form) return;
    form.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button || !form.contains(button)) return;
      const step = button.closest('.wizard-step[data-step="9"]');
      if (!step || !button.classList.contains("btn-submit-valuation")) return;
      window.setTimeout(() => { const submitted = form.querySelector('.wizard-step[data-step="10"]'); if (submitted && !submitted.hidden) clearSubmittedBasket(); }, 250);
    }, true);
  }
  async function init() {
    removeNavigation();
    if (await isStaff()) return;
    loadCustomerTheme();
    watchSubmission();
    updateNavigation();
    applyHomepageVisualFixes();
    window.addEventListener("storage", updateNavigation);
    window.addEventListener("gearCashOutBasketChanged", updateNavigation);
    window.setInterval(updateNavigation, 1000);
    window.setInterval(applyHomepageVisualFixes, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
