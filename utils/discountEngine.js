/**
 * Calculates discounts based on store business rules.
 * 
 * Rules:
 * 1. Single T-Shirt Discount:
 *    If >= 1 T-Shirt purchased, 5% discount on T-Shirt subtotal.
 * 2. Bulk T-Shirt Discount:
 *    If > 5 T-Shirts purchased, T-Shirt discount becomes 7%.
 * 3. Tech Gadgets Group Discount:
 *    For every 5 gadgets purchased, apply +3% discount on gadgets subtotal. Capped at 20%.
 * 4. Category Volume Bonus:
 *    If >= 4 items purchased from a single category, apply an additional 4% discount
 *    on the overall order value. Evaluated independently per category.
 * 
 * Overall Cap:
 *    Maximum total cart discount can never exceed 20% of the subtotal.
 */
function calculateDiscounts(items) {
  let tshirtCount = 0;
  let tshirtSubtotal = 0;
  
  let gadgetCount = 0;
  let gadgetSubtotal = 0;
  
  let totalSubtotal = 0;
  
  // First pass: Calculate category quantities and subtotals
  items.forEach(item => {
    const itemSubtotal = item.price * item.quantity;
    totalSubtotal += itemSubtotal;
    
    if (item.category === 'T-Shirts') {
      tshirtCount += item.quantity;
      tshirtSubtotal += itemSubtotal;
    } else if (item.category === 'Tech Gadgets') {
      gadgetCount += item.quantity;
      gadgetSubtotal += itemSubtotal;
    }
  });

  // Determine individual discount rates
  const tshirtRate = tshirtCount >= 1 ? (tshirtCount > 5 ? 0.07 : 0.05) : 0;
  
  const rawGadgetRate = gadgetCount >= 5 ? Math.floor(gadgetCount / 5) * 3 : 0;
  const gadgetRate = Math.min(20, rawGadgetRate) / 100;
  
  const tshirtBonusRate = tshirtCount >= 4 ? 0.04 : 0;
  const gadgetBonusRate = gadgetCount >= 4 ? 0.04 : 0;
  const totalBonusRate = tshirtBonusRate + gadgetBonusRate; // Applied to all items

  // Second pass: Calculate raw item-level discounts
  let calculatedItems = items.map(item => {
    const origSubtotal = item.price * item.quantity;
    const itemDiscounts = [];
    
    // 1 & 2: Category specific discounts
    if (item.category === 'T-Shirts' && tshirtRate > 0) {
      itemDiscounts.push({
        rule: `T-Shirt Discount (${tshirtRate * 100}%)`,
        amount: origSubtotal * tshirtRate
      });
    } else if (item.category === 'Tech Gadgets' && gadgetRate > 0) {
      itemDiscounts.push({
        rule: `Tech Gadget Bulk (${gadgetRate * 100}%)`,
        amount: origSubtotal * gadgetRate
      });
    }
    
    // 3: Category Quantity Bonus (applied proportionally to item subtotal)
    if (totalBonusRate > 0) {
      if (tshirtBonusRate > 0) {
        itemDiscounts.push({
          rule: 'T-Shirt Category Volume Bonus (4%)',
          amount: origSubtotal * 0.04
        });
      }
      if (gadgetBonusRate > 0) {
        itemDiscounts.push({
          rule: 'Tech Category Volume Bonus (4%)',
          amount: origSubtotal * 0.04
        });
      }
    }
    
    const itemRawDiscount = itemDiscounts.reduce((sum, d) => sum + d.amount, 0);
    
    return {
      product: item.product,
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: item.quantity,
      subtotal: origSubtotal,
      rawDiscounts: itemDiscounts,
      rawDiscountTotal: itemRawDiscount
    };
  });

  // Calculate cart-level totals
  const totalRawDiscount = calculatedItems.reduce((sum, item) => sum + item.rawDiscountTotal, 0);
  const capLimit = totalSubtotal * 0.20;
  const isCapped = totalRawDiscount > capLimit;
  
  // Proportional scaling factor if capped
  const scaleFactor = isCapped ? (capLimit / totalRawDiscount) : 1;

  // Finalize item discounts with scaling applied
  const finalItems = calculatedItems.map(item => {
    const finalizedDiscounts = item.rawDiscounts.map(d => ({
      rule: d.rule,
      amount: Math.round(d.amount * scaleFactor * 100) / 100
    }));
    
    const itemDiscountTotal = finalizedDiscounts.reduce((sum, d) => sum + d.amount, 0);
    const finalItemPayable = item.subtotal - itemDiscountTotal;
    
    return {
      product: item.product,
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      discounts: finalizedDiscounts,
      totalDiscount: Math.round(itemDiscountTotal * 100) / 100,
      finalPayable: Math.round(finalItemPayable * 100) / 100
    };
  });

  // Calculate cart-level discounts list
  const appliedDiscounts = [];
  
  if (tshirtCount >= 1) {
    const amount = tshirtSubtotal * tshirtRate * scaleFactor;
    if (amount > 0) {
      appliedDiscounts.push({
        rule: `T-Shirt Discount (${tshirtRate * 100}%)`,
        amount: Math.round(amount * 100) / 100
      });
    }
  }
  
  if (gadgetCount >= 5) {
    const amount = gadgetSubtotal * gadgetRate * scaleFactor;
    if (amount > 0) {
      appliedDiscounts.push({
        rule: `Tech Gadgets Discount (${gadgetRate * 100}%)`,
        amount: Math.round(amount * 100) / 100
      });
    }
  }
  
  if (tshirtCount >= 4) {
    const amount = totalSubtotal * 0.04 * scaleFactor;
    appliedDiscounts.push({
      rule: 'T-Shirt Category Bonus (4%)',
      amount: Math.round(amount * 100) / 100
    });
  }
  
  if (gadgetCount >= 4) {
    const amount = totalSubtotal * 0.04 * scaleFactor;
    appliedDiscounts.push({
      rule: 'Tech Category Bonus (4%)',
      amount: Math.round(amount * 100) / 100
    });
  }

  const totalDiscount = finalItems.reduce((sum, item) => sum + item.totalDiscount, 0);
  const finalPayable = totalSubtotal - totalDiscount;

  return {
    subtotal: totalSubtotal,
    appliedDiscounts,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    isCapped,
    finalPayable: Math.round(finalPayable * 100) / 100,
    items: finalItems
  };
}

module.exports = {
  calculateDiscounts
};
