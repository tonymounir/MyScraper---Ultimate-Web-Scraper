document.addEventListener('DOMContentLoaded', function() {
  // Tab functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Get tab ID and show corresponding content
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // Load saved options
  loadOptions();
  
  // Save options
  document.getElementById('saveOptions').addEventListener('click', saveOptions);
  
  // Reset options
  document.getElementById('resetOptions').addEventListener('click', resetOptions);
  
  // Clear data
  document.getElementById('clearData').addEventListener('click', clearData);
  
  // Save schedule
  document.getElementById('saveSchedule').addEventListener('click', saveSchedule);
  
  // Export settings
  document.getElementById('exportSettings').addEventListener('click', exportSettings);
  
  // Import settings
  document.getElementById('importSettings').addEventListener('click', () => {
    document.getElementById('settingsFile').click();
  });
  
  document.getElementById('settingsFile').addEventListener('change', importSettings);
  
  // Update filename preview
  updateFilenamePreview();
  document.getElementById('exportFilename').addEventListener('input', updateFilenamePreview);
  
  // Proxy settings toggle
  document.getElementById('proxyEnabled').addEventListener('change', function() {
    const proxyFields = [
      'proxyType', 'proxyHost', 'proxyPort', 
      'proxyUsername', 'proxyPassword'
    ];
    
    proxyFields.forEach(fieldId => {
      document.getElementById(fieldId).disabled = !this.checked;
    });
  });
  
  // Google Sheets settings toggle
  document.getElementById('enableGoogleSheets').addEventListener('change', function() {
    const sheetsFields = [
      'defaultSheetName', 'createNewSheet'
    ];
    
    sheetsFields.forEach(fieldId => {
      document.getElementById(fieldId).disabled = !this.checked;
    });
  });
  
  // Schedule settings toggle
  document.getElementById('scheduleEnabled').addEventListener('change', function() {
    const scheduleFields = [
      'scheduleFrequency', 'scheduleUrls', 'scheduleDataType', 
      'scheduleTime', 'scheduleDayOfWeek'
    ];
    
    scheduleFields.forEach(fieldId => {
      document.getElementById(fieldId).disabled = !this.checked;
    });
  });
});

function loadOptions() {
  chrome.storage.sync.get({
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
    extractNewsOpt: false,
    extractEventsOpt: false,
    extractRealEstateOpt: false,
    customSelectors: '',
    excludedElements: '.ads, .footer, .sidebar',
    excludedKeywords: 'advertisement, sponsored, promo',
    extractProductImages: true,
    extractProductSpecs: true,
    extractProductReviews: false,
    
    // Export settings
    csvDelimiter: ',',
    includeHeaders: true,
    autoDownload: false,
    exportFilename: 'myscraper_data_{date}_{type}',
    enableGoogleSheets: false,
    defaultSheetName: 'MyScraper Data',
    createNewSheet: false,
    
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
  }, function(items) {
    // General settings
    document.getElementById('defaultExport').value = items.defaultExport;
    document.getElementById('notificationTimeout').value = items.notificationTimeout;
    document.getElementById('autoScrape').checked = items.autoScrape;
    document.getElementById('showNotifications').checked = items.showNotifications;
    document.getElementById('autoDetect').checked = items.autoDetect;
    document.getElementById('enableManualSelection').checked = items.enableManualSelection;
    document.getElementById('sidebarPosition').value = items.sidebarPosition;
    
    // Schedule settings
    document.getElementById('scheduleEnabled').checked = items.scheduleEnabled;
    document.getElementById('scheduleFrequency').value = items.scheduleFrequency;
    document.getElementById('scheduleUrls').value = items.scheduleUrls;
    document.getElementById('scheduleDataType').value = items.scheduleDataType;
    document.getElementById('scheduleTime').value = items.scheduleTime;
    document.getElementById('scheduleDayOfWeek').value = items.scheduleDayOfWeek;
    
    // Extraction settings
    document.getElementById('extractEmailsOpt').checked = items.extractEmailsOpt;
    document.getElementById('extractPhonesOpt').checked = items.extractPhonesOpt;
    document.getElementById('extractLinksOpt').checked = items.extractLinksOpt;
    document.getElementById('extractImagesOpt').checked = items.extractImagesOpt;
    document.getElementById('extractProductsOpt').checked = items.extractProductsOpt;
    document.getElementById('extractBusinessOpt').checked = items.extractBusinessOpt;
    document.getElementById('extractReviewsOpt').checked = items.extractReviewsOpt;
    document.getElementById('extractNewsOpt').checked = items.extractNewsOpt;
    document.getElementById('extractEventsOpt').checked = items.extractEventsOpt;
    document.getElementById('extractRealEstateOpt').checked = items.extractRealEstateOpt;
    document.getElementById('customSelectors').value = items.customSelectors;
    document.getElementById('excludedElements').value = items.excludedElements;
    document.getElementById('excludedKeywords').value = items.excludedKeywords;
    document.getElementById('extractProductImages').checked = items.extractProductImages;
    document.getElementById('extractProductSpecs').checked = items.extractProductSpecs;
    document.getElementById('extractProductReviews').checked = items.extractProductReviews;
    
    // Export settings
    document.getElementById('csvDelimiter').value = items.csvDelimiter;
    document.getElementById('includeHeaders').checked = items.includeHeaders;
    document.getElementById('autoDownload').checked = items.autoDownload;
    document.getElementById('exportFilename').value = items.exportFilename;
    document.getElementById('enableGoogleSheets').checked = items.enableGoogleSheets;
    document.getElementById('defaultSheetName').value = items.defaultSheetName;
    document.getElementById('createNewSheet').checked = items.createNewSheet;
    
    // Advanced settings
    document.getElementById('requestDelay').value = items.requestDelay;
    document.getElementById('maxConcurrent').value = items.maxConcurrent;
    document.getElementById('timeout').value = items.timeout;
    document.getElementById('retryCount').value = items.retryCount;
    document.getElementById('proxyEnabled').checked = items.proxyEnabled;
    document.getElementById('proxyType').value = items.proxyType;
    document.getElementById('proxyHost').value = items.proxyHost;
    document.getElementById('proxyPort').value = items.proxyPort;
    document.getElementById('proxyUsername').value = items.proxyUsername;
    document.getElementById('proxyPassword').value = items.proxyPassword;
    document.getElementById('userAgent').value = items.userAgent;
    document.getElementById('rotateUserAgent').checked = items.rotateUserAgent;
    document.getElementById('excludedDomains').value = items.excludedDomains;
    document.getElementById('allowedDomains').value = items.allowedDomains;
    document.getElementById('maxDataAge').value = items.maxDataAge;
    document.getElementById('maxDataSize').value = items.maxDataSize;
    
    // Update field states
    document.getElementById('proxyEnabled').dispatchEvent(new Event('change'));
    document.getElementById('enableGoogleSheets').dispatchEvent(new Event('change'));
    document.getElementById('scheduleEnabled').dispatchEvent(new Event('change'));
    
    // Update filename preview
    updateFilenamePreview();
  });
}

function saveOptions() {
  // General settings
  const defaultExport = document.getElementById('defaultExport').value;
  const notificationTimeout = parseInt(document.getElementById('notificationTimeout').value);
  const autoScrape = document.getElementById('autoScrape').checked;
  const showNotifications = document.getElementById('showNotifications').checked;
  const autoDetect = document.getElementById('autoDetect').checked;
  const enableManualSelection = document.getElementById('enableManualSelection').checked;
  const sidebarPosition = document.getElementById('sidebarPosition').value;
  
  // Schedule settings
  const scheduleEnabled = document.getElementById('scheduleEnabled').checked;
  const scheduleFrequency = document.getElementById('scheduleFrequency').value;
  const scheduleUrls = document.getElementById('scheduleUrls').value;
  const scheduleDataType = document.getElementById('scheduleDataType').value;
  const scheduleTime = document.getElementById('scheduleTime').value;
  const scheduleDayOfWeek = document.getElementById('scheduleDayOfWeek').value;
  
  // Extraction settings
  const extractEmailsOpt = document.getElementById('extractEmailsOpt').checked;
  const extractPhonesOpt = document.getElementById('extractPhonesOpt').checked;
  const extractLinksOpt = document.getElementById('extractLinksOpt').checked;
  const extractImagesOpt = document.getElementById('extractImagesOpt').checked;
  const extractProductsOpt = document.getElementById('extractProductsOpt').checked;
  const extractBusinessOpt = document.getElementById('extractBusinessOpt').checked;
  const extractReviewsOpt = document.getElementById('extractReviewsOpt').checked;
  const extractNewsOpt = document.getElementById('extractNewsOpt').checked;
  const extractEventsOpt = document.getElementById('extractEventsOpt').checked;
  const extractRealEstateOpt = document.getElementById('extractRealEstateOpt').checked;
  const customSelectors = document.getElementById('customSelectors').value;
  const excludedElements = document.getElementById('excludedElements').value;
  const excludedKeywords = document.getElementById('excludedKeywords').value;
  const extractProductImages = document.getElementById('extractProductImages').checked;
  const extractProductSpecs = document.getElementById('extractProductSpecs').checked;
  const extractProductReviews = document.getElementById('extractProductReviews').checked;
  
  // Export settings
  const csvDelimiter = document.getElementById('csvDelimiter').value;
  const includeHeaders = document.getElementById('includeHeaders').checked;
  const autoDownload = document.getElementById('autoDownload').checked;
  const exportFilename = document.getElementById('exportFilename').value;
  const enableGoogleSheets = document.getElementById('enableGoogleSheets').checked;
  const defaultSheetName = document.getElementById('defaultSheetName').value;
  const createNewSheet = document.getElementById('createNewSheet').checked;
  
  // Advanced settings
  const requestDelay = parseInt(document.getElementById('requestDelay').value);
  const maxConcurrent = parseInt(document.getElementById('maxConcurrent').value);
  const timeout = parseInt(document.getElementById('timeout').value);
  const retryCount = parseInt(document.getElementById('retryCount').value);
  const proxyEnabled = document.getElementById('proxyEnabled').checked;
  const proxyType = document.getElementById('proxyType').value;
  const proxyHost = document.getElementById('proxyHost').value;
  const proxyPort = parseInt(document.getElementById('proxyPort').value);
  const proxyUsername = document.getElementById('proxyUsername').value;
  const proxyPassword = document.getElementById('proxyPassword').value;
  const userAgent = document.getElementById('userAgent').value;
  const rotateUserAgent = document.getElementById('rotateUserAgent').checked;
  const excludedDomains = document.getElementById('excludedDomains').value;
  const allowedDomains = document.getElementById('allowedDomains').value;
  const maxDataAge = parseInt(document.getElementById('maxDataAge').value);
  const maxDataSize = parseInt(document.getElementById('maxDataSize').value);
  
  // Validate settings
  if (notificationTimeout < 1000 || notificationTimeout > 10000) {
    showStatus('Notification timeout must be between 1000 and 10000ms', 'error');
    return;
  }
  
  if (requestDelay < 0 || requestDelay > 5000) {
    showStatus('Request delay must be between 0 and 5000ms', 'error');
    return;
  }
  
  if (maxConcurrent < 1 || maxConcurrent > 10) {
    showStatus('Max concurrent requests must be between 1 and 10', 'error');
    return;
  }
  
  if (timeout < 5000 || timeout > 60000) {
    showStatus('Request timeout must be between 5 and 60 seconds', 'error');
    return;
  }
  
  if (retryCount < 0 || retryCount > 5) {
    showStatus('Retry count must be between 0 and 5', 'error');
    return;
  }
  
  if (proxyEnabled && proxyPort < 1 || proxyPort > 65535) {
    showStatus('Proxy port must be between 1 and 65535', 'error');
    return;
  }
  
  if (maxDataAge < 1 || maxDataAge > 365) {
    showStatus('Maximum data age must be between 1 and 365 days', 'error');
    return;
  }
  
  if (maxDataSize < 1 || maxDataSize > 100) {
    showStatus('Maximum data size must be between 1 and 100 MB', 'error');
    return;
  }
  
  // Save settings
  chrome.storage.sync.set({
    // General settings
    defaultExport,
    notificationTimeout,
    autoScrape,
    showNotifications,
    autoDetect,
    enableManualSelection,
    sidebarPosition,
    
    // Schedule settings
    scheduleEnabled,
    scheduleFrequency,
    scheduleUrls,
    scheduleDataType,
    scheduleTime,
    scheduleDayOfWeek,
    
    // Extraction settings
    extractEmailsOpt,
    extractPhonesOpt,
    extractLinksOpt,
    extractImagesOpt,
    extractProductsOpt,
    extractBusinessOpt,
    extractReviewsOpt,
    extractNewsOpt,
    extractEventsOpt,
    extractRealEstateOpt,
    customSelectors,
    excludedElements,
    excludedKeywords,
    extractProductImages,
    extractProductSpecs,
    extractProductReviews,
    
    // Export settings
    csvDelimiter,
    includeHeaders,
    autoDownload,
    exportFilename,
    enableGoogleSheets,
    defaultSheetName,
    createNewSheet,
    
    // Advanced settings
    requestDelay,
    maxConcurrent,
    timeout,
    retryCount,
    proxyEnabled,
    proxyType,
    proxyHost,
    proxyPort,
    proxyUsername,
    proxyPassword,
    userAgent,
    rotateUserAgent,
    excludedDomains,
    allowedDomains,
    maxDataAge,
    maxDataSize
  }, function() {
    showStatus('Options saved successfully!', 'success');
    
    // Notify background script about settings changes
    chrome.runtime.sendMessage({
      action: 'settingsUpdated',
      settings: {
        scheduleEnabled,
        scheduleFrequency,
        scheduleUrls,
        scheduleDataType,
        scheduleTime,
        scheduleDayOfWeek
      }
    });
  });
}

function resetOptions() {
  if (confirm('Are you sure you want to reset all options to their default values? This action cannot be undone.')) {
    chrome.storage.sync.clear(function() {
      loadOptions();
      showStatus('Options have been reset to defaults', 'success');
    });
  }
}

function clearData() {
  if (confirm('Are you sure you want to clear all scraped data? This action cannot be undone.')) {
    chrome.storage.local.remove(['scrapedData', 'scrapingHistory'], function() {
      showStatus('All scraped data has been cleared.', 'success');
    });
  }
}

function saveSchedule() {
  const scheduleEnabled = document.getElementById('scheduleEnabled').checked;
  const scheduleFrequency = document.getElementById('scheduleFrequency').value;
  const scheduleUrls = document.getElementById('scheduleUrls').value;
  const scheduleDataType = document.getElementById('scheduleDataType').value;
  const scheduleTime = document.getElementById('scheduleTime').value;
  const scheduleDayOfWeek = document.getElementById('scheduleDayOfWeek').value;
  
  // Validate schedule
  if (scheduleEnabled && !scheduleUrls.trim()) {
    showStatus('Please enter at least one URL for scheduled scraping', 'error');
    return;
  }
  
  // Save schedule settings
  chrome.storage.sync.set({
    scheduleEnabled,
    scheduleFrequency,
    scheduleUrls,
    scheduleDataType,
    scheduleTime,
    scheduleDayOfWeek
  }, function() {
    showStatus('Schedule saved successfully!', 'success');
    
    // Notify background script about schedule changes
    chrome.runtime.sendMessage({
      action: 'scheduleUpdated',
      schedule: {
        enabled: scheduleEnabled,
        frequency: scheduleFrequency,
        urls: scheduleUrls,
        dataType: scheduleDataType,
        time: scheduleTime,
        dayOfWeek: scheduleDayOfWeek
      }
    });
  });
}

function exportSettings() {
  chrome.storage.sync.get(null, function(items) {
    const dataStr = JSON.stringify(items, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'myscraper_settings_' + new Date().toISOString().slice(0, 10) + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showStatus('Settings exported successfully', 'success');
  });
}

function importSettings() {
  const file = document.getElementById('settingsFile').files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const settings = JSON.parse(e.target.result);
      
      // Validate settings
      if (typeof settings !== 'object' || settings === null) {
        throw new Error('Invalid settings file');
      }
      
      // Save imported settings
      chrome.storage.sync.set(settings, function() {
        loadOptions();
        showStatus('Settings imported successfully', 'success');
        
        // Notify background script about settings changes
        if (settings.scheduleEnabled) {
          chrome.runtime.sendMessage({
            action: 'scheduleUpdated',
            schedule: {
              enabled: settings.scheduleEnabled,
              frequency: settings.scheduleFrequency,
              urls: settings.scheduleUrls,
              dataType: settings.scheduleDataType,
              time: settings.scheduleTime,
              dayOfWeek: settings.scheduleDayOfWeek
            }
          });
        }
      });
    } catch (error) {
      showStatus('Error importing settings: ' + error.message, 'error');
    }
  };
  reader.readAsText(file);
}

function updateFilenamePreview() {
  const pattern = document.getElementById('exportFilename').value;
  const format = document.getElementById('defaultExport').value;
  
  // Replace placeholders
  let filename = pattern
    .replace('{date}', new Date().toISOString().slice(0, 10))
    .replace('{time}', new Date().toISOString().slice(11, 19).replace(/:/g, '-'))
    .replace('{type}', 'products')
    .replace('{url}', 'example-com');
  
  // Add file extension
  if (!filename.endsWith(`.${format}`)) {
    filename += `.${format}`;
  }
  
  document.getElementById('filenamePreview').textContent = filename;
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}