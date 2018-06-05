const EP_DURATION_MIN = 25;

const scheduleTsvSource = document.getElementById('schedule-raw');

(async function () {
  const [scheduleData, wikipediaData] = await Promise.all([getScheduleData(), getWikipediaData()]);
  const data = await joinScheduleAndWikipediaData(scheduleData, wikipediaData);
  const schedule = await createScheduleDom(data);
  scheduleTsvSource.parentElement.insertBefore(schedule, scheduleTsvSource);
  scheduleTsvSource.style.display = 'none';
  window.addEventListener('load', () => {
    scrollIfNeeded();
    setInterval(scrollIfNeeded, 10 * 1000);
  });
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
    
  for (let tr of dataSource.querySelectorAll(".wikiepisodetable .vevent")) {
    const ep = tr.children[0].id.replace(/^ep/, "");
    const storyTitle = tr.querySelector(".summary a").textContent;
    let episodes;
    let doctorHeading;
    
    episodes = Array.from(tr.querySelector(".summary").childNodes)
      .filter(ch => ch instanceof Text)
      .map(textNode => textNode.textContent.replace(/^\s*"|"\s*$/g, ""))
      .filter(text => ! /^\s*\(.*\)\s*$/.test(text));
    if (0 === episodes.length)
    {
      // FIXME The Ice Warriors shows just one
      // As many episodes as broadcast dates
      episodes = Array.from(tr.children[5].childNodes)
        .filter(n => n instanceof Text)
        .map(textNode => storyTitle);
    }
    
    episodes = episodes.map(title => { return {title} });

    if (tr.querySelector(".summary").textContent.match(/\(all episodes missing\)/i)) {
      episodes.forEach(ep => { ep.missing = true });
    }
    else
    {
      let match = tr.querySelector(".summary").textContent.match(/\(episodes? ([0-9, &\s]*) missing\)/i);
      if (match) {
        match[1].split(/[^0-9]+/).forEach(ep => { episodes[ep-1].missing = true });
      }
    }
    
    for (
      doctorHeading = tr.closest('table');
      doctorHeading.tagName !== 'H3';
      doctorHeading = doctorHeading.previousElementSibling
    );
    
    data.push({
      ep,
      doctor: doctorHeading.childNodes[0].textContent,
      storyTitle,
      episodes,
    });
  }
  
  return data;
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
          doctor: storyData.doctor,
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

function createHeaderElement (heading) {
  const item = document.createElement('h2');
  item.className = 'schedule__header';
  item.textContent = heading;
  return item;
}

function createItemElement (row) {
  const item = document.createElement('li');
  const d = document.createElement('time');
  const t = document.createElement('a');

  item.className = 'schedule__item';

  d.className = 'schedule__time';
  d.textContent = row.start.toLocaleString().replace(/:00$/, "");
  if (row.estimated) d.textContent += " or a bit later"; // FIXME Better UI
  d.datetime = row.start.toISOString();

  t.className = 'schedule__title';
  if (1 === row.episodeTotal)
  {
    t.textContent = row.storyTitle;
  }
  else if (normalize(row.storyTitle) === normalize(row.episodeTitle))
  {
    t.textContent = `${row.storyTitle} (${row.episodeNumber}/${row.episodeTotal})`;
  }
  else
  {
    t.textContent = `${row.storyTitle} (${row.episodeNumber}/${row.episodeTotal}): ${row.episodeTitle}`;
  }
  if (row.missing) t.textContent += ' (MISSING)';
  t.target = "_blank";
  t.rel = "noopener noreferrer";
  t.href = "https://en.wikipedia.org/wiki/List_of_Doctor_Who_episodes_(1963–1989)#ep" + row.storyNumber;

  item.append(d);
  item.append(t);
  
  return item;
}

function createScheduleDom (data) {
  const schedule = document.createElement('section');
  let list;
  schedule.className = 'schedule';
  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];
    const item = createItemElement(row);
    
    if (0 === i || data[i-1].doctor !== row.doctor) {
      schedule.appendChild(createHeaderElement(row.doctor));
      list = document.createElement('ol');
      list.className = 'schedule__list';
      schedule.appendChild(list);
    }
    
    list.appendChild(item);

    data[i].item = item;
  };
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
  element.scrollIntoViewIfNeeded({
    block: "start",
    behaviour: "smooth",
  });
}

function scrollIfNeeded () {
  const oldCurrent = document.querySelector("[data-state=current], [data-state=next]");
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
    if (scrollTarget !== oldCurrent) {
      scrollTo(scrollTarget);
    }
  }
}