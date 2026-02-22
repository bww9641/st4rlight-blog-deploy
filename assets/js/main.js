(function () {
  const THEME_KEY = "st4-theme";
  let navigating = false;
  const LEAVE_MS = 150;

  function normalizePathname(pathname) {
    const value = (pathname || "/").replace(/\/+$/, "");
    return value || "/";
  }

  function preferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const button = document.getElementById("theme-toggle");
    if (button) button.textContent = theme === "dark" ? "Light" : "Dark";
  }

  function setupThemeToggle() {
    applyTheme(preferredTheme());
    const button = document.getElementById("theme-toggle");
    if (!button || button.dataset.bound === "1") return;
    button.dataset.bound = "1";

    button.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\\s-]/g, "")
      .replace(/\\s+/g, "-");
  }

  function buildToc() {
    const tocNode = document.querySelector(".js-toc");
    const article = document.querySelector(".js-article");
    if (!tocNode || !article) return;

    const headings = article.querySelectorAll("h2, h3, h4");
    if (!headings.length) return;

    const list = document.createElement("ul");
    const title = document.createElement("p");
    title.className = "toc-title";
    title.textContent = "Table of Contents";

    let currentH2Li = null;
    let currentH3Li = null;

    function ensureChildList(parentLi) {
      let ul = parentLi.querySelector(":scope > ul");
      if (!ul) {
        ul = document.createElement("ul");
        parentLi.appendChild(ul);
      }
      return ul;
    }

    headings.forEach((heading) => {
      if (!heading.id) heading.id = slugify(heading.textContent || "section");
      const li = document.createElement("li");
      li.className = `toc-${heading.tagName.toLowerCase()}`;
      const a = document.createElement("a");
      a.href = `#${heading.id}`;
      a.textContent = heading.textContent || "section";
      li.appendChild(a);

      const tag = heading.tagName.toLowerCase();
      if (tag === "h2") {
        list.appendChild(li);
        currentH2Li = li;
        currentH3Li = null;
        return;
      }

      if (tag === "h3") {
        if (!currentH2Li) {
          list.appendChild(li);
        } else {
          ensureChildList(currentH2Li).appendChild(li);
        }
        currentH3Li = li;
        return;
      }

      if (tag === "h4") {
        if (currentH3Li) {
          ensureChildList(currentH3Li).appendChild(li);
        } else if (currentH2Li) {
          ensureChildList(currentH2Li).appendChild(li);
        } else {
          list.appendChild(li);
        }
      }
    });

    tocNode.innerHTML = "";
    tocNode.appendChild(title);
    tocNode.appendChild(list);

    const toggle = document.querySelector(".toc-toggle");
    if (toggle && toggle.dataset.bound !== "1") {
      toggle.dataset.bound = "1";
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        tocNode.classList.toggle("open", !expanded);
      });
    }
  }

  function enableLineNumbers(codeNode) {
    const html = (codeNode.innerHTML || "").replace(/\n$/, "");
    const lines = html.split("\n");
    const frag = document.createDocumentFragment();
    lines.forEach((line) => {
      const span = document.createElement("span");
      span.className = "code-line";
      span.innerHTML = line.length ? line : " ";
      frag.appendChild(span);
    });
    codeNode.innerHTML = "";
    codeNode.appendChild(frag);
    codeNode.parentElement.classList.add("has-line-numbers");
  }

  function enhanceCodeBlocks() {
    const useLineNumbers = document.body.dataset.lineNumbers === "true";

    function normalizeLanguage(lang) {
      const value = String(lang || "").toLowerCase();
      if (!value) return "text";
      if (value === "py") return "python";
      if (value === "js") return "javascript";
      if (value === "ts") return "typescript";
      if (value === "sh" || value === "zsh" || value === "bash") return "bash";
      if (value === "yml") return "yaml";
      if (value === "md") return "markdown";
      if (value === "c++") return "cpp";
      return value;
    }

    function extractLanguageFromClassName(className) {
      if (!className) return "";
      const classes = String(className).split(/\s+/);
      const langClass = classes.find((cls) => cls.startsWith("language-"));
      if (langClass) return langClass.replace("language-", "");
      const direct = classes.find((cls) => /^(bash|sh|zsh|python|py|javascript|js|typescript|ts|sql|c|cpp|c\+\+|java|go|rust|ruby|php|yaml|yml|json|html|css|xml|diff|plaintext|text|mermaid)$/i.test(cls));
      return direct || "";
    }

    function detectLanguage(codeNode, pre) {
      const fromCode = extractLanguageFromClassName(codeNode.className || "");
      if (fromCode) return normalizeLanguage(fromCode);

      const fromPre = extractLanguageFromClassName(pre.className || "");
      if (fromPre) return normalizeLanguage(fromPre);

      const wrapper = pre.closest("[class*='language-']");
      if (wrapper) {
        const fromWrapper = extractLanguageFromClassName(wrapper.className || "");
        if (fromWrapper) return normalizeLanguage(fromWrapper);
      }

      return "text";
    }

    document.querySelectorAll("pre > code").forEach((codeNode) => {
      const pre = codeNode.parentElement;
      if (pre.dataset.enhanced === "1") return;
      pre.dataset.enhanced = "1";

      let shell = pre.parentElement;
      if (!shell || !shell.classList.contains("code-block-shell")) {
        shell = document.createElement("div");
        shell.className = "code-block-shell";
        pre.parentElement.insertBefore(shell, pre);
        shell.appendChild(pre);
      }

      const language = detectLanguage(codeNode, pre);

      if (language === "mermaid") {
        const mermaidDiv = document.createElement("div");
        mermaidDiv.className = "mermaid";
        mermaidDiv.textContent = codeNode.textContent || "";
        pre.replaceWith(mermaidDiv);
        return;
      }

      if (!codeNode.className.includes("language-")) {
        codeNode.classList.add(`language-${language}`);
      }

      if (window.hljs && typeof window.hljs.highlightElement === "function") {
        try {
          window.hljs.highlightElement(codeNode);
        } catch (_err) {}
      }

      const label = document.createElement("span");
      label.className = "code-language";
      label.textContent = language;
      shell.appendChild(label);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "code-copy";
      const copyIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h10v12H9z"></path><path d="M5 3h10v2H7v10H5z"></path></svg>';
      const copiedIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 16.6 4.8 12.2l1.4-1.4 3 3 8.6-8.6 1.4 1.4z"></path></svg>';
      const failedIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 6 6 7.4 10.6 12 6 16.6 7.4 18l4.6-4.6 4.6 4.6 1.4-1.4-4.6-4.6L18 7.4 16.6 6 12 10.6z"></path></svg>';
      copyBtn.innerHTML = copyIcon;
      copyBtn.setAttribute("aria-label", "Copy code");
      copyBtn.title = "Copy code";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(codeNode.textContent || "");
          copyBtn.innerHTML = copiedIcon;
          copyBtn.setAttribute("aria-label", "Copied");
          copyBtn.title = "Copied";
          setTimeout(() => {
            copyBtn.innerHTML = copyIcon;
            copyBtn.setAttribute("aria-label", "Copy code");
            copyBtn.title = "Copy code";
          }, 1200);
        } catch (_err) {
          copyBtn.innerHTML = failedIcon;
          copyBtn.setAttribute("aria-label", "Copy failed");
          copyBtn.title = "Copy failed";
          setTimeout(() => {
            copyBtn.innerHTML = copyIcon;
            copyBtn.setAttribute("aria-label", "Copy code");
            copyBtn.title = "Copy code";
          }, 1200);
        }
      });
      shell.appendChild(copyBtn);

      if (useLineNumbers) enableLineNumbers(codeNode);
    });
  }

  function renderMath() {
    if (typeof renderMathInElement !== "function") return;
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false,
      output: "html"
    });
  }

  function renderMermaid() {
    if (!window.mermaid) return;
    window.mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
    window.mermaid.run({ querySelector: ".mermaid" });
  }

  function secureExternalLinks() {
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      const isExternal = href.startsWith("http://") || href.startsWith("https://");
      if (!isExternal) return;
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) {
        a.setAttribute("rel", "noopener noreferrer");
        a.setAttribute("target", "_blank");
      }
    });
  }

  function setupProjectFiltering() {
    const controls = document.querySelectorAll("[data-project-filter]");
    if (!controls.length) return;
    const cards = document.querySelectorAll(".project-card");

    controls.forEach((button) => {
      if (button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        controls.forEach((item) => item.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        const selected = button.dataset.projectFilter;

        cards.forEach((card) => {
          const tags = card.dataset.tags || "";
          const show = selected === "all" || tags.includes(selected);
          card.hidden = !show;
        });
      });
    });
  }

  function setupPostFiltering() {
    const controls = document.querySelectorAll("[data-post-filter]");
    const searchInput = document.getElementById("posts-search");
    const otherToggle = document.getElementById("posts-other-toggle");
    const otherTagsWrap = document.getElementById("posts-other-tags");
    const paginationRoot = document.getElementById("posts-pagination");
    const cards = document.querySelectorAll(".js-post-card");
    if (!cards.length) return;

    const PAGE_SIZE = 8;
    let selected = "all";
    let selectedOther = "all";
    let query = "";
    let page = 1;

    function getOtherTags() {
      const focus = new Set(["research", "study", "life"]);
      const tags = new Set();
      cards.forEach((card) => {
        (card.dataset.tags || "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .forEach((tag) => {
            if (!focus.has(tag)) tags.add(tag);
          });
      });
      return Array.from(tags).sort();
    }

    function renderOtherTags() {
      if (!otherTagsWrap) return;
      const otherTags = getOtherTags();
      if (!otherTags.length) {
        otherTagsWrap.innerHTML = "";
        return;
      }

      otherTagsWrap.innerHTML = "";
      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "theme-toggle";
      allBtn.textContent = "All other";
      allBtn.dataset.postOtherTag = "all";
      allBtn.setAttribute("aria-pressed", String(selectedOther === "all"));
      otherTagsWrap.appendChild(allBtn);

      otherTags.forEach((tag) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "theme-toggle";
        btn.textContent = `#${tag}`;
        btn.dataset.postOtherTag = tag;
        btn.setAttribute("aria-pressed", String(selectedOther === tag));
        otherTagsWrap.appendChild(btn);
      });

      otherTagsWrap.querySelectorAll("[data-post-other-tag]").forEach((btn) => {
        if (btn.dataset.bound === "1") return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", () => {
          selectedOther = (btn.dataset.postOtherTag || "all").toLowerCase();
          page = 1;
          renderOtherTags();
          apply();
        });
      });
    }

    function renderPagination(total, current) {
      if (!paginationRoot) return;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      paginationRoot.innerHTML = "";
      if (total <= PAGE_SIZE) return;

      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "theme-toggle";
      prev.textContent = "Prev";
      prev.disabled = current <= 1;
      prev.addEventListener("click", () => {
        page = Math.max(1, page - 1);
        apply();
      });
      paginationRoot.appendChild(prev);

      for (let i = 1; i <= totalPages; i += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "theme-toggle";
        btn.textContent = String(i);
        btn.setAttribute("aria-current", i === current ? "page" : "false");
        btn.setAttribute("aria-pressed", i === current ? "true" : "false");
        btn.addEventListener("click", () => {
          page = i;
          apply();
        });
        paginationRoot.appendChild(btn);
      }

      const next = document.createElement("button");
      next.type = "button";
      next.className = "theme-toggle";
      next.textContent = "Next";
      next.disabled = current >= totalPages;
      next.addEventListener("click", () => {
        page = Math.min(totalPages, page + 1);
        apply();
      });
      paginationRoot.appendChild(next);
    }

    function apply() {
      const matched = [];
      cards.forEach((card) => {
        const tags = (card.dataset.tags || "").toLowerCase();
        const searchable = (card.dataset.search || "").toLowerCase();
        const tagOk = selected === "all" || tags.includes(selected);
        const otherOk = selectedOther === "all" || tags.split(/\s+/).includes(selectedOther);
        const queryOk = !query || searchable.includes(query);
        const ok = tagOk && otherOk && queryOk;
        if (ok) matched.push(card);
        card.hidden = true;
      });

      const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
      if (page > totalPages) page = totalPages;
      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      matched.slice(start, end).forEach((card) => {
        card.hidden = false;
      });

      renderPagination(matched.length, page);
    }

    controls.forEach((button) => {
      if (button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        controls.forEach((item) => item.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        selected = (button.dataset.postFilter || "all").toLowerCase();
        page = 1;
        apply();
      });
    });

    if (otherToggle && otherTagsWrap && otherToggle.dataset.bound !== "1") {
      otherToggle.dataset.bound = "1";
      otherToggle.addEventListener("click", () => {
        const expanded = otherToggle.getAttribute("aria-expanded") === "true";
        otherToggle.setAttribute("aria-expanded", String(!expanded));
        otherTagsWrap.hidden = expanded;
      });
    }

    if (searchInput && searchInput.dataset.bound !== "1") {
      searchInput.dataset.bound = "1";
      searchInput.addEventListener("input", (e) => {
        query = String(e.target.value || "").trim().toLowerCase();
        page = 1;
        apply();
      });
    }

    renderOtherTags();
    apply();
  }

  async function initSearchPage() {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    if (!input || !results) return;
    if (input.dataset.bound === "1") return;
    input.dataset.bound = "1";

    function normalize(value) {
      return (value || "").toLowerCase();
    }

    let records = [];
    try {
      const response = await fetch("/search.json", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("index load failed");
      records = await response.json();
    } catch (_err) {
      results.innerHTML = "<li>Failed to load search index.</li>";
      return;
    }

    function render(query) {
      const q = normalize(query);
      const filtered = records.filter((item) => {
        const haystack = normalize(`${item.title} ${item.description} ${(item.tags || []).join(" ")} ${(item.categories || []).join(" ")} ${item.content}`);
        return haystack.includes(q);
      });

      results.innerHTML = "";
      filtered.slice(0, 30).forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="${item.url}">${item.title}</a><p>${item.description || ""}</p>`;
        results.appendChild(li);
      });

      if (!filtered.length) {
        const li = document.createElement("li");
        li.textContent = "No results.";
        results.appendChild(li);
      }
    }

    input.addEventListener("input", (e) => render(e.target.value));
    render("");
  }

  function setupMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.getElementById("menu-list");
    if (!toggle || !menu || toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      menu.classList.toggle("open", !expanded);
    });
  }

  function setActiveNav(url) {
    const current = new URL(url, window.location.origin);
    document.querySelectorAll(".main-nav a[aria-current='page']").forEach((a) => a.removeAttribute("aria-current"));
    document.querySelectorAll(".main-nav a").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      const target = new URL(href, window.location.origin);
      if (target.pathname === current.pathname) a.setAttribute("aria-current", "page");
    });
  }

  async function initLatestXPosts() {
    const root = document.getElementById("x-latest-list");
    if (!root) return;
    const user = root.dataset.xUser || "st4rlight_exp";
    const anchor = root.querySelector("a.twitter-timeline");
    if (!anchor) return;

    const theme = (document.documentElement.getAttribute("data-theme") || "light") === "dark" ? "dark" : "light";
    anchor.setAttribute("data-theme", theme);
    anchor.href = `https://x.com/${user}`;

    try {
      if (!window.twttr || !window.twttr.widgets) {
        await new Promise((resolve, reject) => {
          let script = document.querySelector("script[data-x-widgets='1']");
          if (!script) {
            script = document.createElement("script");
            script.src = "https://platform.twitter.com/widgets.js";
            script.async = true;
            script.defer = true;
            script.dataset.xWidgets = "1";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          } else {
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener("error", reject, { once: true });
          }
        });
      }
      if (window.twttr && window.twttr.widgets && typeof window.twttr.widgets.load === "function") {
        window.twttr.widgets.load(root);
      }
    } catch (_err) {}
  }

  function setupHeroTypewriter() {
    const node = document.querySelector(".hero-type-text");
    if (!node) return;

    if (window.__heroTypeTimer) {
      window.clearTimeout(window.__heroTypeTimer);
      window.__heroTypeTimer = null;
    }

    const raw = node.dataset.typeLines || "";
    const lines = raw
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!lines.length) return;

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.textContent = lines[0];
      return;
    }

    let lineIndex = 0;
    let charIndex = 0;
    let deleting = false;
    node.textContent = "";

    const tick = () => {
      const text = lines[lineIndex];

      if (!deleting) {
        charIndex += 1;
        node.textContent = text.slice(0, charIndex);
        if (charIndex >= text.length) {
          deleting = true;
          window.__heroTypeTimer = window.setTimeout(tick, 1100);
          return;
        }
        window.__heroTypeTimer = window.setTimeout(tick, 62);
        return;
      }

      charIndex -= 1;
      node.textContent = text.slice(0, Math.max(0, charIndex));
      if (charIndex <= 0) {
        deleting = false;
        lineIndex = (lineIndex + 1) % lines.length;
        window.__heroTypeTimer = window.setTimeout(tick, 240);
        return;
      }
      window.__heroTypeTimer = window.setTimeout(tick, 34);
    };

    tick();
  }

  async function hydratePageContent() {
    buildToc();
    setupHeroTypewriter();
    enhanceCodeBlocks();
    secureExternalLinks();
    setupProjectFiltering();
    setupPostFiltering();
    await initLatestXPosts();
    await initSearchPage();
    window.setTimeout(() => {
      renderMath();
      renderMermaid();
    }, 30);
  }

  async function softNavigate(url, pushState) {
    const current = new URL(window.location.href);
    const next = new URL(url, window.location.href);
    const sameDoc =
      next.origin === current.origin &&
      normalizePathname(next.pathname) === normalizePathname(current.pathname) &&
      next.search === current.search;
    if (sameDoc && next.hash) return;

    if (navigating) return;
    navigating = true;
    const main = document.querySelector(".site-main");
    if (!main) {
      window.location.href = url;
      return;
    }

    main.classList.remove("is-entering");
    main.classList.add("is-leaving");
    try {
      const responsePromise = fetch(url, { headers: { Accept: "text/html" } });
      await new Promise((resolve) => window.setTimeout(resolve, LEAVE_MS));
      const response = await responsePromise;
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("text/html")) {
        window.location.href = url;
        return;
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const nextMain = doc.querySelector("#main-content");
      if (!nextMain) {
        window.location.href = url;
        return;
      }

      const nextTitle = doc.querySelector("title");
      if (nextTitle) document.title = nextTitle.textContent || document.title;
      const nextBody = doc.querySelector("body");
      if (nextBody && nextBody.dataset.lineNumbers !== undefined) {
        document.body.dataset.lineNumbers = nextBody.dataset.lineNumbers;
      }

      main.innerHTML = nextMain.innerHTML;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      setActiveNav(url);
      if (pushState) window.history.pushState({ soft: true }, "", url);

      main.classList.remove("is-leaving");
      main.classList.add("is-entering");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          main.classList.remove("is-entering");
        });
      });

      await hydratePageContent();
    } catch (_err) {
      window.location.href = url;
      return;
    } finally {
      navigating = false;
    }
  }

  function setupSoftNavigation() {
    if (document.body.dataset.softNavBound === "1") return;
    document.body.dataset.softNavBound = "1";

    document.addEventListener("click", (event) => {
      const anchor = event.target.closest("a[href]");
      if (!anchor) return;
      if (anchor.dataset.noSoftNav === "1") return;
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href.trim().startsWith("#")) return;

      const current = new URL(window.location.href);
      const next = new URL(href, window.location.href);
      const sameDoc =
        normalizePathname(next.pathname) === normalizePathname(current.pathname) &&
        next.search === current.search;
      if (next.origin !== current.origin) return;
      if (anchor.closest(".post-toc, .js-toc") && sameDoc) return;
      if (next.hash && sameDoc) return;
      if (!next.hash && sameDoc) return;

      event.preventDefault();
      softNavigate(next.href, true);
    });

    window.addEventListener("popstate", () => {
      softNavigate(window.location.href, false);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    setupThemeToggle();
    setupMobileNav();
    setupSoftNavigation();
    await hydratePageContent();
  });
})();
