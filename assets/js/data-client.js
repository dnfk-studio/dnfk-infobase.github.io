import { ENV } from "./env.js";
import { fetchJson } from "./api.js";

const cache = new Map();

async function getRoute(route){
  const url = `${ENV.API_BASE}?r=${encodeURIComponent(route)}`;
  if(cache.has(url)) return cache.get(url);
  const p = fetchJson(url);
  cache.set(url, p);
  return p;
}

export const DataClient = {
  async getMeta(){ return await getRoute("meta"); },
  async getPages(){ return await getRoute("pages"); },
  async getNotices(){ return await getRoute("notices"); },
  async getCda(){ return await getRoute("cda"); },
  async getConfig(){ return await getRoute("config"); },
};
