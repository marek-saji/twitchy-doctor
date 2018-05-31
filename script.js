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
      rows.set(d, titles);
    }

    return rows;
  }, new Map());

scheduleTsvSource.style.display = 'none';
document.body.appendChild(schedule);

scheduleData.forEach((titles, date) => {
  const d = document.createElement('date');
  
});