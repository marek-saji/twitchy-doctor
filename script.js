const scheduleTsvSource = document.getElementById('schedule-raw');
const scheduleTsv = scheduleTsvSource.textContent;
const schedule = document.createElement('ol');

scheduleTsvSource.style.display = 'none';
document.body.appendChild(schedule);

schedule.style.whiteSpace = 'pre';
schedule.innerHTML = JSON.stringify(scheduleTsv.split("\n").filter(line => "" !== line).map(line => {
  const row = line.split("\t");
  const date = new Date(row[0].split(' ').reverse().join(' '));
  row[0] = date;
  row[1] = row[1].split(/ *, +/);
  for (let i = 2; i <= 4; i += 1)
  {
    let [h, m] = row[i].split(":");
    let d = new Date(date);
    d.setHours(parseInt(h, 10) + d.getTimezoneOffset() / 60);
    d.setMinutes(parseInt(m, 10));
    console.log(row[i], "->", d);
    row[i] = d;
  }
  return row;
}), null, "  ");