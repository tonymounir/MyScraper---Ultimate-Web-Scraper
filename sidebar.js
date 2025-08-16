document.addEventListener('DOMContentLoaded', function() {
  // Initialize DOM elements
  const elements = {
    startSelection: document.getElementById('startSelection'),
    clearSelection: document.getElementById('clearSelection'),
    selectionMode: document.getElementById('selectionMode'),
    selectionList: document.getElementById('selectionList'),
    startExclusion: document.getElementById('startExclusion'),
    clearExclusion: document.getElementById('clearExclusion'),
    exclusionMode: document.getElementById('exclusionMode'),
    extractType: document.getElementById('extractType'),
    extractData: document.getElementById('extractData'),
    dataPreview: document.getElementById('dataPreview'),
    status: document.getElementById('status'),
    closeSidebar: document.getElementById('closeSidebar'),
    helpButton: document.getElementById('helpButton'),
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    step3: document.getElementById('step3')
  };
  
  // State variables
  let selectionMode = false;
  let exclusionMode = false;
  let selectedElements = [];
  let excludedElements = [];
  
  // Initialize
  init();
  
  function init() {
    // Set up event listeners
    elements.startSelection.addEventListener('click', toggleSelectionMode);
    elements.clearSelection.addEventListener('click', clearSelectedElements);
    elements.startExclusion.addEventListener('click', toggleExclusionMode);
    elements.clearExclusion.addEventListener('click', clearExcludedElements);
    elements.extractData.addEventListener('click', extractSelectedData);
    elements.closeSidebar.addEventListener('click', closeSidebar);
    elements.helpButton.addEventListener('click', showHelp);
    
    // Get current tab and set up communication
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ['content.js']
        }, () => {
          // Now that content.js is injected, set up message listener
          setupMessageListener();
        });
      }
    });
  }
  
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'elementSelected') {
        handleElementSelected(message.element, message.selector);
      } else if (message.action === 'elementExcluded') {
        handleElementExcluded(message.element, message.selector);
      }
    });
  }
  
  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    
    if (selectionMode) {
      elements.selectionMode.classList.add('active');
      elements.selectionMode.innerHTML = 'Selection mode: <strong>ON</strong>';
      elements.startSelection.innerHTML = '<i class="fas fa-stop"></i> Stop Selection';
      
      // Turn off exclusion mode if it's on
      if (exclusionMode) {
        toggleExclusionMode();
      }
      
      // Update step status
      updateStepStatus(1, 'active');
      
      // Send message to content script to start selection mode
      sendToContentScript({
        action: 'startSelectionMode'
      });
    } else {
      elements.selectionMode.classList.remove('active');
      elements.selectionMode.innerHTML = 'Selection mode: <strong>OFF</strong>';
      elements.startSelection.innerHTML = '<i class="fas fa-mouse-pointer"></i> Start Selection';
      
      // Send message to content script to stop selection mode
      sendToContentScript({
        action: 'stopSelectionMode'
      });
    }
  }
  
  function toggleExclusionMode() {
    exclusionMode = !exclusionMode;
    
    if (exclusionMode) {
      elements.exclusionMode.classList.add('active');
      elements.exclusionMode.innerHTML = 'Exclusion mode: <strong>ON</strong>';
      elements.startExclusion.innerHTML = '<i class="fas fa-stop"></i> Stop Exclusion';
      
      // Turn off selection mode if it's on
      if (selectionMode) {
        toggleSelectionMode();
      }
      
      // Update step status
      updateStepStatus(2, 'active');
      
      // Send message to content script to start exclusion mode
      sendToContentScript({
        action: 'startExclusionMode'
      });
    } else {
      elements.exclusionMode.classList.remove('active');
      elements.exclusionMode.innerHTML = 'Exclusion mode: <strong>OFF</strong>';
      elements.startExclusion.innerHTML = '<i class="fas fa-ban"></i> Start Exclusion';
      
      // Send message to content script to stop exclusion mode
      sendToContentScript({
        action: 'stopExclusionMode'
      });
    }
  }
  
  function handleElementSelected(element, selector) {
    // Check if element is already selected
    const existingIndex = selectedElements.findIndex(el => el.selector === selector);
    
    if (existingIndex === -1) {
      // Add to selected elements
      selectedElements.push({
        selector: selector,
        text: element.text.substring(0, 50) + (element.text.length > 50 ? '...' : ''),
        type: getElementTypeName(element)
      });
      
      updateSelectionList();
      showStatus(`Element selected: ${element.text.substring(0, 30)}...`, 'success');
      
      // Update step status
      updateStepStatus(1, 'completed');
      updateStepStatus(2, 'active');
    }
  }
  
  function handleElementExcluded(element, selector) {
    // Check if element is already excluded
    const existingIndex = excludedElements.findIndex(el => el.selector === selector);
    
    if (existingIndex === -1) {
      // Add to excluded elements
      excludedElements.push({
        selector: selector,
        text: element.text.substring(0, 50) + (element.text.length > 50 ? '...' : ''),
        type: getElementTypeName(element)
      });
      
      showStatus(`Element excluded: ${element.text.substring(0, 30)}...`, 'success');
      
      // Update step status
      updateStepStatus(2, 'completed');
      updateStepStatus(3, 'active');
    }
  }
  
  function getElementTypeName(element) {
    if (element.tagName === 'A') return 'Link';
    if (element.tagName === 'IMG') return 'Image';
    if (element.tagName === 'BUTTON') return 'Button';
    if (element.tagName === 'INPUT') return 'Input';
    if (element.tagName === 'SELECT') return 'Select';
    if (element.tagName === 'TEXTAREA') return 'Textarea';
    if (element.classList.contains('product')) return 'Product';
    if (element.classList.contains('item')) return 'Item';
    return 'Element';
  }
  
  function updateSelectionList() {
    if (selectedElements.length === 0) {
      elements.selectionList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No elements selected yet</div>';
      return;
    }
    
    let html = '';
    selectedElements.forEach((element, index) => {
      html += `
        <div class="selection-item">
          <div class="selection-item-info">
            <strong>${element.type}:</strong> ${element.text}
          </div>
          <button class="selection-item-remove" data-index="${index}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    });
    
    elements.selectionList.innerHTML = html;
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.selection-item-remove').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        selectedElements.splice(index, 1);
        updateSelectionList();
      });
    });
  }
  
  function clearSelectedElements() {
    selectedElements = [];
    updateSelectionList();
    showStatus('Selection cleared', 'success');
    
    // Send message to content script to clear highlights
    sendToContentScript({
      action: 'clearHighlights'
    });
  }
  
  function clearExcludedElements() {
    excludedElements = [];
    showStatus('Exclusion cleared', 'success');
    
    // Send message to content script to clear exclusion highlights
    sendToContentScript({
      action: 'clearExclusionHighlights'
    });
  }
  
  function extractSelectedData() {
    if (selectedElements.length === 0) {
      showStatus('Please select at least one element', 'error');
      return;
    }
    
    const extractType = elements.extractType.value;
    
    // Send message to content script to extract data
    sendToContentScript({
      action: 'extractSelectedData',
      selectedElements: selectedElements,
      excludedElements: excludedElements,
      extractType: extractType
    });
    
    showStatus('Extracting data...', 'success');
    
    // Update step status
    updateStepStatus(3, 'completed');
  }
  
  function showStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
    elements.status.style.display = 'block';
    
    setTimeout(() => {
      elements.status.style.display = 'none';
    }, 3000);
  }
  
  function updateStepStatus(stepNumber, status) {
    const stepElement = document.getElementById(`step${stepNumber}`);
    
    // Remove all status classes
    stepElement.classList.remove('active', 'completed');
    
    // Add the appropriate status class
    if (status === 'active') {
      stepElement.classList.add('active');
    } else if (status === 'completed') {
      stepElement.classList.add('completed');
    }
  }
  
  function sendToContentScript(message) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
  
  function closeSidebar() {
    // Send message to content script to clean up
    sendToContentScript({
      action: 'closeSidebar'
    });
    
    // Close the sidebar window
    window.close();
  }
  
  function showHelp() {
    alert(`Manual Selection Mode Help:

1. Click "Start Selection" and then click on elements you want to extract.
2. Selected elements will be highlighted in blue.
3. Optionally, click "Start Exclusion" and click on elements to exclude (like category links).
4. Excluded elements will be highlighted in red.
5. Choose the data type you want to extract.
6. Click "Extract Selected Data" to extract the data.

Tips:
- You can select multiple elements of the same type for batch extraction.
- Use exclusion mode to filter out unwanted elements like navigation links or ads.
- For product extraction, select product containers to get structured data.`);
  }
  
  // Listen for extracted data from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'extractedData') {
      handleExtractedData(message.data, message.type);
    }
  });
  
  function handleExtractedData(data, type) {
    // Display preview of extracted data
    elements.dataPreview.style.display = 'block';
    
    if (type === 'text') {
      elements.dataPreview.textContent = data.map(item => item.text).join('\n\n');
    } else if (type === 'links') {
      elements.dataPreview.textContent = data.map(item => item.href).join('\n');
    } else if (type === 'images') {
      elements.dataPreview.textContent = data.map(item => item.src).join('\n');
    } else if (type === 'products') {
      elements.dataPreview.textContent = JSON.stringify(data, null, 2);
    } else {
      elements.dataPreview.textContent = JSON.stringify(data, null, 2);
    }
    
    // Store the data
    chrome.storage.local.get(['scrapedData'], (result) => {
      const scrapedData = result.scrapedData || {};
      
      if (!scrapedData[type]) {
        scrapedData[type] = [];
      }
      
      // Add new data
      if (Array.isArray(data)) {
        scrapedData[type] = [...scrapedData[type], ...data];
      } else {
        scrapedData[type].push(data);
      }
      
      // Apply deduplication
      scrapedData[type] = deduplicateData(scrapedData[type], type);
      
      chrome.storage.local.set({ scrapedData }, () => {
        // Notify background that data was updated
        chrome.runtime.sendMessage({ action: 'dataUpdated' });
      });
    });
    
    showStatus(`Extracted ${data.length} items`, 'success');
  }
  
  function deduplicateData(data, type) {
    if (!Array.isArray(data) || data.length === 0) {
      return data;
    }
    
    // For simple data types (strings), use Set
    if (typeof data[0] === 'string') {
      return [...new Set(data)];
    }
    
    // For objects, use specific fields for deduplication
    let keyFields = [];
    
    switch (type) {
      case 'links':
        keyFields = ['href'];
        break;
      case 'products':
        keyFields = ['name', 'price'];
        break;
      case 'images':
        keyFields = ['src'];
        break;
      default:
        // For other types, use JSON representation
        const uniqueMap = new Map();
        data.forEach(item => {
          const jsonKey = JSON.stringify(item);
          if (!uniqueMap.has(jsonKey)) {
            uniqueMap.set(jsonKey, item);
          }
        });
        return Array.from(uniqueMap.values());
    }
    
    // Deduplicate by key fields
    const uniqueMap = new Map();
    data.forEach(item => {
      const compositeKey = keyFields.map(field => item[field] || '').join('|');
      if (!uniqueMap.has(compositeKey)) {
        uniqueMap.set(compositeKey, item);
      }
    });
    
    return Array.from(uniqueMap.values());
  }
});