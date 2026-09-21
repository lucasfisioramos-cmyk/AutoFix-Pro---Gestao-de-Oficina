import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { testConnection } from "./src/db/connection";
import { runMigrations } from "./src/db/migrations";
import { runSeed } from "./src/db/seed";
import {
  loadFullState,
  WorkshopRepo,
  UserRepo,
  EmployeeRepo,
  CustomerRepo,
  PartRepo,
  ServiceOrderRepo,
  ExpenseRepo,
} from "./src/db/repository";

// ─── Tipos auxiliares ────────────────────────────────────────────────────────
type WsMessage =
  | { type: "GET_STATE" }
  | { type: "UPDATE_WORKSHOP";  payload: any }
  | { type: "CREATE_USER";      payload: any }
  | { type: "UPDATE_USER";      payload: any }
  | { type: "CHANGE_PASSWORD";  payload: { id: string; newPassword: string } }
  | { type: "TOGGLE_USER";      payload: { id: string; active: boolean } }
  | { type: "CREATE_EMPLOYEE";  payload: any }
  | { type: "UPDATE_EMPLOYEE";  payload: any }
  | { type: "TOGGLE_EMPLOYEE";  payload: { id: string; active: boolean } }
  | { type: "CREATE_CUSTOMER";  payload: any }
  | { type: "UPDATE_CUSTOMER";  payload: any }
  | { type: "DELETE_CUSTOMER";  payload: { id: string } }
  | { type: "CREATE_PART";      payload: any }
  | { type: "UPDATE_PART";      payload: any }
  | { type: "DELETE_PART";      payload: { id: string } }
  | { type: "CREATE_SERVICE";   payload: any }
  | { type: "UPDATE_SERVICE";   payload: any }
  | { type: "CREATE_EXPENSE";   payload: any }
  | { type: "UPDATE_EXPENSE";   payload: any }
  | { type: "DELETE_EXPENSE";   payload: { id: string } }
  | { type: "LOGIN";            payload: { email: string; password: string }; requestId: string }
  | { type: "RECOVER_PASSWORD"; payload: { phone: string } }
  | { type: "RESET_PASSWORD";   payload: { userId: string; newPassword: string } };

async function startServer() {
  // ── 1. Banco de Dados ──────────────────────────────────────────────────────
  await testConnection();
  await runMigrations();
  await runSeed();

  // ── 2. HTTP + WebSocket ────────────────────────────────────────────────────
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json());

  // ── 3. Broadcast para todos os clientes ───────────────────────────────────
  const broadcast = (data: object, excludeWs?: WebSocket) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  const broadcastAll = (data: object) => broadcast(data);

  // ── 4. Helpers de resposta WebSocket ──────────────────────────────────────
  const send = (ws: WebSocket, data: object) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };

  const sendError = (ws: WebSocket, requestId: string | undefined, message: string) => {
    send(ws, { type: "ERROR", requestId, message });
  };

  // ── 5. WebSocket handler ──────────────────────────────────────────────────
  wss.on("connection", async (ws) => {
    console.log("[WS] Cliente conectado");

    // Envia estado inicial completo para o cliente que acabou de conectar
    try {
      const state = await loadFullState();
      send(ws, { type: "INIT", payload: state });
    } catch (err) {
      console.error("[WS] Erro ao carregar estado inicial:", err);
      sendError(ws, undefined, "Erro ao carregar dados do servidor.");
    }

    ws.on("message", async (raw) => {
      let msg: WsMessage & { requestId?: string };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return sendError(ws, undefined, "Mensagem inválida.");
      }

      const { type, requestId } = msg as any;
      console.log(`[WS] Evento: ${type}`);

      try {
        switch (type) {

          // ── Estado completo ──────────────────────────────────────────────
          case "GET_STATE": {
            const state = await loadFullState();
            send(ws, { type: "INIT", payload: state });
            break;
          }

          // ── Login ────────────────────────────────────────────────────────
          case "LOGIN": {
            const { email, password } = (msg as any).payload;
            const user = await UserRepo.verifyPassword(email, password);
            if (!user) {
              send(ws, { type: "LOGIN_RESULT", requestId, success: false, message: "E-mail ou senha incorretos." });
            } else if (!user.active) {
              send(ws, { type: "LOGIN_RESULT", requestId, success: false, message: "Seu acesso foi bloqueado. Entre em contato com o administrador." });
            } else {
              send(ws, { type: "LOGIN_RESULT", requestId, success: true, user });
            }
            break;
          }

          // ── Configurações ────────────────────────────────────────────────
          case "UPDATE_WORKSHOP": {
            const updated = await WorkshopRepo.update((msg as any).payload);
            broadcastAll({ type: "WORKSHOP_UPDATED", payload: updated });
            break;
          }

          // ── Usuários ─────────────────────────────────────────────────────
          case "CREATE_USER": {
            const user = await UserRepo.create((msg as any).payload);
            const users = await UserRepo.getAll();
            broadcastAll({ type: "USERS_UPDATED", payload: users });
            break;
          }

          case "UPDATE_USER": {
            const { id, ...data } = (msg as any).payload;
            await UserRepo.update(id, data);
            const users = await UserRepo.getAll();
            broadcastAll({ type: "USERS_UPDATED", payload: users });
            break;
          }

          case "CHANGE_PASSWORD": {
            const { id, newPassword } = (msg as any).payload;
            await UserRepo.changePassword(id, newPassword);
            send(ws, { type: "PASSWORD_CHANGED", requestId, success: true });
            break;
          }

          case "TOGGLE_USER": {
            const { id, active } = (msg as any).payload;
            await UserRepo.setActive(id, active);
            const users = await UserRepo.getAll();
            broadcastAll({ type: "USERS_UPDATED", payload: users });
            break;
          }

          // ── Funcionários ─────────────────────────────────────────────────
          case "CREATE_EMPLOYEE": {
            const emp = await EmployeeRepo.create((msg as any).payload);
            const employees = await EmployeeRepo.getAll();
            broadcastAll({ type: "EMPLOYEES_UPDATED", payload: employees });
            break;
          }

          case "UPDATE_EMPLOYEE": {
            const { id, ...data } = (msg as any).payload;
            await EmployeeRepo.update(id, data);
            const employees = await EmployeeRepo.getAll();
            broadcastAll({ type: "EMPLOYEES_UPDATED", payload: employees });
            break;
          }

          case "TOGGLE_EMPLOYEE": {
            const { id, active } = (msg as any).payload;
            await EmployeeRepo.setActive(id, active);
            // Bloqueia/desbloqueia o usuário vinculado também
            await UserRepo.setActive(id, active).catch(() => {});
            const [employees, users] = await Promise.all([
              EmployeeRepo.getAll(),
              UserRepo.getAll(),
            ]);
            broadcastAll({ type: "EMPLOYEES_UPDATED", payload: employees });
            broadcastAll({ type: "USERS_UPDATED", payload: users });
            break;
          }

          // ── Clientes ─────────────────────────────────────────────────────
          case "CREATE_CUSTOMER": {
            const cust = await CustomerRepo.create((msg as any).payload);
            const customers = await CustomerRepo.getAll();
            broadcastAll({ type: "CUSTOMERS_UPDATED", payload: customers });
            break;
          }

          case "UPDATE_CUSTOMER": {
            const { id, ...data } = (msg as any).payload;
            await CustomerRepo.update(id, data);
            const customers = await CustomerRepo.getAll();
            broadcastAll({ type: "CUSTOMERS_UPDATED", payload: customers });
            break;
          }

          case "DELETE_CUSTOMER": {
            await CustomerRepo.delete((msg as any).payload.id);
            const customers = await CustomerRepo.getAll();
            broadcastAll({ type: "CUSTOMERS_UPDATED", payload: customers });
            break;
          }

          // ── Peças ─────────────────────────────────────────────────────────
          case "CREATE_PART": {
            await PartRepo.create((msg as any).payload);
            const parts = await PartRepo.getAll();
            broadcastAll({ type: "PARTS_UPDATED", payload: parts });
            break;
          }

          case "UPDATE_PART": {
            const { id, ...data } = (msg as any).payload;
            await PartRepo.update(id, data);
            const parts = await PartRepo.getAll();
            broadcastAll({ type: "PARTS_UPDATED", payload: parts });
            break;
          }

          case "DELETE_PART": {
            await PartRepo.delete((msg as any).payload.id);
            const parts = await PartRepo.getAll();
            broadcastAll({ type: "PARTS_UPDATED", payload: parts });
            break;
          }

          // ── Ordens de Serviço ─────────────────────────────────────────────
          case "CREATE_SERVICE": {
            await ServiceOrderRepo.create((msg as any).payload);
            const [services, parts] = await Promise.all([
              ServiceOrderRepo.getAll(),
              PartRepo.getAll(),
            ]);
            broadcastAll({ type: "SERVICES_UPDATED", payload: services });
            broadcastAll({ type: "PARTS_UPDATED", payload: parts });
            break;
          }

          case "UPDATE_SERVICE": {
            const { id, ...data } = (msg as any).payload;
            await ServiceOrderRepo.update(id, data);
            const [services, parts] = await Promise.all([
              ServiceOrderRepo.getAll(),
              PartRepo.getAll(),
            ]);
            broadcastAll({ type: "SERVICES_UPDATED", payload: services });
            broadcastAll({ type: "PARTS_UPDATED", payload: parts });
            break;
          }

          // ── Despesas ──────────────────────────────────────────────────────
          case "CREATE_EXPENSE": {
            await ExpenseRepo.create((msg as any).payload);
            const expenses = await ExpenseRepo.getAll();
            broadcastAll({ type: "EXPENSES_UPDATED", payload: expenses });
            break;
          }

          case "UPDATE_EXPENSE": {
            const { id, ...data } = (msg as any).payload;
            await ExpenseRepo.update(id, data);
            const expenses = await ExpenseRepo.getAll();
            broadcastAll({ type: "EXPENSES_UPDATED", payload: expenses });
            break;
          }

          case "DELETE_EXPENSE": {
            await ExpenseRepo.delete((msg as any).payload.id);
            const expenses = await ExpenseRepo.getAll();
            broadcastAll({ type: "EXPENSES_UPDATED", payload: expenses });
            break;
          }

          default:
            console.warn(`[WS] Tipo de evento desconhecido: ${type}`);
        }
      } catch (err: any) {
        console.error(`[WS] Erro ao processar evento ${type}:`, err?.message || err);
        sendError(ws, requestId, err?.message || "Erro interno do servidor.");
      }
    });

    ws.on("close", () => console.log("[WS] Cliente desconectado"));
    ws.on("error", (err) => console.error("[WS] Erro no socket:", err));
  });

  // ── 6. Vite (dev) ou static (prod) ───────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (_req, res) => res.sendFile("dist/index.html", { root: "." }));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Falha ao iniciar:", err);
  process.exit(1);
});
