document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('full-data-container');

  if (!container) {
    console.error('Full data container not found.');
    return;
  }

  chrome.storage.local.get(['scrapedData'], (result) => {
    const data = result.scrapedData || {};
    const allItems = [];

    // Combine all data into a single array
    for (const type in data) {
      if (Array.isArray(data[type])) {
        data[type].forEach(item => {
          allItems.push({ type, item });
        });
      }
    }

    if (allItems.length === 0) {
      container.innerHTML = '<p>No data has been scraped yet.</p>';
      return;
    }

    let tableHTML = '<table><thead><tr><th>Type</th><th>Data</th></tr></thead><tbody>';

    allItems.forEach(({ type, item }) => {
      let displayValue;
      if (typeof item === 'object' && item !== null) {
        // For objects, show a detailed view
        displayValue = Object.entries(item)
          .map(([key, value]) => `<b>${key}:</b> ${value}`)
          .join('<br>');
      } else {
        displayValue = item;
      }
      tableHTML += `<tr><td>${type}</td><td>${displayValue}</td></tr>`;
    });

    tableHTML += '</tbody></table>';

    container.innerHTML = tableHTML;
  });
});
