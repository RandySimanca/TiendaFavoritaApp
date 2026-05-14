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

    -- Tabla para los gastos fijos/operacionales del mes (Arriendo, Luz, etc)
    CREATE TABLE IF NOT EXISTS gastos_administrativos (
      id TEXT PRIMARY KEY,
      mes TEXT, -- YYYY-MM
      concepto TEXT,
      monto REAL,
      categoria TEXT,
      fuente TEXT, -- "Caja" o "Banco"
      timestamp INTEGER
    );

    -- Tabla para el borrador del día actual (reemplaza AsyncStorage)
    CREATE TABLE IF NOT EXISTS borradores (
      clave TEXT PRIMARY KEY,
      valor_json TEXT NOT NULL
    );

    -- Tabla para los ahorros o gastos extraordinarios (opcional)
    CREATE TABLE IF NOT EXISTS cierres_mensuales (
      mes TEXT PRIMARY KEY, -- "YYYY-MM"
      venta_total REAL DEFAULT 0,
      compras_total REAL DEFAULT 0,
      gasto_total REAL DEFAULT 0,
      retiros_total REAL DEFAULT 0,
      prestamos_total REAL DEFAULT 0,
      ingresos_total REAL DEFAULT 0,
      utilidad REAL DEFAULT 0,
      transacciones INTEGER DEFAULT 0,
      inventario_final REAL DEFAULT 0,
      json_detalle TEXT, -- Para guardar desglose de mas vendidos etc
      timestamp INTEGER
    );

    -- Tabla para el stock físico real
    CREATE TABLE IF NOT EXISTS inventario_items (
      id TEXT PRIMARY KEY,
      producto_id INTEGER,
      nombre TEXT NOT NULL,
      proveedor TEXT DEFAULT '',
      precio_compra REAL DEFAULT 0,
      precio_venta REAL DEFAULT 0,
      unidad TEXT DEFAULT 'und',
      cantidad REAL DEFAULT 0,
      fecha_conteo TEXT,
      fecha_vencimiento TEXT,
      categoria TEXT,
      notas TEXT,
      activo INTEGER DEFAULT 1
    );

    -- Tabla para el historial de movimientos de inventario (Kardex)
    CREATE TABLE IF NOT EXISTS inventario_movimientos (
      id TEXT PRIMARY KEY,
      item_id TEXT,
      nombre_producto TEXT NOT NULL,
      tipo TEXT NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL DEFAULT 0,
      valor_total REAL DEFAULT 0,
      concepto TEXT DEFAULT '',
      fecha TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `);

  // Columnas added en versiones posteriores (no falla si ya existen)
  await db.execAsync('ALTER TABLE retiros ADD COLUMN nota TEXT;').catch(() => null);
  await db.execAsync('ALTER TABLE ingresos ADD COLUMN nota TEXT;').catch(() => null);
  await db.execAsync('ALTER TABLE cierres_mensuales ADD COLUMN compras_total REAL DEFAULT 0;').catch(() => null);
  await db.execAsync('ALTER TABLE cierres_mensuales ADD COLUMN retiros_total REAL DEFAULT 0;').catch(() => null);
  await db.execAsync('ALTER TABLE cierres_mensuales ADD COLUMN prestamos_total REAL DEFAULT 0;').catch(() => null);
  await db.execAsync('ALTER TABLE cierres_mensuales ADD COLUMN ingresos_total REAL DEFAULT 0;').catch(() => null);
  await db.execAsync('ALTER TABLE cierres_mensuales ADD COLUMN inventario_final REAL DEFAULT 0;').catch(() => null);
  await db.execAsync('ALTER TABLE cierres_mensuales ADD COLUMN json_detalle TEXT;').catch(() => null);
}

// ── UTILIDADES DE CIERRES MENSUALES ──

export async function dbGetCierresMensuales() {
  return await db.getAllAsync<{
    mes: string, 
    venta_total: number, 
    compras_total: number,
    gasto_total: number, 
    retiros_total: number,
    prestamos_total: number,
    utilidad: number, 
    transacciones: number,
    inventario_final: number,
    json_detalle: string,
    timestamp: number
  }>('SELECT * FROM cierres_mensuales ORDER BY mes DESC');
}

export async function dbInsertCierreMensual(c: {
  mes: string, 
  venta_total: number, 
  compras_total: number,
  gasto_total: number, 
  retiros_total: number,
  prestamos_total: number,
  ingresos_total: number,
  utilidad: number, 
  transacciones: number,
  inventario_final?: number,
  json_detalle: string
}) {
  await db.runAsync(
    'INSERT OR REPLACE INTO cierres_mensuales (mes, venta_total, compras_total, gasto_total, retiros_total, prestamos_total, ingresos_total, utilidad, transacciones, inventario_final, json_detalle, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    c.mes, c.venta_total, c.compras_total, c.gasto_total, c.retiros_total, c.prestamos_total, c.ingresos_total, c.utilidad, c.transacciones, c.inventario_final || 0, c.json_detalle, Date.now()
  );
}

// ── UTILIDADES DE GASTOS ADMINISTRATIVOS ──

export async function dbGetGastosAdministrativos(mes?: string) {
  if (mes) {
    return await db.getAllAsync<{
      id: string, mes: string, concepto: string, monto: number, categoria: string, fuente: string, timestamp: number
    }>('SELECT * FROM gastos_administrativos WHERE mes = ? ORDER BY timestamp DESC', mes);
  }
  return await db.getAllAsync<{
    id: string, mes: string, concepto: string, monto: number, categoria: string, fuente: string, timestamp: number
  }>('SELECT * FROM gastos_administrativos ORDER BY timestamp DESC');
}

export async function dbInsertGastoAdmon(g: {
  id: string, mes: string, concepto: string, monto: number, categoria: string, fuente: string
}) {
  await db.runAsync(
    'INSERT OR REPLACE INTO gastos_administrativos (id, mes, concepto, monto, categoria, fuente, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
    g.id, g.mes, g.concepto, g.monto, g.categoria, g.fuente, Date.now()
  );
}

export async function dbDeleteGastoAdmon(id: string) {
  await db.runAsync('DELETE FROM gastos_administrativos WHERE id = ?', id);
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

// ── Inventario Items ──────────────────────────────

export async function dbGetInventarioItems(): Promise<any[]> {
  return await db.getAllAsync(`SELECT * FROM inventario_items WHERE activo = 1 ORDER BY nombre`);
}

export async function dbUpsertInventarioItem(item: any): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO inventario_items
     (id, producto_id, nombre, proveedor, precio_compra, precio_venta, unidad,
      cantidad, fecha_conteo, fecha_vencimiento, categoria, notas, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.producto_id ?? null, item.nombre, item.proveedor ?? '',
     item.precio_compra ?? 0, item.precio_venta ?? 0, item.unidad ?? 'und',
     item.cantidad ?? 0, item.fecha_conteo ?? null, item.fecha_vencimiento ?? null,
     item.categoria ?? null, item.notas ?? null, item.activo ? 1 : 0]
  );
}

export async function dbDeleteInventarioItem(id: string): Promise<void> {
  await db.runAsync(`UPDATE inventario_items SET activo = 0 WHERE id = ?`, [id]);
}

// ── Inventario Movimientos ────────────────────────

export async function dbGetInventarioMovimientos(limit = 200): Promise<any[]> {
  return await db.getAllAsync(
    `SELECT * FROM inventario_movimientos ORDER BY timestamp DESC LIMIT ?`, [limit]
  );
}

export async function dbInsertInventarioMovimiento(mov: any): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO inventario_movimientos
     (id, item_id, nombre_producto, tipo, cantidad, precio_unitario, valor_total, concepto, fecha, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [mov.id, mov.item_id, mov.nombre_producto, mov.tipo, mov.cantidad,
     mov.precio_unitario ?? 0, mov.valor_total ?? 0, mov.concepto ?? '', mov.fecha, mov.timestamp]
  );
}
