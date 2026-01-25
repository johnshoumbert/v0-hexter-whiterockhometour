export function generateWinnerInvoiceHTML(data: {
  invoiceNumber: string
  invoiceDate: string
  eventName: string
  winnerName: string
  winnerEmail: string
  auctionTitle: string
  finalBid: number
  pickupInstructions?: string
}): string {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${data.invoiceNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 42px;
          color: #2563eb;
          font-weight: bold;
        }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        .invoice-meta div {
          font-size: 14px;
        }
        .invoice-meta strong {
          display: block;
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }
        .bill-to {
          padding: 20px;
          background-color: #f9fafb;
          border-left: 4px solid #2563eb;
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        th {
          background-color: #2563eb;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        td {
          padding: 20px 15px;
          border-bottom: 1px solid #e5e7eb;
        }
        .item-title {
          font-weight: 600;
          font-size: 16px;
          color: #111827;
        }
        .item-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        }
        .total-row {
          background-color: #f3f4f6;
          border-top: 2px solid #2563eb;
        }
        .total-row td {
          font-weight: bold;
          font-size: 22px;
          color: #2563eb;
          padding: 25px 15px;
        }
        .pickup-section {
          margin-top: 40px;
          padding: 25px;
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 6px;
        }
        .pickup-section h3 {
          margin: 0 0 10px 0;
          color: #92400e;
          font-size: 16px;
        }
        .footer {
          margin-top: 60px;
          padding-top: 30px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 13px;
          color: #6b7280;
        }
        .footer p {
          margin: 5px 0;
        }
        .thank-you {
          font-size: 18px;
          font-weight: 600;
          color: #2563eb;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INVOICE</h1>
        <p style="color: #6b7280; font-size: 16px; margin: 10px 0 0 0;">${data.eventName}</p>
      </div>

      <div class="invoice-meta">
        <div>
          <strong>Invoice Number</strong>
          <span style="font-size: 18px; font-weight: 600;">${data.invoiceNumber}</span>
        </div>
        <div>
          <strong>Invoice Date</strong>
          <span style="font-size: 18px;">${data.invoiceDate}</span>
        </div>
      </div>

      <div class="bill-to">
        <div class="section-title">Bill To:</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">${data.winnerName}</div>
        <div style="font-size: 14px; color: #6b7280;">${data.winnerEmail}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item Description</th>
            <th style="text-align: right; width: 150px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-title">${data.auctionTitle}</div>
              <div class="item-subtitle">Winning Auction Bid</div>
            </td>
            <td style="text-align: right; font-weight: 600; font-size: 18px;">
              ${formatCurrency(data.finalBid)}
            </td>
          </tr>
          <tr class="total-row">
            <td style="text-align: right;">Total Due:</td>
            <td style="text-align: right;">${formatCurrency(data.finalBid)}</td>
          </tr>
        </tbody>
      </table>

      ${
        data.pickupInstructions
          ? `
      <div class="pickup-section">
        <h3>📦 Pickup Instructions</h3>
        <p style="margin: 0; color: #78350f; line-height: 1.6;">${data.pickupInstructions}</p>
      </div>
      `
          : ""
      }

      <div class="footer">
        <p class="thank-you">Thank you for your support!</p>
        <p>Please keep this invoice for your records.</p>
        <p>If you have any questions, please contact the event organizers.</p>
      </div>
    </body>
    </html>
  `
}
