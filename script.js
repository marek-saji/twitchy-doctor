const EP_DURATION_MIN = 25;

const scheduleTsvSource = document.getElementById('schedule-raw');

Promise.all([getScheduleData(), getWikipediaData()])
  .then(joinScheduleAndWikipediaData)
  .then(createScheduleDom)
  .then(schedule => { document.body.appendChild(schedule); })
  .then(() => { scheduleTsvSource.style.display = 'none'; })
  .then(() => { scrollIfNeeded(); });

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
          // FIXME Later episodes do not get unique titles
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

function normalize (title) {
  return title
    .toLowerCase()
    .replace(/the |doctor who and /g, "")
    .replace("æ", "ae");
}

function getStoryWikipediaData (wikipediaData, storyTitle) {
  const normalizedStoryTitle = normalize(storyTitle);
  for (let storyData of wikipediaData) {
    if (normalize(storyData.storyTitle) === normalizedStoryTitle) {
      return storyData;
    }
  }
  // FIXME Remove this dummy values when false negatives get resoled:
  // The Sunmakers
  // K9 And Company
  // The Trial Of A Time Lord
  return {
    episodes: [storyTitle],
  };
}

function joinScheduleAndWikipediaData ([scheduleData, wikipediaData]) {
  const data = [];
  const getStoryData = getStoryWikipediaData.bind(null, wikipediaData);
  
  for (let scheduleRow of scheduleData) {
    let previousEnd = new Date(scheduleRow.start);
    for (let [idx, storyTitle] of scheduleRow.titles.entries()) {
      let storyData = getStoryData(storyTitle);
      for (let episodeTitle of storyData.episodes) {
        let start = new Date(previousEnd);
        let end = new Date(start);
        end.setMinutes(end.getMinutes() + EP_DURATION_MIN);
        let row = {
          start: start,
          end: end,
          estimated: idx > 0,
          storyTitle: storyTitle,
          episodeTitle: episodeTitle,
          // TODO episodeNo, episodeTotal, storyNo
        };
        data.push(row);
        previousEnd = end;
      }
    }
  }
  
  return data;
}

function createScheduleDom (data) {
  const schedule = document.createElement('ol');
  schedule.className = 'schedule';
  data.forEach(row => {
    const {start, end, estimated, storyTitle, episodeTitle, episodeTotal} = row;
    const item = document.createElement('li');
    const d = document.createElement('time');
    const t = document.createElement('div');

    item.className = 'schedule__item';

    d.className = 'schedule__time';
    d.textContent = start.toLocaleString().replace(/:00$/, "");
    if (estimated) d.textContent += " or a bit later"; // FIXME
    d.datetime = start.toISOString();

    t.className = 'schedule__title';
    if (1 == episodeTotal)
    {
      t.textContent = storyTitle;
    }
    else
    {
      t.textContent = storyTitle + ": " + episodeTitle;
    }

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

function deactivateOther () {
    Array.from(document.querySelectorAll("[data-state]")).forEach(e => { delete e.dataset.current; });
}

function scrollTo (element) {
  element.scrollIntoView({
    block: "start",
    behaviour: "smooth",
  });
  console.log(element);
}

function activateCurrent (element) {
  deactivateOther();
  element.dataset.state = "current";
  scrollTo(element);
}

function activateNext (element, scroll) {
  deactivateOther();
  element.dataset.state = "next";
  if (scroll) scrollTo(element);
}

function scrollIfNeeded () {
  const now = new Date(); // FIXME DEBUG
  let foundCurrent = false;
  
  for (let dateElement of document.querySelectorAll("time")) {
    let start = new Date(dateElement.datetime);
    let end = new Date(start);
    end.setMinutes(end.getMinutes() + EP_DURATION_MIN);
    if (start <= now && now <= end) {
      activateCurrent(dateElement.parentElement);
      foundCurrent = true;
    }
    else if (now < start) {
      activateNext(dateElement.parentElement, ! foundCurrent);
      return;
    }
  }
  
  // for (let i in scheduleData) {
  //   i = parseInt(i, 10);
  //   // FIXME Match last
  //   if (scheduleData[i].start < now && now < scheduleData[i].end)
  //   {
  //     Array.from(document.querySelectorAll("[data-current=true]")).forEach(e => { delete e.dataset.current; });
  //     scheduleData[i].item.dataset.current = 'true';
  //     // TODO Only if needed
  //     // TODO Animate
  //     // FIXME Broken on iOS?
  //     scheduleData[i].item.scrollIntoView({
  //       block: "start",
  //       behaviour: "smooth",
  //     });
  //     break;
  //   }
}