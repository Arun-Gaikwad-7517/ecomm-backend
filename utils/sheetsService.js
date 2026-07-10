/**
 * Sends order details to the Google Sheets Apps Script Web App.
 */
async function appendOrderToSheet(order) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('[Google Sheets] Skip appending order row: GOOGLE_SHEETS_WEBHOOK_URL is not set in environment variables.');
    return;
  }
  
  try {
    let tshirtCount = 0;
    let gadgetCount = 0;
    
    order.items.forEach(item => {
      if (item.category === 'T-Shirts') {
        tshirtCount += item.quantity;
      } else if (item.category === 'Tech Gadgets') {
        gadgetCount += item.quantity;
      }
    });

    const case1T = tshirtCount >= 1 ? '5%' : '0%';
    const case2T = tshirtCount > 5 ? '2%' : '0%';
    const case3T = tshirtCount >= 4 ? '4%' : '0%';
    const finalTDiscount = `${(tshirtCount >= 1 ? 5 : 0) + (tshirtCount > 5 ? 2 : 0) + (tshirtCount >= 4 ? 4 : 0)}%`;

    const case1Tech = '0%';
    const case2Tech = `${Math.min(20, Math.floor(gadgetCount / 5) * 3)}%`;
    const case3Tech = gadgetCount >= 4 ? '4%' : '0%';
    const finalTechDiscount = `${Math.min(20, Math.floor(gadgetCount / 5) * 3) + (gadgetCount >= 4 ? 4 : 0)}%`;

    const payload = {
      orderId: order._id ? order._id.toString() : order.orderId,
      customerName: order.customerName,
      tshirtQty: tshirtCount,
      techQty: gadgetCount,
      case1T,
      case2T,
      case3T,
      finalTDiscount,
      case1Tech,
      case2Tech,
      case3Tech,
      finalTechDiscount,
      grandTotal: `₹${order.totalAmount.toFixed(2)}`,
      orderDate: order.createdAt || new Date()
    };
    
    console.log(`[Google Sheets] Sending tabular payload to Apps Script:`, payload);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const responseData = await response.json();
      console.log('[Google Sheets] Appended row response:', responseData);
    } else {
      console.error('[Google Sheets] Appended row request failed with status:', response.status);
    }
  } catch (error) {
    console.error('[Google Sheets] Failed to append order row:', error.message);
  }
}

module.exports = {
  appendOrderToSheet
};
