// Family Space — полнофункциональное приложение с API
const API_BASE = window.location.origin;

// Иконки (SVG paths)
const iconPaths = {
  'briefcase-business':'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>',
  'house':'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
  'bot':'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/>',
  'book-open':'<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 0 3 23V5.5ZM21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5A2.5 2.5 0 0 1 21 23V5.5Z"/>',
  'notebook-pen':'<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4ZM8 8h7M8 12h7"/><path d="m16 16 4-4 2 2-4 4-2 1z"/>',
  'folder-kanban':'<path d="M3 5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z"/><path d="M7 11h3v5H7zM13 9h3v7h-3z"/>',
  'calendar':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  'check':'<path d="m5 12 4 4L19 6"/>',
  'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'map':'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
  'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  'shopping-cart':'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  'credit-card':'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  'bell':'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  'heart':'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'
};

function icon(name, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.calendar}</svg>`;
}

function haptic() {
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch (e) { }
}

function toast(message) {
  const t = document.querySelector('.toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function nav(active) {
  return `<nav class="bottom-nav">
    <a class="nav-item ${active === 'home' ? 'active' : ''}" href="index.html">${icon('house', 21)}<span>Домой</span></a>
    <a class="nav-item ${active === 'shopping' ? 'active' : ''}" href="shopping.html">${icon('shopping-cart', 21)}<span>Покупки</span></a>
    <a class="nav-item ${active === 'utilities' ? 'active' : ''}" href="utilities.html">${icon('credit-card', 21)}<span>Коммуналка</span></a>
    <a class="nav-item ${active === 'reminders' ? 'active' : ''}" href="reminders.html">${icon('bell', 21)}<span>Уведомления</span></a>
    <a class="nav-item ${active === 'schedule' ? 'active' : ''}" href="schedule.html">${icon('calendar', 21)}<span>Расписание</span></a>
  </nav>`;
}

function commonShell(content, active) {
  document.body.innerHTML = `<div class="app">${content}</div>${nav(active)}<div class="toast" role="status"></div>`;
}

// ========== ГЛАВНАЯ СТРАНИЦА ==========
function homePage() {
  commonShell(`
    <div class="topbar">
      <div class="brand">
        <span class="brand-mark">${icon('house', 22)}</span>
        <span>Family Space</span>
      </div>
    </div>
    <section class="hero">
      <p class="eyebrow">Ваш уютный цифровой дом</p>
      <h1>Всё своё —<br>в одном месте ✨</h1>
      <p class="hero-sub">Покупки, коммуналка, напоминания и расписание.</p>
    </section>
    <div class="grid">
      <a class="tile home" href="shopping.html">
        <span class="tile-icon">${icon('shopping-cart')}</span>
        <span>
          <span class="tile-title">Покупки</span>
          <span class="tile-sub">Список покупок</span>
        </span>
      </a>
      <a class="tile business" href="utilities.html">
        <span class="tile-icon">${icon('credit-card')}</span>
        <span>
          <span class="tile-title">Коммуналка</span>
          <span class="tile-sub">Платежи и счета</span>
        </span>
      </a>
      <a class="tile study" href="reminders.html">
        <span class="tile-icon">${icon('bell')}</span>
        <span>
          <span class="tile-title">Уведомления</span>
          <span class="tile-sub">Напоминания и записки</span>
        </span>
      </a>
      <a class="tile ai" href="schedule.html">
        <span class="tile-icon">${icon('calendar')}</span>
        <span>
          <span class="tile-title">Расписание</span>
          <span class="tile-sub">Учебная неделя</span>
        </span>
      </a>
    </div>
  `, 'home');
}

// ========== СТРАНИЦА ПОКУПОК ==========
async function shoppingPage() {
  const data = await fetch(`${API_BASE}/api/shopping`).then(r => r.json());
  
  commonShell(`
    <div class="topbar">
      <a class="brand" href="index.html">
        <span class="brand-mark">${icon('shopping-cart')}</span>
        Family Space
      </a>
    </div>
    <section class="hero">
      <h1>Список покупок 🛒</h1>
      <p class="hero-sub">Мартин и Лена · общий список</p>
    </section>
    <div id="shopping-list"></div>
    <button class="fab" onclick="addShoppingItem()" aria-label="Добавить покупку">+</button>
  `, 'shopping');
  
  renderShoppingList(data.items);
}

function renderShoppingList(items) {
  const container = document.getElementById('shopping-list');
  if (items.length === 0) {
    container.innerHTML = '<div class="panel empty"><div class="empty-emoji">🛒</div><strong>Список пуст!</strong><p>Нажми + чтобы добавить покупку</p></div>';
    return;
  }
  
  container.innerHTML = items.map(item => `
    <article class="panel task-card ${item.bought ? 'done' : ''}">
      <button class="task-check ${item.bought ? 'checked' : ''}" onclick="toggleShopping(${item.id}, ${!item.bought})" aria-label="Отметить">
        ${item.bought ? icon('check', 16) : ''}
      </button>
      <div style="flex:1">
        <div class="task-name">${item.name}</div>
        <div class="task-due green">Добавил: ${item.addedBy}</div>
      </div>
      <button class="icon-button" style="width:34px;height:34px" onclick="removeShopping(${item.id})" aria-label="Удалить">×</button>
    </article>
  `).join('');
}

window.toggleShopping = async (id, bought) => {
  haptic();
  await fetch(`${API_BASE}/api/shopping/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bought })
  });
  const data = await fetch(`${API_BASE}/api/shopping`).then(r => r.json());
  renderShoppingList(data.items);
  toast(bought ? 'Куплено ✓' : 'Отменено');
};

window.removeShopping = async (id) => {
  haptic();
  await fetch(`${API_BASE}/api/shopping/${id}`, { method: 'DELETE' });
  const data = await fetch(`${API_BASE}/api/shopping`).then(r => r.json());
  renderShoppingList(data.items);
  toast('Удалено');
};

window.addShoppingItem = async () => {
  const name = prompt('Что купить?');
  if (!name) return;
  
  const addedBy = prompt('Кто добавил? (Мартин/Лена)', 'Мартин');
  if (!addedBy) return;
  
  haptic();
  await fetch(`${API_BASE}/api/shopping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, addedBy })
  });
  
  const data = await fetch(`${API_BASE}/api/shopping`).then(r => r.json());
  renderShoppingList(data.items);
  toast('Добавлено!');
};

// ========== СТРАНИЦА КОММУНАЛКИ ==========
async function utilitiesPage() {
  const data = await fetch(`${API_BASE}/api/utilities`).then(r => r.json());
  
  const total = data.bills.reduce((sum, b) => sum + b.amount, 0);
  const pending = data.bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
  const paid = data.bills.filter(b => b.status === 'paid').length;
  
  commonShell(`
    <div class="topbar">
      <a class="brand" href="index.html">
        <span class="brand-mark">${icon('credit-card')}</span>
        Family Space
      </a>
    </div>
    <section class="hero">
      <h1>Коммунальные платежи 💳</h1>
      <p class="hero-sub">Мартин и Лена · ведут учёт</p>
    </section>
    <div class="panel task-summary">
      <div class="progress-ring"><strong>${paid}/${data.bills.length}</strong></div>
      <div>
        <strong>К оплате: ${pending} ₽</strong>
        <p class="hero-sub" style="margin:5px 0 0">Всего за месяц: ${total} ₽</p>
      </div>
    </div>
    <div id="utilities-list"></div>
  `, 'utilities');
  
  renderUtilitiesList(data.bills);
}

function renderUtilitiesList(bills) {
  const container = document.getElementById('utilities-list');
  
  container.innerHTML = bills.map(bill => {
    const daysLeft = Math.ceil((new Date(bill.dueDate) - new Date()) / 86400000);
    const isPaid = bill.status === 'paid';
    const dateLabel = isPaid ? 'Оплачено' : daysLeft < 0 ? 'Просрочено!' : daysLeft === 0 ? 'Сегодня!' : `Через ${daysLeft} дн.`;
    const cls = isPaid ? 'green' : daysLeft < 3 ? 'red' : daysLeft < 7 ? 'yellow' : 'green';
    
    return `
      <article class="panel task-card ${isPaid ? 'done' : ''}">
        <button class="task-check ${isPaid ? 'checked' : ''}" onclick="${isPaid ? '' : `payUtility(${bill.id})`}" aria-label="Оплатить" ${isPaid ? 'disabled' : ''}>
          ${isPaid ? icon('check', 16) : ''}
        </button>
        <div style="flex:1">
          <div class="task-name">${bill.name}</div>
          <div class="task-due ${cls}">${dateLabel} · ${bill.amount} ₽</div>
          ${isPaid ? `<div class="tile-sub">Оплатил: ${bill.paidBy}</div>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

window.payUtility = async (id) => {
  const paidBy = prompt('Кто оплатил? (Мартин/Лена)', 'Мартин');
  if (!paidBy) return;
  
  haptic();
  await fetch(`${API_BASE}/api/utilities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paidBy })
  });
  
  const data = await fetch(`${API_BASE}/api/utilities`).then(r => r.json());
  renderUtilitiesList(data.bills);
  toast('Оплачено ✓');
};

// ========== СТРАНИЦА НАПОМИНАНИЙ И ЗАПИСОК ==========
async function remindersPage() {
  const data = await fetch(`${API_BASE}/api/reminders`).then(r => r.json());
  
  commonShell(`
    <div class="topbar">
      <a class="brand" href="index.html">
        <span class="brand-mark">${icon('bell')}</span>
        Family Space
      </a>
    </div>
    <section class="hero">
      <h1>Уведомления 🔔</h1>
      <p class="hero-sub">Напоминания и милые записки</p>
    </section>
    
    <div class="task-tabs">
      <button class="task-tab active" data-tab="reminders" onclick="switchReminderTab('reminders')">⏰ Напоминания</button>
      <button class="task-tab" data-tab="notes" onclick="switchReminderTab('notes')">💕 Записки</button>
    </div>
    
    <div id="reminders-content"></div>
    
    <button class="fab" onclick="addReminder()" aria-label="Добавить">+</button>
  `, 'reminders');
  
  window.remindersData = data;
  window.activeReminderTab = 'reminders';
  renderReminders();
}

window.switchReminderTab = (tab) => {
  window.activeReminderTab = tab;
  document.querySelectorAll('.task-tab').forEach(el => 
    el.classList.toggle('active', el.dataset.tab === tab)
  );
  renderReminders();
};

function renderReminders() {
  const container = document.getElementById('reminders-content');
  const data = window.remindersData;
  
  if (window.activeReminderTab === 'reminders') {
    if (data.reminders.length === 0) {
      container.innerHTML = '<div class="panel empty"><div class="empty-emoji">⏰</div><strong>Нет напоминаний</strong><p>Добавьте напоминание нажав +</p></div>';
      return;
    }
    
    container.innerHTML = data.reminders.map(r => `
      <article class="panel task-card ${r.completed ? 'done' : ''}">
        <button class="task-check ${r.completed ? 'checked' : ''}" onclick="toggleReminder(${r.id}, ${!r.completed})" aria-label="Отметить">
          ${r.completed ? icon('check', 16) : ''}
        </button>
        <div style="flex:1">
          <div class="task-name">${r.text}</div>
          <div class="task-due green">Для: ${r.for} · От: ${r.from}</div>
          <div class="tile-sub">${new Date(r.time).toLocaleString('ru-RU')}</div>
        </div>
      </article>
    `).join('');
  } else {
    if (data.notes.length === 0) {
      container.innerHTML = '<div class="panel empty"><div class="empty-emoji">💕</div><strong>Нет записок</strong><p>Напишите милую записку друг другу!</p></div>';
      return;
    }
    
    container.innerHTML = data.notes.map(n => `
      <article class="panel">
        <div style="display:flex;gap:12px;align-items:center">
          <div style="font-size:32px">${icon('heart', 32)}</div>
          <div style="flex:1">
            <strong>${n.text}</strong>
            <div class="tile-sub">От ${n.from} для ${n.to} · ${new Date(n.createdAt).toLocaleDateString('ru-RU')}</div>
          </div>
        </div>
      </article>
    `).join('');
  }
}

window.toggleReminder = async (id, completed) => {
  haptic();
  await fetch(`${API_BASE}/api/reminders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  });
  
  const data = await fetch(`${API_BASE}/api/reminders`).then(r => r.json());
  window.remindersData = data;
  renderReminders();
  toast(completed ? 'Выполнено ✓' : 'Отменено');
};

window.addReminder = async () => {
  if (window.activeReminderTab === 'notes') {
    const text = prompt('Текст записки:');
    if (!text) return;
    
    const from = prompt('От кого? (Мартин/Лена)', 'Мартин');
    const to = prompt('Кому? (Мартин/Лена)', from === 'Мартин' ? 'Лена' : 'Мартин');
    
    haptic();
    await fetch(`${API_BASE}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to })
    });
    
    const data = await fetch(`${API_BASE}/api/reminders`).then(r => r.json());
    window.remindersData = data;
    renderReminders();
    toast('Записка добавлена 💕');
  } else {
    const text = prompt('Текст напоминания:');
    if (!text) return;
    
    const forWho = prompt('Для кого? (Мартин/Лена)', 'Мартин');
    if (!forWho) return;
    
    const from = prompt('От кого?', forWho === 'Мартин' ? 'Лена' : 'Мартин');
    if (!from) return;
    
    const daysStr = prompt('Через сколько дней? (0 = сегодня, 1 = завтра, 2 = послезавтра...)', '0');
    if (daysStr === null) return;
    const days = parseInt(daysStr) || 0;
    
    const timeStr = prompt('Во сколько? (формат: ЧЧ:ММ, например 14:30)', '12:00');
    if (!timeStr) return;
    
    // Создаём дату
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + days);
    const [hours, minutes] = timeStr.split(':').map(n => parseInt(n) || 0);
    reminderDate.setHours(hours, minutes, 0, 0);
    
    haptic();
    await fetch(`${API_BASE}/api/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text, 
        for: forWho, 
        from, 
        time: reminderDate.toISOString()
      })
    });
    
    const data = await fetch(`${API_BASE}/api/reminders`).then(r => r.json());
    window.remindersData = data;
    renderReminders();
    toast('Напоминание добавлено ⏰');
  }
};

// ========== СТРАНИЦА РАСПИСАНИЯ ==========
async function schedulePage() {
  const data = await fetch(`${API_BASE}/api/schedule`).then(r => r.json());
  
  commonShell(`
    <div class="topbar">
      <a class="brand" href="index.html">
        <span class="brand-mark">${icon('calendar')}</span>
        Family Space
      </a>
    </div>
    <section class="hero">
      <h1>Расписание Лены 📚</h1>
      <p class="hero-sub">Учебная неделя · ТП1-926</p>
    </section>
    <div id="week" class="date-strip"></div>
    <div id="classes"></div>
  `, 'schedule');
  
  let selected = 0;
  const week = document.getElementById('week');
  const classes = document.getElementById('classes');
  
  function renderDays() {
    week.innerHTML = data.schedule.map((d, i) => `
      <button class="day-pill ${i === selected ? 'selected' : ''}" onclick="window.selectDay(${i})">
        <span class="weekday">${d.day}</span>
        <strong>${d.date}</strong>
      </button>
    `).join('');
  }
  
  window.selectDay = (i) => {
    selected = i;
    haptic();
    renderDays();
    renderClasses();
  };
  
  function renderClasses() {
    const list = data.schedule[selected].classes;
    if (!list || list.length === 0) {
      classes.innerHTML = '<div class="panel empty"><div class="empty-emoji">☁️</div><strong>День свободен!</strong><p>Можно передохнуть или заняться своими проектами.</p></div>';
      return;
    }
    
    classes.innerHTML = list.map(c => `
      <article class="panel class-card">
        <div class="class-line ${c.kind || 'lecture'}"></div>
        <div style="flex:1">
          <div class="class-time">${c.time}</div>
          <div class="class-title">${c.title}</div>
          <div class="class-meta">
            ${icon('user', 15)} ${c.teacher}
            <span>·</span>
            ${icon('map', 15)} ${c.room}
          </div>
        </div>
      </article>
    `).join('');
  }
  
  renderDays();
  renderClasses();
}

// ========== РОУТИНГ ==========
(async () => {
  try {
    const page = location.pathname.split('/').pop() || 'index.html';
    
    if (page === 'shopping.html') await shoppingPage();
    else if (page === 'utilities.html') await utilitiesPage();
    else if (page === 'reminders.html') await remindersPage();
    else if (page === 'schedule.html') await schedulePage();
    else homePage();
    
    // Telegram Mini App API
    try {
      const tg = window.Telegram?.WebApp;
      tg?.ready();
      tg?.expand();
      tg?.setHeaderColor?.('#1A1625');
      tg?.setBackgroundColor?.('#1A1625');
    } catch (e) { }
  } catch (err) {
    console.error(err);
    document.body.innerHTML = '<main class="app panel"><h2>Ошибка загрузки</h2><p>' + err.message + '</p></main>';
  }
})();
