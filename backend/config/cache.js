import NodeCache from "node-cache";

// Configurar cache (TTL de 5 minutos por padrão)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Função para limpar cache específico
export function clearCacheByPattern(pattern) {
  const keys = cache.keys();
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  });
}

export default cache;
