// MyScraper Background Service Worker

// Initialize extension on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('MyScraper extension installed');

  // Set default settings
  chrome.storage.sync.set({
    // General settings
    defaultExport: 'csv',
    notificationTimeout: 3000,
    autoScrape: false,
    showNotifications: true,
    autoDetect: true,
    enableManualSelection: true,
    sidebarPosition: 'right',

    // Schedule settings
    scheduleEnabled: false,
    scheduleFrequency: 'daily',
    scheduleUrls: '',
    scheduleDataType: 'all',
    scheduleTime: '09:00',
    scheduleDayOfWeek: '1',

    // Extraction settings
    extractEmailsOpt: true,
    extractPhonesOpt: true,
    extractLinksOpt: true,
    extractImagesOpt: false,
    extractProductsOpt: false,
    extractBusinessOpt: false,
    extractReviewsOpt: false,

    // Export settings
    csvDelimiter: ',',
    includeHeaders: true,
    autoDownload: false,
    exportFilename: 'myscraper_data_{date}_{type}',

    // Advanced settings
    requestDelay: 500,
    maxConcurrent: 3,
    timeout: 30000,
    retryCount: 3,
    proxyEnabled: false,
    proxyType: 'http',
    proxyHost: '',
    proxyPort: '',
    proxyUsername: '',
    proxyPassword: '',
    userAgent: '',
    rotateUserAgent: false,
    excludedDomains: '',
    allowedDomains: '',
    maxDataAge: 30,
    maxDataSize: 10
  }, () => {
    // Create context menu after settings are set
    if (chrome.contextMenus) {
      chrome.contextMenus.create({
        id: "myscraper-extract",
        title: "Extract with MyScraper",
        contexts: ["selection", "link", "image"]
      });
    }
  });
});

// Listen for context menu clicks
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "myscraper-extract") {
      // Handle context menu extraction
      handleContextMenuExtraction(info, tab);
    }
  });
}

// Handle context menu extraction
function handleContextMenuExtraction(info, tab) {
  let extractionType = '';
  let extractionData = '';

  if (info.selectionText) {
    extractionType = 'text';
    extractionData = info.selectionText;
  } else if (info.linkUrl) {
    extractionType = 'link';
    extractionData = info.linkUrl;
  } else if (info.srcUrl) {
    extractionType = 'image';
    extractionData = info.srcUrl;
  }

  // Store the extracted data
  chrome.storage.local.get(['scrapedData'], (result) => {
    const scrapedData = result.scrapedData || {};

    if (!scrapedData[extractionType]) {
      scrapedData[extractionType] = [];
    }

    scrapedData[extractionType].push(extractionData);

    // Remove duplicates
    scrapedData[extractionType] = [...new Set(scrapedData[extractionType])];

    chrome.storage.local.set({ scrapedData }, () => {
      // Show notification
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'MyScraper',
          message: `Extracted ${extractionType}: ${extractionData.substring(0, 50)}${extractionData.length > 50 ? '...' : ''}`
        });
      }
    });
  });
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'dataUpdated':
      // Data was updated, notify all open popups
      chrome.runtime.sendMessage({ action: 'refreshData' });
      sendResponse({ success: true });
      break;

    case 'bulkScrape':
      startBulkScraping(message.urls, message.dataType, message.pagination, message.singlePage);
      sendResponse({ success: true });
      break;

    case 'exportData':
      exportData(message.format);
      sendResponse({ success: true });
      break;

    case 'bulkData':
      // Store the data from bulk scraping
      storeBulkData(message.data, message.url);
      sendResponse({ success: true });
      break;

    case 'openSidebar':
      // Open the sidebar in the current tab
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "openSidebar"});
        }
      });
      sendResponse({ success: true });
      break;

    case 'settingsUpdated':
      // Handle settings updates
      if (message.settings && message.settings.scheduleEnabled) {
        updateSchedule(message.settings);
      }
      sendResponse({ success: true });
      break;

    case 'scheduleUpdated':
      // Update schedule
      updateSchedule(message.schedule);
      sendResponse({ success: true });
      break;

    case 'getScrapedData':
      chrome.storage.local.get(['scrapedData'], (result) => {
        sendResponse({ data: result.scrapedData || {} });
      });
      return true; // Keep message channel open for async response

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }

  return true; // This indicates we'll send a response asynchronously
});

// Store bulk data from content scripts
function storeBulkData(data, url) {
  chrome.storage.local.get(['scrapedData'], (result) => {
    const scrapedData = result.scrapedData || {};

    // Process based on data structure
    if (data.emails) {
      if (!scrapedData.emails) scrapedData.emails = [];
      scrapedData.emails = [...new Set([...scrapedData.emails, ...data.emails])];
    }

    if (data.phones) {
      if (!scrapedData.phones) scrapedData.phones = [];
      scrapedData.phones = [...new Set([...scrapedData.phones, ...data.phones])];
    }

    if (data.business) {
      if (!scrapedData.business) scrapedData.business = [];
      scrapedData.business = [...scrapedData.business, ...data.business];
    }

    if (data.products) {
      if (!scrapedData.products) scrapedData.products = [];
      scrapedData.products = [...scrapedData.products, ...data.products];
    }

    // Add to scraping history
    if (!scrapedData.scrapingHistory) scrapedData.scrapingHistory = [];

    const historyEntry = {
      url: url,
      timestamp: Date.now(),
      dataTypes: Object.keys(data).filter(key => data[key] && data[key].length > 0)
    };

    scrapedData.scrapingHistory.push(historyEntry);

    chrome.storage.local.set({ scrapedData }, () => {
      chrome.runtime.sendMessage({ action: 'dataUpdated' });
    });
  });
}

// Update bulk scraping to include single page option
function startBulkScraping(urls, dataType, pagination = null, singlePage = false) {
  let completed = 0;
  const total = urls.length;

  // Process each URL
  urls.forEach((url, index) => {
    if (singlePage || !pagination || !pagination.enabled) {
      // Single page scraping
      scrapeSinglePage(url, dataType, () => {
        completed++;
        chrome.runtime.sendMessage({
          action: 'bulkProgress',
          completed: completed,
          total: total
        });

        // Check if all URLs are processed
        if (completed === total) {
          chrome.runtime.sendMessage({
            action: 'bulkComplete',
            count: total
          });
        }
      });
    } else {
      // Multi-page scraping with pagination
      scrapePageWithPagination(url, dataType, pagination, () => {
        completed++;
        chrome.runtime.sendMessage({
          action: 'bulkProgress',
          completed: completed,
          total: total
        });

        // Check if all URLs are processed
        if (completed === total) {
          chrome.runtime.sendMessage({
            action: 'bulkComplete',
            count: total
          });
        }
      });
    }
  });
}

// Function for single page scraping
function scrapeSinglePage(url, dataType, callback) {
  chrome.tabs.create({ url: url, active: false }, (tab) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        // Scrape the page
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: scrapePage,
          args: [dataType]
        }, () => {
          chrome.tabs.remove(tab.id);
          callback();
        });
      }
    });
  });
}

// Function to handle pagination
function scrapePageWithPagination(url, dataType, pagination, callback) {
  chrome.tabs.create({ url: url, active: false }, (tab) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        // Scrape the first page
        scrapeCurrentPage(tab.id, dataType, () => {
          if (pagination && pagination.enabled) {
            // Handle pagination
            let currentPage = 1;
            const maxPages = pagination.pageCount;

            function scrapeNextPage() {
              currentPage++;
              if (currentPage > maxPages) {
                chrome.tabs.remove(tab.id);
                callback();
                return;
              }

              // Find and click the next page link
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: clickNextPage
              }, () => {
                // Wait for the page to load
                setTimeout(() => {
                  scrapeCurrentPage(tab.id, dataType, scrapeNextPage);
                }, 2000);
              });
            }

            scrapeNextPage();
          } else {
            chrome.tabs.remove(tab.id);
            callback();
          }
        });
      }
    });
  });
}

// Function to scrape the current page
function scrapeCurrentPage(tabId, dataType, callback) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: scrapePage,
    args: [dataType]
  }, callback);
}

// Function to click the next page link
function clickNextPage() {
  const paginationSelectors = [
    '.pagination a',
    '.pager a',
    '.page-numbers a',
    '.pagination li a',
    '[class*="pagination"] a',
    '[aria-label*="pagination"] a',
    '[role="navigation"] a',
    '.next-page',
    '.next',
    '[aria-label="Next"]',
    '[title="Next"]'
  ];

  // Try to find a "Next" button or link
  for (const selector of paginationSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent.trim().toLowerCase();
      if (text === 'next' || text === '›' || text === '»' || element.getAttribute('aria-label') === 'Next') {
        element.click();
        return;
      }
    }
  }

  // If no "Next" button found, try to find a link with the next page number
  const currentPageElement = document.querySelector('.current, .active, [aria-current="page"]');
  if (currentPageElement) {
    const currentPageText = currentPageElement.textContent.trim();
    const currentPageNum = parseInt(currentPageText);
    if (!isNaN(currentPageNum)) {
      const nextPageNum = currentPageNum + 1;
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const linkText = link.textContent.trim();
        if (parseInt(linkText) === nextPageNum) {
          link.click();
          return;
        }
      }
    }
  }
}

// Function to be injected into pages for bulk scraping
function scrapePage(dataType) {
  // This function will be injected into each page
  const extractors = {
    all: () => {
      // Extract all data types
      const data = {};

      // Extract emails
      const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
      data.emails = document.body.innerText.match(emailRegex) || [];

      // Extract phones
      const phoneRegexes = [
        /\+\d{1,3}\s?\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g,
        /\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g,
        /\d{3}[-\s]?\d{3}[-\s]?\d{4}/g,
        /\+\d{1,3}\s?\d{3}[-\s]?\d{3}[-\s]?\d{4}/g
      ];
      data.phones = [];
      phoneRegexes.forEach(regex => {
        const matches = document.body.innerText.match(regex) || [];
        data.phones.push(...matches);
      });
      data.phones = [...new Set(data.phones)];

      // Extract business data
      data.business = [];
      document.querySelectorAll('.business, .company, [itemtype*="Business"]').forEach(el => {
        const business = {
          name: el.querySelector('h1, h2, h3, .name')?.innerText.trim() || '',
          address: el.querySelector('.address, .location')?.innerText.trim() || '',
          phone: el.querySelector('.phone')?.innerText.trim() || '',
          website: el.querySelector('.website, a[href^="http"]')?.href || '',
          email: el.querySelector('.email')?.innerText.trim() || '',
          url: window.location.href
        };

        if (business.name || business.address) {
          data.business.push(business);
        }
      });

      // Extract product data
      data.products = extractProducts();

      return data;
    },

    emails: () => {
      const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
      return document.body.innerText.match(emailRegex) || [];
    },

    phones: () => {
      const phoneRegexes = [
        /\+\d{1,3}\s?\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g,
        /\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g,
        /\d{3}[-\s]?\d{3}[-\s]?\d{4}/g,
        /\+\d{1,3}\s?\d{3}[-\s]?\d{3}[-\s]?\d{4}/g
      ];
      const phones = [];
      phoneRegexes.forEach(regex => {
        const matches = document.body.innerText.match(regex) || [];
        phones.push(...matches);
      });
      return [...new Set(phones)];
    },

    business: () => {
      const businesses = [];
      document.querySelectorAll('.business, .company, [itemtype*="Business"]').forEach(el => {
        const business = {
          name: el.querySelector('h1, h2, h3, .name')?.innerText.trim() || '',
          address: el.querySelector('.address, .location')?.innerText.trim() || '',
          phone: el.querySelector('.phone')?.innerText.trim() || '',
          website: el.querySelector('.website, a[href^="http"]')?.href || '',
          email: el.querySelector('.email')?.innerText.trim() || '',
          url: window.location.href
        };

        if (business.name || business.address) {
          businesses.push(business);
        }
      });
      return businesses;
    },

    products: () => {
      return extractProducts();
    },

    reviews: () => {
      const reviews = [];

      // Common review selectors
      const reviewSelectors = [
        '.review', '.comment', '.testimonial',
        '[itemtype*="Review"]', '[itemtype*="Comment"]'
      ];

      reviewSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const review = {
            author: el.querySelector('.author, .by, [itemprop="author"]')?.innerText.trim() || '',
            rating: el.querySelector('.rating, [itemprop="ratingValue"]')?.innerText.trim() || '',
            date: el.querySelector('.date, [itemprop="datePublished"]')?.innerText.trim() || '',
            content: el.querySelector('.content, .text, [itemprop="reviewBody"]')?.innerText.trim() || '',
            url: window.location.href
          };

          if (review.content) {
            reviews.push(review);
          }
        });
      });

      return reviews;
    }
  };

  // Helper function to extract products
  function extractProducts() {
    const products = [];

    // Common product selectors for different e-commerce sites
    const productSelectors = [
      // Amazon
      '[data-component-type="s-search-result"]',
      '#dp-container',

      // eBay
      '.s-item',

      // General e-commerce
      '.product',
      '.product-card',
      '.product-item',
      '[data-testid="product-card"]',

      // Schema.org markup
      '[itemtype*="Product"]'
    ];

    // Try to find product containers
    let productContainers = [];

    productSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        productContainers = Array.from(elements);
        return; // Stop after finding the first selector with results
      }
    });

    // Extract data from each product container
    productContainers.forEach(container => {
      const product = {
        name: extractProductName(container),
        price: extractProductPrice(container),
        image: extractProductImage(container),
        url: extractProductURL(container)
      };

      // Only add if we have at least a name or price
      if (product.name || product.price) {
        products.push(product);
      }
    });

    return products;
  }

  // Helper functions for product extraction
  function extractProductName(container) {
    const nameSelectors = ['h1', '.product-title', '.product-name', '[itemprop="name"]', '#productTitle'];

    for (const selector of nameSelectors) {
      const element = container.querySelector(selector);
      if (element && element.innerText.trim()) {
        return element.innerText.trim();
      }
    }

    return '';
  }

  function extractProductPrice(container) {
    const priceSelectors = ['.price', '.product-price', '[itemprop="price"]', '.a-price .a-offscreen', '#priceblock_ourprice'];

    for (const selector of priceSelectors) {
      const element = container.querySelector(selector);
      if (element) {
        const priceText = element.innerText.trim();
        const priceMatch = priceText.match(/[\d,.]+/);
        if (priceMatch) {
          return priceMatch[0];
        }
      }
    }

    return '';
  }

  function extractProductImage(container) {
    const imageSelectors = ['.product-image', '[itemprop="image"]', '#landingImage', 'img[src*="product"]'];

    for (const selector of imageSelectors) {
      const element = container.querySelector(selector);
      if (element && element.src) {
        return element.src;
      }
    }

    return '';
  }

  function extractProductURL(container) {
    const linkSelectors = ['a[href*="product"]', 'a[href*="item"]', 'a[href*="dp/"]'];

    for (const selector of linkSelectors) {
      const element = container.querySelector(selector);
      if (element && element.href) {
        return element.href;
      }
    }

    return window.location.href;
  }

  // Extract data based on the specified type
  const data = extractors[dataType] ? extractors[dataType]() : extractors.all();

  // Send data back to background script
  chrome.runtime.sendMessage({
    action: 'bulkData',
    data: data,
    url: window.location.href
  });
}

// Export data in various formats
function exportData(format) {
  chrome.storage.local.get(['scrapedData'], (result) => {
    const data = result.scrapedData || {};

    let content = '';
    let filename = 'myscraper_data';
    let mimeType = '';

    switch (format) {
      case 'csv':
        content = convertToCSV(data);
        filename += '.csv';
        mimeType = 'text/csv';
        break;

      case 'xlsx':
        // For Excel export, we'll use HTML table format
        content = convertToHTMLTable(data);
        filename += '.html';
        mimeType = 'text/html';
        break;

      case 'json':
        content = JSON.stringify(data, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;
    }

    // Create a blob and download it
    const blob = new Blob([content], { type: mimeType });

    const url = URL.createObjectURL(blob);

    // Use chrome.downloads API with the blob URL
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, () => {
      // Revoke the object URL to free up memory
      URL.revokeObjectURL(url);
    });
  });
}

// Convert data to CSV format
function convertToCSV(data) {
  let csv = '';

  // Add emails
  if (data.emails && data.emails.length > 0) {
    csv += 'Emails\n';
    data.emails.forEach(email => {
      csv += `"${email}"\n`;
    });
    csv += '\n';
  }

  // Add phones
  if (data.phones && data.phones.length > 0) {
    csv += 'Phone Numbers\n';
    data.phones.forEach(phone => {
      csv += `"${phone}"\n`;
    });
    csv += '\n';
  }

  // Add business data
  if (data.business && data.business.length > 0) {
    csv += 'Business Data\n';
    csv += 'Name,Address,Phone,Website,Email,URL\n';
    data.business.forEach(business => {
      csv += `"${business.name}","${business.address}","${business.phone}","${business.website}","${business.email}","${business.url}"\n`;
    });
    csv += '\n';
  }

  // Add products
  if (data.products && data.products.length > 0) {
    csv += 'Product Data\n';
    csv += 'Name,Price,Image,URL\n';
    data.products.forEach(product => {
      csv += `"${product.name}","${product.price}","${product.image}","${product.url}"\n`;
    });
    csv += '\n';
  }

  // Add links
  if (data.links && data.links.length > 0) {
    csv += 'Links\n';
    csv += 'URL,Text,Title\n';
    data.links.forEach(link => {
      csv += `"${link.href}","${link.text}","${link.title}"\n`;
    });
    csv += '\n';
  }

  // Add images
  if (data.images && data.images.length > 0) {
    csv += 'Images\n';
    csv += 'URL,Alt Text,Width,Height\n';
    data.images.forEach(image => {
      csv += `"${image.src}","${image.alt}",${image.width},${image.height}\n`;
    });
  }

  return csv;
}

// Convert data to HTML table format
function convertToHTMLTable(data) {
  let html = '<!DOCTYPE html><html><head><title>MyScraper Data</title><style>table {border-collapse: collapse; width: 100%;} th, td {border: 1px solid #ddd; padding: 8px; text-align: left;} th {background-color: #f2f2f2;} img {max-width: 100px;}</style></head><body>';

  // Add emails
  if (data.emails && data.emails.length > 0) {
    html += '<h2>Emails</h2><table>';
    data.emails.forEach(email => {
      html += `<tr><td>${email}</td></tr>`;
    });
    html += '</table>';
  }

  // Add phones
  if (data.phones && data.phones.length > 0) {
    html += '<h2>Phone Numbers</h2><table>';
    data.phones.forEach(phone => {
      html += `<tr><td>${phone}</td></tr>`;
    });
    html += '</table>';
  }

  // Add business data
  if (data.business && data.business.length > 0) {
    html += '<h2>Business Data</h2><table><tr><th>Name</th><th>Address</th><th>Phone</th><th>Website</th><th>Email</th></tr>';
    data.business.forEach(business => {
      html += `<tr>
        <td>${business.name}</td>
        <td>${business.address}</td>
        <td>${business.phone}</td>
        <td>${business.website}</td>
        <td>${business.email}</td>
      </tr>`;
    });
    html += '</table>';
  }

  // Add products
  if (data.products && data.products.length > 0) {
    html += '<h2>Product Data</h2><table><tr><th>Name</th><th>Price</th><th>Image</th><th>URL</th></tr>';
    data.products.forEach(product => {
      html += `<tr>
        <td>${product.name}</td>
        <td>${product.price}</td>
        <td>${product.image ? `<img src="${product.image}">` : ''}</td>
        <td><a href="${product.url}">${product.url}</a></td>
      </tr>`;
    });
    html += '</table>';
  }

  html += '</body></html>';
  return html;
}

// Schedule variables
let scheduleAlarm = null;
let scheduleCheckInterval = null;

// Update schedule based on settings
function updateSchedule(schedule) {
  // Clear existing alarms and intervals
  if (scheduleAlarm) {
    chrome.alarms.clear(scheduleAlarm);
    scheduleAlarm = null;
  }

  if (scheduleCheckInterval) {
    clearInterval(scheduleCheckInterval);
    scheduleCheckInterval = null;
  }

  // Set up new schedule if enabled
  if (schedule.enabled) {
    setupSchedule(schedule);
  }
}

// Set up schedule based on frequency
function setupSchedule(schedule) {
  const urls = schedule.urls.split('\n').map(url => url.trim()).filter(url => url !== '');

  if (urls.length === 0) {
    return;
  }

  switch (schedule.frequency) {
    case 'hourly':
      // Create an alarm that triggers every hour
      chrome.alarms.create('hourlyScraping', { periodInMinutes: 60 });
      scheduleAlarm = 'hourlyScraping';
      break;

    case 'daily':
      // Check every minute if it's time to run
      scheduleCheckInterval = setInterval(() => {
        checkIfTimeToRun(schedule, urls);
      }, 60000); // Check every minute
      break;

    case 'weekly':
      // Check every minute if it's time to run
      scheduleCheckInterval = setInterval(() => {
        checkIfTimeToRun(schedule, urls);
      }, 60000); // Check every minute
      break;

    case 'monthly':
      // Check every hour if it's time to run
      scheduleCheckInterval = setInterval(() => {
        checkIfTimeToRun(schedule, urls);
      }, 3600000); // Check every hour
      break;
  }
}

// Check if it's time to run the scheduled scraping
function checkIfTimeToRun(schedule, urls) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // Parse schedule time
  const [scheduleHours, scheduleMinutes] = schedule.time.split(':').map(Number);

  // Check if it's the right day and time
  let shouldRun = false;

  if (schedule.frequency === 'daily') {
    shouldRun = currentHours === scheduleHours && currentMinutes === scheduleMinutes;
  } else if (schedule.frequency === 'weekly') {
    shouldRun = currentDay === parseInt(schedule.dayOfWeek) &&
                currentHours === scheduleHours &&
                currentMinutes === scheduleMinutes;
  } else if (schedule.frequency === 'monthly') {
    // Check if it's the first day of the month and the right time
    shouldRun = now.getDate() === 1 &&
                currentHours === scheduleHours &&
                currentMinutes === scheduleMinutes;
  }

  if (shouldRun) {
    // Run the scheduled scraping
    runScheduledScraping(urls, schedule.dataType);
  }
}

// Run scheduled scraping
function runScheduledScraping(urls, dataType) {
  // Create a notification
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'MyScraper',
      message: `Running scheduled scraping for ${urls.length} URLs`
    });
  }

  // Start bulk scraping
  startBulkScraping(urls, dataType, null, true);
}

// Listen for alarm events
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'hourlyScraping') {
      chrome.storage.sync.get(['scheduleUrls', 'scheduleDataType'], (result) => {
        const urls = result.scheduleUrls.split('\n').map(url => url.trim()).filter(url => url !== '');

        if (urls.length > 0) {
          runScheduledScraping(urls, result.scheduleDataType);
        }
      });
    }
  });
}

// Initialize schedule on extension startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['scheduleEnabled', 'scheduleFrequency', 'scheduleUrls', 'scheduleDataType', 'scheduleTime', 'scheduleDayOfWeek'], (result) => {
    if (result.scheduleEnabled) {
      updateSchedule({
        enabled: result.scheduleEnabled,
        frequency: result.scheduleFrequency,
        urls: result.scheduleUrls,
        dataType: result.scheduleDataType,
        time: result.scheduleTime,
        dayOfWeek: result.scheduleDayOfWeek
      });
    }
  });
});
