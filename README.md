# Facturar

Aplicación web para llevar las **ventas, la caja y el almacén de un pequeño negocio** desde el móvil. La hice para el negocio de mi familia.

🔗 **Demo:** https://facturar-aa9e6.web.app

## Qué hace

- **Facturar ventas** en CUP o USD. Las ventas en dólares se convierten a CUP con la **tasa del día**, que se puede cambiar.
- **Control de stock**: cada venta descuenta del almacén y avisa si no queda suficiente.
- **Caja diaria**: dinero inicial, ventas del día y "dinero en mano", con la lista de operaciones en tiempo real.
- **Ventas de "Tienda" o "Casa"**, marcadas con colores distintos.
- **Estadísticas**: ganancias, piezas vendidas, productos más vendidos y de mayor ganancia (del día o históricas).
- **Almacén**: inventario, inversión total y ganancia potencial.
- **Sincronización en tiempo real** entre varios móviles gracias a Firestore.
- **Instalable como app (PWA)** y con caché para abrirla aunque falle la conexión.

## Tecnologías

HTML · JavaScript · Tailwind CSS · Firebase (Firestore y Hosting) · Service Worker (PWA)

## Estructura

```
index.html      Interfaz (5 pantallas: facturar, almacén, útiles y estadísticas)
scripts.js      Lógica: ventas, caja, almacén, estadísticas y tiempo real con Firestore
sw.js           Service worker: caché para uso sin conexión
manifest.json   Configuración para instalarla como app
firebase.json   Configuración de Firebase Hosting
```

## Publicar cambios

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

Al cambiar archivos, sube la versión de `CACHE_NAME` en `sw.js` para que los móviles descarguen la versión nueva.

## Seguridad

La configuración de Firebase de `scripts.js` es pública por diseño. Lo que protege los datos son las **reglas de Firestore**. Como la app todavía no tiene inicio de sesión, el siguiente paso previsto es añadir **Firebase Authentication** y permitir leer y escribir solo a usuarios autorizados.

## Autor

Alex Álvarez Morales · [github.com/A013X](https://github.com/A013X)
