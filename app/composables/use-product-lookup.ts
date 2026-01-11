// composables/use-product-lookup.ts
// 🔍 Public Product Lookup - Open Food Facts, Barcode, Nostr Marketplace

export interface PublicProduct {
  id: string;
  name: string;
  nameLao?: string;
  description?: string;
  barcode?: string;
  image?: string;
  brand?: string;
  category?: string;
  suggestedPrice?: number;
  source: "openfoodfacts" | "barcode" | "nostr" | "template";
  sourceData?: Record<string, unknown>;
}

export interface ProductSearchResult {
  products: PublicProduct[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
}

// Open Food Facts API interface
interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_small_url?: string;
  image_front_url?: string;
  quantity?: string;
}

interface OFFSearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: OFFProduct[];
}

interface OFFBarcodeResponse {
  status: number;
  product?: OFFProduct;
}

export function useProductLookup() {
  const isSearching = ref(false);
  const isLoadingMore = ref(false);
  const searchResults = ref<PublicProduct[]>([]);
  const searchError = ref<string | null>(null);
  const searchTotal = ref(0);
  const currentPage = ref(1);
  const currentQuery = ref("");
  const hasMore = computed(
    () => searchResults.value.length < searchTotal.value
  );

  // Open Food Facts API Base URL
  const OFF_API_BASE = "https://world.openfoodfacts.org";

  /**
   * Convert Open Food Facts product to PublicProduct
   */
  function offToPublicProduct(offProduct: OFFProduct): PublicProduct {
    return {
      id: `off-${offProduct.code}`,
      name:
        offProduct.product_name ||
        offProduct.product_name_en ||
        "Unknown Product",
      description: offProduct.quantity || undefined,
      barcode: offProduct.code,
      image:
        offProduct.image_front_url ||
        offProduct.image_small_url ||
        offProduct.image_url,
      brand: offProduct.brands,
      category: offProduct.categories?.split(",")[0]?.trim(),
      source: "openfoodfacts",
      sourceData: offProduct as unknown as Record<string, unknown>,
    };
  }

  /**
   * Search Open Food Facts database
   */
  async function searchOpenFoodFacts(
    query: string,
    page = 1,
    append = false
  ): Promise<PublicProduct[]> {
    if (!query.trim()) return [];

    // If new search, reset
    if (!append) {
      isSearching.value = true;
      searchResults.value = [];
      currentPage.value = 1;
    } else {
      isLoadingMore.value = true;
    }

    searchError.value = null;
    currentQuery.value = query;

    try {
      const response = await $fetch<OFFSearchResponse>(
        `${OFF_API_BASE}/cgi/search.pl`,
        {
          params: {
            search_terms: query,
            search_simple: 1,
            action: "process",
            json: 1,
            page_size: 20,
            page,
            fields:
              "code,product_name,product_name_en,brands,categories,image_url,image_small_url,image_front_url,quantity",
          },
        }
      );

      const products = response.products?.map(offToPublicProduct) || [];
      searchTotal.value = response.count || 0;
      currentPage.value = page;

      if (append) {
        // Append to existing results
        searchResults.value = [...searchResults.value, ...products];
      } else {
        searchResults.value = products;
      }

      return products;
    } catch (error) {
      searchError.value = `Search failed: ${error}`;
      console.error("Open Food Facts search error:", error);
      return [];
    } finally {
      isSearching.value = false;
      isLoadingMore.value = false;
    }
  }

  /**
   * Load more results
   */
  async function loadMore(): Promise<PublicProduct[]> {
    if (!hasMore.value || isLoadingMore.value || !currentQuery.value) return [];
    return searchOpenFoodFacts(currentQuery.value, currentPage.value + 1, true);
  }

  /**
   * Lookup product by barcode
   */
  async function lookupBarcode(barcode: string): Promise<PublicProduct | null> {
    if (!barcode.trim()) return null;

    isSearching.value = true;
    searchError.value = null;

    try {
      const response = await $fetch<OFFBarcodeResponse>(
        `${OFF_API_BASE}/api/v2/product/${barcode}`,
        {
          params: {
            fields:
              "code,product_name,product_name_en,brands,categories,image_url,image_small_url,image_front_url,quantity",
          },
        }
      );

      if (response.status === 1 && response.product) {
        const product = offToPublicProduct(response.product);
        searchResults.value = [product];
        searchTotal.value = 1;
        return product;
      }

      searchError.value = "Product not found in database";
      return null;
    } catch (error) {
      searchError.value = `Barcode lookup failed: ${error}`;
      console.error("Barcode lookup error:", error);
      return null;
    } finally {
      isSearching.value = false;
    }
  }

  // ============================================
  // 🍲 TheMealDB API - Free Meal/Recipe Database
  // ============================================

  interface MealDBMeal {
    idMeal: string;
    strMeal: string;
    strCategory: string;
    strArea: string;
    strMealThumb: string;
    strInstructions?: string;
  }

  interface MealDBResponse {
    meals: MealDBMeal[] | null;
  }

  /**
   * Search TheMealDB for meals/recipes
   * Free API: https://www.themealdb.com/api.php
   */
  async function searchTheMealDB(query: string): Promise<PublicProduct[]> {
    if (!query.trim()) return [];

    isSearching.value = true;
    searchError.value = null;

    try {
      const response = await $fetch<MealDBResponse>(
        `https://www.themealdb.com/api/json/v1/1/search.php`,
        { params: { s: query } }
      );

      const products: PublicProduct[] = (response.meals || []).map((meal) => ({
        id: `meal-${meal.idMeal}`,
        name: meal.strMeal,
        description: `${meal.strCategory} • ${meal.strArea}`,
        category: meal.strCategory,
        image: meal.strMealThumb,
        source: "template" as const,
        sourceData: { api: "themealdb", meal },
      }));

      searchResults.value = products;
      searchTotal.value = products.length;
      return products;
    } catch (error) {
      searchError.value = `MealDB search failed: ${error}`;
      console.error("TheMealDB search error:", error);
      return [];
    } finally {
      isSearching.value = false;
    }
  }

  // ============================================
  // 🍹 TheCocktailDB API - Free Drink Database
  // ============================================

  interface CocktailDBDrink {
    idDrink: string;
    strDrink: string;
    strCategory: string;
    strDrinkThumb: string;
    strInstructions?: string;
  }

  interface CocktailDBResponse {
    drinks: CocktailDBDrink[] | null;
  }

  /**
   * Search TheCocktailDB for drinks
   * Free API: https://www.thecocktaildb.com/api.php
   */
  async function searchTheCocktailDB(query: string): Promise<PublicProduct[]> {
    if (!query.trim()) return [];

    isSearching.value = true;
    searchError.value = null;

    try {
      const response = await $fetch<CocktailDBResponse>(
        `https://www.thecocktaildb.com/api/json/v1/1/search.php`,
        { params: { s: query } }
      );

      const products: PublicProduct[] = (response.drinks || []).map(
        (drink) => ({
          id: `drink-${drink.idDrink}`,
          name: drink.strDrink,
          description: drink.strCategory,
          category: drink.strCategory,
          image: drink.strDrinkThumb,
          source: "template" as const,
          sourceData: { api: "thecocktaildb", drink },
        })
      );

      searchResults.value = products;
      searchTotal.value = products.length;
      return products;
    } catch (error) {
      searchError.value = `CocktailDB search failed: ${error}`;
      console.error("TheCocktailDB search error:", error);
      return [];
    } finally {
      isSearching.value = false;
    }
  }

  // ============================================
  // 🛒 Fake Store API - Mock E-commerce Products
  // ============================================

  interface FakeStoreProduct {
    id: number;
    title: string;
    price: number;
    description: string;
    category: string;
    image: string;
  }

  /**
   * Get products from Fake Store API (mock retail products)
   * Free API: https://fakestoreapi.com/
   */
  async function searchFakeStore(category?: string): Promise<PublicProduct[]> {
    isSearching.value = true;
    searchError.value = null;

    try {
      const url = category
        ? `https://fakestoreapi.com/products/category/${category}`
        : "https://fakestoreapi.com/products";

      const response = await $fetch<FakeStoreProduct[]>(url);

      const products: PublicProduct[] = response.map((item) => ({
        id: `fakestore-${item.id}`,
        name: item.title,
        description: item.description.slice(0, 100) + "...",
        category: item.category,
        image: item.image,
        suggestedPrice: Math.round(item.price * 20000), // Convert USD to LAK approx
        source: "template" as const,
        sourceData: { api: "fakestore", item },
      }));

      searchResults.value = products;
      searchTotal.value = products.length;
      return products;
    } catch (error) {
      searchError.value = `FakeStore search failed: ${error}`;
      console.error("FakeStore search error:", error);
      return [];
    } finally {
      isSearching.value = false;
    }
  }

  // ============================================
  // 🔄 Universal Search (All APIs)
  // ============================================

  /**
   * Search all external APIs and combine results
   */
  async function searchAllAPIs(query: string): Promise<PublicProduct[]> {
    if (!query.trim()) return [];

    isSearching.value = true;
    searchError.value = null;

    try {
      // Search all APIs in parallel
      const [meals, drinks, openFood] = await Promise.allSettled([
        searchTheMealDB(query),
        searchTheCocktailDB(query),
        searchOpenFoodFacts(query),
      ]);

      // Combine successful results
      const allProducts: PublicProduct[] = [];

      if (meals.status === "fulfilled") allProducts.push(...meals.value);
      if (drinks.status === "fulfilled") allProducts.push(...drinks.value);
      if (openFood.status === "fulfilled") allProducts.push(...openFood.value);

      searchResults.value = allProducts;
      searchTotal.value = allProducts.length;
      return allProducts;
    } catch (error) {
      searchError.value = `Multi-API search failed: ${error}`;
      console.error("Multi-API search error:", error);
      return [];
    } finally {
      isSearching.value = false;
    }
  }

  /**
   * Search Nostr marketplace for products
   * Uses NIP-15 Marketplace (kind: 30018)
   */
  async function searchNostrMarketplace(
    query: string
  ): Promise<PublicProduct[]> {
    // TODO: Implement Nostr marketplace search
    // This would query relays for kind:30018 events
    console.log("Nostr marketplace search not yet implemented:", query);
    return [];
  }

  /**
   * Clear search results
   */
  function clearSearch() {
    searchResults.value = [];
    searchTotal.value = 0;
    searchError.value = null;
    currentPage.value = 1;
    currentQuery.value = "";
  }

  /**
   * Popular product categories for browsing
   */
  const popularCategories = [
    {
      id: "beverages",
      name: "Beverages",
      nameLao: "ເຄື່ອງດື່ມ",
      icon: "🥤",
      query: "beverages",
    },
    {
      id: "snacks",
      name: "Snacks",
      nameLao: "ຂອງກິນຫຼິ້ນ",
      icon: "🍿",
      query: "snacks",
    },
    {
      id: "coffee",
      name: "Coffee",
      nameLao: "ກາເຟ",
      icon: "☕",
      query: "coffee",
    },
    { id: "dairy", name: "Dairy", nameLao: "ນົມ", icon: "🥛", query: "dairy" },
    {
      id: "noodles",
      name: "Noodles",
      nameLao: "ເສັ້ນ",
      icon: "🍜",
      query: "noodles instant",
    },
    {
      id: "candy",
      name: "Candy",
      nameLao: "ເຂົ້າໜົມຫວານ",
      icon: "🍬",
      query: "candy chocolate",
    },
  ];

  return {
    // State
    isSearching: readonly(isSearching),
    isLoadingMore: readonly(isLoadingMore),
    searchResults: readonly(searchResults),
    searchError: readonly(searchError),
    searchTotal: readonly(searchTotal),
    currentPage: readonly(currentPage),
    hasMore,
    popularCategories,

    // Methods
    searchOpenFoodFacts,
    searchTheMealDB,
    searchTheCocktailDB,
    searchFakeStore,
    searchAllAPIs,
    loadMore,
    lookupBarcode,
    searchNostrMarketplace,
    clearSearch,
  };
}
