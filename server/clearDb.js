/**
 * server/clearDb.js
 * Script para limpar todos os registos de estrutura e funcionários do SQLite.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

console.log('A ligar à base de dados em:', dbPath);
const db = new Database(dbPath);

try {
  db.transaction(() => {
    console.log('A desativar chaves estrangeiras temporariamente...');
    db.prepare('PRAGMA foreign_keys = OFF').run();

    console.log('A limpar tabelas de movimentações e processos...');
    db.prepare('DELETE FROM admin_acts').run();
    db.prepare('DELETE FROM transfers').run();
    db.prepare('DELETE FROM disciplinary').run();
    db.prepare('DELETE FROM evaluations').run();
    db.prepare('DELETE FROM effectiveness').run();
    db.prepare('DELETE FROM audit_log').run();

    console.log('A limpar tabela de funcionários...');
    db.prepare('DELETE FROM employees').run();

    console.log('A limpar tabelas da estrutura orgânica...');
    db.prepare('DELETE FROM sections').run();
    db.prepare('DELETE FROM divisions').run();
    db.prepare('DELETE FROM departments').run();
    db.prepare('DELETE FROM district_directorates').run();
    db.prepare('DELETE FROM directorates').run();

    console.log('A reativar chaves estrangeiras...');
    db.prepare('PRAGMA foreign_keys = ON').run();
  })();

  console.log('✅ Base de dados limpa com sucesso!');
} catch (e) {
  console.error('❌ Erro ao limpar a base de dados:', e.message);
} finally {
  db.close();
}
