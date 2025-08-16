// MyScraper Content Script

if (window.myScraperContentLoaded) {
  // Script already injected, do not execute again.
} else {
  window.myScraperContentLoaded = true;

  // Listen for messages from popup and sidebar
  window.addEventListener('message', (event) => {
  if (event.source !== window || event.data.type !== 'myscraper_action') return;

  const { action, params } = event.data;

  switch (action) {
    case 'extractList':
      extractList();
      break;
    case 'extractEmails':
      extractEmails();
      break;
    case 'extractPhones':
      extractPhones();
      break;
    case 'extractImages':
      extractImages();
      break;
    case 'extractLinks':
      extractLinks();
      break;
    case 'extractCustom':
      extractCustomData(params.type);
      break;
    case 'autoExtract':
      autoExtractAll();
      break;
  }
});

// Listen for messages from the extension popup (via chrome.runtime.sendMessage)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autoDetect') {
    const result = detectDataTypes();
    sendResponse({ result: result });
  } else if (message.action === 'highlightElements') {
    const { type, color } = message;
    const result = detectDataTypes();

    if (result[type] && result[type].elements.length > 0) {
      highlightElements(result[type].elements, color);
    }
  } else if (message.action === 'startManualDetection') {
    startManualDetection();
  } else if (message.action === 'extractWithSelector') {
    extractWithSelector(message.selector);
  } else if (message.action === 'startSelectionMode') {
    startSelectionMode();
  } else if (message.action === 'stopSelectionMode') {
    stopSelectionMode();
  } else if (message.action === 'startExclusionMode') {
    startExclusionMode();
  } else if (message.action === 'stopExclusionMode') {
    stopExclusionMode();
  } else if (message.action === 'clearHighlights') {
    clearHighlights();
  } else if (message.action === 'clearExclusionHighlights') {
    clearExclusionHighlights();
  } else if (message.action === 'extractSelectedData') {
    extractSelectedData(message.selectedElements, message.excludedElements, message.extractType);
  } else if (message.action === 'closeSidebar') {
    closeSidebar();
  }
  return true;
});

// Variables for manual selection mode
let selectionMode = false;
let exclusionMode = false;
let selectedElements = [];
let excludedElements = [];

// Start selection mode
function startSelectionMode() {
  selectionMode = true;
  exclusionMode = false;

  // Add event listeners for mouseover and click
  document.addEventListener('mouseover', handleSelectionMouseOver);
  document.addEventListener('click', handleSelectionClick);

  showNotification('Selection mode enabled. Click on elements to select them.');
}

// Stop selection mode
function stopSelectionMode() {
  selectionMode = false;

  // Remove event listeners
  document.removeEventListener('mouseover', handleSelectionMouseOver);
  document.removeEventListener('click', handleSelectionClick);

  showNotification('Selection mode disabled.');
}

// Start exclusion mode
function startExclusionMode() {
  exclusionMode = true;
  selectionMode = false;

  // Add event listeners for mouseover and click
  document.addEventListener('mouseover', handleExclusionMouseOver);
  document.addEventListener('click', handleExclusionClick);

  showNotification('Exclusion mode enabled. Click on elements to exclude them.');
}

// Stop exclusion mode
function stopExclusionMode() {
  exclusionMode = false;

  // Remove event listeners
  document.removeEventListener('mouseover', handleExclusionMouseOver);
  document.removeEventListener('click', handleExclusionClick);

  showNotification('Exclusion mode disabled.');
}

// Handle mouse over during selection mode
function handleSelectionMouseOver(e) {
  if (!selectionMode) return;

  // Highlight the element under the mouse
  const element = e.target;
  highlightElements([element], '#4285f4');
}

// Handle click during selection mode
function handleSelectionClick(e) {
  if (!selectionMode) return;

  e.preventDefault();
  e.stopPropagation();

  const element = e.target;
  const selector = generateSelector(element);

  // Check if element is already selected
  const existingIndex = selectedElements.findIndex(el => el.selector === selector);

  if (existingIndex === -1) {
    // Add to selected elements
    selectedElements.push({
      element: element,
      selector: selector,
      text: element.textContent.trim()
    });

    // Highlight element
    highlightElements([element], '#4285f4');

    // Send message to sidebar
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      element: {
        text: element.textContent.trim(),
        tagName: element.tagName,
        className: element.className
      },
      selector: selector
    });
  } else {
    // Remove from selected elements
    selectedElements.splice(existingIndex, 1);

    // Remove highlight
    element.classList.remove('myscraper-selection-highlight');

    // Send message to sidebar to update
    chrome.runtime.sendMessage({
      action: 'elementDeselected',
      selector: selector
    });
  }
}

// Handle mouse over during exclusion mode
function handleExclusionMouseOver(e) {
  if (!exclusionMode) return;

  // Highlight the element under the mouse
  const element = e.target;
  highlightElements([element], '#ea4335');
}

// Handle click during exclusion mode
function handleExclusionClick(e) {
  if (!exclusionMode) return;

  e.preventDefault();
  e.stopPropagation();

  const element = e.target;
  const selector = generateSelector(element);

  // Check if element is already excluded
  const existingIndex = excludedElements.findIndex(el => el.selector === selector);

  if (existingIndex === -1) {
    // Add to excluded elements
    excludedElements.push({
      element: element,
      selector: selector,
      text: element.textContent.trim()
    });

    // Highlight element
    highlightElements([element], '#ea4335');

    // Send message to sidebar
    chrome.runtime.sendMessage({
      action: 'elementExcluded',
      element: {
        text: element.textContent.trim(),
        tagName: element.tagName,
        className: element.className
      },
      selector: selector
    });
  } else {
    // Remove from excluded elements
    excludedElements.splice(existingIndex, 1);

    // Remove highlight
    element.classList.remove('myscraper-exclusion-highlight');

    // Send message to sidebar to update
    chrome.runtime.sendMessage({
      action: 'elementUnexcluded',
      selector: selector
    });
  }
}

// Extract data from selected elements
function extractSelectedData(selectedElements, excludedElements, extractType) {
  // Get the actual elements from the DOM
  const elementsToExtract = [];

  selectedElements.forEach(sel => {
    const element = document.querySelector(sel.selector);
    if (element) {
      elementsToExtract.push(element);
    }
  });

  // Filter out excluded elements
  const filteredElements = elementsToExtract.filter(element => {
    const selector = generateSelector(element);
    return !excludedElements.some(ex => ex.selector === selector);
  });

  let extractedData = [];

  switch (extractType) {
    case 'text':
      extractedData = filteredElements.map(element => ({
        text: element.textContent.trim(),
        selector: generateSelector(element)
      }));
      break;

    case 'links':
      extractedData = filteredElements
        .filter(element => element.tagName === 'A')
        .map(element => ({
          href: element.href,
          text: element.textContent.trim(),
          selector: generateSelector(element)
        }));
      break;

    case 'images':
      extractedData = filteredElements
        .filter(element => element.tagName === 'IMG')
        .map(element => ({
          src: element.src,
          alt: element.alt || '',
          selector: generateSelector(element)
        }));
      break;

    case 'products':
      extractedData = filteredElements.map(element => extractProductInfo(element));
      break;

    case 'custom':
      extractedData = filteredElements.map(element => ({
        text: element.textContent.trim(),
        html: element.outerHTML,
        selector: generateSelector(element)
      }));
      break;
  }

  // Send extracted data to sidebar
  chrome.runtime.sendMessage({
    action: 'extractedData',
    data: extractedData,
    type: extractType
  });

  showNotification(`Extracted ${extractedData.length} items`);
}

// Extract product information from an element
function extractProductInfo(element) {
  // Try to find product information within the element
  const product = {
    name: '',
    price: '',
    image: '',
    url: '',
    description: '',
    selector: generateSelector(element)
  };

  // Try to find product name
  const nameSelectors = [
    'h1', 'h2', 'h3', '.title', '.name', '.product-title',
    '[itemprop="name"]', '.product-name'
  ];

  for (const selector of nameSelectors) {
    const nameElement = element.querySelector(selector);
    if (nameElement && nameElement.textContent.trim()) {
      product.name = nameElement.textContent.trim();
      break;
    }
  }

  // If no name found in children, use element's own text
  if (!product.name && element.textContent.trim()) {
    product.name = element.textContent.trim();
  }

  // Try to find product price
  const priceSelectors = [
    '.price', '.cost', '.product-price', '[itemprop="price"]',
    '.current-price', '.sale-price'
  ];

  for (const selector of priceSelectors) {
    const priceElement = element.querySelector(selector);
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      const priceMatch = priceText.match(/[\d,.]+/);
      if (priceMatch) {
        product.price = priceMatch[0];
        break;
      }
    }
  }

  // Try to find product image
  const imageSelectors = [
    'img', '.product-image', '[itemprop="image"]', '.main-image'
  ];

  for (const selector of imageSelectors) {
    const imageElement = element.querySelector(selector);
    if (imageElement && imageElement.src) {
      product.image = imageElement.src;
      break;
    }
  }

  // Try to find product URL
  const linkSelectors = [
    'a', '.product-link', '[itemprop="url"]'
  ];

  for (const selector of linkSelectors) {
    const linkElement = element.querySelector(selector);
    if (linkElement && linkElement.href) {
      product.url = linkElement.href;
      break;
    }
  }

  // Try to find product description
  const descSelectors = [
    '.description', '.desc', '[itemprop="description"]',
    '.product-description', '.details'
  ];

  for (const selector of descSelectors) {
    const descElement = element.querySelector(selector);
    if (descElement && descElement.textContent.trim()) {
      product.description = descElement.textContent.trim();
      break;
    }
  }

  return product;
}

// Clear all selection highlights
function clearHighlights() {
  document.querySelectorAll('.myscraper-selection-highlight').forEach(el => {
    el.classList.remove('myscraper-selection-highlight');
  });
}

// Clear all exclusion highlights
function clearExclusionHighlights() {
  document.querySelectorAll('.myscraper-exclusion-highlight').forEach(el => {
    el.classList.remove('myscraper-exclusion-highlight');
  });
}

// Close sidebar and clean up
function closeSidebar() {
  // Stop all modes
  stopSelectionMode();
  stopExclusionMode();

  // Clear all highlights
  clearHighlights();
  clearExclusionHighlights();

  // Clear selections
  selectedElements = [];
  excludedElements = [];

  showNotification('Sidebar closed');
}

// Highlight detected elements on the page
function highlightElements(elements, color = '#4285f4') {
  // Add highlight style if not exists
  if (!document.getElementById('myscraper-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'myscraper-highlight-style';
    style.innerHTML = `
      .myscraper-selection-highlight {
        outline: 2px solid #4285f4 !important;
        outline-offset: -2px !important;
        background-color: rgba(66, 133, 244, 0.1) !important;
        transition: all 0.3s ease !important;
      }
      .myscraper-exclusion-highlight {
        outline: 2px solid #ea4335 !important;
        outline-offset: -2px !important;
        background-color: rgba(234, 67, 53, 0.1) !important;
        transition: all 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Highlight each element
  elements.forEach(element => {
    // Remove existing highlight classes
    element.classList.remove('myscraper-selection-highlight', 'myscraper-exclusion-highlight');

    // Add appropriate highlight class
    if (color === '#4285f4') {
      element.classList.add('myscraper-selection-highlight');
    } else if (color === '#ea4335') {
      element.classList.add('myscraper-exclusion-highlight');
    }
  });
}

// Generate CSS selector for an element
function generateSelector(element) {
  if (element.id) {
    return '#' + element.id;
  }

  const path = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      selector += '.' + current.className.trim().split(/\s+/).join('.');
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Show notification to user
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#4285f4';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999';
  notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// Detect pagination elements
function detectPagination() {
  const paginationSelectors = [
    '.pagination a',
    '.pager a',
    '.page-numbers a',
    '.pagination li a',
    '[class*="pagination"] a',
    '[aria-label*="pagination"] a',
    '[role="navigation"] a',
    '.next-page',
    '.prev-page',
    '[class*="page"] a'
  ];

  let paginationElements = [];

  paginationSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      paginationElements = paginationElements.concat(Array.from(elements));
    }
  });

  // Remove duplicates
  paginationElements = [...new Set(paginationElements)];

  return paginationElements;
}

// Start manual element detection
function startManualDetection() {
  // Remove existing event listeners
  document.removeEventListener('mouseover', handleManualMouseOver);
  document.removeEventListener('click', handleManualMouseClick);

  // Add new event listeners
  document.addEventListener('mouseover', handleManualMouseOver);
  document.addEventListener('click', handleManualMouseClick);

  // Show notification
  showNotification('Hover over an element and click to select it');
}

// Handle mouse over during manual detection
function handleManualMouseOver(e) {
  // Highlight the element under the mouse
  const element = e.target;
  highlightElements([element], '#ff5722');

  // Show tooltip with selector
  showSelectorTooltip(element);
}

// Handle click during manual detection
function handleManualMouseClick(e) {
  e.preventDefault();
  e.stopPropagation();

  const element = e.target;
  const selector = generateSelector(element);

  // Remove event listeners
  document.removeEventListener('mouseover', handleManualMouseOver);
  document.removeEventListener('click', handleManualMouseClick);

  // Remove tooltip
  removeSelectorTooltip();

  // Send selector back to popup
  chrome.runtime.sendMessage({
    action: 'manualDetectionResult',
    selector: selector
  });

  // Keep element highlighted
  highlightElements([element], '#4caf50');

  showNotification(`Selected element with selector: ${selector}`);
}

// Show tooltip with element selector
function showSelectorTooltip(element) {
  removeSelectorTooltip();

  const tooltip = document.createElement('div');
  tooltip.id = 'myscraper-tooltip';
  tooltip.style.position = 'fixed';
  tooltip.style.bottom = '20px';
  tooltip.style.left = '20px';
  tooltip.style.backgroundColor = '#333';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '10px';
  tooltip.style.borderRadius = '5px';
  tooltip.style.zIndex = '10000';
  tooltip.style.maxWidth = '300px';
  tooltip.style.wordBreak = 'break-all';
  tooltip.style.fontSize = '12px';

  const selector = generateSelector(element);
  tooltip.textContent = selector;

  document.body.appendChild(tooltip);
}

// Remove selector tooltip
function removeSelectorTooltip() {
  const tooltip = document.getElementById('myscraper-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// Auto-detect data types on the page
function detectDataTypes() {
  const result = {
    emails: { count: 0, elements: [] },
    phones: { count: 0, elements: [] },
    business: { count: 0, elements: [] },
    products: { count: 0, elements: [] },
    images: { count: 0, elements: [] },
    links: { count: 0, elements: [] },
    lists: { count: 0, elements: [] },
    jobs: { count: 0, elements: [] },
    social: { count: 0, elements: [] },
    reviews: { count: 0, elements: [] },
    pagination: []
  };

  // Detect emails
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
  const emails = document.body.innerText.match(emailRegex);
  result.emails.count = emails ? emails.length : 0;

  // Detect phones
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
  result.phones.count = [...new Set(phones)].length;

  // Detect business data
  const businessSelectors = [
    '.business', '.company', '.organization', '.local-business',
    '[itemtype*="Business"]', '[itemtype*="Organization"]'
  ];
  businessSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      result.business.count += elements.length;
      result.business.elements = result.business.elements.concat(Array.from(elements));
    }
  });

  // Detect product data
  const productSelectors = [
    '[data-component-type="s-search-result"]',
    '#dp-container',
    '.s-item',
    '.product', '.product-card', '.product-item',
    '[data-testid="product-card"]',
    '[itemtype*="Product"]'
  ];
  productSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      result.products.count += elements.length;
      result.products.elements = result.products.elements.concat(Array.from(elements));
    }
  });

  // Detect images
  const imageElements = document.querySelectorAll('img');
  result.images.count = imageElements.length;
  result.images.elements = Array.from(imageElements);

  // Detect links
  const linkElements = document.querySelectorAll('a[href]');
  result.links.count = linkElements.length;
  result.links.elements = Array.from(linkElements);

  // Detect lists and tables
  const listElements = document.querySelectorAll('ul, ol, table');
  result.lists.count = listElements.length;
  result.lists.elements = Array.from(listElements);

  // Detect job postings
  const jobSelectors = [
    '.job', '.job-posting', '.career', '.position',
    '[itemtype*="JobPosting"]'
  ];
  jobSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      result.jobs.count += elements.length;
      result.jobs.elements = result.jobs.elements.concat(Array.from(elements));
    }
  });

  // Detect social media profiles
  const socialSelectors = [
    'a[href*="facebook.com"]',
    'a[href*="twitter.com"]',
    'a[href*="linkedin.com"]',
    'a[href*="instagram.com"]',
    'a[href*="youtube.com"]',
    'a[href*="pinterest.com"]',
    'a[href*="tiktok.com"]'
  ];
  socialSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      result.social.count += elements.length;
      result.social.elements = result.social.elements.concat(Array.from(elements));
    }
  });

  // Detect reviews and comments
  const reviewSelectors = [
    '.review', '.comment', '.testimonial',
    '[itemtype*="Review"]', '[itemtype*="Comment"]'
  ];
  reviewSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      result.reviews.count += elements.length;
      result.reviews.elements = result.reviews.elements.concat(Array.from(elements));
    }
  });

  // Detect pagination
  result.pagination = detectPagination();

  return result;
}

// Auto-extract all detected data types
function autoExtractAll() {
  // Extract basic data types
  extractEmails();
  extractPhones();
  extractImages();
  extractLinks();
  extractList();

  // Extract custom data types
  extractCustomData('business');
  extractCustomData('products');
  extractCustomData('jobs');
  extractCustomData('social');
  extractCustomData('reviews');

  showNotification('Auto-extracting all detected data types...');
}

// Store extracted data in chrome storage
function storeData(key, data) {
  chrome.storage.local.get(['scrapedData'], (result) => {
    const scrapedData = result.scrapedData || {};

    if (!scrapedData[key]) {
      scrapedData[key] = [];
    }

    // Add new data and remove duplicates
    if (Array.isArray(data)) {
      scrapedData[key] = [...new Set([...scrapedData[key], ...data])];
    } else {
      scrapedData[key] = [...new Set([...scrapedData[key], data])];
    }

    chrome.storage.local.set({ scrapedData }, () => {
      // Notify background that data was updated
      chrome.runtime.sendMessage({ action: 'dataUpdated' });
    });
  });
}

// Extract lists and tables
function extractList() {
  const lists = [];

  // Extract tables
  document.querySelectorAll('table').forEach(table => {
    const headers = Array.from(table.querySelectorAll('thead th, tr:first-child td')).map(th => th.innerText.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr, tr:not(:first-child)'));

    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length > 0) {
        const rowData = {};
        headers.forEach((header, i) => {
          rowData[header] = cells[i]?.innerText.trim() || '';
        });
        lists.push(rowData);
      }
    });
  });

  // Extract lists (ul, ol)
  document.querySelectorAll('ul, ol').forEach(list => {
    const items = Array.from(list.querySelectorAll('li')).map(li => li.innerText.trim());
    if (items.length > 0) {
      lists.push({ items: items });
    }
  });

  storeData('lists', lists);
  showNotification(`Extracted ${lists.length} lists/tables`);
}

// Extract email addresses
function extractEmails() {
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
  const text = document.body.innerText;
  const emails = text.match(emailRegex) || [];

  storeData('emails', emails);
  showNotification(`Extracted ${emails.length} email addresses`);
}

// Extract phone numbers
function extractPhones() {
  // Common phone number patterns
  const phoneRegexes = [
    /\+\d{1,3}\s?\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g,  // +1 (123) 456-7890
    /\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g,              // (123) 456-7890
    /\d{3}[-\s]?\d{3}[-\s]?\d{4}/g,               // 123-456-7890
    /\+\d{1,3}\s?\d{3}[-\s]?\d{3}[-\s]?\d{4}/g    // +1 123-456-7890
  ];

  const text = document.body.innerText;
  const phones = [];

  phoneRegexes.forEach(regex => {
    const matches = text.match(regex) || [];
    phones.push(...matches);
  });

  // Remove duplicates
  const uniquePhones = [...new Set(phones)];

  storeData('phones', uniquePhones);
  showNotification(`Extracted ${uniquePhones.length} phone numbers`);
}

// Extract images
function extractImages() {
  const images = Array.from(document.querySelectorAll('img')).map(img => ({
    src: img.src,
    alt: img.alt || '',
    width: img.naturalWidth,
    height: img.naturalHeight
  }));

  storeData('images', images);
  showNotification(`Extracted ${images.length} images`);
}

// Extract links
function extractLinks() {
  const links = Array.from(document.querySelectorAll('a[href]')).map(link => ({
    href: link.href,
    text: link.innerText.trim(),
    title: link.title || ''
  }));

  storeData('links', links);
  showNotification(`Extracted ${links.length} links`);
}

// Extract custom data based on type
function extractCustomData(type) {
  let data = [];

  switch (type) {
    case 'business':
      data = extractBusinessData();
      break;
    case 'jobs':
      data = extractJobData();
      break;
    case 'social':
      data = extractSocialData();
      break;
    case 'reviews':
      data = extractReviewData();
      break;
    case 'products':
      data = extractProductData();
      break;
  }

  storeData(type, data);
  showNotification(`Extracted ${data.length} ${type} entries`);
}

// Extract business details
function extractBusinessData() {
  const businesses = [];

  // Common business selectors
  const businessSelectors = [
    '.business', '.company', '.organization', '.local-business',
    '[itemtype*="Business"]', '[itemtype*="Organization"]'
  ];

  businessSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const business = {
        name: el.querySelector('h1, h2, h3, .name, .business-name')?.innerText.trim() || '',
        address: el.querySelector('.address, .location, [itemprop="address"]')?.innerText.trim() || '',
        phone: el.querySelector('.phone, [itemprop="telephone"]')?.innerText.trim() || '',
        website: el.querySelector('.website, a[href^="http"]')?.href || '',
        email: el.querySelector('.email, [itemprop="email"]')?.innerText.trim() || ''
      };

      if (business.name || business.address) {
        businesses.push(business);
      }
    });
  });

  return businesses;
}

// Extract job postings
function extractJobData() {
  const jobs = [];

  // Common job selectors
  const jobSelectors = [
    '.job', '.job-posting', '.career', '.position',
    '[itemtype*="JobPosting"]'
  ];

  jobSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const job = {
        title: el.querySelector('h1, h2, h3, .title, .job-title')?.innerText.trim() || '',
        company: el.querySelector('.company, .employer, [itemprop="hiringOrganization"]')?.innerText.trim() || '',
        location: el.querySelector('.location, [itemprop="jobLocation"]')?.innerText.trim() || '',
        description: el.querySelector('.description, [itemprop="description"]')?.innerText.trim() || '',
        datePosted: el.querySelector('.date, [itemprop="datePosted"]')?.innerText.trim() || ''
      };

      if (job.title) {
        jobs.push(job);
      }
    });
  });

  return jobs;
}

// Extract social media profiles
function extractSocialData() {
  const socialProfiles = [];

  // Common social media selectors
  const socialSelectors = [
    'a[href*="facebook.com"]',
    'a[href*="twitter.com"]',
    'a[href*="linkedin.com"]',
    'a[href*="instagram.com"]',
    'a[href*="youtube.com"]',
    'a[href*="pinterest.com"]',
    'a[href*="tiktok.com"]'
  ];

  socialSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const profile = {
        platform: getPlatformFromUrl(el.href),
        url: el.href,
        username: getUsernameFromUrl(el.href),
        text: el.innerText.trim()
      };

      socialProfiles.push(profile);
    });
  });

  return socialProfiles;
}

// Extract reviews and comments
function extractReviewData() {
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

// Extract product details from e-commerce sites
function extractProductData() {
  const products = [];

  // Common product selectors for different e-commerce sites
  const productSelectors = [
    // Amazon
    '[data-component-type="s-search-result"]',
    '#dp-container',
    '#productDetails',
    '#productDescription',

    // eBay
    '.s-item',
    '.x-item-title',
    '.u-flL',

    // General e-commerce
    '.product',
    '.product-card',
    '.product-item',
    '.item',
    '[data-testid="product-card"]',
    '.product-tile',
    '.product-wrapper',

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

  // If no specific containers found, try to find products by common patterns
  if (productContainers.length === 0) {
    // Look for elements with product-related IDs or classes
    const allElements = document.querySelectorAll('*[id*="product"], *[class*="product"]');
    productContainers = Array.from(allElements);
  }

  // Extract data from each product container
  productContainers.forEach(container => {
    const product = {
      name: extractProductName(container),
      price: extractProductPrice(container),
      image: extractProductImage(container),
      description: extractProductDescription(container),
      rating: extractProductRating(container),
      availability: extractProductAvailability(container),
      url: extractProductURL(container),
      brand: extractProductBrand(container),
      specifications: extractProductSpecifications(container)
    };

    // Only add if we have at least a name or price
    if (product.name || product.price) {
      products.push(product);
    }
  });

  // If we didn't find any products in containers, try to extract from the whole page
  if (products.length === 0) {
    const product = {
      name: extractProductName(document),
      price: extractProductPrice(document),
      image: extractProductImage(document),
      description: extractProductDescription(document),
      rating: extractProductRating(document),
      availability: extractProductAvailability(document),
      url: extractProductURL(document),
      brand: extractProductBrand(document),
      specifications: extractProductSpecifications(document)
    };

    if (product.name || product.price) {
      products.push(product);
    }
  }

  return products;
}

// Helper functions to extract specific product information
function extractProductName(container) {
  // Try multiple selectors for product name
  const nameSelectors = [
    'h1',
    '.product-title',
    '.product-name',
    '.item-title',
    '.title',
    '[itemprop="name"]',
    '.product__title',
    '#productTitle'
  ];

  for (const selector of nameSelectors) {
    const element = container.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim();
    }
  }

  // Look for elements with title in their ID or class
  const titleElements = container.querySelectorAll('*[id*="title"], *[class*="title"]');
  for (const element of titleElements) {
    if (element.innerText.trim() && element.innerText.length < 200) {
      return element.innerText.trim();
    }
  }

  return '';
}

function extractProductPrice(container) {
  // Try multiple selectors for price
  const priceSelectors = [
    '.price',
    '.product-price',
    '.item-price',
    '.current-price',
    '.sale-price',
    '[itemprop="price"]',
    '.a-price .a-offscreen',
    '.a-price-whole',
    '.s-item__price',
    '.price__value',
    '#priceblock_dealprice',
    '#priceblock_ourprice'
  ];

  for (const selector of priceSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      const priceText = element.innerText.trim();
      // Extract price using regex
      const priceMatch = priceText.match(/[\d,.]+/);
      if (priceMatch) {
        return priceMatch[0];
      }
    }
  }

  // Look for price patterns in the text
  const text = container.innerText;
  const pricePatterns = [
    /\$[\d,.]+/g,
    /[\d,.]+\s*USD/g,
    /[\d,.]+\s*€/g,
    /[\d,.]+\s*£/g,
    /price:\s*[\d,.]+/gi
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/[^\d,.]/g, '');
    }
  }

  return '';
}

function extractProductImage(container) {
  // Try multiple selectors for product image
  const imageSelectors = [
    '.product-image',
    '.item-image',
    '.main-image',
    '[itemprop="image"]',
    '#landingImage',
    '.s-item__image-img',
    '.product__image',
    'img[src*="product"]'
  ];

  for (const selector of imageSelectors) {
    const element = container.querySelector(selector);
    if (element && element.src) {
      return element.src;
    }
  }

  // Look for the largest image in the container
  const images = container.querySelectorAll('img');
  let largestImage = null;
  let largestSize = 0;

  images.forEach(img => {
    if (img.src && img.naturalWidth * img.naturalHeight > largestSize) {
      largestSize = img.naturalWidth * img.naturalHeight;
      largestImage = img;
    }
  });

  return largestImage ? largestImage.src : '';
}

function extractProductDescription(container) {
  // Try multiple selectors for product description
  const descriptionSelectors = [
    '.product-description',
    '.item-description',
    '.description',
    '[itemprop="description"]',
    '#productDescription',
    '.feature-bullets',
    '.product__description',
    '#feature-bullets ul'
  ];

  for (const selector of descriptionSelectors) {
    const element = container.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim();
    }
  }

  // Look for elements with description in their ID or class
  const descElements = container.querySelectorAll('*[id*="description"], *[class*="description"]');
  for (const element of descElements) {
    if (element.innerText.trim()) {
      return element.innerText.trim();
    }
  }

  return '';
}

function extractProductRating(container) {
  // Try multiple selectors for product rating
  const ratingSelectors = [
    '.rating',
    '.product-rating',
    '.item-rating',
    '[itemprop="ratingValue"]',
    '.a-icon-alt',
    '.s-item__reviews',
    '.review-count',
    '.rating__value'
  ];

  for (const selector of ratingSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      const ratingText = element.innerText.trim() || element.getAttribute('alt') || '';
      // Extract rating using regex
      const ratingMatch = ratingText.match(/[\d.]+/);
      if (ratingMatch) {
        return ratingMatch[0];
      }
    }
  }

  // Look for rating patterns in the text
  const text = container.innerText;
  const ratingPatterns = [
    /rating:\s*[\d.]+/gi,
    /[\d.]+\s*stars?/gi,
    /[\d.]+\/\d+/g
  ];

  for (const pattern of ratingPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/[^\d.]/g, '');
    }
  }

  return '';
}

function extractProductAvailability(container) {
  // Try multiple selectors for product availability
  const availabilitySelectors = [
    '.availability',
    '.stock',
    '.item-availability',
    '[itemprop="availability"]',
    '#availability',
    '.a-color-success',
    '.stock-status'
  ];

  for (const selector of availabilitySelectors) {
    const element = container.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim();
    }
  }

  // Look for availability keywords in the text
  const text = container.innerText.toLowerCase();
  if (text.includes('in stock') || text.includes('available')) {
    return 'In Stock';
  } else if (text.includes('out of stock') || text.includes('unavailable')) {
    return 'Out of Stock';
  } else if (text.includes('backorder') || text.includes('pre-order')) {
    return 'Backorder';
  }

  return '';
}

function extractProductURL(container) {
  // Try to find product link
  const linkSelectors = [
    'a[href*="product"]',
    'a[href*="item"]',
    'a[href*="dp/"]',
    '.product-link',
    '.item-link'
  ];

  for (const selector of linkSelectors) {
    const element = container.querySelector(selector);
    if (element && element.href) {
      return element.href;
    }
  }

  // If no link found, return current page URL
  return window.location.href;
}

function extractProductBrand(container) {
  // Try multiple selectors for product brand
  const brandSelectors = [
    '.brand',
    '.product-brand',
    '.item-brand',
    '[itemprop="brand"]',
    '#bylineInfo',
    '.brand-name',
    '.product__brand'
  ];

  for (const selector of brandSelectors) {
    const element = container.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim();
    }
  }

  // Look for brand patterns in the text
  const text = container.innerText;
  const brandPatterns = [
    /brand:\s*([^\n]+)/gi,
    /by\s+([^\n]+)/gi
  ];

  for (const pattern of brandPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/brand:\s*|by\s+/i, '');
    }
  }

  return '';
}

function extractProductSpecifications(container) {
  const specs = {};

  // Try to find specification tables
  const specTables = container.querySelectorAll('table');
  specTables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const key = cells[0].innerText.trim();
        const value = cells[1].innerText.trim();
        if (key && value) {
          specs[key] = value;
        }
      }
    });
  });

  // Try to find specification lists
  const specLists = container.querySelectorAll('dl, .specifications, .features');
  specLists.forEach(list => {
    const terms = list.querySelectorAll('dt, .spec-title, .feature-title');
    const definitions = list.querySelectorAll('dd, .spec-value, .feature-value');

    terms.forEach((term, index) => {
      if (definitions[index]) {
        const key = term.innerText.trim();
        const value = definitions[index].innerText.trim();
        if (key && value) {
          specs[key] = value;
        }
      }
    });
  });

  return specs;
}

// Helper function to get social platform from URL
function getPlatformFromUrl(url) {
  if (url.includes('facebook.com')) return 'Facebook';
  if (url.includes('twitter.com')) return 'Twitter';
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com')) return 'YouTube';
  if (url.includes('pinterest.com')) return 'Pinterest';
  if (url.includes('tiktok.com')) return 'TikTok';
  return 'Unknown';
}

// Helper function to get username from social URL
function getUsernameFromUrl(url) {
  const match = url.match(/\/([^\/]+)(?:\/|$)/);
  return match ? match[1] : '';
}

// Add function to extract data using custom selector
function extractWithSelector(selector) {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      showNotification(`No elements found with selector: ${selector}`);
      return;
    }

    const data = Array.from(elements).map(element => {
      return {
        text: element.innerText.trim(),
        html: element.outerHTML,
        href: element.href || null,
        src: element.src || null
      };
    });

    storeData('customSelector', data);
    showNotification(`Extracted ${data.length} items with selector: ${selector}`);
  } catch (error) {
    showNotification(`Error with selector: ${error.message}`);
  }
}

// Add this function to content.js
function openSidebar() {
  // Check if sidebar already exists
  if (document.getElementById('myscraper-sidebar')) {
    return;
  }

  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'myscraper-sidebar';
  sidebar.style.position = 'fixed';
  sidebar.style.top = '0';
  sidebar.style.right = '0';
  sidebar.style.width = '320px';
  sidebar.style.height = '100%';
  sidebar.style.zIndex = '999999';
  sidebar.style.backgroundColor = 'white';
  sidebar.style.boxShadow = '-2px 0 10px rgba(0,0,0,0.1)';
  sidebar.style.fontFamily = 'Roboto, sans-serif';

  // Create iframe for sidebar content
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('sidebar.html');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  sidebar.appendChild(iframe);
  document.body.appendChild(sidebar);

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.left = '10px';
  closeButton.style.zIndex = '1000000';
  closeButton.style.width = '30px';
  closeButton.style.height = '30px';
  closeButton.style.borderRadius = '50%';
  closeButton.style.border = 'none';
  closeButton.style.backgroundColor = '#ea4335';
  closeButton.style.color = 'white';
  closeButton.style.fontSize = '18px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'flex';
  closeButton.style.alignItems = 'center';
  closeButton.style.justifyContent = 'center';

  closeButton.onclick = function() {
    document.body.removeChild(sidebar);
  };

  sidebar.appendChild(closeButton);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autoDetect') {
    const result = detectDataTypes();
    sendResponse({ result: result });
    return true; // This indicates we'll send a response asynchronously
  } else if (message.action === 'highlightElements') {
    const { type, color } = message;
    const result = detectDataTypes();

    if (result[type] && result[type].elements.length > 0) {
      highlightElements(result[type].elements, color);
    }
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'startManualDetection') {
    startManualDetection();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'extractWithSelector') {
    extractWithSelector(message.selector);
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'startSelectionMode') {
    startSelectionMode();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'stopSelectionMode') {
    stopSelectionMode();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'startExclusionMode') {
    startExclusionMode();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'stopExclusionMode') {
    stopExclusionMode();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'clearHighlights') {
    clearHighlights();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'clearExclusionHighlights') {
    clearExclusionHighlights();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'extractSelectedData') {
    extractSelectedData(message.selectedElements, message.excludedElements, message.extractType);
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'closeSidebar') {
    closeSidebar();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'openSidebar') {
    openSidebar();
    sendResponse({ success: true });
    return true;
  }

  // For actions that don't need a response
  return false;
});
}
