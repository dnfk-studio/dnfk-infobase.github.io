import { DataClient } from "./data-client.js";

/**
 * Maintenance guard (fail-safe).
 * - If config cannot be fetched => redirect to /maintenance
 * - If maintenance is true => redirect to /maintenance
 * - If on maintenance page and maintenance is false => redirect to /
 */
export async function enforceMaintenance(){
  const onMaintenance = location.pathname.startsWith("/maintenance");
  try{
    const cfg = await DataClient.getConfig();
    const maintenance = !!cfg.maintenanceActive;
    if(maintenance && !onMaintenance){
      location.replace("/maintenance/");
      return false;
    }
    if(!maintenance && onMaintenance){
      location.replace("/");
      return false;
    }
    return true;
  }catch(_e){
    if(!onMaintenance){
      location.replace("/maintenance/");
      return false;
    }
    return true;
  }
}
