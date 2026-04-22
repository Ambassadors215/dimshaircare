(function () {
  var DEBOUNCE_MS = 200;
  var POPULAR = [
    "Plantain",
    "Halal meat",
    "Jollof ingredients",
    "Hair products",
    "Fufu flour",
    "Caribbean food",
  ];
  var RECENT_KEY = "clip_recent_searches";
  var timer = null;

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function recentGet() {
    try {
      var j = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(j) ? j.slice(0, 8) : [];
    } catch (e) {
      return [];
    }
  }

  function recentPush(term) {
    var t = String(term || "").trim();
    if (t.length < 2) return;
    var a = recentGet().filter(function (x) {
      return x.toLowerCase() !== t.toLowerCase();
    });
    a.unshift(t);
    localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 8)));
  }

  function cartKey(id) {
    return "clipCart:" + id;
  }

  function quickAdd(listingId, idx) {
    var k = cartKey(listingId);
    try {
      var c = JSON.parse(localStorage.getItem(k) || "{}");
      c[String(idx)] = (Number(c[String(idx)]) || 0) + 1;
      localStorage.setItem(k, JSON.stringify(c));
    } catch (e) {}
    var el = document.getElementById("gs-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "gs-toast";
      el.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#15803d;color:#fff;padding:12px 20px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.2)";
      document.body.appendChild(el);
    }
    el.textContent = "Added to basket ✓";
    el.style.display = "block";
    setTimeout(function () {
      el.style.display = "none";
    }, 1600);
  }

  function mount() {
    var host = document.getElementById("global-search-mount");
    if (!host) return;

    host.innerHTML =
      '<div class="gs-bar" role="search">' +
      '<div class="gs-bar-inner">' +
      '<a class="gs-home" href="/">Clip Services</a>' +
      '<div class="gs-field-wrap">' +
      '<div class="gs-input-wrap">' +
      '<input type="search" class="gs-input" id="gs-q" placeholder="Search products, stores, or stalls…" autocomplete="off" aria-label="Search" />' +
      "</div>" +
      '<div class="gs-dd" id="gs-dd"></div>' +
      "</div>" +
      '<a href="/search" style="font-size:14px;font-weight:600;color:#8b3a3a">All results</a>' +
      "</div>" +
      "</div>";

    var input = document.getElementById("gs-q");
    var dd = document.getElementById("gs-dd");

    function renderEmpty() {
      var rec = recentGet();
      var h =
        "<h4>Popular searches</h4>" +
        '<div class="gs-pop">' +
        POPULAR.map(function (p) {
          return '<button type="button" class="gs-chip" data-pop="' + esc(p) + '">🔥 ' + esc(p) + "</button>";
        }).join("") +
        "</div>";
      if (rec.length) {
        h +=
          "<h4>Recent</h4>" +
          rec
            .map(function (r) {
              return (
                '<div class="row"><a href="/search?q=' +
                encodeURIComponent(r) +
                '">' +
                esc(r) +
                "</a></div>"
              );
            })
            .join("");
      }
      dd.innerHTML = h;
    }

    function renderResults(data) {
      var pq = data.products || [];
      var st = data.stores || [];
      var cats = data.categories || [];
      var h = "";
      if (pq.length) {
        h += "<h4>Products</h4>";
        h += pq
          .slice(0, 8)
          .map(function (p) {
            return (
              '<div class="row">' +
              '<a href="' +
              esc(p.productUrl) +
              '">' +
              esc(p.name) +
              " — £" +
              (Number(p.priceNum) || 0).toFixed(2) +
              '<span class="gs-muted"><br/>' +
              esc(p.storeName) +
              " · " +
              esc(p.city || "") +
              "</span></a>" +
              '<button type="button" class="qa" data-lid="' +
              esc(p.listingId) +
              '" data-idx="' +
              Number(p.productIdx) +
              '">Quick Add</button>' +
              "</div>"
            );
          })
          .join("");
      }
      if (st.length) {
        h += "<h4>Stores</h4>";
        h += st
          .slice(0, 6)
          .map(function (s) {
            return (
              '<div class="row"><a href="' +
              esc(s.storeUrl) +
              '">' +
              esc(s.name) +
              " — " +
              esc(s.city || "") +
              "<br/>⭐ " +
              (Number(s.rating) || "—") +
              "</a></div>"
            );
          })
          .join("");
      }
      if (cats.length) {
        h += "<h4>Categories</h4>";
        h += cats
          .slice(0, 6)
          .map(function (c) {
            return (
              '<div class="row"><a href="' +
              esc(c.url) +
              '">' +
              esc(c.label || c.slug) +
              "</a></div>"
            );
          })
          .join("");
      }
      if (!h) h = '<p class="gs-muted" style="padding:16px">No matches — try another term or <a href="/search?q=' + encodeURIComponent(input.value.trim()) + '">see all results</a></p>';
      dd.innerHTML = h;
      dd.querySelectorAll(".qa").forEach(function (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          quickAdd(btn.getAttribute("data-lid"), btn.getAttribute("data-idx"));
        };
      });
    }

    function runFetch() {
      var q = input.value.trim();
      if (q.length < 2) {
        renderEmpty();
        return;
      }
      fetch("/api/search?q=" + encodeURIComponent(q))
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data.ok) renderResults(data);
        })
        .catch(function () {});
    }

    input.addEventListener(
      "input",
      function () {
        clearTimeout(timer);
        timer = setTimeout(runFetch, DEBOUNCE_MS);
      },
      false
    );

    input.addEventListener("focus", function () {
      dd.classList.add("open");
      if (input.value.trim().length < 2) renderEmpty();
      else runFetch();
    });

    document.addEventListener("click", function (e) {
      if (!host.contains(e.target)) dd.classList.remove("open");
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var v = input.value.trim();
        if (v.length >= 1) {
          recentPush(v);
          location.href = "/search?q=" + encodeURIComponent(v);
        }
      }
    });

    host.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-pop")) {
        input.value = t.getAttribute("data-pop");
        recentPush(input.value);
        dd.classList.add("open");
        runFetch();
      }
    });

    dd.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
