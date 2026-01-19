import plugNotasAdapter from "./plugNotasAdapter.js";

const adapters = {
  plugnotas: plugNotasAdapter,
};

async function emitirNota(nfData, empresaConfig) {
  const provider = (empresaConfig?.provider || "plugnotas").toLowerCase();
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Provider adapter not found: ${provider}`);
  }

  return adapter.emitirNota(nfData, empresaConfig);
}

export default { emitirNota };
