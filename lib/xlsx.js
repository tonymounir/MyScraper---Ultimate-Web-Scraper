// Simple XLSX (HTML Table) converter for the extension
class XLSXConverter {
  static convert(data) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MyScraper Data</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          img { max-width: 100px; }
        </style>
      </head>
      <body>
    `;

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
        html += `
          <tr>
            <td>${business.name}</td>
            <td>${business.address}</td>
            <td>${business.phone}</td>
            <td><a href="${business.website}">${business.website}</a></td>
            <td>${business.email}</td>
          </tr>
        `;
      });
      html += '</table>';
    }

    // Add links
    if (data.links && data.links.length > 0) {
      html += '<h2>Links</h2><table><tr><th>URL</th><th>Text</th><th>Title</th></tr>';
      data.links.forEach(link => {
        html += `
          <tr>
            <td><a href="${link.href}">${link.href}</a></td>
            <td>${link.text}</td>
            <td>${link.title}</td>
          </tr>
        `;
      });
      html += '</table>';
    }

    // Add images
    if (data.images && data.images.length > 0) {
      html += '<h2>Images</h2><table><tr><th>URL</th><th>Alt Text</th><th>Image</th></tr>';
      data.images.forEach(image => {
        html += `
          <tr>
            <td><a href="${image.src}">${image.src}</a></td>
            <td>${image.alt}</td>
            <td><img src="${image.src}" alt="${image.alt}"></td>
          </tr>
        `;
      });
      html += '</table>';
    }

    html += '</body></html>';
    return html;
  }
}
