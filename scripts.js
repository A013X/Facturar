
// firebase ancla

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

// variables ancla 

let facturasDelDia = [];
let gananciaHoy = 0;
let piezasHoy = 0;
let dineroEnCaja = 0;
let tasaDelDia = 300; // Por defecto arranca en 300
const HOY = new Date().toISOString().split('T')[0];

// nav ancla

async function redirigir(event) {
    const id = event.currentTarget.getAttribute('data-target');
    document.getElementById(id).classList.remove('hidden');
    
    if (id === 'factura1') {
        await recalcularCuadroOperaciones();
    }
}
function regresar() {
    document.querySelectorAll('.seccion-overlay').forEach(s => s.classList.add('hidden'));
}
document.querySelectorAll('[data-target]').forEach(b => b.addEventListener('click', redirigir));

// caja ancla 

async function inicializarCaja() {
    const doc = await db.collection('config').doc(HOY).get();
    if (doc.exists) {
        dineroEnCaja = doc.data().monto;
        tasaDelDia = doc.data().tasa || 300; 
    } else {
        const input = prompt("¿Con cuánto dinero inicia la caja hoy?");
        if (input !== null && !isNaN(input)) {
            dineroEnCaja = parseFloat(input);
            await db.collection('config').doc(HOY).set({ monto: dineroEnCaja, tasa: tasaDelDia });
        }
    }
    document.getElementById('dinero-caja').innerText = `En caja: $${dineroEnCaja}`;
    document.getElementById('input-tasa').value = tasaDelDia; 
}

async function editarCaja() {
    const nuevoMonto = prompt("¿Cuál es la cantidad correcta en caja?");
    if (nuevoMonto !== null && !isNaN(nuevoMonto)) {
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

// facturas ancla

async function facturar_orden_ventas() {
    const nombre = document.getElementById('factura-nombre').value.trim();
    const talla = document.getElementById('factura-talla').value.trim() || '-';
    const cantidad = parseInt(document.getElementById('factura-cantidad').value) || 1;
    const precioEscrito = parseFloat(document.getElementById('factura-precio').value);
    const moneda = document.getElementById('factura-moneda').value; // CUP o USD
    const origen = document.getElementById('factura-origen').value;

    if (!nombre || isNaN(precioEscrito)) { alert("Falta nombre o precio"); return; }

    const precioRealCUP = moneda === 'USD' ? (precioEscrito * tasaDelDia) : precioEscrito;

    const docRef = db.collection('almacen').doc(nombre);
    const docSnap = await docRef.get();
    const prod = docSnap.data();

    if (!prod || prod.cantidad === undefined) {
        const agregar = confirm(`"${nombre}" no está. ¿Añadirlo rápido?`);
        if (!agregar) return;
        await docRef.set({ nombre, tipo: 'General', cantidad, precio: 0, venta: precioRealCUP, extra: '' });
    } else {
        if (prod.cantidad < cantidad) { alert(`Stock insuficiente. Quedan: ${prod.cantidad}`); return; }
        const nuevaCant = prod.cantidad - cantidad;
        if (nuevaCant === 0) await docRef.delete(); else await docRef.update({ cantidad: nuevaCant });
    }

    await db.collection('facturas').add({ 
        nombre, talla, cantidad, 
        precio: precioRealCUP, 
        precioMostrar: precioEscrito, 
        moneda: moneda,              
        origen, fecha: HOY 
    });

    document.getElementById('factura-nombre').value = '';
    document.getElementById('factura-talla').value = '';
    document.getElementById('factura-cantidad').value = '';
    document.getElementById('factura-precio').value = '';
}

// almacen ancla

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
        await docRef.update({ cantidad: e.cantidad + cantidad, precio, venta, extra: extra || e.extra });
    } else {
        await docRef.set({ nombre, tipo, cantidad, precio, venta, extra });
    }

    ['almacen-nombre', 'almacen-tipo', 'almacen-precio', 'almacen-venta', 'almacen-cantidad', 'almacen-ganancia', 'almacen-extra'].forEach(id => document.getElementById(id).value = '');
    alert("¡Producto guardado!");
}

// terminar ancla

function terminarVentas() { if(!confirm("¿Cerrar caja?")) return; facturasDelDia = []; gananciaHoy = 0; piezasHoy = 0; document.getElementById('ganancias').innerText = 'Ganancias hoy: $0'; document.getElementById('piezas').innerText = 'Piezas hoy: 0'; actualizar_tabla([], 'tabla-ventas'); }
function terminarAlmacen() { if(!confirm("¿Cerrar módulo?")) return; }

db.collection('almacen').onSnapshot((snap) => {
    const tbody = document.getElementById('tabla-almacen'); if(!tbody) return; tbody.innerHTML = '';
    snap.forEach(doc => {
        const p = doc.data(); if(!p) return;
        const fila = document.createElement('tr'); fila.className = "border-b border-gray-100 hover:bg-purple-50";
        const editar = document.createElement('td').className = "p-3 text-center";
        editar.innerHTML = `<button onclick="editarProducto('${p.nombre}')" class="text-blue-500 hover:text-blue-700 font-bold text-lg">✏️</button>`;
        const gan = (Number(p.venta)||0) - (Number(p.precio)||0);
        [p.nombre, p.tipo, `$${p.precio}`, `$${p.venta}`, p.cantidad, `$${gan}`, p.extra||'-'].forEach(v => { const c = document.createElement('td'); c.className = "p-3 text-gray-700"; c.textContent = v; fila.appendChild(c); });
        
        tbody.appendChild(fila);
    });
});

//ventas del dia ancla

db.collection('facturas').where('fecha', '==', HOY).onSnapshot((snap) => {
    facturasDelDia = []; gananciaHoy = 0; piezasHoy = 0;
    const tbodyVentas = document.querySelector('#tabla-ventas tbody');
    const tbodyAlmacen = document.getElementById('tabla-vendido-hoy');
    if(tbodyVentas) tbodyVentas.innerHTML = '';
    if(tbodyAlmacen) tbodyAlmacen.innerHTML = '';

    snap.forEach(doc => {
        const f = doc.data(); if(!f) return;
        facturasDelDia.push(f);
        gananciaHoy += (f.precio||0) * (f.cantidad||0); // Siempre suma en CUP
        piezasHoy += (f.cantidad||0);

        // Formatear cómo se muestra el precio
        const textoPrecio = f.moneda === 'USD' ? `$${f.precioMostrar} USD` : `$${f.precioMostrar} CUP`;

        // COLOR CASA/TIENDA
        const colorFila = f.origen === 'Casa' ? "bg-yellow-50 border-b border-yellow-100" : "border-b border-gray-100 hover:bg-purple-50";

        if(tbodyVentas) {
            const fila = document.createElement('tr'); fila.className = colorFila;
            [textoPrecio, f.nombre, f.talla, f.cantidad].forEach(v => { const c = document.createElement('td'); c.className = "p-3 text-gray-700"; c.textContent = v; fila.appendChild(c); });
            tbodyVentas.appendChild(fila);
        }

        if(tbodyAlmacen) {
            const fila = document.createElement('tr'); fila.className = colorFila;
            [f.origen, f.nombre, textoPrecio, f.cantidad].forEach(v => { const c = document.createElement('td'); c.className = "p-2 text-gray-700 text-sm"; c.textContent = v; fila.appendChild(c); });
            tbodyAlmacen.appendChild(fila);
        }
    });

            document.getElementById('ganancias').innerText = `Ganancias hoy: $${gananciaHoy}`;
        document.getElementById('piezas').innerText = `Piezas hoy: ${piezasHoy}`;

        // --- NUEVO: CUADRO DE OPERACIONES ---
        document.getElementById('resumen-inicio').textContent = dineroEnCaja;
        // Nota: Sumamos lo que había en caja + lo que vendimos hoy (ya convertido a CUP)
        document.getElementById('resumen-actual').textContent = dineroEnCaja + gananciaHoy;

        const listaOps = document.getElementById('lista-operaciones');
        if(listaOps) {
            listaOps.innerHTML = '';
            // Para mostrar la última venta arriba del todo, invertimos el orden
            let opsArray = [];
            snap.forEach(doc => opsArray.push(doc.data()));
            opsArray.reverse().forEach(f => {
                if(!f) return;
                const textoPrecio = f.moneda === 'USD' ? `$${f.precioMostrar} USD` : `$${f.precioMostrar} CUP`;
                const colorTexto = f.origen === 'Casa' ? 'text-yellow-700' : 'text-gray-700';
                
                const div = document.createElement('div');
                div.className = `flex justify-between ${colorTexto}`;
                div.innerHTML = `
                    <span>${f.nombre} <span class="text-xs">(${f.origen})</span></span>
                    <span class="font-medium">+${textoPrecio}</span>
                `;
                listaOps.appendChild(div);
            });
            
            if(opsArray.length === 0) {
                listaOps.innerHTML = '<p class="text-gray-400 text-center">Sin operaciones aún</p>';
            }
        }
}).catch(err => console.error("Error índice facturas:", err));

// estadisticas ancla

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
    pintarRanking('tabla-popular', Object.entries(pop).sort((a,b)=>b[1]-a[1]));
    pintarRanking('tabla-ganancias', Object.entries(gan).sort((a,b)=>b[1]-a[1]));
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
    arr.forEach((p,i) => { const f = document.createElement('tr'); f.className="border-b border-gray-100 hover:bg-purple-50"; [i+1, p.tipo, p.nombre, p.cantidad, `$${p.precio}`, `$${p.venta}`, `$${(p.venta||0)-(p.precio||0)}`, `$${(p.precio||0)*(p.cantidad||0)}`, p.extra||'-'].forEach(v => { const c = document.createElement('td'); c.className="p-3 text-gray-700"; c.textContent=v; f.appendChild(c); }); tb.appendChild(f); });
}

// pintar ancla
function pintarRanking(id, datos) {
    const tb = document.getElementById(id); if(!tb) return; tb.innerHTML='';
    datos.slice(0,10).forEach((item,i) => { const f = document.createElement('tr'); f.className="border-b border-gray-100 hover:bg-purple-50"; [i+1, item[0], typeof item[1]==='number' && item[1]>100 ? `$${item[1]}` : item[1]].forEach(v => { const c = document.createElement('td'); c.className="p-3 text-gray-700"; c.textContent=v; f.appendChild(c); }); tb.appendChild(f); });
}
function actualizar_tabla(fuente, tablaId) {
    const tb = document.querySelector(`#${tablaId} tbody`); if(!tb) return; tb.innerHTML='';
    fuente.forEach(el => { const f = document.createElement('tr'); f.className="border-b border-gray-100 hover:bg-purple-50"; Object.values(el).forEach(v => { const c = document.createElement('td'); c.className="p-3 text-gray-700"; c.textContent=v; f.appendChild(c); }); tb.appendChild(f); });
}
document.getElementById('mostrar-datos').addEventListener('click', () => actualizar_tabla(facturasDelDia, 'tabla-ventas'));

// recalcular ancla

async function recalcularCuadroOperaciones() {
    // todas las ventas de hoy se piden
    const snap = await db.collection('facturas').where('fecha', '==', HOY).get();
    let gananciaCalculada = 0;
    let opsArray = [];
    
    snap.forEach(doc => {
        const f = doc.data(); if(!f) return;
        gananciaCalculada += (f.precio||0) * (f.cantidad||0);
        opsArray.push(f);
    });

    // actualizar
    document.getElementById('ganancias').innerText = `Ganancias hoy: $${gananciaCalculada}`;
    document.getElementById('resumen-inicio').textContent = dineroEnCaja;
    document.getElementById('resumen-actual').textContent = dineroEnCaja + gananciaCalculada;

    // Pintamos la lista de operaciones
    const listaOps = document.getElementById('lista-operaciones');
    if(listaOps) {
        listaOps.innerHTML = '';
        // Invertimos el arreglo para que la venta más reciente quede arriba
        opsArray.reverse().forEach(f => {
            const textoPrecio = f.moneda === 'USD' ? `$${f.precioMostrar} USD` : `$${f.precioMostrar} CUP`;
            const colorTexto = f.origen === 'Casa' ? 'text-yellow-700' : 'text-gray-700';
            
            const div = document.createElement('div');
            div.className = `flex justify-between ${colorTexto}`;
            div.innerHTML = `
                <span>${f.nombre} <span class="text-xs">(${f.origen})</span></span>
                <span class="font-medium">+${textoPrecio}</span>
            `;
            listaOps.appendChild(div);
        });
        
        if(opsArray.length === 0) {
            listaOps.innerHTML = '<p class="text-gray-400 text-center">Sin operaciones aún</p>';
        }
    }
}

// llamar a la app si esta despierta
db.collection('facturas').where('fecha', '==', HOY).onSnapshot(() => {
    if (!document.getElementById('factura1').classList.contains('hidden')) {
        recalcularCuadroOperaciones();
    }
}).catch(err => console.error("Error índice facturas:", err));

inicializarCaja();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').then(() => console.log('App lista')).catch((err) => console.log('Error SW:', err)); }