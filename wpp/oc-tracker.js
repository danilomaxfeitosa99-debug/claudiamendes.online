/* OpCenter · rastreio da pressel (Google e TikTok → WhatsApp) · v2 (06/11/2026: TikTok)
 * Registra visita e clique no botão do WhatsApp, guardando o id do clique e os parâmetros do anúncio:
 *   Google: gclid/gbraid/wbraid + cid/agid/cr/kw/net/dev (modelo de acompanhamento)
 *   TikTok: ttclid + utm_* + tt_cid/tt_agid/tt_ad (parâmetros de URL do anúncio)
 * No visitante do TikTok carrega o pixel do TikTok (TT_PIXEL) e dispara "Contact" no clique do botão, com o mesmo
 * event_id que o OpCenter repete pela Events API (o TikTok deduplica).
 * Colocar na pressel antes de </body>. TRACK_URL = relay HTTPS; TT_PIXEL = ID do pixel do TikTok (não é segredo). */
(function () {
  var TRACK_URL = "https://oc-relay-gilt.vercel.app/api/hit";
  var TT_PIXEL = "DBU83Q3C77UCDH70QA60";   // ex.: "D4ABCDEF1234567890" (Gerenciador de Eventos do TikTok → pixel → ID)
  var KEYS = ["gclid", "gbraid", "wbraid", "cid", "agid", "cr", "kw", "net", "dev",
              "ttclid", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term", "tt_cid", "tt_agid", "tt_ad"];
  var TTL = 7 * 24 * 3600 * 1000;
  var q = new URLSearchParams(location.search), st = {}, vid = "", fresh = {};
  try { st = JSON.parse(localStorage.getItem("oc_g") || "{}"); } catch (e) {}
  if (st.t && Date.now() - st.t > TTL) st = {};
  KEYS.forEach(function (k) {
    var v = q.get(k);
    if (v && v.charAt(0) !== "{" && v.indexOf("__") !== 0) fresh[k] = v;   // ignora {campaignid} / __CAMPAIGN_ID__ não trocados
  });
  if (Object.keys(fresh).length) {            // clique novo de anúncio: troca tudo (não mistura Google com TikTok)
    st = fresh; st.t = Date.now();
    try { localStorage.setItem("oc_g", JSON.stringify(st)); } catch (e) {}
  }
  var tiktok = !!st.ttclid || (st.utm_source || "").toLowerCase() === "tiktok";
  try {
    vid = localStorage.getItem("oc_vid") || "";
    if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("oc_vid", vid); }
  } catch (e) { vid = "nv" + Math.random().toString(36).slice(2); }

  var tt = null;
  if (tiktok && TT_PIXEL) {
    try {
      !function (w, d, t) {
        w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
        ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
        ttq.load = ttq.load || function (e, n) {
          var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {};
          var s = d.createElement("script"); s.type = "text/javascript"; s.async = !0; s.src = r + "?sdkid=" + e + "&lib=" + t;
          var f = d.getElementsByTagName("script")[0]; f.parentNode.insertBefore(s, f);
        };
        if (!(ttq._i && ttq._i[TT_PIXEL])) ttq.load(TT_PIXEL);
        tt = ttq.instance ? ttq.instance(TT_PIXEL) : ttq;
        tt.page();
      }(window, document, "ttq");
    } catch (e) { tt = null; }
  }

  function send(kind, wa, evid) {
    var p = { kind: kind, vid: vid, page: location.host + location.pathname, ref: document.referrer, wa: wa || "" };
    KEYS.forEach(function (k) { if (st[k]) p[k] = st[k]; });
    if (evid) p.evid = evid;
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
    var evid = tiktok ? "ct_" + vid + "_" + Date.now() : "";
    if (tt && evid) { try { tt.track("Contact", {}, { event_id: evid }); } catch (err) {} }
    send("click", m && m[1], evid);
  }, true);
})();
