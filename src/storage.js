// Единственное место, где живут данные.
// Чтобы потом переехать на IndexedDB или Google Sheets —
// достаточно переписать этот модуль, интерфейс (getAll, add, update, remove) сохранить.

const KEY = "foodDiary.entries.v1";

// ==========================================
// НАСТРОЙКИ СИНХРОНИЗАЦИИ С GOOGLE SHEETS
// ==========================================
import { SHEET_URL, SHEET_TOKEN } from "./config.js";

function seedIfEmpty() {
  const raw = localStorage.getItem(KEY);
  if (raw) return; // уже что-то есть — ничего не трогаем
  const entries = SEED.map((e, i) => ({
    id: `seed-${i}`,
    date: e.date,
    meal: e.meal,
    text: e.text,
    createdAt: Date.now() + i, // сортировка внутри дня будет стабильной
  }));
  localStorage.setItem(KEY, JSON.stringify(entries));
}

// ==========================================
// ОТПРАВКА В GOOGLE SHEETS
// ==========================================
async function syncToSheet(action, entry) {
  if (!SHEET_URL || SHEET_URL.includes("ВАШ_")) {
    console.warn(
      "⚠️ Синхронизация не настроена: укажите SHEET_URL и SHEET_TOKEN в storage.js",
    );
    return;
  }

  try {
    // Используем text/plain, чтобы браузер не делал лишних CORS-проверок
    const res = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        token: SHEET_TOKEN,
        action: action, // 'add', 'update', 'delete'
        ...entry,
      }),
    });

    // Из-за редиректов Google Apps Script ответ может приходить в виде text, поэтому парсим аккуратно
    const text = await res.text();
    const data = JSON.parse(text);

    if (data.ok) {
      console.log(`✅ [${action}] Синхронизировано с Google Sheets`);
    } else {
      console.warn(`❌ [${action}] Ошибка от Google:`, data.error);
    }
  } catch (err) {
    console.warn(
      `❌ [${action}] Не удалось отправить в Google (работаем локально):`,
      err,
    );
  }
}

// ---------- Основной API ----------

function loadAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Не удалось прочитать данные", e);
    return [];
  }
}

function persist(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function getAll() {
  return [...loadAll()];
}

export function getByDate(isoDate) {
  return loadAll()
    .filter((e) => e.date === isoDate)
    .sort((a, b) => {
      const order = { breakfast: 0, snack: 1, lunch: 2, dinner: 3 };
      return order[a.meal] - order[b.meal] || a.createdAt - b.createdAt;
    });
}

export function add({ date, meal, text }) {
  const entries = loadAll();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    meal,
    text: text.trim(),
    createdAt: Date.now(),
  };
  entries.push(entry);
  persist(entries);

  syncToSheet("add", entry);
  return entry;
}

export function update(id, patch) {
  const entries = loadAll();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  entries[idx] = {
    ...entries[idx],
    ...patch,
    text: patch.text?.trim() ?? entries[idx].text,
  };
  persist(entries);

  syncToSheet("update", entries[idx]);

  return entries[idx];
}

export function remove(id) {
  const entries = loadAll().filter((e) => e.id !== id);
  persist(entries);

  // Отправляем в фон (передаем только ID)
  syncToSheet("delete", { id });
}

export function datesWithEntries() {
  return new Set(loadAll().map((e) => e.date));
}

// Заполняем localStorage тестовыми данными при первом запуске
//seedIfEmpty();
