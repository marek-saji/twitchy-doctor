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
      rows.push({
        date: d,
        titles: titles,
      });
    }

    return rows;
  }, []);

scheduleData.forEach(row => {
  const {date, titles} = row;
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
  
  row.item = item;
});
console.log(scheduleData);

schedule.className = 'schedule';
document.body.appendChild(schedule);
scheduleTsvSource.style.display = 'none';
scrollIfNeeded();
// setInterval(scrollIfNeeded, 10 * 1000);

function scrollIfNeeded () {
  const now = new Date();
  for (let i in scheduleData) {
    if (scheduleData[i].date < now && scheduleData[i+1] && now < scheduleData[i+1].date)
    {
      console.log(i, i+1, scheduleData[i], now, scheduleData[i+1]);
      console.log(scheduleData[i].item);
      break;
    }
  }
}