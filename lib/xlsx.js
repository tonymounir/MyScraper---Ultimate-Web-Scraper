// Simple Excel converter for the extension
class XLSXConverter {
  static convert(data) {
    // This is a simplified version
    // In a real implementation, you would use a library like SheetJS
    
    // For now, we'll create a simple HTML table that can be opened in Excel
    let html = '<table border="1">';
    
    // Add emails
    if (data.emails && data.emails.length > 0) {
      html += '<tr><th colspan="1">Emails</th></tr>';
      data.emails.forEach(email => {
        html += `<tr><td>${email}</td></tr>`;
      });
    }
    
    // Add phones
    if (data.phones && data.phones.length > 0) {
      html += '<tr><th colspan="1">Phone Numbers</th></tr>';
      data.phones.forEach(phone => {
        html += `<tr><td>${phone}</td></tr>`;
      });
    }
    
    // Add business data
    if (data.business && data.business.length > 0) {
      html += '<tr><th colspan="5">Business Data</th></tr>';
      html += '<tr><th>Name</th><th>Address</th><th>Phone</th><th>Website</th><th>Email</th></tr>';
      data.business.forEach(business => {
        html += `<tr>
          <td>${business.name}</td>
          <td>${business.address}</td>
          <td>${business.phone}</td>
          <td>${business.website}</td>
          <td>${business.email}</td>
        </tr>`;
      });
    }
    
    html += '</table>';
    
    return html;
  }
}