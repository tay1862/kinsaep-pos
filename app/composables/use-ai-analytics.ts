// composables/use-ai-analytics.ts
// 🧠 AI-Powered Analytics & Recommendations

import { ref, computed } from 'vue';
import type { 
  Product, 
  Order, 
  SalesInsight, 
  ProductRecommendation,
  StaffPerformance 
} from '~/types';

export const useAIAnalytics = () => {
  // State
  const insights = ref<SalesInsight[]>([]);
  const recommendations = ref<ProductRecommendation[]>([]);
  const isAnalyzing = ref(false);
  const lastAnalysis = ref<string | null>(null);

  // Sample order history (replace with real data)
  const orderHistory = ref<Order[]>([]);

  /**
   * Analyze sales data and generate insights
   */
  const analyzeSales = async (orders: Order[]) => {
    isAnalyzing.value = true;
    orderHistory.value = orders;

    try {
      // Calculate metrics
      const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
      const avgOrderValue = totalSales / orders.length || 0;
      
      // Product frequency analysis
      const productSales = new Map<string, { count: number; revenue: number; name: string }>();
      orders.forEach(order => {
        order.items.forEach(item => {
          const existing = productSales.get(item.productId) || { count: 0, revenue: 0, name: item.product.name };
          productSales.set(item.productId, {
            count: existing.count + item.quantity,
            revenue: existing.revenue + item.total,
            name: item.product.name,
          });
        });
      });

      // Time-based analysis
      const hourlyDistribution = new Map<number, number>();
      orders.forEach(order => {
        const hour = new Date(order.date).getHours();
        hourlyDistribution.set(hour, (hourlyDistribution.get(hour) || 0) + 1);
      });

      // Generate insights
      const newInsights: SalesInsight[] = [];

      // Top selling product insight
      const sortedProducts = Array.from(productSales.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue);
      
      const topProduct = sortedProducts[0];
      if (topProduct) {
        const [topProductId, topData] = topProduct;
        newInsights.push({
          type: 'trend',
          title: '🏆 Top Seller',
          description: `${topData.name} is your best seller with ${topData.count} units sold!`,
          confidence: 0.95,
          data: { productId: topProductId, ...topData },
          createdAt: new Date().toISOString(),
        });
      }

      // Peak hours insight
      const sortedHours = Array.from(hourlyDistribution.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const peakHourData = sortedHours[0];
      if (peakHourData) {
        const [peakHour, orderCount] = peakHourData;
        newInsights.push({
          type: 'recommendation',
          title: '⏰ Peak Hours',
          description: `${peakHour}:00-${peakHour + 1}:00 is your busiest hour with ${orderCount} orders. Consider adding staff!`,
          confidence: 0.85,
          data: { peakHour, orderCount },
          createdAt: new Date().toISOString(),
        });
      }

      // Low stock alert (mock)
      newInsights.push({
        type: 'alert',
        title: '⚠️ Low Stock Alert',
        description: 'Beer Lao is running low! Consider restocking soon.',
        confidence: 0.9,
        data: { productId: '2', currentStock: 5, minStock: 10 },
        createdAt: new Date().toISOString(),
      });

      // Upsell opportunity
      if (avgOrderValue < 50000) {
        newInsights.push({
          type: 'upsell',
          title: '💡 Upsell Opportunity',
          description: `Average order is ₭${avgOrderValue.toLocaleString()}. Suggest combos to increase to ₭50,000+!`,
          confidence: 0.75,
          data: { avgOrderValue, targetOrderValue: 50000 },
          createdAt: new Date().toISOString(),
        });
      }

      insights.value = newInsights;
      lastAnalysis.value = new Date().toISOString();

    } catch (e) {
      console.error('Analysis error:', e);
    } finally {
      isAnalyzing.value = false;
    }
  };

  /**
   * Get product recommendations based on cart
   */
  const getRecommendations = (cartProductIds: string[], allProducts: Product[]): ProductRecommendation[] => {
    const recs: ProductRecommendation[] = [];

    // Find complementary products (not in cart)
    const notInCart = allProducts.filter(p => !cartProductIds.includes(p.id));

    // Simple recommendation logic (can be enhanced with ML)
    notInCart.forEach(product => {
      let score = 0;
      let reason = '';
      let basedOn: ProductRecommendation['basedOn'] = 'complementary';

      // If cart has food, recommend drinks
      const hasFood = cartProductIds.some(id => {
        const p = allProducts.find(prod => prod.id === id);
        return p?.categoryId === 'food';
      });

      if (hasFood && product.categoryId === 'drinks') {
        score = 0.8;
        reason = 'Perfect drink to go with your meal!';
        basedOn = 'complementary';
      }

      // Popular items
      if ((product.popularityScore || 0) > 70) {
        score = Math.max(score, 0.7);
        reason = reason || 'Customer favorite!';
        basedOn = 'popular';
      }

      if (score > 0.5) {
        recs.push({
          productId: product.id,
          product,
          reason,
          score,
          basedOn,
        });
      }
    });

    // Sort by score and return top 3
    return recs.sort((a, b) => b.score - a.score).slice(0, 3);
  };

  /**
   * Analyze staff performance
   */
  const analyzeStaffPerformance = (orders: Order[], staffId: string): StaffPerformance => {
    const staffOrders = orders.filter(o => o.branch === staffId); // Simplified

    const totalSales = staffOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = staffOrders.length;
    const avgOrderValue = totalSales / orderCount || 0;

    // Find top products sold by staff
    const productCounts = new Map<string, number>();
    staffOrders.forEach(order => {
      order.items.forEach(item => {
        productCounts.set(
          item.product.name,
          (productCounts.get(item.product.name) || 0) + item.quantity
        );
      });
    });

    const topProducts = Array.from(productCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return {
      staffId,
      name: `Staff ${staffId}`,
      totalSales,
      orderCount,
      avgOrderValue,
      topProducts,
      rating: Math.min(5, (avgOrderValue / 10000) + (orderCount / 20)),
    };
  };

  /**
   * Predict busy periods
   */
  const predictBusyPeriods = (orders: Order[]): { hour: number; expected: number }[] => {
    const hourCounts = new Map<number, number[]>();

    orders.forEach(order => {
      const hour = new Date(order.date).getHours();
      const dayOrders = hourCounts.get(hour) || [];
      dayOrders.push(order.total);
      hourCounts.set(hour, dayOrders);
    });

    return Array.from(hourCounts.entries())
      .map(([hour, amounts]) => ({
        hour,
        expected: amounts.length / 7, // Average per day (assuming 7 days of data)
      }))
      .sort((a, b) => a.hour - b.hour);
  };

  /**
   * Generate daily summary
   */
  const generateDailySummary = (orders: Order[]): string => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.date).toDateString() === today);

    const totalSales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = todayOrders.length;
    const avgOrder = totalSales / totalOrders || 0;

    const lightningOrders = todayOrders.filter(o => 
      o.paymentMethod === 'lightning' || o.paymentMethod === 'bolt12'
    ).length;

    return `
📊 **Daily Summary**
━━━━━━━━━━━━━━━━
💰 Total Sales: ₭${totalSales.toLocaleString()}
📦 Orders: ${totalOrders}
💳 Avg Order: ₭${Math.round(avgOrder).toLocaleString()}
⚡ Lightning: ${lightningOrders} (${Math.round(lightningOrders / totalOrders * 100) || 0}%)
━━━━━━━━━━━━━━━━
    `.trim();
  };

  // Computed
  const topInsight = computed(() => insights.value[0] || null);
  
  const hasAlerts = computed(() => 
    insights.value.some(i => i.type === 'alert')
  );

  const alertCount = computed(() => 
    insights.value.filter(i => i.type === 'alert').length
  );

  return {
    // State
    insights,
    recommendations,
    isAnalyzing,
    lastAnalysis,

    // Computed
    topInsight,
    hasAlerts,
    alertCount,

    // Methods
    analyzeSales,
    getRecommendations,
    analyzeStaffPerformance,
    predictBusyPeriods,
    generateDailySummary,
  };
};
