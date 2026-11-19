'use strict';
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const https = require('https');
const scheduleParser = require('./schedule-parser');

// ========== КОНФИГУРАЦИЯ ==========
const config = {};
try {
  const envContent = fs.readFileSync(path.join(__dirname,'.env'),'utf8');
  config.TOKEN = envContent.match(/TOKEN=(.+)/)[1].trim();
  config.YANDEX_TOKEN = envContent.match(/YANDEX_TOKEN=(.+)/)?.[1]?.trim();
  config.YANDEX_SCHEDULE_URL = envContent.match(/YANDEX_SCHEDULE_URL=(.+)/)?.[1]?.trim();
  config.STUDENT_GROUP = envContent.match(/STUDENT_GROUP=(.+)/)?.[1]?.trim() || 'ТП1-926';
} catch(e) {
  config.TOKEN = process.env.TOKEN?.trim();
  config.YANDEX_TOKEN = process.env.YANDEX_TOKEN?.trim();
  config.YANDEX_SCHEDULE_URL = process.env.YANDEX_SCHEDULE_URL?.trim();
  config.STUDENT_GROUP = process.env.STUDENT_GROUP?.trim() || 'ТП1-926';
}

// Проверка токена
if (!config.TOKEN) {
  console.error('❌ ОШИБКА: TOKEN не найден!');
  console.error('Проверь переменные окружения на Railway');
  process.exit(1);
}
console.log('✅ TOKEN загружен:', config.TOKEN.substring(0, 10) + '...');

// Пользователи
const MARTIN_ID = 881304735;
const LENA_ID = 5092397904;

// Файлы данных
const CLIENTS_FILE = path.join(__dirname, 'clients.json');
const SHOPPING_FILE = path.join(__dirname, 'shopping.json');
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const SCHEDULE_FILE = path.join(__dirname, 'current_schedule.xlsx');
const SCHEDULE_DATA_FILE = path.join(__dirname, 'schedule_data.json');
const LEADS_FILE = path.join(__dirname, '..', 'LEAD-PARSER', 'leads.json');
const LEADS_SENT_FILE = path.join(__dirname, 'leads-sent.json');

// Инициализация бота
const bot = new TelegramBot(config.TOKEN, {
  polling: { interval: 100, params: { timeout: 10, allowed_updates: ['message','callback_query'] } }
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function safe(s){ return String(s||'').replace(/[*_`[\]]/g,''); }

function loadClients() { 
  try { return JSON.parse(fs.readFileSync(CLIENTS_FILE,'utf8')); } 
  catch(e) { return []; }
}
function saveClients(list) { fs.writeFileSync(CLIENTS_FILE, JSON.stringify(list,null,2),'utf8'); }

function loadShopping() {
  try { return JSON.parse(fs.readFileSync(SHOPPING_FILE,'utf8')); }
  catch(e) { return []; }
}
function saveShopping(list) { fs.writeFileSync(SHOPPING_FILE, JSON.stringify(list,null,2),'utf8'); }

function loadTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE,'utf8')); }
  catch(e) { return []; }
}
function saveTasks(list) { fs.writeFileSync(TASKS_FILE, JSON.stringify(list,null,2),'utf8'); }

function loadScheduleData() {
  try { return JSON.parse(fs.readFileSync(SCHEDULE_DATA_FILE,'utf8')); }
  catch(e) { return null; }
}
function saveScheduleData(data) { fs.writeFileSync(SCHEDULE_DATA_FILE, JSON.stringify(data,null,2),'utf8'); }

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

// Иконки
const TYPE_ICON = {
  'Маникюр':'💅','Барбершоп':'✂️','Визажист':'💄','Массаж':'💆','SPA':'🛁',
  'Фотограф':'📸','Кондитер':'🎂','Клининг':'🧹','Салон':'💇'
};
const STATUS_ICON = { 'НЕ НАЧАТО':'⬜','ЖДЁМ':'🕐','В РАБОТЕ':'🔵','ПРОДАНО':'💰','ОТКАЗ':'❌','ИСКАТЬ':'🔍' };
const STATUS_LABEL = { 'НЕ НАЧАТО':'Не начато','ЖДЁМ':'Ждёт ответа','В РАБОТЕ':'В работе','ПРОДАНО':'Продано','ОТКАЗ':'Отказ','ИСКАТЬ':'Найти контакт' };
const PRI_ICON = { 'ОЧЕНЬ ВЫСОКИЙ':'🔥','ВЫСОКИЙ':'⚡','СРЕДНИЙ':'📌','НИЗКИЙ':'💤' };
const STATUS_MAP = { JD:'ЖДЁМ', WK:'В РАБОТЕ', SL:'ПРОДАНО', NO:'ОТКАЗ' };
const PAGE = 7;

// ========== МЕНЮ ==========
function mainMenuKbd(userId) {
  const miniAppUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
    : 'https://mega-bot-production-347d94a8.up.railway.app'; // fallback
  
  // Меню для Мартина
  if (userId === MARTIN_ID) {
    return {inline_keyboard:[
      [{text:'🌐 Открыть веб-версию', web_app: {url: miniAppUrl}}],
      [{text:'💼 Мой бизнес', callback_data:'MENU_BUSINESS'}],
      [{text:'🏡 Дом', callback_data:'MENU_HOME'}],
      [{text:'🤖 Kiro AI', callback_data:'MENU_AI'}],
      [{text:'📊 Статистика', callback_data:'STATS_ALL'}]
    ]};
  }
  
  // Меню для Лены
  if (userId === LENA_ID) {
    return {inline_keyboard:[
      [{text:'🌐 Открыть веб-версию', web_app: {url: miniAppUrl}}],
      [{text:'📚 Учёба', callback_data:'MENU_STUDY'}],
      [{text:'📝 Заметки', callback_data:'MENU_NOTES'}],
      [{text:'📂 Задания', callback_data:'MENU_TASKS'}],
      [{text:'🏡 Дом', callback_data:'MENU_HOME'}]
    ]};
  }
  
  // Для остальных - базовое меню
  return {inline_keyboard:[
    [{text:'🌐 Открыть веб-версию', web_app: {url: miniAppUrl}}],
    [{text:'💼 Мой бизнес', callback_data:'MENU_BUSINESS'}],
    [{text:'📚 Учёба', callback_data:'MENU_STUDY'}],
    [{text:'🏡 Дом', callback_data:'MENU_HOME'}],
    [{text:'🤖 Kiro AI', callback_data:'MENU_AI'}]
  ]};
}

function businessMenuKbd() {
  const clients = loadClients();
  const hot = clients.filter(c=>['ОЧЕНЬ ВЫСОКИЙ','ВЫСОКИЙ'].includes(c.priority) && !['ОТКАЗ','ПРОДАНО','ИСКАТЬ'].includes(c.status)).length;
  const wait = clients.filter(c=>c.status==='ЖДЁМ').length;
  const work = clients.filter(c=>c.status==='В РАБОТЕ').length;
  const sold = clients.filter(c=>c.status==='ПРОДАНО').length;
  const leads = loadLeads();
  const sent = loadSent();
  const leadsLeft = leads.length - Object.keys(sent).length;
  
  const buttons = [
    [{text:`🔥 Топ клиенты (${hot})`, callback_data:'LS_hot_0'}],
    [{text:`📋 Все контакты (${clients.length})`, callback_data:'LS_all_0'}],
    [{text:`🕐 Ждут ответа (${wait})`, callback_data:'LS_wait_0'}],
    [{text:`🔵 В работе (${work})`, callback_data:'LS_work_0'}],
    [{text:`💰 Продажи (${sold})`, callback_data:'LS_sold_0'}]
  ];
  
  if(leads.length > 0) {
    buttons.push([{text:`🎯 Лиды с Авито (${leadsLeft})`, callback_data:'LD_MENU'}]);
  }
  
  buttons.push([{text:'🏠 Главное меню', callback_data:'MENU'}]);
  
  return {inline_keyboard: buttons};
}

function studyMenuKbd() {
  return {inline_keyboard:[
    [{text:'📅 Расписание на сегодня', callback_data:'SCHEDULE_TODAY'}],
    [{text:'📅 Расписание на завтра', callback_data:'SCHEDULE_TOMORROW'}],
    [{text:'🗓 Выбрать день недели', callback_data:'SCHEDULE_CHOOSE_DAY'}],
    [{text:'📅 Расписание на неделю', callback_data:'SCHEDULE_WEEK'}],
    [{text:'🔄 Обновить расписание', callback_data:'SCHEDULE_UPDATE'}],
    [{text:'🏠 Главное меню', callback_data:'MENU'}]
  ]};
}

function daysMenuKbd() {
  return {inline_keyboard:[
    [{text:'Понедельник', callback_data:'SCHEDULE_DAY_Понедельник'}],
    [{text:'Вторник', callback_data:'SCHEDULE_DAY_Вторник'}],
    [{text:'Среда', callback_data:'SCHEDULE_DAY_Среда'}],
    [{text:'Четверг', callback_data:'SCHEDULE_DAY_Четверг'}],
    [{text:'Пятница', callback_data:'SCHEDULE_DAY_Пятница'}],
    [{text:'Суббота', callback_data:'SCHEDULE_DAY_Суббота'}],
    [{text:'← Назад', callback_data:'STUDY'}]
  ]};
}

function notesMenuKbd() {
  return {inline_keyboard:[
    [{text:'📝 Все заметки', callback_data:'NOTES_LIST'}],
    [{text:'➕ Добавить заметку', callback_data:'NOTES_ADD'}],
    [{text:'🏠 Главное меню', callback_data:'MENU'}]
  ]};
}

function tasksMenuKbd() {
  return {inline_keyboard:[
    [{text:'📋 Курсачи', callback_data:'TASKS_COURSEWORK'}],
    [{text:'📁 Проекты', callback_data:'TASKS_PROJECTS'}],
    [{text:'➕ Добавить задание', callback_data:'TASKS_ADD'}],
    [{text:'🏠 Главное меню', callback_data:'MENU'}]
  ]};
}

function homeMenuKbd() {
  const shopping = loadShopping();
  const tasks = loadTasks();
  const activeTasks = tasks.filter(t => !t.done).length;
  
  return {inline_keyboard:[
    [{text:`🛒 Список покупок (${shopping.length})`, callback_data:'SHOP_LIST'}],
    [{text:`✅ Задачи (${activeTasks})`, callback_data:'TASK_LIST'}],
    [{text:'➕ Добавить покупку', callback_data:'SHOP_ADD'}],
    [{text:'➕ Добавить задачу', callback_data:'TASK_ADD'}],
    [{text:'🏠 Главное меню', callback_data:'MENU'}]
  ]};
}

function aiMenuKbd() {
  return {inline_keyboard:[
    [{text:'💬 Написать Kiro', callback_data:'AI_CHAT'}],
    [{text:'📜 История', callback_data:'AI_HISTORY'}],
    [{text:'🏠 Главное меню', callback_data:'MENU'}]
  ]};
}

// ========== КЛИЕНТЫ ==========
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
  if(c.script)   t += `\n💬 Скрипт готов`;
  return t;
}

function cardKbd(c){
  const rows = [];
  const contact = [];
  // Telegram не поддерживает tel: ссылки - только WhatsApp и Telegram
  if(c.whatsapp) contact.push({text:'💬 WhatsApp', url:`https://wa.me/${c.whatsapp.replace(/\D/g,'')}`});
  if(c.telegram) contact.push({text:'✈️ Telegram', url:`https://t.me/${c.telegram.replace('@','')}`});
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

function filterClients(tag){
  const all = loadClients();
  if(tag==='hot')  return all.filter(c=>['ОЧЕНЬ ВЫСОКИЙ','ВЫСОКИЙ'].includes(c.priority) && !['ОТКАЗ','ПРОДАНО','ИСКАТЬ'].includes(c.status));
  if(tag==='wait') return all.filter(c=>c.status==='ЖДЁМ');
  if(tag==='work') return all.filter(c=>c.status==='В РАБОТЕ');
  if(tag==='sold') return all.filter(c=>c.status==='ПРОДАНО');
  if(tag==='find') return all.filter(c=>c.status==='ИСКАТЬ');
  return all;
}

const TAG_TITLE = {
  hot:'🔥 Топ — писать прямо сейчас',
  all:'📋 Все контакты',
  wait:'🕐 Ждут ответа',
  work:'🔵 В работе',
  sold:'💰 Продажи',
  find:'🔍 Нужно найти контакт',
};

function listMsg(tag, page){
  const clients = filterClients(tag);
  const total = clients.length;
  const slice = clients.slice(page*PAGE, page*PAGE+PAGE);

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

// ========== ЛИДЫ ==========
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

function leadCard(lead, index) {
  const sent = loadSent();
  const isSent = sent[index];
  let t = '';
  t += `🎯 *Лид #${index + 1}*\n\n`;
  t += `📋 ${safe(lead.name)}\n`;
  t += `📍 ${safe(lead.city)} · ${safe(lead.niche)}\n`;
  if (lead.phone) t += `📞 ${safe(lead.phone)}\n`;
  t += `💰 ${safe(lead.priceRange)}₽\n`;
  t += `${isSent ? '✅ Отправлено' : '⬜ Не отправлено'}\n`;
  if (lead.description) t += `\n📝 ${safe(lead.description.substring(0, 150))}...\n`;
  return t;
}

function leadText(lead) {
  const niche = lead.niche || 'услуги';
  const city = lead.city || '';
  const price = lead.priceRange ? lead.priceRange.split('-')[0] + '₽' : '3500₽';

  let service = 'услуги';
  if (niche.includes('Клининг')) service = 'клининг';
  else if (niche.includes('Химчистк')) service = 'химчистку мебели';
  else if (niche.includes('Ремонт техники')) service = 'ремонт техники';

  return `Привет! Видел твои услуги по ${service} — работаешь качественно 👍

Делаю сайты для мастеров за ${price}. 

Многие клиенты ищут "${service} ${city}" через Яндекс — без сайта они тебя не найдут.

Что будет:
• Твои услуги и цены
• Фото работ
• Кнопка "Заказать"
• Готово за 2-3 дня

Один заказ — и сайт окупился. Интересно?`;
}

function leadKbd(index, avitoLink) {
  const rows = [];
  if (avitoLink) rows.push([{ text: '🔗 Открыть на Авито', url: avitoLink }]);
  rows.push([{ text: '📋 Скопировать текст', callback_data: `LD_TXT_${index}` }]);
  rows.push([
    { text: '✅ Отправлено', callback_data: `LD_SENT_${index}` },
    { text: '⏭ Пропустить', callback_data: `LD_SKIP_${index}` },
  ]);
  rows.push([{ text: '⏭ Следующий', callback_data: 'LD_NEXT' }]);
  rows.push([{ text: '🏠 Меню', callback_data: 'MENU' }]);
  return { inline_keyboard: rows };
}

function leadsMenuKbd() {
  const stats = leadsStats();
  return { inline_keyboard: [
    [{ text: `⏭ Следующий лид (${stats.left})`, callback_data: 'LD_NEXT' }],
    [{ text: `📊 Статистика`, callback_data: 'LD_STATS' }],
    [{ text: '🏠 Главное меню', callback_data: 'MENU' }],
  ]};
}

// ========== РАСПИСАНИЕ ==========
async function downloadScheduleFromYandex() {
  return new Promise((resolve, reject) => {
    // Сначала получаем список файлов
    const listUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(config.YANDEX_SCHEDULE_URL)}&limit=10`;
    
    const options = {
      headers: { 'Authorization': `OAuth ${config.YANDEX_TOKEN}` }
    };
    
    https.get(listUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json._embedded || !json._embedded.items) {
            reject(new Error('Не удалось получить список файлов'));
            return;
          }
          
          // Ищем файл расписания для 1 курса
          const scheduleFile = json._embedded.items.find(item => 
            item.name && item.name.includes('Расписание 1 курсов') && item.name.endsWith('.xlsx')
          );
          
          if (!scheduleFile) {
            reject(new Error('Файл расписания 1 курса не найден'));
            return;
          }
          
          console.log('📥 Скачиваю:', scheduleFile.name);
          
          // Получаем ссылку на скачивание этого файла
          const downloadUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(config.YANDEX_SCHEDULE_URL)}&path=/${encodeURIComponent(scheduleFile.name)}`;
          
          https.get(downloadUrl, options, (dlRes) => {
            let dlData = '';
            dlRes.on('data', chunk => dlData += chunk);
            dlRes.on('end', () => {
              try {
                const dlJson = JSON.parse(dlData);
                if (!dlJson.href) {
                  reject(new Error('Не удалось получить ссылку на скачивание'));
                  return;
                }
                
                // Скачиваем файл
                const fileStream = fs.createWriteStream(SCHEDULE_FILE);
                https.get(dlJson.href, (fileRes) => {
                  fileRes.pipe(fileStream);
                  fileStream.on('finish', () => {
                    fileStream.close(() => {
                      console.log('✅ Файл скачан');
                      
                      // Даём время файлу полностью записаться
                      setTimeout(() => {
                        try {
                          // Проверяем размер файла
                          const stats = fs.statSync(SCHEDULE_FILE);
                          console.log('📁 Размер файла:', stats.size, 'байт');
                          
                          if (stats.size < 1000) {
                            reject(new Error('Файл слишком маленький, возможно загрузка не завершена'));
                            return;
                          }
                          
                          // Парсим
                          const parsed = scheduleParser.parseSchedule(SCHEDULE_FILE, config.STUDENT_GROUP);
                          if (parsed.error) {
                            reject(new Error(parsed.error));
                          } else {
                            console.log('✅ Распарсено:', parsed.schedule.length, 'пар');
                            saveScheduleData(parsed);
                            resolve(parsed);
                          }
                        } catch (err) {
                          reject(err);
                        }
                      }, 500); // Ждём 500мс
                    });
                  });
                }).on('error', reject);
              } catch (err) {
                reject(err);
              }
            });
          }).on('error', reject);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// ========== РЕДАКТИРОВАНИЕ СООБЩЕНИЙ ==========
function edit(cid, mid, text, kbd){
  return bot.editMessageText(text, {
    chat_id:cid, message_id:mid,
    parse_mode:'Markdown', reply_markup:kbd
  }).catch(e => console.error('edit err:', e.message));
}

// ========== КОМАНДЫ ==========
bot.onText(/\/start|\/menu/, msg => {
  const userId = msg.from.id;
  const text = '🏠 *Главное меню*\n\n💼 Бизнес | 📚 Учёба | 🏡 Дом | 🤖 AI';
  bot.sendMessage(msg.chat.id, text, {
    parse_mode:'Markdown',
    reply_markup: mainMenuKbd(userId)
  });
});

// ========== CALLBACK ==========
bot.on('callback_query', async q => {
  bot.answerCallbackQuery(q.id).catch(()=>{});
  const cid = q.message.chat.id;
  const mid = q.message.message_id;
  const d = q.data;
  const userId = q.from.id;

  // ГЛАВНОЕ МЕНЮ
  if(d === 'MENU'){
    edit(cid, mid, '🏠 *Главное меню*\n\n💼 Бизнес | 📚 Учёба | 🏡 Дом | 🤖 AI', mainMenuKbd(userId));
    return;
  }

  if(d === 'MENU_BUSINESS'){
    edit(cid, mid, '💼 *Мой бизнес*\n\nУправление клиентами:', businessMenuKbd());
    return;
  }

  if(d === 'MENU_STUDY'){
    edit(cid, mid, '📚 *Учёба*\n\nРасписание группы ' + config.STUDENT_GROUP, studyMenuKbd());
    return;
  }

  if(d === 'MENU_HOME'){
    edit(cid, mid, '🏡 *Дом*\n\nСписки и задачи:', homeMenuKbd());
    return;
  }

  if(d === 'MENU_NOTES'){
    edit(cid, mid, '📝 *Заметки*\n\nТвои учебные заметки:', notesMenuKbd());
    return;
  }

  if(d === 'MENU_TASKS'){
    edit(cid, mid, '📂 *Задания*\n\nКурсачи и проекты:', tasksMenuKbd());
    return;
  }

  if(d === 'NOTES_LIST'){
    edit(cid, mid, '📝 *Все заметки*\n\n_Пока пусто. Функция в разработке._', notesMenuKbd());
    return;
  }

  if(d === 'NOTES_ADD'){
    edit(cid, mid, '➕ *Добавить заметку*\n\n_Отправь текст заметки следующим сообщением._\n_Функция в разработке._', notesMenuKbd());
    return;
  }

  if(d === 'TASKS_COURSEWORK'){
    edit(cid, mid, '📋 *Курсачи*\n\n_Пока пусто. Функция в разработке._', tasksMenuKbd());
    return;
  }

  if(d === 'TASKS_PROJECTS'){
    edit(cid, mid, '📁 *Проекты*\n\n_Пока пусто. Функция в разработке._', tasksMenuKbd());
    return;
  }

  if(d === 'TASKS_ADD'){
    edit(cid, mid, '➕ *Добавить задание*\n\n_Отправь описание задания следующим сообщением._\n_Функция в разработке._', tasksMenuKbd());
    return;
  }

  if(d === 'MENU_AI'){
    edit(cid, mid, '🤖 *Kiro AI*\n\nОбщение с ассистентом:', aiMenuKbd());
    return;
  }

  // РАСПИСАНИЕ
  if(d === 'SCHEDULE_TODAY'){
    const schedule = loadScheduleData();
    if(!schedule || !schedule.schedule){
      edit(cid, mid, '❌ Расписание не загружено.\n\nНажми "🔄 Обновить расписание"', studyMenuKbd());
      return;
    }
    const today = scheduleParser.getTodaySchedule(schedule);
    const text = scheduleParser.formatSchedule(today, '📅 Сегодня');
    edit(cid, mid, text, studyMenuKbd());
    return;
  }

  if(d === 'SCHEDULE_TOMORROW'){
    const schedule = loadScheduleData();
    if(!schedule || !schedule.schedule){
      edit(cid, mid, '❌ Расписание не загружено.\n\nНажми "🔄 Обновить расписание"', studyMenuKbd());
      return;
    }
    const tomorrow = scheduleParser.getTomorrowSchedule(schedule);
    const text = scheduleParser.formatSchedule(tomorrow, '📅 Завтра');
    edit(cid, mid, text, studyMenuKbd());
    return;
  }

  if(d === 'SCHEDULE_WEEK'){
    const schedule = loadScheduleData();
    if(!schedule || !schedule.schedule){
      edit(cid, mid, '❌ Расписание не загружено.\n\nНажми "🔄 Обновить расписание"', studyMenuKbd());
      return;
    }
    
    let text = '📅 *Неделя*\n\n';
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    days.forEach(day => {
      const lessons = scheduleParser.getScheduleForDay(schedule, day);
      if(lessons && lessons.length > 0){
        text += `*${day}:*\n`;
        lessons.forEach(l => text += `⏰ ${l.time} - ${l.subject}\n`);
        text += '\n';
      }
    });
    
    edit(cid, mid, text, studyMenuKbd());
    return;
  }

  if(d === 'SCHEDULE_UPDATE'){
    edit(cid, mid, '⚠️ *Функция временно отключена*\n\nРасписание обновляется вручную каждую неделю.\n\nТекущее расписание актуально.', studyMenuKbd());
    return;
  }

  if(d === 'SCHEDULE_CHOOSE_DAY'){
    edit(cid, mid, '🗓 *Выбери день недели:*', daysMenuKbd());
    return;
  }

  if(d.startsWith('SCHEDULE_DAY_')){
    const dayName = d.replace('SCHEDULE_DAY_', '');
    const schedule = loadScheduleData();
    if(!schedule || !schedule.schedule){
      edit(cid, mid, '❌ Расписание не загружено.\n\nНажми "🔄 Обновить расписание"', studyMenuKbd());
      return;
    }
    const lessons = scheduleParser.getScheduleForDay(schedule, dayName);
    const text = scheduleParser.formatSchedule(lessons, `📅 ${dayName}`);
    edit(cid, mid, text, daysMenuKbd());
    return;
  }

  // ПОКУПКИ
  if(d === 'SHOP_LIST'){
    const shopping = loadShopping();
    if(shopping.length === 0){
      edit(cid, mid, '🛒 *Список пуст*', homeMenuKbd());
      return;
    }
    
    let text = '🛒 *Список покупок:*\n\n';
    shopping.forEach((item, i) => {
      const icon = item.done ? '✅' : '⬜';
      text += `${icon} ${i+1}. ${item.name}\n`;
    });
    
    const kbd = {inline_keyboard:[
      [{text:'🗑 Очистить', callback_data:'SHOP_CLEAR'}],
      [{text:'🏠 Меню', callback_data:'MENU'}]
    ]};
    
    edit(cid, mid, text, kbd);
    return;
  }

  if(d === 'SHOP_ADD'){
    bot.sendMessage(cid, '✏️ Напиши название покупки:');
    return;
  }

  if(d === 'SHOP_CLEAR'){
    saveShopping([]);
    edit(cid, mid, '✅ Список очищен', homeMenuKbd());
    return;
  }

  // ЗАДАЧИ
  if(d === 'TASK_LIST'){
    const tasks = loadTasks();
    const active = tasks.filter(t => !t.done);
    
    if(active.length === 0){
      edit(cid, mid, '✅ *Всё выполнено!*', homeMenuKbd());
      return;
    }
    
    let text = '✅ *Задачи:*\n\n';
    active.forEach((task, i) => {
      text += `${i+1}. ${task.name}\n`;
    });
    
    const kbd = {inline_keyboard:[
      [{text:'🗑 Очистить', callback_data:'TASK_CLEAR'}],
      [{text:'🏠 Меню', callback_data:'MENU'}]
    ]};
    
    edit(cid, mid, text, kbd);
    return;
  }

  if(d === 'TASK_ADD'){
    bot.sendMessage(cid, '✏️ Напиши задачу:');
    return;
  }

  if(d === 'TASK_CLEAR'){
    saveTasks([]);
    edit(cid, mid, '✅ Задачи очищены', homeMenuKbd());
    return;
  }

  // AI
  if(d === 'AI_CHAT'){
    edit(cid, mid, '🤖 *Kiro AI*\n\nФункция в разработке 🚧', aiMenuKbd());
    return;
  }

  if(d === 'AI_HISTORY'){
    edit(cid, mid, '📜 *История*\n\nФункция в разработке 🚧', aiMenuKbd());
    return;
  }

  // СТАТИСТИКА
  if(d === 'STATS_ALL'){
    const clients = loadClients();
    const sold = clients.filter(c=>c.status==='ПРОДАНО').length;
    const work = clients.filter(c=>c.status==='В РАБОТЕ').length;
    const shopping = loadShopping();
    const tasks = loadTasks().filter(t => !t.done).length;
    
    let text = '📊 *Статистика*\n\n';
    text += `💼 Клиентов: ${clients.length}\n`;
    text += `🔵 В работе: ${work}\n`;
    text += `💰 Продано: ${sold}\n\n`;
    text += `🛒 Покупок: ${shopping.length}\n`;
    text += `✅ Задач: ${tasks}\n`;
    
    edit(cid, mid, text, {inline_keyboard:[[{text:'🏠 Меню', callback_data:'MENU'}]]});
    return;
  }

  // КЛИЕНТЫ - СПИСОК
  if(d.startsWith('LS_')){
    const parts = d.split('_');
    const tag = parts[1];
    const page = parseInt(parts[2])||0;
    const { title, kbd } = listMsg(tag, page);
    edit(cid, mid, `*${safe(title)}*`, kbd);
    return;
  }

  // КЛИЕНТЫ - КАРТОЧКА
  if(d.startsWith('CD_')){
    const id = parseInt(d.split('_')[1]);
    const c = loadClients().find(x=>x.id===id);
    if(!c) return;
    edit(cid, mid, card(c), cardKbd(c));
    return;
  }

  // КЛИЕНТЫ - СКРИПТ
  if(d.startsWith('SC_')){
    const id = parseInt(d.split('_')[1]);
    const c = loadClients().find(x=>x.id===id);
    if(!c) return;
    bot.sendMessage(cid, `💬 *Скрипт для ${safe(c.name)}:*\n\n${safe(c.script)}`, {parse_mode:'Markdown'});
    return;
  }

  // КЛИЕНТЫ - СМЕНА СТАТУСА
  if(d.startsWith('ST_')){
    const parts = d.split('_');
    const id = parseInt(parts[1]);
    const newStatus = STATUS_MAP[parts[2]];
    const clients = loadClients();
    const c = clients.find(x=>x.id===id);
    if(!c) return;
    c.status = newStatus;
    saveClients(clients);
    edit(cid, mid, card(c), cardKbd(c));
    return;
  }

  // ЛИДЫ
  if(d === 'LD_MENU'){
    const stats = leadsStats();
    let t = '🎯 *Лиды с Авито*\n\n';
    t += `📊 Всего: ${stats.total}\n`;
    t += `✅ Отправлено: ${stats.sent}\n`;
    t += `⬜ Осталось: ${stats.left}\n`;
    edit(cid, mid, t, leadsMenuKbd());
    return;
  }

  if(d === 'LD_NEXT'){
    const index = getNextLeadIndex();
    if(index === -1){
      edit(cid, mid, '🎉 *Все лиды обработаны!*', leadsMenuKbd());
      return;
    }
    const leads = loadLeads();
    const lead = leads[index];
    edit(cid, mid, leadCard(lead, index), leadKbd(index, lead.avitoLink));
    return;
  }

  if(d.startsWith('LD_TXT_')){
    const index = parseInt(d.split('_')[2]);
    const leads = loadLeads();
    const lead = leads[index];
    if(!lead) return;
    bot.sendMessage(cid, `📋 *Текст:*\n\n${leadText(lead)}`, {parse_mode:'Markdown'});
    return;
  }

  if(d.startsWith('LD_SENT_')){
    const index = parseInt(d.split('_')[2]);
    markSent(index);
    const nextIndex = getNextLeadIndex();
    if(nextIndex === -1){
      edit(cid, mid, '🎉 *Все лиды обработаны!*', leadsMenuKbd());
      return;
    }
    const leads = loadLeads();
    const nextLead = leads[nextIndex];
    edit(cid, mid, leadCard(nextLead, nextIndex), leadKbd(nextIndex, nextLead.avitoLink));
    return;
  }

  if(d.startsWith('LD_SKIP_')){
    const index = parseInt(d.split('_')[2]);
    markSent(index);
    const nextIndex = getNextLeadIndex();
    if(nextIndex === -1){
      edit(cid, mid, '🎉 *Готово!*', leadsMenuKbd());
      return;
    }
    const leads = loadLeads();
    const nextLead = leads[nextIndex];
    edit(cid, mid, leadCard(nextLead, nextIndex), leadKbd(nextIndex, nextLead.avitoLink));
    return;
  }

  if(d === 'LD_STATS'){
    const leads = loadLeads();
    const sent = loadSent();
    const byNiche = {};
    leads.forEach((l, i) => {
      if(!sent[i]){
        byNiche[l.niche] = (byNiche[l.niche] || 0) + 1;
      }
    });
    let t = '📊 *Статистика лидов*\n\n';
    Object.entries(byNiche).sort((a,b) => b[1]-a[1]).forEach(([n, c]) => {
      t += `• ${n}: ${c}\n`;
    });
    edit(cid, mid, t, leadsMenuKbd());
    return;
  }
});

// ========== АВТООБНОВЛЕНИЕ ==========
cron.schedule('0 7 * * *', async () => {
  console.log('Автообновление расписания...');
  try {
    await downloadScheduleFromYandex();
    console.log('✅ Расписание обновлено');
  } catch(err) {
    console.error('❌ Ошибка:', err.message);
  }
});

// ========== АВТОМАТИЧЕСКАЯ ОТПРАВКА НАПОМИНАНИЙ ==========
// Проверяем каждую минуту
cron.schedule('* * * * *', async () => {
  try {
    const reminders = loadReminders();
    const now = new Date();
    
    // Находим напоминания, которые пора отправить
    const dueReminders = reminders.reminders.filter(r => {
      if (r.completed) return false;
      const reminderTime = new Date(r.time);
      return reminderTime <= now;
    });
    
    if (dueReminders.length === 0) return;
    
    // Отправляем каждое напоминание
    for (const reminder of dueReminders) {
      const recipientId = reminder.for === 'Мартин' ? MARTIN_ID : LENA_ID;
      
      try {
        await bot.sendMessage(recipientId, 
          `⏰ *Напоминание!*\n\n${reminder.text}\n\n_От: ${reminder.from}_`,
          { parse_mode: 'Markdown' }
        );
        
        console.log(`✅ Напоминание отправлено: ${reminder.text} → ${reminder.for}`);
        
        // Отмечаем как выполненное
        reminder.completed = true;
      } catch (err) {
        console.error(`❌ Ошибка отправки напоминания ${reminder.id}:`, err.message);
      }
    }
    
    // Сохраняем обновлённые напоминания
    if (dueReminders.length > 0) {
      saveReminders(reminders);
    }
  } catch (err) {
    console.error('❌ Ошибка проверки напоминаний:', err.message);
  }
});

bot.on('polling_error', e => {
  console.error('polling_error:', e.message);
  // Не падаем при ошибках polling
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (err) => {
  console.error('Необработанная ошибка Promise:', err);
  // Не падаем, просто логируем
});

process.on('uncaughtException', (err) => {
  console.error('Необработанное исключение:', err);
  // Не падаем, просто логируем
});

console.log('🤖 Мега-бот запущен!');
console.log('💼 Бизнес | 📚 Учёба | 🏡 Дом | 🤖 AI');
console.log('');
const schedule = loadScheduleData();
if(!schedule) {
  console.log('⚠️  Расписание не загружено');
  console.log('   Нажми "Обновить расписание" в боте для первой загрузки');
} else {
  console.log('✅ Расписание загружено (' + (schedule.schedule ? schedule.schedule.length : 0) + ' пар)');
}

// ========== ВЕБ-СЕРВЕР ДЛЯ MINI APP ==========
const app = express();
app.use(cors());
app.use(express.json());

// Статические файлы Mini App
app.use(express.static(path.join(__dirname, 'miniapp/family_space_miniapp')));

// API: Расписание для Лены
app.get('/api/schedule', (req, res) => {
  const scheduleData = loadScheduleData();
  if (!scheduleData || !scheduleData.schedule) {
    return res.json({ schedule: [] });
  }
  
  // Преобразуем в формат Mini App с реальными датами
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  // Вычисляем даты текущей недели
  const now = new Date();
  const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, ...
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Смещение до понедельника
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  
  const formatted = days.map((day, index) => {
    const lessons = scheduleParser.getScheduleForDay(scheduleData, day);
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + index);
    
    return {
      day: day.substring(0, 2).toUpperCase(),
      date: String(currentDate.getDate()), // Реальная дата
      classes: lessons.map(l => ({
        time: l.time,
        title: l.subject,
        kind: 'lecture', // По умолчанию
        teacher: l.teacher,
        room: l.room,
        detail: `${l.subject} · ${l.teacher}`
      }))
    };
  });
  
  res.json({ schedule: formatted });
});

// API: Задания для Лены
app.get('/api/tasks', (req, res) => {
  // Пока возвращаем демо-данные
  res.json({
    tasks: [
      {id: 1, title: "Курсач по химии", due: "2026-12-01", progress: 60, done: false, type: "course"},
      {id: 2, title: "Лабораторная работа", due: "2026-11-25", progress: 30, done: false, type: "course"}
    ]
  });
});

// API: Клиенты для Мартина
app.get('/api/clients', (req, res) => {
  const clients = loadClients();
  res.json({ clients: clients.slice(0, 10) }); // Первые 10
});

// API: Определение пользователя
app.get('/api/user/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === MARTIN_ID) {
    res.json({ name: 'Мартин', role: 'martin' });
  } else if (userId === LENA_ID) {
    res.json({ name: 'Лена', role: 'lena' });
  } else {
    res.json({ name: 'Гость', role: 'guest' });
  }
});

// ========== HELPER FUNCTIONS ДЛЯ JSON ФАЙЛОВ ==========
function loadShopping() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'shopping.json'), 'utf8'));
  } catch(e) {
    return { items: [] };
  }
}

function saveShopping(data) {
  fs.writeFileSync(path.join(__dirname, 'shopping.json'), JSON.stringify(data, null, 2));
}

function loadUtilities() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'utilities.json'), 'utf8'));
  } catch(e) {
    return { bills: [] };
  }
}

function saveUtilities(data) {
  fs.writeFileSync(path.join(__dirname, 'utilities.json'), JSON.stringify(data, null, 2));
}

function loadReminders() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'reminders.json'), 'utf8'));
  } catch(e) {
    return { reminders: [], notes: [] };
  }
}

function saveReminders(data) {
  fs.writeFileSync(path.join(__dirname, 'reminders.json'), JSON.stringify(data, null, 2));
}

// ========== API: ПОКУПКИ ==========
// Получить список покупок
app.get('/api/shopping', (req, res) => {
  const data = loadShopping();
  res.json(data);
});

// Добавить покупку
app.post('/api/shopping', (req, res) => {
  const data = loadShopping();
  const newItem = {
    id: Date.now(),
    name: req.body.name,
    bought: false,
    addedBy: req.body.addedBy || 'Неизвестно',
    addedAt: new Date().toISOString()
  };
  data.items.push(newItem);
  saveShopping(data);
  res.json(newItem);
});

// Отметить покупку как купленную/некупленную
app.put('/api/shopping/:id', (req, res) => {
  const data = loadShopping();
  const item = data.items.find(i => i.id === parseInt(req.params.id));
  if (item) {
    item.bought = req.body.bought;
    saveShopping(data);
    res.json(item);
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

// Удалить покупку
app.delete('/api/shopping/:id', (req, res) => {
  const data = loadShopping();
  data.items = data.items.filter(i => i.id !== parseInt(req.params.id));
  saveShopping(data);
  res.json({ success: true });
});

// ========== API: КОММУНАЛКА ==========
// Получить список платежей
app.get('/api/utilities', (req, res) => {
  const data = loadUtilities();
  res.json(data);
});

// Отметить платёж как оплаченный
app.put('/api/utilities/:id', (req, res) => {
  const data = loadUtilities();
  const bill = data.bills.find(b => b.id === parseInt(req.params.id));
  if (bill) {
    bill.paidBy = req.body.paidBy;
    bill.paidAt = new Date().toISOString();
    bill.status = 'paid';
    saveUtilities(data);
    res.json(bill);
  } else {
    res.status(404).json({ error: 'Bill not found' });
  }
});

// ========== API: НАПОМИНАНИЯ И ЗАПИСКИ ==========
// Получить все напоминания и записки
app.get('/api/reminders', (req, res) => {
  const data = loadReminders();
  res.json(data);
});

// Добавить напоминание
app.post('/api/reminders', (req, res) => {
  const data = loadReminders();
  const newReminder = {
    id: Date.now(),
    text: req.body.text,
    time: req.body.time,
    for: req.body.for,
    from: req.body.from,
    completed: false
  };
  data.reminders.push(newReminder);
  saveReminders(data);
  res.json(newReminder);
});

// Добавить записку
app.post('/api/notes', (req, res) => {
  const data = loadReminders();
  const newNote = {
    id: Date.now(),
    text: req.body.text,
    from: req.body.from,
    to: req.body.to,
    createdAt: new Date().toISOString()
  };
  data.notes.push(newNote);
  saveReminders(data);
  res.json(newNote);
});

// Отметить напоминание как выполненное
app.put('/api/reminders/:id', (req, res) => {
  const data = loadReminders();
  const reminder = data.reminders.find(r => r.id === parseInt(req.params.id));
  if (reminder) {
    reminder.completed = req.body.completed;
    saveReminders(data);
    res.json(reminder);
  } else {
    res.status(404).json({ error: 'Reminder not found' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Веб-сервер запущен на порту ${PORT}`);
  console.log(`📱 Mini App доступен по адресу: http://localhost:${PORT}`);
});
