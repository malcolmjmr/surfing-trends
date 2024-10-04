

chrome.commands.onCommand.addListener(onCommand);

async function onCommand(command) {
    
    if (command === "next-trend") {
        let trends = await get('trends');
        if (!trends || trends.length === 0) { // also check if result tab still exists
          fetchTrends();
        } else {
          navigateToNextTrend();
        }
      }
}


function fetchTrends() {
    const url = 'https://trends.google.com/trends/api/dailytrends?hl=en-US&tz=-480&geo=US';
    
    fetch(url)
      .then(response => response.text())
      .then(text => {
        // The response starts with `)]}',\n` which we need to remove
        const json = JSON.parse(text.slice(5));
        let trends = json.default.trendingSearchesDays[0].trendingSearches
          .map(trend => ({
            topic: trend.title.query,
            volume: trend.formattedTraffic,
            hoursActive: 24 // API doesn't provide this, so we assume 24 hours
          }))
          .slice(0, 25);
        
        set({ trends, currentIndex: -1 });
        navigateToNextTrend();
      })
      .catch(error => {
        console.error('Error fetching trends:', error);
      });
  }


async function navigateToNextTrend() {    
  let trends = await get('trends');
  let currentIndex = await get('currentIndex');
  let resultTabId = await get('resultTabId');

  currentIndex = (currentIndex + 1) % trends.length;
  set({ currentIndex });
  if (currentIndex === 0 && resultTabId) {
    // If we've cycled through all trends, remove the result tab
    chrome.tabs.remove(resultTabId);
    resultTabId = null;
    set({ resultTabId });
    return;
  }

  const trend = trends[currentIndex];
  let tab;
  if (resultTabId) {
    try {
        tab = await chrome.tabs.get(resultTabId);
        chrome.tabs.update(resultTabId, { url: `https://www.google.com/search?q=${encodeURIComponent(trend.topic)}` });
    } catch (e) {

    }

  } 
  
  if (!tab) {
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(trend.topic)}` }, ({ id }) => {
      set({ resultTabId: id });
    });
  }
}

const get = async (key) => {
    const data = (await chrome.storage.local.get([key])) ?? {};
    return data[key];
}

const set = async (record) => {
    await chrome.storage.local.set(record);
}