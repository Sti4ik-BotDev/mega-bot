'use strict';
const TelegramBot = require('node-telegram-bot-api');
const fs   = require('fs');
const path = require('path');

const TOKEN = (() => {
  try { return fs.readFileSync(path.join(__dirname,'.env'),'utf8').match(/TOKEN=(.+)/)[1].trim(); }
  catch(e) { return process.env.TOKEN; }
})();

const CLIENTS_FILE = path.join(__dirname, 'clients.json');

const bot = new TelegramBot(TOKEN, {
  polling: { interval: 100, params: { timeout: 10, allowed_updates: ['message','callback_query'] } }
});

function load() { return JSON.parse(fs.readFileSync(CLIENTS_FILE,'utf8')); }
function save(list) { fs.writeFileSync(CLIENTS_FILE, JSON.stringify(list,null,2),'utf8'); }

const TYPE_ICON = {
  'Маникюр':'💅','Барбершоп':'✂️','Визажист':'💄','Массаж':'💆','SPA':'🛁',
  'Фотограф':'📸','Кондитер':'🎂','Клининг':'🧹','Салон':'💇','Макияж':'💄',
  'Центр':'🏢','Салон':'💇',
};
const STATUS_ICON  = { 'НЕ НАЧАТО':'⬜','ЖДЁМ':'🕐','В РАБОТЕ':'🔵','ПРОДАНО':'💰','ОТКАЗ':'❌','ИСКАТЬ':'🔍' };
const STATUS_LABEL = { 'НЕ НАЧАТО':'Не начато','ЖДЁМ':'Ждёт ответа','В РАБОТЕ':'В работе','ПРОДАНО':'Продано','ОТКАЗ':'Отказ','ИСКАТЬ':'Найти контакт' };
const PRI_ICON     = { 'ОЧЕНЬ ВЫСОКИЙ':'🔥','ВЫСОКИЙ':'⚡','СРЕДНИЙ':'📌','НИЗКИЙ':'💤' };

// Безопасный текст — убираем всё что ломает Markdown
function safe(s){ return String(s||'').replace(/[*_`[\]]/g,''); }

// ── карточка ────────────────────────────────────────────
function card(c){
  const ti = TYPE_ICON[c.type] || '🏢';
  const si = STATUS_ICON[c.status] || '❓';
  const pi = PRI_ICON[c.priority] || '';
  const hasPhone = c.phone && !c.phone.startsWith('найти') && c.phone !== 'на сайте';

  let t = '';
  t += `${ti} *${safe(c.name)}*\n`;
  t += `📍 ${safe(c.city)} · ${safe(c.type)}\n`;
  t += `${pi} Приоритет: ${safe(c.priority)}\n`;
  t += `${si} Статус: *${safe(c.status)}*\n`;
  if(hasPhone)   t += `\n📞 ${safe(c.phone)}\n`;
  if(c.telegram) t += `✈️ @${safe(c.telegram)}\n`;
  if(c.notes)    t += `\n📌 ${safe(c.notes)}\n`;
  if(c.script)   t += `\n💬 Скрипт готов — нажми кнопку ниже`;
  return t;
}

function cardKbd(c){
  const rows = [];
  const hasPhone = c.phone && !c.phone.startsWith('найти') && c.phone !== 'на сайте';
  const contact = [];
  if(hasPhone)   contact.push({text:`📞 ${c.phone}`, url:`tel:${c.phone.replace(/\D/g,'')}`});
  if(c.whatsapp) contact.push({text:'💬 WhatsApp',   url:`https://wa.me/${c.whatsapp}`});
  if(c.telegram) contact.push({text:'✈️ Telegram',  url:`https://t.me/${c.telegram}`});
  if(contact.length) rows.push(contact);
  if(c.script)   rows.push([{text:'📋 Скопировать скрипт', callback_data:`SC_${c.id}`}]);
  rows.push([
    {text:'✅ Написал',   callback_data:`ST_${c.id}_JD`},
    {text:'🔵 В работе', callback_data:`ST_${c.id}_WK`},
  ]);
  rows.push([
    {text:'💰 Продано',  callback_data:`ST_${c.id}_SL`},
    {text:'❌ Отказ',    callback_data:`ST_${c.id}_NO`},
  ]);
  rows.push([
    {text:'← К списку', callback_data:'LS_hot_0'},
    {text:'🏠 Меню',    callback_data:'MENU'},
  ]);
  return {inline_keyboard:rows};
}

const STATUS_MAP = { JD:'ЖДЁМ', WK:'В РАБОТЕ', SL:'ПРОДАНО', NO:'ОТКАЗ' };

function mainMenuKbd(clients){
  const hot  = clients.filter(c=>['ОЧЕНЬ ВЫСОКИЙ','ВЫСОКИЙ'].includes(c.priority) && !['ОТКАЗ','ПРОДАНО','ИСКАТЬ'].includes(c.status)).length;
  const wait = clients.filter(c=>c.status==='ЖДЁМ').length;
  const work = clients.filter(c=>c.status==='В РАБОТЕ').length;
  const sold = clients.filter(c=>c.status==='ПРОДАНО').length;
  const find = clients.filter(c=>c.status==='ИСКАТЬ').length;
  return {inline_keyboard:[
    [{text:`🔥 Топ — с кого начать (${hot})`,    callback_data:'LS_hot_0'}],
    [{text:`📋 Все контакты (${clients.length})`,  callback_data:'LS_all_0'}],
    [{text:`🕐 Ждут ответа (${wait})`,             callback_data:'LS_wait_0'}],
    [{text:`🔵 В работе (${work})`,               callback_data:'LS_work_0'}],
    [{text:`💰 Продажи (${sold})`,                 callback_data:'LS_sold_0'}],
    [{text:`🔍 Найти контакт (${find})`,           callback_data:'LS_find_0'}],
    [{text:'📊 Статистика',                        callback_data:'STATS'}],
  ]};
}

const PAGE = 7;
const TAG_TITLE = {
  hot:'🔥 Топ — писать прямо сейчас',
  all:'📋 Все контакты',
  wait:'🕐 Ждут ответа',
  work:'🔵 В работе',
  sold:'💰 Продажи',
  find:'🔍 Нужно найти контакт',
};

function filterClients(tag){
  const all = load();
  if(tag==='hot')  return all.filter(c=>['ОЧЕНЬ ВЫСОКИЙ','ВЫСОКИЙ'].includes(c.priority) && !['ОТКАЗ','ПРОДАНО','ИСКАТЬ'].includes(c.status));
  if(tag==='wait') return all.filter(c=>c.status==='ЖДЁМ');
  if(tag==='work') return all.filter(c=>c.status==='В РАБОТЕ');
  if(tag==='sold') return all.filter(c=>c.status==='ПРОДАНО');
  if(tag==='find') return all.filter(c=>c.status==='ИСКАТЬ');
  return all;
}

function listMsg(tag, page){
  const clients = filterClients(tag);
  const total   = clients.length;
  const slice   = clients.slice(page*PAGE, page*PAGE+PAGE);

  const rows = slice.map(c => {
    const ti = TYPE_ICON[c.type] || '🏢';
    const si = STATUS_ICON[c.status] || '';
    return [{
      text: `${ti} ${safe(c.name)} · ${safe(c.city)} ${si}`,
      callback_data: `CD_${c.id}`
    }];
  });

  const nav = [];
  if(page > 0)                  nav.push({text:'← Назад',  callback_data:`LS_${tag}_${page-1}`});
  if((page+1)*PAGE < total)     nav.push({text:'Вперёд →', callback_data:`LS_${tag}_${page+1}`});
  if(nav.length) rows.push(nav);
  rows.push([{text:'🏠 Главное меню', callback_data:'MENU'}]);

  const pageInfo = total > PAGE ? ` · стр. ${page+1}/${Math.ceil(total/PAGE)}` : '';
  const title = `${TAG_TITLE[tag]||'Список'} — ${total}${pageInfo}`;
  return { title, kbd:{inline_keyboard:rows} };
}

function edit(cid, mid, text, kbd){
  return bot.editMessageText(text, {
    chat_id:cid, message_id:mid,
    parse_mode:'Markdown', reply_markup:kbd
  }).catch(e => console.error('edit err:', e.message));
}

// /start
bot.onText(/\/start|\/menu/, msg => {
  const clients = load();
  const sold = clients.filter(c=>c.status==='ПРОДАНО').length;
  const work = clients.filter(c=>c.status==='В РАБОТЕ').length;
  let text = '🏠 *Главное меню*\n\n';
  text += `💼 Контактов в базе: *${clients.length}*\n`;
  if(work) text += `🔵 В работе: *${work}*\n`;
  if(sold) text += `💰 Продано: *${sold}*\n`;
  bot.sendMessage(msg.chat.id, text, {
    parse_mode:'Markdown',
    reply_markup: mainMenuKbd(clients)
  });
});

bot.on('callback_query', q => {
  bot.answerCallbackQuery(q.id).catch(()=>{});
  const cid = q.message.chat.id;
  const mid = q.message.message_id;
  const d   = q.data;

  // МЕНЮ
  if(d === 'MENU'){
    const clients = load();
    const sold = clients.filter(c=>c.status==='ПРОДАНО').length;
    const work = clients.filter(c=>c.status==='В РАБОТЕ').length;
    let text = '🏠 *Главное меню*\n\n';
    text += `💼 Контактов: *${clients.length}*\n`;
    if(work) text += `🔵 В работе: *${work}*\n`;
    if(sold) text += `💰 Продано: *${sold}*\n`;
    edit(cid, mid, text, mainMenuKbd(clients));
    return;
  }

  // СТАТИСТИКА
  if(d === 'STATS'){
    const all = load();
    const byStatus = {}, byCity = {};
    all.forEach(c => {
      byStatus[c.status] = (byStatus[c.status]||0)+1;
      byCity[c.city]     = (byCity[c.city]||0)+1;
    });
    let t = '📊 *Статистика*\n\n';
    t += '*По статусам:*\n';
    Object.entries(STATUS_LABEL).forEach(([st, lbl]) => {
      const ic = STATUS_ICON[st]||'';
      if(byStatus[st]) t += `${ic} ${lbl}: *${byStatus[st]}*\n`;
    });
    t += '\n*По городам:*\n';
    Object.entries(byCity).sort((a,b)=>b[1]-a[1]).forEach(([city,cnt]) => {
      t += `📍 ${city}: *${cnt}*\n`;
    });
    t += `\n👥 Всего: *${all.length}*`;
    edit(cid, mid, t, {inline_keyboard:[[{text:'🏠 Меню', callback_data:'MENU'}]]});
    return;
  }

  // СПИСОК  LS_tag_page
  if(d.startsWith('LS_')){
    const parts = d.split('_');
    const tag  = parts[1];
    const page = parseInt(parts[2])||0;
    const { title, kbd } = listMsg(tag, page);
    edit(cid, mid, `*${safe(title)}*`, kbd);
    return;
  }

  // КАРТОЧКА  CD_id
  if(d.startsWith('CD_')){
    const id = parseInt(d.split('_')[1]);
    const c  = load().find(x=>x.id===id);
    if(!c) return;
    edit(cid, mid, card(c), cardKbd(c));
    return;
  }

  // СКРИПТ  SC_id
  if(d.startsWith('SC_')){
    const id = parseInt(d.split('_')[1]);
    const c  = load().find(x=>x.id===id);
    if(!c) return;
    bot.sendMessage(cid,
      `� *Скрипт для ${safe(c.name)}:*\n\n${safe(c.script)}`,
      {
        parse_mode:'Markdown',
        reply_markup:{inline_keyboard:[[{text:'← Назад к карточке', callback_data:`CD_${c.id}`}]]}
      }
    );
    return;
  }

  // Карточка клиента
  if (data.startsWith('card_')) {
    const id = parseInt(data.split('_')[1]);
    const clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    bot.editMessageText(formatCard(c), {
      chat_id: chatId, message_id: msgId,
      parse_mode: 'MarkdownV2', reply_markup: cardButtons(c)
    });
    return;
  }

  // Скрипт — отправить отдельным сообщением (легко скопировать)
  if (data.startsWith('script_')) {
    const id = parseInt(data.split('_')[1]);
    const clients = loadClients();
// ── ЛИДЫ ────────────────────────────────────────────────
const LEADS_FILE = path.join(__dirname, '..', 'LEAD-PARSER', 'leads.json');
const LEADS_SENT_FILE = path.join(__dirname, 'leads-sent.json');

function loadLeads() {
  try {
    if (!fs.existsSync(LEADS_FILE)) return [];
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch(e) { return []; }
}

function loadSent() {
  try {
    if (!fs.existsSync(LEADS_SENT_FILE)) return {};
    return JSON.parse(fs.readFileSync(LEADS_SENT_FILE, 'utf8'));
  } catch(e) { return {}; }
}

function saveSent(data) {
  fs.writeFileSync(LEADS_SENT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getNextLead() {
  const leads = loadLeads();
  const sent = loadSent();
  return leads.find((l, i) => !sent[i]) || null;
}

function getNextLeadIndex() {
  const leads = loadLeads();
  const sent = loadSent();
  return leads.findIndex((l, i) => !sent[i]);
}

function markSent(index) {
  const sent = loadSent();
  sent[index] = true;
  saveSent(sent);
}

function leadsStats() {
  const leads = loadLeads();
  const sent = loadSent();
  const sentCount = Object.keys(sent).length;
  return {
    total: leads.length,
    sent: sentCount,
    left: leads.length - sentCount
  };
}

function leadText(lead) {
  const niche = lead.niche || 'услуги';
  const name = lead.name || 'там';
  const city = lead.city || '';
  const price = lead.priceRange ? lead.priceRange.split('-')[0] + '₽' : '3500₽';

  // Определяем тип услуги для текста
  let service = 'услуги';
  if (niche.includes('Клининг')) service = 'клининг';
  else if (niche.includes('Химчистк')) service = 'химчистку мебели';
  else if (niche.includes('Ремонт техники')) service = 'ремонт техники';
  else if (niche.includes('Грузо')) service = 'грузоперевозки';
  else if (niche.includes('Эвакуатор')) service = 'эвакуатор';
  else if (niche.includes('Сантехник')) service = 'сантехнику/электрику';
  else if (niche.includes('Автосервис')) service = 'автосервис';
  else if (niche.includes('Ремонт квартир')) service = 'ремонт квартир';

  return `Привет! Видел твои услуги по ${service} — работаешь качественно 👍

Делаю сайты для мастеров за ${price}. 

Многие клиенты ищут "${service} ${city}" через Яндекс — без сайта они тебя не найдут и уйдут к конкурентам.

Что будет на сайте:
• Твои услуги и цены
• Фото работ
• Кнопка "Заказать" (Telegram/WhatsApp)
• Готово за 2-3 дня

Один новый заказ — и сайт окупился. Интересно посмотреть?`;
}

function leadCard(lead, index) {
  const sent = loadSent();
  const isSent = sent[index];
  let t = '';
  t += `🎯 *Лид #${index + 1}*\n\n`;
  t += `📋 ${safe(lead.name)}\n`;
  t += `📍 ${safe(lead.city)} · ${safe(lead.niche)}\n`;
  if (lead.phone) t += `📞 ${safe(lead.phone)}\n`;
  t += `💰 Цена: ${safe(lead.priceRange)}₽\n`;
  t += `${isSent ? '✅ Отправлено' : '⬜ Не отправлено'}\n`;
  if (lead.description) t += `\n📝 ${safe(lead.description.substring(0, 150))}...\n`;
  return t;
}

function leadKbd(index, avitoLink) {
  const rows = [];
  if (avitoLink) {
    rows.push([{ text: '🔗 Открыть на Авито', url: avitoLink }]);
  }
  rows.push([{ text: '📋 Скопировать текст', callback_data: `LD_TXT_${index}` }]);
  rows.push([
    { text: '✅ Отправлено', callback_data: `LD_SENT_${index}` },
    { text: '⏭ Пропустить', callback_data: `LD_SKIP_${index}` },
  ]);
  rows.push([{ text: '⏭ Следующий лид', callback_data: 'LD_NEXT' }]);
  rows.push([{ text: '🏠 Меню', callback_data: 'MENU' }]);
  return { inline_keyboard: rows };
}

function leadsMenuKbd() {
  const stats = leadsStats();
  return { inline_keyboard: [
    [{ text: `⏭ Следующий лид (осталось: ${stats.left})`, callback_data: 'LD_NEXT' }],
    [{ text: `📊 Статистика лидов`, callback_data: 'LD_STATS' }],
    [{ text: '🔄 Сбросить все отметки', callback_data: 'LD_RESET' }],
    [{ text: '🏠 Главное меню', callback_data: 'MENU' }],
  ]};
}

// Добавляем кнопку лидов в главное меню
const origMainMenuKbd = mainMenuKbd;
function mainMenuKbd(clients) {
  const kbd = origMainMenuKbd(clients);
  const stats = leadsStats();
  if (stats.total > 0) {
    kbd.inline_keyboard.splice(2, 0, [
      { text: `🎯 Лиды с Авито (${stats.left} новых)`, callback_data: 'LD_MENU' }
    ]);
  }
  return kbd;
}

// Обработка лидов
bot.on('callback_query', q => {
  const cid = q.message.chat.id;
  const mid = q.message.message_id;
  const d   = q.data;

  if (!d.startsWith('LD_')) return;
  bot.answerCallbackQuery(q.id).catch(() => {});

  // Меню лидов
  if (d === 'LD_MENU') {
    const stats = leadsStats();
    let t = '🎯 *Лиды с Авито*\n\n';
    t += `📊 Всего: *${stats.total}*\n`;
    t += `✅ Отправлено: *${stats.sent}*\n`;
    t += `⬜ Осталось: *${stats.left}*\n`;
    edit(cid, mid, t, leadsMenuKbd());
    return;
  }

  // Статистика лидов
  if (d === 'LD_STATS') {
    const leads = loadLeads();
    const sent = loadSent();
    const byNiche = {}, byCity = {};
    leads.forEach((l, i) => {
      if (!sent[i]) {
        byNiche[l.niche] = (byNiche[l.niche] || 0) + 1;
        byCity[l.city] = (byCity[l.city] || 0) + 1;
      }
    });
    let t = '📊 *Статистика лидов*\n\n';
    t += '*По нишам (не отправлено):*\n';
    Object.entries(byNiche).sort((a,b) => b[1]-a[1]).forEach(([n, c]) => {
      t += `• ${n}: *${c}*\n`;
    });
    t += '\n*По городам (не отправлено):*\n';
    Object.entries(byCity).sort((a,b) => b[1]-a[1]).forEach(([c, n]) => {
      t += `• ${c}: *${n}*\n`;
    });
    edit(cid, mid, t, { inline_keyboard: [[{ text: '← Назад', callback_data: 'LD_MENU' }]] });
    return;
  }

  // Следующий лид
  if (d === 'LD_NEXT') {
    const index = getNextLeadIndex();
    if (index === -1) {
      edit(cid, mid, '🎉 *Все лиды обработаны!*\n\nЗапусти парсер снова чтобы получить новых.', {
        inline_keyboard: [[{ text: '🏠 Меню', callback_data: 'MENU' }]]
      });
      return;
    }
    const leads = loadLeads();
    const lead = leads[index];
    edit(cid, mid, leadCard(lead, index), leadKbd(index, lead.avitoLink));
    return;
  }

  // Скопировать текст
  if (d.startsWith('LD_TXT_')) {
    const index = parseInt(d.split('_')[2]);
    const leads = loadLeads();
    const lead = leads[index];
    if (!lead) return;
    bot.sendMessage(cid,
      `📋 *Текст для отправки:*\n\n${leadText(lead)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '← Назад к лиду', callback_data: `LD_NEXT` }]
        ]}
      }
    );
    return;
  }

  // Отметить как отправлено
  if (d.startsWith('LD_SENT_')) {
    const index = parseInt(d.split('_')[2]);
    markSent(index);
    const leads = loadLeads();
    const lead = leads[index];
    bot.answerCallbackQuery(q.id, { text: '✅ Отмечено как отправлено!' }).catch(() => {});
    // Показываем следующий лид автоматически
    const nextIndex = getNextLeadIndex();
    if (nextIndex === -1) {
      edit(cid, mid, '🎉 *Все лиды обработаны!*\n\nЗапусти парсер снова чтобы получить новых.', {
        inline_keyboard: [[{ text: '🏠 Меню', callback_data: 'MENU' }]]
      });
      return;
    }
    const nextLead = leads[nextIndex];
    edit(cid, mid, leadCard(nextLead, nextIndex), leadKbd(nextIndex, nextLead.avitoLink));
    return;
  }

  // Пропустить
  if (d.startsWith('LD_SKIP_')) {
    const index = parseInt(d.split('_')[2]);
    markSent(index);
    const nextIndex = getNextLeadIndex();
    if (nextIndex === -1) {
      edit(cid, mid, '🎉 *Все лиды обработаны!*', {
        inline_keyboard: [[{ text: '🏠 Меню', callback_data: 'MENU' }]]
      });
      return;
    }
    const leads = loadLeads();
    const nextLead = leads[nextIndex];
    edit(cid, mid, leadCard(nextLead, nextIndex), leadKbd(nextIndex, nextLead.avitoLink));
    return;
  }

  // Сброс
  if (d === 'LD_RESET') {
    saveSent({});
    const stats = leadsStats();
    bot.answerCallbackQuery(q.id, { text: '🔄 Все отметки сброшены!' }).catch(() => {});
    let t = '🎯 *Лиды с Авито*\n\n';
    t += `📊 Всего: *${stats.total}*\n`;
    t += `✅ Отправлено: *${stats.sent}*\n`;
    t += `⬜ Осталось: *${stats.left}*\n`;
    edit(cid, mid, t, leadsMenuKbd());
    return;
  }
});

bot.on('polling_error', e => console.error('polling_error:', e.message));
console.log('CRM-bot OK — @shabashkanaxyi_bot');
    bot.sendMessage(chatId, c.script, {
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад к карточке', callback_data: `card_${c.id}` }]] }
    });
    return;
  }

  // Смена статуса
  if (data.startsWith('status_')) {
    const parts = data.split('_');
    const id = parseInt(parts[1]);
    const newStatus = parts.slice(2).join('_');
    const clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    c.status = newStatus;
    saveClients(clients);
    bot.editMessageText(formatCard(c), {
      chat_id: chatId, message_id: msgId,
      parse_mode: 'MarkdownV2', reply_markup: cardButtons(c)
    });
    return;
  }
});

bot.on('polling_error', e => console.error('polling_error:', e.message));
console.log('CRM-bot OK — @shabashkanaxyi_bot');
