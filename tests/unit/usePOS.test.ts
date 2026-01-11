import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePOS } from "../../app/composables/use-pos";
import type { Product } from "../../app/types";

// Mock dependencies
vi.mock("../../app/composables/use-currency", () => ({
  useCurrency: () => ({
    toSats: (val: number) => val * 1000,
    convert: (val: number) => val,
  }),
}));

describe("usePOS", () => {
  // Helper product
  const mockProduct: Product = {
    id: "p1",
    name: "Coffee",
    price: 20000,
    categoryId: "c1",
    images: [],
    isEnabled: true,
    createdAt: "",
    updatedAt: "",
  };

  it("should add items to cart and calculate totals", () => {
    const { addToCart, cart, clearCart } = usePOS();
    clearCart();

    // Add 1 Coffee
    addToCart(mockProduct, 1);

    expect(cart.value.items.length).toBe(1);
    expect(cart.value.total).toBe(20000);

    // Add 2 more Coffees (should merge)
    addToCart(mockProduct, 2);

    expect(cart.value.items.length).toBe(1);
    expect(cart.value.items[0].quantity).toBe(3);
    expect(cart.value.total).toBe(60000);
  });

  it("should calculate price with modifiers", () => {
    const { addToCart, cart, clearCart } = usePOS();
    clearCart();

    const modifier = { id: "m1", name: "Extra Shot", price: 5000 };

    // Add Coffee with Modifier
    addToCart(mockProduct, 1, {
      modifiers: [modifier],
    });

    expect(cart.value.total).toBe(25000); // 20k + 5k
  });

  it("should apply percentage discount", () => {
    const { addToCart, applyDiscount, cart, clearCart } = usePOS();
    clearCart();

    addToCart(mockProduct, 1); // 20,000

    // Apply 10% discount
    applyDiscount("percentage", 10);

    // 20,000 - 10% = 18,000
    expect(cart.value.total).toBe(18000);
  });
});
