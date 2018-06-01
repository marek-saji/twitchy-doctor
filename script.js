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
      if (2 !== i && row[i] < row[2]) {
        d.setDate(d.getDate() + 1);
      }
      // FIXME Wtf? -1?!
      d.setHours(parseInt(h, 10) - d.getTimezoneOffset() / 60 - 1);
      d.setMinutes(parseInt(m, 10));
      // FIXME one row per title, if I can get episode duration from somewhere
      rows.push({
        start: d,
        titles: titles,
      });
    }

    return rows;
  }, []);

scheduleData.forEach(row => {
  const {start, titles} = row;
  const item = document.createElement('li');
  const d = document.createElement('time');
  const t = document.createElement('div');
  
  item.className = 'schedule__item';
  
  d.className = 'schedule__time';
  d.textContent = start.toLocaleString().replace(/:00$/, "");
  d.datetime = start.toISOString();
  
  t.className = 'schedule__title';
  t.textContent = titles.join(", ");
  
  // TODO Link to Wikipedia
  // TODO Which doctor?
  // TODO Titles of episodes
  
  item.append(d);
  item.append(t);
  schedule.append(item);
  
  row.item = item;
});

schedule.className = 'schedule';
document.body.appendChild(schedule);
scheduleTsvSource.style.display = 'none';
scrollIfNeeded();
setInterval(scrollIfNeeded, 10 * 1000);

function scrollIfNeeded () {
  const now = new Date();
  for (let i in scheduleData) {
    i = parseInt(i, 10);
    // FIXME Match last
    if (scheduleData[i].start < now && scheduleData[i+1] && now < scheduleData[i+1].start)
    {
      Array.from(document.querySelectorAll("[data-current=true]")).forEach(e => { delete e.dataset.current; });
      scheduleData[i].item.dataset.current = 'true';
      // TODO Only if needed
      // TODO Animate
      // FIXME Broken on iOS?
      scheduleData[i].item.scrollIntoView({
        block: "start",
        behaviour: "smooth",
      });
      break;
    }
  }
}



fetch("/data/wikipedia-serials.html")
  .then(response => response.text())
  .then(html => {
    const fragment = document.createDocumentFragment();
    fragment.innerHTML = html;
  window.foo = fragment;
    Array.from(fragment.querySelectorAll(".wikiepisodetable")).forEach(table => {
      console.log(table);
    });
  });