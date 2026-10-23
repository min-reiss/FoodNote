import * as storage from "./storage.js";
import { renderCalendar, toIso, formatRu } from "./calendar.js";

// ---------- Состояние UI ----------
const state = {
  viewDate: new Date(), // какой месяц в календаре
  selectedDate: toIso(new Date()), // какая дата выбрана
  editingId: null, // если редактируем запись
};

// ---------- DOM ----------
const els = {
  grid: document.getElementById("calendarGrid"),
  monthLabel: document.getElementById("monthLabel"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  dayTitle: document.getElementById("dayTitle"),
  entriesList: document.getElementById("entriesList"),
  addBtn: document.getElementById("addBtn"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  entryDate: document.getElementById("entryDate"),
  entryMeal: document.getElementById("entryMeal"),
  entryText: document.getElementById("entryText"),
  cancelBtn: document.getElementById("cancelBtn"),
  saveBtn: document.getElementById("saveBtn"),
  addBtnInline: document.getElementById("addBtnInline"),
};

const MEAL_LABELS = {
  breakfast: "Завтрак",
  snack: "Перекус",
  lunch: "Обед",
  dinner: "Ужин",
};

// ---------- Рендеринг ----------
function renderCalendarView() {
  renderCalendar(
    state.viewDate,
    state.selectedDate,
    storage.datesWithEntries(),
    (iso) => {
      state.selectedDate = iso;
      renderCalendarView();
      renderDay();
    },
    els.grid,
    els.monthLabel,
  );
}

function renderDay() {
  els.dayTitle.textContent = `Записи за ${formatRu(state.selectedDate)}`;
  const entries = storage.getByDate(state.selectedDate);

  if (entries.length === 0) {
    els.entriesList.innerHTML = `<div class="empty-hint">Пока пусто. Нажмите «+», чтобы добавить.</div>`;
    return;
  }

  els.entriesList.innerHTML = entries
    .map(
      (e) => `
    <div class="meal-card" data-id="${e.id}">
      <span class="meal-label">${MEAL_LABELS[e.meal] ?? e.meal}</span>
      <div class="meal-text">${escapeHtml(e.text)}</div>
      <div class="meal-actions">
        <button class="edit" data-action="edit" data-id="${e.id}">Редактировать</button>
        <button class="delete" data-action="delete" data-id="${e.id}">Удалить</button>
      </div>
    </div>
  `,
    )
    .join("");
}

// Минимальная защита от XSS (ввод пользователя рендерится через innerHTML)
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Модалка ----------
function openModal(entry = null) {
  state.editingId = entry?.id ?? null;
  els.modalTitle.textContent = entry ? "Редактировать запись" : "Новая запись";
  els.entryDate.value = entry?.date ?? state.selectedDate;
  els.entryMeal.value = entry?.meal ?? "breakfast";
  els.entryText.value = entry?.text ?? "";
  els.modal.classList.remove("hidden");
  // фокус на текст — самое частое поле
  setTimeout(() => els.entryText.focus(), 50);
}

function closeModal() {
  els.modal.classList.add("hidden");
  state.editingId = null;
}

function saveEntry() {
  const date = els.entryDate.value;
  const meal = els.entryMeal.value;
  const text = els.entryText.value.trim();

  if (!date || !text) {
    alert("Заполните дату и описание");
    return;
  }

  if (state.editingId) {
    storage.update(state.editingId, { date, meal, text });
  } else {
    storage.add({ date, meal, text });
  }

  // Если сохранили запись на другой день — переключимся на него
  state.selectedDate = date;
  const [y, m] = date.split("-").map(Number);
  state.viewDate = new Date(y, m - 1, 1);

  closeModal();
  renderCalendarView();
  renderDay();
}

// ---------- События ----------
els.prevMonth.addEventListener("click", () => {
  state.viewDate = new Date(
    state.viewDate.getFullYear(),
    state.viewDate.getMonth() - 1,
    1,
  );
  renderCalendarView();
});
els.nextMonth.addEventListener("click", () => {
  state.viewDate = new Date(
    state.viewDate.getFullYear(),
    state.viewDate.getMonth() + 1,
    1,
  );
  renderCalendarView();
});

els.addBtn.addEventListener("click", () => openModal());
els.cancelBtn.addEventListener("click", closeModal);
els.saveBtn.addEventListener("click", saveEntry);
els.addBtnInline.addEventListener("click", () => openModal());

// Клик по «Редактировать/Удалить» в списке
els.entriesList.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.action === "delete") {
    if (confirm("Удалить запись?")) {
      storage.remove(id);
      renderCalendarView();
      renderDay();
    }
  } else if (btn.dataset.action === "edit") {
    const entry = storage.getAll().find((e) => e.id === id);
    if (entry) openModal(entry);
  }
});

// Закрытие модалки по клику на фон
els.modal.addEventListener("click", (ev) => {
  if (ev.target === els.modal) closeModal();
});

// ---------- Старт ----------
const today = new Date();
state.viewDate = today;
state.selectedDate = toIso(today);
renderCalendarView();
renderDay();

// ---------- PWA: регистрация Service Worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("SW не зарегистрирован", err);
    });
  });
}
