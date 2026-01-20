
/*
organizar ideas para el proyecto

(1) -> Necesito guardar y organizar los datos que saque de los botones de los html
OK (1.1) -> Aprender a almacenar datos en javascript
OK (1.2) -> Crear un arreglo de objetos y almacenar las variables de este
*/
const botones = document.querySelectorAll('.boton');
const secciones = document.querySelectorAll('.seccion');

let facturas = JSON.parse(localStorage.getItem('facturas')) || [];

function redirigir(event){
    const id = event.currentTarget.getAttribute('data-target');
    document.getElementById(id).style.display = 'block';
}

function regresar(event){
    secciones.forEach(seccion => {
    seccion.style.display = 'none';
    });
}

/*function facturar(){
    nombre = document.getElementById('factura-nombre').value;
    talla = document.getElementById('factura-talla').value || 'sin precisar';
    cantidad = document.getElementById('factura-cantidad').value || 1;
    precio = document.getElementById('factura-precio').value;

    if(nombre == null || precio == null){
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
    guardar_compra();

    nombre = document.getElementById('factura-nombre').value = '';
    talla = document.getElementById('factura-talla').value = '';
    cantidad = document.getElementById('factura-cantidad').value = '';
    precio = document.getElementById('factura-precio').value = '';

}
 
 function guardar_compra(){
    localStorage.setItem('facturas', JSON.stringify(facturas));
 }*/


botones.forEach(boton => {
    if(boton.getAttribute('data-target'))
    boton.addEventListener('click' , redirigir);
    
    else
    boton.addEventListener('click' , regresar);
});