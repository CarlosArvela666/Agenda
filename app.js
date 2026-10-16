const STORAGE_KEY = "plano-agenda-v1";
const categories = {
  trabalho: "Trabalho",
  pessoal: "Pessoal",
  estudo: "Estudo",
  outros: "Outros",
};
const weekdayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const longWeekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const $ = (selector) => document.querySelector(selector);

const state = {
  events: loadEvents(),
  theme: loadTheme(),
  activeFilter: "all",
  query: "",
  view: "month",
  page: "agenda",
  selectedDate: dateKey(new Date()),
  visibleMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
};

document.documentElement.dataset.theme = state.theme;

function loadEvents() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((event) => event && event.id && event.title && event.date) : [];
  } catch {
    return [];
  }
}

function saveEvents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
    return true;
  } catch {
    return false;
  }
}

function loadTheme() {
  try {
    return localStorage.getItem("plano-agenda-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function saveTheme() {
  try {
    localStorage.setItem("plano-agenda-theme", state.theme);
  } catch {
    // The selected theme remains active for this session if browser storage is unavailable.
  }
}

function renderThemeToggle() {
  const button = $("#themeToggle");
  const isDark = state.theme === "dark";
  document.documentElement.dataset.theme = state.theme;
  button.setAttribute("aria-label", isDark ? "Ativar modo claro" : "Ativar modo escuro");
  button.title = isDark ? "Ativar modo claro" : "Ativar modo escuro";
  button.innerHTML = isDark
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.8"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.2A8.7 8.7 0 0 1 8.8 3.8 8.8 8.8 0 1 0 20.2 15.2Z"/></svg>';
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDate(key, options = {}) {
  return new Intl.DateTimeFormat("pt-PT", options).format(parseDate(key));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function getVisibleEvents() {
  const query = state.query.trim().toLocaleLowerCase("pt-PT");
  return state.events.filter((event) => {
    const matchesCategory = state.activeFilter === "all" || event.category === state.activeFilter;
    const matchesQuery = !query || `${event.title} ${event.notes || ""} ${categories[event.category] || ""}`.toLocaleLowerCase("pt-PT").includes(query);
    return matchesCategory && matchesQuery;
  });
}

function sortEvents(events) {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.time || "99:99").localeCompare(b.time || "99:99") || a.title.localeCompare(b.title, "pt-PT"));
}

function renderStats() {
  const today = dateKey(new Date());
  const todayEvents = state.events.filter((event) => event.date === today && !event.done).length;
  const pending = state.events.filter((event) => !event.done).length;
  const currentMonth = new Date();
  const monthPrefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthCount = state.events.filter((event) => event.date.startsWith(monthPrefix)).length;
  $("#todayStat").innerHTML = `${todayEvents} <small>${todayEvents === 1 ? "tarefa" : "tarefas"}</small>`;
  $("#pendingStat").innerHTML = `${pending} <small>${pending === 1 ? "tarefa" : "tarefas"}</small>`;
  $("#monthStat").innerHTML = `${monthCount} <small>agendadas</small>`;
  $("#taskCount").textContent = pending;
}

function renderMonthHeading() {
  const month = new Intl.DateTimeFormat("pt-PT", { month: "long" }).format(state.visibleMonth);
  $("#monthTitle").textContent = month.charAt(0).toLocaleUpperCase("pt-PT") + month.slice(1);
  $("#yearTitle").textContent = state.visibleMonth.getFullYear();
}

function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function renderCalendar() {
  const content = $("#calendarContent");
  renderMonthHeading();
  const filtered = getVisibleEvents();
  if (state.view === "list") {
    renderList(content, filtered);
    return;
  }
  let html = '<div class="calendar-grid">';
  weekdayNames.forEach((day) => { html += `<div class="weekday">${day}</div>`; });
  const firstOfMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - mondayIndex(firstOfMonth));
  const today = dateKey(new Date());
  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + i);
    const key = dateKey(cellDate);
    const classes = ["calendar-day"];
    if (cellDate.getMonth() !== state.visibleMonth.getMonth()) classes.push("outside-month");
    if (key === today) classes.push("today-day");
    if (key === state.selectedDate) classes.push("selected-day");
    const dayEvents = sortEvents(filtered.filter((event) => event.date === key));
    const shown = dayEvents.slice(0, 2);
    const eventMarkup = shown.map((event) => `<span class="calendar-event cat-${escapeHTML(event.category)}">${escapeHTML(event.title)}</span>`).join("");
    const more = dayEvents.length > 2 ? `<span class="more-events">+${dayEvents.length - 2} mais</span>` : "";
    html += `<button class="${classes.join(" ")}" data-date="${key}" type="button" aria-label="${formatDate(key, { weekday: "long", day: "numeric", month: "long" })}, ${dayEvents.length} tarefas"><span class="day-number">${cellDate.getDate()}</span><span class="day-events">${eventMarkup}${more}</span></button>`;
  }
  html += "</div>";
  content.innerHTML = html;
  content.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      state.visibleMonth = new Date(parseDate(state.selectedDate).getFullYear(), parseDate(state.selectedDate).getMonth(), 1);
      render();
    });
  });
}

function renderList(container, filtered) {
  const year = state.visibleMonth.getFullYear();
  const month = String(state.visibleMonth.getMonth() + 1).padStart(2, "0");
  const monthEvents = sortEvents(filtered.filter((event) => event.date.startsWith(`${year}-${month}`)));
  if (!monthEvents.length) {
    container.innerHTML = '<div class="list-view-content"><div class="list-empty"><div><span>✳</span>Sem tarefas neste mês.<br />Adiciona a primeira e organiza o teu tempo.</div></div></div>';
    return;
  }
  const grouped = monthEvents.reduce((groups, event) => {
    (groups[event.date] ||= []).push(event);
    return groups;
  }, {});
  const groups = Object.entries(grouped).map(([date, events]) => {
    const taskMarkup = events.map((event) => `<div class="list-event cat-${escapeHTML(event.category)}" data-id="${escapeHTML(event.id)}" role="button" tabindex="0"><span class="list-event-dot"></span><span class="list-event-title">${escapeHTML(event.title)}</span><span class="list-event-time">${event.time ? escapeHTML(event.time) : "Sem hora"}</span></div>`).join("");
    return `<div class="list-date-group"><div class="list-date-label"><strong>${formatDate(date, { day: "numeric", month: "short" })}</strong>${longWeekdays[parseDate(date).getDay()]}</div><div class="list-event-stack">${taskMarkup}</div></div>`;
  }).join("");
  container.innerHTML = `<div class="list-view-content">${groups}</div>`;
  container.querySelectorAll(".list-event").forEach((item) => {
    const open = () => openTask(item.dataset.id);
    item.addEventListener("click", open);
    item.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  });
}

function renderDayPanel() {
  const date = parseDate(state.selectedDate);
  const pretty = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(date);
  $("#selectedDayTitle").textContent = pretty.charAt(0).toLocaleUpperCase("pt-PT") + pretty.slice(1);
  const events = sortEvents(getVisibleEvents().filter((event) => event.date === state.selectedDate));
  const pending = events.filter((event) => !event.done).length;
  $("#daySummary").innerHTML = events.length
    ? `<strong>${events.length} ${events.length === 1 ? "tarefa" : "tarefas"}</strong> · ${pending ? `${pending} por concluir` : "tudo concluído"}`
    : "Ainda sem tarefas para este dia.";
  const list = $("#dayTaskList");
  if (!events.length) {
    list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">✳</span><strong>Dia livre por enquanto</strong><span>Adiciona uma tarefa para começares a organizar o teu dia.</span></div>';
    return;
  }
  list.innerHTML = events.map((event) => {
    const time = event.time ? escapeHTML(event.time) : "Sem hora marcada";
    const category = categories[event.category] || categories.outros;
    const priority = event.priority === "alta" ? '<span class="priority-dot"></span><span class="priority-label">Prioridade alta</span>' : "";
    return `<article class="task-card ${event.done ? "completed" : ""}" data-id="${escapeHTML(event.id)}"><button class="task-check" data-toggle="${escapeHTML(event.id)}" type="button" aria-label="${event.done ? "Marcar como por concluir" : "Marcar como concluída"}">${event.done ? "✓" : ""}</button><div class="task-main"><div class="task-time">${time}</div><div class="task-card-title">${escapeHTML(event.title)}</div><div class="task-meta"><span class="task-category-tag cat-${escapeHTML(event.category)}">${category}</span>${priority}</div></div></article>`;
  }).join("");
  list.querySelectorAll(".task-card").forEach((card) => card.addEventListener("click", (event) => {
    if (event.target.closest(".task-check")) return;
    openTask(card.dataset.id);
  }));
  list.querySelectorAll(".task-check").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleTask(button.dataset.toggle);
  }));
}

function render() {
  renderThemeToggle();
  const panel = $(".agenda-panel");
  panel.classList.toggle("list-mode", state.view === "list");
  $("#monthViewButton").classList.toggle("selected", state.view === "month");
  $("#listViewButton").classList.toggle("selected", state.view === "list");
  $("#agendaNav").classList.toggle("active", state.page === "agenda");
  $("#tasksNav").classList.toggle("active", state.page === "tasks");
  const isTasks = state.page === "tasks";
  $("#breadcrumbPage").textContent = isTasks ? "Tarefas" : "Agenda";
  $("#pageTitle").innerHTML = isTasks ? 'As tuas tarefas<span class="heading-period">.</span>' : 'A tua agenda<span class="heading-period">.</span>';
  $("#pageSubtitle").textContent = isTasks ? "Tudo o que tens para fazer, num só lugar." : "Um lugar tranquilo para organizar o que importa.";
  renderStats();
  renderCalendar();
  renderDayPanel();
}

function openTask(id = null, preferredDate = null) {
  const event = id ? state.events.find((item) => item.id === id) : null;
  $("#taskForm").reset();
  $("#taskId").value = event?.id || "";
  $("#taskTitle").value = event?.title || "";
  $("#taskDate").value = event?.date || preferredDate || state.selectedDate;
  $("#taskTime").value = event?.time || "";
  $("#taskCategory").value = event?.category || (state.activeFilter !== "all" ? state.activeFilter : "trabalho");
  $("#taskPriority").value = event?.priority || "normal";
  $("#taskNotes").value = event?.notes || "";
  $("#dialogLabel").textContent = event ? "EDITAR TAREFA" : "NOVA TAREFA";
  $("#dialogTitle").textContent = event ? "Ajusta os detalhes." : "O que tens em mente?";
  $("#saveTask").innerHTML = event ? 'Guardar alterações <span>→</span>' : 'Guardar tarefa <span>→</span>';
  $("#deleteTask").hidden = !event;
  $("#taskDialog").showModal();
  window.setTimeout(() => $("#taskTitle").focus(), 50);
}

function closeDialog() {
  $("#taskDialog").close();
}

function showToast(message, isError = false) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function toggleTask(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  event.done = !event.done;
  const saved = saveEvents();
  render();
  showToast(saved ? (event.done ? "Tarefa concluída. Muito bem!" : "Tarefa marcada como por concluir.") : "Alteração guardada apenas nesta sessão.", !saved);
}

function deleteTask(id) {
  state.events = state.events.filter((event) => event.id !== id);
  const saved = saveEvents();
  closeDialog();
  render();
  showToast(saved ? "Tarefa eliminada." : "Alteração guardada apenas nesta sessão.", !saved);
}

function shiftMonth(amount) {
  state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + amount, 1);
  state.selectedDate = dateKey(state.visibleMonth);
  render();
}

$("#newTaskButton").addEventListener("click", () => openTask());
$("#headingNewTask").addEventListener("click", () => openTask());
$("#dayNewTask").addEventListener("click", () => openTask(null, state.selectedDate));
$("#dayTextAdd").addEventListener("click", () => openTask(null, state.selectedDate));
$("#closeDialog").addEventListener("click", closeDialog);
$("#cancelDialog").addEventListener("click", closeDialog);
$("#previousMonth").addEventListener("click", () => shiftMonth(-1));
$("#nextMonth").addEventListener("click", () => shiftMonth(1));
$("#todayButton").addEventListener("click", () => {
  state.selectedDate = dateKey(new Date());
  state.visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  render();
});
$("#themeToggle").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveTheme();
  render();
});
$("#monthViewButton").addEventListener("click", () => { state.view = "month"; render(); });
$("#listViewButton").addEventListener("click", () => { state.view = "list"; render(); });
$("#searchInput").addEventListener("input", (event) => { state.query = event.target.value; renderCalendar(); renderDayPanel(); });
$("#agendaNav").addEventListener("click", () => { state.page = "agenda"; state.activeFilter = "all"; state.view = "month"; updateCategorySelection(); render(); });
$("#tasksNav").addEventListener("click", () => { state.page = "tasks"; state.activeFilter = "all"; state.view = "list"; updateCategorySelection(); render(); });
$("#categoryFilters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.activeFilter = button.dataset.filter;
  state.page = button.dataset.filter === "all" ? state.page : "tasks";
  if (button.dataset.filter !== "all") state.view = "list";
  updateCategorySelection();
  render();
});
$("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) { $("#taskTitle").focus(); return; }
  const id = $("#taskId").value;
  const previous = id ? state.events.find((item) => item.id === id) : null;
  const task = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    title,
    date: $("#taskDate").value,
    time: $("#taskTime").value,
    category: $("#taskCategory").value,
    priority: $("#taskPriority").value,
    notes: $("#taskNotes").value.trim(),
    done: previous?.done || false,
  };
  if (previous) Object.assign(previous, task);
  else state.events.push(task);
  state.selectedDate = task.date;
  const parsed = parseDate(task.date);
  state.visibleMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  const saved = saveEvents();
  closeDialog();
  render();
  showToast(saved ? (previous ? "Alterações guardadas." : "Tarefa adicionada à agenda.") : "Tarefa disponível apenas nesta sessão.", !saved);
});
$("#deleteTask").addEventListener("click", () => {
  const id = $("#taskId").value;
  if (id) deleteTask(id);
});
$("#taskDialog").addEventListener("click", (event) => {
  if (event.target === $("#taskDialog")) closeDialog();
});

function updateCategorySelection() {
  document.querySelectorAll(".category-filter").forEach((button) => button.classList.toggle("selected", button.dataset.filter === state.activeFilter));
}

document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || $("#taskDialog").open;
  if (event.key.toLowerCase() === "n" && !editing && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); openTask(); }
  if (event.key === "/" && !editing && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); $("#searchInput").focus(); }
  if (event.key === "Escape" && $("#taskDialog").open) closeDialog();
});

render();
