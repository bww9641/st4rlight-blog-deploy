(function () {
  function normalize(value) {
    return (value || "").toLowerCase();
  }

  async function initSearch() {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    if (!input || !results) return;

    const response = await fetch("/search.json", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      results.innerHTML = "<li>Failed to load search index.</li>";
      return;
    }

    const records = await response.json();

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

  document.addEventListener("DOMContentLoaded", initSearch);
})();
