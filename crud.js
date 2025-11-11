import { supabase } from "./main.js";

let currentTable = "";
let columns = [];
let currentEditId = null;

// ==================================================
// INITIALIZE MODULE CRUD
// ==================================================
export async function initCRUD(config) {
  currentTable = config.table;
  columns = config.columns;

  document.getElementById("moduleTitle").textContent = config.title;
  document.getElementById("moduleSubtitle").textContent = config.subtitle;

  buildTableHeader();
  await loadRecords();

  document.getElementById("addRecordBtn").addEventListener("click", openAddModal);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("searchInput").addEventListener("input", handleSearch);
}

// ==================================================
// TABLE HEADER
// ==================================================
function buildTableHeader() {
  const head = document.getElementById("crudHead");
  head.innerHTML = `<tr>${columns.map(c => `<th>${c.label}</th>`).join("")}<th>Actions</th></tr>`;
}

// ==================================================
// LOAD DATA
// ==================================================
async function loadRecords(filter = "") {
  const { data, error } = await supabase
    .from(currentTable)
    .select("*")
    .ilike(columns[0].name, `%${filter}%`)
    .order(columns[0].name, { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.getElementById("crudBody");
  tbody.innerHTML = "";

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = columns.map(c => `<td>${row[c.name] ?? ""}</td>`).join("") +
      `<td>
        <button class="export-btn small" data-id="${row.id}" data-action="edit">Edit</button>
        <button class="export-btn small danger" data-id="${row.id}" data-action="delete">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", handleAction);
  });
}

// ==================================================
// ACTION HANDLERS
// ==================================================
function handleAction(e) {
  const id = e.target.dataset.id;
  const action = e.target.dataset.action;
  if (action === "edit") openEditModal(id);
  if (action === "delete") deleteRecord(id);
}

// ==================================================
// SEARCH
// ==================================================
function handleSearch(e) {
  loadRecords(e.target.value.trim());
}

// ==================================================
// ADD / EDIT MODAL
// ==================================================
function openAddModal() {
  currentEditId = null;
  openModal("Add Record");
}

async function openEditModal(id) {
  const { data } = await supabase.from(currentTable).select("*").eq("id", id).single();
  openModal("Edit Record", data);
  currentEditId = id;
}

function openModal(title, record = {}) {
  const modal = document.getElementById("crudModal");
  document.getElementById("modalTitle").textContent = title;

  const form = document.getElementById("crudForm");
  form.innerHTML = columns.map(c => `
    <label>${c.label}</label>
    <input type="${c.type}" name="${c.name}" value="${record[c.name] ?? ""}" required>
  `).join("") + `<button type="submit" class="export-btn">Save</button>`;

  form.onsubmit = handleSubmit;
  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("crudModal").style.display = "none";
}

// ==================================================
// SUBMIT FORM
// ==================================================
async function handleSubmit(e) {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target).entries());
  let result;

  if (currentEditId) {
    result = await supabase.from(currentTable).update(formData).eq("id", currentEditId);
  } else {
    result = await supabase.from(currentTable).insert([formData]);
  }

  if (result.error) {
    alert("Error: " + result.error.message);
  } else {
    closeModal();
    loadRecords();
  }
}

// ==================================================
// DELETE RECORD
// ==================================================
async function deleteRecord(id) {
  if (!confirm("Delete this record?")) return;
  const { error } = await supabase.from(currentTable).delete().eq("id", id);
  if (error) alert("Error: " + error.message);
  else loadRecords();
}
