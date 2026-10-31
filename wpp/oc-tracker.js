/* OpCenter · rastreio da pressel (Google → WhatsApp)
 * Troque TRACK_URL pelo endereço HTTPS do relay publicado no Vercel.
 */
(function () {
  var TRACK_URL = "https://oc-relay-gilt.vercel.app/api/hit";
  var KEYS = ["gclid", "gbraid", "wbraid", "cid", "agid", "cr", "kw", "net", "dev"];
  var TTL = 7 * 24 * 3600 * 1000;
  var q = new URLSearchParams(location.search), st = {}, vid = "";
  try { st = JSON.parse(localStorage.getItem("oc_g") || "{}"); } catch (e) {}
  if (st.t && Date.now() - st.t > TTL) st = {};
  var fresh = false;
  KEYS.forEach(function (k) {
    var v = q.get(k);
    if (v && v.charAt(0) !== "{") { st[k] = v; fresh = true; }
  });
  if (fresh) { st.t = Date.now(); try { localStorage.setItem("oc_g", JSON.stringify(st)); } catch (e) {} }
  try {
    vid = localStorage.getItem("oc_vid") || "";
    if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("oc_vid", vid); }
  } catch (e) { vid = "nv" + Math.random().toString(36).slice(2); }
  function send(kind, wa) {
    var p = { kind: kind, vid: vid, page: location.host + location.pathname, ref: document.referrer, wa: wa || "" };
    KEYS.forEach(function (k) { if (st[k]) p[k] = st[k]; });
    var body = JSON.stringify(p);
    try {
      if (navigator.sendBeacon) { navigator.sendBeacon(TRACK_URL, new Blob([body], { type: "text/plain" })); return; }
    } catch (e) {}
    try { fetch(TRACK_URL, { method: "POST", body: body, keepalive: true, mode: "no-cors" }); } catch (e) {}
  }
  send("visit");
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href*='wa.me'],a[href*='api.whatsapp.com']") : null;
    if (!a) return;
    var m = (a.getAttribute("href") || "").match(/(?:wa\.me\/|phone=)(\d+)/);
    send("click", m && m[1]);
  }, true);
})();
