// 1. Importaciones
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// Variables globales de Edición
let idCartillaEditando = null;
let idAutorEditando = null;
let imagenActualEditando = null; 

let idAutorPanelEditando = null; // Para editar el autor en sí
let imagenAutorActualEditando = null;

// 4. Inicializar Editor de Texto (Quill)
const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Escribe la frase aquí...',
    modules: { toolbar: [ [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }], [{ 'color': [] }, { 'background': [] }], ['bold', 'italic', 'underline'], [{ 'align': [] }], ['clean'] ] }
});

// -----------------------------------------------------------
// 5. LÓGICA DE INDICADORES DE IMÁGENES (Cartilla y Autor)
// -----------------------------------------------------------

// A) Indicador de Imagen para Cartillas
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

// B) Indicador de Imagen para Autores
const fileInputAutor = document.getElementById('author-image');
const uploadPlaceholderAutor = document.getElementById('upload-placeholder-author');
const filePreviewAutor = document.getElementById('file-preview-author');
const fileNameDisplayAutor = document.getElementById('file-name-author');
const btnRemoveImageAutor = document.getElementById('btn-remove-image-author');
const btnCancelAuthor = document.getElementById('btn-cancel-author');

fileInputAutor.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileNameDisplayAutor.textContent = e.target.files[0].name;
        uploadPlaceholderAutor.classList.add('hidden');
        filePreviewAutor.classList.remove('hidden');
        filePreviewAutor.classList.add('flex');
        btnRemoveImageAutor.classList.remove('hidden');
    }
});

btnRemoveImageAutor.addEventListener('click', () => resetearCajaImagenAutor());

function resetearCajaImagenAutor() {
    fileInputAutor.value = ''; 
    imagenAutorActualEditando = null; 
    uploadPlaceholderAutor.classList.remove('hidden');
    filePreviewAutor.classList.add('hidden');
    filePreviewAutor.classList.remove('flex');
    btnRemoveImageAutor.classList.add('hidden');
}

// -----------------------------------------------------------
// 6. LÓGICA DE LA VENTANA DE AUTENTICACIÓN
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
    try { await signInWithEmailAndPassword(auth, email, pass); authModal.classList.add('hidden'); } 
    catch (error) { alert("Error al iniciar sesión. Verifica tu correo y contraseña."); }
});

const loginGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        await setDoc(doc(db, "usuarios", result.user.uid), { nombre: result.user.displayName, email: result.user.email, metodo: "Google" }, { merge: true }); 
        authModal.classList.add('hidden');
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
// 7. DETECCIÓN DE USUARIO
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
            adminPanel.classList.remove('hidden');
            guestSuggestions.classList.add('hidden');
        } else {
            adminPanel.classList.add('hidden');
            guestSuggestions.classList.remove('hidden');
        }
    } else {
        btnOpenAuth.classList.remove('hidden');
        btnLogout.classList.add('hidden');
        adminPanel.classList.add('hidden');
        guestSuggestions.classList.add('hidden');
    }
});
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// -----------------------------------------------------------
// 8. LÓGICA DE AUTORES Y CARTILLAS (Crear, Editar y Eliminar)
// -----------------------------------------------------------

// Cancelar edición de autor
btnCancelAuthor.addEventListener('click', () => {
    idAutorPanelEditando = null;
    document.getElementById('titulo-panel-autor').textContent = '1. Crear Nuevo Autor';
    document.getElementById('author-name').value = '';
    document.getElementById('btn-add-author').innerHTML = '<i class="fa-solid fa-plus mr-2"></i>Crear Autor';
    btnCancelAuthor.classList.add('hidden');
    resetearCajaImagenAutor();
});

// A) CREAR O ACTUALIZAR AUTOR
document.getElementById('btn-add-author').addEventListener('click', async () => {
    const input = document.getElementById('author-name');
    const btn = document.getElementById('btn-add-author');

    if (!input.value.trim()) return alert('Escribe el nombre del autor.');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando...';

    try {
        let imageUrl = null;
        if (fileInputAutor.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInputAutor.files[0]);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) imageUrl = data.secure_url;
        }

        if(idAutorPanelEditando) {
            // MODO EDICIÓN DE AUTOR
            let datosActualizados = { nombre: input.value.trim() };
            if (imageUrl) {
                datosActualizados.imagenAutor = imageUrl;
            } else {
                datosActualizados.imagenAutor = imagenAutorActualEditando;
            }
            await updateDoc(doc(db, `autores/${idAutorPanelEditando}`), datosActualizados);
            alert('Autor actualizado correctamente.');
            idAutorPanelEditando = null;
            document.getElementById('titulo-panel-autor').textContent = '1. Crear Nuevo Autor';
            btnCancelAuthor.classList.add('hidden');
        } else {
            // MODO CREACIÓN
            await addDoc(collection(db, "autores"), { 
                nombre: input.value.trim(), 
                imagenAutor: imageUrl,
                fechaCreacion: new Date() 
            });
            alert('Autor creado exitosamente.');
        }
        
        input.value = ''; 
        resetearCajaImagenAutor();
    } catch (error) { 
        alert('Error al guardar autor.'); 
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i>Crear Autor';
    }
});

// B) Guardar o Actualizar Cartilla
document.getElementById('btn-add-card').addEventListener('click', async () => {
    const authorId = document.getElementById('select-author').value;
    const textHtml = quill.root.innerHTML;
    const plainText = quill.getText().trim();
    const btn = document.getElementById('btn-add-card');

    if (!authorId) return alert('Selecciona un autor.');
    if (plainText === '' && fileInput.files.length === 0 && !imagenActualEditando) return alert('Debes agregar texto o imagen.');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando...';

    try {
        let imageUrl = null;
        if (fileInput.files.length > 0) {
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
        btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i>Guardar Cartilla';
        
    } catch (error) { alert('Error al guardar/actualizar.'); } 
    finally { btn.disabled = false; }
});

// Cargar Colección Visualmente
onSnapshot(query(collection(db, "autores"), orderBy("fechaCreacion", "asc")), (snapshot) => {
    const selectAuthor = document.getElementById('select-author');
    const grid = document.getElementById('envelopes-grid');
    selectAuthor.innerHTML = '<option value="">Selecciona un Autor...</option>';
    grid.innerHTML = '';

    const isAdmin = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;

    snapshot.forEach((docSnap) => {
        const autor = docSnap.data();
        selectAuthor.innerHTML += `<option value="${docSnap.id}">${autor.nombre}</option>`;
        
        const envelopeDiv = document.createElement('div');
        envelopeDiv.className = "bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border-t-4 border-amber-400 transition-all cursor-pointer flex flex-col items-center justify-center h-48 transform hover:-translate-y-1 relative group";
        
        let adminButtons = '';
        if (isAdmin) {
            adminButtons = `
            <div class="absolute top-3 right-3 flex space-x-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button class="btn-editar-autor bg-blue-100 text-blue-600 w-8 h-8 rounded-full active:bg-blue-300 hover:bg-blue-200 transition flex items-center justify-center shadow" data-autor="${docSnap.id}" title="Editar Autor">
                    <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button class="btn-eliminar-autor bg-red-100 text-red-600 w-8 h-8 rounded-full active:bg-red-300 hover:bg-red-200 transition flex items-center justify-center shadow" data-autor="${docSnap.id}" title="Eliminar Autor">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>`;
        }

        let iconoHtml = autor.imagenAutor
            ? `<img src="${autor.imagenAutor}" alt="${autor.nombre}" class="w-16 h-16 rounded-full object-cover mb-3 shadow-md border-2 border-amber-200">`
            : `<i class="fa-regular fa-envelope text-6xl text-slate-300 mb-3 group-hover:text-amber-500 transition-colors"></i>`;

        envelopeDiv.innerHTML = `
            ${adminButtons}
            ${iconoHtml}
            <h3 class="text-lg font-bold text-slate-800 text-center font-serif">${autor.nombre}</h3>
            <p class="text-xs text-slate-400 mt-2 uppercase tracking-widest">Abrir</p>
        `;
        
        envelopeDiv.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            abrirSobre(docSnap.id, autor.nombre);
        });
        
        grid.appendChild(envelopeDiv);
    });

    // Lógica para Eliminar Autor
    document.querySelectorAll('.btn-eliminar-autor').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const aId = e.currentTarget.dataset.autor;
            if(confirm('¿Seguro que deseas eliminar a este autor y TODAS sus cartillas? Esta acción es permanente.')) {
                try {
                    const cartillasSnap = await getDocs(collection(db, `autores/${aId}/cartillas`));
                    cartillasSnap.forEach(async (cDoc) => {
                        await deleteDoc(doc(db, `autores/${aId}/cartillas/${cDoc.id}`));
                    });
                    await deleteDoc(doc(db, `autores/${aId}`));
                    alert('Autor y cartillas eliminados.');
                } catch (error) {
                    alert('Error al eliminar autor.');
                }
            }
        });
    });

    // Lógica para Editar Autor
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
                document.getElementById('author-name').value = aData.nombre;
                btnCancelAuthor.classList.remove('hidden');
                
                if (imagenAutorActualEditando) {
                    fileNameDisplayAutor.textContent = "📷 Foto actual (Guardada)";
                    uploadPlaceholderAutor.classList.add('hidden');
                    filePreviewAutor.classList.remove('hidden');
                    filePreviewAutor.classList.add('flex');
                    btnRemoveImageAutor.classList.remove('hidden');
                } else {
                    resetearCajaImagenAutor();
                }

                document.getElementById('btn-add-author').innerHTML = '<i class="fa-solid fa-save mr-2"></i>Actualizar Autor';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                alert('Error al preparar la edición del autor.');
            }
        });
    });
});

// Abrir Sobre y habilitar Edición de Cartillas
async function abrirSobre(autorId, autorNombre) {
    const modal = document.getElementById('modal-cards');
    const modalContent = document.getElementById('modal-content');
    document.getElementById('modal-author-name').textContent = autorNombre;
    modalContent.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500"></i></div>';
    modal.classList.remove('hidden');

    const isAdmin = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;

    try {
        const querySnapshot = await getDocs(query(collection(db, `autores/${autorId}/cartillas`), orderBy("fecha", "desc")));
        modalContent.innerHTML = '';
        if (querySnapshot.empty) { modalContent.innerHTML = '<p class="text-center py-10 text-gray-400">Sobre vacío.</p>'; return; }

        querySnapshot.forEach((docSnap) => {
            const cartillaId = docSnap.id;
            const cartilla = docSnap.data();
            
            let cardHtml = `<div class="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6 relative pt-14">`; 
            
            if(isAdmin) {
                cardHtml += `
                <div class="absolute top-3 right-3 flex space-x-2">
                    <button class="btn-editar bg-blue-100 text-blue-600 w-9 h-9 rounded-full active:bg-blue-300 transition flex items-center justify-center shadow" data-autor="${autorId}" data-cartilla="${cartillaId}" title="Editar">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </button>
                    <button class="btn-eliminar bg-red-100 text-red-600 w-9 h-9 rounded-full active:bg-red-300 transition flex items-center justify-center shadow" data-autor="${autorId}" data-cartilla="${cartillaId}" title="Eliminar">
                        <i class="fa-solid fa-trash text-sm"></i>
                    </button>
                </div>`;
            }

            if (cartilla.imagen) cardHtml += `<img src="${cartilla.imagen}" class="w-full max-h-96 object-contain rounded-lg mb-4 bg-gray-100">`;
            if (cartilla.texto) cardHtml += `<div class="ql-editor p-0">${cartilla.texto}</div>`;
            cardHtml += `</div>`;
            
            modalContent.innerHTML += cardHtml;
        });

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
                
                document.getElementById('select-author').value = aId;
                quill.root.innerHTML = cData.texto || '';
                
                if (imagenActualEditando) {
                    fileNameDisplay.textContent = "📷 Foto actual (Guardada)";
                    uploadPlaceholder.classList.add('hidden');
                    filePreview.classList.remove('hidden');
                    filePreview.classList.add('flex');
                    btnRemoveImage.classList.remove('hidden');
                } else {
                    resetearCajaImagen();
                }

                document.getElementById('btn-add-card').innerHTML = '<i class="fa-solid fa-save mr-2"></i>Actualizar Cartilla';
                modal.classList.add('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    } catch (error) { modalContent.innerHTML = '<p class="text-red-500 text-center py-10">Error al leer las cartillas.</p>'; }
}
document.getElementById('btn-close-modal').addEventListener('click', () => document.getElementById('modal-cards').classList.add('hidden'));

// 9. Enviar Sugerencias
document.getElementById('btn-send-suggestion').addEventListener('click', async () => {
    const text = document.getElementById('suggestion-text').value;
    if (!text.trim()) return alert('Por favor escribe algo primero.');
    try {
        await addDoc(collection(db, "sugerencias"), { texto: text, usuario: auth.currentUser.email, fecha: new Date() });
        document.getElementById('suggestion-text').value = ''; alert('Sugerencia enviada.');
    } catch (error) { alert('Error al enviar.'); }
});