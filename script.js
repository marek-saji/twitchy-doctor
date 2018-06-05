const EP_DURATION_MIN = 25;

const scheduleTsvSource = document.getElementById('schedule-raw');

(async function () {
  const [scheduleData, wikipediaData] = await Promise.all([getScheduleData(), getWikipediaData()]);
  const data = await joinScheduleAndWikipediaData(scheduleData, wikipediaData);
  const schedule = await createScheduleDom(data);
  scheduleTsvSource.parentElement.insertBefore(schedule, scheduleTsvSource);
  scheduleTsvSource.style.display = 'none';
  scrollIfNeeded();
  setInterval(scrollIfNeeded, 10 * 1000);
}());


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

async function getWikipediaData () {
  const data = [];
  const html = await (await fetch("/data/wikipedia-serials.html")).text();
  const dataSource = document.createElement("div");
  // Dummy way to disable loading images.
  dataSource.innerHTML = html.replace(/<img /g, '<x-img ');
  
  dataSource.innerHTML = html;
  
  for (let tr of dataSource.querySelectorAll(".wikiepisodetable .vevent")) {
    const ep = tr.children[0].id.replace(/^ep/, "");
    const storyTitle = tr.querySelector(".summary a").textContent;
    let episodes = Array.from(tr.querySelector(".summary").childNodes)
      .filter(ch => ch instanceof Text)
      .map(textNode => textNode.textContent.replace(/^\s*"|"\s*$/g, ""));
    if (0 === episodes.length)
    {
      // As many episodes as broadcast dates
      episodes = Array.from(tr.children[5].childNodes)
        .filter(n => n instanceof Text)
        .map(textNode => storyTitle);
    }
    data.push({
      ep,
      storyTitle,
      episodes,
    });
  }
  
  return data;
}

// function getWikipediaData () {
//   return fetch("/data/wikipedia-serials.html")
//     .then(response => response.text())
//     // Dummy way to disable loading images.
//     .then(html => html.replace(/<img /g, '<x-img '))
//     .then(html => {
//       const dataSource = document.createElement("div");
//       dataSource.innerHTML = html;
//       return Array.from(dataSource.querySelectorAll(".wikiepisodetable .vevent")).reduce(
//         (rows, tr) => {
//           const ep = tr.children[0].id.replace(/^ep/, "");
//           const storyTitle = tr.querySelector(".summary a").textContent;
//           let episodes = Array.from(tr.querySelector(".summary").childNodes)
//             .filter(ch => ch instanceof Text)
//             .map(textNode => textNode.textContent.replace(/^\s*"|"\s*$/g, ""));
//           if (0 === episodes.length)
//           {
//             // As many episodes as broadcast dates
//             episodes = Array.from(tr.children[5].childNodes)
//               .filter(n => n instanceof Text)
//               .map(textNode => storyTitle);
//           }
//           rows.push({
//             ep,
//             storyTitle,
//             episodes,
//           });
//           return rows;
//         },
//         []
//       );
//     });
// }

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

function joinScheduleAndWikipediaData (scheduleData, wikipediaData) {
  const data = [];
  const getStoryData = getStoryWikipediaData.bind(null, wikipediaData);
  
  for (let scheduleRow of scheduleData) {
    let previousEnd = new Date(scheduleRow.start);
    for (let [storyIdx, storyTitle] of scheduleRow.titles.entries()) {
      let storyData = getStoryData(storyTitle);
      for (let [epIdx, episodeTitle] of storyData.episodes.entries()) {
        let start = new Date(previousEnd);
        let end = new Date(start);
        end.setMinutes(end.getMinutes() + EP_DURATION_MIN);
        let row = {
          start: start,
          end: end,
          estimated: storyIdx > 0 || epIdx > 0,
          storyTitle: storyTitle,
          storyNumber: storyData.ep,
          episodeTitle: episodeTitle,
          episodeNumber: epIdx + 1,
          episodeTotal: storyData.episodes.length,
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
    const t = document.createElement('a');

    item.className = 'schedule__item';

    d.className = 'schedule__time';
    d.textContent = start.toLocaleString().replace(/:00$/, "");
    if (estimated) d.textContent += " or a bit later"; // FIXME Better UI
    d.datetime = start.toISOString();

    t.className = 'schedule__title';
    if (1 === episodeTotal)
    {
      t.textContent = storyTitle;
    }
    else
    {
      t.textContent = `${storyTitle} (${row.episodeNumber}/${row.episodeTotal}): ${episodeTitle}`;
    }
    t.target = "_blank";
    t.rel = "noopener noreferrer";
    t.href = "https://en.wikipedia.org/wiki/List_of_Doctor_Who_episodes_(1963–1989)#ep" + row.storyNumber;

    // TODO Link to Wikipedia
    // TODO Which doctor?

    item.append(d);
    item.append(t);
    schedule.append(item);

    row.item = item;
  });
  // TODO Button to scroll to current (visible only when current is out of sight)
  return schedule;
}

function deactivateOther (foundElement) {
  for (let e of document.querySelectorAll("[data-state]")) {
    delete e.dataset.state;
  }
}

function activateCurrent (element) {
  element.dataset.state = "current";
}

function activateNext (element, scroll) {
  element.dataset.state = "next";
}

function scrollTo (element) {
  console.log(element);
  // FIXME Scroll only on change
  element.scrollIntoViewIfNeeded({
    block: "start",
    behaviour: "smooth",
  });
}

function scrollIfNeeded () {
  const now = new Date();
  let scrollTarget;
  
  deactivateOther();
  
  for (let dateElement of document.querySelectorAll("time")) {
    let start = new Date(dateElement.datetime);
    let end = new Date(start);
    end.setMinutes(end.getMinutes() + EP_DURATION_MIN);
    if (start <= now && now <= end) {
      activateCurrent(dateElement.parentElement);
      scrollTarget = dateElement.parentElement;
    }
    else if (now < start) {
      activateNext(dateElement.parentElement);
      scrollTarget = dateElement.parentElement;
      break;
    }
  }
  
  if (scrollTarget) {
    const oldCurrent = document.querySelector("[data-state=current]");
    if (scrollTarget !== oldCurrent) {
      console.log('scrolling to', scrollTarget);
      scrollTo(scrollTarget);
    }
    else {
      console.log('not scrolling.', scrollTarget, 'is still current');
    }
  }
}