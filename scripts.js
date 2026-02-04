
/*
organizar ideas para el proyecto

(1) -> Necesito guardar y organizar los datos que saque de los botones de los html
OK (1.1) -> Aprender a almacenar datos en javascript
OK (1.2) -> Crear un arreglo de objetos y almacenar las variables de este
OK (1.3) -> el boton de facturar
OK (1.4) -> la tabla para ensenar las facturas
OK (1.5) -> pensar como voy a compartir los datos
OK (1.6) -> la funcion para exportar e importar datos
OK (1.6.1) -> exportar datos terminada
OK (1.6.2) -> funcion para juntar todos los json en uno
(1.6.2) -> importar datos cambiado por analizarlos y sacarle estadistica
*/
const botones = document.querySelectorAll('.boton');
const secciones = document.querySelectorAll('.seccion');

// crear el archivo donde se almacenan los datos y guardarlo por esta secion
let facturas = JSON.parse(localStorage.getItem('facturas')) || [];
let facturas_totales = JSON.parse(localStorage.getItem('facturas_totales')) || {};
let ganancia = JSON.parse(localStorage.getItem('ganancia'));
let piezas = JSON.parse(localStorage.getItem('piezas'));

//botones
function redirigir(event){
    const id = event.currentTarget.getAttribute('data-target');
    document.getElementById(id).style.display = 'block';
}

function regresar(event){
    secciones.forEach(seccion => {
    seccion.style.display = 'none';
    });
}

//seleccionar boton directamente y anadir la funcion de factura
document.getElementById('boton-facturar').addEventListener('click' , function(){
   
    nombre = document.getElementById('factura-nombre').value;
    talla = document.getElementById('factura-talla').value || 'sin precisar';
    cantidad = document.getElementById('factura-cantidad').value || 1;
    precio = document.getElementById('factura-precio').value;

    if(nombre == '' || precio == ''){
        alert("Falta la informacion del nombre o el precio");
        return;
    }
    
    let compra = {
        nombre:nombre,
        talla:talla,
        cantidad:cantidad,
        precio:precio
    };

    facturas.push(compra);
    ganancia += +precio, piezas += +cantidad;

    document.getElementById('ganancias').innerText = ganancia;
    document.getElementById('piezas').innerText = piezas;
    
    nombre = document.getElementById('factura-nombre').value = '';
    talla = document.getElementById('factura-talla').value = '';
    cantidad = document.getElementById('factura-cantidad').value = '';
    precio = document.getElementById('factura-precio').value = '';

    //guardar la compra 
    localStorage.setItem('facturas', JSON.stringify(facturas));
    localStorage.setItem('ganancia', ganancia);
    localStorage.setItem('piezas', piezas);
    actualizar_tabla();
    
});

//funcion terminar ventas
document.getElementById('terminar-ventas').addEventListener('click' , function(){
    const facturact = JSON.parse(localStorage.getItem('facturas')) || [];
    const elemen = JSON.stringify(facturact);
    const ventas = new Blob([elemen], {type: 'application/json'});
    const url = URL.createObjectURL(ventas);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ventas.json';
    link.click();
    facturas = [], ganancia = 0, piezas = 0;
    localStorage.setItem('facturas', JSON.stringify(([])));
    localStorage.setItem('ganancia', 0);
    localStorage.setItem('piezas', 0);
});
/*
que queremos para la funcion de estadistica

* primero que funcione para un solo dia
* que saque ganancias y piezas vendidas en el dia
*/
let factura_ganancia = 0, factura_piezas = 0, producto_popular = {}, producto_ganancia = {};
function resumir_ventas(dia){
    console.log(facturas_totales);
    let fact = Object.values(facturas_totales);
    
    for(let i = 0 ; i < fact.length ; i++){
        for(let y = 0 ; y < fact[i].length; y++){
            factura_ganancia += +fact[i][y].precio;
            factura_piezas += +fact[i][y].cantidad;
            if(!(producto_popular[fact[i][y].nombre])) producto_popular[fact[i][y].nombre] = 0;
            if(!(producto_ganancia[fact[i][y].nombre])) producto_ganancia[fact[i][y].nombre] = 0;
            producto_popular[fact[i][y].nombre] += +fact[i][y].cantidad;
            producto_ganancia[fact[i][y].nombre] += +fact[i][y].precio * +fact[i][y].cantidad;
            }
        if(dia === 'hoy') break;
        }
    
    const producto_popular_ordenado = Object.entries(producto_popular).sort((a, b) => a[1] - b[1]);
    const producto_ganancia_ordenado = Object.entries(producto_ganancia).sort((a, b) => a[1] - b[1]);
    document.getElementById('ventas-rapidas').innerHTML = `
    <div class='caja-contenedor'>
        <h1 class='caja-titulo'> Estadisticas Rapidas </h1>
        <div class='caja-stats'>
        
            <div class='carta-stats'>
                <div class='numeros-stats'>${factura_ganancia}</div>
                <div class='letras-stats'>Ganancias</div>
            </div>

            <div class='carta-stats'>
                <div class='numeros-stats'>${factura_piezas}</div>
                <div class='letras-stats'>Productos Vendidos</div>
            </div>

            <div class='carta-stats'>
                <div class='numeros-stats'>${producto_popular_ordenado[0][0]}</div>
                <div class='letras-stats'>Producto mas vendido</div>
            </div>

            <div class='carta-stats'>
                <div class='numeros-stats'>${producto_ganancia_ordenado[0][0]}</div>
                <div class='letras-stats'>Productos con mas ganancia</div>
            </div>

        </div>
    </div>
    `

    factura_ganancia = 0, factura_piezas = 0, producto_popular = {}, producto_ganancia = {};
}

//unir todos los archivos json seleccionados y guardarlos en local storage
document.getElementById('unir-json').addEventListener('click' , async function(){
    console.log('h');
    const archivos = document.getElementById('archivos-json').files;
    let facturas_tot = {};
    let fecha = new Date().toISOString().split('T')[0];
    let nuevo_archivo = [];
    for(let i = 0 ; i < archivos.length ; i++){
        const archivo = archivos[i];
        const text = await archivo.text();
        const datos = JSON.parse(text);
        nuevo_archivo = nuevo_archivo.concat(datos);
        }
    facturas_tot[fecha] = nuevo_archivo;
    localStorage.setItem('facturas_totales' , JSON.stringify(facturas_tot));
    console.log(localStorage.getItem('facturas_totales'));
});

// para cargar la informacion de la tabl, las piezas y las ganancias
document.getElementById('mostrar-datos').addEventListener('click' , function(){
    actualizar_tabla();
    document.getElementById('ganancias').innerText = 'Ganancias hoy: ' +  ganancia ;
    document.getElementById('piezas').innerText = 'Piezas hoy: ' + piezas;
});

function actualizar_tabla(){
    const tabla = document.getElementById('tabla-ventas');
    tabla.innerHTML = '';

    facturas.forEach(factura =>{
        const actual = document.createElement('tr');
        actual.innerHTML = `
        <td>${factura.precio}</td>
        <td>${factura.nombre}</td>
        <td>${factura.talla}</td>
        <td>${factura.cantidad}</td>
        `;
    tabla.appendChild(actual);
    });
}
// agregar alguna funcionalidad a los botones
botones.forEach(boton => {
    if(boton.getAttribute('data-target'))
    boton.addEventListener('click' , redirigir);
    
    else if(!(boton.getAttribute('id')))
    boton.addEventListener('click' , regresar);
});