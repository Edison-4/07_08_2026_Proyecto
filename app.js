// 1. Importaciones actualizadas (Se agregan deleteDoc, updateDoc y getDoc)
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

// Variables globales para el modo Edición
let idCartillaEditando = null;
let idAutorEditando = null;

// 4. Inicializar Editor de Texto (Quill)
const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Escribe la frase aquí...',
    modules: { toolbar: [ [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }], [{ 'color': [] }, { 'background': [] }], ['bold', 'italic', 'underline'], [{ 'align': [] }], ['clean'] ] }
});

// -----------------------------------------------------------
// 5. LÓGICA DE LA VENTANA DE AUTENTICACIÓN
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
    
    if(tipo === 'login') {
        formLogin.classList.remove('hidden');
        authTitle.innerText = "Iniciar Sesión";
    } else if(tipo === 'register') {
        formRegister.classList.remove('hidden');
        authTitle.innerText = "Crear Cuenta";
    } else if(tipo === 'recover') {
        formRecover.classList.remove('hidden');
        authTitle.innerText = "Recuperar Contraseña";
    }
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
    } catch (error) {
        alert("Error al iniciar sesión. Verifica tu correo y contraseña.");
    }
});

const loginGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        await setDoc(doc(db, "usuarios", result.user.uid), {
            nombre: result.user.displayName || "Usuario Google",
            email: result.user.email,
            metodo: "Google"
        }, { merge: true }); 
        authModal.classList.add('hidden');
    } catch (error) {
        alert("El inicio de sesión fue cancelado.");
    }
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
        const user = userCredential.user;
        await setDoc(doc(db, "usuarios", user.uid), {
            nombre: nombre,
            apellido: apellido,
            celular: celular,
            email: email,
            fechaRegistro: new Date()
        });
        alert("¡Cuenta creada con éxito!");
        authModal.classList.add('hidden');
    } catch (error) {
        if(error.code === 'auth/email-already-in-use') alert("Este correo ya está registrado.");
        else alert("Error al registrar: " + error.message);
    }
});

document.getElementById('btn-recover').addEventListener('click', async () => {
    const email = document.getElementById('rec-email').value;
    if(!email) return alert("Por favor ingresa tu correo.");
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Si el correo existe, recibirás un enlace para restablecer tu contraseña.");
        mostrarFormulario('login');
    } catch (error) { alert("Error al enviar el correo."); }
});


// -----------------------------------------------------------
// 6. DETECCIÓN DE USUARIO
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
// 7. LÓGICA DE SOBRES Y CARTILLAS (Crear, Editar y Eliminar)
// -----------------------------------------------------------
document.getElementById('btn-add-author').addEventListener('click', async () => {
    const input = document.getElementById('author-name');
    if (!input.value.trim()) return alert('Escribe el nombre del autor.');
    try {
        await addDoc(collection(db, "autores"), { nombre: input.value.trim(), fechaCreacion: new Date() });
        input.value = ''; alert('Sobre creado exitosamente.');
    } catch (error) { alert('Error. Verifica permisos.'); }
});

// Guardar o Actualizar Cartilla
document.getElementById('btn-add-card').addEventListener('click', async () => {
    const authorId = document.getElementById('select-author').value;
    const fileInput = document.getElementById('card-image');
    const textHtml = quill.root.innerHTML;
    const plainText = quill.getText().trim();
    const btn = document.getElementById('btn-add-card');

    if (!authorId) return alert('Selecciona un autor.');
    if (plainText === '' && fileInput.files.length === 0) return alert('Agrega texto o imagen.');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando...';

    try {
        let imageUrl = null;
        // Si subió una foto nueva, la enviamos a Cloudinary
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) imageUrl = data.secure_url;
        }

        if (idCartillaEditando) {
            // MODO EDICIÓN: Actualizar existente
            let datosActualizados = { texto: plainText !== '' ? textHtml : '' };
            if (imageUrl) datosActualizados.imagen = imageUrl; // Solo actualiza imagen si subió una nueva
            
            await updateDoc(doc(db, `autores/${idAutorEditando}/cartillas/${idCartillaEditando}`), datosActualizados);
            alert('¡Cartilla actualizada con éxito!');
            
            // Salir del modo edición
            idCartillaEditando = null;
            idAutorEditando = null;
        } else {
            // MODO CREACIÓN: Guardar nueva
            await addDoc(collection(db, `autores/${authorId}/cartillas`), {
                texto: plainText !== '' ? textHtml : '', 
                imagen: imageUrl,
                fecha: new Date()
            });
            alert('¡Cartilla guardada!');
        }

        // Limpiar panel
        quill.root.innerHTML = ''; 
        fileInput.value = ''; 
        btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i>Guardar Cartilla';
        
    } catch (error) { 
        alert('Error al guardar/actualizar.'); 
        console.error(error);
    } 
    finally { 
        btn.disabled = false; 
    }
});

// Cargar Sobres visualmente
onSnapshot(query(collection(db, "autores"), orderBy("fechaCreacion", "asc")), (snapshot) => {
    const selectAuthor = document.getElementById('select-author');
    const grid = document.getElementById('envelopes-grid');
    selectAuthor.innerHTML = '<option value="">Selecciona un Autor...</option>';
    grid.innerHTML = '';

    snapshot.forEach((doc) => {
        const autor = doc.data();
        selectAuthor.innerHTML += `<option value="${doc.id}">${autor.nombre}</option>`;
        const envelopeDiv = document.createElement('div');
        envelopeDiv.className = "bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border-t-4 border-amber-400 transition-all cursor-pointer flex flex-col items-center justify-center h-48 transform hover:-translate-y-1";
        envelopeDiv.innerHTML = `<i class="fa-regular fa-envelope text-6xl text-slate-300 mb-3 group-hover:text-amber-500 transition-colors"></i><h3 class="text-lg font-bold text-slate-800 text-center font-serif">${autor.nombre}</h3><p class="text-xs text-slate-400 mt-2 uppercase tracking-widest">Abrir Sobre</p>`;
        envelopeDiv.addEventListener('click', () => abrirSobre(doc.id, autor.nombre));
        grid.appendChild(envelopeDiv);
    });
});

// Abrir Sobre y cargar botones de edición/eliminación si eres Admin
async function abrirSobre(autorId, autorNombre) {
    const modal = document.getElementById('modal-cards');
    const modalContent = document.getElementById('modal-content');
    document.getElementById('modal-author-name').textContent = autorNombre;
    modalContent.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500"></i></div>';
    modal.classList.remove('hidden');

    // Comprobar si el usuario actual es el Administrador
    const isAdmin = auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;

    try {
        const querySnapshot = await getDocs(query(collection(db, `autores/${autorId}/cartillas`), orderBy("fecha", "desc")));
        modalContent.innerHTML = '';
        if (querySnapshot.empty) { modalContent.innerHTML = '<p class="text-center py-10 text-gray-400">Sobre vacío.</p>'; return; }

        querySnapshot.forEach((docSnap) => {
            const cartillaId = docSnap.id;
            const cartilla = docSnap.data();
            
            let cardHtml = `<div class="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6 relative group">`;
            
            // Botones solo visibles para el admin
            if(isAdmin) {
                cardHtml += `
                <div class="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="btn-editar bg-blue-100 text-blue-600 w-8 h-8 rounded-full hover:bg-blue-200 transition flex items-center justify-center shadow" data-autor="${autorId}" data-cartilla="${cartillaId}" title="Editar">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </button>
                    <button class="btn-eliminar bg-red-100 text-red-600 w-8 h-8 rounded-full hover:bg-red-200 transition flex items-center justify-center shadow" data-autor="${autorId}" data-cartilla="${cartillaId}" title="Eliminar">
                        <i class="fa-solid fa-trash text-sm"></i>
                    </button>
                </div>`;
            }

            if (cartilla.imagen) cardHtml += `<img src="${cartilla.imagen}" class="w-full max-h-96 object-contain rounded-lg mb-4 bg-gray-100">`;
            if (cartilla.texto) cardHtml += `<div class="ql-editor p-0">${cartilla.texto}</div>`;
            cardHtml += `</div>`;
            
            modalContent.innerHTML += cardHtml;
        });

        // Eventos para Eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const aId = e.currentTarget.dataset.autor;
                const cId = e.currentTarget.dataset.cartilla;
                if(confirm('¿Estás seguro de que deseas eliminar esta cartilla de forma permanente?')) {
                    await deleteDoc(doc(db, `autores/${aId}/cartillas/${cId}`));
                    abrirSobre(autorId, autorNombre); // Recargar el sobre automáticamente
                }
            });
        });

        // Eventos para Editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const aId = e.currentTarget.dataset.autor;
                const cId = e.currentTarget.dataset.cartilla;
                
                // Obtener datos exactos de la BD
                const cSnap = await getDoc(doc(db, `autores/${aId}/cartillas/${cId}`));
                const cData = cSnap.data();
                
                // Preparar panel de edición
                idCartillaEditando = cId;
                idAutorEditando = aId;
                
                document.getElementById('select-author').value = aId;
                quill.root.innerHTML = cData.texto || '';
                
                document.getElementById('btn-add-card').innerHTML = '<i class="fa-solid fa-save mr-2"></i>Actualizar Cartilla';
                
                // Cerrar modal
                modal.classList.add('hidden');
                
                // Hacer scroll automático hacia arriba para ver el editor
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

    } catch (error) { 
        modalContent.innerHTML = '<p class="text-red-500 text-center py-10">Error al leer las cartillas.</p>'; 
        console.error(error);
    }
}

document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('modal-cards').classList.add('hidden');
});

// Enviar Sugerencias
document.getElementById('btn-send-suggestion').addEventListener('click', async () => {
    const text = document.getElementById('suggestion-text').value;
    if (!text.trim()) return alert('Por favor escribe algo primero.');
    try {
        await addDoc(collection(db, "sugerencias"), { texto: text, usuario: auth.currentUser.email, fecha: new Date() });
        document.getElementById('suggestion-text').value = ''; alert('Sugerencia enviada.');
    } catch (error) { alert('Error al enviar.'); }
});
  
