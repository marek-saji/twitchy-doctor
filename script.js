const scheduleTsvSource = document.getElementById('schedule-raw');
const scheduleTsv = scheduleTsvSource.textContent;
const schedule = document.createElement('ol');

scheduleTsvSource.style.display = 'none';
document.body.appendChild(schedule);

schedule.innerHTML = JSON.stringify(scheduleTsv.split("\n").map(line => {
  const row = line.split("\t");
  const date = new Date(row[0].split(' ').reverse().join(' '));
  row[0] = date;
  console.log(row[1]);
  row[1] = row[1].split(/ *, +/);
  
  for (let i = 2; i <= 4; i += 1)
  {
  }
  return row;
}));