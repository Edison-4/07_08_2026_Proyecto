// 1. Importaciones de Firebase (Ya no importamos Storage)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 4. Inicializar Editor de Texto (Quill)
const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Escribe la frase aquí...',
    modules: {
        toolbar: [
            [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
            [{ 'color': [] }, { 'background': [] }],
            ['bold', 'italic', 'underline'],
            [{ 'align': [] }],
            ['clean']
        ]
    }
});

// 5. Autenticación
onAuthStateChanged(auth, (user) => {
    const adminPanel = document.getElementById('admin-panel');
    const guestSuggestions = document.getElementById('guest-suggestions');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');

    if (user) {
        btnLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');

        if (user.email === ADMIN_EMAIL) {
            adminPanel.classList.remove('hidden');
            guestSuggestions.classList.add('hidden');
        } else {
            adminPanel.classList.add('hidden');
            guestSuggestions.classList.remove('hidden');
        }
    } else {
        btnLogin.classList.remove('hidden');
        btnLogout.classList.add('hidden');
        adminPanel.classList.add('hidden');
        guestSuggestions.classList.add('hidden');
    }
});

document.getElementById('btn-login').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()));
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// 6. Guardar Nuevo Autor
document.getElementById('btn-add-author').addEventListener('click', async () => {
    const input = document.getElementById('author-name');
    if (!input.value.trim()) return alert('Escribe el nombre del autor.');

    try {
        await addDoc(collection(db, "autores"), { nombre: input.value.trim(), fechaCreacion: new Date() });
        input.value = '';
        alert('Sobre creado exitosamente.');
    } catch (error) {
        alert('Error al crear autor. Verifica que iniciaste sesión como Administrador.');
    }
});

// 7. Guardar Cartilla (Ahora con Cloudinary)
document.getElementById('btn-add-card').addEventListener('click', async () => {
    const authorId = document.getElementById('select-author').value;
    const fileInput = document.getElementById('card-image');
    const textHtml = quill.root.innerHTML;
    const plainText = quill.getText().trim();
    const btn = document.getElementById('btn-add-card');

    if (!authorId) return alert('Selecciona un autor de la lista.');
    if (plainText === '' && fileInput.files.length === 0) return alert('Debes agregar texto o subir una imagen.');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Guardando...';

    try {
        let imageUrl = null;
        
        // Subir a Cloudinary si hay imagen
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            
            const response = await fetch(cloudinaryUrl, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.secure_url) {
                imageUrl = data.secure_url;
            } else {
                throw new Error("Error subiendo la imagen a Cloudinary");
            }
        }

        // Guardar datos en Firestore usando la URL de Cloudinary
        await addDoc(collection(db, `autores/${authorId}/cartillas`), {
            texto: plainText !== '' ? textHtml : '', 
            imagen: imageUrl,
            fecha: new Date()
        });

        quill.root.innerHTML = '';
        fileInput.value = '';
        alert('¡Cartilla guardada y agregada al sobre!');
    } catch (error) {
        console.error(error);
        alert('Error al guardar. Verifica tu conexión.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i>Guardar Cartilla';
    }
});

// 8. Cargar Sobres en Tiempo Real
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
        envelopeDiv.innerHTML = `
            <i class="fa-regular fa-envelope text-6xl text-slate-300 mb-3 group-hover:text-amber-500 transition-colors"></i>
            <h3 class="text-lg font-bold text-slate-800 text-center font-serif">${autor.nombre}</h3>
            <p class="text-xs text-slate-400 mt-2 uppercase tracking-widest">Abrir Sobre</p>
        `;
        
        envelopeDiv.addEventListener('click', () => abrirSobre(doc.id, autor.nombre));
        grid.appendChild(envelopeDiv);
    });
});

// 9. Abrir Sobre y Ver Cartillas
async function abrirSobre(autorId, autorNombre) {
    const modal = document.getElementById('modal-cards');
    const modalTitle = document.getElementById('modal-author-name');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = autorNombre;
    modalContent.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500"></i><p class="mt-2 text-gray-500">Sacando cartillas del sobre...</p></div>';
    modal.classList.remove('hidden');

    try {
        const cartillasRef = collection(db, `autores/${autorId}/cartillas`);
        const q = query(cartillasRef, orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(q);

        modalContent.innerHTML = '';

        if (querySnapshot.empty) {
            modalContent.innerHTML = '<div class="text-center py-10 text-gray-400"><i class="fa-solid fa-wind text-4xl mb-3"></i><p>Aún no hay cartillas en este sobre.</p></div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const cartilla = doc.data();
            let cardHtml = `<div class="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">`;
            
            if (cartilla.imagen) {
                cardHtml += `<img src="${cartilla.imagen}" alt="Cartilla" class="w-full max-h-96 object-contain rounded-lg mb-4 bg-gray-100">`;
            }
            if (cartilla.texto) {
                cardHtml += `<div class="ql-editor p-0">${cartilla.texto}</div>`;
            }
            
            cardHtml += `</div>`;
            modalContent.innerHTML += cardHtml;
        });

    } catch (error) {
        console.error(error);
        modalContent.innerHTML = '<p class="text-red-500 text-center py-10">Hubo un error al leer las cartillas.</p>';
    }
}

document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('modal-cards').classList.add('hidden');
});

// 10. Enviar Sugerencias
document.getElementById('btn-send-suggestion').addEventListener('click', async () => {
    const text = document.getElementById('suggestion-text').value;
    if (!text.trim()) return alert('Por favor escribe algo primero.');

    try {
        await addDoc(collection(db, "sugerencias"), {
            texto: text,
            usuario: auth.currentUser.email,
            fecha: new Date()
        });
        document.getElementById('suggestion-text').value = '';
        alert('¡Gracias! La sugerencia ha sido enviada al administrador.');
    } catch (error) {
        alert('Error al enviar la sugerencia. Asegúrate de estar registrado.');
    }
});
