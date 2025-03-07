chrome.commands.onCommand.addListener(onCommand);
chrome.notifications.onButtonClicked.addListener(onNotifiactionButtonClicked)
  

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

async function onNotifiactionButtonClicked(id, buttonIndex) {
    if (buttonIndex == 1) {
        navigateToNextTrend();
    }
}


function fetchTrends() {
    // Use Google's RSS-to-JSON API
    const rssUrl = 'https://trends.google.com/trending/rss?geo=US';
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    
    fetch(url)
      .then((response) => response.json())
      .then(async (data) => {
        let trends = [];
        for (const item of data.items) {
            const topic = item.title;
            const description = item.description;
            const imageMatch = description.match(/src="([^"]+)"/);
            const imageUrl = imageMatch ? imageMatch[1] : '';
            // Extract traffic volume from description if available, otherwise use a default
            const volumeMatch = description.match(/(\d+)\+/);
            const volume = volumeMatch ? parseInt(volumeMatch[1]) : 500;

            trends.push({
                topic,
                volume,
                imageUrl,
            });
        }
        
        await set({ trends, currentIndex: -1 });
        await navigateToNextTrend();
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
    trends = null;
    set({ trends });
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
  if (currentIndex + 1 != trends.length) {
    const nextTrend = trends[currentIndex + 1]
    console.log('next trend');
    console.log(nextTrend);
    chrome.notifications.create('next-trend', {
      buttons: [{title:'Close'},{title:'Next'}],
      iconUrl: nextTrend.imageUrl,
      title: 'Next Search',
      //imageUrl: nextTrend.imageUrl,
      message: nextTrend.topic,
      progress: parseInt(currentIndex / trends.length),
      //silent: true,
      type: 'basic',
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