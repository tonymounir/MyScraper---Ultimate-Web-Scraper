// Simple CSV converter for the extension
class CSVConverter {
  static convert(data, delimiter = ',', includeHeaders = true) {
    let csv = '';

    // Process different data types
    if (data.emails && data.emails.length > 0) {
      if (includeHeaders) csv += 'Email\n';
      data.emails.forEach(email => {
        csv += `"${email}"\n`;
      });
      csv += '\n';
    }

    if (data.phones && data.phones.length > 0) {
      if (includeHeaders) csv += 'Phone\n';
      data.phones.forEach(phone => {
        csv += `"${phone}"\n`;
      });
      csv += '\n';
    }

    if (data.business && data.business.length > 0) {
      if (includeHeaders) csv += 'Name' + delimiter + 'Address' + delimiter + 'Phone' + delimiter + 'Website' + delimiter + 'Email\n';
      data.business.forEach(business => {
        csv += `"${business.name}"${delimiter}"${business.address}"${delimiter}"${business.phone}"${delimiter}"${business.website}"${delimiter}"${business.email}"\n`;
      });
      csv += '\n';
    }

    if (data.links && data.links.length > 0) {
      if (includeHeaders) csv += 'URL' + delimiter + 'Text' + delimiter + 'Title\n';
      data.links.forEach(link => {
        csv += `"${link.href}"${delimiter}"${link.text}"${delimiter}"${link.title}"\n`;
      });
      csv += '\n';
    }

    if (data.images && data.images.length > 0) {
      if (includeHeaders) csv += 'URL' + delimiter + 'Alt Text' + delimiter + 'Width' + delimiter + 'Height\n';
      data.images.forEach(image => {
        csv += `"${image.src}"${delimiter}"${image.alt}"${delimiter}${image.width}${delimiter}${image.height}\n`;
      });
    }

    return csv;
  }
}
