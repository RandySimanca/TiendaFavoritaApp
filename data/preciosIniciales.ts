// ════════════════════════════════════════════════════
// Lista de precios iniciales de la Tienda Favorita
// Se carga automáticamente la primera vez que se abre la app
// Estos datos provienen del archivo control_diario-5.html
// ════════════════════════════════════════════════════

export interface Precio {
  nombre: string;
  proveedor: string;
  compra: number;
  venta: number;
  unidad: string;
}

export const PRECIOS_INICIALES: Precio[] = [
  // ── Verduras y Frutas (Ivan Perez) ──
  { nombre: 'Ají',             proveedor: 'Ivan Perez', compra: 3500,  venta: 4500,  unidad: '500g' },
  { nombre: 'Cebollín',        proveedor: 'Ivan Perez', compra: 4400,  venta: 5500,  unidad: 'kg' },
  { nombre: 'Pimentón',        proveedor: 'Ivan Perez', compra: 6600,  venta: 8500,  unidad: 'kg' },
  { nombre: 'Remolacha',       proveedor: 'Ivan Perez', compra: 5950,  venta: 7500,  unidad: '500g' },
  { nombre: 'Ajo',             proveedor: 'Ivan Perez', compra: 8500,  venta: 11000, unidad: 'kg' },
  { nombre: 'Tomate',          proveedor: 'Ivan Perez', compra: 3800,  venta: 5000,  unidad: '500g' },
  { nombre: 'Manzana Roja',    proveedor: 'Ivan Perez', compra: 2000,  venta: 2500,  unidad: 'und' },
  { nombre: 'Manzana Verde',   proveedor: 'Ivan Perez', compra: 2000,  venta: 2500,  unidad: 'und' },
  { nombre: 'Mora Pq',         proveedor: 'Ivan Perez', compra: 750,   venta: 1000,  unidad: 'und' },
  { nombre: 'Mora GR',         proveedor: 'Ivan Perez', compra: 3500,  venta: 4500,  unidad: 'und' },
  { nombre: 'Pulpa Maracuyá',  proveedor: 'Ivan Perez', compra: 3333,  venta: 4200,  unidad: 'und' },
  { nombre: 'Lulo',            proveedor: 'Ivan Perez', compra: 1800,  venta: 2500,  unidad: 'und' },
  { nombre: 'Uva',             proveedor: 'Ivan Perez', compra: 37000, venta: 46500, unidad: 'kg' },

  // ── Gaseosas Lux ──
  { nombre: 'Naranja Postobón 250ml',  proveedor: 'Gaseosas Lux', compra: 833,  venta: 1000, unidad: 'botella' },
  { nombre: 'Manzana Postobón 250ml',  proveedor: 'Gaseosas Lux', compra: 833,  venta: 1000, unidad: 'botella' },
  { nombre: 'Uva Postobón 250ml',      proveedor: 'Gaseosas Lux', compra: 833,  venta: 1000, unidad: 'botella' },
  { nombre: 'Colombiana 250ml',        proveedor: 'Gaseosas Lux', compra: 833,  venta: 1000, unidad: 'botella' },
  { nombre: 'Hit 200ml',               proveedor: 'Gaseosas Lux', compra: 1167, venta: 2000, unidad: 'botella' },
  { nombre: 'Gatorade 500ml',          proveedor: 'Gaseosas Lux', compra: 3250, venta: 4000, unidad: 'botella' },
  { nombre: 'Postobón 1.750ml',        proveedor: 'Gaseosas Lux', compra: 3750, venta: 5000, unidad: 'botella' },
  { nombre: 'Postobón 2.500ml',        proveedor: 'Gaseosas Lux', compra: 4588, venta: 6000, unidad: 'botella' },
  { nombre: 'Pepsi 1.750ml',           proveedor: 'Gaseosas Lux', compra: 3667, venta: 5000, unidad: 'botella' },

  // ── Mecatos (Jorge E. Medina) ──
  { nombre: 'Margarita Natural 25g',   proveedor: 'Jorge E. Medina', compra: 1509, venta: 2000, unidad: 'und' },
  { nombre: 'Margarita Limón 25g',     proveedor: 'Jorge E. Medina', compra: 1509, venta: 2000, unidad: 'und' },
  { nombre: 'Margarita Pollo 25g',     proveedor: 'Jorge E. Medina', compra: 1509, venta: 2000, unidad: 'und' },
  { nombre: 'Doritos Megaqueso 43g',   proveedor: 'Jorge E. Medina', compra: 2155, venta: 3000, unidad: 'und' },
  { nombre: 'Cheetos Boli Queso 34g',  proveedor: 'Jorge E. Medina', compra: 1552, venta: 2000, unidad: 'und' },
  { nombre: 'Detodito 50g',            proveedor: 'Jorge E. Medina', compra: 2413, venta: 3000, unidad: 'und' },
  { nombre: 'Cheese Tris 48g',         proveedor: 'Jorge E. Medina', compra: 1552, venta: 2000, unidad: 'und' },

  // ── Productos Wilian Ocampo ──
  { nombre: 'Jabón Rey',       proveedor: 'Wilian Ocampo', compra: 2400,  venta: 3000,  unidad: 'und' },
  { nombre: 'Axion x900',      proveedor: 'Wilian Ocampo', compra: 10500, venta: 13125, unidad: 'und' },
  { nombre: 'Axion x450',      proveedor: 'Wilian Ocampo', compra: 5500,  venta: 6875,  unidad: 'und' },
  { nombre: 'Axion x225',      proveedor: 'Wilian Ocampo', compra: 3000,  venta: 3750,  unidad: 'und' },
  { nombre: 'Axion x150',      proveedor: 'Wilian Ocampo', compra: 2000,  venta: 2500,  unidad: 'und' },
  { nombre: 'Colcafe x50',     proveedor: 'Wilian Ocampo', compra: 11000, venta: 13750, unidad: 'und' },
  { nombre: 'Colcafe x85',     proveedor: 'Wilian Ocampo', compra: 15000, venta: 18750, unidad: 'und' },
  { nombre: 'Colcafe x170',    proveedor: 'Wilian Ocampo', compra: 25000, venta: 31250, unidad: 'und' },
  { nombre: 'Antioqueño x750', proveedor: 'Wilian Ocampo', compra: 47000, venta: 54050, unidad: 'und' },
  { nombre: 'Mobic 4t',        proveedor: 'Wilian Ocampo', compra: 24500, venta: 30625, unidad: 'und' },
];
