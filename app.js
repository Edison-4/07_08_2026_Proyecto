// 1. Importaciones 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 2. >>> PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE <<<
const firebaseConfig = {
  apiKey: "AIzaSyC2la2gH1E3alkvYI5_u_rXdQUqX4AY3pc",
  authDomain: "literatura-e82c6.firebaseapp.com",
  projectId: "literatura-e82c6",
  storageBucket: "literatura-e82c6.firebasestorage.app",
  messagingSenderId: "386815214685",
  appId: "1:386815214685:web:0e60afe88490730735b9b4"
};

// 3. >>> CONFIGURACIÓN DE CLOUDINARY Y PERMISOS <<<
const CLOUDINARY_CLOUD_NAME = "fr8ult62"; // Ej: "dxyz123ab"
const CLOUDINARY_UPLOAD_PRESET = "Literatura_preset"; // El nombre que le pusiste en el Paso 2
const ADMIN_EMAIL = "gregoryplaza4@gmail.com"; 

// Inicializar
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variables globales
let idCartillaEditando = null;
let idAutorEditando = null;
let imagenActualEditando = null; 

let idAutorPanelEditando = null; 
let imagenAutorActualEditando = null;

let sortableAutores = null;
let sortableCartillas = null;
let isReorderingAutores = false; 

let autoresMemoria = []; 

const getOrderValue = (docData, field) => {
    if (docData.orden !== undefined) return docData.orden;
    if (!docData[field]) return 0;
    if (typeof docData[field].toMillis === 'function') return docData[field].toMillis();
    if (typeof docData[field].getTime === 'function') return docData[field].getTime();
    return 0;
};

// 4. Inicializar Editor de Texto (Quill)
const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Escribe la frase aquí...',
    modules: { toolbar: [ [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }], [{ 'color': [] }, { 'background': [] }], ['bold', 'italic', 'underline'], [{ 'align': [] }], ['clean'] ] }
});

// -----------------------------------------------------------
// 5. LÓGICA DEL BUSCADOR DE AUTORES
// -----------------------------------------------------------
const searchInputVisual = document.getElementById('search-author-input');
const hiddenInputId = document.getElementById('select-author');
const dropdownList = document.getElementById('author-dropdown-list');

if (searchInputVisual && dropdownList) {
    searchInputVisual.addEventListener('click', () => {
        dropdownList.classList.remove('hidden');
        renderizarDropdown('');
    });

    searchInputVisual.addEventListener('input', (e) => {
        dropdownList.classList.remove('hidden');
        renderizarDropdown(e.target.value);
        if (hiddenInputId) hiddenInputId.value = ''; 
    });

    document.addEventListener('click', (e) => {
        if (!searchInputVisual.contains(e.target) && !dropdownList.contains(e.target)) {
            dropdownList.classList.add('hidden');
        }
    });
}

function renderizarDropdown(filtro = '') {
    if (!dropdownList) return;
    dropdownList.innerHTML = '';
    
    const filtrados = autoresMemoria.filter(autor => {
        const nombreAutor = autor.nombre || '';
        return nombreAutor.toLowerCase().includes(filtro.toLowerCase());
    });
    
    if (filtrados.length === 0) {
        dropdownList.innerHTML = '<div class="p-3 text-sm text-gray-500 text-center">No se encontraron autores</div>';
        return;
    }

    filtrados.forEach(autor => {
        const item = document.createElement('div');
        item.className = 'p-3 text-sm text-gray-700 hover:bg-amber-100 hover:text-amber-900 cursor-pointer border-b border-gray-100 last:border-0 font-medium transition-colors';
        item.textContent = autor.nombre || 'Autor sin nombre';
        
        item.addEventListener('click', () => {
            if (searchInputVisual) searchInputVisual.value = autor.nombre; 
            if (hiddenInputId) hiddenInputId.value = autor.id;     
            dropdownList.classList.add('hidden'); 
        });
        
        dropdownList.appendChild(item);
    });
}

// -----------------------------------------------------------
// 6. LÓGICA DE INDICADORES DE IMÁGENES
// -----------------------------------------------------------
const fileInput = document.getElementById('card-image');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const filePreview = document.getElementById('file-preview');
const fileNameDisplay = document.getElementById('file-name');
const btnRemoveImage = document.getElementById('btn-remove-image');

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileNameDisplay.textContent = e.target.files[0].name;
        uploadPlaceholder.classList.add('hidden');
        filePreview.classList.remove('hidden');
        filePreview.classList.add('flex');
        btnRemoveImage.classList.remove('hidden');
    }
});

btnRemoveImage.addEventListener('click', () => resetearCajaImagen());

function resetearCajaImagen() {
    fileInput.value = ''; 
    imagenActualEditando = null; 
    uploadPlaceholder.classList.remove('hidden');
    filePreview.classList.add('hidden');
    filePreview.classList.remove('flex');
    btnRemoveImage.classList.add('hidden');
}

const fileInputAutor = document.getElementById('author-image');
const uploadPlaceholderAutor = document.getElementById('upload-placeholder-author');
const filePreviewAutor = document.getElementById('file-preview-author');
const fileNameDisplayAutor = document.getElementById('file-name-author');
const btnRemoveImageAutor = document.getElementById('btn-remove-image-author');
const btnCancelAuthor = document.getElementById('btn-cancel-author');

if(fileInputAutor) {
    fileInputAutor.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplayAutor.textContent = e.target.files[0].name;
            uploadPlaceholderAutor.classList.add('hidden');
            filePreviewAutor.classList.remove('hidden');
            filePreviewAutor.classList.add('flex');
            btnRemoveImageAutor.classList.remove('hidden');
        }
    });
}

if(btnRemoveImageAutor) {
    btnRemoveImageAutor.addEventListener('click', () => resetearCajaImagenAutor());
}

function resetearCajaImagenAutor() {
    if(fileInputAutor) fileInputAutor.value = ''; 
    imagenAutorActualEditando = null; 
    if(uploadPlaceholderAutor) uploadPlaceholderAutor.classList.remove('hidden');
    if(filePreviewAutor) {
        filePreviewAutor.classList.add('hidden');
        filePreviewAutor.classList.remove('flex');
    }
    if(btnRemoveImageAutor) btnRemoveImageAutor.classList.add('hidden');
}

// -----------------------------------------------------------
// 7. LÓGICA DE LA VENTANA DE AUTENTICACIÓN
// -----------------------------------------------------------
const authModal = document.getElementById('auth-modal');
const formLogin = document.getElementById('form-login-section');
const formRegister = document.getElementById('form-register-section');
const formRecover = document.getElementById('form-recover-section');
const authTitle = document.getElementById('auth-title');

document.getElementById('btn-open-auth').addEventListener('click', () => {
    authModal.classList.remove('hidden');
    mostrarFormulario('login');
});
document.getElementById('btn-close-auth').addEventListener('click', () => authModal.classList.add('hidden'));

function mostrarFormulario(tipo) {
    formLogin.classList.add('hidden');
    formRegister.classList.add('hidden');
    formRecover.classList.add('hidden');
    if(tipo === 'login') { formLogin.classList.remove('hidden'); authTitle.innerText = "Iniciar Sesión"; } 
    else if(tipo === 'register') { formRegister.classList.remove('hidden'); authTitle.innerText = "Crear Cuenta"; } 
    else if(tipo === 'recover') { formRecover.classList.remove('hidden'); authTitle.innerText = "Recuperar Contraseña"; }
}

document.getElementById('link-to-register').addEventListener('click', () => mostrarFormulario('register'));
document.getElementById('link-to-recover').addEventListener('click', () => mostrarFormulario('recover'));
document.getElementById('link-back-login').addEventListener('click', () => mostrarFormulario('login'));
document.getElementById('link-back-login2').addEventListener('click', () => mostrarFormulario('login'));

document.getElementById('btn-login-email').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    if(!email || !pass) return alert("Completa ambos campos.");
    try { 
        await signInWithEmailAndPassword(auth, email, pass); 
        authModal.classList.add('hidden'); 
        window.location.reload(); 
    } 
    catch (error) { alert("Error al iniciar sesión. Verifica tu correo y contraseña."); }
});

const loginGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        await setDoc(doc(db, "usuarios", result.user.uid), { nombre: result.user.displayName, email: result.user.email, metodo: "Google" }, { merge: true }); 
        authModal.classList.add('hidden');
        window.location.reload(); 
    } catch (error) { alert("El inicio de sesión fue cancelado o bloqueado."); }
};
document.getElementById('btn-login-google').addEventListener('click', loginGoogle);
document.getElementById('btn-register-google').addEventListener('click', loginGoogle);

document.getElementById('btn-register-email').addEventListener('click', async () => {
    const nombre = document.getElementById('reg-nombre').value;
    const apellido = document.getElementById('reg-apellido').value;
    const celular = document.getElementById('reg-celular').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    if(!nombre || !email || !pass) return alert("Nombre, correo y contraseña son obligatorios.");
    if(pass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), { nombre: nombre, apellido: apellido, celular: celular, email: email, fechaRegistro: new Date() });
        alert("¡Cuenta creada con éxito!");
        authModal.classList.add('hidden');
    } catch (error) { alert("Error al registrar: " + error.message); }
});

document.getElementById('btn-recover').addEventListener('click', async () => {
    const email = document.getElementById('rec-email').value;
    if(!email) return alert("Por favor ingresa tu correo.");
    try { await sendPasswordResetEmail(auth, email); alert("Si el correo existe, recibirás un enlace."); mostrarFormulario('login'); } 
    catch (error) { alert("Error al enviar el correo."); }
});

// -----------------------------------------------------------
// 8. DETECCIÓN DE USUARIO
// -----------------------------------------------------------
onAuthStateChanged(auth, (user) => {
    const adminPanel = document.getElementById('admin-panel');
    const guestSuggestions = document.getElementById('guest-suggestions');
    const btnOpenAuth = document.getElementById('btn-open-auth');
    const btnLogout = document.getElementById('btn-logout');

    if (user) {
        btnOpenAuth.classList.add('hidden');
        btnLogout.classList.remove('hidden');
        if (user.email === ADMIN_EMAIL) {
            if(adminPanel) adminPanel.classList.remove('hidden');
            if(guestSuggestions) guestSuggestions.classList.add('hidden');
        } else {
            if(adminPanel) adminPanel.classList.add('hidden');
            if(guestSuggestions) guestSuggestions.classList.remove('hidden');
        }
    } else {
        btnOpenAuth.classList.remove('hidden');
        btnLogout.classList.add('hidden');
        if(adminPanel) adminPanel.classList.add('hidden');
        if(guestSuggestions) guestSuggestions.classList.add('hidden');
    }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.reload(); 
});

// -----------------------------------------------------------
// 9. LÓGICA DE AUTORES Y CARTILLAS
// -----------------------------------------------------------
if(btnCancelAuthor) {
    btnCancelAuthor.addEventListener('click', () => {
        idAutorPanelEditando = null;
        document.getElementById('titulo-panel-autor').textContent = '1. Crear Nuevo Autor';
        document.getElementById('author-name').value = '';
        document.getElementById('btn-add-author').innerHTML = '<i class="fa-solid fa-plus mr-2"></i>Crear Autor';
        btnCancelAuthor.classList.add('hidden');
        resetearCajaImagenAutor();
    });
}

document.getElementById('btn-add-author').addEventListener('click', async () => {
    const input = document.getElementById('author-name');
    const btn = document.getElementById('btn-add-author');

    if (!input.value.trim()) return alert('Escribe el nombre del autor.');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando...';

    try {
        let imageUrl = null;
        if (fileInputAutor && fileInputAutor.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInputAutor.files[0]);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) imageUrl = data.secure_url;
        }

        if(idAutorPanelEditando) {
            let datosActualizados = { nombre: input.value.trim() };
            if (imageUrl) { datosActualizados.imagenAutor = imageUrl; } 
            else { datosActualizados.imagenAutor = imagenAutorActualEditando; }
            
            await updateDoc(doc(db, `autores/${idAutorPanelEditando}`), datosActualizados);
            alert('Autor actualizado correctamente.');
            idAutorPanelEditando = null;
            document.getElementById('titulo-panel-autor').textContent = '1. Crear Nuevo Autor';
            if(btnCancelAuthor) btnCancelAuthor.classList.add('hidden');
        } else {
            await addDoc(collection(db, "autores"), { nombre: input.value.trim(), imagenAutor: imageUrl, fechaCreacion: new Date() });
            alert('Autor creado exitosamente.');
        }
        
        input.value = ''; 
        resetearCajaImagenAutor();
    } catch (error) { alert('Error al guardar autor.'); } 
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i>Crear Autor'; }
});

document.getElementById('btn-add-card').addEventListener('click', async () => {
    const authorId = hiddenInputId ? hiddenInputId.value : (document.getElementById('select-author') ? document.getElementById('select-author').value : null);
    const textHtml = quill.root.innerHTML;
    const plainText = quill.getText().trim();
    const btn = document.getElementById('btn-add-card');

    if (!authorId) return alert('Por favor, busca y selecciona un autor válido de la lista.');
    if (plainText === '' && (!fileInput || fileInput.files.length === 0) && !imagenActualEditando) return alert('Debes agregar texto o imagen.');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando...';

    try {
        let imageUrl = null;
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) imageUrl = data.secure_url;
        }

        if (idCartillaEditando) {
            let datosActualizados = { texto: plainText !== '' ? textHtml : '' };
            if (imageUrl) { datosActualizados.imagen = imageUrl; } 
            else { datosActualizados.imagen = imagenActualEditando; }
            
            await updateDoc(doc(db, `autores/${idAutorEditando}/cartillas/${idCartillaEditando}`), datosActualizados);
            alert('¡Cartilla actualizada con éxito!');
            idCartillaEditando = null;
            idAutorEditando = null;
        } else {
            await addDoc(collection(db, `autores/${authorId}/cartillas`), { texto: plainText !== '' ? textHtml : '', imagen: imageUrl, fecha: new Date() });
            alert('¡Cartilla guardada!');
        }

        quill.root.innerHTML = ''; 
        resetearCajaImagen(); 
        
        if (searchInputVisual) searchInputVisual.value = '';
        if (hiddenInputId) hiddenInputId.value = '';

        btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i>Guardar Cartilla';
        
    } catch (error) { alert('Error al guardar/actualizar.'); } 
    finally { btn.disabled = false; }
});


// DIBUJAR AUTORES
onSnapshot(collection(db, "autores"), (snapshot) => {
    if (isReorderingAutores) return; 

    const grid = document.getElementById('envelopes-grid');
    if (!grid) return; 
    grid.innerHTML = '';

    const isAdmin = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;
    
    let autores = [];
    snapshot.forEach((docSnap) => { autores.push({ id: docSnap.id, ...docSnap.data() }); });

    autores.sort((a, b) => {
        const ordenA = getOrderValue(a, 'fechaCreacion');
        const ordenB = getOrderValue(b, 'fechaCreacion');
        return ordenA - ordenB;
    });

    autoresMemoria = autores;

    autores.forEach((autor) => {
        const envelopeDiv = document.createElement('div');
        envelopeDiv.className = "bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border-t-4 border-amber-400 transition-all cursor-pointer flex flex-col items-center justify-center h-48 transform hover:-translate-y-1 relative group";
        
        envelopeDiv.setAttribute('data-id', autor.id); 
        
        let adminButtons = '';
        if (isAdmin) {
            adminButtons = `
            <div class="drag-handle-autor absolute top-3 left-3 w-8 h-8 flex items-center justify-center bg-slate-800 text-amber-400 rounded-full shadow-md cursor-grab active:cursor-grabbing z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <i class="fa-solid fa-grip-vertical text-xs"></i>
            </div>
            <div class="absolute top-3 right-3 flex space-x-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button class="btn-editar-autor bg-blue-100 text-blue-600 w-8 h-8 rounded-full active:bg-blue-300 hover:bg-blue-200 transition flex items-center justify-center shadow" data-autor="${autor.id}" title="Editar Autor">
                    <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button class="btn-eliminar-autor bg-red-100 text-red-600 w-8 h-8 rounded-full active:bg-red-300 hover:bg-red-200 transition flex items-center justify-center shadow" data-autor="${autor.id}" title="Eliminar Autor">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>`;
        }

        let nombreVisual = autor.nombre || 'Autor';
        let iconoHtml = autor.imagenAutor
            ? `<img src="${autor.imagenAutor}" alt="${nombreVisual}" class="w-16 h-16 rounded-full object-cover mb-3 shadow-md border-2 border-amber-200 pointer-events-none">`
            : `<i class="fa-regular fa-envelope text-6xl text-slate-300 mb-3 group-hover:text-amber-500 transition-colors pointer-events-none"></i>`;

        envelopeDiv.innerHTML = `
            ${adminButtons}
            ${iconoHtml}
            <h3 class="text-lg font-bold text-slate-800 text-center font-serif pointer-events-none">${nombreVisual}</h3>
            <p class="text-xs text-slate-400 mt-2 uppercase tracking-widest pointer-events-none">Abrir</p>
        `;
        
        envelopeDiv.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.drag-handle-autor')) return;
            abrirSobre(autor.id, nombreVisual);
        });
        
        grid.appendChild(envelopeDiv);
    });

    if (isAdmin && typeof Sortable !== 'undefined') {
        if (sortableAutores) { sortableAutores.destroy(); }
        sortableAutores = new Sortable(grid, {
            animation: 150,
            handle: '.drag-handle-autor', 
            ghostClass: 'sortable-ghost',
            onStart: function () { isReorderingAutores = true; },
            onEnd: function () {
                setTimeout(async () => {
                    isReorderingAutores = false; 
                    const authorElements = grid.querySelectorAll('div[data-id]');
                    const batch = writeBatch(db); 
                    
                    authorElements.forEach((el, index) => {
                        const aId = el.getAttribute('data-id');
                        batch.update(doc(db, `autores/${aId}`), { orden: index });
                    });
                    try { await batch.commit(); } catch (error) { console.error(error); }
                }, 300);
            }
        });
    }

    document.querySelectorAll('.btn-eliminar-autor').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const aId = e.currentTarget.dataset.autor;
            if(confirm('¿Seguro que deseas eliminar a este autor y TODAS sus cartillas?')) {
                try {
                    const cartillasSnap = await getDocs(collection(db, `autores/${aId}/cartillas`));
                    cartillasSnap.forEach(async (cDoc) => { await deleteDoc(doc(db, `autores/${aId}/cartillas/${cDoc.id}`)); });
                    await deleteDoc(doc(db, `autores/${aId}`));
                    alert('Autor y cartillas eliminados.');
                } catch (error) { alert('Error al eliminar autor.'); }
            }
        });
    });

    document.querySelectorAll('.btn-editar-autor').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const aId = e.currentTarget.dataset.autor;
            try {
                const aSnap = await getDoc(doc(db, `autores/${aId}`));
                const aData = aSnap.data();
                
                idAutorPanelEditando = aId;
                imagenAutorActualEditando = aData.imagenAutor || null;
                
                document.getElementById('titulo-panel-autor').textContent = '1. Editando Autor';
                document.getElementById('author-name').value = aData.nombre || '';
                if(btnCancelAuthor) btnCancelAuthor.classList.remove('hidden');
                
                if (imagenAutorActualEditando && fileNameDisplayAutor) {
                    fileNameDisplayAutor.textContent = "📷 Foto actual (Guardada)";
                    if(uploadPlaceholderAutor) uploadPlaceholderAutor.classList.add('hidden');
                    if(filePreviewAutor) {
                        filePreviewAutor.classList.remove('hidden');
                        filePreviewAutor.classList.add('flex');
                    }
                    if(btnRemoveImageAutor) btnRemoveImageAutor.classList.remove('hidden');
                } else { resetearCajaImagenAutor(); }

                document.getElementById('btn-add-author').innerHTML = '<i class="fa-solid fa-save mr-2"></i>Actualizar Autor';
                
                if(searchInputVisual) {
                    searchInputVisual.value = aData.nombre || '';
                }
                if(hiddenInputId) hiddenInputId.value = aId;

                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) { alert('Error al editar autor.'); }
        });
    });
});

// ====================================================================
// MAGIA: FUNCIÓN PARA GENERAR EL CLON PERFECTO (Basado en tu dibujo)
// ====================================================================
async function generarImagenCartilla(cId, autorNombre, esCompartir, btnElem) {
    const originalHtml = btnElem.innerHTML;
    btnElem.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>' + (esCompartir ? 'Preparando...' : 'Generando...');
    btnElem.disabled = true;

    try {
        const containerOriginal = document.querySelector(`.cartilla-container[data-id="${cId}"]`);
        const imgElement = containerOriginal.querySelector('img');
        const textElement = containerOriginal.querySelector('.ql-editor');

        // Crear el clon invisible en el fondo con estructura perfecta (420px de ancho fijo)
        const clon = document.createElement('div');
        clon.style.position = 'absolute';
        clon.style.left = '-9999px'; 
        clon.style.top = '0';
        clon.style.width = '420px'; 
        clon.style.backgroundColor = '#ffffff';
        clon.style.borderRadius = '24px';
        clon.style.padding = '32px'; 
        clon.style.display = 'flex';
        clon.style.flexDirection = 'column';
        clon.style.alignItems = 'center';
        clon.style.fontFamily = 'system-ui, -apple-system, sans-serif'; 
        
        let contenidoHtml = '';
        if (imgElement) {
            contenidoHtml += `<img src="${imgElement.src}" crossorigin="anonymous" style="width: 100%; border-radius: 12px; margin-bottom: 24px; object-fit: contain; max-height: 350px;">`;
        }
        if (textElement) {
            // Forzamos un tamaño de letra más pequeño (15px) y un excelente centrado e interlineado
            contenidoHtml += `<div style="text-align: center; font-size: 15px; line-height: 1.8; color: #1f2937; width: 100%;">
                ${textElement.innerHTML}
            </div>`;
        }
        
        clon.innerHTML = contenidoHtml;
        
        // Estilizar perfectamente los fondos de texto amarillos que pones en el editor
        const estilosQuill = clon.querySelectorAll('span[style*="background-color"]');
        estilosQuill.forEach(el => {
            el.style.padding = '2px 6px';
            el.style.borderRadius = '4px';
            el.style.boxDecorationBreak = 'clone';
        });

        document.body.appendChild(clon);

        // Darle 150ms al navegador para que dibuje el clon invisible correctamente
        await new Promise(r => setTimeout(r, 150));

        const canvas = await html2canvas(clon, {
            useCORS: true,
            backgroundColor: null, // Descarga la imagen con esquinas redondas y fondo transparente
            scale: 2 // Escala doble para máxima calidad en celulares
        });

        document.body.removeChild(clon); 

        // Descargar o Compartir
        if (esCompartir) {
            canvas.toBlob(async (blob) => {
                const file = new File([blob], `Literatura_${autorNombre.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Literatura',
                        text: `Mira esta increíble frase de ${autorNombre} en mi Colección.`,
                    });
                } else {
                    alert("Tu dispositivo no soporta compartir imágenes de forma directa. Por favor, usa el botón de Descargar.");
                }
            }, 'image/png');
        } else {
            const link = document.createElement('a');
            link.download = `Literatura_${autorNombre.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

    } catch (error) {
        console.error("Error al procesar la imagen:", error);
        alert("No se pudo procesar la cartilla. Intenta de nuevo.");
    } finally {
        btnElem.innerHTML = originalHtml;
        btnElem.disabled = false;
    }
}


async function abrirSobre(autorId, autorNombre) {
    const modal = document.getElementById('modal-cards');
    const modalContent = document.getElementById('modal-content');
    
    const modalInstructions = document.getElementById('modal-instructions');
    if (modalInstructions) {
        modalInstructions.innerHTML = '<i class="fa-solid fa-hand-pointer mr-1"></i>Usa el botón de puntos en la esquina para ordenar';
    }

    document.getElementById('modal-author-name').textContent = autorNombre;
    modalContent.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500"></i></div>';
    modal.classList.remove('hidden');

    const isAdmin = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;
    if(isAdmin && modalInstructions) { modalInstructions.classList.remove('hidden'); } 
    else if (modalInstructions) { modalInstructions.classList.add('hidden'); }

    try {
        const querySnapshot = await getDocs(collection(db, `autores/${autorId}/cartillas`));
        modalContent.innerHTML = '';
        if (querySnapshot.empty) { modalContent.innerHTML = '<p class="text-center py-10 text-gray-400">Sobre vacío.</p>'; return; }

        let cartillas = [];
        querySnapshot.forEach(docSnap => cartillas.push({ id: docSnap.id, ...docSnap.data() }));

        cartillas.sort((a, b) => {
            const ordenA = getOrderValue(a, 'fecha');
            const ordenB = getOrderValue(b, 'fecha');
            return ordenA - ordenB;
        });

        cartillas.forEach((cartilla) => {
            const cartillaId = cartilla.id;
            
            // UI Estándar
            let cardHtml = `<div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-8 relative pt-14 cartilla-container transition-all" data-id="${cartillaId}">`; 
            
            if(isAdmin) {
                cardHtml += `
                <div class="admin-buttons drag-handle absolute top-4 left-4 w-9 h-9 flex items-center justify-center bg-slate-800 text-amber-400 rounded-full shadow-sm cursor-grab active:cursor-grabbing z-20">
                    <i class="fa-solid fa-grip-vertical text-sm"></i>
                </div>
                <div class="admin-buttons absolute top-4 right-4 flex space-x-2 z-20">
                    <button class="btn-editar bg-blue-50 text-blue-600 w-9 h-9 rounded-full hover:bg-blue-200 transition flex items-center justify-center shadow-sm" data-autor="${autorId}" data-cartilla="${cartillaId}" title="Editar">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </button>
                    <button class="btn-eliminar bg-red-50 text-red-600 w-9 h-9 rounded-full hover:bg-red-200 transition flex items-center justify-center shadow-sm" data-autor="${autorId}" data-cartilla="${cartillaId}" title="Eliminar">
                        <i class="fa-solid fa-trash text-sm"></i>
                    </button>
                </div>`;
            }
            
            if (cartilla.imagen) cardHtml += `<img src="${cartilla.imagen}" crossorigin="anonymous" class="w-full max-h-[30rem] object-contain rounded-xl mb-4 bg-gray-50 pointer-events-none">`;
            if (cartilla.texto) cardHtml += `<div class="ql-editor p-0 w-full text-center md:text-lg">${cartilla.texto}</div>`;
            
            // Botones de acción públicos
            cardHtml += `
            <div class="action-buttons flex justify-center space-x-3 mt-6 border-t border-gray-100 pt-5">
                <button class="btn-descargar flex items-center bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition shadow-sm" data-id="${cartillaId}">
                    <i class="fa-solid fa-download mr-2"></i>Descargar
                </button>
                <button class="btn-compartir flex items-center bg-amber-100 text-amber-800 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-200 transition shadow-sm" data-id="${cartillaId}">
                    <i class="fa-solid fa-share-nodes mr-2"></i>Compartir
                </button>
            </div>`;

            cardHtml += `</div>`;
            
            modalContent.innerHTML += cardHtml;
        });

        // Activamos las nuevas funciones de Generar Imagen
        document.querySelectorAll('.btn-descargar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cId = e.currentTarget.dataset.id;
                generarImagenCartilla(cId, autorNombre, false, e.currentTarget);
            });
        });

        document.querySelectorAll('.btn-compartir').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cId = e.currentTarget.dataset.id;
                generarImagenCartilla(cId, autorNombre, true, e.currentTarget);
            });
        });

        if (isAdmin && typeof Sortable !== 'undefined') {
            if (sortableCartillas) { sortableCartillas.destroy(); }
            sortableCartillas = new Sortable(modalContent, {
                animation: 150,
                handle: '.drag-handle', 
                ghostClass: 'sortable-ghost',
                onEnd: async function () {
                    const cardElements = modalContent.querySelectorAll('.cartilla-container');
                    const batch = writeBatch(db); 
                    
                    cardElements.forEach((el, index) => {
                        const cId = el.getAttribute('data-id');
                        batch.update(doc(db, `autores/${autorId}/cartillas/${cId}`), { orden: index });
                    });
                    try { await batch.commit(); } catch (error) { console.error(error); }
                }
            });
        }

        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const aId = e.currentTarget.dataset.autor;
                const cId = e.currentTarget.dataset.cartilla;
                if(confirm('¿Estás seguro de que deseas eliminar esta cartilla de forma permanente?')) {
                    await deleteDoc(doc(db, `autores/${aId}/cartillas/${cId}`));
                    abrirSobre(autorId, autorNombre); 
                }
            });
        });

        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const aId = e.currentTarget.dataset.autor;
                const cId = e.currentTarget.dataset.cartilla;
                const cSnap = await getDoc(doc(db, `autores/${aId}/cartillas/${cId}`));
                const cData = cSnap.data();
                
                idCartillaEditando = cId;
                idAutorEditando = aId;
                imagenActualEditando = cData.imagen || null;
                
                if(searchInputVisual) {
                    searchInputVisual.value = autorNombre;
                    renderizarDropdown(autorNombre);
                }
                if(hiddenInputId) hiddenInputId.value = aId;

                quill.root.innerHTML = cData.texto || '';
                
                if (imagenActualEditando) {
                    fileNameDisplay.textContent = "📷 Foto actual (Guardada)";
                    uploadPlaceholder.classList.add('hidden');
                    filePreview.classList.remove('hidden');
                    filePreview.classList.add('flex');
                    btnRemoveImage.classList.remove('hidden');
                } else { resetearCajaImagen(); }

                document.getElementById('btn-add-card').innerHTML = '<i class="fa-solid fa-save mr-2"></i>Actualizar Cartilla';
                modal.classList.add('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    } catch (error) { modalContent.innerHTML = '<p class="text-red-500 text-center py-10">Error al leer las cartillas.</p>'; }
}
document.getElementById('btn-close-modal').addEventListener('click', () => document.getElementById('modal-cards').classList.add('hidden'));

// 10. Enviar y LEER Sugerencias
document.getElementById('btn-send-suggestion').addEventListener('click', async () => {
    const text = document.getElementById('suggestion-text').value;
    if (!text.trim()) return alert('Por favor escribe algo primero.');
    try {
        await addDoc(collection(db, "sugerencias"), { texto: text, usuario: auth.currentUser ? auth.currentUser.email : 'Anónimo', fecha: new Date() });
        document.getElementById('suggestion-text').value = ''; alert('¡Sugerencia enviada!');
    } catch (error) { alert('Error al enviar la sugerencia.'); }
});

document.getElementById('btn-open-suggestions').addEventListener('click', async () => {
    const modalSug = document.getElementById('modal-suggestions');
    const contentSug = document.getElementById('suggestions-content');
    modalSug.classList.remove('hidden');
    contentSug.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-500"></i></div>';

    try {
        const querySnapshot = await getDocs(query(collection(db, "sugerencias"), orderBy("fecha", "desc")));
        contentSug.innerHTML = '';
        if (querySnapshot.empty) {
            contentSug.innerHTML = '<p class="text-center py-10 text-gray-400">El buzón está vacío por ahora.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const sug = docSnap.data();
            const fechaString = sug.fecha ? sug.fecha.toDate().toLocaleDateString() : 'Fecha desconocida';
            
            contentSug.innerHTML += `
                <div class="bg-white p-5 rounded-xl shadow border border-gray-100 text-left relative">
                    <button class="btn-eliminar-sugerencia absolute top-4 right-4 bg-red-100 text-red-600 w-8 h-8 rounded-full active:bg-red-300 hover:bg-red-200 transition flex items-center justify-center shadow" data-id="${docSnap.id}" title="Eliminar Sugerencia">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                    <div class="flex justify-between items-start mb-3 border-b border-gray-100 pb-2 pr-10">
                        <span class="text-sm font-bold text-slate-700 truncate"><i class="fa-solid fa-user text-indigo-400 mr-2"></i>${sug.usuario || 'Anónimo'}</span>
                        <span class="text-xs text-gray-400 whitespace-nowrap ml-2"><i class="fa-regular fa-clock mr-1"></i>${fechaString}</span>
                    </div>
                    <p class="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">${sug.texto}</p>
                </div>
            `;
        });

        document.querySelectorAll('.btn-eliminar-sugerencia').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const sId = e.currentTarget.dataset.id;
                if(confirm('¿Estás seguro de que deseas eliminar esta sugerencia?')) {
                    try {
                        await deleteDoc(doc(db, `sugerencias/${sId}`));
                        document.getElementById('btn-open-suggestions').click(); 
                    } catch (error) {
                        alert('Error al eliminar la sugerencia.');
                    }
                }
            });
        });

    } catch (error) {
        contentSug.innerHTML = '<p class="text-red-500 text-center py-10">Error al leer las sugerencias.</p>';
    }
});

document.getElementById('btn-close-suggestions').addEventListener('click', () => {
    document.getElementById('modal-suggestions').classList.add('hidden');
});

