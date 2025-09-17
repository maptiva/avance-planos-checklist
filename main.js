// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteField, deleteDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD98wjzInlHCIQ5urqlZAVpfUryFeJa7Qo",
  authDomain: "app-agrim-willy.firebaseapp.com",
  projectId: "app-agrim-willy",
  storageBucket: "app-agrim-willy.firebasestorage.app",
  messagingSenderId: "62046330391",
  appId: "1:62046330391:web:b5717786af64885a84c652"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentClientId = null;
let debounceTimer;

const clientListContainer = document.getElementById('client-list-container');
const clientListView = document.getElementById("client-list-view");
const clientDetailView = document.getElementById("client-detail-view");
const backBtn = document.getElementById("back-btn");
const clientNameTitle = document.getElementById("client-name-title");
const observationsTextarea = document.getElementById("observations-textarea");
const addClientBtn = document.getElementById('add-client-btn');
const tabClientes = document.getElementById("tab-clientes");
const tabNotas = document.getElementById("tab-notas");
const clientesView = document.getElementById("clientes-view");
const notasView = document.getElementById("notas-view");
const notasListContainer = document.getElementById("notas-list-container");
const addNotaBtn = document.getElementById("add-nota-btn");
const searchNotasInput = document.getElementById("search-notas-input");
const notaModal = document.getElementById("nota-modal");
const modalTitle = document.getElementById("modal-title");
const modalNotaTitulo = document.getElementById("modal-nota-titulo");
const modalNotaContenido = document.getElementById("modal-nota-contenido");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalSaveBtn = document.getElementById("modal-save-btn");

function sanitizeKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

// Listen for real-time updates on the 'clientes' collection
onSnapshot(collection(db, 'clientes'), (snapshot) => {
  // Clear the current list
  clientListContainer.innerHTML = '';
  // Check if the collection is empty
  if (snapshot.empty) {
    clientListContainer.innerHTML = `<p class="text-gray-500">No hay clientes todavía. ¡Agrega uno nuevo!</p>`;
    return;
  }
  // Create and append a card for each client
  snapshot.forEach(doc => {
          const client = doc.data();
          const clientCard = document.createElement("div");
          clientCard.className = "bg-white p-4 rounded-lg shadow-md w-full flex justify-between items-center";
                    
          const clientNameSpan = document.createElement("span");
          clientNameSpan.className = "cursor-pointer flex-grow";
          clientNameSpan.textContent = client.nombre;
          clientNameSpan.dataset.id = doc.id; // The name is the main clickable area
                    
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "delete-client-btn ml-4 p-1 rounded-full hover:bg-red-100";
          deleteBtn.dataset.id = doc.id; // The button also needs the id
          deleteBtn.dataset.name = client.nombre; // Store name for confirmation message
          deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>`; // Trash can icon

          clientCard.appendChild(clientNameSpan);
          clientCard.appendChild(deleteBtn);
          clientListContainer.appendChild(clientCard);
      });
});

async function loadClientDetails(clientId) {
        const docRef = doc(db, "clientes", clientId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const clientData = docSnap.data();
            
            clientNameTitle.textContent = clientData.nombre || "Cliente sin nombre";
            observationsTextarea.value = clientData.observaciones || "";

            // New, robust logic for populating radio buttons
            const allRadioButtons = clientDetailView.querySelectorAll("input[type=radio]");
            allRadioButtons.forEach(radio => {
                const sectionContainer = radio.closest('[id$="-section"]');
                if (!sectionContainer) return;

                let sectionDB;
                if (sectionContainer.id === 'foja-mejoras-section') {
                    sectionDB = 'fojaMejoras';
                } else {
                    sectionDB = 'mensura';
                }

                const key = radio.name.replace(/^(mensura-|fojamejoras-)/, "").replace("-status", "");
                const sanitizedKey = sanitizeKey(key);
                
                let savedState = null;
                if (clientData[sectionDB] && clientData[sectionDB][sanitizedKey]) {
                    savedState = clientData[sectionDB][sanitizedKey];
                }
                
                radio.checked = (radio.value === savedState);
                
                // This ensures the un-check logic works correctly on first load
                if (radio.checked) {
                    radio.setAttribute("data-was-checked", "true");
                } else {
                    radio.removeAttribute("data-was-checked");
                }
            });

        } else {
            console.log("El documento del cliente no fue encontrado.");
            alert("Error: No se pudieron cargar los datos del cliente.");
            backBtn.click();
        }
    }

clientListContainer.addEventListener("click", async (event) => {
  const target = event.target;
  const deleteButton = target.closest(".delete-client-btn");

  if (deleteButton) {
    const clientId = deleteButton.dataset.id;
    const clientName = deleteButton.dataset.name;
    if (confirm(`¿Estás seguro de que quieres eliminar a "${clientName}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, "clientes", clientId));
        console.log("Cliente eliminado con éxito.");
      } catch (e) {
        console.error("Error al eliminar el cliente: ", e);
        alert("Hubo un error al eliminar el cliente.");
      }
    }
    return; // Explicitly stop after handling delete
  }

  const clickedCard = target.closest("[data-id]");
  if (clickedCard) {
    // This part should not run if the delete button was clicked.
    // The `return` above handles this.
    currentClientId = clickedCard.dataset.id;
    loadClientDetails(currentClientId);
    clientListView.classList.add("hidden");
    clientDetailView.classList.remove("hidden");
  }
});

backBtn.addEventListener("click", () => {
  clientDetailView.classList.add("hidden");
  clientListView.classList.remove("hidden");
});

clientDetailView.addEventListener("click", async (event) => {
    const selectAllButton = event.target.closest(".select-all-btn");
    if (selectAllButton) {
        const sectionIdentifier = selectAllButton.dataset.targetSection;
        const statusToSet = selectAllButton.dataset.status;
        
        let container;
        if (sectionIdentifier === "foja-mejoras") {
            container = document.getElementById("foja-mejoras-section");
        } else {
            const allSubSectionTitles = document.querySelectorAll("#mensura-section h4");
            for (const titleElement of allSubSectionTitles) {
                // FIX: Normalize text and remove diacritics for comparison
                const normalizedText = titleElement.textContent.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                if (normalizedText === sectionIdentifier) {
                    container = titleElement.parentElement.parentElement;
                    break;
                }
            }
        }
        if (!container) {
            console.error("Could not find container for section:", sectionIdentifier);
            return;
        }

        const allRadiosInSection = container.querySelectorAll("input[type=radio]");
        const updates = {};
        
        let sectionDB;
        if (container.id === 'foja-mejoras-section') {
            sectionDB = 'fojaMejoras';
        } else {
            sectionDB = 'mensura';
        }

        allRadiosInSection.forEach(radio => {
            const key = radio.name.replace(/^(mensura-|fojamejoras-)/, "").replace("-status", "");
            const sanitizedKey = sanitizeKey(key);
            
            if (radio.value === statusToSet) {
                radio.checked = true;
                radio.setAttribute("data-was-checked", "true");
                updates[`${sectionDB}.${sanitizedKey}`] = statusToSet;
            } else {
                radio.checked = false;
                radio.removeAttribute("data-was-checked");
            }
        });
        
        if (Object.keys(updates).length === 0) {
            console.warn("No updates to send for section:", sectionIdentifier);
            return;
        }

        try {
            console.log("Updating Firestore for section:", sectionDB, "with data:", updates);
            const docRef = doc(db, "clientes", currentClientId);
            await updateDoc(docRef, updates);
            console.log("Firestore update successful for section:", sectionDB);
        } catch (e) {
            console.error("Error updating full section:", e);
        }
        return;
    }

    const target = event.target;
    if (target.type !== "radio") return;

    const sectionContainer = target.closest('[id$="-section"]');
    if (!sectionContainer) return;
    
    // FIX: Correctly identify the section for Firestore
    let sectionDB;
    if (sectionContainer.id === 'foja-mejoras-section') {
        sectionDB = 'fojaMejoras';
    } else {
        sectionDB = 'mensura';
    }
    
    const wasChecked = target.getAttribute("data-was-checked") === "true";
    
    document.querySelectorAll(`input[name="${target.name}"]`).forEach(radio => {
        radio.removeAttribute("data-was-checked");
    });

    const key = target.name.replace(/^(mensura-|fojamejoras-)/, "").replace("-status", "");
    const sanitizedKey = sanitizeKey(key);
    const docRef = doc(db, "clientes", currentClientId);

    if (wasChecked) {
        target.checked = false;
        try {
            await updateDoc(docRef, {
                [`${sectionDB}.${sanitizedKey}`]: deleteField()
            });
        } catch (e) {
            console.error("Error removing field: ", e);
        }
    } else {
        target.setAttribute("data-was-checked", "true");
        try {
            await updateDoc(docRef, {
                [`${sectionDB}.${sanitizedKey}`]: target.value
            });
        } catch (e) {
            console.error("Error updating field: ", e);
        }
    }
});

observationsTextarea.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        if (currentClientId) {
            const docRef = doc(db, "clientes", currentClientId);
            try {
                await updateDoc(docRef, {
                    observaciones: observationsTextarea.value
                });
                console.log("Observaciones guardadas.");
            } catch (e) {
                console.error("Error al guardar observaciones: ", e);
            }
        }
    }, 1500);
});

addClientBtn.addEventListener('click', async () => {
        const clientName = prompt('Ingrese el nombre del nuevo cliente:');
        
        if (!clientName || clientName.trim() === '') {
            return; // Exit if the user cancels or enters an empty name
        }

        const trimmedName = clientName.trim();

        try {
            // Check if a client with the same name already exists
            const q = query(collection(db, "clientes"), where("nombre", "==", trimmedName));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert(`Error: Ya existe un cliente con el nombre "${trimmedName}".`);
                return; // Stop the function if a duplicate is found
            }

            // If no duplicate is found, proceed to add the new client
            await addDoc(collection(db, 'clientes'), {
                nombre: trimmedName,
                fechaCreacion: serverTimestamp(),
                observaciones: '',
                mensura: {}, 
                fojaMejoras: {}
            });
            console.log('Cliente agregado con éxito.');

        } catch (e) {
            console.error('Error al agregar el cliente: ', e);
            alert('Hubo un error al verificar o agregar el cliente.');
        }
    });

/*
// --- SCRIPT DE MIGRACIÓN DE DATOS ---
// Este script se puede ejecutar en la consola del navegador o en un entorno Node.js
// para migrar las claves existentes en Firestore a su versión sanitizada.
// Asegúrate de tener Firebase inicializado y el usuario autenticado si es necesario.

import { getFirestore, collection, getDocs, writeBatch, doc, deleteField } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

const db = getFirestore();

function sanitizeKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

async function migrateData() {
  const clientesRef = collection(db, "clientes");
  const snapshot = await getDocs(clientesRef);
  const batch = writeBatch(db);

  snapshot.forEach(docSnap => {
    const clientData = docSnap.data();
    const docRef = docSnap.ref;
    let needsUpdate = false;
    const updates = {};

    ['mensura', 'fojaMejoras'].forEach(section => {
      if (clientData[section]) {
        const sectionData = clientData[section];
        
        for (const key in sectionData) {
          const sanitizedKey = sanitizeKey(key);
          if (key !== sanitizedKey) {
            needsUpdate = true;
            // Preserve the value, just change the key
            updates[`${section}.${sanitizedKey}`] = sectionData[key];
            // Mark old key for deletion
            updates[`${section}.${key}`] = deleteField();
          }
        }
      }
    });

    if (needsUpdate) {
      console.log(`Migrando documento: ${docSnap.id}`);
      batch.update(docRef, updates);
    }
  });

  if (batch._mutations.length > 0) {
    try {
      await batch.commit();
      console.log("¡Migración completada con éxito!");
    } catch (error) {
      console.error("Error durante la migración: ", error);
    }
  } else {
    console.log("No se encontraron documentos para migrar.");
  }
}

// Para ejecutar la migración, descomenta la siguiente línea y ejecútala en la consola del navegador
// con la página de tu aplicación abierta.
// migrateData();
*/

// --- LÓGICA DE NAVEGACIÓN POR PESTAÑAS ---

tabClientes.addEventListener("click", () => {
    // Show clients, hide notes
    clientesView.classList.remove("hidden");
    notasView.classList.add("hidden");

    // Update tab styles
    tabClientes.classList.add("text-blue-500", "border-b-4", "border-blue-500");
    tabClientes.classList.remove("text-gray-500");
    tabNotas.classList.remove("text-blue-500", "border-b-4", "border-blue-500");
    tabNotas.classList.add("text-gray-500");
});

tabNotas.addEventListener("click", () => {
    // Show notes, hide clients
    notasView.classList.remove("hidden");
    clientesView.classList.add("hidden");

    // Update tab styles
    tabNotas.classList.add("text-blue-500", "border-b-4", "border-blue-500");
    tabNotas.classList.remove("text-gray-500");
    tabClientes.classList.remove("text-blue-500", "border-b-4", "border-blue-500");
    tabClientes.classList.add("text-gray-500");
});

// --- LÓGICA DE LA PESTAÑA DE NOTAS ---

onSnapshot(collection(db, 'notas'), (snapshot) => {
    notasListContainer.innerHTML = ''; // Limpiar la lista actual

    if (snapshot.empty) {
        notasListContainer.innerHTML = `<p class="text-gray-500 text-center">No hay notas todavía. ¡Crea la primera!</p>`;
        return;
    }

    const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Opcional: Ordenar las notas por fecha de creación, la más nueva primero
    notes.sort((a, b) => b.fechaCreacion?.seconds - a.fechaCreacion?.seconds);

    notes.forEach((note, index) => {
        const noteCard = document.createElement('div');
        noteCard.className = 'bg-white p-6 rounded-lg shadow-md';
        noteCard.dataset.id = note.id;

        const title = document.createElement('h3');
        title.className = 'text-lg font-bold mb-2';
        title.textContent = `NOTA ${index + 1}: ${note.titulo || 'Sin Título'}`;

        const content = document.createElement('p');
        content.className = 'text-gray-700 whitespace-pre-wrap'; // Esta clase respeta los saltos de línea
        content.textContent = note.contenido || '';
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex justify-end space-x-3 mt-4';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-nota-btn text-sm text-blue-500 hover:underline';
        editBtn.textContent = 'Editar';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-nota-btn text-sm text-red-500 hover:underline';
        deleteBtn.textContent = 'Eliminar';

        actionsContainer.appendChild(editBtn);
        actionsContainer.appendChild(deleteBtn);

        noteCard.appendChild(title);
        noteCard.appendChild(content);
        noteCard.appendChild(actionsContainer);

        notasListContainer.appendChild(noteCard);
    });
});

// --- LÓGICA DE LA PESTAÑA DE NOTAS (continuación) ---

// Mostrar el modal para una nueva nota
addNotaBtn.addEventListener("click", () => {
    // Resetear el modal para asegurar que está limpio
    modalTitle.textContent = "Nueva Nota";
    modalNotaTitulo.value = "";
    modalNotaContenido.value = "";
    modalSaveBtn.dataset.mode = "add"; // Poner el modal en modo "añadir"
    delete modalSaveBtn.dataset.id;     // Quitar cualquier ID de una edición anterior
    
    notaModal.classList.remove("hidden");
});

// Ocultar el modal al hacer clic en "Cancelar"
modalCancelBtn.addEventListener("click", () => {
    notaModal.classList.add("hidden");
});

// Manejar el clic en el botón "Guardar" del modal
modalSaveBtn.addEventListener("click", async () => {
    const titulo = modalNotaTitulo.value.trim();
    const contenido = modalNotaContenido.value.trim();

    if (!titulo) {
        alert("El título de la nota no puede estar vacío.");
        return;
    }

    const mode = modalSaveBtn.dataset.mode;
    
    try {
        if (mode === "add") {
            // Si estamos en modo "añadir", creamos un nuevo documento
            await addDoc(collection(db, 'notas'), {
                titulo: titulo,
                contenido: contenido,
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
            });
        } else if (mode === "edit") {
            // Si estamos en modo "editar", actualizamos el documento existente
            const noteId = modalSaveBtn.dataset.id;
            const docRef = doc(db, "notas", noteId);
            await updateDoc(docRef, {
                titulo: titulo,
                contenido: contenido,
                fechaActualizacion: serverTimestamp()
            });
        }
        
        notaModal.classList.add("hidden");

    } catch (e) {
        console.error("Error al guardar la nota: ", e);
        alert("Hubo un error al guardar la nota.");
    }
});

// --- LÓGICA DE LA PESTAÑA DE NOTAS (continuación) ---

// Listener para acciones dentro de la lista de notas (Eliminar y Editar)
notasListContainer.addEventListener("click", async (event) => {
    const target = event.target;

    // --- LÓGICA PARA ELIMINAR ---
    if (target.classList.contains("delete-nota-btn")) {
        const noteCard = target.closest("[data-id]");
        const noteId = noteCard.dataset.id;
        
        if (confirm("¿Estás seguro de que quieres eliminar esta nota?")) {
            try {
                await deleteDoc(doc(db, "notas", noteId));
            } catch (e) {
                console.error("Error al eliminar la nota: ", e);
            }
        }
    }

    // --- AÑADIR NUEVA LÓGICA PARA EDITAR ---
    if (target.classList.contains("edit-nota-btn")) {
        const noteCard = target.closest("[data-id]");
        const noteId = noteCard.dataset.id;
        
        const docRef = doc(db, "notas", noteId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const noteData = docSnap.data();
            // Poblar el modal con los datos de la nota
            modalTitle.textContent = "Editar Nota";
            modalNotaTitulo.value = noteData.titulo;
            modalNotaContenido.value = noteData.contenido;

            // Configurar el modal para el modo "editar"
            modalSaveBtn.dataset.mode = "edit";
            modalSaveBtn.dataset.id = noteId; // Adjuntar el ID de la nota al botón
            
            // Mostrar el modal
            notaModal.classList.remove("hidden");
        }
    }
});

// --- LÓGICA DE LA PESTAÑA DE NOTAS (continuación) ---

// Listener para la barra de búsqueda para filtrar notas en tiempo real
searchNotasInput.addEventListener("input", (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const allNoteCards = notasListContainer.querySelectorAll("[data-id]");

    allNoteCards.forEach(card => {
        const titleElement = card.querySelector("h3");
        const contentElement = card.querySelector("p");

        const titleText = titleElement.textContent.toLowerCase();
        const contentText = contentElement.textContent.toLowerCase();

        // Si el término de búsqueda está en el título o en el contenido, muestra la tarjeta. Si no, ocúltala.
        if (titleText.includes(searchTerm) || contentText.includes(searchTerm)) {
            card.style.display = "block"; // O 'flex', 'grid', etc., dependiendo del layout del contenedor
        } else {
            card.style.display = "none";
        }
    });
});