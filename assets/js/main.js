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
    if (button) button.textContent = theme === "dark" ? "Dark" : "Light";
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
    const paginationTop = document.getElementById("posts-pagination-top");
    const paginationRoot = document.getElementById("posts-pagination");
    const cardGrid = document.getElementById("posts-grid");
    const listRoot = document.getElementById("posts-list");
    const viewToggle = document.getElementById("posts-view-toggle");
    const cards = Array.from(document.querySelectorAll(".js-post-card"));
    if (!cards.length) return;

    const CARD_PAGE_SIZE = 8;
    const LIST_PAGE_SIZE = 10;
    const VIEW_KEY = "st4-view";
    const MAIN_CATS = new Set(["research", "study", "life"]);
    const ALL_CATS = ["research", "study", "life", "etc"];
    let selectedCats = new Set();
    let selectedTags = new Set();
    let query = "";
    let page = 1;
    let viewMode = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "card";

    /* ── number map: oldest post = 1 ── */
    const sorted = [...cards].sort((a, b) => (a.dataset.date || "").localeCompare(b.dataset.date || ""));
    const numberMap = new Map();
    sorted.forEach((card, i) => numberMap.set(card, i + 1));

    /* ── other-tag discovery ── */
    function getOtherTags() {
      const tags = new Set();
      cards.forEach((card) => {
        (card.dataset.tags || "").toLowerCase().split(/\s+/).filter(Boolean).forEach((t) => {
          if (!MAIN_CATS.has(t)) tags.add(t);
        });
      });
      return Array.from(tags).sort();
    }

    /* ── render tag sub-buttons ── */
    function renderOtherTags() {
      if (!otherTagsWrap) return;
      const otherTags = getOtherTags();
      if (!otherTags.length) { otherTagsWrap.innerHTML = ""; return; }
      otherTagsWrap.innerHTML = "";

      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "post-tag-btn";
      allBtn.textContent = "All";
      allBtn.dataset.postOtherTag = "all";
      allBtn.setAttribute("aria-pressed", String(selectedTags.size === 0));
      otherTagsWrap.appendChild(allBtn);

      otherTags.forEach((tag) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "post-tag-btn";
        btn.textContent = "#" + tag;
        btn.dataset.postOtherTag = tag;
        btn.setAttribute("aria-pressed", String(selectedTags.has(tag)));
        otherTagsWrap.appendChild(btn);
      });

      otherTagsWrap.querySelectorAll("[data-post-other-tag]").forEach((btn) => {
        if (btn.dataset.bound === "1") return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", () => {
          const tag = btn.dataset.postOtherTag;
          if (tag === "all") {
            selectedTags.clear();
          } else {
            selectedTags.has(tag) ? selectedTags.delete(tag) : selectedTags.add(tag);
            if (selectedTags.size >= otherTags.length) selectedTags.clear();
          }
          page = 1;
          renderOtherTags();
          apply();
        });
      });
    }

    /* ── update category button states ── */
    function updateCatButtons() {
      controls.forEach((btn) => {
        const f = (btn.dataset.postFilter || "all").toLowerCase();
        if (f === "all") {
          btn.setAttribute("aria-pressed", String(selectedCats.size === 0));
        } else {
          btn.setAttribute("aria-pressed", String(selectedCats.has(f)));
        }
      });
    }

    /* ── pagination ── */
    function buildPaginationButtons(container, total, current, pageSize, alwaysShow) {
      container.innerHTML = "";
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (!alwaysShow && total <= pageSize) return;

      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "post-page-btn";
      prev.textContent = "Prev";
      prev.disabled = current <= 1;
      prev.addEventListener("click", () => { page = Math.max(1, page - 1); apply(); });
      container.appendChild(prev);

      for (let i = 1; i <= totalPages; i += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "post-page-btn";
        btn.textContent = String(i);
        btn.setAttribute("aria-current", i === current ? "page" : "false");
        btn.addEventListener("click", () => { page = i; apply(); });
        container.appendChild(btn);
      }

      const next = document.createElement("button");
      next.type = "button";
      next.className = "post-page-btn";
      next.textContent = "Next";
      next.disabled = current >= totalPages;
      next.addEventListener("click", () => { page = Math.min(totalPages, page + 1); apply(); });
      container.appendChild(next);
    }

    function renderPagination(total, current, pageSize, alwaysShow) {
      [paginationTop, paginationRoot].forEach((el) => {
        if (el) buildPaginationButtons(el, total, current, pageSize, alwaysShow);
      });
    }

    /* ── list view ── */
    function renderListView(matched) {
      if (!listRoot) return;
      listRoot.innerHTML = "";
      var table = document.createElement("table");
      table.className = "posts-list-table";
      var thead = document.createElement("thead");
      thead.innerHTML = "<tr><th>#</th><th>Title</th><th>Category</th><th>Date</th></tr>";
      table.appendChild(thead);
      var tbody = document.createElement("tbody");

      matched.forEach((card) => {
        var num = numberMap.get(card) || 0;
        var titleEl = card.querySelector("h3 a");
        var title = titleEl ? titleEl.textContent : "";
        var url = titleEl ? titleEl.getAttribute("href") : "#";
        var date = card.dataset.date || "";
        var tagList = (card.dataset.tags || "").toLowerCase().split(/\s+/).filter(Boolean);
        var mainCat = tagList.find((t) => MAIN_CATS.has(t)) || "etc";

        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td class="list-num">' + num + "</td>" +
          '<td class="list-title"><a href="' + url + '">' + title + "</a></td>" +
          '<td class="list-cat"><span class="list-cat-badge list-cat-' + mainCat + '">' + mainCat + "</span></td>" +
          '<td class="list-date">' + date + "</td>";
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      listRoot.appendChild(table);
    }

    /* ── empty state ── */
    var emptyEl = document.getElementById("posts-empty");
    if (!emptyEl && cardGrid) {
      emptyEl = document.createElement("div");
      emptyEl.id = "posts-empty";
      emptyEl.className = "posts-empty section-block";
      emptyEl.hidden = true;
      emptyEl.innerHTML = '<strong>No posts found</strong><p>Try adjusting filters or search query.</p>';
      cardGrid.parentNode.insertBefore(emptyEl, cardGrid.nextSibling);
    }

    /* ── main filter logic ── */
    function apply() {
      var matched = [];
      cards.forEach((card) => {
        var tagList = (card.dataset.tags || "").toLowerCase().split(/\s+/).filter(Boolean);
        var searchable = (card.dataset.search || "").toLowerCase();

        /* category filter (multi-select OR) */
        var catOk;
        if (selectedCats.size === 0) {
          catOk = true;
        } else {
          catOk = false;
          for (var cat of selectedCats) {
            if (cat === "etc") {
              if (!tagList.some((t) => MAIN_CATS.has(t))) { catOk = true; break; }
            } else {
              if (tagList.includes(cat)) { catOk = true; break; }
            }
          }
        }

        /* tag filter (multi-select OR) */
        var tagOk = selectedTags.size === 0 || tagList.some((t) => selectedTags.has(t));

        /* search */
        var queryOk = !query || searchable.includes(query);
        if (catOk && tagOk && queryOk) matched.push(card);
        card.hidden = true;
      });

      /* empty state */
      if (emptyEl) emptyEl.hidden = matched.length > 0;

      var ps = viewMode === "card" ? CARD_PAGE_SIZE : LIST_PAGE_SIZE;
      var totalPages = Math.max(1, Math.ceil(matched.length / ps));
      if (page > totalPages) page = totalPages;
      var start = (page - 1) * ps;

      if (viewMode === "card") {
        if (listRoot) { listRoot.hidden = true; listRoot.classList.remove("view-enter"); }
        if (cardGrid) {
          cardGrid.hidden = false;
          cardGrid.classList.remove("view-enter");
          void cardGrid.offsetWidth;
          cardGrid.classList.add("view-enter");
        }
        matched.slice(start, start + ps).forEach((c) => { c.hidden = false; });
        [paginationTop, paginationRoot].forEach((el) => { if (el) el.classList.remove("pagination-centered"); });
        renderPagination(matched.length, page, ps, false);
      } else {
        if (cardGrid) { cardGrid.hidden = true; cardGrid.classList.remove("view-enter"); }
        if (listRoot) {
          listRoot.hidden = false;
          listRoot.classList.remove("view-enter");
          void listRoot.offsetWidth;
          listRoot.classList.add("view-enter");
        }
        renderListView(matched.slice(start, start + ps));
        [paginationTop, paginationRoot].forEach((el) => { if (el) el.classList.add("pagination-centered"); });
        renderPagination(matched.length, page, ps, true);
      }
    }

    /* ── category buttons (multi-select) ── */
    controls.forEach((button) => {
      if (button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        var f = (button.dataset.postFilter || "all").toLowerCase();
        if (f === "all") {
          selectedCats.clear();
        } else {
          selectedCats.has(f) ? selectedCats.delete(f) : selectedCats.add(f);
          if (ALL_CATS.every((c) => selectedCats.has(c))) selectedCats.clear();
        }
        page = 1;
        updateCatButtons();
        apply();
      });
    });

    /* ── tags toggle ── */
    if (otherToggle && otherTagsWrap && otherToggle.dataset.bound !== "1") {
      otherToggle.dataset.bound = "1";
      otherToggle.addEventListener("click", () => {
        var expanded = otherToggle.getAttribute("aria-expanded") === "true";
        otherToggle.setAttribute("aria-expanded", String(!expanded));
        otherTagsWrap.hidden = expanded;
      });
    }

    /* ── view toggle (segmented) ── */
    if (viewToggle) {
      var segs = viewToggle.querySelectorAll(".post-view-seg");
      /* restore saved state */
      segs.forEach(function (s) { s.setAttribute("aria-pressed", String(s.dataset.viewVal === viewMode)); });

      if (viewToggle.dataset.bound !== "1") {
        viewToggle.dataset.bound = "1";
        segs.forEach(function (seg) {
          seg.addEventListener("click", function () {
            viewMode = seg.dataset.viewVal || "card";
            localStorage.setItem(VIEW_KEY, viewMode);
            page = 1;
            segs.forEach(function (s) { s.setAttribute("aria-pressed", String(s.dataset.viewVal === viewMode)); });
            apply();
          });
        });
      }
    }

    /* ── search ── */
    if (searchInput && searchInput.dataset.bound !== "1") {
      searchInput.dataset.bound = "1";
      searchInput.addEventListener("input", (e) => {
        query = String(e.target.value || "").trim().toLowerCase();
        page = 1;
        apply();
      });
    }

    updateCatButtons();
    renderOtherTags();
    apply();
  }

  async function initSearchPage() {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    const countEl = document.getElementById("search-count");
    if (!input || !results) return;
    if (input.dataset.bound === "1") return;
    input.dataset.bound = "1";

    let records = [];
    try {
      const response = await fetch("/search.json", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("index load failed");
      records = await response.json();
    } catch (_err) {
      results.innerHTML = '<div class="search-prompt">Failed to load search index.</div>';
      return;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function highlight(text, q) {
      if (!q) return escapeHtml(text);
      var safe = escapeHtml(text);
      var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      return safe.replace(re, "<mark>$1</mark>");
    }

    function extractSnippet(content, q) {
      if (!q || !content) return "";
      var lower = content.toLowerCase();
      var idx = lower.indexOf(q.toLowerCase());
      if (idx === -1) return "";
      var pad = 80;
      var start = Math.max(0, idx - pad);
      var end = Math.min(content.length, idx + q.length + pad);
      var snippet = "";
      if (start > 0) snippet += "...";
      snippet += content.slice(start, end);
      if (end < content.length) snippet += "...";
      return snippet;
    }

    function detectMatchLocations(item, q) {
      var locs = [];
      var ql = q.toLowerCase();
      if ((item.title || "").toLowerCase().includes(ql)) locs.push("title");
      if ((item.description || "").toLowerCase().includes(ql)) locs.push("description");
      if ((item.tags || []).join(" ").toLowerCase().includes(ql)) locs.push("tags");
      if ((item.content || "").toLowerCase().includes(ql)) locs.push("content");
      return locs;
    }

    function render(query) {
      var q = (query || "").trim();
      results.innerHTML = "";

      if (!q) {
        if (countEl) countEl.textContent = "";
        results.innerHTML = '<div class="search-prompt">Type a keyword to search across all posts and notes.</div>';
        return;
      }

      var ql = q.toLowerCase();
      var filtered = records.filter(function (item) {
        var haystack = ((item.title || "") + " " + (item.description || "") + " " + (item.tags || []).join(" ") + " " + (item.categories || []).join(" ") + " " + (item.content || "")).toLowerCase();
        return haystack.includes(ql);
      });

      if (countEl) {
        countEl.textContent = filtered.length + " result" + (filtered.length !== 1 ? "s" : "") + " found";
      }

      if (!filtered.length) {
        results.innerHTML = '<div class="search-prompt">No results found for <strong>' + escapeHtml(q) + "</strong></div>";
        return;
      }

      filtered.slice(0, 30).forEach(function (item) {
        var article = document.createElement("article");
        article.className = "post-card";

        var titleHtml = highlight(item.title || "", q);
        var descHtml = item.description ? highlight(item.description, q) : "";
        var date = item.date || "";
        var tags = (item.tags || []).map(function (t) { return '<li><a href="/tags/#tag-' + t + '">#' + t + "</a></li>"; }).join("");
        var locs = detectMatchLocations(item, q);

        var snippet = extractSnippet(item.content || "", q);
        var snippetHtml = snippet ? '<p class="search-snippet">' + highlight(snippet, q) + "</p>" : "";

        var badgesHtml = "";
        if (locs.length) {
          badgesHtml = '<div class="search-match-badges">' + locs.map(function (l) { return '<span class="search-badge search-badge--' + l + '">' + l + "</span>"; }).join("") + "</div>";
        }

        article.innerHTML =
          badgesHtml +
          '<h3><a href="' + (item.url || "#") + '">' + titleHtml + "</a></h3>" +
          (descHtml ? "<p>" + descHtml + "</p>" : "") +
          snippetHtml +
          '<p class="meta">' + escapeHtml(date) + "</p>" +
          (tags ? '<ul class="chip-list">' + tags + "</ul>" : "");

        results.appendChild(article);
      });
    }

    var debounceTimer = null;
    input.addEventListener("input", function (e) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { render(e.target.value); }, 150);
    });

    render("");
  }

  function setupMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.getElementById("menu-list");
    if (!toggle || !menu || toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";

    function closeMenu() {
      toggle.setAttribute("aria-expanded", "false");
      menu.classList.remove("open");
    }

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      menu.classList.toggle("open", !expanded);
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        closeMenu();
      }
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
