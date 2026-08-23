// Robust cross-browser and iframe-safe printing helper for SIMPRESENSI Madrasah

export interface PrintOptions {
  elementId?: string;
  title?: string;
  landscape?: boolean;
  onPdfFallback?: () => void;
}

/**
 * Creates an isolated printable page in a new window/tab or hidden frame
 * and triggers the native browser print dialog cleanly.
 */
export function executePrint(options: PrintOptions = {}) {
  const { elementId, title = 'SIMPRESENSI Madrasah', landscape = false, onPdfFallback } = options;

  try {
    if (elementId) {
      const sourceElement = document.getElementById(elementId);
      if (sourceElement) {
        // Collect stylesheet links & inline styles
        let stylesHtml = '';
        const styleTags = document.querySelectorAll('style, link[rel="stylesheet"]');
        styleTags.forEach((tag) => {
          stylesHtml += tag.outerHTML;
        });

        const pageOrientation = landscape ? 'landscape' : 'portrait';

        const printHtml = `
          <!DOCTYPE html>
          <html lang="id">
            <head>
              <meta charset="utf-8">
              <title>${title}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <script src="https://cdn.tailwindcss.com"></script>
              ${stylesHtml}
              <style>
                @page {
                  size: A4 ${pageOrientation};
                  margin: 8mm 10mm 10mm 10mm;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                body {
                  background-color: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 10px !important;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                }
                .print\\:hidden, button, nav, header, .no-print {
                  display: none !important;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                }
                tr {
                  page-break-inside: avoid;
                }
                thead {
                  display: table-header-group;
                }
                tfoot {
                  display: table-footer-group;
                }
              </style>
            </head>
            <body>
              <div class="print-content">
                ${sourceElement.outerHTML}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 350);
                };
              </script>
            </body>
          </html>
        `;

        // Try opening in a new popup window first (bypasses iframe sandbox restrictions)
        const printWindow = window.open('', '_blank', 'width=900,height=750,menubar=no,toolbar=no,location=no,status=no');
        if (printWindow && !printWindow.closed) {
          printWindow.document.open();
          printWindow.document.write(printHtml);
          printWindow.document.close();
          return;
        }

        // If popup was blocked or inside restricted sandbox, try iframe approach
        printViaIframe(printHtml, onPdfFallback);
        return;
      }
    }

    // Direct window print fallback
    window.print();
  } catch (err) {
    console.warn('executePrint error, falling back to PDF:', err);
    if (onPdfFallback) {
      onPdfFallback();
    } else {
      try {
        window.print();
      } catch (e) {
        alert('Cetak browser diblokir oleh peramban. Silakan gunakan tombol "Unduh PDF" untuk mencetak dokumen.');
      }
    }
  }
}

function printViaIframe(htmlContent: string, onPdfFallback?: () => void) {
  try {
    const oldIframe = document.getElementById('simpresensi-print-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'simpresensi-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      if (onPdfFallback) onPdfFallback();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print blocked:', e);
        if (onPdfFallback) {
          onPdfFallback();
        }
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 4000);
      }
    }, 450);
  } catch (err) {
    if (onPdfFallback) onPdfFallback();
  }
}
