// ═══════════════════════════════════════════════════
// Servicio de Base de Datos — SQLite
// Maneja la persistencia de la aplicación de forma robusta
// ═══════════════════════════════════════════════════

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'tienda_favorita.db';

export const db = SQLite.openDatabaseSync(DB_NAME);

/**
 * Inicializa las tablas de la base de datos si no existen
 */
export async function inicializarDB() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    -- Tabla para la lista de productos y precios
    CREATE TABLE IF NOT EXISTS precios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      proveedor TEXT NOT NULL,
      compra REAL DEFAULT 0,
      venta REAL DEFAULT 0,
      unidad TEXT DEFAULT 'und'
    );

    -- Tabla para el historial de cierres diarios
    CREATE TABLE IF NOT EXISTS historial (
      fecha TEXT PRIMARY KEY,
      datos_json TEXT NOT NULL,
      total_vendido REAL DEFAULT 0,
      timestamp INTEGER
    );

    -- Tabla para el historial de retiros de la dueña
    CREATE TABLE IF NOT EXISTS retiros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      valor REAL DEFAULT 0,
      nota TEXT,
      timestamp INTEGER
    );

    -- Tabla para los ingresos de dinero a caja (del admin)
    CREATE TABLE IF NOT EXISTS ingresos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      valor REAL DEFAULT 0,
      nota TEXT,
      timestamp INTEGER
    );

    -- Tabla para el borrador del día actual (reemplaza AsyncStorage)
    CREATE TABLE IF NOT EXISTS borradores (
      clave TEXT PRIMARY KEY,
      valor_json TEXT NOT NULL
    );
  `);

  // Columnas added en versiones posteriores (no falla si ya existen)
  await db.execAsync('ALTER TABLE retiros ADD COLUMN nota TEXT;').catch(() => null);
  await db.execAsync('ALTER TABLE ingresos ADD COLUMN nota TEXT;').catch(() => null);
}

// ── UTILIDADES DE PRECIOS ──

export async function dbGetPrecios() {
  return await db.getAllAsync<{id: number, nombre: string, proveedor: string, compra: number, venta: number, unidad: string}>(
    'SELECT * FROM precios ORDER BY proveedor, nombre'
  );
}

export async function dbInsertPrecio(p: {nombre: string, proveedor: string, compra: number, venta: number, unidad: string}) {
  const result = await db.runAsync(
    'INSERT INTO precios (nombre, proveedor, compra, venta, unidad) VALUES (?, ?, ?, ?, ?)',
    p.nombre, p.proveedor, p.compra, p.venta, p.unidad
  );
  return result.lastInsertRowId;
}

export async function dbUpdatePrecio(id: number, p: {nombre: string, proveedor: string, compra: number, venta: number, unidad: string}) {
  await db.runAsync(
    'UPDATE precios SET nombre = ?, proveedor = ?, compra = ?, venta = ?, unidad = ? WHERE id = ?',
    p.nombre, p.proveedor, p.compra, p.venta, p.unidad, id
  );
}

export async function dbDeletePrecio(id: number) {
  await db.runAsync('DELETE FROM precios WHERE id = ?', id);
}

export async function dbInsertPreciosBulk(precios: any[]) {
  // Usar una transacción para insertar muchos precios eficientemente
  await db.withTransactionAsync(async () => {
    for (const p of precios) {
      await db.runAsync(
        'INSERT INTO precios (nombre, proveedor, compra, venta, unidad) VALUES (?, ?, ?, ?, ?)',
        p.nombre, p.proveedor, p.compra, p.venta, p.unidad
      );
    }
  });
}

// ── UTILIDADES DE HISTORIAL ──

export async function dbGetHistorial() {
  return await db.getAllAsync<{fecha: string, datos_json: string, total_vendido: number}>(
    'SELECT * FROM historial ORDER BY fecha DESC'
  );
}

export async function dbInsertHistorial(fecha: string, datos: any, total: number) {
  await db.runAsync(
    'INSERT OR REPLACE INTO historial (fecha, datos_json, total_vendido, timestamp) VALUES (?, ?, ?, ?)',
    fecha, JSON.stringify(datos), total, Date.now()
  );
}

export async function dbDeleteHistorial(fecha: string) {
  await db.runAsync('DELETE FROM historial WHERE fecha = ?', fecha);
}

// ── UTILIDADES DE RETIROS ──

export async function dbGetRetiros() {
  return await db.getAllAsync<{id: number, fecha: string, valor: number, nota: string, timestamp: number}>(
    'SELECT * FROM retiros ORDER BY timestamp DESC'
  );
}

export async function dbInsertRetiro(fecha: string, valor: number, nota: string) {
  await db.runAsync(
    'INSERT INTO retiros (fecha, valor, nota, timestamp) VALUES (?, ?, ?, ?)',
    fecha, valor, nota, Date.now()
  );
}

export async function dbDeleteRetiro(id: number) {
  await db.runAsync('DELETE FROM retiros WHERE id = ?', id);
}

// ── UTILIDADES DE INGRESOS ──

export async function dbGetIngresos() {
  return await db.getAllAsync<{id: number, fecha: string, valor: number, nota: string, timestamp: number}>(
    'SELECT * FROM ingresos ORDER BY timestamp DESC'
  );
}

export async function dbInsertIngreso(fecha: string, valor: number, nota: string) {
  await db.runAsync(
    'INSERT INTO ingresos (fecha, valor, nota, timestamp) VALUES (?, ?, ?, ?)',
    fecha, valor, nota, Date.now()
  );
}

export async function dbDeleteIngreso(id: number) {
  await db.runAsync('DELETE FROM ingresos WHERE id = ?', id);
}

// ── UTILIDADES DE BORRADORES ──

export async function dbSetBorrador(clave: string, valor: any) {
  await db.runAsync(
    'INSERT OR REPLACE INTO borradores (clave, valor_json) VALUES (?, ?)',
    clave, JSON.stringify(valor)
  );
}

export async function dbGetBorrador(clave: string) {
  const result = await db.getFirstAsync<{valor_json: string}>(
    'SELECT valor_json FROM borradores WHERE clave = ?',
    clave
  );
  return result ? JSON.parse(result.valor_json) : null;
}

export async function dbDeleteBorrador(clave: string) {
  await db.runAsync('DELETE FROM borradores WHERE clave = ?', clave);
}
