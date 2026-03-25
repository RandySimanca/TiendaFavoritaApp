import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { fmt } from './calcular';

/**
 * Servicio para generar reportes profesionales en PDF
 */
export const PDFService = {
  
  /**
   * Genera un PDF a partir de una plantilla HTML y lo comparte
   */
  async generarReporte(html: string, nombreArchivo: string) {
    try {
      // 1. Generar el PDF en una ubicación temporal
      const { uri } = await Print.printToFileAsync({ html });
      
      // 2. Definir una nueva ruta con el nombre deseado
      // Usamos el directorio de caché para que se limpie automáticamente
      const nuevaRuta = `${FileSystem.cacheDirectory}${nombreArchivo}`;
      
      // 3. Copiar el archivo al nuevo nombre
      await FileSystem.copyAsync({
        from: uri,
        to: nuevaRuta
      });

      // 4. Compartir el archivo con el nombre correcto
      await Sharing.shareAsync(nuevaRuta, {
        mimeType: 'application/pdf',
        dialogTitle: `Compartir ${nombreArchivo}`,
        UTI: 'com.adobe.pdf'
      });
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw error;
    }
  },

  /**
   * Estilos CSS globales para los reportes
   */
  getEstilos() {
    return `
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1a; padding: 20px; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 10px; margin-bottom: 20px; }
        .titulo { font-size: 24px; font-weight: bold; color: #14532d; margin: 0; }
        .subtitulo { font-size: 14px; color: #666; margin-top: 5px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background-color: #f3f4f6; color: #374151; padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
        tr:nth-child(even) { background-color: #f9fafb; }
        
        .seccion-titulo { font-size: 16px; font-weight: bold; color: #16a34a; margin-top: 20px; margin-bottom: 10px; border-left: 4px solid #16a34a; padding-left: 10px; }
        
        .totales-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-top: 20px; }
        .total-fila { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .total-label { font-size: 14px; color: #374151; }
        .total-valor { font-size: 16px; font-weight: bold; color: #14532d; }
        .gran-total { font-size: 20px; color: #16a34a; border-top: 1px solid #bbf7d0; padding-top: 10px; margin-top: 10px; }
        
        .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 40px; }
      </style>
    `;
  },

  /**
   * Genera el HTML para el cuadre de un día específico
   */
  async reporteCuadreDia(datos: any) {
    const renderFilas = (titulo: string, items: any[]) => {
      if (!items || items.length === 0) return '';
      let f = `<div class="seccion-titulo">${titulo}</div><table><thead><tr><th>Nombre</th><th>Valor</th></tr></thead><tbody>`;
      items.forEach(i => {
        f += `<tr><td>${i.nombre || '—'}</td><td>${fmt(i.valor || 0)}</td></tr>`;
      });
      f += `</tbody></table>`;
      return f;
    };

    const facturasHtml = (datos.facturas || []).length > 0 ? `
      <div class="seccion-titulo">🛒 Compras / Facturas</div>
      <table>
        <thead><tr><th>Proveedor</th><th>Descripción</th><th>Total</th></tr></thead>
        <tbody>
          ${datos.facturas.map((f: any) => `<tr><td>${f.proveedor}</td><td>${f.resumen}</td><td>${fmt(f.total)}</td></tr>`).join('')}
        </tbody>
      </table>
    ` : '';

    const html = `
      <html>
        <head>${this.getEstilos()}</head>
        <body>
          <div class="header">
            <h1 class="titulo">Reporte de Cuadre Diario</h1>
            <p class="subtitulo">Fecha: ${new Date(datos.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          ${facturasHtml}
          ${renderFilas('📤 Gastos del día', datos.gastos)}
          ${renderFilas('👥 Créditos (Fiados)', datos.creditos)}
          ${renderFilas('💵 Pagos de deuda recibidos', datos.pagos)}
          ${renderFilas('📲 Ventas por transferencia', datos.transferenciaVentas)}
          ${renderFilas('📲 Pagos deuda transferencia', datos.transferenciaPagos)}

          <div class="totales-box">
            <div class="total-fila">
              <span class="total-label">Base al iniciar:</span>
              <span class="total-valor">${fmt(datos.base || 0)}</span>
            </div>
            ${(datos.ingreso || 0) > 0 ? `
              <div class="total-fila">
                <span class="total-label">Ingresos adicionales (+):</span>
                <span class="total-valor">${fmt(datos.ingreso)}</span>
              </div>
            ` : ''}
            <div class="total-fila">
              <span class="total-label">Efectivo al cerrar:</span>
              <span class="total-valor">${fmt(datos.cierre || 0)}</span>
            </div>
            ${(datos.retiro || 0) > 0 ? `
              <div class="total-fila">
                <span class="total-label">Retiro del día (+):</span>
                <span class="total-valor">${fmt(datos.retiro)}</span>
              </div>
            ` : ''}
            ${(datos.prestamo || 0) > 0 ? `
              <div class="total-fila">
                <span class="total-label">Préstamo empleado (+):</span>
                <span class="total-valor">${fmt(datos.prestamo)}</span>
              </div>
            ` : ''}
            <div class="total-fila gran-total">
              <span class="total-label"><strong>TOTAL VENDIDO:</strong></span>
              <span class="total-valor"><strong>${fmt(datos.total || 0)}</strong></span>
            </div>
          </div>

          <div class="footer">
            Generado por Tienda Favorita App • ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    return this.generarReporte(html, `Reporte Diario ${datos.fecha}.pdf`);
  },

  /**
   * Genera el HTML para el inventario de precios
   */
  async reporteInventario(precios: any[]) {
    // Agrupar por proveedor
    const grupos: Record<string, any[]> = {};
    precios.forEach(p => {
      if (!grupos[p.proveedor]) grupos[p.proveedor] = [];
      grupos[p.proveedor].push(p);
    });

    let contenido = '';
    Object.entries(grupos).forEach(([prov, prods]) => {
      contenido += `
        <div class="seccion-titulo">Proveedor: ${prov}</div>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Costo</th>
              <th>Venta</th>
              <th>Unidad</th>
              <th>Margen</th>
            </tr>
          </thead>
          <tbody>
            ${prods.map(p => {
              const margen = p.compra > 0 ? Math.round(((p.venta - p.compra) / p.compra) * 100) : 0;
              return `
                <tr>
                  <td>${p.nombre}</td>
                  <td>${fmt(p.compra)}</td>
                  <td style="font-weight: bold; color: #16a34a;">${fmt(p.venta)}</td>
                  <td>${p.unidad || 'und'}</td>
                  <td>${margen}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    });

    const html = `
      <html>
        <head>${this.getEstilos()}</head>
        <body>
          <div class="header">
            <h1 class="titulo">Lista de Precios e Inventario</h1>
            <p class="subtitulo">Generado el: ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          ${contenido}
          <div class="footer">
            Generado por Tienda Favorita App
          </div>
        </body>
      </html>
    `;

    return this.generarReporte(html, `Inventario_Precios.pdf`);
  }
};
