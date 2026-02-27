const DB_NAME = "hiseas_ims_db";
const DB_VERSION = 5;
const HISTORY_DB_NAME = "hiseas_ims_history_db";
const HISTORY_DB_VERSION = 1;
const USERS_STORE = "users";
const MATERIALS_STORE = "materials";
const TRANSACTIONS_STORE = "transactions";
const RETURNS_STORE = "returns";
const HISTORY_TRANSACTIONS_STORE = "transactions_history";
const HISTORY_RETURNS_STORE = "returns_history";
const SESSION_KEY = "ims_active_user";
const CODE_PREFIX = "BBP";
const CODE_PADDING = 3;
const ROLE_SUPER_ADMIN = "super_admin";
const ROLE_ADMIN = "admin";
const ROLE_GUEST = "guest";
const RETURN_CONDITIONS = new Set(["broken", "good", "repaired"]);

const state = {
  db: null,
  historyDb: null,
  currentUser: null,
  materials: [],
  transactions: [],
  returns: [],
  editingId: null,
  activeTab: "materials",
  pendingPhotoDataUrl: ""
};

const el = {
  authSection: document.getElementById("authSection"),
  inventorySection: document.getElementById("inventorySection"),
  setupForm: document.getElementById("setupForm"),
  loginForm: document.getElementById("loginForm"),
  guestAccessBtn: document.getElementById("guestAccessBtn"),
  authMessage: document.getElementById("authMessage"),
  activeUserLabel: document.getElementById("activeUserLabel"),
  logoutBtn: document.getElementById("logoutBtn"),
  metricTotal: document.getElementById("metricTotal"),
  metricLowStock: document.getElementById("metricLowStock"),
  metricCategories: document.getElementById("metricCategories"),
  materialForm: document.getElementById("materialForm"),
  formHeading: document.getElementById("formHeading"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  formMessage: document.getElementById("formMessage"),
  photoInput: document.getElementById("photoInput"),
  photoPreviewWrap: document.getElementById("photoPreviewWrap"),
  photoPreview: document.getElementById("photoPreview"),
  clearPhotoBtn: document.getElementById("clearPhotoBtn"),
  listMessage: document.getElementById("listMessage"),
  accountPanel: document.getElementById("accountPanel"),
  superAdminCredentialsPanel: document.getElementById("superAdminCredentialsPanel"),
  superAdminViewUsername: document.getElementById("superAdminViewUsername"),
  superAdminViewPassword: document.getElementById("superAdminViewPassword"),
  accountForm: document.getElementById("accountForm"),
  accountUsername: document.getElementById("accountUsername"),
  accountCurrentPassword: document.getElementById("accountCurrentPassword"),
  accountNewPassword: document.getElementById("accountNewPassword"),
  accountConfirmPassword: document.getElementById("accountConfirmPassword"),
  accountMessage: document.getElementById("accountMessage"),
  adminAccountsPanel: document.getElementById("adminAccountsPanel"),
  adminAccountsList: document.getElementById("adminAccountsList"),
  cancelAccountBtn: document.getElementById("cancelAccountBtn"),
  adminManagementPanel: document.getElementById("adminManagementPanel"),
  createAdminForm: document.getElementById("createAdminForm"),
  newAdminUsername: document.getElementById("newAdminUsername"),
  newAdminPassword: document.getElementById("newAdminPassword"),
  newAdminConfirmPassword: document.getElementById("newAdminConfirmPassword"),
  createAdminMessage: document.getElementById("createAdminMessage"),
  tabMaterialsBtn: document.getElementById("tabMaterialsBtn"),
  tabAddMaterialBtn: document.getElementById("tabAddMaterialBtn"),
  tabTransactionBtn: document.getElementById("tabTransactionBtn"),
  tabReturnBtn: document.getElementById("tabReturnBtn"),
  tabReportBtn: document.getElementById("tabReportBtn"),
  materialsView: document.getElementById("materialsView"),
  addMaterialView: document.getElementById("addMaterialView"),
  transactionView: document.getElementById("transactionView"),
  returnView: document.getElementById("returnView"),
  reportView: document.getElementById("reportView"),
  reportTotalMaterials: document.getElementById("reportTotalMaterials"),
  reportInboundTotal: document.getElementById("reportInboundTotal"),
  reportOutboundTotal: document.getElementById("reportOutboundTotal"),
  reportStockBody: document.getElementById("reportStockBody"),
  reportLowStockBody: document.getElementById("reportLowStockBody"),
  reportOutOfStockBody: document.getElementById("reportOutOfStockBody"),
  reportInboundBody: document.getElementById("reportInboundBody"),
  reportOutboundBody: document.getElementById("reportOutboundBody"),
  reportExportType: document.getElementById("reportExportType"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  transactionForm: document.getElementById("transactionForm"),
  transactionId: document.getElementById("transactionId"),
  transactionMaterial: document.getElementById("transactionMaterial"),
  transactionType: document.getElementById("transactionType"),
  transactionQuantity: document.getElementById("transactionQuantity"),
  transactionNote: document.getElementById("transactionNote"),
  saveTransactionBtn: document.getElementById("saveTransactionBtn"),
  cancelTransactionEditBtn: document.getElementById("cancelTransactionEditBtn"),
  transactionMessage: document.getElementById("transactionMessage"),
  transactionsBody: document.getElementById("transactionsBody"),
  returnForm: document.getElementById("returnForm"),
  returnId: document.getElementById("returnId"),
  returnMaterial: document.getElementById("returnMaterial"),
  returnCondition: document.getElementById("returnCondition"),
  returnQuantity: document.getElementById("returnQuantity"),
  returnNote: document.getElementById("returnNote"),
  saveReturnBtn: document.getElementById("saveReturnBtn"),
  cancelReturnEditBtn: document.getElementById("cancelReturnEditBtn"),
  returnMessage: document.getElementById("returnMessage"),
  returnsBody: document.getElementById("returnsBody"),
  searchInput: document.getElementById("searchInput"),
  sortFilter: document.getElementById("sortFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  materialsBody: document.getElementById("materialsBody"),
  exportBtn: document.getElementById("exportBtn"),
  importBtnLabel: document.getElementById("importBtnLabel"),
  importInput: document.getElementById("importInput"),
  reportMessage: document.getElementById("reportMessage"),
  reportPdfModal: document.getElementById("reportPdfModal"),
  reportPdfFrame: document.getElementById("reportPdfFrame"),
  printReportPdfBtn: document.getElementById("printReportPdfBtn"),
  closeReportPdfBtn: document.getElementById("closeReportPdfBtn"),
  photoZoomModal: document.getElementById("photoZoomModal"),
  photoZoomImage: document.getElementById("photoZoomImage"),
  closePhotoZoomBtn: document.getElementById("closePhotoZoomBtn")
};

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(USERS_STORE)) {
        const users = db.createObjectStore(USERS_STORE, { keyPath: "id", autoIncrement: true });
        users.createIndex("username", "username", { unique: true });
        users.createIndex("role", "role", { unique: false });
      } else {
        const users = req.transaction.objectStore(USERS_STORE);
        if (!users.indexNames.contains("role")) {
          users.createIndex("role", "role", { unique: false });
        }
      }

      if (event.oldVersion < 4 && db.objectStoreNames.contains(USERS_STORE)) {
        const users = req.transaction.objectStore(USERS_STORE);
        users.openCursor().onsuccess = (cursorEvent) => {
          const cursor = cursorEvent.target.result;
          if (!cursor) {
            return;
          }
          const value = cursor.value || {};
          let changed = false;
          if (!value.role) {
            value.role = ROLE_SUPER_ADMIN;
            changed = true;
          }
          if (typeof value.passwordPlain !== "string") {
            value.passwordPlain = "";
            changed = true;
          }
          if (changed) {
            cursor.update(value);
          }
          cursor.continue();
        };
      }

      if (!db.objectStoreNames.contains(MATERIALS_STORE)) {
        const materials = db.createObjectStore(MATERIALS_STORE, { keyPath: "id", autoIncrement: true });
        materials.createIndex("code", "code", { unique: true });
        materials.createIndex("category", "category", { unique: false });
      }

      if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        const transactions = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: "id", autoIncrement: true });
        transactions.createIndex("materialId", "materialId", { unique: false });
        transactions.createIndex("occurredAt", "occurredAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(RETURNS_STORE)) {
        const returns = db.createObjectStore(RETURNS_STORE, { keyPath: "id", autoIncrement: true });
        returns.createIndex("materialId", "materialId", { unique: false });
        returns.createIndex("occurredAt", "occurredAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openHistoryDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(HISTORY_TRANSACTIONS_STORE)) {
        const transactions = db.createObjectStore(HISTORY_TRANSACTIONS_STORE, { keyPath: "id" });
        transactions.createIndex("materialId", "materialId", { unique: false });
        transactions.createIndex("occurredAt", "occurredAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(HISTORY_RETURNS_STORE)) {
        const returns = db.createObjectStore(HISTORY_RETURNS_STORE, { keyPath: "id" });
        returns.createIndex("materialId", "materialId", { unique: false });
        returns.createIndex("occurredAt", "occurredAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getStore(name, mode = "readonly") {
  return state.db.transaction(name, mode).objectStore(name);
}

function getHistoryStore(name, mode = "readonly") {
  if (!state.historyDb) {
    throw new Error("History database is not available.");
  }
  return state.historyDb.transaction(name, mode).objectStore(name);
}

function replaceHistoryStoreRows(storeName, rows) {
  if (!state.historyDb) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let failed = false;
    const tx = state.historyDb.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    function fail(error) {
      if (failed) {
        return;
      }
      failed = true;
      try {
        tx.abort();
      } catch {
        // Ignore abort errors.
      }
      reject(error || new Error("Failed to update history database."));
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      if (!failed) {
        reject(tx.error || new Error("Failed to update history database."));
      }
    };

    const clearReq = store.clear();
    clearReq.onerror = () => fail(clearReq.error);
    clearReq.onsuccess = () => {
      rows.forEach((row) => {
        const putReq = store.put(row);
        putReq.onerror = () => fail(putReq.error);
      });
    };
  });
}

async function syncTransactionsHistoryDb() {
  if (!state.historyDb) {
    return;
  }
  const rows = await reqToPromise(getStore(TRANSACTIONS_STORE).getAll());
  await replaceHistoryStoreRows(HISTORY_TRANSACTIONS_STORE, rows);
}

async function syncReturnsHistoryDb() {
  if (!state.historyDb) {
    return;
  }
  const rows = await reqToPromise(getStore(RETURNS_STORE).getAll());
  await replaceHistoryStoreRows(HISTORY_RETURNS_STORE, rows);
}

function setMessage(node, text, type = "") {
  node.textContent = text;
  node.className = `msg ${type}`.trim();
}

function sanitize(text) {
  return String(text ?? "").trim();
}

function normalizeUserRole(role) {
  if (role === ROLE_ADMIN) {
    return ROLE_ADMIN;
  }
  if (role === ROLE_GUEST) {
    return ROLE_GUEST;
  }
  return ROLE_SUPER_ADMIN;
}

function toUserWithRole(user) {
  if (!user) {
    return null;
  }
  return {
    ...user,
    role: normalizeUserRole(user.role)
  };
}

function isSuperAdmin() {
  return normalizeUserRole(state.currentUser?.role) === ROLE_SUPER_ADMIN;
}

function isGuestUser() {
  return normalizeUserRole(state.currentUser?.role) === ROLE_GUEST;
}

function canManageInventory() {
  return Boolean(state.currentUser) && !isGuestUser();
}

function ensureCanManageInventory(messageNode, messageText) {
  if (canManageInventory()) {
    return true;
  }
  if (messageNode) {
    setMessage(messageNode, messageText || "Guest account is view-only.", "error");
  }
  return false;
}

function ensureSuperAdminAccess(messageNode, messageText) {
  if (isSuperAdmin()) {
    return true;
  }
  if (messageNode) {
    setMessage(messageNode, messageText || "Access denied.", "error");
  }
  return false;
}

function normalizePhotoData(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (!trimmed.startsWith("data:image/")) {
    return "";
  }
  return trimmed;
}

function normalizeMaterial(raw) {
  const code = sanitize(raw.code).toUpperCase();
  const name = sanitize(raw.name);
  const specification = sanitize(raw.specification);
  const category = sanitize(raw.category);
  const unit = sanitize(raw.unit);
  const quantity = Number(raw.quantity);
  const photoDataUrl = normalizePhotoData(raw.photoDataUrl);

  if (!code || !name || !category || !unit) {
    throw new Error("Required fields are missing.");
  }
  if (Number.isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
    throw new Error("Quantity must be a whole number.");
  }

  return {
    code,
    name,
    specification,
    category,
    unit,
    quantity,
    photoDataUrl
  };
}

function setPhotoPreview(photoDataUrl) {
  const normalized = normalizePhotoData(photoDataUrl);
  if (!normalized) {
    el.photoPreview.removeAttribute("src");
    el.photoPreviewWrap.classList.add("hidden");
    return;
  }
  el.photoPreview.src = normalized;
  el.photoPreviewWrap.classList.remove("hidden");
}

function clearMaterialPhotoInput() {
  if (el.photoInput) {
    el.photoInput.value = "";
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function refreshBodyModalState() {
  const hasPhotoModal = !el.photoZoomModal.classList.contains("hidden");
  const hasReportModal = !el.reportPdfModal.classList.contains("hidden");
  document.body.classList.toggle("modal-open", hasPhotoModal || hasReportModal);
}

function openPhotoZoom(photoDataUrl) {
  const normalized = normalizePhotoData(photoDataUrl);
  if (!normalized) {
    return;
  }
  el.photoZoomImage.src = normalized;
  el.photoZoomModal.classList.remove("hidden");
  refreshBodyModalState();
}

function closePhotoZoom() {
  el.photoZoomModal.classList.add("hidden");
  el.photoZoomImage.removeAttribute("src");
  refreshBodyModalState();
}

function openReportPdfPreview(html) {
  el.reportPdfFrame.srcdoc = html;
  el.reportPdfModal.classList.remove("hidden");
  refreshBodyModalState();
}

function closeReportPdfPreview() {
  el.reportPdfModal.classList.add("hidden");
  el.reportPdfFrame.removeAttribute("srcdoc");
  refreshBodyModalState();
}

function printReportPdfPreview() {
  const frameWindow = el.reportPdfFrame.contentWindow;
  if (!frameWindow) {
    setMessage(el.reportMessage, "Unable to open report preview.", "error");
    return;
  }
  frameWindow.focus();
  frameWindow.print();
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  return sha256(`${salt}:${password}`);
}

async function countUsers() {
  return reqToPromise(getStore(USERS_STORE).count());
}

async function getUserByUsername(username) {
  return reqToPromise(getStore(USERS_STORE).index("username").get(username));
}

async function getUsersByRole(role) {
  return reqToPromise(getStore(USERS_STORE).index("role").getAll(normalizeUserRole(role)));
}

async function createUser(username, passwordHash, passwordSalt, role = ROLE_ADMIN, passwordPlain = "") {
  const now = new Date().toISOString();
  const record = {
    username,
    passwordHash,
    passwordSalt,
    role: normalizeUserRole(role),
    passwordPlain: sanitize(passwordPlain),
    createdAt: now
  };
  return reqToPromise(getStore(USERS_STORE, "readwrite").add(record));
}

async function getUserById(id) {
  return reqToPromise(getStore(USERS_STORE).get(id));
}

async function updateUser(user) {
  return reqToPromise(getStore(USERS_STORE, "readwrite").put(user));
}

async function deleteUser(id) {
  return reqToPromise(getStore(USERS_STORE, "readwrite").delete(id));
}

async function getAllMaterials() {
  return reqToPromise(getStore(MATERIALS_STORE).getAll());
}

async function getAllTransactions() {
  if (!state.historyDb) {
    return reqToPromise(getStore(TRANSACTIONS_STORE).getAll());
  }
  return reqToPromise(getHistoryStore(HISTORY_TRANSACTIONS_STORE).getAll());
}

async function getAllReturns() {
  if (!state.historyDb) {
    return reqToPromise(getStore(RETURNS_STORE).getAll());
  }
  return reqToPromise(getHistoryStore(HISTORY_RETURNS_STORE).getAll());
}

async function getMaterialById(id) {
  return reqToPromise(getStore(MATERIALS_STORE).get(id));
}

async function getMaterialByCode(code) {
  return reqToPromise(getStore(MATERIALS_STORE).index("code").get(code));
}

async function saveMaterial(material) {
  return reqToPromise(getStore(MATERIALS_STORE, "readwrite").put(material));
}

async function deleteMaterial(id) {
  return reqToPromise(getStore(MATERIALS_STORE, "readwrite").delete(id));
}

async function saveReturnRecord(record) {
  return reqToPromise(getStore(RETURNS_STORE, "readwrite").add(record));
}

async function applyReturnRecord({ materialId, condition, quantity, note, user }) {
  return new Promise((resolve, reject) => {
    let failed = false;
    const tx = state.db.transaction([MATERIALS_STORE, RETURNS_STORE], "readwrite");
    const materials = tx.objectStore(MATERIALS_STORE);
    const returns = tx.objectStore(RETURNS_STORE);
    const materialReq = materials.get(materialId);

    function fail(message) {
      if (failed) {
        return;
      }
      failed = true;
      try {
        tx.abort();
      } catch {
        // Ignore abort errors.
      }
      reject(new Error(message));
    }

    materialReq.onerror = () => fail("Failed to read selected material.");
    materialReq.onsuccess = () => {
      const material = materialReq.result;
      if (!material) {
        fail("Selected material was not found.");
        return;
      }

      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        fail("Returned quantity must be a whole number greater than zero.");
        return;
      }

      const normalizedCondition = sanitize(condition).toLowerCase();
      if (!RETURN_CONDITIONS.has(normalizedCondition)) {
        fail("Select a valid return condition.");
        return;
      }

      const stockAdded = normalizedCondition === "broken" ? 0 : qty;
      const currentQty = Number(material.quantity) || 0;
      const nextQty = currentQty + stockAdded;
      const now = new Date().toISOString();

      if (stockAdded > 0) {
        materials.put({
          ...material,
          quantity: nextQty,
          updatedAt: now
        });
      }

      returns.add({
        materialId: Number(material.id),
        materialCode: material.code,
        materialName: material.name,
        materialSpecification: sanitize(material.specification),
        materialPhotoDataUrl: normalizePhotoData(material.photoDataUrl),
        condition: normalizedCondition,
        quantity: qty,
        stockAdded,
        stockAfter: nextQty,
        unit: material.unit,
        note,
        createdBy: user,
        occurredAt: now
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      if (!failed) {
        reject(tx.error || new Error("Failed to save return record."));
      }
    };
  });
}

function getReturnStockAdded(condition, quantity) {
  const normalizedCondition = sanitize(condition).toLowerCase();
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
    throw new Error("Returned quantity must be a whole number greater than zero.");
  }
  if (!RETURN_CONDITIONS.has(normalizedCondition)) {
    throw new Error("Select a valid return condition.");
  }
  return normalizedCondition === "broken" ? 0 : qty;
}

function sortReturnsByOccurredAt(items) {
  return [...items].sort((a, b) => {
    const byDate = new Date(a.occurredAt) - new Date(b.occurredAt);
    if (byDate !== 0) {
      return byDate;
    }
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function buildMaterialBaseQuantityMapForReturns(currentMaterials, currentReturns) {
  const addedByMaterial = new Map();
  currentReturns.forEach((item) => {
    const materialId = Number(item.materialId);
    if (!materialId) {
      return;
    }
    const added = Number(item.stockAdded);
    let fallbackAdded = 0;
    if (Number.isFinite(added)) {
      fallbackAdded = added;
    } else {
      try {
        fallbackAdded = getReturnStockAdded(item.condition, item.quantity);
      } catch {
        fallbackAdded = 0;
      }
    }
    const current = addedByMaterial.get(materialId) || 0;
    addedByMaterial.set(materialId, current + fallbackAdded);
  });

  const baseMap = new Map();
  currentMaterials.forEach((material) => {
    const materialId = Number(material.id);
    const currentQty = Number(material.quantity) || 0;
    const totalAdded = addedByMaterial.get(materialId) || 0;
    baseMap.set(materialId, currentQty - totalAdded);
  });
  return baseMap;
}

function normalizeReturnForSave(item, material, runningQty) {
  const quantity = Number(item.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error("Returned quantity must be a whole number greater than zero.");
  }
  let condition = sanitize(item.condition).toLowerCase();
  if (!RETURN_CONDITIONS.has(condition)) {
    condition = "broken";
  }
  const stockAdded = getReturnStockAdded(condition, quantity);
  const nextQty = runningQty + stockAdded;
  if (nextQty < 0) {
    throw new Error(`Return change results in negative stock for ${material.code}.`);
  }

  return {
    ...item,
    materialId: Number(material.id),
    materialCode: material.code,
    materialName: material.name,
    materialSpecification: sanitize(material.specification),
    materialPhotoDataUrl: normalizePhotoData(material.photoDataUrl),
    condition,
    quantity,
    stockAdded,
    stockAfter: nextQty,
    unit: material.unit,
    note: sanitize(item.note)
  };
}

async function saveReturnsAndRebuildStocks(nextReturns) {
  const materialsMap = new Map(state.materials.map((material) => [Number(material.id), { ...material }]));
  const baseQtyMap = buildMaterialBaseQuantityMapForReturns(state.materials, state.returns);
  const runningQtyMap = new Map(baseQtyMap);
  const sorted = sortReturnsByOccurredAt(nextReturns);
  const normalizedReturns = [];

  for (const item of sorted) {
    const materialId = Number(item.materialId);
    const material = materialsMap.get(materialId);
    if (!material) {
      throw new Error("Selected material was not found.");
    }
    const runningQty = runningQtyMap.get(materialId) || 0;
    const normalized = normalizeReturnForSave(item, material, runningQty);
    runningQtyMap.set(materialId, normalized.stockAfter);
    normalizedReturns.push(normalized);
  }

  return new Promise((resolve, reject) => {
    let failed = false;
    const tx = state.db.transaction([MATERIALS_STORE, RETURNS_STORE], "readwrite");
    const materialsStore = tx.objectStore(MATERIALS_STORE);
    const returnsStore = tx.objectStore(RETURNS_STORE);
    const now = new Date().toISOString();

    function fail(message) {
      if (failed) {
        return;
      }
      failed = true;
      try {
        tx.abort();
      } catch {
        // Ignore abort errors.
      }
      reject(new Error(message));
    }

    tx.onerror = () => {
      if (!failed) {
        reject(tx.error || new Error("Failed to update return history."));
      }
    };

    tx.oncomplete = () => resolve();

    materialsMap.forEach((material, materialId) => {
      const nextQty = runningQtyMap.get(materialId);
      const quantity = Number.isFinite(nextQty) ? nextQty : Number(material.quantity) || 0;
      materialsStore.put({
        ...material,
        quantity,
        updatedAt: now
      });
    });

    returnsStore.clear().onsuccess = () => {
      normalizedReturns.forEach((item) => {
        const saveReq = returnsStore.put(item);
        saveReq.onerror = () => fail("Failed to update return history.");
      });
    };
  });
}

async function startEditingReturn(id) {
  if (!ensureCanManageInventory(el.returnMessage, "Guest account is view-only.")) {
    return;
  }
  const item = state.returns.find((entry) => Number(entry.id) === Number(id));
  if (!item) {
    setMessage(el.returnMessage, "Return record not found.", "error");
    await reloadReturns();
    return;
  }

  el.returnId.value = String(item.id);
  el.returnMaterial.value = String(item.materialId);
  el.returnCondition.value = sanitize(item.condition).toLowerCase();
  el.returnQuantity.value = String(item.quantity);
  el.returnNote.value = item.note || "";
  setReturnConditionOnlyEditMode(true);
  el.saveReturnBtn.textContent = "Update Return";
  el.cancelReturnEditBtn.classList.remove("hidden");
  setMessage(el.returnMessage, "Editing return record. Only material condition can be changed.", "");
}

async function deleteReturnHistory(id) {
  if (!ensureSuperAdminAccess(el.returnMessage, "Admin account is not allowed to delete returned materials.")) {
    return;
  }

  const returnId = Number(id);
  if (!returnId) {
    return;
  }

  const confirmed = window.confirm("Delete this return record?");
  if (!confirmed) {
    return;
  }

  const nextReturns = state.returns.filter((item) => Number(item.id) !== returnId);
  if (nextReturns.length === state.returns.length) {
    setMessage(el.returnMessage, "Return record not found.", "error");
    return;
  }

  await saveReturnsAndRebuildStocks(nextReturns);
  await reloadInventory();
  await reloadReturns();
  resetReturnForm();
  setMessage(el.returnMessage, "Return record deleted.", "success");
}

async function applyStockTransaction({ materialId, type, quantity, note, user }) {
  return new Promise((resolve, reject) => {
    let failed = false;
    const tx = state.db.transaction([MATERIALS_STORE, TRANSACTIONS_STORE], "readwrite");
    const materials = tx.objectStore(MATERIALS_STORE);
    const transactions = tx.objectStore(TRANSACTIONS_STORE);
    const materialReq = materials.get(materialId);

    function fail(message) {
      if (failed) {
        return;
      }
      failed = true;
      try {
        tx.abort();
      } catch {
        // Ignore abort errors.
      }
      reject(new Error(message));
    }

    materialReq.onerror = () => fail("Failed to read selected material.");
    materialReq.onsuccess = () => {
      const material = materialReq.result;
      if (!material) {
        fail("Selected material was not found.");
        return;
      }

      const currentQty = Number(material.quantity) || 0;
      const delta = Number(quantity);
      if (!Number.isFinite(delta) || delta <= 0 || !Number.isInteger(delta)) {
        fail("Quantity must be a whole number greater than zero.");
        return;
      }
      if (type === "outbound" && delta > currentQty) {
        fail("Outbound quantity exceeds available stock.");
        return;
      }

      const nextQty = type === "inbound" ? currentQty + delta : currentQty - delta;
      const now = new Date().toISOString();
      const updatedMaterial = {
        ...material,
        quantity: nextQty,
        updatedAt: now
      };

      materials.put(updatedMaterial);
      transactions.add({
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        materialPhotoDataUrl: normalizePhotoData(material.photoDataUrl),
        type,
        quantity: delta,
        unit: material.unit,
        stockAfter: updatedMaterial.quantity,
        note,
        createdBy: user,
        occurredAt: now
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      if (!failed) {
        reject(tx.error || new Error("Failed to save transaction."));
      }
    };
  });
}

function getTransactionDelta(tx) {
  const qty = Number(tx.quantity);
  if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
    throw new Error("Quantity must be a whole number greater than zero.");
  }
  if (tx.type !== "inbound" && tx.type !== "outbound") {
    throw new Error("Select a valid transaction type.");
  }
  return tx.type === "inbound" ? qty : -qty;
}

function sortTransactionsByOccurredAt(items) {
  return [...items].sort((a, b) => {
    const byDate = new Date(a.occurredAt) - new Date(b.occurredAt);
    if (byDate !== 0) {
      return byDate;
    }
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function buildMaterialBaseQuantityMap(currentMaterials, currentTransactions) {
  const deltasByMaterial = new Map();
  currentTransactions.forEach((tx) => {
    const materialId = Number(tx.materialId);
    if (!materialId) {
      return;
    }
    const current = deltasByMaterial.get(materialId) || 0;
    deltasByMaterial.set(materialId, current + getTransactionDelta(tx));
  });

  const baseMap = new Map();
  currentMaterials.forEach((material) => {
    const materialId = Number(material.id);
    const currentQty = Number(material.quantity) || 0;
    const totalDelta = deltasByMaterial.get(materialId) || 0;
    baseMap.set(materialId, currentQty - totalDelta);
  });
  return baseMap;
}

function normalizeTransactionForSave(tx, material, runningQty) {
  const quantity = Number(tx.quantity);
  const nextQty = tx.type === "inbound" ? runningQty + quantity : runningQty - quantity;
  if (nextQty < 0) {
    throw new Error(`Transaction change results in negative stock for ${material.code}.`);
  }

  return {
    ...tx,
    materialId: Number(material.id),
    materialCode: material.code,
    materialName: material.name,
    materialPhotoDataUrl: normalizePhotoData(material.photoDataUrl),
    unit: material.unit,
    quantity,
    note: sanitize(tx.note),
    stockAfter: nextQty
  };
}

async function saveTransactionsAndRebuildStocks(nextTransactions) {
  const materialsMap = new Map(state.materials.map((material) => [Number(material.id), { ...material }]));
  const baseQtyMap = buildMaterialBaseQuantityMap(state.materials, state.transactions);
  const runningQtyMap = new Map(baseQtyMap);
  const sorted = sortTransactionsByOccurredAt(nextTransactions);
  const normalizedTransactions = [];

  for (const tx of sorted) {
    const materialId = Number(tx.materialId);
    const material = materialsMap.get(materialId);
    if (!material) {
      throw new Error("Selected material was not found.");
    }

    getTransactionDelta(tx);
    const runningQty = runningQtyMap.get(materialId) || 0;
    const normalized = normalizeTransactionForSave(tx, material, runningQty);
    runningQtyMap.set(materialId, normalized.stockAfter);
    normalizedTransactions.push(normalized);
  }

  return new Promise((resolve, reject) => {
    let failed = false;
    const tx = state.db.transaction([MATERIALS_STORE, TRANSACTIONS_STORE], "readwrite");
    const materialsStore = tx.objectStore(MATERIALS_STORE);
    const transactionsStore = tx.objectStore(TRANSACTIONS_STORE);
    const now = new Date().toISOString();

    function fail(message) {
      if (failed) {
        return;
      }
      failed = true;
      try {
        tx.abort();
      } catch {
        // Ignore abort errors.
      }
      reject(new Error(message));
    }

    tx.onerror = () => {
      if (!failed) {
        reject(tx.error || new Error("Failed to update transaction history."));
      }
    };

    tx.oncomplete = () => resolve();

    materialsMap.forEach((material, materialId) => {
      const nextQty = runningQtyMap.get(materialId);
      const quantity = Number.isFinite(nextQty) ? nextQty : Number(material.quantity) || 0;
      materialsStore.put({
        ...material,
        quantity,
        updatedAt: now
      });
    });

    transactionsStore.clear().onsuccess = () => {
      normalizedTransactions.forEach((item) => {
        const saveReq = transactionsStore.put(item);
        saveReq.onerror = () => fail("Failed to update transaction history.");
      });
    };
  });
}

async function startEditingTransaction(id) {
  if (!ensureCanManageInventory(el.transactionMessage, "Guest account is view-only.")) {
    return;
  }
  const transaction = state.transactions.find((item) => Number(item.id) === Number(id));
  if (!transaction) {
    setMessage(el.transactionMessage, "Transaction record not found.", "error");
    await reloadTransactions();
    return;
  }

  el.transactionId.value = String(transaction.id);
  el.transactionMaterial.value = String(transaction.materialId);
  el.transactionType.value = transaction.type;
  el.transactionQuantity.value = String(transaction.quantity);
  el.transactionNote.value = transaction.note || "";
  el.saveTransactionBtn.textContent = "Update Transaction";
  el.cancelTransactionEditBtn.classList.remove("hidden");
  setMessage(el.transactionMessage, "Editing transaction. Save to apply changes.", "");
}

async function deleteTransactionHistory(id) {
  if (!ensureSuperAdminAccess(el.transactionMessage, "Admin account is not allowed to delete transaction history.")) {
    return;
  }
  const transactionId = Number(id);
  if (!transactionId) {
    return;
  }

  const confirmed = window.confirm("Delete this transaction history entry?");
  if (!confirmed) {
    return;
  }

  const nextTransactions = state.transactions.filter((item) => Number(item.id) !== transactionId);
  if (nextTransactions.length === state.transactions.length) {
    setMessage(el.transactionMessage, "Transaction record not found.", "error");
    return;
  }

  await saveTransactionsAndRebuildStocks(nextTransactions);
  await reloadInventory();
  await reloadTransactions();
  resetTransactionForm();
  setMessage(el.transactionMessage, "Transaction history deleted.", "success");
}

function getCodeNumber(code) {
  const match = /^BBP(\d+)$/i.exec(sanitize(code));
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function formatCode(number) {
  return `${CODE_PREFIX}${String(number).padStart(CODE_PADDING, "0")}`;
}

async function generateNextMaterialCode() {
  const materials = await getAllMaterials();
  const usedCodes = new Set(materials.map((m) => sanitize(m.code).toUpperCase()).filter(Boolean));
  let maxNumber = 0;

  usedCodes.forEach((code) => {
    const n = getCodeNumber(code);
    if (n && n > maxNumber) {
      maxNumber = n;
    }
  });

  let candidateNumber = maxNumber > 0 ? maxNumber + 1 : 1;
  let candidateCode = formatCode(candidateNumber);
  while (usedCodes.has(candidateCode)) {
    candidateNumber += 1;
    candidateCode = formatCode(candidateNumber);
  }

  return candidateCode;
}

function populateNextCode() {
  if (state.editingId) {
    return;
  }
  generateNextMaterialCode()
    .then((nextCode) => {
      if (!state.editingId) {
        document.getElementById("code").value = nextCode;
      }
    })
    .catch(() => {});
}

function formatDate(iso) {
  if (!iso) {
    return "-";
  }
  return new Date(iso).toLocaleString();
}

function formatReturnCondition(condition) {
  const value = sanitize(condition).toLowerCase();
  if (value === "good") {
    return "Good";
  }
  if (value === "broken") {
    return "Broken";
  }
  if (value === "repaired") {
    return "Repaired";
  }
  return sanitize(condition) || "-";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function showAuth(showSetup) {
  el.authSection.classList.remove("hidden");
  el.inventorySection.classList.add("hidden");
  el.setupForm.classList.toggle("hidden", !showSetup);
  el.loginForm.classList.toggle("hidden", showSetup);
  setMessage(el.authMessage, showSetup ? "No account found. Create the first super admin account." : "", "");
}

function showInventory() {
  el.authSection.classList.add("hidden");
  el.inventorySection.classList.remove("hidden");
  const viewOnlySuffix = isGuestUser() ? " (view only)" : "";
  el.activeUserLabel.textContent = `User: ${state.currentUser.username}${viewOnlySuffix}`;
  updateAccessControlUI();
  switchTab("materials");
  hideAccountPanel();
}

function hideAccountPanel() {
  el.accountPanel.classList.add("hidden");
  el.accountForm.reset();
  if (el.superAdminViewUsername) {
    el.superAdminViewUsername.value = "";
  }
  if (el.superAdminViewPassword) {
    el.superAdminViewPassword.value = "";
  }
  if (el.createAdminForm) {
    el.createAdminForm.reset();
  }
  setMessage(el.accountMessage, "", "");
  if (el.createAdminMessage) {
    setMessage(el.createAdminMessage, "", "");
  }
  if (el.adminAccountsPanel) {
    el.adminAccountsPanel.classList.add("hidden");
  }
}

function renderSuperAdminCredentials(user) {
  if (!el.superAdminCredentialsPanel || !el.superAdminViewUsername || !el.superAdminViewPassword) {
    return;
  }
  if (!isSuperAdmin()) {
    el.superAdminCredentialsPanel.classList.add("hidden");
    return;
  }
  el.superAdminCredentialsPanel.classList.remove("hidden");
  const accountUser = user ? toUserWithRole(user) : state.currentUser;
  const username = sanitize(accountUser?.username) || "-";
  const password = sanitize(accountUser?.passwordPlain) || "Unavailable (reset required)";
  el.superAdminViewUsername.value = username;
  el.superAdminViewPassword.value = password;
}

function renderAdminAccountsList(adminUsers) {
  if (!el.adminAccountsList) {
    return;
  }
  if (!Array.isArray(adminUsers) || adminUsers.length === 0) {
    el.adminAccountsList.innerHTML = "<li class=\"muted\">No admin accounts found.</li>";
    return;
  }

  const rows = [...adminUsers].sort((a, b) => sanitize(a.username).localeCompare(sanitize(b.username)));
  el.adminAccountsList.innerHTML = rows.map((user) => {
    const userId = Number(user.id) || 0;
    const username = escapeHtml(user.username || "-");
    const created = formatDate(user.createdAt);
    const passwordDisplay = sanitize(user.passwordPlain) || "Unavailable (reset required)";
    return `
      <li>
        <strong>${username}</strong>
        <span class="muted">Created: ${escapeHtml(created)}</span>
        <span class="muted">Password: ${escapeHtml(passwordDisplay)}</span>
        <div class="row-actions">
          <button type="button" class="btn-ghost" data-admin-action="edit-account" data-id="${userId}">Edit</button>
          <button type="button" class="danger" data-admin-action="delete-account" data-id="${userId}">Delete</button>
        </div>
      </li>
    `;
  }).join("");
}

async function refreshAdminAccountsPanel() {
  if (!el.adminAccountsPanel) {
    return;
  }
  if (!isSuperAdmin()) {
    el.adminAccountsPanel.classList.add("hidden");
    return;
  }

  el.adminAccountsPanel.classList.remove("hidden");
  try {
    const adminUsers = await getUsersByRole(ROLE_ADMIN);
    renderAdminAccountsList(adminUsers);
  } catch {
    el.adminAccountsList.innerHTML = "<li class=\"msg error\">Failed to load admin accounts.</li>";
  }
}

async function resetAdminPassword(id) {
  if (!ensureSuperAdminAccess(el.createAdminMessage, "Only super admin can reset admin passwords.")) {
    return;
  }

  const userId = Number(id);
  if (!userId) {
    setMessage(el.createAdminMessage, "Invalid admin account.", "error");
    return;
  }

  const adminUser = await getUserById(userId);
  if (!adminUser || normalizeUserRole(adminUser.role) !== ROLE_ADMIN) {
    setMessage(el.createAdminMessage, "Admin account not found.", "error");
    return;
  }

  const newPassword = window.prompt(`Enter new password for ${adminUser.username} (min 6 characters):`, "");
  if (newPassword === null) {
    return;
  }
  if (newPassword.length < 6) {
    setMessage(el.createAdminMessage, "Password must be at least 6 characters.", "error");
    return;
  }

  const confirmPassword = window.prompt(`Confirm new password for ${adminUser.username}:`, "");
  if (confirmPassword === null) {
    return;
  }
  if (newPassword !== confirmPassword) {
    setMessage(el.createAdminMessage, "Password and confirmation do not match.", "error");
    return;
  }

  const passwordSalt = randomSalt();
  const passwordHash = await hashPassword(newPassword, passwordSalt);
  await updateUser({
    ...adminUser,
    role: normalizeUserRole(adminUser.role),
    passwordSalt,
    passwordHash,
    passwordPlain: newPassword,
    updatedAt: new Date().toISOString()
  });
  await refreshAdminAccountsPanel();
  setMessage(el.createAdminMessage, `Password updated for admin "${adminUser.username}".`, "success");
}

async function viewAdminPassword(id) {
  if (!ensureSuperAdminAccess(el.createAdminMessage, "Only super admin can view admin passwords.")) {
    return;
  }

  const userId = Number(id);
  if (!userId) {
    setMessage(el.createAdminMessage, "Invalid admin account.", "error");
    return;
  }

  const adminUser = await getUserById(userId);
  if (!adminUser || normalizeUserRole(adminUser.role) !== ROLE_ADMIN) {
    setMessage(el.createAdminMessage, "Admin account not found.", "error");
    return;
  }

  const plain = sanitize(adminUser.passwordPlain);
  if (!plain) {
    setMessage(el.createAdminMessage, "Password unavailable. Edit/reset this admin password first.", "error");
    return;
  }
  window.alert(`Admin: ${adminUser.username}\nPassword: ${plain}`);
}

async function editAdminAccount(id) {
  if (!ensureSuperAdminAccess(el.createAdminMessage, "Only super admin can edit admin accounts.")) {
    return;
  }

  const userId = Number(id);
  if (!userId) {
    setMessage(el.createAdminMessage, "Invalid admin account.", "error");
    return;
  }

  const adminUser = await getUserById(userId);
  if (!adminUser || normalizeUserRole(adminUser.role) !== ROLE_ADMIN) {
    setMessage(el.createAdminMessage, "Admin account not found.", "error");
    return;
  }

  const currentPassword = sanitize(adminUser.passwordPlain);
  const usernameInput = window.prompt("Edit admin username:", adminUser.username || "");
  if (usernameInput === null) {
    return;
  }
  const nextUsername = sanitize(usernameInput);
  if (!nextUsername) {
    setMessage(el.createAdminMessage, "Username is required.", "error");
    return;
  }

  const passwordPrompt = currentPassword || "";
  const nextPassword = window.prompt(
    "Edit admin password (minimum 6 chars). Leave blank to keep current password:",
    passwordPrompt
  );
  if (nextPassword === null) {
    return;
  }

  const normalizedPassword = sanitize(nextPassword);
  const shouldChangePassword = normalizedPassword.length > 0;
  if (shouldChangePassword && normalizedPassword.length < 6) {
    setMessage(el.createAdminMessage, "Password must be at least 6 characters.", "error");
    return;
  }

  let passwordSalt = adminUser.passwordSalt || "";
  let passwordHash = adminUser.passwordHash;
  let passwordPlain = sanitize(adminUser.passwordPlain);

  if (shouldChangePassword) {
    passwordSalt = randomSalt();
    passwordHash = await hashPassword(normalizedPassword, passwordSalt);
    passwordPlain = normalizedPassword;
  }

  try {
    await updateUser({
      ...adminUser,
      username: nextUsername,
      role: normalizeUserRole(adminUser.role),
      passwordSalt,
      passwordHash,
      passwordPlain,
      updatedAt: new Date().toISOString()
    });
    await refreshAdminAccountsPanel();
    setMessage(el.createAdminMessage, `Admin account "${nextUsername}" updated.`, "success");
  } catch (error) {
    if (error && error.name === "ConstraintError") {
      setMessage(el.createAdminMessage, "Username already exists.", "error");
      return;
    }
    setMessage(el.createAdminMessage, "Failed to update admin account.", "error");
  }
}

async function deleteAdminAccount(id) {
  if (!ensureSuperAdminAccess(el.createAdminMessage, "Only super admin can delete admin accounts.")) {
    return;
  }

  const userId = Number(id);
  if (!userId) {
    setMessage(el.createAdminMessage, "Invalid admin account.", "error");
    return;
  }

  const adminUser = await getUserById(userId);
  if (!adminUser || normalizeUserRole(adminUser.role) !== ROLE_ADMIN) {
    setMessage(el.createAdminMessage, "Admin account not found.", "error");
    return;
  }

  const confirmed = window.confirm(`Delete admin account "${adminUser.username}"?`);
  if (!confirmed) {
    return;
  }

  await deleteUser(userId);
  await refreshAdminAccountsPanel();
  setMessage(el.createAdminMessage, `Admin account "${adminUser.username}" deleted.`, "success");
}

async function showAccountPanel() {
  if (!isSuperAdmin()) {
    hideAccountPanel();
    setMessage(el.listMessage, "Admin account cannot access account settings.", "error");
    return;
  }

  el.accountPanel.classList.remove("hidden");
  const latestUser = state.currentUser ? await getUserById(state.currentUser.id) : null;
  if (latestUser) {
    state.currentUser = toUserWithRole(latestUser);
  }
  renderSuperAdminCredentials(state.currentUser);
  el.accountUsername.value = state.currentUser?.username || "";
  el.accountCurrentPassword.value = "";
  el.accountNewPassword.value = "";
  el.accountConfirmPassword.value = "";
  setMessage(el.accountMessage, "", "");
  if (isSuperAdmin()) {
    el.adminManagementPanel.classList.remove("hidden");
    await refreshAdminAccountsPanel();
  } else {
    el.adminManagementPanel.classList.add("hidden");
    if (el.adminAccountsPanel) {
      el.adminAccountsPanel.classList.add("hidden");
    }
  }
  if (el.createAdminMessage) {
    setMessage(el.createAdminMessage, "", "");
  }
}

function updateAccessControlUI() {
  const canManageMaterials = canManageInventory();
  const canManageTransactions = canManageInventory();
  const canManageReturns = canManageInventory();
  const canManageJson = isSuperAdmin();
  const canAccessAccountSettings = isSuperAdmin();

  el.tabAddMaterialBtn.classList.toggle("hidden", !canManageMaterials);
  if (!canManageMaterials && state.activeTab === "add") {
    switchTab("materials");
  }

  if (!canManageMaterials) {
    resetMaterialForm();
  }
  if (state.activeTab === "add" && !state.editingId) {
    applyAddQuantityAccessByRole();
  }
  document.getElementById("name").disabled = !canManageMaterials;
  document.getElementById("specification").disabled = !canManageMaterials;
  document.getElementById("category").disabled = !canManageMaterials;
  document.getElementById("unit").disabled = !canManageMaterials;
  document.getElementById("photoInput").disabled = !canManageMaterials;
  document.getElementById("clearPhotoBtn").disabled = !canManageMaterials;
  document.getElementById("saveBtn").disabled = !canManageMaterials;

  el.transactionMaterial.disabled = !canManageTransactions;
  el.transactionType.disabled = !canManageTransactions;
  el.transactionQuantity.disabled = !canManageTransactions;
  el.transactionNote.disabled = !canManageTransactions;
  el.saveTransactionBtn.disabled = !canManageTransactions;
  el.cancelTransactionEditBtn.disabled = !canManageTransactions;

  el.returnMaterial.disabled = !canManageReturns;
  el.returnCondition.disabled = !canManageReturns;
  el.returnQuantity.disabled = !canManageReturns;
  el.returnNote.disabled = !canManageReturns;
  el.saveReturnBtn.disabled = !canManageReturns;
  el.cancelReturnEditBtn.disabled = !canManageReturns;

  el.activeUserLabel.disabled = !canAccessAccountSettings;
  el.activeUserLabel.classList.toggle("btn-disabled", !canAccessAccountSettings);
  if (!canAccessAccountSettings) {
    hideAccountPanel();
  }

  el.exportBtn.disabled = !canManageJson;
  el.importInput.disabled = !canManageJson;
  if (el.importBtnLabel) {
    el.importBtnLabel.classList.toggle("btn-disabled", !canManageJson);
  }
  el.exportPdfBtn.disabled = !canManageInventory();
}

function switchTab(tabName) {
  state.activeTab = tabName;
  const showMaterials = tabName === "materials";
  const showAdd = tabName === "add";
  const showTransaction = tabName === "transaction";
  const showReturn = tabName === "return";
  const showReport = tabName === "report";
  el.materialsView.classList.toggle("hidden", !showMaterials);
  el.addMaterialView.classList.toggle("hidden", !showAdd);
  el.transactionView.classList.toggle("hidden", !showTransaction);
  el.returnView.classList.toggle("hidden", !showReturn);
  el.reportView.classList.toggle("hidden", !showReport);
  el.tabMaterialsBtn.classList.toggle("tab-btn-active", showMaterials);
  el.tabAddMaterialBtn.classList.toggle("tab-btn-active", showAdd);
  el.tabTransactionBtn.classList.toggle("tab-btn-active", showTransaction);
  el.tabReturnBtn.classList.toggle("tab-btn-active", showReturn);
  el.tabReportBtn.classList.toggle("tab-btn-active", showReport);
}

function setEditQuantityLockedMode(enabled) {
  document.getElementById("quantity").disabled = enabled;
}

function applyAddQuantityAccessByRole() {
  const quantityInput = document.getElementById("quantity");
  if (!quantityInput) {
    return;
  }
  const lockForAdmin = !isSuperAdmin();
  setEditQuantityLockedMode(lockForAdmin);
  if (lockForAdmin) {
    quantityInput.value = "0";
  }
}

function resetMaterialForm() {
  state.editingId = null;
  state.pendingPhotoDataUrl = "";
  el.materialForm.reset();
  document.getElementById("materialId").value = "";
  el.formHeading.textContent = "Add Material";
  el.cancelEditBtn.classList.add("hidden");
  applyAddQuantityAccessByRole();
  clearMaterialPhotoInput();
  setPhotoPreview("");
  populateNextCode();
}

function renderMetrics() {
  const total = state.materials.length;
  const outOfStock = state.materials.filter((m) => Number(m.quantity) <= 0).length;
  const lowStock = state.materials.filter((m) => {
    const qty = Number(m.quantity);
    return qty >= 1 && qty <= 10;
  }).length;

  el.metricTotal.textContent = String(total);
  el.metricLowStock.textContent = String(outOfStock);
  el.metricCategories.textContent = String(lowStock);
}

function renderCategoryFilter() {
  const selected = el.categoryFilter.value;
  const categories = [...new Set(state.materials.map((m) => m.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  el.categoryFilter.innerHTML = "<option value=\"\">All</option>";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    el.categoryFilter.append(option);
  });

  if (categories.includes(selected)) {
    el.categoryFilter.value = selected;
  }
}

function renderTransactionMaterialOptions() {
  const selected = el.transactionMaterial.value;
  const sortedMaterials = [...state.materials].sort((a, b) => {
    const aLabel = `${a.name} ${a.code}`.toLowerCase();
    const bLabel = `${b.name} ${b.code}`.toLowerCase();
    return aLabel.localeCompare(bLabel);
  });

  el.transactionMaterial.innerHTML = "<option value=\"\">Select material</option>";
  sortedMaterials.forEach((material) => {
    const option = document.createElement("option");
    option.value = String(material.id);
    option.textContent = `${material.code} - ${material.name} (${material.quantity} ${material.unit})`;
    el.transactionMaterial.append(option);
  });

  if (sortedMaterials.some((m) => String(m.id) === selected)) {
    el.transactionMaterial.value = selected;
  }
}

function renderReturnMaterialOptions() {
  if (!el.returnMaterial) {
    return;
  }
  const selected = el.returnMaterial.value;
  const sortedMaterials = [...state.materials].sort((a, b) => {
    const aLabel = `${a.name} ${a.code}`.toLowerCase();
    const bLabel = `${b.name} ${b.code}`.toLowerCase();
    return aLabel.localeCompare(bLabel);
  });

  el.returnMaterial.innerHTML = "<option value=\"\">Select material</option>";
  sortedMaterials.forEach((material) => {
    const option = document.createElement("option");
    option.value = String(material.id);
    option.textContent = `${material.code} - ${material.name} (${material.quantity} ${material.unit})`;
    el.returnMaterial.append(option);
  });

  if (sortedMaterials.some((m) => String(m.id) === selected)) {
    el.returnMaterial.value = selected;
  }
}

function getFilteredMaterials() {
  const search = sanitize(el.searchInput.value).toLowerCase();
  const sortBy = el.sortFilter.value;
  const category = el.categoryFilter.value;

  return state.materials
    .filter((m) => {
      const searchTarget = `${m.code} ${m.name} ${m.specification || ""} ${m.category}`.toLowerCase();
      const inSearch = !search || searchTarget.includes(search);
      const inCategory = !category || m.category === category;
      return inSearch && inCategory;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
      }
      if (sortBy === "stock_asc") {
        const qtyDiff = (Number(a.quantity) || 0) - (Number(b.quantity) || 0);
        if (qtyDiff !== 0) {
          return qtyDiff;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
      }
      if (sortBy === "stock_desc") {
        const qtyDiff = (Number(b.quantity) || 0) - (Number(a.quantity) || 0);
        if (qtyDiff !== 0) {
          return qtyDiff;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

function renderMaterialPhotoCell(material) {
  const photoDataUrl = normalizePhotoData(material.photoDataUrl);
  if (!photoDataUrl) {
    return "<span class=\"muted\">-</span>";
  }
  return `<img src="${escapeHtml(photoDataUrl)}" alt="${escapeHtml(material.name || material.code)} photo" class="material-photo-thumb">`;
}

function renderTransactionPhotoCell(transaction) {
  const storedPhoto = normalizePhotoData(transaction.materialPhotoDataUrl);
  const liveMaterialPhoto = normalizePhotoData(
    state.materials.find((m) => m.id === transaction.materialId)?.photoDataUrl
  );
  const photoDataUrl = storedPhoto || liveMaterialPhoto;
  if (!photoDataUrl) {
    return "<span class=\"muted\">-</span>";
  }
  return `<img src="${escapeHtml(photoDataUrl)}" alt="${escapeHtml(transaction.materialName || transaction.materialCode)} photo" class="material-photo-thumb">`;
}

function renderMaterials() {
  const rows = getFilteredMaterials();
  const canEditMaterials = canManageInventory();
  const canDeleteMaterials = isSuperAdmin();
  if (!rows.length) {
    el.materialsBody.innerHTML = "<tr><td colspan=\"8\" class=\"muted\">No materials found.</td></tr>";
    return;
  }

  el.materialsBody.innerHTML = rows.map((m) => {
    const qty = Number(m.quantity);
    const isOutOfStock = qty <= 0;
    const isLowStock = qty >= 1 && qty <= 10;
    const rowClass = isOutOfStock ? "stock-row-out" : (isLowStock ? "stock-row-low" : "");
    const stockClass = isOutOfStock ? "stock-low" : (isLowStock ? "stock-warn" : "");
    return `
      <tr class="${rowClass}">
        <td>${escapeHtml(m.code)}</td>
        <td>${renderMaterialPhotoCell(m)}</td>
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(m.specification || "-")}</td>
        <td>${escapeHtml(m.category)}</td>
        <td class="${stockClass}">${escapeHtml(m.quantity)} ${escapeHtml(m.unit)}</td>
        <td>${formatDate(m.updatedAt)}</td>
        <td>
          ${canEditMaterials ? `
          <div class="row-actions">
            <button type="button" class="btn-ghost" data-action="edit" data-id="${m.id}">Edit</button>
            ${canDeleteMaterials ? `<button type="button" class="danger" data-action="delete" data-id="${m.id}">Delete</button>` : ""}
          </div>
          ` : "<span class=\"muted\">View only</span>"}
        </td>
      </tr>
    `;
  }).join("");
}

function renderTransactions() {
  const rows = [...state.transactions].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  const canEditTransactions = canManageInventory();
  const canDeleteTransactions = isSuperAdmin();
  if (!rows.length) {
    el.transactionsBody.innerHTML = "<tr><td colspan=\"9\" class=\"muted\">No transactions yet.</td></tr>";
    return;
  }

  el.transactionsBody.innerHTML = rows.map((t) => {
    const typeLabel = t.type === "inbound" ? "Inbound" : "Outbound";
    const typeClass = t.type === "inbound" ? "txn-inbound" : "txn-outbound";
    return `
      <tr>
        <td>${formatDate(t.occurredAt)}</td>
        <td>${renderTransactionPhotoCell(t)}</td>
        <td>${escapeHtml(t.materialCode)} - ${escapeHtml(t.materialName)}</td>
        <td><span class="txn-pill ${typeClass}">${typeLabel}</span></td>
        <td>${escapeHtml(t.quantity)} ${escapeHtml(t.unit || "")}</td>
        <td>${escapeHtml(t.stockAfter)} ${escapeHtml(t.unit || "")}</td>
        <td>${escapeHtml(t.note || "-")}</td>
        <td>${escapeHtml(t.createdBy || "-")}</td>
        <td>
          ${canEditTransactions ? `
          <div class="row-actions">
            <button type="button" class="btn-ghost" data-txn-action="edit" data-id="${t.id}">Edit</button>
            ${canDeleteTransactions
              ? `<button type="button" class="danger" data-txn-action="delete" data-id="${t.id}">Delete</button>`
              : ""
            }
          </div>
          ` : "<span class=\"muted\">View only</span>"}
        </td>
      </tr>
    `;
  }).join("");
}

function renderReturns() {
  const rows = [...state.returns].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  const canEditReturns = canManageInventory();
  const canDeleteReturns = isSuperAdmin();
  if (!rows.length) {
    el.returnsBody.innerHTML = "<tr><td colspan=\"9\" class=\"muted\">No returned materials yet.</td></tr>";
    return;
  }

  el.returnsBody.innerHTML = rows.map((item) => {
    const quantity = Number(item.quantity);
    const qtyLabel = Number.isFinite(quantity) && Number.isInteger(quantity) && quantity > 0
      ? `${quantity} ${escapeHtml(item.unit || "")}`.trim()
      : "-";
    return `
      <tr>
        <td>${formatDate(item.occurredAt)}</td>
        <td>${renderTransactionPhotoCell(item)}</td>
        <td>${escapeHtml(item.materialCode || "-")} - ${escapeHtml(item.materialName || "-")}</td>
        <td>${escapeHtml(item.materialSpecification || "-")}</td>
        <td>${escapeHtml(formatReturnCondition(item.condition))}</td>
        <td>${qtyLabel}</td>
        <td>${escapeHtml(item.note || "-")}</td>
        <td>${escapeHtml(item.createdBy || "-")}</td>
        <td>
          ${canEditReturns ? `
          <div class="row-actions">
            <button type="button" class="btn-ghost" data-return-action="edit" data-id="${item.id}">Edit</button>
            ${canDeleteReturns
              ? `<button type="button" class="danger" data-return-action="delete" data-id="${item.id}">Delete</button>`
              : ""
            }
          </div>
          ` : "<span class=\"muted\">View only</span>"}
        </td>
      </tr>
    `;
  }).join("");
}

function buildReportData() {
  const materials = [...state.materials].sort((a, b) => sanitize(a.code).localeCompare(sanitize(b.code)));
  const materialById = new Map(materials.map((material) => [Number(material.id), material]));
  const totalsByMaterial = new Map();
  const inboundRows = [];
  const outboundRows = [];
  let inboundTotal = 0;
  let outboundTotal = 0;

  const sortedTransactions = [...state.transactions].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  sortedTransactions.forEach((txn) => {
    const qty = Number(txn.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return;
    }

    const materialId = Number(txn.materialId);
    const material = materialById.get(materialId);
    if (materialId && material) {
      if (!totalsByMaterial.has(materialId)) {
        totalsByMaterial.set(materialId, { inbound: 0, outbound: 0 });
      }
      const totals = totalsByMaterial.get(materialId);
      if (txn.type === "inbound") {
        totals.inbound += qty;
      }
      if (txn.type === "outbound") {
        totals.outbound += qty;
      }
    }

    if (txn.type === "inbound") {
      inboundTotal += qty;
    }
    if (txn.type === "outbound") {
      outboundTotal += qty;
    }

    const row = {
      date: txn.occurredAt,
      code: txn.materialCode || material?.code || "-",
      name: txn.materialName || material?.name || "-",
      specification: material?.specification || "-",
      quantity: qty,
      unit: txn.unit || material?.unit || "",
      note: txn.note || "-",
      by: txn.createdBy || "-",
      photoDataUrl: normalizePhotoData(txn.materialPhotoDataUrl) || normalizePhotoData(material?.photoDataUrl)
    };
    if (txn.type === "inbound") {
      inboundRows.push(row);
    }
    if (txn.type === "outbound") {
      outboundRows.push(row);
    }
  });

  const allStockRows = materials.map((material) => {
    const totals = totalsByMaterial.get(Number(material.id)) || { inbound: 0, outbound: 0 };
    return {
      code: material.code,
      name: material.name,
      specification: material.specification || "-",
      stock: Number(material.quantity) || 0,
      unit: material.unit,
      inbound: totals.inbound,
      outbound: totals.outbound,
      photoDataUrl: normalizePhotoData(material.photoDataUrl)
    };
  });
  const lowStockRows = allStockRows.filter((row) => row.stock >= 1 && row.stock <= 10);
  const outOfStockRows = allStockRows.filter((row) => row.stock <= 0);
  const stockRows = allStockRows.filter((row) => row.stock > 10);

  return {
    summary: {
      totalMaterials: allStockRows.length,
      inboundTotal,
      outboundTotal
    },
    stockRows,
    lowStockRows,
    outOfStockRows,
    inboundRows,
    outboundRows
  };
}

function renderReportStockTable(bodyNode, rows, emptyMessage) {
  if (!rows.length) {
    bodyNode.innerHTML = `<tr><td colspan="5" class="muted">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  bodyNode.innerHTML = rows.map((row) => {
    const material = {
      code: row.code,
      name: row.name,
      photoDataUrl: row.photoDataUrl
    };
    return `
      <tr>
        <td>${escapeHtml(row.code)}</td>
        <td>${renderMaterialPhotoCell(material)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.specification || "-")}</td>
        <td>${escapeHtml(row.stock)} ${escapeHtml(row.unit)}</td>
      </tr>
    `;
  }).join("");
}

function renderReportTransactionTable(bodyNode, rows, emptyMessage) {
  if (!rows.length) {
    bodyNode.innerHTML = `<tr><td colspan="8" class="muted">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  bodyNode.innerHTML = rows.map((row) => {
    const material = {
      code: row.code,
      name: row.name,
      photoDataUrl: row.photoDataUrl
    };
    return `
      <tr>
        <td>${formatDate(row.date)}</td>
        <td>${renderMaterialPhotoCell(material)}</td>
        <td>${escapeHtml(row.code)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.specification || "-")}</td>
        <td>${escapeHtml(row.quantity)} ${escapeHtml(row.unit)}</td>
        <td>${escapeHtml(row.note || "-")}</td>
        <td>${escapeHtml(row.by)}</td>
      </tr>
    `;
  }).join("");
}

function renderReport() {
  const reportData = buildReportData();
  el.reportTotalMaterials.textContent = String(reportData.summary.totalMaterials);
  el.reportInboundTotal.textContent = String(reportData.summary.inboundTotal);
  el.reportOutboundTotal.textContent = String(reportData.summary.outboundTotal);

  renderReportStockTable(el.reportStockBody, reportData.stockRows, "No materials found.");
  renderReportStockTable(el.reportLowStockBody, reportData.lowStockRows, "No low stock materials found.");
  renderReportStockTable(el.reportOutOfStockBody, reportData.outOfStockRows, "No out of stock materials found.");
  renderReportTransactionTable(el.reportInboundBody, reportData.inboundRows, "No inbound transactions found.");
  renderReportTransactionTable(el.reportOutboundBody, reportData.outboundRows, "No outbound transactions found.");
}

function getPdfReportSections(reportData, type) {
  const selected = type === "stock"
    || type === "low_stock"
    || type === "out_of_stock"
    || type === "inbound"
    || type === "outbound"
    ? type
    : "all";
  const stockSection = {
    title: "Materials Current Stock",
    rows: reportData.stockRows,
    emptyMessage: "No materials found.",
    columns: [
      { label: "Code", render: (row) => escapeHtml(row.code) },
      { label: "Photo", render: (row) => row.photoDataUrl ? `<img src="${escapeHtml(row.photoDataUrl)}" alt="${escapeHtml(row.name)} photo" class="pdf-photo">` : "-" },
      { label: "Material", render: (row) => escapeHtml(row.name) },
      { label: "Specification", render: (row) => escapeHtml(row.specification || "-") },
      { label: "Stock", render: (row) => `${escapeHtml(row.stock)} ${escapeHtml(row.unit)}` }
    ]
  };
  const lowStockSection = {
    title: "Low Stock Materials",
    rows: reportData.lowStockRows,
    emptyMessage: "No low stock materials found.",
    columns: [
      { label: "Code", render: (row) => escapeHtml(row.code) },
      { label: "Photo", render: (row) => row.photoDataUrl ? `<img src="${escapeHtml(row.photoDataUrl)}" alt="${escapeHtml(row.name)} photo" class="pdf-photo">` : "-" },
      { label: "Material", render: (row) => escapeHtml(row.name) },
      { label: "Specification", render: (row) => escapeHtml(row.specification || "-") },
      { label: "Stock", render: (row) => `${escapeHtml(row.stock)} ${escapeHtml(row.unit)}` }
    ]
  };
  const outOfStockSection = {
    title: "Out of Stock Materials",
    rows: reportData.outOfStockRows,
    emptyMessage: "No out of stock materials found.",
    columns: [
      { label: "Code", render: (row) => escapeHtml(row.code) },
      { label: "Photo", render: (row) => row.photoDataUrl ? `<img src="${escapeHtml(row.photoDataUrl)}" alt="${escapeHtml(row.name)} photo" class="pdf-photo">` : "-" },
      { label: "Material", render: (row) => escapeHtml(row.name) },
      { label: "Specification", render: (row) => escapeHtml(row.specification || "-") },
      { label: "Stock", render: (row) => `${escapeHtml(row.stock)} ${escapeHtml(row.unit)}` }
    ]
  };
  const inboundSection = {
    title: "Inbound Materials Report",
    rows: reportData.inboundRows,
    emptyMessage: "No inbound transactions found.",
    columns: [
      { label: "Date", render: (row) => escapeHtml(formatDate(row.date)) },
      { label: "Photo", render: (row) => row.photoDataUrl ? `<img src="${escapeHtml(row.photoDataUrl)}" alt="${escapeHtml(row.name)} photo" class="pdf-photo">` : "-" },
      { label: "Code", render: (row) => escapeHtml(row.code) },
      { label: "Material", render: (row) => escapeHtml(row.name) },
      { label: "Specification", render: (row) => escapeHtml(row.specification || "-") },
      { label: "Quantity", render: (row) => `${escapeHtml(row.quantity)} ${escapeHtml(row.unit)}` },
      { label: "Note", render: (row) => escapeHtml(row.note || "-") },
      { label: "By", render: (row) => escapeHtml(row.by) }
    ]
  };
  const outboundSection = {
    title: "Outbound Materials Report",
    rows: reportData.outboundRows,
    emptyMessage: "No outbound transactions found.",
    columns: [
      { label: "Date", render: (row) => escapeHtml(formatDate(row.date)) },
      { label: "Photo", render: (row) => row.photoDataUrl ? `<img src="${escapeHtml(row.photoDataUrl)}" alt="${escapeHtml(row.name)} photo" class="pdf-photo">` : "-" },
      { label: "Code", render: (row) => escapeHtml(row.code) },
      { label: "Material", render: (row) => escapeHtml(row.name) },
      { label: "Specification", render: (row) => escapeHtml(row.specification || "-") },
      { label: "Quantity", render: (row) => `${escapeHtml(row.quantity)} ${escapeHtml(row.unit)}` },
      { label: "Note", render: (row) => escapeHtml(row.note || "-") },
      { label: "By", render: (row) => escapeHtml(row.by) }
    ]
  };

  if (selected === "stock") {
    return [stockSection];
  }
  if (selected === "low_stock") {
    return [lowStockSection];
  }
  if (selected === "out_of_stock") {
    return [outOfStockSection];
  }
  if (selected === "inbound") {
    return [inboundSection];
  }
  if (selected === "outbound") {
    return [outboundSection];
  }
  return [stockSection, lowStockSection, outOfStockSection, inboundSection, outboundSection];
}

function exportReportPdf() {
  const reportData = buildReportData();
  const selectedType = el.reportExportType.value;
  const sections = getPdfReportSections(reportData, selectedType);
  const hasData = sections.some((section) => section.rows.length > 0);
  if (!hasData) {
    setMessage(el.reportMessage, "No report data available for selected export type.", "error");
    return;
  }

  const generatedAt = new Date().toLocaleString();
  const summary = reportData.summary;
  const reportTitleMap = {
    all: "All Reports",
    stock: "Materials Current Stock",
    low_stock: "Low Stock Materials",
    out_of_stock: "Out of Stock Materials",
    inbound: "Inbound Materials Report",
    outbound: "Outbound Materials Report"
  };
  const titleKey = selectedType in reportTitleMap ? selectedType : "all";
  const title = `Hi-Seas ${reportTitleMap[titleKey]}`;
  const pdfLogoPath = "photo/hiseaslogo.png";

  const sectionHtml = sections.map((section) => {
    const headingCells = section.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
    const bodyRows = section.rows.length
      ? section.rows.map((row) => {
        const cells = section.columns.map((column) => `<td>${column.render(row)}</td>`).join("");
        return `<tr>${cells}</tr>`;
      }).join("")
      : `<tr><td colspan="${section.columns.length}" class="pdf-empty">${escapeHtml(section.emptyMessage)}</td></tr>`;

    return `
      <section class="pdf-section">
        <h2>${escapeHtml(section.title)}</h2>
        <table>
          <thead><tr>${headingCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </section>
    `;
  }).join("");

  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 20px; color: #1f2329; }
    .pdf-brand { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .pdf-brand-logo { width: 56px; height: 56px; object-fit: contain; flex: 0 0 auto; }
    .pdf-brand-text { min-width: 0; }
    h1 { margin: 0 0 4px; font-size: 20px; }
    h2 { margin: 0 0 8px; font-size: 16px; }
    .meta { margin: 0; color: #4b5563; font-size: 12px; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
    .summary div { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px; }
    .summary p { margin: 0; font-size: 11px; color: #6b7280; }
    .summary strong { display: inline-block; margin-top: 4px; font-size: 18px; }
    .pdf-section { margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: middle; }
    th { background: #f3f4f6; }
    .pdf-photo { width: 42px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid #d1d5db; display: block; }
    .pdf-empty { color: #6b7280; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <header class="pdf-brand">
    <img src="${escapeHtml(pdfLogoPath)}" alt="Hi-Seas logo" class="pdf-brand-logo">
    <div class="pdf-brand-text">
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">Generated: ${escapeHtml(generatedAt)}</p>
    </div>
  </header>
  <section class="summary">
    <div><p>Materials</p><strong>${escapeHtml(summary.totalMaterials)}</strong></div>
    <div><p>Total Inbound</p><strong>${escapeHtml(summary.inboundTotal)}</strong></div>
    <div><p>Total Outbound</p><strong>${escapeHtml(summary.outboundTotal)}</strong></div>
  </section>
  ${sectionHtml}
</body>
</html>`;

  openReportPdfPreview(previewHtml);
  setMessage(el.reportMessage, "PDF preview opened. Use Print / Save as PDF.", "success");
}

async function reloadInventory() {
  state.materials = await getAllMaterials();
  renderMetrics();
  renderCategoryFilter();
  renderTransactionMaterialOptions();
  renderReturnMaterialOptions();
  renderMaterials();
  renderReport();
}

async function reloadTransactions() {
  if (state.historyDb) {
    await syncTransactionsHistoryDb();
  }
  state.transactions = await getAllTransactions();
  renderTransactions();
  renderReport();
}

async function reloadReturns() {
  if (state.historyDb) {
    await syncReturnsHistoryDb();
  }
  state.returns = await getAllReturns();
  renderReturns();
}

async function handleSetupSubmit(event) {
  event.preventDefault();
  const username = sanitize(document.getElementById("setupUsername").value);
  const password = document.getElementById("setupPassword").value;
  if (username.length < 3 || password.length < 6) {
    setMessage(el.authMessage, "Username must be at least 3 chars and password at least 6 chars.", "error");
    return;
  }

  try {
    const passwordSalt = randomSalt();
    const passwordHash = await hashPassword(password, passwordSalt);
    await createUser(username, passwordHash, passwordSalt, ROLE_SUPER_ADMIN, password);
    showAuth(false);
    setMessage(el.authMessage, "Super admin account created. You can now log in.", "success");
    el.setupForm.reset();
  } catch (error) {
    if (error && error.name === "ConstraintError") {
      setMessage(el.authMessage, "Username already exists.", "error");
      return;
    }
    setMessage(el.authMessage, "Failed to create account.", "error");
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const username = sanitize(document.getElementById("loginUsername").value);
  const password = document.getElementById("loginPassword").value;
  if (!username || !password) {
    setMessage(el.authMessage, "Enter username and password.", "error");
    return;
  }

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      setMessage(el.authMessage, "Invalid username or password.", "error");
      return;
    }
    const salt = user.passwordSalt || "";
    const passwordHash = salt ? await hashPassword(password, salt) : await sha256(password);
    if (passwordHash !== user.passwordHash) {
      setMessage(el.authMessage, "Invalid username or password.", "error");
      return;
    }

    state.currentUser = toUserWithRole(user);
    localStorage.setItem(SESSION_KEY, user.username);
    showInventory();
    await reloadInventory();
    await reloadTransactions();
    await reloadReturns();
    setMessage(el.authMessage, "", "");
    el.loginForm.reset();
  } catch {
    setMessage(el.authMessage, "Login failed.", "error");
  }
}

async function enterGuestMode() {
  state.currentUser = {
    id: 0,
    username: "guest",
    role: ROLE_GUEST,
    createdAt: new Date().toISOString()
  };
  localStorage.removeItem(SESSION_KEY);
  showInventory();
  await reloadInventory();
  await reloadTransactions();
  await reloadReturns();
  setMessage(el.authMessage, "", "");
  el.loginForm.reset();
}

async function handleAccountSubmit(event) {
  event.preventDefault();
  setMessage(el.accountMessage, "", "");
  if (!ensureSuperAdminAccess(el.accountMessage, "Only super admin can access account settings.")) {
    return;
  }

  try {
    if (!state.currentUser) {
      setMessage(el.accountMessage, "No active user session.", "error");
      return;
    }

    const username = sanitize(el.accountUsername.value);
    const currentPassword = el.accountCurrentPassword.value;
    const newPassword = el.accountNewPassword.value;
    const confirmPassword = el.accountConfirmPassword.value;

    if (username.length < 3) {
      setMessage(el.accountMessage, "Username must be at least 3 characters.", "error");
      return;
    }
    if (!currentPassword) {
      setMessage(el.accountMessage, "Current password is required.", "error");
      return;
    }
    if ((newPassword || confirmPassword) && newPassword.length < 6) {
      setMessage(el.accountMessage, "New password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage(el.accountMessage, "New password and confirmation do not match.", "error");
      return;
    }

    const latestUser = await getUserById(state.currentUser.id);
    if (!latestUser) {
      setMessage(el.accountMessage, "User account no longer exists.", "error");
      return;
    }

    const salt = latestUser.passwordSalt || "";
    const currentHash = salt ? await hashPassword(currentPassword, salt) : await sha256(currentPassword);
    if (currentHash !== latestUser.passwordHash) {
      setMessage(el.accountMessage, "Current password is incorrect.", "error");
      return;
    }

    let passwordSalt = latestUser.passwordSalt || "";
    let passwordHash = latestUser.passwordHash;
    let passwordPlain = sanitize(latestUser.passwordPlain);
    if (newPassword) {
      passwordSalt = randomSalt();
      passwordHash = await hashPassword(newPassword, passwordSalt);
      passwordPlain = newPassword;
    }

    const updatedUser = {
      ...latestUser,
      username,
      role: normalizeUserRole(latestUser.role),
      passwordSalt,
      passwordHash,
      passwordPlain,
      updatedAt: new Date().toISOString()
    };

    await updateUser(updatedUser);
    state.currentUser = toUserWithRole(updatedUser);
    localStorage.setItem(SESSION_KEY, updatedUser.username);
    el.activeUserLabel.textContent = `User: ${updatedUser.username}`;
    updateAccessControlUI();
    showAccountPanel();
    setMessage(el.accountMessage, "Account updated successfully.", "success");
  } catch (error) {
    if (error && error.name === "ConstraintError") {
      setMessage(el.accountMessage, "Username already exists.", "error");
      return;
    }
    setMessage(el.accountMessage, "Failed to update account.", "error");
  }
}

async function handleCreateAdminSubmit(event) {
  event.preventDefault();
  setMessage(el.createAdminMessage, "", "");

  if (!ensureSuperAdminAccess(el.createAdminMessage, "Only super admin can create admin accounts.")) {
    return;
  }

  const username = sanitize(el.newAdminUsername.value);
  const password = el.newAdminPassword.value;
  const confirmPassword = el.newAdminConfirmPassword.value;

  if (username.length < 3) {
    setMessage(el.createAdminMessage, "Username must be at least 3 characters.", "error");
    return;
  }
  if (password.length < 6) {
    setMessage(el.createAdminMessage, "Password must be at least 6 characters.", "error");
    return;
  }
  if (password !== confirmPassword) {
    setMessage(el.createAdminMessage, "Password and confirmation do not match.", "error");
    return;
  }

  try {
    const passwordSalt = randomSalt();
    const passwordHash = await hashPassword(password, passwordSalt);
    await createUser(username, passwordHash, passwordSalt, ROLE_ADMIN, password);
    el.createAdminForm.reset();
    await refreshAdminAccountsPanel();
    setMessage(el.createAdminMessage, `Admin account "${username}" created.`, "success");
  } catch (error) {
    if (error && error.name === "ConstraintError") {
      setMessage(el.createAdminMessage, "Username already exists.", "error");
      return;
    }
    setMessage(el.createAdminMessage, "Failed to create admin account.", "error");
  }
}

function resetTransactionForm() {
  el.transactionForm.reset();
  el.transactionId.value = "";
  el.transactionType.value = "inbound";
  el.saveTransactionBtn.textContent = "Save Transaction";
  el.cancelTransactionEditBtn.classList.add("hidden");
}

function resetReturnForm() {
  el.returnForm.reset();
  el.returnId.value = "";
  el.saveReturnBtn.textContent = "Save Return";
  el.cancelReturnEditBtn.classList.add("hidden");
  setReturnConditionOnlyEditMode(false);
}

function setReturnConditionOnlyEditMode(enabled) {
  el.returnMaterial.disabled = enabled;
  el.returnQuantity.disabled = enabled;
  el.returnNote.disabled = enabled;
}

async function handleReturnSubmit(event) {
  event.preventDefault();
  if (!ensureCanManageInventory(el.returnMessage, "Guest account is view-only.")) {
    return;
  }
  setMessage(el.returnMessage, "", "");

  try {
    const returnId = Number(el.returnId.value);
    const condition = sanitize(el.returnCondition.value).toLowerCase();
    let stockAddedForMessage = 0;
    if (!RETURN_CONDITIONS.has(condition)) {
      setMessage(el.returnMessage, "Material condition is required.", "error");
      return;
    }

    if (returnId) {
      const existing = state.returns.find((item) => Number(item.id) === returnId);
      if (!existing) {
        setMessage(el.returnMessage, "Return record not found.", "error");
        resetReturnForm();
        await reloadReturns();
        return;
      }

      const nextReturns = state.returns.map((item) => {
        if (Number(item.id) !== returnId) {
          return item;
        }
        return {
          ...item,
          materialId: Number(item.materialId),
          condition,
          quantity: Number(item.quantity),
          note: item.note
        };
      });
      await saveReturnsAndRebuildStocks(nextReturns);
    } else {
      const materialId = Number(el.returnMaterial.value);
      const quantity = Number(el.returnQuantity.value);
      const note = sanitize(el.returnNote.value);

      if (!materialId) {
        setMessage(el.returnMessage, "Select returned material.", "error");
        return;
      }
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        setMessage(el.returnMessage, "Returned quantity must be a whole number greater than zero.", "error");
        return;
      }

      await applyReturnRecord({
        materialId,
        condition,
        quantity,
        note,
        user: state.currentUser?.username || ""
      });
      stockAddedForMessage = condition === "broken" ? 0 : quantity;
    }

    resetReturnForm();
    await reloadInventory();
    await reloadReturns();
    if (returnId) {
      setMessage(el.returnMessage, "Return record updated.", "success");
    } else {
      if (stockAddedForMessage > 0) {
        setMessage(el.returnMessage, `Return recorded. Added ${stockAddedForMessage} item(s) to stock.`, "success");
      } else {
        setMessage(el.returnMessage, "Return recorded. Broken materials were not added to stock.", "success");
      }
    }
  } catch (error) {
    setMessage(el.returnMessage, error.message || "Failed to save return record.", "error");
  }
}

async function handleTransactionSubmit(event) {
  event.preventDefault();
  if (!ensureCanManageInventory(el.transactionMessage, "Guest account is view-only.")) {
    return;
  }
  setMessage(el.transactionMessage, "", "");

  try {
    const transactionId = Number(el.transactionId.value);
    const materialId = Number(el.transactionMaterial.value);
    const type = el.transactionType.value;
    const quantity = Number(el.transactionQuantity.value);
    const note = sanitize(el.transactionNote.value);

    if (!materialId) {
      setMessage(el.transactionMessage, "Select a material.", "error");
      return;
    }
    if (type !== "inbound" && type !== "outbound") {
      setMessage(el.transactionMessage, "Select a valid transaction type.", "error");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      setMessage(el.transactionMessage, "Quantity must be a whole number greater than zero.", "error");
      return;
    }

    if (transactionId) {
      const existing = state.transactions.find((item) => Number(item.id) === transactionId);
      if (!existing) {
        setMessage(el.transactionMessage, "Transaction record not found.", "error");
        resetTransactionForm();
        await reloadTransactions();
        return;
      }

      const nextTransactions = state.transactions.map((item) => {
        if (Number(item.id) !== transactionId) {
          return item;
        }
        return {
          ...item,
          materialId,
          type,
          quantity,
          note
        };
      });
      await saveTransactionsAndRebuildStocks(nextTransactions);
    } else {
      await applyStockTransaction({
        materialId,
        type,
        quantity,
        note,
        user: state.currentUser?.username || ""
      });
    }

    resetTransactionForm();
    await reloadInventory();
    await reloadTransactions();
    setMessage(el.transactionMessage, transactionId ? "Transaction history updated." : "Transaction recorded.", "success");
  } catch (error) {
    setMessage(el.transactionMessage, error.message || "Failed to save transaction.", "error");
  }
}

async function handlePhotoInputChange(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  if (!file.type || !file.type.startsWith("image/")) {
    setMessage(el.formMessage, "Please select a valid image file.", "error");
    clearMaterialPhotoInput();
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    state.pendingPhotoDataUrl = normalizePhotoData(dataUrl);
    setPhotoPreview(state.pendingPhotoDataUrl);
    setMessage(el.formMessage, "", "");
  } catch (error) {
    state.pendingPhotoDataUrl = "";
    setPhotoPreview("");
    setMessage(el.formMessage, error.message || "Unable to read image file.", "error");
  }
}

function handleClearPhoto() {
  state.pendingPhotoDataUrl = "";
  clearMaterialPhotoInput();
  setPhotoPreview("");
}

async function handleMaterialSubmit(event) {
  event.preventDefault();
  if (!ensureCanManageInventory(el.formMessage, "Guest account is view-only.")) {
    return;
  }
  setMessage(el.formMessage, "", "");
  try {
    const isEditing = Boolean(state.editingId);
    let materialCode = document.getElementById("code").value;
    if (!isEditing) {
      materialCode = await generateNextMaterialCode();
      document.getElementById("code").value = materialCode;
    }

    const now = new Date().toISOString();
    if (isEditing) {
      const existing = await getMaterialById(state.editingId);
      if (!existing) {
        setMessage(el.formMessage, "Material no longer exists.", "error");
        resetMaterialForm();
        await reloadInventory();
        return;
      }

      const name = sanitize(document.getElementById("name").value);
      const specification = sanitize(document.getElementById("specification").value);
      const category = sanitize(document.getElementById("category").value);
      const unit = sanitize(document.getElementById("unit").value);
      if (!name || !category || !unit) {
        setMessage(el.formMessage, "Required fields are missing.", "error");
        return;
      }

      await saveMaterial({
        ...existing,
        name,
        specification,
        category,
        unit,
        quantity: existing.quantity,
        photoDataUrl: state.pendingPhotoDataUrl,
        updatedAt: now
      });
      setMessage(el.formMessage, "Material updated. Quantity is locked in edit mode.", "success");
    } else {
      const addQuantity = isSuperAdmin() ? document.getElementById("quantity").value : 0;
      const parsed = normalizeMaterial({
        code: materialCode,
        name: document.getElementById("name").value,
        specification: document.getElementById("specification").value,
        category: document.getElementById("category").value,
        unit: document.getElementById("unit").value,
        quantity: addQuantity,
        photoDataUrl: state.pendingPhotoDataUrl
      });

      let saved = false;
      let attempts = 0;
      while (!saved) {
        attempts += 1;
        try {
          await saveMaterial({
            ...parsed,
            code: materialCode,
            createdAt: now,
            updatedAt: now
          });
          saved = true;
        } catch (error) {
          if (error && error.name === "ConstraintError") {
            if (attempts >= 20) {
              throw new Error("Unable to generate a unique material code.");
            }
            materialCode = await generateNextMaterialCode();
            document.getElementById("code").value = materialCode;
            continue;
          }
          throw error;
        }
      }
      setMessage(el.formMessage, "Material added.", "success");
    }

    resetMaterialForm();
    await reloadInventory();
    switchTab("materials");
  } catch (error) {
    if (error && error.name === "ConstraintError") {
      setMessage(el.formMessage, "Material code must be unique.", "error");
      return;
    }
    setMessage(el.formMessage, error.message || "Failed to save material.", "error");
  }
}

async function startEditingMaterial(id) {
  if (!ensureCanManageInventory(el.listMessage, "Guest account is view-only.")) {
    return;
  }
  const item = await getMaterialById(id);
  if (!item) {
    setMessage(el.listMessage, "Material record not found.", "error");
    await reloadInventory();
    return;
  }

  state.editingId = id;
  document.getElementById("materialId").value = String(id);
  document.getElementById("code").value = item.code;
  document.getElementById("name").value = item.name;
  document.getElementById("specification").value = item.specification || "";
  document.getElementById("category").value = item.category;
  document.getElementById("unit").value = item.unit;
  document.getElementById("quantity").value = String(item.quantity);
  state.pendingPhotoDataUrl = normalizePhotoData(item.photoDataUrl);
  clearMaterialPhotoInput();
  setPhotoPreview(state.pendingPhotoDataUrl);
  el.formHeading.textContent = `Edit Material #${id}`;
  el.cancelEditBtn.classList.remove("hidden");
  setEditQuantityLockedMode(true);
  setMessage(el.formMessage, "Editing material details. Quantity is locked.", "");
  switchTab("add");
}

async function handleDeleteMaterial(id) {
  if (!ensureSuperAdminAccess(el.listMessage, "Admin account is not allowed to delete materials.")) {
    return;
  }
  const ok = window.confirm("Delete this material permanently?");
  if (!ok) {
    return;
  }

  await deleteMaterial(id);
  if (state.editingId === id) {
    resetMaterialForm();
  }
  await reloadInventory();
  setMessage(el.listMessage, "Material deleted.", "success");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportMaterials() {
  if (!ensureSuperAdminAccess(el.reportMessage, "Admin account is not allowed to export JSON files.")) {
    return;
  }
  const payload = {
    app: "hiseas-ims",
    exportedAt: new Date().toISOString(),
    materials: state.materials
  };
  download(`materials-backup-${Date.now()}.json`, JSON.stringify(payload, null, 2));
  setMessage(el.reportMessage, "Materials exported.", "success");
}

async function importMaterials(file) {
  if (!ensureSuperAdminAccess(el.reportMessage, "Admin account is not allowed to import JSON files.")) {
    return;
  }
  const text = await file.text();
  const data = JSON.parse(text);
  const incoming = Array.isArray(data) ? data : data.materials;
  if (!Array.isArray(incoming)) {
    throw new Error("Invalid backup file format.");
  }

  let imported = 0;
  for (const raw of incoming) {
    const parsed = normalizeMaterial(raw);
    const existing = await getMaterialByCode(parsed.code);
    const now = new Date().toISOString();
    if (existing) {
      await saveMaterial({
        ...existing,
        ...parsed,
        updatedAt: now
      });
    } else {
      await saveMaterial({
        ...parsed,
        createdAt: now,
        updatedAt: now
      });
    }
    imported += 1;
  }

  await reloadInventory();
  setMessage(el.reportMessage, `Imported ${imported} material records.`, "success");
}

async function restoreSessionIfAvailable() {
  const username = localStorage.getItem(SESSION_KEY);
  if (!username) {
    return false;
  }
  const user = await getUserByUsername(username);
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return false;
  }
  state.currentUser = toUserWithRole(user);
  showInventory();
  await reloadInventory();
  await reloadTransactions();
  await reloadReturns();
  return true;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

function bindEvents() {
  el.setupForm.addEventListener("submit", handleSetupSubmit);
  el.loginForm.addEventListener("submit", handleLoginSubmit);
  if (el.guestAccessBtn) {
    el.guestAccessBtn.addEventListener("click", enterGuestMode);
  }
  el.accountForm.addEventListener("submit", handleAccountSubmit);
  el.createAdminForm.addEventListener("submit", handleCreateAdminSubmit);
  el.materialForm.addEventListener("submit", handleMaterialSubmit);
  el.photoInput.addEventListener("change", handlePhotoInputChange);
  el.clearPhotoBtn.addEventListener("click", handleClearPhoto);
  el.photoPreview.addEventListener("click", () => {
    openPhotoZoom(el.photoPreview.getAttribute("src") || "");
  });
  el.closePhotoZoomBtn.addEventListener("click", closePhotoZoom);
  el.printReportPdfBtn.addEventListener("click", printReportPdfPreview);
  el.closeReportPdfBtn.addEventListener("click", closeReportPdfPreview);
  el.photoZoomModal.addEventListener("click", (event) => {
    if (event.target === el.photoZoomModal) {
      closePhotoZoom();
    }
  });
  el.reportPdfModal.addEventListener("click", (event) => {
    if (event.target === el.reportPdfModal) {
      closeReportPdfPreview();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (!el.reportPdfModal.classList.contains("hidden")) {
      closeReportPdfPreview();
      return;
    }
    if (!el.photoZoomModal.classList.contains("hidden")) {
      closePhotoZoom();
    }
  });
  el.transactionForm.addEventListener("submit", handleTransactionSubmit);
  el.returnForm.addEventListener("submit", handleReturnSubmit);
  el.cancelTransactionEditBtn.addEventListener("click", () => {
    resetTransactionForm();
    setMessage(el.transactionMessage, "", "");
  });
  el.cancelReturnEditBtn.addEventListener("click", () => {
    resetReturnForm();
    setMessage(el.returnMessage, "", "");
  });
  el.activeUserLabel.addEventListener("click", () => {
    if (!isSuperAdmin()) {
      setMessage(el.listMessage, "Only super admin can access account settings.", "error");
      return;
    }
    if (el.accountPanel.classList.contains("hidden")) {
      showAccountPanel();
    } else {
      hideAccountPanel();
    }
  });
  el.cancelAccountBtn.addEventListener("click", () => {
    hideAccountPanel();
  });
  el.tabMaterialsBtn.addEventListener("click", () => switchTab("materials"));
  el.tabAddMaterialBtn.addEventListener("click", () => {
    if (!canManageInventory()) {
      setMessage(el.listMessage, "Guest account is view-only.", "error");
      switchTab("materials");
      return;
    }
    if (!state.editingId) {
      resetMaterialForm();
      setMessage(el.formMessage, "", "");
    }
    switchTab("add");
  });
  el.tabTransactionBtn.addEventListener("click", () => {
    switchTab("transaction");
  });
  el.tabReturnBtn.addEventListener("click", () => {
    switchTab("return");
  });
  el.tabReportBtn.addEventListener("click", () => {
    switchTab("report");
  });
  el.cancelEditBtn.addEventListener("click", () => {
    resetMaterialForm();
    setMessage(el.formMessage, "", "");
    switchTab("materials");
  });

  el.searchInput.addEventListener("input", renderMaterials);
  el.sortFilter.addEventListener("change", renderMaterials);
  el.categoryFilter.addEventListener("change", renderMaterials);
  el.exportPdfBtn.addEventListener("click", exportReportPdf);
  el.exportBtn.addEventListener("click", exportMaterials);
  el.importInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    try {
      await importMaterials(file);
    } catch (error) {
      setMessage(el.reportMessage, error.message || "Import failed.", "error");
    } finally {
      event.target.value = "";
    }
  });

  el.materialsBody.addEventListener("click", async (event) => {
    const thumb = event.target.closest("img.material-photo-thumb");
    if (thumb) {
      openPhotoZoom(thumb.getAttribute("src") || "");
      return;
    }

    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const id = Number(button.dataset.id);
    if (!id) {
      return;
    }

    if (button.dataset.action === "edit") {
      await startEditingMaterial(id);
    }
    if (button.dataset.action === "delete") {
      if (!isSuperAdmin()) {
        setMessage(el.listMessage, "Admin account is not allowed to delete materials.", "error");
        return;
      }
      await handleDeleteMaterial(id);
    }
  });

  el.transactionsBody.addEventListener("click", async (event) => {
    const thumb = event.target.closest("img.material-photo-thumb");
    if (thumb) {
      openPhotoZoom(thumb.getAttribute("src") || "");
      return;
    }

    const button = event.target.closest("button[data-txn-action]");
    if (!button) {
      return;
    }

    const id = Number(button.dataset.id);
    if (!id) {
      return;
    }

    if (button.dataset.txnAction === "edit") {
      await startEditingTransaction(id);
    }
    if (button.dataset.txnAction === "delete") {
      if (!isSuperAdmin()) {
        setMessage(el.transactionMessage, "Admin account is not allowed to delete transaction history.", "error");
        return;
      }
      await deleteTransactionHistory(id);
    }
  });

  el.returnsBody.addEventListener("click", async (event) => {
    const thumb = event.target.closest("img.material-photo-thumb");
    if (thumb) {
      openPhotoZoom(thumb.getAttribute("src") || "");
      return;
    }

    const button = event.target.closest("button[data-return-action]");
    if (!button) {
      return;
    }

    const id = Number(button.dataset.id);
    if (!id) {
      return;
    }

    if (button.dataset.returnAction === "edit") {
      await startEditingReturn(id);
    }
    if (button.dataset.returnAction === "delete") {
      if (!isSuperAdmin()) {
        setMessage(el.returnMessage, "Admin account is not allowed to delete returned materials.", "error");
        return;
      }
      await deleteReturnHistory(id);
    }
  });

  const reportPhotoClickHandler = (event) => {
    const thumb = event.target.closest("img.material-photo-thumb");
    if (thumb) {
      openPhotoZoom(thumb.getAttribute("src") || "");
    }
  };
  el.reportStockBody.addEventListener("click", reportPhotoClickHandler);
  el.reportLowStockBody.addEventListener("click", reportPhotoClickHandler);
  el.reportOutOfStockBody.addEventListener("click", reportPhotoClickHandler);
  el.reportInboundBody.addEventListener("click", reportPhotoClickHandler);
  el.reportOutboundBody.addEventListener("click", reportPhotoClickHandler);
  if (el.adminAccountsList) {
    el.adminAccountsList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-admin-action]");
      if (!button) {
        return;
      }
      const id = Number(button.dataset.id);
      if (!id) {
        return;
      }

      if (button.dataset.adminAction === "view-password") {
        await viewAdminPassword(id);
      }
      if (button.dataset.adminAction === "edit-account") {
        await editAdminAccount(id);
      }
      if (button.dataset.adminAction === "delete-account") {
        await deleteAdminAccount(id);
      }
      if (button.dataset.adminAction === "reset-password") {
        await resetAdminPassword(id);
      }
    });
  }

  el.logoutBtn.addEventListener("click", async () => {
    state.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    hideAccountPanel();
    resetMaterialForm();
    resetTransactionForm();
    resetReturnForm();
    setMessage(el.formMessage, "", "");
    setMessage(el.listMessage, "", "");
    setMessage(el.reportMessage, "", "");
    setMessage(el.transactionMessage, "", "");
    setMessage(el.returnMessage, "", "");
    const hasUsers = await countUsers();
    showAuth(hasUsers === 0);
  });
}

async function init() {
  try {
    state.db = await openDb();
    try {
      state.historyDb = await openHistoryDb();
      await syncTransactionsHistoryDb();
      await syncReturnsHistoryDb();
    } catch (historyError) {
      state.historyDb = null;
      console.warn("History database unavailable. Using primary database for history.", historyError);
    }
    registerServiceWorker();
    bindEvents();

    const hasSession = await restoreSessionIfAvailable();
    if (hasSession) {
      return;
    }

    const users = await countUsers();
    showAuth(users === 0);
  } catch (error) {
    console.error(error);
    setMessage(el.authMessage, "Unable to initialize local database in this browser.", "error");
    el.setupForm.classList.add("hidden");
    el.loginForm.classList.add("hidden");
  }
}

init();
