// 1. Nuevas Importaciones de Firebase (Añadimos funciones de autenticación por correo)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// Mostrar la ventana modal
document.getElementById('btn-open-auth').addEventListener('click', () => {
    authModal.classList.remove('hidden');
    mostrarFormulario('login');
});
// Cerrar la ventana modal
document.getElementById('btn-close-auth').addEventListener('click', () => authModal.classList.add('hidden'));

// Navegación entre los 3 formularios
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

// A) Iniciar Sesión con Correo
document.getElementById('btn-login-email').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    if(!email || !pass) return alert("Completa ambos campos.");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        authModal.classList.add('hidden'); // Cierra la ventana al tener éxito
    } catch (error) {
        alert("Error al iniciar sesión. Verifica tu correo y contraseña.");
    }
});

// B) Iniciar Sesión / Registrarse con Google (Sirve para ambos)
const loginGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        // Guardamos datos básicos por si es un usuario nuevo
        await setDoc(doc(db, "usuarios", result.user.uid), {
            nombre: result.user.displayName || "Usuario Google",
            email: result.user.email,
            metodo: "Google"
        }, { merge: true }); // merge: true evita borrar datos si ya existían
        
        authModal.classList.add('hidden');
    } catch (error) {
        alert("Error al usar Google. Puede estar bloqueado por tu navegador.");
    }
};
document.getElementById('btn-login-google').addEventListener('click', loginGoogle);
document.getElementById('btn-register-google').addEventListener('click', loginGoogle);

// C) Registro Completo con Correo
document.getElementById('btn-register-email').addEventListener('click', async () => {
    const nombre = document.getElementById('reg-nombre').value;
    const apellido = document.getElementById('reg-apellido').value;
    const celular = document.getElementById('reg-celular').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    if(!nombre || !email || !pass) return alert("Nombre, correo y contraseña son obligatorios.");
    if(pass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");

    try {
        // 1. Crea el usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // 2. Guarda los datos adicionales en Firestore
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

// D) Recuperar Contraseña
document.getElementById('btn-recover').addEventListener('click', async () => {
    const email = document.getElementById('rec-email').value;
    if(!email) return alert("Por favor ingresa tu correo.");
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Si el correo existe, recibirás un enlace para restablecer tu contraseña.");
        mostrarFormulario('login');
    } catch (error) {
        alert("Error al enviar el correo.");
    }
});


// -----------------------------------------------------------
// 6. DETECCIÓN DE USUARIO Y PERMISOS DEL PANEL
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
// 7. LÓGICA DE SOBRES Y CARTILLAS (Cloudinary y Firestore)
// -----------------------------------------------------------
document.getElementById('btn-add-author').addEventListener('click', async () => {
    const input = document.getElementById('author-name');
    if (!input.value.trim()) return alert('Escribe el nombre del autor.');
    try {
        await addDoc(collection(db, "autores"), { nombre: input.value.trim(), fechaCreacion: new Date() });
        input.value = ''; alert('Sobre creado exitosamente.');
    } catch (error) { alert('Error. Verifica permisos.'); }
});

document.getElementById('btn-add-card').addEventListener('click', async () => {
    const authorId = document.getElementById('select-author').value;
    const fileInput = document.getElementById('card-image');
    const textHtml = quill.root.innerHTML;
    const plainText = quill.getText().trim();
    const btn = document.getElementById('btn-add-card');

    if (!authorId) return alert('Selecciona un autor.');
    if (plainText === '' && fileInput.files.length === 0) return alert('Agrega texto o imagen.');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Guardando...';

    try {
        let imageUrl = null;
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) imageUrl = data.secure_url;
            else throw new Error("Error Cloudinary");
        }

        await addDoc(collection(db, `autores/${authorId}/cartillas`), {
            texto: plainText !== '' ? textHtml : '', 
            imagen: imageUrl,
            fecha: new Date()
        });

        quill.root.innerHTML = ''; fileInput.value = ''; alert('¡Cartilla guardada!');
    } catch (error) { alert('Error al guardar.'); } 
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i>Guardar Cartilla'; }
});

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

async function abrirSobre(autorId, autorNombre) {
    const modal = document.getElementById('modal-cards');
    const modalContent = document.getElementById('modal-content');
    document.getElementById('modal-author-name').textContent = autorNombre;
    modalContent.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500"></i></div>';
    modal.classList.remove('hidden');

    try {
        const querySnapshot = await getDocs(query(collection(db, `autores/${autorId}/cartillas`), orderBy("fecha", "desc")));
        modalContent.innerHTML = '';
        if (querySnapshot.empty) { modalContent.innerHTML = '<p class="text-center py-10 text-gray-400">Sobre vacío.</p>'; return; }

        querySnapshot.forEach((doc) => {
            const cartilla = doc.data();
            let cardHtml = `<div class="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">`;
            if (cartilla.imagen) cardHtml += `<img src="${cartilla.imagen}" class="w-full max-h-96 object-contain rounded-lg mb-4 bg-gray-100">`;
            if (cartilla.texto) cardHtml += `<div class="ql-editor p-0">${cartilla.texto}</div>`;
            cardHtml += `</div>`;
            modalContent.innerHTML += cardHtml;
        });
    } catch (error) { modalContent.innerHTML = '<p class="text-red-500 text-center py-10">Error al leer.</p>'; }
}
document.getElementById('btn-close-modal').addEventListener('click', () => document.getElementById('modal-cards').classList.add('hidden'));

document.getElementById('btn-send-suggestion').addEventListener('click', async () => {
    const text = document.getElementById('suggestion-text').value;
    if (!text.trim()) return alert('Por favor escribe algo primero.');
    try {
        await addDoc(collection(db, "sugerencias"), { texto: text, usuario: auth.currentUser.email, fecha: new Date() });
        document.getElementById('suggestion-text').value = ''; alert('Sugerencia enviada.');
    } catch (error) { alert('Error al enviar.'); }
});
