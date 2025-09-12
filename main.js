// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

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
    const clientCard = document.createElement('div');
    clientCard.className = "bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50 w-full";
    clientCard.textContent = client.nombre;
    // Store the client's ID in a data attribute for later use
    clientCard.dataset.id = doc.id;
    clientListContainer.appendChild(clientCard);
  });
});

async function loadClientDetails(clientId) {
  const docRef = doc(db, "clientes", clientId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const clientData = docSnap.data();
    // Populate the UI
    clientNameTitle.textContent = clientData.nombre || "Cliente sin nombre";
    observationsTextarea.value = clientData.observaciones || "";
    
    const allRadioGroups = clientDetailView.querySelectorAll("input[type=radio][name]");
    const uniqueNames = [...new Set(Array.from(allRadioGroups).map(r => r.name))];

    uniqueNames.forEach(name => {
        const radios = clientDetailView.querySelectorAll(`input[name="${name}"]`);
        const key = name.replace("-status", "");
        const sectionContainer = radios[0].closest("div.bg-white");
        const section = sectionContainer.id.includes("mensura") ? "mensura" : "fojaMejoras";
        
        let savedState = null;
        if (section === "mensura" && clientData.mensura) {
            savedState = clientData.mensura[key];
        } else if (section === "fojaMejoras" && clientData.fojaMejoras) {
            savedState = clientData.fojaMejoras[key];
        }

        radios.forEach(radio => {
            radio.checked = (radio.value === savedState);
        });
    });

  } else {
    console.log("El documento del cliente no fue encontrado.");
    alert("Error: No se pudieron cargar los datos del cliente.");
    // Go back to the list if client data not found
    backBtn.click();
  }
}

clientListContainer.addEventListener("click", (event) => {
  const clickedCard = event.target.closest("[data-id]");
  if (clickedCard) {
    currentClientId = clickedCard.dataset.id;
    loadClientDetails(currentClientId); // Load the data
    // Switch views
    clientListView.classList.add("hidden");
    clientDetailView.classList.remove("hidden");
  }
});

backBtn.addEventListener("click", () => {
  clientDetailView.classList.add("hidden");
  clientListView.classList.remove("hidden");
});

clientDetailView.addEventListener('mousedown', (e) => {
    if (e.target.type === 'radio') {
        e.target.setAttribute('data-was-checked', e.target.checked);
    }
});

clientDetailView.addEventListener("click", async (event) => {
    const target = event.target;
    if (target.type !== "radio") return;
    
    const wasChecked = target.getAttribute("data-was-checked") === "true";
    
    // This is a new radio button click, not a toggle-off
    document.querySelectorAll(`input[name="${target.name}"]`).forEach(radio => {
        radio.removeAttribute("data-was-checked");
    });

    const key = target.name.replace("-status", "");
    const sectionContainer = target.closest("div.bg-white");
    const section = sectionContainer.id.includes("mensura") ? "mensura" : "fojaMejoras";
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