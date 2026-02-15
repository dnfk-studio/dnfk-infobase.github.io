/**
 * Cloudflare Worker - DNFK InfoBase API Proxy (B1)
 *
 * Route example:
 *   https://info-base.dnfk.qzz.io/api/data?r=notices
 *
 * This Worker forwards requests to your GAS Web App, then returns ONLY the inner data.
 * Access control is enforced by Cloudflare Access on /api/*.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const r = url.searchParams.get("r") || "config";

    // 1) Put your GAS Web App URL here (the /exec URL)
    const GAS_URL = "REPLACE_WITH_YOUR_GAS_WEBAPP_EXEC_URL";

    const upstream = new URL(GAS_URL);
    upstream.searchParams.set("r", r);

    const res = await fetch(upstream.toString(), {
      method: "GET",
      // Do NOT forward cookies to GAS
      headers: { "Accept": "application/json" },
    });

    const text = await res.text();

    // 2) Pass through error status if GAS fails
    if (!res.ok) {
      return new Response(text, {
        status: res.status,
        headers: corsHeaders_(request),
      });
    }

    // 3) Normalize payload
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    // The GAS payload is: { ok, route, fetchedAt, data }
    // Frontend expects pure data: { ... }
    const data = json && json.ok ? json.data : null;

    if (!data) {
      return new Response(JSON.stringify({ ok:false, error:"Bad upstream payload" }), {
        status: 502,
        headers: { "content-type":"application/json; charset=utf-8", ...corsHeaders_(request) }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "content-type":"application/json; charset=utf-8",
        "cache-control":"no-store",
        ...corsHeaders_(request),
      },
    });
  }
};

function corsHeaders_(request){
  const origin = request.headers.get("Origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type",
  };
}
