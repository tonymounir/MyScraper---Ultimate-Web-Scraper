document.addEventListener('DOMContentLoaded', function() {
  // Initialize all DOM elements
  const elements = {
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Home tab elements
    emailCount: document.getElementById('emailCount'),
    phoneCount: document.getElementById('phoneCount'),
    businessCount: document.getElementById('businessCount'),
    productCount: document.getElementById('productCount'),
    autoDetectStatus: document.getElementById('autoDetectStatus'),
    dataTypes: document.getElementById('dataTypes'),
    autoExtract: document.getElementById('autoExtract'),
    
    // Extract tab elements
    extractList: document.getElementById('extractList'),
    extractEmails: document.getElementById('extractEmails'),
    extractPhones: document.getElementById('extractPhones'),
    extractImages: document.getElementById('extractImages'),
    extractLinks: document.getElementById('extractLinks'),
    extractBusiness: document.getElementById('extractBusiness'),
    extractJobs: document.getElementById('extractJobs'),
    extractSocial: document.getElementById('extractSocial'),
    extractReviews: document.getElementById('extractReviews'),
    clearHighlights: document.getElementById('clearHighlights'),
    startManualDetection: document.getElementById('startManualDetection'),
    manualDetectionResult: document.getElementById('manualDetectionResult'),
    customSelector: document.getElementById('customSelector'),
    extractWithSelector: document.getElementById('extractWithSelector'),
    manualSelection: document.getElementById('manualSelection'),
    
    // Bulk tab elements
    bulkUrls: document.getElementById('bulkUrls'),
    bulkDataType: document.getElementById('bulkDataType'),
    bulkScrape: document.getElementById('bulkScrape'),
    bulkProgress: document.getElementById('bulkProgress'),
    paginationOptions: document.getElementById('paginationOptions'),
    paginationPages: document.getElementById('paginationPages'),
    
    // Export tab elements
    previewAndExport: document.getElementById('previewAndExport'),
    exportEmailCount: document.getElementById('exportEmailCount'),
    exportPhoneCount: document.getElementById('exportPhoneCount'),
    exportBusinessCount: document.getElementById('exportBusinessCount'),
    exportProductCount: document.getElementById('exportProductCount'),
    
    // Common elements
    status: document.getElementById('status'),
    optionsLink: document.getElementById('optionsLink'),
    helpLink: document.getElementById('helpLink')
  };
  
  // Check if essential elements exist
  if (!elements.tabs || elements.tabs.length === 0) {
    console.error('Tab elements not found');
    return;
  }
  
  // Tab functionality
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Get tab ID and show corresponding content
      const tabId = tab.getAttribute('data-tab');
      const contentElement = document.getElementById(`${tabId}-tab`);
      if (contentElement) {
        contentElement.classList.add('active');
        
        // Update data summary when switching to export tab
        if (tabId === 'export') {
          updateExportDataSummary();
        }
        
        // Run auto-detection when switching to home tab
        if (tabId === 'home') {
          runAutoDetection();
        }
      }
    });
  });
  
  // Home tab functionality
  if (elements.autoExtract) {
    elements.autoExtract.addEventListener('click', () => {
      executeContentScript('autoExtract');
    });
  }
  
  if (elements.extractEmails) {
    elements.extractEmails.addEventListener('click', () => {
      executeContentScript('extractEmails');
    });
  }
  
  if (elements.extractPhones) {
    elements.extractPhones.addEventListener('click', () => {
      executeContentScript('extractPhones');
    });
  }
  
  if (elements.extractLinks) {
    elements.extractLinks.addEventListener('click', () => {
      executeContentScript('extractLinks');
    });
  }
  
  if (elements.extractProducts) {
    elements.extractProducts.addEventListener('click', () => {
      executeContentScript('extractCustom', { type: 'products' });
    });
  }
  
  // Extract tab functionality
  if (elements.extractList) {
    elements.extractList.addEventListener('click', () => {
      executeContentScript('extractList');
    });
  }
  
  if (elements.extractImages) {
    elements.extractImages.addEventListener('click', () => {
      executeContentScript('extractImages');
    });
  }
  
  if (elements.extractBusiness) {
    elements.extractBusiness.addEventListener('click', () => {
      executeContentScript('extractCustom', { type: 'business' });
    });
  }
  
  if (elements.extractJobs) {
    elements.extractJobs.addEventListener('click', () => {
      executeContentScript('extractCustom', { type: 'jobs' });
    });
  }
  
  if (elements.extractSocial) {
    elements.extractSocial.addEventListener('click', () => {
      executeContentScript('extractCustom', { type: 'social' });
    });
  }
  
  if (elements.extractReviews) {
    elements.extractReviews.addEventListener('click', () => {
      executeContentScript('extractCustom', { type: 'reviews' });
    });
  }
  
  // Manual selection button
  if (elements.manualSelection) {
    elements.manualSelection.addEventListener('click', () => {
      // Open the sidebar in the current tab
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ["sidebar.js"]
          }, () => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "openSidebar"});
          });
        }
      });
    });
  }
  
  // Highlight buttons event listeners
  const highlightButtons = document.querySelectorAll('.btn-highlight');
  highlightButtons.forEach(button => {
    button.addEventListener('click', () => {
      const type = button.getAttribute('data-type');
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'highlightElements',
            type: type,
            color: '#4285f4'
          });
        }
      });
    });
  });
  
  // Clear highlights button
  if (elements.clearHighlights) {
    elements.clearHighlights.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: () => {
              document.querySelectorAll('.myscraper-highlight').forEach(el => {
                el.classList.remove('myscraper-highlight');
              });
            }
          });
        }
      });
    });
  }
  
  // Start manual detection button
  if (elements.startManualDetection) {
    elements.startManualDetection.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'startManualDetection'});
        }
      });
    });
  }
  
  // Extract with custom selector button
  if (elements.extractWithSelector) {
    elements.extractWithSelector.addEventListener('click', () => {
      const selector = elements.customSelector.value.trim();
      if (selector) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs && tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'extractWithSelector',
              selector: selector
            });
          }
        });
      } else {
        showStatus('Please enter a CSS selector', 'error');
      }
    });
  }
  
  // Handle scraping mode change
  const scrapingModeRadios = document.querySelectorAll('input[name="scrapingMode"]');
  scrapingModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (elements.paginationOptions) {
        elements.paginationOptions.style.display = radio.value === 'pagination' ? 'block' : 'none';
      }
    });
  });
  
  // Bulk scraping
  if (elements.bulkScrape && elements.bulkUrls && elements.bulkDataType) {
    elements.bulkScrape.addEventListener('click', () => {
      const urls = elements.bulkUrls.value
        .split('\n')
        .map(url => url.trim())
        .filter(url => url !== '');
      
      if (urls.length === 0) {
        showStatus('Please enter at least one URL', 'error');
        return;
      }
      
      const dataType = elements.bulkDataType.value;
      const selectedMode = document.querySelector('input[name="scrapingMode"]:checked')?.value;
      const singlePage = selectedMode === 'single';
      const pagination = selectedMode === 'pagination' ? {
        enabled: true,
        pageCount: parseInt(elements.paginationPages?.value) || 5
      } : null;
      
      // Show progress bar
      if (elements.bulkProgress) {
        elements.bulkProgress.style.width = '0%';
      }
      
      chrome.runtime.sendMessage({
        action: 'bulkScrape',
        urls: urls,
        dataType: dataType,
        pagination: pagination,
        singlePage: singlePage
      });
      
      const modeText = singlePage ? 'single page' : `${pagination?.pageCount} pages`;
      showStatus(`Starting bulk scraping for ${urls.length} URLs (${modeText})...`, 'success');
    });
  }
  
  // Export data
  if (elements.exportData && elements.exportFormat) {
    elements.exportData.addEventListener('click', () => {
      const format = elements.exportFormat.value;
      chrome.runtime.sendMessage({
        action: 'exportData',
        format: format
      });
    });
  }
  
  // Options and help links
  if (elements.optionsLink) {
    elements.optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
  
  if (elements.helpLink) {
    elements.helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({url: 'https://example.com/myscraper-help'});
    });
  }
  
  // Load data summary
  updateDataSummary();
  
  // Run auto-detection on popup open
  runAutoDetection();
  
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'dataUpdated') {
      updateDataSummary();
    } else if (message.action === 'bulkProgress') {
      updateBulkProgress(message.completed, message.total);
    } else if (message.action === 'bulkComplete') {
      showStatus(`Bulk scraping completed! Extracted data from ${message.count} URLs.`, 'success');
      // Reset progress bar
      if (elements.bulkProgress) {
        setTimeout(() => {
          elements.bulkProgress.style.width = '0%';
        }, 2000);
      }
    } else if (message.action === 'autoDetectResult') {
      displayAutoDetectionResult(message.data);
    } else if (message.action === 'manualDetectionResult') {
      if (elements.manualDetectionResult) {
        elements.manualDetectionResult.style.display = 'block';
        if (elements.customSelector) {
          elements.customSelector.value = message.selector;
        }
      }
    }
  });
});

// Run auto-detection on the current page
function runAutoDetection() {
  const detectStatus = document.getElementById('autoDetectStatus');
  const dataTypes = document.getElementById('dataTypes');
  const autoExtract = document.getElementById('autoExtract');
  
  // Check if elements exist
  if (!detectStatus || !dataTypes || !autoExtract) {
    console.error('Auto-detection elements not found');
    return;
  }
  
  // Reset UI
  detectStatus.style.display = 'flex';
  dataTypes.innerHTML = '';
  autoExtract.style.display = 'none';
  
  // Execute detection script
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
      // Send message to content script to run detection
      chrome.tabs.sendMessage(tabs[0].id, {action: 'autoDetect'}, (response) => {
        if (response && response.result) {
          displayAutoDetectionResult(response.result);
          } else {
          // Fallback: try to inject and run the detection function
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }, () => {
            // Now that content.js is injected, send the message
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, {action: 'autoDetect'}, (response) => {
                if (response && response.result) {
                  displayAutoDetectionResult(response.result);
                }
              });
            }, 100);
          });
        }
      });
    }
  });
}

// Display auto-detection results
function displayAutoDetectionResult(data) {
  const detectStatus = document.getElementById('autoDetectStatus');
  const dataTypes = document.getElementById('dataTypes');
  const autoExtract = document.getElementById('autoExtract');
  
  // Check if elements exist
  if (!detectStatus || !dataTypes || !autoExtract) {
    console.error('Auto-detection display elements not found');
    return;
  }
  
  // Hide loading indicator
  detectStatus.style.display = 'none';
  
  // Display detected data types
  let hasData = false;
  
  if (data.emails && data.emails.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-envelope"></i> Emails <span class="count">${data.emails.count}</span></div>`;
    hasData = true;
  }
  
  if (data.phones && data.phones.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-phone"></i> Phones <span class="count">${data.phones.count}</span></div>`;
    hasData = true;
  }
  
  if (data.business && data.business.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-building"></i> Businesses <span class="count">${data.business.count}</span></div>`;
    hasData = true;
  }
  
  if (data.products && data.products.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-shopping-cart"></i> Products <span class="count">${data.products.count}</span></div>`;
    hasData = true;
  }
  
  if (data.images && data.images.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-image"></i> Images <span class="count">${data.images.count}</span></div>`;
    hasData = true;
  }
  
  if (data.links && data.links.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-link"></i> Links <span class="count">${data.links.count}</span></div>`;
    hasData = true;
  }
  
  if (data.lists && data.lists.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-list"></i> Lists/Tables <span class="count">${data.lists.count}</span></div>`;
    hasData = true;
  }
  
  if (data.jobs && data.jobs.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-briefcase"></i> Jobs <span class="count">${data.jobs.count}</span></div>`;
    hasData = true;
  }
  
  if (data.social && data.social.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-share-alt"></i> Social Media <span class="count">${data.social.count}</span></div>`;
    hasData = true;
  }
  
  if (data.reviews && data.reviews.count > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-star"></i> Reviews <span class="count">${data.reviews.count}</span></div>`;
    hasData = true;
  }
  
  if (data.pagination && data.pagination.length > 0) {
    dataTypes.innerHTML += `<div class="data-type"><i class="fas fa-forward"></i> Pagination <span class="count">${data.pagination.length}</span></div>`;
    hasData = true;
  }
  
  // Show auto-extract button if data was detected
  if (hasData) {
    autoExtract.style.display = 'block';
  } else {
    dataTypes.innerHTML = '<div class="data-type"><i class="fas fa-info-circle"></i> No data detected</div>';
  }
}

function executeContentScript(action, params = {}) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: executeContentScriptFunction,
        args: [action, params]
      });
    } else {
      showStatus('No active tab found', 'error');
    }
  });
}

function executeContentScriptFunction(action, params) {
  window.postMessage({
    type: 'myscraper_action',
    action: action,
    params: params
  }, '*');
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

function updateDataSummary() {
  chrome.storage.local.get(['scrapedData'], (result) => {
    const data = result.scrapedData || {};
    const emailCount = document.getElementById('emailCount');
    const phoneCount = document.getElementById('phoneCount');
    const businessCount = document.getElementById('businessCount');
    const productCount = document.getElementById('productCount');
    
    if (emailCount) emailCount.textContent = data.emails?.length || 0;
    if (phoneCount) phoneCount.textContent = data.phones?.length || 0;
    if (businessCount) businessCount.textContent = data.business?.length || 0;
    if (productCount) productCount.textContent = data.products?.length || 0;
  });
}

function updateExportDataSummary() {
  chrome.storage.local.get(['scrapedData'], (result) => {
    const data = result.scrapedData || {};
    const exportEmailCount = document.getElementById('exportEmailCount');
    const exportPhoneCount = document.getElementById('exportPhoneCount');
    const exportBusinessCount = document.getElementById('exportBusinessCount');
    const exportProductCount = document.getElementById('exportProductCount');
    
    if (exportEmailCount) exportEmailCount.textContent = data.emails?.length || 0;
    if (exportPhoneCount) exportPhoneCount.textContent = data.phones?.length || 0;
    if (exportBusinessCount) exportBusinessCount.textContent = data.business?.length || 0;
    if (exportProductCount) exportProductCount.textContent = data.products?.length || 0;
  });
}

function updateBulkProgress(completed, total) {
  const bulkProgress = document.getElementById('bulkProgress');
  if (bulkProgress) {
    const percentage = Math.round((completed / total) * 100);
    bulkProgress.style.width = `${percentage}%`;
  }
}