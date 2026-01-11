// composables/use-hasura.ts
// 🚀 Hasura GraphQL Integration for bnos.space
// Provides type-safe GraphQL operations with Hasura backend

import type {
  Product,
  Order,
  OrderItem,
  Branch,
  Category,
  Unit,
  LoyaltyMember,
  EReceipt,
  PaymentProof,
} from "~/types";

// GraphQL Response Types
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: Record<string, unknown>;
  }>;
}

// Hasura Configuration
interface HasuraConfig {
  endpoint: string;
  adminSecret?: string;
  headers?: Record<string, string>;
}

export function useHasura() {
  const config = useRuntimeConfig();

  // Default Hasura configuration
  const hasuraConfig = ref<HasuraConfig>({
    endpoint:
      config.public.hasuraEndpoint || "http://localhost:8080/v1/graphql",
    adminSecret: config.hasuraAdminSecret,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Loading and error states
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Execute a GraphQL query/mutation against Hasura
   */
  async function executeGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): Promise<T | null> {
    loading.value = true;
    error.value = null;

    try {
      const headers: Record<string, string> = {
        ...hasuraConfig.value.headers,
      };

      // Add admin secret if available
      if (hasuraConfig.value.adminSecret) {
        headers["x-hasura-admin-secret"] = hasuraConfig.value.adminSecret;
      }

      const response = await $fetch<GraphQLResponse<T>>(
        hasuraConfig.value.endpoint,
        {
          method: "POST",
          headers,
          body: {
            query,
            variables,
            operationName,
          },
        }
      );

      if (response.errors && response.errors.length > 0) {
        error.value = response.errors[0].message;
        console.error("GraphQL Error:", response.errors);
        return null;
      }

      return response.data || null;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Hasura Error:", err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // PRODUCT OPERATIONS
  // ============================================

  /**
   * Fetch all products with optional filters
   */
  async function getProducts(filters?: {
    branchId?: string;
    categoryId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    const query = `
      query GetProducts($branchId: uuid, $categoryId: uuid, $status: String, $limit: Int, $offset: Int) {
        products(
          where: {
            branch_id: { _eq: $branchId }
            category_id: { _eq: $categoryId }
            status: { _eq: $status }
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          name
          sku
          description
          category_id
          unit_id
          price
          stock
          min_stock
          branch_id
          status
          image
          created_at
          updated_at
          category {
            id
            name
          }
          unit {
            id
            name
            symbol
          }
        }
      }
    `;

    const result = await executeGraphQL<{ products: Product[] }>(
      query,
      filters
    );
    return result?.products || [];
  }

  /**
   * Create a new product
   */
  async function createProduct(
    product: Omit<Product, "id" | "createdAt" | "updatedAt">
  ): Promise<Product | null> {
    const mutation = `
      mutation CreateProduct($object: products_insert_input!) {
        insert_products_one(object: $object) {
          id
          name
          sku
          description
          category_id
          unit_id
          price
          stock
          min_stock
          branch_id
          status
          image
          created_at
          updated_at
        }
      }
    `;

    const result = await executeGraphQL<{ insert_products_one: Product }>(
      mutation,
      {
        object: {
          name: product.name,
          sku: product.sku,
          description: product.description,
          category_id: product.categoryId,
          unit_id: product.unitId,
          price: product.price,
          stock: product.stock,
          min_stock: product.minStock,
          branch_id: product.branchId,
          status: product.status,
          image: product.image,
        },
      }
    );

    return result?.insert_products_one || null;
  }

  /**
   * Update an existing product
   */
  async function updateProduct(
    id: string,
    updates: Partial<Product>
  ): Promise<Product | null> {
    const mutation = `
      mutation UpdateProduct($id: uuid!, $updates: products_set_input!) {
        update_products_by_pk(pk_columns: { id: $id }, _set: $updates) {
          id
          name
          sku
          description
          category_id
          unit_id
          price
          stock
          min_stock
          branch_id
          status
          image
          created_at
          updated_at
        }
      }
    `;

    const result = await executeGraphQL<{ update_products_by_pk: Product }>(
      mutation,
      {
        id,
        updates: {
          name: updates.name,
          sku: updates.sku,
          description: updates.description,
          price: updates.price,
          stock: updates.stock,
          min_stock: updates.minStock,
          status: updates.status,
          image: updates.image,
        },
      }
    );

    return result?.update_products_by_pk || null;
  }

  /**
   * Update product stock
   */
  async function updateStock(
    productId: string,
    quantity: number,
    operation: "add" | "subtract" | "set"
  ): Promise<boolean> {
    let mutation: string;

    if (operation === "set") {
      mutation = `
        mutation SetStock($id: uuid!, $stock: Int!) {
          update_products_by_pk(pk_columns: { id: $id }, _set: { stock: $stock }) {
            id
            stock
          }
        }
      `;
    } else {
      const increment = operation === "add" ? quantity : -quantity;
      mutation = `
        mutation UpdateStock($id: uuid!, $increment: Int!) {
          update_products_by_pk(pk_columns: { id: $id }, _inc: { stock: $increment }) {
            id
            stock
          }
        }
      `;
    }

    const result = await executeGraphQL<{
      update_products_by_pk: { id: string };
    }>(
      mutation,
      operation === "set"
        ? { id: productId, stock: quantity }
        : { id: productId, increment: quantity }
    );

    return result?.update_products_by_pk !== null;
  }

  // ============================================
  // ORDER OPERATIONS
  // ============================================

  /**
   * Fetch orders with filters
   */
  async function getOrders(filters?: {
    branchId?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<Order[]> {
    const query = `
      query GetOrders(
        $branchId: uuid
        $status: String
        $customerId: uuid
        $startDate: timestamptz
        $endDate: timestamptz
        $limit: Int
        $offset: Int
      ) {
        orders(
          where: {
            branch_id: { _eq: $branchId }
            status: { _eq: $status }
            customer_id: { _eq: $customerId }
            created_at: { _gte: $startDate, _lte: $endDate }
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          customer_name
          customer_pubkey
          branch_id
          total
          total_sats
          currency
          status
          payment_method
          notes
          tip
          loyalty_points_earned
          created_at
          updated_at
          order_items {
            id
            product_id
            quantity
            price
            total
            product {
              id
              name
              sku
            }
          }
        }
      }
    `;

    const result = await executeGraphQL<{ orders: Order[] }>(query, filters);
    return result?.orders || [];
  }

  /**
   * Create a new order
   */
  async function createOrder(order: {
    customer: string;
    customerPubkey?: string;
    branchId: string;
    total: number;
    totalSats?: number;
    currency: string;
    paymentMethod: string;
    notes?: string;
    tip?: number;
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
      total: number;
    }>;
  }): Promise<Order | null> {
    const mutation = `
      mutation CreateOrder($order: orders_insert_input!) {
        insert_orders_one(object: $order) {
          id
          customer_name
          branch_id
          total
          status
          payment_method
          created_at
          order_items {
            id
            product_id
            quantity
            price
            total
          }
        }
      }
    `;

    const result = await executeGraphQL<{ insert_orders_one: Order }>(
      mutation,
      {
        order: {
          customer_name: order.customer,
          customer_pubkey: order.customerPubkey,
          branch_id: order.branchId,
          total: order.total,
          total_sats: order.totalSats,
          currency: order.currency,
          status: "pending",
          payment_method: order.paymentMethod,
          notes: order.notes,
          tip: order.tip,
          order_items: {
            data: order.items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
            })),
          },
        },
      }
    );

    return result?.insert_orders_one || null;
  }

  /**
   * Update order status
   */
  async function updateOrderStatus(
    orderId: string,
    status: string
  ): Promise<boolean> {
    const mutation = `
      mutation UpdateOrderStatus($id: uuid!, $status: String!) {
        update_orders_by_pk(pk_columns: { id: $id }, _set: { status: $status }) {
          id
          status
        }
      }
    `;

    const result = await executeGraphQL<{
      update_orders_by_pk: { id: string };
    }>(mutation, {
      id: orderId,
      status,
    });

    return result?.update_orders_by_pk !== null;
  }

  // ============================================
  // CUSTOMER / LOYALTY OPERATIONS
  // ============================================

  /**
   * Fetch customers
   */
  async function getCustomers(filters?: {
    tier?: string;
    limit?: number;
    offset?: number;
  }): Promise<LoyaltyMember[]> {
    const query = `
      query GetCustomers($tier: String, $limit: Int, $offset: Int) {
        loyalty_members(
          where: { tier: { _eq: $tier } }
          limit: $limit
          offset: $offset
          order_by: { total_spent: desc }
        ) {
          id
          nostr_pubkey
          points
          tier
          total_spent
          visit_count
          last_visit
          joined_at
        }
      }
    `;

    const result = await executeGraphQL<{ loyalty_members: LoyaltyMember[] }>(
      query,
      filters
    );
    return result?.loyalty_members || [];
  }

  /**
   * Add loyalty points to a customer
   */
  async function addLoyaltyPoints(
    memberId: string,
    points: number,
    reason: string
  ): Promise<boolean> {
    const mutation = `
      mutation AddLoyaltyPoints($id: uuid!, $points: Int!, $reason: String!) {
        update_loyalty_members_by_pk(
          pk_columns: { id: $id }
          _inc: { points: $points }
        ) {
          id
          points
        }
        insert_loyalty_transactions_one(object: {
          member_id: $id
          points: $points
          type: "earn"
          reason: $reason
        }) {
          id
        }
      }
    `;

    const result = await executeGraphQL<{
      update_loyalty_members_by_pk: { id: string };
    }>(mutation, {
      id: memberId,
      points,
      reason,
    });

    return result?.update_loyalty_members_by_pk !== null;
  }

  // ============================================
  // BRANCH & META OPERATIONS
  // ============================================

  /**
   * Fetch all branches
   */
  async function getBranches(): Promise<Branch[]> {
    const query = `
      query GetBranches {
        branches(order_by: { name: asc }) {
          id
          name
          code
          nostr_pubkey
          bolt12_offer
          address
        }
      }
    `;

    const result = await executeGraphQL<{ branches: Branch[] }>(query);
    return result?.branches || [];
  }

  /**
   * Fetch all categories
   */
  async function getCategories(): Promise<Category[]> {
    const query = `
      query GetCategories {
        categories(order_by: { name: asc }) {
          id
          name
          description
        }
      }
    `;

    const result = await executeGraphQL<{ categories: Category[] }>(query);
    return result?.categories || [];
  }

  /**
   * Fetch all units
   */
  async function getUnits(): Promise<Unit[]> {
    const query = `
      query GetUnits {
        units(order_by: { name: asc }) {
          id
          name
          symbol
        }
      }
    `;

    const result = await executeGraphQL<{ units: Unit[] }>(query);
    return result?.units || [];
  }

  // ============================================
  // ANALYTICS OPERATIONS
  // ============================================

  /**
   * Get sales analytics
   */
  async function getSalesAnalytics(filters: {
    branchId?: string;
    startDate: string;
    endDate: string;
  }): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: Array<{
      productId: string;
      name: string;
      quantity: number;
      revenue: number;
    }>;
  } | null> {
    const query = `
      query GetSalesAnalytics($branchId: uuid, $startDate: timestamptz!, $endDate: timestamptz!) {
        orders_aggregate(
          where: {
            branch_id: { _eq: $branchId }
            created_at: { _gte: $startDate, _lte: $endDate }
            status: { _eq: "completed" }
          }
        ) {
          aggregate {
            sum {
              total
            }
            count
            avg {
              total
            }
          }
        }
        top_products: order_items(
          where: {
            order: {
              branch_id: { _eq: $branchId }
              created_at: { _gte: $startDate, _lte: $endDate }
              status: { _eq: "completed" }
            }
          }
          order_by: { quantity: desc }
          limit: 10
        ) {
          product_id
          product {
            name
          }
          quantity
          total
        }
      }
    `;

    const result = await executeGraphQL<{
      orders_aggregate: {
        aggregate: {
          sum: { total: number };
          count: number;
          avg: { total: number };
        };
      };
      top_products: Array<{
        product_id: string;
        product: { name: string };
        quantity: number;
        total: number;
      }>;
    }>(query, filters);

    if (!result) return null;

    return {
      totalRevenue: result.orders_aggregate.aggregate.sum.total || 0,
      totalOrders: result.orders_aggregate.aggregate.count || 0,
      averageOrderValue: result.orders_aggregate.aggregate.avg.total || 0,
      topProducts: result.top_products.map((p) => ({
        productId: p.product_id,
        name: p.product.name,
        quantity: p.quantity,
        revenue: p.total,
      })),
    };
  }

  // ============================================
  // SUBSCRIPTION HELPERS
  // ============================================

  /**
   * Subscribe to real-time order updates (WebSocket)
   */
  function subscribeToOrders(
    branchId: string,
    callback: (order: Order) => void
  ): () => void {
    // WebSocket subscription implementation
    // This would use Hasura's subscription feature
    const subscriptionQuery = `
      subscription OnOrderCreated($branchId: uuid!) {
        orders(
          where: { branch_id: { _eq: $branchId } }
          order_by: { created_at: desc }
          limit: 1
        ) {
          id
          customer_name
          total
          status
          created_at
        }
      }
    `;

    // TODO: Implement WebSocket connection
    console.log("Subscription query:", subscriptionQuery, branchId);

    // Return unsubscribe function
    return () => {
      // Close WebSocket connection
    };
  }

  return {
    // State
    loading,
    error,

    // Configuration
    hasuraConfig,

    // Core
    executeGraphQL,

    // Products
    getProducts,
    createProduct,
    updateProduct,
    updateStock,

    // Orders
    getOrders,
    createOrder,
    updateOrderStatus,

    // Customers/Loyalty
    getCustomers,
    addLoyaltyPoints,

    // Meta
    getBranches,
    getCategories,
    getUnits,

    // Analytics
    getSalesAnalytics,

    // Subscriptions
    subscribeToOrders,
  };
}
