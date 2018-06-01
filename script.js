const EP_DURATION_MIN = 25;

const scheduleTsvSource = document.getElementById('schedule-raw');

Promise.all([getScheduleData(), getWikipediaData()])
  .then(joinScheduleAndWikipediaData)
  .then(createScheduleDom)
  .then(schedule => { document.body.appendChild(schedule); })
  .then(() => { scheduleTsvSource.style.display = 'none'; });

// scrollIfNeeded();
// setInterval(scrollIfNeeded, 10 * 1000);

function getScheduleData () {
  return scheduleTsvSource.textContent
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
}

function getWikipediaData () {
  return fetch("/data/wikipedia-serials.html")
    .then(response => response.text())
    .then(html => {
      const fragment = document.createDocumentFragment();
      const dataSource = document.createElement("div");
      fragment.append(dataSource);
      dataSource.innerHTML = html;
      return Array.from(fragment.querySelectorAll(".wikiepisodetable .vevent")).reduce(
        (rows, tr) => {
          const ep = tr.children[0].id.replace(/^ep/, "");
          const storyTitle = tr.querySelector(".summary a").textContent;
          const episodes = Array.from(tr.querySelector(".summary").childNodes)
            .filter(ch => ch instanceof Text)
            .map(textNode => textNode.textContent.replace(/^\s*"|"\s*$/g, ""));
          if (0 === episodes.length)
          {
            episodes.push(storyTitle);
          }
          rows.push({
            ep,
            storyTitle,
            episodes,
          });
          return rows;
        },
        []
      );
    });
}

function joinScheduleAndWikipediaData ([scheduleData, wikipediaData]) {
  const data = [];
  
  for (let scheduleRow of scheduleData) {
    for (let [idx, title] of scheduleRow.titles.entries()) {
      let start = new Date(scheduleRow.start);
      start.setMinutes(start.getMinutes() + idx * EP_DURATION_MIN);
      let end = new Date(start);
      end.setMinutes(end.getMinutes() + EP_DURATION_MIN);
      let row = {
        start: start,
        end: end,
        estimated: idx > 0,
        title: title,
      };
      data.push(row);
    
    }
  }
  
  return data;
}

function createScheduleDom (data) {
  const schedule = document.createElement('ol');
  console.log(data[0], data[1]);
  schedule.className = 'schedule';
  data.forEach(row => {
    const {start, titles, title, estimated} = row;
    const item = document.createElement('li');
    const d = document.createElement('time');
    const t = document.createElement('div');

    item.className = 'schedule__item';

    d.className = 'schedule__time';
    d.textContent = start.toLocaleString().replace(/:00$/, "");
    if (estimated) d.textContent += " or a bit later"; // FIXME
    d.datetime = start.toISOString();

    t.className = 'schedule__title';
    t.textContent = title || titles.join(", ");

    // TODO Link to Wikipedia
    // TODO Which doctor?
    // TODO Titles of episodes

    item.append(d);
    item.append(t);
    schedule.append(item);

    row.item = item;
  });
  return schedule;
}

// function scrollIfNeeded () {
//   const now = new Date();
//   for (let i in scheduleData) {
//     i = parseInt(i, 10);
//     // FIXME Match last
//     if (scheduleData[i].start < now && scheduleData[i+1] && now < scheduleData[i+1].start)
//     {
//       Array.from(document.querySelectorAll("[data-current=true]")).forEach(e => { delete e.dataset.current; });
//       scheduleData[i].item.dataset.current = 'true';
//       // TODO Only if needed
//       // TODO Animate
//       // FIXME Broken on iOS?
//       scheduleData[i].item.scrollIntoView({
//         block: "start",
//         behaviour: "smooth",
//       });
//       break;
//     }
//   }
// }