/**
 * server/index.js
 * Servidor Express principal — porta 3001
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

// Rotas
import orgRouter      from './routes/org.js';
import employeesRouter from './routes/employees.js';
import authRouter     from './routes/auth.js';
import adminActsRouter from './routes/admin-acts-logic.js';
import actTypesRouter from './routes/act-types.js';
import {
  createGenericRouter,
  settingsRouter,
  auditRouter,
  securityRouter,
} from './routes/generic.js';

// Inicializar a BD (cria o ficheiro e as tabelas se nao existirem)
import { getDb } from './db.js';
getDb();

const app = express();
const PORT = 3001;

import { authenticateUser } from './middleware/auth.js';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));  // Permite fotos e documentos grandes
app.use('/api', authenticateUser);

// ─── Rotas API ────────────────────────────────────────────────────────────────
app.use('/api/org',           orgRouter);
app.use('/api/employees',     employeesRouter);
app.use('/api/auth',          authRouter);
app.use('/api/admin-acts',    adminActsRouter);
app.use('/api/act-types',     actTypesRouter);
app.use('/api/audit',         auditRouter);
app.use('/api/disciplinary',  createGenericRouter('disciplinary'));
app.use('/api/transfers',     createGenericRouter('transfers'));
app.use('/api/evaluations',   createGenericRouter('evaluations'));
app.use('/api/effectiveness', createGenericRouter('effectiveness'));
app.use('/api/settings',      settingsRouter);
app.use('/api/security',      securityRouter);

// ─── Healthcheck ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Erro global ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ SERNIC Backend a correr em http://localhost:${PORT}`);
  console.log(`   Base de dados: server/sernic.db`);
  console.log(`   API:           http://localhost:${PORT}/api/health\n`);
});
