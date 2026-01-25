import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[v0] Generating PDF for PO request:", id)

    const result = await sql`
      SELECT 
        po.*,
        u.name,
        u.email,
        u.phone,
        e.event_name as school_name
      FROM po_requests po
      LEFT JOIN users u ON po.user_id = u.id
      LEFT JOIN events e ON po.event_id = e.id
      WHERE po.id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "PO request not found" }, { status: 404 })
    }

    const po = result[0]

    // Generate HTML for PDF
    const html = generateInvoiceHTML(po)

    // For now, return HTML that can be printed as PDF by the browser
    // In production, you could use puppeteer or a PDF service
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="invoice-${po.invoice_number}.html"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}

function generateInvoiceHTML(po: any): string {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? Number.parseFloat(amount) : amount
    return `$${num.toFixed(2)}`
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${po.invoice_number}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
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
        }
        .header h1 {
          margin: 0;
          font-size: 36px;
          color: #2563eb;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #2563eb;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #e5e7eb;
        }
        td {
          padding: 12px;
          border: 1px solid #e5e7eb;
        }
        .total-row {
          background-color: #f9fafb;
          font-weight: bold;
          font-size: 18px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
        .print-button {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .print-button:hover {
          background-color: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
      
      <div class="header">
        <h1>Invoice</h1>
      </div>

      <div class="invoice-details">
        <div>
          <strong>Invoice Number:</strong> ${po.invoice_number}
        </div>
        <div>
          <strong>Date:</strong> ${formatDate(po.invoice_date)}
        </div>
      </div>

      <div class="info-grid">
        <div class="section">
          <div class="section-title">From:</div>
          <div>Shoumbert, LLC</div>
          <div>2808 Barnes Bridge Rd</div>
          <div>2142286595</div>
          <div>ShoumbertLLC@gmail.com</div>
        </div>

        <div class="section">
          <div class="section-title">To:</div>
          <div>${po.name}</div>
          <div>${po.phone}</div>
          <div>${po.email}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Description:</div>
        <div>Software License for "MySchoolAuction App"</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Discount</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${po.item_description}</td>
            <td>${po.quantity}</td>
            <td>${formatCurrency(po.unit_price)}</td>
            <td>${formatCurrency(po.discount)}</td>
            <td>${formatCurrency(po.total_amount)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" style="text-align: right;">Total Due:</td>
            <td>${formatCurrency(po.total_amount)}</td>
          </tr>
        </tbody>
      </table>

      <div class="section">
        <strong>Payment Terms:</strong> ${po.payment_terms}<br>
        <strong>Due Date:</strong> ${formatDate(po.due_date)}
      </div>

      <div class="footer">
        <p>Please make checks payable to <strong>John Shoumbert</strong>.</p>
        <p>For any questions regarding this invoice, please contact John Shoumbert at 2142286595 or ShoumbertLLC@gmail.com.</p>
      </div>
    </body>
    </html>
  `
}
