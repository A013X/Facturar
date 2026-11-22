// ============================================
// 🔥 CONFIGURACIÓN FIREBASE
// ============================================
// Estas claves son públicas por diseño en Firebase: la seguridad depende de
// las reglas de Firestore, no de ocultar esta configuración.
const firebaseConfig = {
    apiKey: "AIzaSyBRZVf829REY05994GpM995eP8vnLHxxR0",
    authDomain: "facturar-aa9e6.firebaseapp.com",
    projectId: "facturar-aa9e6",
    storageBucket: "facturar-aa9e6.firebasestorage.app",
    messagingSenderId: "829124212210",
    appId: "1:829124212210:web:6049492366541215b5a76b",
    measurementId: "G-Q2FPXM54EK"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================
// 📦 VARIABLES GLOBALES
// ============================================
let facturasDelDia = [];
let gananciaHoy = 0;
let piezasHoy = 0;
let dineroEnCaja = 0;
let tasaDelDia = 300; // Por defecto arranca en 300

// Fecha de HOY en la hora local del dispositivo (AAAA-MM-DD).
// Antes se usaba toISOString(), que va en hora UTC: en Cuba, a partir de las
// 19-20 h las ventas se guardaban con la fecha del día siguiente.
function fechaLocal(d = new Date()) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}
const HOY = fechaLocal();

function textoPrecio(f) {
    return f.moneda === 'USD' ? `$${f.precioMostrar} USD` : `$${f.precioMostrar} CUP`;
}

function errorFirebase(contexto, err) {
    console.error(`Error en ${contexto}:`, err);
    if (err && err.code === 'permission-denied') {
        alert('No hay permiso para acceder a los datos. Revisa las reglas de Firestore en la consola de Firebase.');
    }
}

// ============================================
// 🔄 NAVEGACIÓN
// ============================================
async function redirigir(event) {
    const id = event.currentTarget.getAttribute('data-target');
    document.getElementById(id).classList.remove('hidden');

    // Si entró a la pantalla de facturar, forzamos a descargar los datos más recientes de Firebase
    if (id === 'factura1') {
        await recalcularCuadroOperaciones();
    }
}
function regresar() {
    document.querySelectorAll('.seccion-overlay').forEach(s => s.classList.add('hidden'));
}
document.querySelectorAll('[data-target]').forEach(b => b.addEventListener('click', redirigir));

// ============================================
// 💰 INICIAR CAJA Y TASA
// ============================================
async function inicializarCaja() {
    try {
        const doc = await db.collection('config').doc(HOY).get();
        if (doc.exists) {
            dineroEnCaja = doc.data().monto;
            tasaDelDia = doc.data().tasa || 300; // Cargamos la tasa si existe
        } else {
            const input = prompt("¿Con cuánto dinero inicia la caja hoy?");
            if (input !== null && input.trim() !== '' && !isNaN(input)) {
                dineroEnCaja = parseFloat(input);
                await db.collection('config').doc(HOY).set({ monto: dineroEnCaja, tasa: tasaDelDia });
            }
        }
    } catch (err) {
        errorFirebase('la caja inicial', err);
    }
    document.getElementById('dinero-caja').innerText = `En caja: $${dineroEnCaja}`;
    document.getElementById('input-tasa').value = tasaDelDia; // Mostramos la tasa en el input
}

async function editarCaja() {
    const nuevoMonto = prompt("¿Cuál es la cantidad correcta en caja?");
    if (nuevoMonto !== null && nuevoMonto.trim() !== '' && !isNaN(nuevoMonto)) {
        dineroEnCaja = parseFloat(nuevoMonto);
        await db.collection('config').doc(HOY).set({ monto: dineroEnCaja, tasa: tasaDelDia });
        document.getElementById('dinero-caja').innerText = `En caja: $${dineroEnCaja}`;
    }
}

async function guardarTasa() {
    const nuevaTasa = parseFloat(document.getElementById('input-tasa').value);
    if (!isNaN(nuevaTasa) && nuevaTasa > 0) {
        tasaDelDia = nuevaTasa;
        await db.collection('config').doc(HOY).set({ monto: dineroEnCaja, tasa: tasaDelDia });
        alert(`Tasa actualizada a: ${tasaDelDia}`);
    } else {
        alert("Ingresa una tasa válida");
    }
}

// ============================================
// 💰 FACTURAR VENTA (CON LÓGICA DE MONEDA)
// ============================================
async function facturar_orden_ventas() {
    const nombre = document.getElementById('factura-nombre').value.trim();
    const talla = document.getElementById('factura-talla').value.trim() || '-';
    const cantidad = parseInt(document.getElementById('factura-cantidad').value) || 1;
    const precioEscrito = parseFloat(document.getElementById('factura-precio').value);
    const moneda = document.getElementById('factura-moneda').value; // CUP o USD
    const origen = document.getElementById('factura-origen').value;

    if (!nombre || isNaN(precioEscrito)) { alert("Falta nombre o precio"); return; }
    if (precioEscrito < 0 || cantidad < 1) { alert("El precio y la cantidad deben ser positivos"); return; }

    // Si es USD, lo convertimos a CUP para Firebase
    const precioRealCUP = moneda === 'USD' ? (precioEscrito * tasaDelDia) : precioEscrito;

    const docRef = db.collection('almacen').doc(nombre);
    const docSnap = await docRef.get();
    const prod = docSnap.data();

    if (!prod || prod.cantidad === undefined) {
        const agregar = confirm(`"${nombre}" no está. ¿Añadirlo rápido?`);
        if (!agregar) return;
        // Se registra como producto vendido sin stock restante
        await docRef.set({ nombre, tipo: 'General', cantidad: 0, precio: 0, venta: precioRealCUP, extra: '' });
    } else {
        if (prod.cantidad < cantidad) { alert(`Stock insuficiente. Quedan: ${prod.cantidad}`); return; }
        const nuevaCant = prod.cantidad - cantidad;
        if (nuevaCant === 0) await docRef.delete(); else await docRef.update({ cantidad: nuevaCant });
    }

    // Guardamos en Firebase el precio SIEMPRE en CUP, pero dejamos constancia de la moneda
    await db.collection('facturas').add({
        nombre, talla, cantidad,
        precio: precioRealCUP,
        precioMostrar: precioEscrito, // El que escribió el usuario
        moneda: moneda,               // 'CUP' o 'USD'
        origen, fecha: HOY
    });

    document.getElementById('factura-nombre').value = '';
    document.getElementById('factura-talla').value = '';
    document.getElementById('factura-cantidad').value = '';
    document.getElementById('factura-precio').value = '';
}

// ============================================
// 📦 AGREGAR AL ALMACÉN
// ============================================
async function facturar_orden_almacen() {
    const nombre = document.getElementById('almacen-nombre').value.trim();
    const tipo = document.getElementById('almacen-tipo').value.trim() || 'General';
    const cantidad = parseInt(document.getElementById('almacen-cantidad').value) || 1;
    const precio = parseFloat(document.getElementById('almacen-precio').value);
    const venta = parseFloat(document.getElementById('almacen-venta').value);
    const extra = document.getElementById('almacen-extra').value.trim();

    if (!nombre || isNaN(precio) || isNaN(venta)) { alert("Falta nombre o precio"); return; }

    const docRef = db.collection('almacen').doc(nombre);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const e = docSnap.data();
        await docRef.update({ cantidad: (e.cantidad || 0) + cantidad, precio, venta, extra: extra || e.extra });
    } else {
        await docRef.set({ nombre, tipo, cantidad, precio, venta, extra });
    }

    ['almacen-nombre', 'almacen-tipo', 'almacen-precio', 'almacen-venta', 'almacen-cantidad', 'almacen-ganancia', 'almacen-extra'].forEach(id => document.getElementById(id).value = '');
    alert("¡Producto guardado!");
}

// ============================================
// 🛑 TERMINAR
// ============================================
function terminarVentas() { if(!confirm("¿Cerrar caja?")) return; facturasDelDia = []; gananciaHoy = 0; piezasHoy = 0; document.getElementById('ganancias').innerText = 'Ganancias hoy: $0'; document.getElementById('piezas').innerText = 'Piezas hoy: 0'; actualizar_tabla([], 'tabla-ventas'); }
function terminarAlmacen() { if(!confirm("¿Cerrar módulo?")) return; }

// ============================================
// 🔧 AUXILIARES DE PINTADO
// ============================================
function crearFila(valores, claseFila, claseCelda = "p-3 text-gray-700") {
    const fila = document.createElement('tr');
    fila.className = claseFila;
    valores.forEach(v => {
        const c = document.createElement('td');
        c.className = claseCelda;
        c.textContent = v; // textContent: los nombres nunca se interpretan como HTML
        fila.appendChild(c);
    });
    return fila;
}

// Lista de operaciones del cuadro de caja (la más reciente arriba)
function pintarOperaciones(facturas) {
    const listaOps = document.getElementById('lista-operaciones');
    if (!listaOps) return;
    listaOps.innerHTML = '';
    if (facturas.length === 0) {
        listaOps.innerHTML = '<p class="text-gray-400 text-center">Sin operaciones aún</p>';
        return;
    }
    [...facturas].reverse().forEach(f => {
        const div = document.createElement('div');
        div.className = `flex justify-between ${f.origen === 'Casa' ? 'text-yellow-700' : 'text-gray-700'}`;

        const izquierda = document.createElement('span');
        izquierda.textContent = `${f.nombre} `;
        const origen = document.createElement('span');
        origen.className = 'text-xs';
        origen.textContent = `(${f.origen})`;
        izquierda.appendChild(origen);

        const derecha = document.createElement('span');
        derecha.className = 'font-medium';
        derecha.textContent = `+${textoPrecio(f)}`;

        div.append(izquierda, derecha);
        listaOps.appendChild(div);
    });
}

// ============================================
// 👁️ TIEMPO REAL: TABLA ALMACÉN
// ============================================
db.collection('almacen').onSnapshot((snap) => {
    const tbody = document.getElementById('tabla-almacen'); if(!tbody) return; tbody.innerHTML = '';
    snap.forEach(doc => {
        const p = doc.data(); if(!p) return;
        const gan = (Number(p.venta)||0) - (Number(p.precio)||0);
        tbody.appendChild(crearFila([p.nombre, p.tipo, `$${p.precio}`, `$${p.venta}`, p.cantidad, `$${gan}`, p.extra||'-'], "border-b border-gray-100 hover:bg-purple-50"));
    });
}, (err) => errorFirebase('el almacén', err));

// ============================================
// 👁️ TIEMPO REAL: VENTAS DEL DÍA (COLOR CASA/TIENDA)
// ============================================
// onSnapshot no devuelve una promesa: los errores se reciben en el segundo
// parámetro. Antes había un .catch() aquí que rompía todo el script al cargar.
db.collection('facturas').where('fecha', '==', HOY).onSnapshot((snap) => {
    facturasDelDia = []; gananciaHoy = 0; piezasHoy = 0;
    // 'tabla-ventas' ya es el <tbody>: antes se buscaba un tbody dentro de él y la tabla nunca se rellenaba
    const tbodyVentas = document.getElementById('tabla-ventas');
    const tbodyAlmacen = document.getElementById('tabla-vendido-hoy');
    if(tbodyVentas) tbodyVentas.innerHTML = '';
    if(tbodyAlmacen) tbodyAlmacen.innerHTML = '';

    snap.forEach(doc => {
        const f = doc.data(); if(!f) return;
        facturasDelDia.push(f);
        gananciaHoy += (f.precio||0) * (f.cantidad||0); // Siempre suma en CUP
        piezasHoy += (f.cantidad||0);

        const colorFila = f.origen === 'Casa' ? "bg-yellow-50 border-b border-yellow-100" : "border-b border-gray-100 hover:bg-purple-50";
        if(tbodyVentas) tbodyVentas.appendChild(crearFila([textoPrecio(f), f.nombre, f.talla, f.cantidad], colorFila));
        if(tbodyAlmacen) tbodyAlmacen.appendChild(crearFila([f.origen, f.nombre, textoPrecio(f), f.cantidad], colorFila, "p-2 text-gray-700 text-sm"));
    });

    document.getElementById('ganancias').innerText = `Ganancias hoy: $${gananciaHoy}`;
    document.getElementById('piezas').innerText = `Piezas hoy: ${piezasHoy}`;

    // Cuadro de operaciones: lo que había en caja + lo vendido hoy (ya convertido a CUP)
    document.getElementById('resumen-inicio').textContent = dineroEnCaja;
    document.getElementById('resumen-actual').textContent = dineroEnCaja + gananciaHoy;
    pintarOperaciones(facturasDelDia);
}, (err) => errorFirebase('las ventas de hoy', err));

// ============================================
// 📈 ESTADÍSTICAS (suman todo en CUP)
// ============================================
async function resumir_ventas(periodo) {
    let snap = periodo === 'hoy' ? await db.collection('facturas').where('fecha', '==', HOY).get() : await db.collection('facturas').get();
    let facts = []; snap.forEach(d => facts.push(d.data()));
    if(!facts.length) return alert('Sin datos');
    let g=0, p=0, pop={}, gan={};
    facts.forEach(f => { g += (f.precio||0)*(f.cantidad||0); p += (f.cantidad||0); pop[f.nombre] = (pop[f.nombre]||0) + (f.cantidad||0); gan[f.nombre] = (gan[f.nombre]||0) + ((f.precio||0)*(f.cantidad||0)); });
    document.getElementById('stat-ganancia').textContent = `$${g}`;
    document.getElementById('stat-piezas').textContent = p;
    document.getElementById('stat-popular').textContent = Object.entries(pop).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
    document.getElementById('stat-top-ganancia').textContent = Object.entries(gan).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
    pintarRanking('tabla-popular', Object.entries(pop).sort((a,b)=>b[1]-a[1]), false);
    pintarRanking('tabla-ganancias', Object.entries(gan).sort((a,b)=>b[1]-a[1]), true);
}

async function resumir_almacen() {
    let snap = await db.collection('almacen').get(); if(snap.empty) return alert('Sin datos');
    let inv=0, uni=0, pot=0, arr=[], top={n:'N/A',c:0};
    snap.forEach(d => { let p=d.data(); if(!p) return; inv+=(p.precio||0)*(p.cantidad||0); uni+=(p.cantidad||0); pot+=((p.venta||0)-(p.precio||0))*(p.cantidad||0); arr.push(p); if((p.cantidad||0)>top.c) top={n:p.nombre,c:p.cantidad}; });
    arr.sort((a,b)=>(b.cantidad||0)-(a.cantidad||0));
    document.getElementById('stat-invertido').textContent = `$${inv}`;
    document.getElementById('stat-unidades').textContent = uni;
    document.getElementById('stat-potencial').textContent = `$${pot}`;
    document.getElementById('stat-mas-stock').textContent = top.n;
    const tb = document.getElementById('tabla-almacen-inventario'); if(!tb) return; tb.innerHTML='';
    arr.forEach((p,i) => tb.appendChild(crearFila([i+1, p.tipo, p.nombre, p.cantidad, `$${p.precio}`, `$${p.venta}`, `$${(p.venta||0)-(p.precio||0)}`, `$${(p.precio||0)*(p.cantidad||0)}`, p.extra||'-'], "border-b border-gray-100 hover:bg-purple-50")));
}

// ============================================
// 🔧 AUXILIARES
// ============================================
// esDinero indica si la columna es un importe (antes se decidía por si el número pasaba de 100)
function pintarRanking(id, datos, esDinero) {
    const tb = document.getElementById(id); if(!tb) return; tb.innerHTML='';
    datos.slice(0,10).forEach((item,i) => tb.appendChild(crearFila([i+1, item[0], esDinero ? `$${item[1]}` : item[1]], "border-b border-gray-100 hover:bg-purple-50")));
}
function actualizar_tabla(fuente, tablaId) {
    const tb = document.getElementById(tablaId); if(!tb) return; tb.innerHTML='';
    fuente.forEach(el => tb.appendChild(crearFila([textoPrecio(el), el.nombre, el.talla, el.cantidad], "border-b border-gray-100 hover:bg-purple-50")));
}
document.getElementById('mostrar-datos').addEventListener('click', () => actualizar_tabla(facturasDelDia, 'tabla-ventas'));

// ============================================
// 📊 RECALCULAR CUADRO (Sincronización forzada)
// ============================================
async function recalcularCuadroOperaciones() {
    try {
        // Pedimos a Firebase TODAS las ventas de hoy
        const snap = await db.collection('facturas').where('fecha', '==', HOY).get();
        let gananciaCalculada = 0;
        const opsArray = [];
        snap.forEach(doc => {
            const f = doc.data(); if(!f) return;
            gananciaCalculada += (f.precio||0) * (f.cantidad||0);
            opsArray.push(f);
        });

        document.getElementById('ganancias').innerText = `Ganancias hoy: $${gananciaCalculada}`;
        document.getElementById('resumen-inicio').textContent = dineroEnCaja;
        document.getElementById('resumen-actual').textContent = dineroEnCaja + gananciaCalculada;
        pintarOperaciones(opsArray);
    } catch (err) {
        errorFirebase('el cuadro de operaciones', err);
    }
}

// ============================================
// 🚀 INICIO
// ============================================
inicializarCaja();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').then(() => console.log('App lista')).catch((err) => console.log('Error SW:', err)); }
