// Maintenance guard — uses /api/data?r=config (Cloudflare Worker protected)
(function(){
  const MAINT_URL = "/maintenance/?v=" + Date.now();

  async function go(){
    try{
      const res = await fetch("/api/data?r=config", {cache:"no-store", credentials:"include"});
      if(!res.ok) throw new Error("config fetch failed");
      const payload = await res.json();
      const cfg = payload && typeof payload==="object" && "data" in payload ? payload.data : payload;
      // expose for legacy
      window.__DNFK_CONFIG__ = cfg || {};
      const active = !!(cfg && (cfg.maintenanceActive ?? cfg.maintenance ?? cfg.active));
      window.__DNFK_MAINTENANCE__ = active;

      if(active){
        if(!location.pathname.includes("/maintenance")){
          location.replace(MAINT_URL);
        }
      }
    }catch(e){
      console.error("[maintenance-guard] error:", e);
      // fail-safe: if cannot confirm, enter maintenance
      if(!location.pathname.includes("/maintenance")){
        location.replace(MAINT_URL);
      }
    }
  }

  go();
})();
