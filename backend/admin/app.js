const state = { tab: "dashboard", summary: null };
const TOKEN_KEY = "tourisk-admin-token";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function token() { return localStorage.getItem(TOKEN_KEY); }
function setToken(value) { value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY); }

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token()) headers.Authorization = `Bearer ${token()}`;

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}

async function uploadFile(type, file) {
  if (!file || !file.size) return "";
  const form = new FormData();
  form.append("file", file);
  const data = await api(`/api/admin/upload/${type}`, { method: "POST", body: form });
  return data.path || "";
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2400);
}

function showApp() {
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  setTab(state.tab || "dashboard");
}

function showLogin() {
  $("#loginView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
}

async function login(event) {
  event.preventDefault();
  const login = $("#adminLogin").value.trim();
  const password = $("#adminPassword").value;
  const data = await api("/api/admin/auth/login", { method: "POST", body: JSON.stringify({ login, password }) });
  setToken(data.token);
  toast("Вход выполнен");
  showApp();
}

function setTab(tab) {
  state.tab = tab;
  $$(".nav[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === tab));

  const titles = {
    dashboard: ["Обзор приложения", "Живые показатели MVP."],
    statistics: ["Статистика", "Открытия, активность, XP и прочие числа, ради которых люди делают дашборды."],
    achievements: ["Ачивки", "Создавай условия, награды и бейджи."],
    pawns: ["Пешки", "Фигурки игрока, загрузка изображений и условия открытия."],
    places: ["Места", "Легендарные точки на карте."],
    users: ["Пользователи", "Статистика, блокировка, XP."],
    config: ["Настройки", "Публичный JSON конфиг приложения."],
  };

  $("#pageTitle").textContent = titles[tab][0];
  $("#pageSubtitle").textContent = titles[tab][1];
  loadCurrentTab().catch(handleAuthError);
}

function handleAuthError(error) {
  toast(error.message);
  if (String(error.message).toLowerCase().includes("админ") || String(error.message).toLowerCase().includes("сесс")) {
    setToken(null);
    showLogin();
  }
}

async function loadDashboard() {
  const data = await api("/api/admin/summary");
  state.summary = data;
  $("#summary").innerHTML = cardHtml([
    ["Пользователи", data.users],
    ["Активны сегодня", data.activeToday],
    ["Открыто км²", data.exploredKm2],
    ["Всего XP", data.totalXp],
  ]);
  renderSimpleUsers("topPlayers", data.topPlayers || [], (u) => `Lv.${u.level} · ${u.xp} XP · ${u.territories} клеток`);
  renderSimpleUsers("recentUsers", data.recentUsers || [], (u) => `${formatDate(u.createdAt)} · ${u.email}`);
}

async function loadStatistics() {
  const data = state.summary || await api("/api/admin/summary");
  $("#statisticsCards").innerHTML = cardHtml([
    ["Новые сегодня", data.usersToday],
    ["Check-in", data.totalCheckins],
    ["Открытые клетки", data.totalCells],
    ["Города", data.cities],
    ["Страны", data.countries],
    ["Ачивки", data.achievements],
    ["Пешки", data.pawns],
    ["Места", data.places],
  ]);
}

function cardHtml(items) {
  return items.map(([label, value]) => `<div class="card"><div class="num">${escapeHtml(value)}</div><div class="label">${escapeHtml(label)}</div></div>`).join("");
}

function renderSimpleUsers(nodeId, users, meta) {
  $(`#${nodeId}`).innerHTML = users.map((item) => `
    <div class="item">
      <div class="thumb" style="display:grid;place-items:center;font-size:25px">♟</div>
      <div><strong>${escapeHtml(item.nickname || "Explorer")}</strong><small>${escapeHtml(meta(item))}</small></div>
      <div></div>
    </div>
  `).join("") || `<p class="muted">Пока пусто.</p>`;
}

function imageHtml(path) {
  if (!path) return `<div class="thumb" style="display:grid;place-items:center;font-size:24px">♟</div>`;
  return `<img class="thumb" src="${escapeHtml(path)}" alt="" />`;
}

function renderList(nodeId, resource, items, renderMeta) {
  const node = $(`#${nodeId}`);
  node.innerHTML = items.map((item) => `
    <div class="item">
      ${imageHtml(item.imagePath || item.imageUrl)}
      <div>
        <strong>${escapeHtml(item.title || item.name || item.nickname || item.id || item.email)}</strong>
        <small>${escapeHtml(renderMeta(item))}</small>
      </div>
      <div class="item-actions">
        <button class="ghost" data-toggle-resource="${resource}" data-active="${item.isActive !== false}" data-id="${item._id || item.id}">${item.isActive === false ? "Включить" : "Выключить"}</button>
        <button class="danger" data-delete-resource="${resource}" data-id="${item._id || item.id}">Удалить</button>
      </div>
    </div>
  `).join("") || `<p class="muted">Пока пусто.</p>`;
}

async function loadResource(resource) {
  const data = await api(`/api/admin/${resource}`);
  if (resource === "achievements") renderList("achievementsList", resource, data.items, (item) => `${item.icon || "🏅"} ${item.conditionType} ≥ ${item.conditionValue} · +${item.rewardXp || 0} XP · ${item.isActive !== false ? "активна" : "выключена"}`);
  if (resource === "pawns") renderList("pawnsList", resource, data.items, (item) => `${item.unlockType} ≥ ${item.unlockValue} · ${item.condition || ""} · ${item.isActive !== false ? "активна" : "выключена"}`);
  if (resource === "places") renderList("placesList", resource, data.items, (item) => `${item.city || ""}, ${item.country || ""} · ${item.latitude}, ${item.longitude} · ${item.rarity} · +${item.xp} XP`);
}

async function loadUsers() {
  const data = await api("/api/admin/users");
  const node = $("#usersList");
  node.innerHTML = data.items.map((item) => `
    <div class="item">
      <div class="thumb" style="display:grid;place-items:center;font-size:25px">♟</div>
      <div>
        <strong>${escapeHtml(item.nickname || item.email)}</strong>
        <small>${escapeHtml(item.email)} · Lv.${item.level} · ${item.xp} XP · ${item.territories} клеток · ${item.exploredKm2} км²</small>
      </div>
      <div class="item-actions"><button class="ghost" data-user-block="${item.id}" data-blocked="${item.isBlocked}">${item.isBlocked ? "Разблок" : "Блок"}</button></div>
    </div>
  `).join("") || `<p class="muted">Пока пусто.</p>`;
}

async function loadConfig() {
  const data = await api("/api/admin/config");
  $("#configJson").value = JSON.stringify(data.item || {}, null, 2);
}

async function loadCurrentTab() {
  if (state.tab === "dashboard") return loadDashboard();
  if (state.tab === "statistics") return loadStatistics();
  if (["achievements", "pawns", "places"].includes(state.tab)) return loadResource(state.tab);
  if (state.tab === "users") return loadUsers();
  if (state.tab === "config") return loadConfig();
}

function formToJson(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  delete data.file;
  Object.keys(data).forEach((key) => {
    if (["conditionValue", "rewardXp", "unlockValue", "latitude", "longitude", "xp"].includes(key)) data[key] = Number(data[key]);
  });
  return data;
}

function fileFromForm(form) {
  return form.querySelector('input[type="file"]')?.files?.[0] || null;
}

function resetFileInputs(form) {
  form.querySelectorAll('input[type="file"]').forEach((input) => { input.value = ""; });
}

async function submitResource(formId, resource, uploadType = null) {
  const form = $(`#${formId}`);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const body = formToJson(form);
      const imagePath = uploadType ? await uploadFile(uploadType, fileFromForm(form)) : "";
      if (imagePath) body.imagePath = imagePath;
      await api(`/api/admin/${resource}`, { method: "POST", body: JSON.stringify(body) });
      form.reset();
      resetFileInputs(form);
      toast("Создано");
      await loadResource(resource);
    } catch (error) { handleAuthError(error); }
  });
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

async function handleDocumentClick(event) {
  const deleteButton = event.target.closest("[data-delete-resource]");
  if (deleteButton) {
    const resource = deleteButton.dataset.deleteResource;
    const id = deleteButton.dataset.id;
    if (!confirm("Удалить запись?")) return;
    await api(`/api/admin/${resource}/${id}`, { method: "DELETE" });
    toast("Удалено");
    await loadResource(resource);
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-resource]");
  if (toggleButton) {
    const resource = toggleButton.dataset.toggleResource;
    const id = toggleButton.dataset.id;
    const active = toggleButton.dataset.active === "true";
    await api(`/api/admin/${resource}/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: !active }) });
    toast(active ? "Выключено" : "Включено");
    await loadResource(resource);
    return;
  }

  const blockButton = event.target.closest("[data-user-block]");
  if (blockButton) {
    const id = blockButton.dataset.userBlock;
    const blocked = blockButton.dataset.blocked === "true";
    await api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ isBlocked: !blocked }) });
    toast(blocked ? "Пользователь разблокирован" : "Пользователь заблокирован");
    await loadUsers();
  }
}

function init() {
  $("#loginForm").addEventListener("submit", (event) => login(event).catch((error) => toast(error.message)));
  $("#logoutBtn").addEventListener("click", () => { setToken(null); showLogin(); });
  $$(".nav[data-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
  $("#refreshBtn").addEventListener("click", () => loadCurrentTab().then(() => toast("Обновлено")).catch(handleAuthError));
  document.addEventListener("click", (event) => handleDocumentClick(event).catch(handleAuthError));
  submitResource("achievementForm", "achievements", "achievements");
  submitResource("pawnForm", "pawns", "pawns");
  submitResource("placeForm", "places", null);
  $("#configForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const json = JSON.parse($("#configJson").value || "{}");
      await api("/api/admin/config", { method: "PUT", body: JSON.stringify(json) });
      toast("Сохранено");
    } catch (error) { toast(error.message); }
  });
  token() ? showApp() : showLogin();
}

init();
