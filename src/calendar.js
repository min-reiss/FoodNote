// Чистый модуль календаря. Не знает про данные и UI-события,
// отдаёт разметку в виде строки HTML через callback.
// Легко расширять: фильтры по типу приёма можно передать сюда же.

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

/**
 * @param {Date} viewDate  любой день месяца, который показываем
 * @param {string|null} selectedIso  выбранная дата в формате YYYY-MM-DD
 * @param {Set<string>} datesWithEntries  ISO-даты, где есть записи
 * @param {(isoDate: string) => void} onPick
 */
export function renderCalendar(
  viewDate,
  selectedIso,
  datesWithEntries,
  onPick,
  gridEl,
  labelEl,
) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  labelEl.textContent = `${MONTHS_RU[month]} ${year}`;

  const first = new Date(year, month, 1);
  // Понедельник = 0
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayIso = toIso(new Date());

  let html = "";
  for (let i = 0; i < startWeekday; i++) {
    html += `<div class="cal-day empty"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toIso(new Date(year, month, d));
    const classes = ["cal-day"];
    if (iso === selectedIso) classes.push("selected");
    if (iso === todayIso) classes.push("today");
    if (datesWithEntries.has(iso)) classes.push("has-entries");
    html += `<div class="${classes.join(" ")}" data-date="${iso}">${d}</div>`;
  }
  gridEl.innerHTML = html;

  // Делегирование клика — один обработчик на весь грид
  gridEl.onclick = (ev) => {
    const cell = ev.target.closest(".cal-day[data-date]");
    if (!cell) return;
    onPick(cell.dataset.date);
  };
}

export function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatRu(isoDate) {
  // 2025-10-20 → 20.10
  const [, m, d] = isoDate.split("-");
  return `${d}.${m}`;
}
