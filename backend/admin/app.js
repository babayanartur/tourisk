const state = {
  tab: "dashboard",
  summary: null,
  users: [],
  resources: { achievements: [], pawns: [], places: [] },
  loading: 0,
};

const TOKEN_KEY = "tourisk-admin-token";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(value) {
  value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY);
}

function setLoading(active) {
  state.loading = Math.max(0, state.loading + (active ? 1 : -1));
  $("#loadingOverlay")?.classList.toggle("hidden", state.loading === 0);
}

async function api(path, options = {}) {
  setLoading(true);
  try {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    if (token()) headers.Authorization = `Bearer ${token()}`;

    const response = await fetch(path, { ...options, headers });
    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  } finally {
    setLoading(false);
  }
}

async function uploadFile(type, file) {
  if (!file || !file.size) return "";
  const form = new FormData();
  form.append("file", file);
  const data = await api(`/api/admin/upload/${type}`, { method: "POST", body: form });
  return data.path || "";
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast${type === "error" ? " error" : ""}`;
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2800);
}

function showApp() {
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  checkHealth();
  setTab(state.tab || "dashboard");
}

function showLogin() {
  $("#loginView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
}

async function login(event) {
  event.preventDefault();
  const loginValue = $("#adminLogin").value.trim();
  const password = $("#adminPassword").value;
  if (!loginValue || !password) {
    toast("Введите логин и пароль", "error");
    return;
  }

  const data = await api("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ login: loginValue, password }),
  });
  setToken(data.token);
  toast("Вход выполнен");
  showApp();
}

function setTab(tab) {
  state.tab = tab;
  $$(".nav[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === tab));

  const titles = {
    dashboard: ["ПАНЕЛЬ УПРАВЛЕНИЯ", "Обзор приложения", "Живые показатели Tourisk и состояние контента."],
    statistics: ["АНАЛИТИКА", "Статистика", "Активность, открытия, XP и география пользователей."],
    achievements: ["ИГРОВОЙ КОНТЕНТ", "Достижения", "Создание условий, наград и визуальных бейджей."],
    pawns: ["КОЛЛЕКЦИЯ", "Фигурки", "Изображения фигурок и правила их открытия."],
    places: ["КАРТА МИРА", "Места", "Легендарные точки, координаты, редкость и награды."],
    users: ["АККАУНТЫ", "Пользователи", "Прогресс, активность и управление доступом."],
    config: ["СИСТЕМА", "Настройки", "Публичная конфигурация мобильного приложения."],
  };

  const [eyebrow, title, subtitle] = titles[tab] || titles.dashboard;
  $("#pageEyebrow").textContent = eyebrow;
  $("#pageTitle").textContent = title;
  $("#pageSubtitle").textContent = subtitle;
  loadCurrentTab().catch(handleAuthError);
}

function handleAuthError(error) {
  toast(error.message || "Ошибка", "error");
  const message = String(error.message || "").toLowerCase();
  if (message.includes("админ") || message.includes("сесс") || message.includes("token") || message.includes("jwt")) {
    setToken(null);
    showLogin();
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    $("#serverTime").textContent = data?.time
      ? `Ответ сервера: ${new Date(data.time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
      : "Сервер отвечает";
  } catch {
    $("#serverTime").textContent = "Нет ответа от сервера";
  }
}

function updateLastSync() {
  $("#lastSync").textContent = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function loadDashboard() {
  const data = await api("/api/admin/summary");
  state.summary = data;
  $("#summary").innerHTML = cardHtml([
    { label: "Пользователи", value: data.users, icon: "◎", badge: "Всего", meta: `+${data.usersToday || 0} сегодня`, accent: "rgba(115,185,255,.10)" },
    { label: "Активны сегодня", value: data.activeToday, icon: "↗", badge: "DAU", meta: `${percent(data.activeToday, data.users)}% аудитории`, accent: "rgba(169,236,86,.10)" },
    { label: "Открыто территорий", value: `${formatNumber(data.exploredKm2)} км²`, icon: "⌖", badge: "Карта", meta: `${formatNumber(data.totalCells)} клеток`, accent: "rgba(241,199,106,.10)" },
    { label: "Суммарный опыт", value: formatNumber(data.totalXp), icon: "★", badge: "XP", meta: `Среднее ${formatNumber(data.averageXp || 0)}`, accent: "rgba(179,121,255,.10)" },
  ]);

  renderActivityChart("activityChart", data.activityLast7Days || []);
  renderHealth(data);
  renderCountryBars("topCountries", data.topCountries || []);
  $("#countriesTotal").textContent = formatNumber(data.countries || 0);
  renderSimpleUsers("topPlayers", data.topPlayers || [], (user) => `Lv.${user.level} · ${formatNumber(user.xp)} XP · ${formatNumber(user.territories)} территорий`, true);
  renderSimpleUsers("recentUsers", data.recentUsers || [], (user) => `${formatDate(user.createdAt)} · ${user.email}`);
  updateLastSync();
}

async function loadStatistics() {
  const data = state.summary || await api("/api/admin/summary");
  state.summary = data;
  $("#statisticsCards").innerHTML = cardHtml([
    { label: "Новые сегодня", value: data.usersToday, icon: "+", badge: "24 часа", meta: "Регистрации" },
    { label: "Check-in", value: formatNumber(data.totalCheckins), icon: "⌖", badge: "Всего", meta: "Отметки мест" },
    { label: "Открытые клетки", value: formatNumber(data.totalCells), icon: "◫", badge: "Карта", meta: `${formatNumber(data.exploredKm2)} км²` },
    { label: "Заблокировано", value: data.blockedUsers || 0, icon: "!", badge: "Аккаунты", meta: `${percent(data.blockedUsers, data.users)}% пользователей` },
    { label: "Города", value: data.cities, icon: "▦", badge: "География", meta: "Уникальные" },
    { label: "Страны", value: data.countries, icon: "◉", badge: "География", meta: "Уникальные" },
    { label: "Достижения", value: data.achievements, icon: "★", badge: "Контент", meta: "В базе" },
    { label: "Фигурки", value: data.pawns, icon: "♟", badge: "Контент", meta: `${data.places || 0} мест` },
  ]);
  renderActivityChart("statisticsActivityChart", data.activityLast7Days || []);
  renderCountryBars("statisticsCountries", data.topCountries || [], true);
  updateLastSync();
}

function cardHtml(items) {
  return items.map((item) => `
    <article class="card" style="--card-accent:${escapeHtml(item.accent || "rgba(169,236,86,.08)")}">
      <div class="card-top">
        <div class="metric-icon">${escapeHtml(item.icon || "•")}</div>
        <span class="metric-badge">${escapeHtml(item.badge || "")}</span>
      </div>
      <div class="num">${escapeHtml(item.value ?? 0)}</div>
      <div class="label">${escapeHtml(item.label || "")}</div>
      <div class="meta">${escapeHtml(item.meta || "")}</div>
    </article>
  `).join("");
}

function renderActivityChart(nodeId, days) {
  const node = $(`#${nodeId}`);
  if (!node) return;
  if (!days.length) {
    node.innerHTML = `<div class="empty-state">Данных за неделю пока нет.</div>`;
    return;
  }

  const maxValue = Math.max(1, ...days.flatMap((day) => [Number(day.active || 0), Number(day.registrations || 0)]));
  node.innerHTML = days.map((day) => {
    const activeHeight = Math.max(3, Math.round((Number(day.active || 0) / maxValue) * 100));
    const newHeight = Math.max(3, Math.round((Number(day.registrations || 0) / maxValue) * 100));
    return `
      <div class="chart-day">
        <div class="bars">
          <div class="bar bar-active" data-value="${escapeHtml(day.active || 0)}" style="height:${activeHeight}%"></div>
          <div class="bar bar-new" data-value="${escapeHtml(day.registrations || 0)}" style="height:${newHeight}%"></div>
        </div>
        <span class="chart-day-label">${escapeHtml(day.label || "")}</span>
      </div>
    `;
  }).join("");
}

function renderHealth(data) {
  $("#healthMetrics").innerHTML = [
    ["Средний XP", formatNumber(data.averageXp || 0)],
    ["Check-in", formatNumber(data.totalCheckins || 0)],
    ["Контент", formatNumber((data.achievements || 0) + (data.pawns || 0) + (data.places || 0))],
    ["Заблокировано", formatNumber(data.blockedUsers || 0)],
  ].map(([label, value]) => `<div class="health-item"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("");
}

function renderCountryBars(nodeId, countries, large = false) {
  const node = $(`#${nodeId}`);
  if (!node) return;
  if (!countries.length) {
    node.innerHTML = `<div class="empty-state">Страны появятся после первых открытий.</div>`;
    return;
  }
  const maxValue = Math.max(1, ...countries.map((item) => Number(item.value || 0)));
  node.innerHTML = countries.map((item) => {
    const width = Math.max(4, Math.round((Number(item.value || 0) / maxValue) * 100));
    return `<div class="country-row"><span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><div class="country-track"><div class="country-fill" style="width:${width}%"></div></div><b>${escapeHtml(item.value)}</b></div>`;
  }).join("");
  node.classList.toggle("large", large);
}

function renderSimpleUsers(nodeId, users, meta, ranked = false) {
  const node = $(`#${nodeId}`);
  if (!users.length) {
    node.innerHTML = `<div class="empty-state">Пока пусто.</div>`;
    return;
  }
  node.innerHTML = users.map((item, index) => `
    <div class="item">
      <div class="rank-thumb">${ranked ? index + 1 : "♟"}</div>
      <div>
        <strong>${escapeHtml(item.nickname || "Explorer")}</strong>
        <small>${escapeHtml(meta(item))}</small>
      </div>
      ${ranked ? `<strong style="color:var(--green)">${escapeHtml(formatNumber(item.xp || 0))}</strong>` : `<span class="status-dot"></span>`}
    </div>
  `).join("");
}

function imageHtml(path, fallback = "♟") {
  if (!path) return `<div class="thumb" style="display:grid;place-items:center;font-size:23px">${fallback}</div>`;
  return `<img class="thumb" src="${escapeHtml(path)}" alt="" loading="lazy" />`;
}

function renderList(nodeId, resource, items, renderMeta) {
  const node = $(`#${nodeId}`);
  const countNode = $(`#${resource}Count`);
  if (countNode) countNode.textContent = items.length;

  if (!items.length) {
    node.innerHTML = `<div class="empty-state">Записей пока нет.</div>`;
    return;
  }

  node.innerHTML = items.map((item) => `
    <div class="item">
      ${imageHtml(item.imagePath || item.imageUrl, resource === "places" ? "⌖" : resource === "achievements" ? "★" : "♟")}
      <div>
        <strong>${escapeHtml(item.title || item.name || item.nickname || item.id || item.email)}</strong>
        <small>${escapeHtml(renderMeta(item))}</small>
      </div>
      <div class="item-actions">
        <button class="ghost" data-edit-resource="${resource}" data-id="${item._id || item.id}">Редактировать</button>
        <button class="ghost" data-toggle-resource="${resource}" data-active="${item.isActive !== false}" data-id="${item._id || item.id}">${item.isActive === false ? "Включить" : "Выключить"}</button>
        <button class="danger" data-delete-resource="${resource}" data-id="${item._id || item.id}">Удалить</button>
      </div>
    </div>
  `).join("");
}

async function loadResource(resource) {
  const data = await api(`/api/admin/${resource}`);
  const items = data.items || [];
  state.resources[resource] = items;
  if (resource === "achievements") {
    renderList("achievementsList", resource, items, (item) => `${item.icon || "🏅"} · ${conditionName(item.conditionType)} ≥ ${item.conditionValue} · +${item.rewardXp || 0} XP · ${item.isActive !== false ? "активно" : "выключено"}`);
  }
  if (resource === "pawns") {
    renderList("pawnsList", resource, items, (item) => `${rarityName(item.rarity)} · ${conditionName(item.unlockType)} ≥ ${item.unlockValue} · масштаб ${item.mapScale || 1} · ${item.condition || "Без описания"} · ${item.isActive !== false ? "активна" : "выключена"}`);
  }
  if (resource === "places") {
    renderList("placesList", resource, items, (item) => `${item.icon || "✦"} ${item.city || "—"}, ${item.country || "—"} · ${item.latitude}, ${item.longitude} · ${item.discoveryRadiusMeters || 220} м · ${rarityName(item.rarity)} · +${item.xp || 0} XP`);
  }
  updateLastSync();
}

async function loadUsers() {
  const data = await api("/api/admin/users");
  state.users = data.items || [];
  renderUsers(state.users);
  updateLastSync();
}

function renderUsers(users) {
  const node = $("#usersList");
  $("#usersCount").textContent = users.length;
  if (!users.length) {
    node.innerHTML = `<div class="empty-state">Пользователи не найдены.</div>`;
    return;
  }

  node.innerHTML = users.map((item) => `
    <div class="item">
      <div class="rank-thumb">♟</div>
      <div>
        <strong>${escapeHtml(item.nickname || item.email)}</strong>
        <small>${escapeHtml(item.email)} · Lv.${escapeHtml(item.level)} · ${escapeHtml(formatNumber(item.xp))} XP · ${escapeHtml(formatNumber(item.territories))} территорий · ${escapeHtml(formatNumber(item.exploredKm2))} км²</small>
      </div>
      <div class="item-actions">
        <button class="ghost" data-user-block="${item.id}" data-blocked="${item.isBlocked}">${item.isBlocked ? "Разблокировать" : "Заблокировать"}</button>
      </div>
    </div>
  `).join("");
}

async function loadConfig() {
  const data = await api("/api/admin/config");
  $("#configJson").value = JSON.stringify(data.item || {}, null, 2);
  updateLastSync();
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
    if (["conditionValue", "rewardXp", "unlockValue", "latitude", "longitude", "xp", "discoveryRadiusMeters", "sortOrder"].includes(key)) {
      data[key] = Number(data[key]);
    }
  });
  return data;
}

function fileFromForm(form) {
  return form.querySelector('input[type="file"]')?.files?.[0] || null;
}

function resetFileInputs(form) {
  form.querySelectorAll('input[type="file"]').forEach((input) => {
    input.value = "";
    const preview = document.getElementById(input.dataset.previewTarget || "");
    if (preview) {
      preview.classList.remove("has-image");
      preview.style.backgroundImage = "";
    }
  });
}

const RESOURCE_FORMS = {
  achievements: { formId: "achievementForm", titleId: "achievementFormTitle", kickerId: "achievementFormKicker", submitId: "achievementSubmit", cancelId: "achievementCancel", createTitle: "Новое достижение", editTitle: "Редактирование достижения", createButton: "Создать достижение" },
  pawns: { formId: "pawnForm", titleId: "pawnFormTitle", kickerId: "pawnFormKicker", submitId: "pawnSubmit", cancelId: "pawnCancel", createTitle: "Новая фигурка", editTitle: "Редактирование фигурки", createButton: "Создать фигурку" },
  places: { formId: "placeForm", titleId: "placeFormTitle", kickerId: "placeFormKicker", submitId: "placeSubmit", cancelId: "placeCancel", createTitle: "Новое место", editTitle: "Редактирование места", createButton: "Добавить место" },
};

function setFormValue(form, name, value) {
  const field = form.elements.namedItem(name);
  if (!field) return;
  field.value = value ?? "";
}

function setPreview(form, imagePath = "") {
  const input = form.querySelector('input[type="file"][data-preview-target]');
  const preview = input ? document.getElementById(input.dataset.previewTarget || "") : null;
  if (!preview) return;
  preview.classList.toggle("has-image", Boolean(imagePath));
  preview.style.backgroundImage = imagePath ? `url("${String(imagePath).replaceAll('"', '%22')}")` : "";
}

function beginEdit(resource, item) {
  const config = RESOURCE_FORMS[resource];
  if (!config || !item) return;
  const form = $(`#${config.formId}`);
  form.dataset.editId = item._id || item.id;
  Object.entries(item).forEach(([key, value]) => setFormValue(form, key, value));
  setPreview(form, item.imagePath || item.imageUrl || "");
  $(`#${config.titleId}`).textContent = config.editTitle;
  $(`#${config.kickerId}`).textContent = "РЕДАКТИРОВАНИЕ";
  $(`#${config.submitId}`).textContent = "Сохранить изменения";
  $(`#${config.cancelId}`).classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetResourceForm(resource) {
  const config = RESOURCE_FORMS[resource];
  if (!config) return;
  const form = $(`#${config.formId}`);
  form.reset();
  delete form.dataset.editId;
  resetFileInputs(form);
  $(`#${config.titleId}`).textContent = config.createTitle;
  $(`#${config.kickerId}`).textContent = resource === "places" ? "КАРТА" : "СОЗДАНИЕ";
  $(`#${config.submitId}`).textContent = config.createButton;
  $(`#${config.cancelId}`).classList.add("hidden");
}

async function submitResource(formId, resource, uploadType = null) {
  const form = $(`#${formId}`);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const initialText = submitButton.textContent;
    let succeeded = false;
    submitButton.disabled = true;
    submitButton.textContent = "Сохраняем…";
    try {
      const body = formToJson(form);
      const selectedFile = fileFromForm(form);
      const editId = form.dataset.editId;
      if (resource === "pawns" && !editId && !selectedFile) {
        throw new Error("Загрузите изображение фигурки");
      }
      const imagePath = uploadType ? await uploadFile(uploadType, selectedFile) : "";
      if (imagePath) body.imagePath = imagePath;
      await api(editId ? `/api/admin/${resource}/${editId}` : `/api/admin/${resource}`, {
        method: editId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      resetResourceForm(resource);
      toast(editId ? "Изменения сохранены" : "Запись создана");
      await loadResource(resource);
      state.summary = null;
      succeeded = true;
    } catch (error) {
      handleAuthError(error);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = succeeded ? RESOURCE_FORMS[resource].createButton : initialText;
    }
  });
}

function setupFilePreviews() {
  $$('input[type="file"][data-preview-target]').forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      const preview = document.getElementById(input.dataset.previewTarget);
      if (!preview || !file) return;
      const url = URL.createObjectURL(file);
      preview.classList.add("has-image");
      preview.style.backgroundImage = `url("${url}")`;
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatNumber(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(number);
}

function percent(value, total) {
  const denominator = Number(total || 0);
  if (!denominator) return 0;
  return Math.round((Number(value || 0) / denominator) * 100);
}

function conditionName(value) {
  return ({
    cells: "территории", territories: "территории", cities: "города", countries: "страны", level: "уровень", xp: "XP",
    distanceKm: "пройдено, км", exploredKm2: "исследовано, км²", legendaryPlaces: "легендарные места", hiddenPlaces: "скрытые места",
    yerevanPlaces: "места Еревана", yerevanPercent: "процент Еревана", stars: "звёзды", streakDays: "серия дней", achievements: "достижения",
  })[value] || value;
}

function rarityName(value) {
  return ({ common: "обычная", uncommon: "необычная", rare: "редкая", epic: "эпическая", legendary: "легендарная", mythic: "мифическая", shadow: "теневая", hidden: "скрытая" })[value] || value;
}

async function handleDocumentClick(event) {
  const tabLink = event.target.closest("[data-go-tab]");
  if (tabLink) {
    setTab(tabLink.dataset.goTab);
    return;
  }

  const cancelButton = event.target.closest("[data-cancel-edit]");
  if (cancelButton) {
    resetResourceForm(cancelButton.dataset.cancelEdit);
    return;
  }

  const editButton = event.target.closest("[data-edit-resource]");
  if (editButton) {
    const resource = editButton.dataset.editResource;
    const item = (state.resources[resource] || []).find((entry) => String(entry._id || entry.id) === String(editButton.dataset.id));
    beginEdit(resource, item);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-resource]");
  if (deleteButton) {
    const resource = deleteButton.dataset.deleteResource;
    const id = deleteButton.dataset.id;
    if (!confirm("Удалить запись без возможности восстановления?")) return;
    await api(`/api/admin/${resource}/${id}`, { method: "DELETE" });
    toast("Запись удалена");
    await loadResource(resource);
    state.summary = null;
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-resource]");
  if (toggleButton) {
    const resource = toggleButton.dataset.toggleResource;
    const id = toggleButton.dataset.id;
    const active = toggleButton.dataset.active === "true";
    await api(`/api/admin/${resource}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !active }),
    });
    toast(active ? "Запись выключена" : "Запись включена");
    await loadResource(resource);
    return;
  }

  const blockButton = event.target.closest("[data-user-block]");
  if (blockButton) {
    const id = blockButton.dataset.userBlock;
    const blocked = blockButton.dataset.blocked === "true";
    const action = blocked ? "разблокировать" : "заблокировать";
    if (!confirm(`Действительно ${action} пользователя?`)) return;
    await api(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isBlocked: !blocked }),
    });
    toast(blocked ? "Пользователь разблокирован" : "Пользователь заблокирован");
    await loadUsers();
    state.summary = null;
  }
}

function init() {
  $("#loginForm").addEventListener("submit", (event) => login(event).catch((error) => toast(error.message, "error")));
  $("#logoutBtn").addEventListener("click", () => {
    setToken(null);
    state.summary = null;
    showLogin();
  });

  $$(".nav[data-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
  $("#refreshBtn").addEventListener("click", () => {
    if (["dashboard", "statistics"].includes(state.tab)) state.summary = null;
    loadCurrentTab().then(() => toast("Данные обновлены")).catch(handleAuthError);
  });
  document.addEventListener("click", (event) => handleDocumentClick(event).catch(handleAuthError));

  $("#usersSearch").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    const filtered = query
      ? state.users.filter((item) => `${item.nickname || ""} ${item.email || ""}`.toLowerCase().includes(query))
      : state.users;
    renderUsers(filtered);
  });

  submitResource("achievementForm", "achievements", "achievements");
  submitResource("pawnForm", "pawns", "pawns");
  submitResource("placeForm", "places", "places");
  setupFilePreviews();

  $("#configForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const json = JSON.parse($("#configJson").value || "{}");
      await api("/api/admin/config", { method: "PUT", body: JSON.stringify(json) });
      $("#configJson").value = JSON.stringify(json, null, 2);
      toast("Конфигурация сохранена");
      updateLastSync();
    } catch (error) {
      toast(error.message || "Некорректный JSON", "error");
    }
  });

  token() ? showApp() : showLogin();
}

init();
