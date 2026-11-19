const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Парсинг расписания из Excel файла
function parseSchedule(filePath, targetGroup) {
  try {
    if (!fs.existsSync(filePath)) {
      return { error: 'Файл расписания не найден' };
    }
    
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});
    
    if (!data || data.length < 10) {
      return { error: 'Некорректный формат файла расписания' };
    }
    
    // Найти колонку группы
    const groupRow = data[9];
    if (!groupRow) {
      return { error: 'Не удалось найти строку с группами' };
    }
    
    let groupColIndex = -1;
    
    for (let i = 0; i < groupRow.length; i++) {
      if (groupRow[i] === targetGroup) {
        groupColIndex = i;
        break;
      }
    }
    
    if (groupColIndex === -1) {
      return { error: `Группа ${targetGroup} не найдена` };
    }
    
    // Парсим расписание
    const schedule = [];
    let currentDay = null;
    let currentDate = null;
    
    for (let i = 11; i < data.length; i++) {
      const row = data[i];
      const dayCell = row[0];
      
      // Определяем день недели и дату
      if (dayCell) {
        const dayStr = dayCell.toString();
        if (dayStr.includes('ПОНЕДЕЛЬНИК')) {
          currentDay = 'Понедельник';
          const match = dayStr.match(/(\d{2}\.\d{2}\.\d{4})/);
          if (match) currentDate = match[1];
        } else if (dayStr.includes('ВТОРНИК')) {
          currentDay = 'Вторник';
          const match = dayStr.match(/(\d{2}\.\d{2}\.\d{4})/);
          if (match) currentDate = match[1];
        } else if (dayStr.includes('СРЕДА')) {
          currentDay = 'Среда';
          const match = dayStr.match(/(\d{2}\.\d{2}\.\d{4})/);
          if (match) currentDate = match[1];
        } else if (dayStr.includes('ЧЕТВЕРГ')) {
          currentDay = 'Четверг';
          const match = dayStr.match(/(\d{2}\.\d{2}\.\d{4})/);
          if (match) currentDate = match[1];
        } else if (dayStr.includes('ПЯТНИЦА')) {
          currentDay = 'Пятница';
          const match = dayStr.match(/(\d{2}\.\d{2}\.\d{4})/);
          if (match) currentDate = match[1];
        } else if (dayStr.includes('СУББОТА')) {
          currentDay = 'Суббота';
          const match = dayStr.match(/(\d{2}\.\d{2}\.\d{4})/);
          if (match) currentDate = match[1];
        }
      }
      
      const time = row[3];
      if (!time || time === '') continue;
      
      const subject = row[groupColIndex];
      const teacher = (i + 1 < data.length) ? data[i + 1][groupColIndex] : '';
      const room = row[groupColIndex + 1];
      
      if (subject && subject !== '' && subject !== 'Преподаватель') {
        schedule.push({
          day: currentDay,
          date: currentDate,
          time: time,
          subject: subject,
          room: room || '',
          teacher: teacher || ''
        });
      }
    }
    
    return {
      group: targetGroup,
      schedule: schedule
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Получить расписание на конкретный день
function getScheduleForDay(schedule, dayName) {
  if (!schedule || !schedule.schedule) return [];
  return schedule.schedule.filter(item => item.day === dayName);
}

// Получить расписание на сегодня
function getTodaySchedule(schedule) {
  if (!schedule || !schedule.schedule) return [];
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const today = days[new Date().getDay()];
  return getScheduleForDay(schedule, today);
}

// Получить расписание на завтра
function getTomorrowSchedule(schedule) {
  if (!schedule || !schedule.schedule) return [];
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const tomorrow = days[(new Date().getDay() + 1) % 7];
  return getScheduleForDay(schedule, tomorrow);
}

// Форматировать расписание для вывода
function formatSchedule(lessons, title) {
  if (!lessons || lessons.length === 0) {
    return `${title}\n\n🎉 Пар нет!`;
  }
  
  let text = `${title}\n\n`;
  lessons.forEach((lesson, index) => {
    text += `${index + 1}. ⏰ ${lesson.time}\n`;
    text += `   📚 ${lesson.subject}\n`;
    if (lesson.teacher) text += `   👨‍🏫 ${lesson.teacher}\n`;
    if (lesson.room) text += `   🚪 Каб. ${lesson.room}\n`;
    text += '\n';
  });
  
  return text.trim();
}

module.exports = {
  parseSchedule,
  getScheduleForDay,
  getTodaySchedule,
  getTomorrowSchedule,
  formatSchedule
};
