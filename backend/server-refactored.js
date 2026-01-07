import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import compression from "compression";
import dotenv from "dotenv";
import { createServer } from "http";
import schedule from "node-schedule";

// Importações de configuração
import logger from "./config/logger.js";

// Importações de middlewares
import { requestLogger } from "./middlewares/requestLogger.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

// Importações de serviços
import { initWebSocket } from "./services/websocket.js";
import { realizarBackupAutomatico } from "./services/backup.js";

// Importações de rotas
import routes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

// ============================================
// ROTAS DA API
// ============================================

app.use("/api", routes);

// ============================================
// TRATAMENTO DE ERROS
// ============================================

app.use(errorHandler);
app.use(notFoundHandler);

// ============================================
// WEBSOCKET
// ============================================

const server = createServer(app);
initWebSocket(server);

// ============================================
// BACKUP AUTOMÁTICO
// ============================================

schedule.scheduleJob("0 2 * * *", realizarBackupAutomatico);
logger.info("📅 Backup automático agendado para executar diariamente às 2h");

// ============================================
// INICIAR SERVIDOR
// ============================================

server.listen(PORT, () => {
  logger.info(`✓ Servidor rodando em http://localhost:${PORT}`);
  logger.info(`✓ WebSocket disponível na mesma porta`);
  console.log(`✓ Servidor rodando em http://localhost:${PORT}`);
});
