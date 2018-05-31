const scheduleTsvSource = document.getElementById('schedule-raw');
const scheduleTsv = scheduleTsvSource.textContent;
const schedule = document.createElement('ol');

const scheduleData = scheduleTsv
  .split("\n")
  .filter(line => "" !== line)
  .reduce((rows, line) => {
    const row = line.split("\t");
    const date = new Date(row[0].split(' ').reverse().join(' ') + ' 2018');
    const titles = row[1].split(/ *, +/);
    for (let i = 2; i <= 4; i += 1)
    {
      let [h, m] = row[i].split(":");
      let d = new Date(date);
      d.setHours(parseInt(h, 10) - d.getTimezoneOffset() / 60);
      d.setMinutes(parseInt(m, 10));
      // FIXME last is for next day
      // FIXME one row per title?
      rows.set(d, titles);
    }

    return rows;
  }, new Map());

scheduleData.forEach((titles, date) => {
  const item = document.createElement('li');
  const d = document.createElement('time');
  const t = document.createElement('div');
  
  item.className = 'schedule__item';
  
  d.className = 'schedule__time';
  d.textContent = date.toString(); // TODO format
  d.datetime = date.toISOString();
  
  t.className = 'schedule__title';
  t.textContent = titles.join(", ");
  
  item.append(d);
  item.append(t);
  schedule.append(item);
});

schedule.className = 'schedule';
document.body.appendChild(schedule);
scheduleTsvSource.style.display = 'none';