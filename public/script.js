// Only define if it doesn't exist
window.dataStore = window.dataStore || {
  shelves: [],
  containers: [],
  folders: [],
  documents: [],
};


// ----- Utilities -----
function generateId(prefix) {
  return prefix + '_' + Math.random().toString(36).substring(2, 8);
}

function saveToStorage() {
  localStorage.setItem('shelfData', JSON.stringify(dataStore));
}

function loadFromStorage() {
  const saved = localStorage.getItem('shelfData');
  if (saved) {
    dataStore = JSON.parse(saved);
    displayItems();
  }
}

// ----- QR / Barcode -----
function generateQRCode(text) {
  return new QRious({ value: text, size: 80 });
}

function createBarcode(id) {
  const svg = document.createElement("svg");
  JsBarcode(svg, id, { format: "CODE128", width: 2, height: 40, displayValue: false });
  return svg;
}

// ----- Display -----
function displayItems(filter = '') {
  const output = document.getElementById("output");
  output.innerHTML = '';

  dataStore.shelves.forEach(shelf => {
    const shelfDiv = createItemDiv('shelf', shelf.id, null, filter);
    if (shelfDiv) {
      shelfDiv.addEventListener('click', () => toggleChildDisplay(shelf.id, 'container'));
      output.appendChild(shelfDiv);

      const containerGroup = document.createElement('div');
      containerGroup.className = 'child-group';
      containerGroup.id = `children-${shelf.id}`;
      containerGroup.style.display = 'none';

      dataStore.containers.filter(c => c.parent === shelf.id).forEach(container => {
        const containerDiv = createItemDiv('container', container.id, shelf.id, filter);
        if (containerDiv) {
          containerDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleChildDisplay(container.id, 'folder');
          });
          containerGroup.appendChild(containerDiv);

          const folderGroup = document.createElement('div');
          folderGroup.className = 'child-group';
          folderGroup.id = `children-${container.id}`;
          folderGroup.style.display = 'none';

          dataStore.folders.filter(f => f.parent === container.id).forEach(folder => {
            const folderDiv = createItemDiv('folder', folder.id, container.id, filter);
            if (folderDiv) {
              folderDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleChildDisplay(folder.id, 'doc');
              });
              folderGroup.appendChild(folderDiv);

              const docGroup = document.createElement('div');
              docGroup.className = 'child-group';
              docGroup.id = `children-${folder.id}`;
              docGroup.style.display = 'none';

              dataStore.documents.filter(d => d.parent === folder.id).forEach(doc => {
                const docDiv = createItemDiv('doc', doc.id, folder.id, filter);
                if (docDiv) docGroup.appendChild(docDiv);
              });

              folderGroup.appendChild(docGroup);
            }
          });

          containerGroup.appendChild(folderGroup);
        }
      });

      output.appendChild(containerGroup);
    }
  });
}

function toggleChildDisplay(parentId) {
  const el = document.getElementById(`children-${parentId}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function createItemDiv(type, id, parentId, filter) {
  if (filter && !id.includes(filter) && (!parentId || !parentId.includes(filter))) return null;

  const div = document.createElement('div');
  div.className = 'qr-item';
  div.draggable = true;
  div.dataset.id = id;
  div.dataset.type = type === 'doc' ? 'documents' : type + 's';

  div.addEventListener("dragstart", dragStart);
  div.addEventListener("dragover", dragOver);
  div.addEventListener("drop", drop);

  const qr = generateQRCode(id);
  div.appendChild(qr.image);

  if (type === 'folder' || type === 'doc') {
    div.appendChild(createBarcode(id));
  }

  div.innerHTML += `
    <div>
      <p><strong>ID:</strong> ${id}</p>
      <p><strong>Parent:</strong> ${parentId || 'None'}</p>
    </div>
  `;

  return div;
}

// ----- UI Prompt Generator -----
function showSelectPrompt(title, list, callback) {
  const form = document.createElement("div");
  form.style = "padding:20px;background:white;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.1);max-width:400px;margin:20px auto;position:relative;z-index:1000";

  form.innerHTML = `<h3>${title}</h3>`;

  const select = document.createElement("select");
  select.style = "width:100%;padding:10px;margin-bottom:10px;";

  list.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.id;
    select.appendChild(opt);
  });

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Create";
  submitBtn.style = "padding:10px 20px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;";

  submitBtn.onclick = () => {
    callback(select.value);
    document.body.removeChild(form);
  };

  form.appendChild(select);
  form.appendChild(submitBtn);
  document.body.appendChild(form);
}

// ----- Create Functions -----
function createShelf() {
  const id = generateId('shelf');
  dataStore.shelves.push({ id });
  saveToStorage();
  displayItems();
}

function createContainer() {
  if (dataStore.shelves.length === 0) return alert("No shelves available. Create a shelf first.");

  showSelectPrompt("Select Shelf for Container", dataStore.shelves, (shelfId) => {
    const id = generateId('container');
    dataStore.containers.push({ id, parent: shelfId });
    saveToStorage();
    displayItems();
  });
}

function createFolder() {
  if (dataStore.containers.length === 0) return alert("No containers available. Create a container first.");

  showSelectPrompt("Select Container for Folder", dataStore.containers, (containerId) => {
    const id = generateId('folder');
    dataStore.folders.push({ id, parent: containerId });
    saveToStorage();
    displayItems();
  });
}

function createDocument() {
  if (dataStore.folders.length === 0) return alert("No folders available. Create a folder first.");

  showSelectPrompt("Select Folder for Document", dataStore.folders, (folderId) => {
    const id = generateId('doc');
    dataStore.documents.push({ id, parent: folderId });
    saveToStorage();
    displayItems();
  });
}

// ----- Move Item (Manual) -----
function moveItem() {
  const id = prompt("Enter ID of item to move:");
  const newParent = prompt("Enter new parent ID:");
  const types = ['documents', 'folders', 'containers'];
  for (let type of types) {
    const item = dataStore[type].find(i => i.id === id);
    if (item) {
      item.parent = newParent;
      saveToStorage();
      displayItems();
      return;
    }
  }
  alert("Item not found.");
}

// ----- Drag & Drop -----
let draggedItem = null;

function dragStart(e) {
  draggedItem = {
    id: e.currentTarget.dataset.id,
    type: e.currentTarget.dataset.type
  };
}

function dragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

function drop(e) {
  e.preventDefault();
  const dropTargetId = e.currentTarget.dataset.id;
  const dropType = e.currentTarget.dataset.type;

  e.currentTarget.classList.remove('dragover');

  if (!draggedItem || draggedItem.id === dropTargetId) return;

  const rules = {
    documents: 'folders',
    folders: 'containers',
    containers: 'shelves',
  };

  const validParentType = rules[draggedItem.type];
  if (dropType !== validParentType) {
    alert(`Invalid move. You can only drop a ${draggedItem.type} into a ${validParentType}.`);
    return;
  }

  const list = dataStore[draggedItem.type];
  const item = list.find(i => i.id === draggedItem.id);
  if (item) {
    item.parent = dropTargetId;
    saveToStorage();
    displayItems();
  }
}

// ----- Search, Import, Export -----
function searchItems() {
  const value = document.getElementById("searchInput").value.trim();
  displayItems(value);
}

function saveData() {
  saveToStorage();
  alert("Data saved to localStorage.");
}

function loadData() {
  loadFromStorage();
  alert("Data loaded.");
}

function exportData() {
  const blob = new Blob([JSON.stringify(dataStore, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "shelf_data.json";
  a.click();
}

function importData() {
  const file = document.getElementById("importFile").files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      dataStore = JSON.parse(e.target.result);
      saveToStorage();
      displayItems();
      alert("Data imported!");
    } catch (err) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
}

// ----- Initialize -----
window.addEventListener("DOMContentLoaded", () => {
  loadFromStorage();
});

