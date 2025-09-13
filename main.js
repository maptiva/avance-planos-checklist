// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteField, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

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

                const section = sectionContainer.id.replace("-section", "");
                const key = radio.name.replace("-status", "");
                
                let savedState = null;
                if (clientData[section] && clientData[section][key]) {
                    savedState = clientData[section][key];
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
        const target = event.target;
        if (target.type !== "radio") return;

        const sectionContainer = target.closest('[id$="-section"]');
        if (!sectionContainer) return;
        
        const wasChecked = target.getAttribute("data-was-checked") === "true";
        
        document.querySelectorAll(`input[name="${target.name}"]`).forEach(radio => {
            radio.removeAttribute("data-was-checked");
        });

        const section = sectionContainer.id.replace("-section", "");
        const key = target.name.replace("-status", "");
        const docRef = doc(db, "clientes", currentClientId);

        if (wasChecked) {
            target.checked = false;
            try {
                await updateDoc(docRef, {
                    [`${section}.${key}`]: deleteField()
                });
            } catch (e) {
                console.error("Error removing field: ", e);
            }
        } else {
            target.setAttribute("data-was-checked", "true");
            try {
                await updateDoc(docRef, {
                    [`${section}.${key}`]: target.value
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
  if (clientName && clientName.trim() !== '') {
    try {
      await addDoc(collection(db, 'clientes'), {
        nombre: clientName.trim(),
        createdAt: serverTimestamp()
      });
      console.log('Cliente agregado con éxito.');
    } catch (e) {
      console.error('Error al agregar el cliente: ', e);
      alert('Hubo un error al agregar el cliente.');
    }
  }
});
