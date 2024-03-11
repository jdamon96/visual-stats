const BBALL_REF_ORIGIN = "basketball-reference.com";

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = new URL(tab.url);
    // Enables the side panel on basketball-reference.com and its subdomains
    if (url.hostname.includes(BBALL_REF_ORIGIN)) {
      await chrome.sidePanel.setOptions({
        tabId,
        path: "index.html",
        enabled: true,
      });
    } else {
      // Disables the side panel on all other sites
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false,
      });
    }

    // This snippet checks if the tab update status is 'complete' and if the tab has a URL.
    // If both conditions are met, it creates a new URL object from the tab's URL.
    // It then defines a regular expression to match the URL pattern of a player's page on basketball-reference.com.
    // If the tab's URL matches this pattern, it sends a message to the tab with the action 'fetchPlayerStats' and the URL of the player's page.
    const playerPageRegex =
      /https:\/\/www\.basketball-reference\.com\/players\/[a-z]\/[a-z]+[0-9]+\.html/;
    if (playerPageRegex.test(url.href)) {
      chrome.tabs.sendMessage(tabId, {
        action: "fetchPlayerStats",
        url: url.href,
      });
    }
  }
});
