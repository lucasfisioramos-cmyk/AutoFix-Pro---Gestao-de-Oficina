import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import type { User, UserRole } from "./src/types";

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
  | { type: "LOGOUT" }
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
  | { type: "DELETE_EXPENSE"; payload: { id: string } }
  | { type: "LOGIN";            payload: { email: string; password: string }; requestId: string };

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

  const sessions = new WeakMap<WebSocket, User>();

  const sessionFor = (ws: WebSocket): User => {
    const user = sessions.get(ws);
    if (!user) throw new Error("Autenticação necessária.");
    return user;
  };

  const requireRole = (ws: WebSocket, roles: UserRole[]) => {
    const user = sessionFor(ws);
    if (!roles.includes(user.role)) throw new Error("Você não tem permissão para esta operação.");
    return user;
  };

  const visibleData = (data: any, user: User) => {
    if (user.role === "admin") return data;

    switch (data.type) {
      case "USERS_UPDATED":
        return { ...data, payload: data.payload.filter((item: User) => item.id === user.id) };
      case "EMPLOYEES_UPDATED":
        return {
          ...data,
          payload: data.payload
            .filter((item: { id: string }) => user.role !== "mechanic" || item.id === user.employeeId)
            .map((item: any) => ({ ...item, baseSalary: 0, commissionRate: 0 })),
        };
      case "SERVICES_UPDATED":
        return user.role === "mechanic"
          ? { ...data, payload: data.payload.filter((item: { employeeId: string }) => item.employeeId === user.employeeId) }
          : data;
      case "CUSTOMERS_UPDATED":
        return user.role === "mechanic" ? null : data;
      case "EXPENSES_UPDATED":
        return null;
      default:
        return data;
    }
  };

  const broadcastAll = (data: object) => {
    wss.clients.forEach((client) => {
      const user = sessions.get(client);
      if (!user) return;
      const visible = visibleData(data, user);
      if (visible) send(client, visible);
    });
  };

  const loadVisibleState = async (user: User) => {
    const state = await loadFullState();
    if (user.role === "admin") return state;

    return {
      ...state,
      users: state.users.filter((item) => item.id === user.id),
      employees: state.employees
        .filter((item) => user.role !== "mechanic" || item.id === user.employeeId)
        .map((item) => ({ ...item, baseSalary: 0, commissionRate: 0 })),
      services: user.role === "mechanic"
        ? state.services.filter((item) => item.employeeId === user.employeeId)
        : state.services,
      customers: user.role === "mechanic"
        ? state.customers.filter((customer) => state.services.some(
            (service) => service.employeeId === user.employeeId && service.customerId === customer.id
          ))
        : state.customers,
      expenses: [],
    };
  };

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
    send(ws, { type: "READY" });

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
        if (type === "LOGIN" && sessions.get(ws)) {
          throw new Error("Esta conexão já está autenticada.");
        }
        if (type !== "LOGIN") sessionFor(ws);

        switch (type) {

          case "LOGOUT": {
            sessions.delete(ws);
            send(ws, { type: "LOGOUT_RESULT" });
            break;
          }

          // ── Estado completo ──────────────────────────────────────────────
          case "GET_STATE": {
            const state = await loadVisibleState(sessionFor(ws));
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
              sessions.set(ws, user);
              send(ws, { type: "LOGIN_RESULT", requestId, success: true, user });
              const state = await loadVisibleState(user);
              send(ws, { type: "INIT", payload: state });
            }
            break;
          }

          // ── Configurações ────────────────────────────────────────────────
          case "UPDATE_WORKSHOP": {
            requireRole(ws, ["admin"]);
            const updated = await WorkshopRepo.update((msg as any).payload);
            broadcastAll({ type: "WORKSHOP_UPDATED", payload: updated });
            break;
          }

          // ── Usuários ─────────────────────────────────────────────────────
          case "CREATE_USER": {
            requireRole(ws, ["admin"]);
            const user = await UserRepo.create((msg as any).payload);
            const users = await UserRepo.getAll();
            broadcastAll({ type: "USERS_UPDATED", payload: users });
            break;
          }

          case "UPDATE_USER": {
            const currentUser = sessionFor(ws);
            const { id, ...data } = (msg as any).payload;
            if (currentUser.role !== "admin") {
              if (id !== currentUser.id || Object.keys(data).some((key) => !["name", "profileImage"].includes(key))) {
                throw new Error("Você não tem permissão para alterar este usuário.");
              }
            }
            await UserRepo.update(id, data);
            const users = await UserRepo.getAll();
            broadcastAll({ type: "USERS_UPDATED", payload: users });
            break;
          }

          case "CHANGE_PASSWORD": {
            const currentUser = sessionFor(ws);
            const { id, newPassword } = (msg as any).payload;
            if (currentUser.role !== "admin" && id !== currentUser.id) {
              throw new Error("Você só pode alterar sua própria senha.");
            }
            await UserRepo.changePassword(id, newPassword);
            send(ws, { type: "PASSWORD_CHANGED", requestId, success: true });
            break;
          }

          case "TOGGLE_USER": {
            requireRole(ws, ["admin"]);
            const { id, active } = (msg as any).payload;
            await UserRepo.setActive(id, active);
            const users = await UserRepo.getAll();
            broadcastAll({ type: "USERS_UPDATED", payload: users });
            break;
          }

          // ── Funcionários ─────────────────────────────────────────────────
          case "CREATE_EMPLOYEE": {
            requireRole(ws, ["admin"]);
            const emp = await EmployeeRepo.create((msg as any).payload);
            const employees = await EmployeeRepo.getAll();
            broadcastAll({ type: "EMPLOYEES_UPDATED", payload: employees });
            break;
          }

          case "UPDATE_EMPLOYEE": {
            requireRole(ws, ["admin"]);
            const { id, ...data } = (msg as any).payload;
            await EmployeeRepo.update(id, data);
            const employees = await EmployeeRepo.getAll();
            broadcastAll({ type: "EMPLOYEES_UPDATED", payload: employees });
            break;
          }

          case "TOGGLE_EMPLOYEE": {
            requireRole(ws, ["admin"]);
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
            requireRole(ws, ["admin", "receptionist"]);
            const cust = await CustomerRepo.create((msg as any).payload);
            const customers = await CustomerRepo.getAll();
            broadcastAll({ type: "CUSTOMERS_UPDATED", payload: customers });
            break;
          }

          case "UPDATE_CUSTOMER": {
            requireRole(ws, ["admin", "receptionist"]);
            const { id, ...data } = (msg as any).payload;
            await CustomerRepo.update(id, data);
            const customers = await CustomerRepo.getAll();
            broadcastAll({ type: "CUSTOMERS_UPDATED", payload: customers });
            break;
          }

          case "DELETE_CUSTOMER": {
            requireRole(ws, ["admin", "receptionist"]);
            await CustomerRepo.delete((msg as any).payload.id);
            const customers = await CustomerRepo.getAll();
            broadcastAll({ type: "CUSTOMERS_UPDATED", payload: customers });
            break;
          }

          // ── Peças ─────────────────────────────────────────────────────────
          case "CREATE_PART": {
            requireRole(ws, ["admin", "receptionist"]);
            await PartRepo.create((msg as any).payload);
            const parts = await PartRepo.getAll();
            broadcastAll({ type: "PARTS_UPDATED", payload: parts });
            break;
          }

          case "UPDATE_PART": {
            requireRole(ws, ["admin", "receptionist"]);
            const { id, ...data } = (msg as any).payload;
            await PartRepo.update(id, data);
            const parts = await PartRepo.getAll();
            broadcastAll({ type: "PARTS_UPDATED", payload: parts });
            break;
          }

          case "DELETE_PART": {
            requireRole(ws, ["admin", "receptionist"]);
            await PartRepo.delete((msg as any).payload.id);
            const parts = await PartRepo.getAll();
            broadcastAll({ type: "PARTS_UPDATED", payload: parts });
            break;
          }

          // ── Ordens de Serviço ─────────────────────────────────────────────
          case "CREATE_SERVICE": {
            requireRole(ws, ["admin", "receptionist"]);
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
            const currentUser = sessionFor(ws);
            const { id, ...data } = (msg as any).payload;
            if (currentUser.role === "mechanic") {
              if (data.employeeId !== currentUser.employeeId) {
                throw new Error("Você só pode alterar suas próprias ordens de serviço.");
              }
              const service = (await ServiceOrderRepo.getAll()).find((item) => item.id === id);
              if (!service || service.employeeId !== currentUser.employeeId) {
                throw new Error("Você só pode alterar suas próprias ordens de serviço.");
              }
            }
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
            requireRole(ws, ["admin"]);
            await ExpenseRepo.create((msg as any).payload);
            const expenses = await ExpenseRepo.getAll();
            broadcastAll({ type: "EXPENSES_UPDATED", payload: expenses });
            break;
          }

          case "UPDATE_EXPENSE": {
            requireRole(ws, ["admin"]);
            const { id, ...data } = (msg as any).payload;
            await ExpenseRepo.update(id, data);
            const expenses = await ExpenseRepo.getAll();
            broadcastAll({ type: "EXPENSES_UPDATED", payload: expenses });
            break;
          }

          case "DELETE_EXPENSE": {
            requireRole(ws, ["admin"]);
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
