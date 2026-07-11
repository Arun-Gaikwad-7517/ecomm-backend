/**
 * Calculates discounts based on the requested business rules.
 *
 * Rules:
 * 1. Base Discount:
 *    Applied separately per category when that category exists in the cart.
 *    - T-Shirts: 5% if quantity >= 1
 *    - Tech Gadgets: 5% if quantity >= 1
 * 2. Quantity Discount:
 *    Applied separately per category.
 *    - T-Shirts: +2% for every 5 T-Shirts, capped at 20%
 *    - Tech Gadgets: +3% for every 5 gadgets, capped at 30%
 * 3. Additional Category Discount:
 *    Applied separately to each category if that category exists in the cart.
 *    - T-Shirts: +4%
 *    - Tech Gadgets: +4%
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

  const tshirtBaseRate = tshirtCount >= 1 ? 0.05 : 0;
  const tshirtQuantityBlocks = tshirtCount >= 5 ? Math.floor(tshirtCount / 5) : 0;
  const tshirtQuantityRate = Math.min(tshirtQuantityBlocks * 0.02, 0.20);
  const tshirtBonusRate = tshirtCount >= 1 ? 0.04 : 0;

  const gadgetBaseRate = gadgetCount >= 1 ? 0.05 : 0;
  const gadgetQuantityBlocks = gadgetCount >= 5 ? Math.floor(gadgetCount / 5) : 0;
  const gadgetQuantityRate = Math.min(gadgetQuantityBlocks * 0.03, 0.30);
  const gadgetBonusRate = gadgetCount >= 1 ? 0.04 : 0;

  const calculatedItems = items.map(item => {
    const origSubtotal = item.price * item.quantity;
    const itemDiscounts = [];

    if (item.category === 'T-Shirts' && tshirtBaseRate > 0) {
      itemDiscounts.push({
        rule: 'T-Shirt Base Discount (5%)',
        amount: origSubtotal * tshirtBaseRate
      });
    }

    if (item.category === 'T-Shirts' && tshirtQuantityRate > 0) {
      itemDiscounts.push({
        rule: `T-Shirt Quantity Discount (${Math.round(tshirtQuantityRate * 100)}%)`,
        amount: origSubtotal * tshirtQuantityRate
      });
    }

    if (item.category === 'T-Shirts' && tshirtBonusRate > 0) {
      itemDiscounts.push({
        rule: 'T-Shirt Category Bonus (4%)',
        amount: origSubtotal * tshirtBonusRate
      });
    }

    if (item.category === 'Tech Gadgets' && gadgetBaseRate > 0) {
      itemDiscounts.push({
        rule: 'Tech Gadget Base Discount (5%)',
        amount: origSubtotal * gadgetBaseRate
      });
    }

    if (item.category === 'Tech Gadgets' && gadgetQuantityRate > 0) {
      itemDiscounts.push({
        rule: `Tech Gadget Quantity Discount (${Math.round(gadgetQuantityRate * 100)}%)`,
        amount: origSubtotal * gadgetQuantityRate
      });
    }

    if (item.category === 'Tech Gadgets' && gadgetBonusRate > 0) {
      itemDiscounts.push({
        rule: 'Tech Gadget Category Bonus (4%)',
        amount: origSubtotal * gadgetBonusRate
      });
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

  const totalRawDiscount = calculatedItems.reduce((sum, item) => sum + item.rawDiscountTotal, 0);
  const capLimit = totalSubtotal * 0.20;
  const isCapped = totalRawDiscount > capLimit;
  const scaleFactor = isCapped ? (capLimit / totalRawDiscount) : 1;

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

  const appliedDiscounts = [];

  if (tshirtCount >= 1) {
    const amount = tshirtSubtotal * tshirtBaseRate * scaleFactor;
    if (amount > 0) {
      appliedDiscounts.push({
        rule: 'T-Shirt Base Discount (5%)',
        amount: Math.round(amount * 100) / 100
      });
    }
  }

  if (tshirtCount >= 5) {
    const amount = tshirtSubtotal * tshirtQuantityRate * scaleFactor;
    if (amount > 0) {
      appliedDiscounts.push({
        rule: `T-Shirt Quantity Discount (${Math.round(tshirtQuantityRate * 100)}%)`,
        amount: Math.round(amount * 100) / 100
      });
    }
  }

  if (tshirtCount >= 1) {
    const amount = tshirtSubtotal * tshirtBonusRate * scaleFactor;
    if (amount > 0) {
      appliedDiscounts.push({
        rule: 'T-Shirt Category Bonus (4%)',
        amount: Math.round(amount * 100) / 100
      });
    }
  }

  if (gadgetCount >= 1) {
    const amount = gadgetSubtotal * gadgetBaseRate * scaleFactor;
    if (amount > 0) {
      appliedDiscounts.push({
        rule: 'Tech Gadget Base Discount (5%)',
        amount: Math.round(amount * 100) / 100
      });
    }
  }

  if (gadgetCount >= 5) {
    const amount = gadgetSubtotal * gadgetQuantityRate * scaleFactor;
    if (amount > 0) {
      appliedDiscounts.push({
        rule: `Tech Gadget Quantity Discount (${Math.round(gadgetQuantityRate * 100)}%)`,
        amount: Math.round(amount * 100) / 100
      });
    }
  }

  if (gadgetCount >= 1) {
    const amount = gadgetSubtotal * gadgetBonusRate * scaleFactor;
    if (amount > 0) {
      appliedDiscounts.push({
        rule: 'Tech Gadget Category Bonus (4%)',
        amount: Math.round(amount * 100) / 100
      });
    }
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
