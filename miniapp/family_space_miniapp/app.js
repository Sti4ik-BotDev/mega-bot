// Family Space — единый скрипт страниц. Данные загружаются из data.json.
const iconPaths = {
  briefcase-business:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>',
  house:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
  bot:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/>',
  'book-open':'<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 0 3 23V5.5ZM21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5A2.5 2.5 0 0 1 21 23V5.5Z"/>',
  'notebook-pen':'<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4ZM8 8h7M8 12h7"/><path d="m16 16 4-4 2 2-4 4-2 1z"/>',
  'folder-kanban':'<path d="M3 5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z"/><path d="M7 11h3v5H7zM13 9h3v7h-3z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  check:'<path d="m5 12 4 4L19 6"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>', user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
};
function icon(name,size=22){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.calendar}</svg>`}
function haptic(){try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(e){}}
function toast(message){const t=document.querySelector('.toast');if(!t)return;t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function nav(active){return `<nav class="bottom-nav">
<a class="nav-item ${active==='home'?'active':''}" href="index.html">${icon('house',21)}<span>Домой</span></a>
<a class="nav-item ${active==='martin'?'active':''}" href="martin.html">${icon('briefcase-business',21)}<span>Мартин</span></a>
<a class="nav-item ${active==='lena'?'active':''}" href="lena.html">${icon('book-open',21)}<span>Лена</span></a>
<a class="nav-item ${active==='schedule'?'active':''}" href="schedule.html">${icon('calendar',21)}<span>Расписание</span></a>
<a class="nav-item ${active==='tasks'?'active':''}" href="tasks.html">${icon('folder-kanban',21)}<span>Задания</span></a></nav>`}
function tile(item,index){return `<a class="tile ${item.gradient}" href="${item.href}" style="animation-delay:${index*70}ms"><span class="tile-icon">${icon(item.icon,24)}</span><span><span class="tile-title">${item.title}</span><span class="tile-sub">${item.subtitle}</span></span></a>`}
async function loadData(){
  try {
    // Пытаемся загрузить с API сервера
    const response = await fetch('/api/schedule');
    const scheduleData = await response.json();
    
    // Загружаем остальные данные из статического JSON для демо
    const staticResponse = await fetch('data.json');
    const staticData = await staticResponse.json();
    
    // Объединяем: расписание с сервера, остальное из статики
    return {
      ...staticData,
      schedule: scheduleData.schedule || staticData.schedule
    };
  } catch (err) {
    console.error('Ошибка загрузки с API, используем статические данные', err);
    // Fallback на статические данные
    const response = await fetch('data.json');
    return response.json();
  }
}
function commonShell(content,active){document.body.innerHTML=`<div class="app">${content}</div>${nav(active)}<div class="toast" role="status"></div>`}
function homePage(data){
 commonShell(`<div class="topbar"><div class="brand"><span class="brand-mark">${icon('house',22)}</span><span>Family Space</span></div><button class="icon-button" aria-label="Настройки" onclick="toast('Настройки скоро появятся ✨')">⚙</button></div>
 <section class="hero"><p class="eyebrow">Ваш уютный цифровой дом</p><h1>Всё своё —<br>в одном месте ✨</h1><p class="hero-sub">Работа, учёба и домашние дела.</p></section>
 <div class="switcher"><a href="martin.html">Мартин 💼</a><a href="lena.html">Лена 🌸</a></div>
 <div class="grid"><a class="tile business" href="martin.html"><span class="tile-icon">${icon('briefcase-business')}</span><span><span class="tile-title">Мартин</span><span class="tile-sub">Работа, идеи, проекты</span></span></a>
 <a class="tile study" href="lena.html"><span class="tile-icon">${icon('book-open')}</span><span><span class="tile-title">Лена</span><span class="tile-sub">Учёба и заметки</span></span></a>
 <a class="tile home" href="#"><span class="tile-icon">${icon('house')}</span><span><span class="tile-title">Наш дом</span><span class="tile-sub">3 задачи · 5 покупок</span></span></a>
 <a class="tile ai" href="#"><span class="tile-icon">${icon('bot')}</span><span><span class="tile-title">Kiro AI</span><span class="tile-sub">Помощник для семьи</span></span></a></div>
 <div class="section-head"><h2>Сегодня вместе</h2><a class="small-link" href="tasks.html">Все задания →</a></div><div class="panel"><div style="display:flex;gap:12px;align-items:center"><div style="font-size:27px">🫶</div><div><strong>Домашний уют начинается с мелочей</strong><div class="tile-sub">Планируйте, помогайте друг другу и не забывайте отдыхать.</div></div></div></div>`, 'home');
}
function personPage(data,person){
 const p=data.family[person],tiles=data[person];
 commonShell(`<div class="topbar"><a class="brand" href="index.html"><span class="brand-mark">${icon('house')}</span>Family Space</a><button class="icon-button" onclick="toast('Уведомления: тихий режим 🌙')">☾</button></div>
 <section class="hero"><div class="profile-row"><div class="avatar ${person==='lena'?'mint':''}">${p.avatar}</div><div><p class="eyebrow">${person==='martin'?'Твоё пространство':'Твоё пространство'}</p><h1>${p.greeting}</h1><p class="hero-sub">${p.subtitle}</p></div></div></section>
 <div class="switcher"><a class="${person==='martin'?'active':''}" href="martin.html">Мартин 💼</a><a class="${person==='lena'?'active':''}" href="lena.html">Лена 🌸</a></div>
 <div class="section-head"><h2>${person==='martin'?'Твои дела':'Твой день'}</h2></div><div class="grid">${tiles.map(tile).join('')}</div>
 <div class="section-head"><h2>Общее пространство</h2></div><a class="tile home" href="#" style="min-height:120px"><span class="tile-icon">${icon('house')}</span><span><span class="tile-title">Наш дом 🏡</span><span class="tile-sub">3 задачи · 5 покупок в списке</span></span></a>
 ${person==='lena'?`<div class="section-head"><h2>Ближайшая пара</h2><a class="small-link" href="schedule.html">Расписание →</a></div><div class="panel"><div class="class-time">12:20–13:50</div><div class="class-title">Методы исследования</div><div class="class-meta">${icon('user',15)} Е. П. Смирнова · ${icon('map',15)} Лаб. 2</div></div>`:''}`,person);
}
function schedulePage(data){
 commonShell(`<div class="topbar"><a class="brand" href="index.html"><span class="brand-mark">${icon('calendar')}</span>Расписание</a><button class="icon-button" onclick="toast('Уведомления включены ✨')">♧</button></div>
 <section class="hero"><p class="eyebrow">Лена · учебная неделя</p><h1>Твой ритм<br>на этой неделе 🌿</h1><p class="hero-sub">Выбирай день — посмотрим, что впереди.</p></section><div id="week" class="date-strip"></div><div id="classes"></div><button class="fab" aria-label="Добавить занятие" onclick="toast('Добавление занятия — демо ✨')">+</button>`, 'schedule');
 let selected=1;
 const week=document.getElementById('week'), classes=document.getElementById('classes');
 function renderDays(){week.innerHTML=data.schedule.map((d,i)=>`<button class="day-pill ${i===selected?'selected':''} ${i===1?'today':''}" onclick="window.selectDay(${i})"><span class="weekday">${d.day}</span><strong>${d.date}</strong></button>`).join('')}
 window.selectDay=(i)=>{selected=i;haptic();renderDays();renderClasses()}
 function renderClasses(){const list=data.schedule[selected].classes;if(!list.length){classes.innerHTML='<div class="panel empty"><div class="empty-emoji">☁️</div><strong>День свободен!</strong><p>Можно передохнуть или заняться своими проектами.</p></div>';return}
 classes.innerHTML=list.map((c,i)=>`<article class="panel class-card" onclick="this.classList.toggle('open');haptic()"><div class="class-line ${c.kind}"></div><div style="flex:1"><div class="class-time">${c.time}</div><div class="class-title">${c.title}</div><div class="class-meta">${icon('user',15)} ${c.teacher}<span>·</span>${icon('map',15)} ${c.room}</div><div class="class-details"><p>${c.detail}</p></div></div></article>`).join('')}
 renderDays();renderClasses();
}
function tasksPage(data){
 commonShell(`<div class="topbar"><a class="brand" href="index.html"><span class="brand-mark">${icon('folder-kanban')}</span>Задания</a><button class="icon-button" onclick="toast('Список синхронизирован ☁️')">↻</button></div>
 <section class="hero"><p class="eyebrow">Лена · маленькие шаги тоже важны</p><h1>Всё получится ✨</h1><p class="hero-sub">Соберём задачи в понятный план.</p></section>
 <div class="panel task-summary"><div class="progress-ring"><strong id="progress-number">3/5</strong></div><div><strong>Выполнено <span id="done-count">3</span> из 5</strong><p class="hero-sub" style="margin:5px 0 0">Ты уже хорошо продвинулась!</p></div></div>
 <div class="task-tabs"><button class="task-tab active" data-tab="course" onclick="switchTaskTab('course')">📋 Курсачи</button><button class="task-tab" data-tab="project" onclick="switchTaskTab('project')">📁 Проекты</button></div><div id="task-list"></div><button class="fab" onclick="toast('Новая задача — демо ✨')" aria-label="Добавить задачу">+</button>`, 'tasks');
 let active='course';let tasks=[...data.tasks];
 window.switchTaskTab=(tab)=>{active=tab;document.querySelectorAll('.task-tab').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));renderTasks()};
 function dateLabel(due){const days=Math.ceil((new Date(due+'T23:59:59')-new Date())/86400000);let label=days<0?'Просрочено':days===0?'Сегодня':days===1?'Завтра':`Через ${days} дн.`;let cls=days>7?'green':days>=3?'yellow':'red';return {label,cls}}
 function renderTasks(){let filtered=tasks.filter(t=>t.type===active);document.getElementById('task-list').innerHTML=filtered.map(t=>{const date=dateLabel(t.due);return `<article class="panel task-card ${t.done?'done':''}"><button class="task-check ${t.done?'checked':''}" onclick="toggleTask(${t.id})" aria-label="Отметить">${t.done?icon('check',16):''}</button><div style="flex:1"><div class="task-name">${t.title}</div><div class="task-due ${date.cls}">◷ ${date.label}</div><div class="progress-track"><div class="progress-fill" style="width:${t.progress}%"></div></div></div><button class="icon-button" style="width:34px;height:34px" onclick="removeTask(${t.id})" aria-label="Удалить">×</button></article>`}).join('')||'<div class="panel empty"><div class="empty-emoji">🌷</div>Здесь пока пусто — можно выдохнуть!</div>';let count=tasks.filter(t=>t.done).length;document.getElementById('done-count').textContent=count;document.getElementById('progress-number').textContent=count+'/'+tasks.length}
 window.toggleTask=(id)=>{tasks=tasks.map(t=>t.id===id?{...t,done:!t.done,progress:!t.done?100:Math.min(t.progress,80)}:t);haptic();renderTasks()};
 window.removeTask=(id)=>{tasks=tasks.filter(t=>t.id!==id);haptic();toast('Задача убрана');renderTasks()};
 renderTasks();
}
(async()=>{try{const data=await loadData();const page=location.pathname.split('/').pop()||'index.html';if(page==='martin.html')personPage(data,'martin');else if(page==='lena.html')personPage(data,'lena');else if(page==='schedule.html')schedulePage(data);else if(page==='tasks.html')tasksPage(data);else homePage(data);
 // Telegram Mini App API: раскрываем viewport и просим тему. Haptic вызывается на кнопках.
 try{const tg=window.Telegram?.WebApp;tg?.ready();tg?.expand();tg?.setHeaderColor?.('#1A1625');tg?.setBackgroundColor?.('#1A1625')}catch(e){}
 }catch(err){document.body.innerHTML='<main class="app panel"><h2>Не удалось загрузить данные</h2><p>Проверьте, что запускаете приложение через локальный сервер, а не открываете файл напрямую.</p></main>'}})();
