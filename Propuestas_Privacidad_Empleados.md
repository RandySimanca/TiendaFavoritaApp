# Propuestas de Privacidad para el Rol "Empleado"
**Aplicación: Tienda Favorita**

---

En el sistema actual, cuando un usuario de tipo cajero entra a su sesión, ya tiene restringidos los módulos más sensibles (Resumen Mensual, Retiros, Gastos, Reporte por Fechas, y edición de la Lista de Precios). Sin embargo, aún quedan al descubierto cuatro agujeros de privacidad importantes que el Dueño Administrador debería considerar tapar para proteger el modelo de negocio:

### 1. Ocultar el "Precio de Compra" y "Ganancia" en la Lista de Precios
Actualmente un empleado puede abrir el listado y ver a cuánto compras los productos a tus distribuidores, al igual que el margen de ganancia porcentual y en efectivo.
* **Propuesta:** Restringir esa visibilidad y configurar la tarjeta para que el cajero únicamente vea el Nombre del Artículo y su sugerencia de Precio de Venta al Público (PVP). Que los costos sean secretos del dueño.

### 2. Ocultar o Denegar la pestaña "Promedio de Ventas"
La pantalla *Promedio Diario* calcula la venta promediada y le expone al trabajador el "Día con mayor venta" (tus récords) así como el total macro acumulado que se ha hecho en todos tus días de vida en la app.
* **Propuesta:** Dado que esta pestaña suele ser exclusivamente para fines gerenciales y contables, quitarla del menú lateral (Drawer) si el que ingresa no es el Jefe.

### 3. Bloquear el "Historial General" de meses anteriores
Actualmente, el que cubre las ventas en caja puede entrar a historial.tsx y bajar en el tiempo analizando cada uno de tus cierres anteriores, leyendo cómo era el negocio el mes pasado o la semana pasada de lunes a domingo. 
* **Propuesta:** Permitir que los empleados abran el historial exclusivamente para el día de Hoy / última sesión abierta, o bien denegar la pestaña historial por completo, permitiéndoles únicamente interactuar con el botón del Cuadre ("Hoy").

### 4. Bloquear el Permiso de "Re-escribir" o "Editar" el pasado
Aún si se le dejara el menú de Historial abierto al trabajador, este puede pulsar el lapicito (Editar) y alterar facturas, ingresos o reportes de meses pasados y re-subirlos.
* **Propuesta:** Quitar y esconder rigurosamente el botón de "Lápiz Amarillo / Editar" a todos aquellos que no posean el rol de administrador, dejando el borrador cerrado a modificaciones y blindando la integridad en Supabase.
