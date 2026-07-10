const nodemailer = require('nodemailer');

// Helper to create a nodemailer transporter
async function getTransporter() {
  // If env variables are provided, use them
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const host = process.env.SMTP_HOST.toLowerCase();
    const port = parseInt(process.env.SMTP_PORT);
    
    // Auto-detect Gmail to use Nodemailer's pre-configured Gmail service
    if (host.includes('gmail')) {
      console.log('[Email Service] Gmail host detected. Using built-in Gmail transport shorthand.');
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465, // true for port 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // Avoid connection failures due to cert verification
      }
    });
  }
  
  // Otherwise, create a mock test account with ethereal.email
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (err) {
    console.error('Failed to create Ethereal SMTP test account. Falling back to console-logging transporter.', err);
    return {
      sendMail: async (mailOptions) => {
        console.log('\n--- EMAIL SENT (CONSOLE FALLBACK) ---');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Body: ${mailOptions.text || mailOptions.html}`);
        console.log('-------------------------------------\n');
        return { messageId: 'console-mock-id' };
      }
    };
  }
}

/**
 * Sends a Welcome Email to a newly registered user on signup.
 */
async function sendSignupWelcomeEmail(customerName, email) {
  try {
    const transporter = await getTransporter();
    
    const welcomeSubject = `Welcome to our E-Commerce Store, ${customerName}!`;
    const welcomeHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Welcome to Aesthetic Store!</h2>
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Thank you for choosing our store. We are excited to have you as a customer!</p>
        <p>Your account has been set up, and you can now log in to view our products, manage your cart, and track your purchases.</p>
        <p>Use your email address (<strong>${email}</strong>) to log in anytime.</p>
        <p style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">Happy Shopping!</p>
        <br>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 11px; color: #999; text-align: center;">This is a system-generated welcome email.</p>
      </div>
    `;
    
    const info = await transporter.sendMail({
      from: '"Aesthetic Store" <no-reply@ecomstore.com>',
      to: email,
      subject: welcomeSubject,
      html: welcomeHtml
    });
    
    if (info.messageId === 'console-mock-id') {
      console.log(`[Email Service] Welcome email output to console.`);
    } else if (transporter.options && transporter.options.host === 'smtp.ethereal.email') {
      console.log(`[Email Service] Welcome email sent to Ethereal. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`[Email Service] Welcome email successfully sent to ${email}`);
    }
  } catch (error) {
    console.error('[Email Service] Failed to send Welcome Email:', error);
  }
}

/**
 * Sends an Invoice/Bill Email for a successful checkout order.
 */
async function sendOrderInvoiceEmail(customerName, email, orderDetails) {
  try {
    const transporter = await getTransporter();
    
    const invoiceSubject = `Your Receipt & Invoice for Order #${orderDetails.orderId}`;
    
    let tshirtCount = 0;
    let gadgetCount = 0;
    
    orderDetails.items.forEach(item => {
      if (item.category === 'T-Shirts') {
        tshirtCount += item.quantity;
      } else if (item.category === 'Tech Gadgets') {
        gadgetCount += item.quantity;
      }
    });

    const itemsHtml = orderDetails.items.map(item => {
      // Safety calculations to prevent crashes on undefined properties
      const itemSubtotal = typeof item.subtotal === 'number' ? item.subtotal : (item.price * item.quantity);
      const itemTotalDiscount = typeof item.totalDiscount === 'number' ? item.totalDiscount : 0;
      const itemFinalPayable = typeof item.finalPayable === 'number' ? item.finalPayable : (itemSubtotal - itemTotalDiscount);

      // Format item-level discounts
      const itemDiscountsHtml = item.discounts && item.discounts.length > 0
        ? `<div style="font-size: 11px; color: #059669; margin-top: 6px; padding: 6px 8px; background-color: #f0fdf4; border-radius: 6px; border: 1px solid #dcfce7; display: inline-block;">
             <span style="font-weight: 600; display: block; margin-bottom: 2px;">Item Discounts:</span>
             ${item.discounts.map(d => `<div style="display:flex; gap: 8px; justify-content:space-between; margin-bottom:1px;"><span>• ${d.rule}</span><span style="font-weight:600;">-₹${d.amount.toFixed(2)}</span></div>`).join('')}
             <div style="border-top: 1px dashed rgba(5,150,105,0.2); margin-top: 4px; padding-top: 2px; font-weight: 600; text-align:right;">Saved: -₹${itemTotalDiscount.toFixed(2)}</div>
           </div>`
        : '';

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 14px 12px; color: #0f172a; vertical-align: top;">
            <div style="font-weight: 700; font-size: 14px; color: #1e293b;">${item.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.02em;">Category: ${item.category}</div>
            ${itemDiscountsHtml}
          </td>
          <td style="padding: 14px 12px; text-align: center; color: #0f172a; vertical-align: top; font-size: 14px;">₹${item.price.toFixed(2)}</td>
          <td style="padding: 14px 12px; text-align: center; color: #0f172a; vertical-align: top; font-size: 14px; font-weight: 500;">${item.quantity}</td>
          <td style="padding: 14px 12px; text-align: right; color: #0f172a; vertical-align: top; font-size: 14px; font-weight: 600;">
            <div style="text-decoration: ${itemTotalDiscount > 0 ? 'line-through' : 'none'}; color: ${itemTotalDiscount > 0 ? '#94a3b8' : '#0f172a'}; font-size: ${itemTotalDiscount > 0 ? '12px' : '14px'}">
              ₹${itemSubtotal.toFixed(2)}
            </div>
            ${itemTotalDiscount > 0 ? `<div style="color: #4f46e5; margin-top: 3px; font-size: 14px; font-weight: 700;">₹${itemFinalPayable.toFixed(2)}</div>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    const discountHtml = orderDetails.appliedDiscounts.map(d => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #059669; font-size: 13px;">
        <span>${d.rule}</span>
        <span>-₹${d.amount.toFixed(2)}</span>
      </div>
    `).join('');

    const invoiceHtml = `
      <div style="background-color: #f8fafc; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Banner Header -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
            <div style="font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 5px;">AESTHETIC STORE</div>
            <div style="font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em;">Order Confirmation Receipt</div>
          </div>
          
          <!-- Body contents -->
          <div style="padding: 25px 20px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0; line-height: 1.5;">Hi <strong>${customerName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; margin-bottom: 25px; line-height: 1.5;">
              Thank you for your order! Below is the detailed breakdown of your purchased products, along with our advanced business rules ledger calculation:
            </p>
            
            <!-- Metadata Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 15px; margin-bottom: 25px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
              <div><strong>ORDER ID:</strong> <span style="font-family: monospace; color: #0f172a; font-size:13px;">${orderDetails.orderId}</span></div>
              <div style="text-align: right;"><strong>DATE:</strong> <span style="color: #0f172a;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            </div>
            
            
            <!-- Items Table -->
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Purchased Items</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 10px 12px; text-align: left; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600;">Product</th>
                  <th style="padding: 10px 12px; text-align: center; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600;">Price</th>
                  <th style="padding: 10px 12px; text-align: center; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <!-- Invoice Calculations breakdown -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569; font-size: 13px;">
                <span>Cart Subtotal</span>
                <span style="font-weight: 600; color: #0f172a;">₹${orderDetails.subtotal.toFixed(2)}</span>
              </div>
              
              ${discountHtml}
              
              <div style="border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a;">
                <span>Amount Paid</span>
                <span style="color: #4f46e5; font-size: 18px;">₹${orderDetails.totalAmount.toFixed(2)}</span>
              </div>
              
            </div>
            
            <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px; margin-bottom: 0; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
              Have questions? Reply to this email or visit our help center. Thank you for your business!
            </p>
            
          </div>
          
        </div>
      </div>
    `;
    
    const info = await transporter.sendMail({
      from: '"Aesthetic Store" <orders@ecomstore.com>',
      to: email,
      subject: invoiceSubject,
      html: invoiceHtml
    });
    
    if (info.messageId === 'console-mock-id') {
      console.log('[Email Service] Invoice email output to console.');
    } else if (transporter.options && transporter.options.host === 'smtp.ethereal.email') {
      console.log(`[Email Service] Invoice email sent to Ethereal. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`[Email Service] Invoice email successfully sent to ${email}`);
    }
  } catch (error) {
    console.error('[Email Service] Failed to send Invoice Email:', error);
  }
}

/**
 * Sends Welcome and Invoice (For compatibility, triggers both)
 */
async function sendOrderEmails(customerName, email, orderDetails) {
  await sendSignupWelcomeEmail(customerName, email);
  await sendOrderInvoiceEmail(customerName, email, orderDetails);
}

module.exports = {
  sendSignupWelcomeEmail,
  sendOrderInvoiceEmail,
  sendOrderEmails
};
