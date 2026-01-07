import { WebSocketServer } from "ws";
import logger from "../config/logger.js";

let wss = null;

export function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    logger.info("Novo cliente WebSocket conectado");

    ws.on("message", (message) => {
      logger.info(`Mensagem WebSocket recebida: ${message}`);
    });

    ws.on("close", () => {
      logger.info("Cliente WebSocket desconectado");
    });

    ws.on("error", (error) => {
      logger.error("Erro WebSocket:", error);
    });
  });

  return wss;
}

// Função para notificar todos os clientes WebSocket
export function broadcastUpdate(type, data) {
  if (!wss) return;

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  });

  logger.debug(`Broadcast enviado: ${type}`);
}

export function getWebSocketServer() {
  return wss;
}
