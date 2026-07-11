const assert = require('assert');
const test = require('node:test');
const { calculateDiscounts } = require('../utils/discountEngine');

test('applies base, quantity, and category bonus discounts per category', () => {
  const items = [
    { product: '1', name: 'T-Shirt', category: 'T-Shirts', price: 100, quantity: 6 },
    { product: '2', name: 'Tech Gadget', category: 'Tech Gadgets', price: 100, quantity: 10 }
  ];

  const result = calculateDiscounts(items);

  assert.strictEqual(result.totalDiscount, 216);
  assert.strictEqual(result.finalPayable, 1384);
  assert.deepStrictEqual(
    result.appliedDiscounts.map((d) => d.rule),
    [
      'T-Shirt Base Discount (5%)',
      'T-Shirt Quantity Discount (2%)',
      'T-Shirt Category Bonus (4%)',
      'Tech Gadget Base Discount (5%)',
      'Tech Gadget Quantity Discount (6%)',
      'Tech Gadget Category Bonus (4%)'
    ]
  );
});
