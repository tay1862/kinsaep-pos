// data/shop-templates.ts
// 🏪 Predefined Shop Type Templates for Easy Store Setup

import type { ShopTypeConfig, ShopTypeMeta, ShopType } from "~/types";

// ============================================
// Shop Type Metadata
// ============================================

export const SHOP_TYPE_META: ShopTypeMeta[] = [
  {
    type: "cafe",
    name: "Cafe & Coffee Shop",
    nameLao: "ຮ້ານກາເຟ",
    icon: "i-heroicons-beaker",
    description: "Coffee, tea, pastries and light snacks",
    descriptionLao: "ກາເຟ, ຊາ, ເຂົ້າໜົມປັງ ແລະ ອາຫານຫວ່າງ",
  },
  {
    type: "restaurant",
    name: "Restaurant",
    nameLao: "ຮ້ານອາຫານ",
    icon: "i-heroicons-cake",
    description: "Full-service restaurant with dine-in",
    descriptionLao: "ຮ້ານອາຫານເຕັມຮູບແບບ ທີ່ມີບໍລິການນັ່ງກິນ",
  },
  {
    type: "retail",
    name: "Retail Store",
    nameLao: "ຮ້ານຂາຍຍ່ອຍ",
    icon: "i-heroicons-shopping-bag",
    description: "General merchandise and products",
    descriptionLao: "ສິນຄ້າທົ່ວໄປ ແລະ ຜະລິດຕະພັນ",
  },
  {
    type: "grocery",
    name: "Grocery & Mini Mart",
    nameLao: "ຮ້ານຂາຍເຄື່ອງ",
    icon: "i-heroicons-shopping-cart",
    description: "Food, beverages and daily essentials",
    descriptionLao: "ອາຫານ, ເຄື່ອງດື່ມ ແລະ ເຄື່ອງໃຊ້ປະຈຳວັນ",
  },
  {
    type: "service",
    name: "Service Business",
    nameLao: "ທຸລະກິດບໍລິການ",
    icon: "i-heroicons-wrench-screwdriver",
    description: "Services like salon, repair, laundry",
    descriptionLao: "ບໍລິການເຊັ່ນ ຮ້ານຕັດຜົມ, ສ້ອມແປງ, ຊັກລີດ",
  },
  {
    type: "pharmacy",
    name: "Pharmacy & Health",
    nameLao: "ຮ້ານຂາຍຢາ",
    icon: "i-heroicons-heart",
    description: "Medicine, health and wellness products",
    descriptionLao: "ຢາ, ຜະລິດຕະພັນສຸຂະພາບ",
  },
  {
    type: "gym",
    name: "Gym & Fitness",
    nameLao: "ຢິມຟິດເນັສ",
    icon: "i-heroicons-trophy",
    description: "Fitness center with memberships",
    descriptionLao: "ສູນຝຶກກາຍກາຍະພາບ ພ້ອມສະມາຊິກ",
  },
  {
    type: "karaoke",
    name: "Karaoke & Entertainment",
    nameLao: "ຄາລາໂອເກະ",
    icon: "i-heroicons-microphone",
    description: "Karaoke rooms with food and drinks",
    descriptionLao: "ຫ້ອງຮ້ອງເພງ ພ້ອມອາຫານ ແລະ ເຄື່ອງດື່ມ",
  },
  {
    type: "garage",
    name: "Garage & Auto Repair",
    nameLao: "ອູ່ຊ່ອມລົດ",
    icon: "i-heroicons-wrench",
    description: "Auto and motorcycle repair with parts",
    descriptionLao: "ຊ່ອມແປງລົດຍົນ ແລະ ລົດຈັກ ພ້ອມອະໄຫຼ່",
  },
  {
    type: "dry_clean",
    name: "Dry Cleaning & Laundry",
    nameLao: "ຮ້ານຊັກແຫ້ງ",
    icon: "i-heroicons-sparkles",
    description: "Dry cleaning, laundry and pressing services",
    descriptionLao: "ບໍລິການຊັກແຫ້ງ, ຊັກລີດ ແລະ ຮີດຜ້າ",
  },
  {
    type: "car_care",
    name: "Car Wash & Detailing",
    nameLao: "ຮ້ານລ້າງລົດ",
    icon: "i-heroicons-paint-brush",
    description: "Car washing, detailing and cleaning services",
    descriptionLao: "ບໍລິການລ້າງລົດ, ດູແລລົດ ແລະ ເຄື່ອງລ້າງລົດ",
  },
  {
    type: "noodles",
    name: "Noodle Shop",
    nameLao: "ຮ້ານເຝີ",
    icon: "i-heroicons-fire",
    description: "Noodle soups, dry noodles and Asian cuisine",
    descriptionLao: "ເຝີ, ເຂົ້າປຽກ, ແລະ ອາຫານເອເຊຍ",
  },
  {
    type: "enterprise",
    name: "Enterprise",
    nameLao: "ອົງກອນ",
    icon: "i-heroicons-building-office-2",
    description: "Full-featured for enterprise businesses",
    descriptionLao: "ຄຸນສົມບັດຄົບຖ້ວນ ສຳລັບທຸລະກິດອົງກອນ",
  },
  {
    type: "other",
    name: "Other",
    nameLao: "ອື່ນໆ",
    icon: "i-heroicons-squares-2x2",
    description: "Custom business type",
    descriptionLao: "ປະເພດທຸລະກິດແບບກຳນົດເອງ",
  },
];

// ============================================
// Shop Type Templates with Categories & Products
// ============================================

export const SHOP_TYPE_TEMPLATES: ShopTypeConfig[] = [
  // ========== CAFE ==========
  {
    type: "cafe",
    meta: SHOP_TYPE_META.find((m) => m.type === "cafe")!,
    categories: [
      {
        id: "cat-hot-drinks",
        name: "Hot Drinks",
        nameLao: "ເຄື່ອງດື່ມຮ້ອນ",
        icon: "☕",
        sortOrder: 1,
      },
      {
        id: "cat-cold-drinks",
        name: "Cold Drinks",
        nameLao: "ເຄື່ອງດື່ມເຢັນ",
        icon: "🧊",
        sortOrder: 2,
      },
      {
        id: "cat-pastries",
        name: "Pastries",
        nameLao: "ເຂົ້າໜົມປັງ",
        icon: "🥐",
        sortOrder: 3,
      },
      {
        id: "cat-snacks",
        name: "Snacks",
        nameLao: "ອາຫານຫວ່າງ",
        icon: "🍪",
        sortOrder: 4,
      },
    ],
    products: [
      {
        id: "prod-espresso",
        name: "Espresso",
        nameLao: "ເອັສເປຣສໂຊ",
        categoryId: "cat-hot-drinks",
        price: 15000,
        image:
          "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=400&fit=crop",
      },
      {
        id: "prod-americano",
        name: "Americano",
        nameLao: "ອາເມຣິກາໂນ",
        categoryId: "cat-hot-drinks",
        price: 18000,
        image:
          "https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=400&h=400&fit=crop",
      },
      {
        id: "prod-latte",
        name: "Latte",
        nameLao: "ລາເຕ້",
        categoryId: "cat-hot-drinks",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop",
      },
      {
        id: "prod-cappuccino",
        name: "Cappuccino",
        nameLao: "ຄາປູຊິໂນ",
        categoryId: "cat-hot-drinks",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop",
      },
      {
        id: "prod-hot-chocolate",
        name: "Hot Chocolate",
        nameLao: "ໂກໂກ້ຮ້ອນ",
        categoryId: "cat-hot-drinks",
        price: 22000,
        image:
          "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&h=400&fit=crop",
      },
      {
        id: "prod-iced-latte",
        name: "Iced Latte",
        nameLao: "ລາເຕ້ເຢັນ",
        categoryId: "cat-cold-drinks",
        price: 28000,
        image:
          "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=400&fit=crop",
      },
      {
        id: "prod-iced-mocha",
        name: "Iced Mocha",
        nameLao: "ໂມຄາເຢັນ",
        categoryId: "cat-cold-drinks",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1592663527359-cf6642f54cff?w=400&h=400&fit=crop",
      },
      {
        id: "prod-iced-tea",
        name: "Iced Tea",
        nameLao: "ຊາເຢັນ",
        categoryId: "cat-cold-drinks",
        price: 15000,
        image:
          "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop",
      },
      {
        id: "prod-smoothie",
        name: "Fruit Smoothie",
        nameLao: "ສະມູດຕີ້",
        categoryId: "cat-cold-drinks",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=400&fit=crop",
      },
      {
        id: "prod-croissant",
        name: "Croissant",
        nameLao: "ຄົວຊອງ",
        categoryId: "cat-pastries",
        price: 20000,
        image:
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop",
      },
      {
        id: "prod-muffin",
        name: "Muffin",
        nameLao: "ມັບຟິນ",
        categoryId: "cat-pastries",
        price: 18000,
        image:
          "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&h=400&fit=crop",
      },
      {
        id: "prod-sandwich",
        name: "Sandwich",
        nameLao: "ແຊນວິດ",
        categoryId: "cat-snacks",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=400&fit=crop",
      },
    ],
  },

  // ========== RESTAURANT ==========
  {
    type: "restaurant",
    meta: SHOP_TYPE_META.find((m) => m.type === "restaurant")!,
    categories: [
      {
        id: "cat-appetizers",
        name: "Appetizers",
        nameLao: "ອາຫານເລີ່ມຕົ້ນ",
        icon: "🥗",
        sortOrder: 1,
      },
      {
        id: "cat-main",
        name: "Main Course",
        nameLao: "ອາຫານຫຼັກ",
        icon: "🍛",
        sortOrder: 2,
      },
      {
        id: "cat-rice-noodles",
        name: "Rice & Noodles",
        nameLao: "ເຂົ້າ ແລະ ເຝີ",
        icon: "🍜",
        sortOrder: 3,
      },
      {
        id: "cat-drinks",
        name: "Drinks",
        nameLao: "ເຄື່ອງດື່ມ",
        icon: "🥤",
        sortOrder: 4,
      },
      {
        id: "cat-desserts",
        name: "Desserts",
        nameLao: "ຂອງຫວານ",
        icon: "🍨",
        sortOrder: 5,
      },
    ],
    products: [
      {
        id: "prod-spring-rolls",
        name: "Spring Rolls",
        nameLao: "ປໍເປ້ຍສົດ",
        categoryId: "cat-appetizers",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1548507200-e9df0fa8e0c6?w=400&h=400&fit=crop",
      },
      {
        id: "prod-soup",
        name: "Soup of the Day",
        nameLao: "ແກງວັນນີ້",
        categoryId: "cat-appetizers",
        price: 20000,
        image:
          "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop",
      },
      {
        id: "prod-laap",
        name: "Laap (Minced Meat Salad)",
        nameLao: "ລາບ",
        categoryId: "cat-main",
        price: 40000,
        image:
          "https://images.unsplash.com/photo-1623689046286-325e0e8e5a7c?w=400&h=400&fit=crop",
      },
      {
        id: "prod-ping-kai",
        name: "Grilled Chicken",
        nameLao: "ປີ້ງໄກ່",
        categoryId: "cat-main",
        price: 45000,
        image:
          "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop",
      },
      {
        id: "prod-fried-rice",
        name: "Fried Rice",
        nameLao: "ເຂົ້າຂຽວ",
        categoryId: "cat-rice-noodles",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=400&fit=crop",
      },
      {
        id: "prod-pho",
        name: "Pho Noodle Soup",
        nameLao: "ເຝີ",
        categoryId: "cat-rice-noodles",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=400&fit=crop",
      },
      {
        id: "prod-khao-piak",
        name: "Khao Piak Sen",
        nameLao: "ເຂົ້າປຽກເສັ້ນ",
        categoryId: "cat-rice-noodles",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop",
      },
      {
        id: "prod-water",
        name: "Bottled Water",
        nameLao: "ນ້ຳດື່ມ",
        categoryId: "cat-drinks",
        price: 5000,
        image:
          "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop",
      },
      {
        id: "prod-beer-lao",
        name: "Beer Lao",
        nameLao: "ເບຍລາວ",
        categoryId: "cat-drinks",
        price: 15000,
        image:
          "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop",
      },
      {
        id: "prod-sticky-rice-mango",
        name: "Mango Sticky Rice",
        nameLao: "ເຂົ້າໜຽວໝາກມ່ວງ",
        categoryId: "cat-desserts",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1621293954908-907159247fc8?w=400&h=400&fit=crop",
      },
    ],
  },

  // ========== RETAIL ==========
  {
    type: "retail",
    meta: SHOP_TYPE_META.find((m) => m.type === "retail")!,
    categories: [
      {
        id: "cat-electronics",
        name: "Electronics",
        nameLao: "ເຄື່ອງໃຊ້ໄຟຟ້າ",
        icon: "📱",
        sortOrder: 1,
      },
      {
        id: "cat-clothing",
        name: "Clothing",
        nameLao: "ເຄື່ອງນຸ່ງ",
        icon: "👕",
        sortOrder: 2,
      },
      {
        id: "cat-accessories",
        name: "Accessories",
        nameLao: "ເຄື່ອງປະດັບ",
        icon: "👜",
        sortOrder: 3,
      },
      {
        id: "cat-home",
        name: "Home & Living",
        nameLao: "ເຄື່ອງໃຊ້ໃນເຮືອນ",
        icon: "🏠",
        sortOrder: 4,
      },
    ],
    products: [], // Retail typically has custom products
  },

  // ========== GROCERY ==========
  {
    type: "grocery",
    meta: SHOP_TYPE_META.find((m) => m.type === "grocery")!,
    categories: [
      {
        id: "cat-fresh",
        name: "Fresh Produce",
        nameLao: "ຜັກ ແລະ ໝາກໄມ້",
        icon: "🥬",
        sortOrder: 1,
      },
      {
        id: "cat-beverages",
        name: "Beverages",
        nameLao: "ເຄື່ອງດື່ມ",
        icon: "🥤",
        sortOrder: 2,
      },
      {
        id: "cat-snacks-grocery",
        name: "Snacks",
        nameLao: "ອາຫານຂະບວນ",
        icon: "🍿",
        sortOrder: 3,
      },
      {
        id: "cat-daily",
        name: "Daily Essentials",
        nameLao: "ເຄື່ອງໃຊ້ປະຈຳວັນ",
        icon: "🧴",
        sortOrder: 4,
      },
      {
        id: "cat-frozen",
        name: "Frozen Foods",
        nameLao: "ອາຫານແຊ່ແຂງ",
        icon: "🧊",
        sortOrder: 5,
      },
    ],
    products: [
      {
        id: "prod-water-bottle",
        name: "Water 1.5L",
        nameLao: "ນ້ຳດື່ມ 1.5L",
        categoryId: "cat-beverages",
        price: 5000,
        image:
          "https://images.unsplash.com/photo-1560023907-5f339617ea55?w=400&h=400&fit=crop",
      },
      {
        id: "prod-coke",
        name: "Coca-Cola 330ml",
        nameLao: "ໂຄຄາ-ໂຄລາ 330ml",
        categoryId: "cat-beverages",
        price: 8000,
        image:
          "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop",
      },
      {
        id: "prod-chips",
        name: "Potato Chips",
        nameLao: "ມັນຕົ້ນທອດ",
        categoryId: "cat-snacks-grocery",
        price: 10000,
        image:
          "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop",
      },
      {
        id: "prod-instant-noodles",
        name: "Instant Noodles",
        nameLao: "ເຝີກ້ອນ",
        categoryId: "cat-snacks-grocery",
        price: 5000,
        image:
          "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=400&fit=crop",
      },
      {
        id: "prod-rice-5kg",
        name: "Rice 5kg",
        nameLao: "ເຂົ້າສານ 5kg",
        categoryId: "cat-daily",
        price: 50000,
        image:
          "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",
      },
      {
        id: "prod-cooking-oil",
        name: "Cooking Oil 1L",
        nameLao: "ນ້ຳມັນພືດ 1L",
        categoryId: "cat-daily",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop",
      },
    ],
  },

  // ========== SERVICE ==========
  {
    type: "service",
    meta: SHOP_TYPE_META.find((m) => m.type === "service")!,
    categories: [
      {
        id: "cat-services",
        name: "Services",
        nameLao: "ບໍລິການ",
        icon: "✂️",
        sortOrder: 1,
      },
      {
        id: "cat-packages",
        name: "Packages",
        nameLao: "ແພັກເກັດ",
        icon: "📦",
        sortOrder: 2,
      },
      {
        id: "cat-products-service",
        name: "Products",
        nameLao: "ຜະລິດຕະພັນ",
        icon: "🧴",
        sortOrder: 3,
      },
    ],
    products: [
      {
        id: "prod-haircut",
        name: "Haircut",
        nameLao: "ຕັດຜົມ",
        categoryId: "cat-services",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop",
      },
      {
        id: "prod-wash-cut",
        name: "Wash & Cut",
        nameLao: "ສະຜົມ ແລະ ຕັດ",
        categoryId: "cat-services",
        price: 40000,
        image:
          "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=400&fit=crop",
      },
      {
        id: "prod-coloring",
        name: "Hair Coloring",
        nameLao: "ຍ້ອມຜົມ",
        categoryId: "cat-services",
        price: 150000,
        image:
          "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop",
      },
    ],
  },

  // ========== PHARMACY ==========
  {
    type: "pharmacy",
    meta: SHOP_TYPE_META.find((m) => m.type === "pharmacy")!,
    categories: [
      {
        id: "cat-medicine",
        name: "Medicine",
        nameLao: "ຢາ",
        icon: "💊",
        sortOrder: 1,
      },
      {
        id: "cat-vitamins",
        name: "Vitamins & Supplements",
        nameLao: "ວິຕາມິນ",
        icon: "🍊",
        sortOrder: 2,
      },
      {
        id: "cat-personal-care",
        name: "Personal Care",
        nameLao: "ເຄື່ອງໃຊ້ສ່ວນຕົວ",
        icon: "🧴",
        sortOrder: 3,
      },
      {
        id: "cat-medical-devices",
        name: "Medical Devices",
        nameLao: "ອຸປະກອນການແພດ",
        icon: "🩺",
        sortOrder: 4,
      },
    ],
    products: [
      {
        id: "prod-paracetamol",
        name: "Paracetamol 500mg",
        nameLao: "ພາຣາເຊຕາມອນ",
        categoryId: "cat-medicine",
        price: 10000,
        image:
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop",
      },
      {
        id: "prod-vitamin-c",
        name: "Vitamin C",
        nameLao: "ວິຕາມິນ C",
        categoryId: "cat-vitamins",
        price: 50000,
        image:
          "https://images.unsplash.com/photo-1550572017-4fcdbb59cc32?w=400&h=400&fit=crop",
      },
      {
        id: "prod-mask",
        name: "Face Mask (10pcs)",
        nameLao: "ໜ້າກາກ (10ອັນ)",
        categoryId: "cat-personal-care",
        price: 20000,
        image:
          "https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=400&h=400&fit=crop",
      },
    ],
  },

  // ========== OTHER ==========
  {
    type: "other",
    meta: SHOP_TYPE_META.find((m) => m.type === "other")!,
    categories: [
      {
        id: "cat-general",
        name: "General",
        nameLao: "ທົ່ວໄປ",
        icon: "📦",
        sortOrder: 1,
      },
    ],
    products: [],
  },

  // ========== ENTERPRISE ==========
  {
    type: "enterprise",
    meta: SHOP_TYPE_META.find((m) => m.type === "enterprise")!,
    categories: [
      {
        id: "cat-products",
        name: "Products",
        nameLao: "ສິນຄ້າ",
        icon: "📦",
        sortOrder: 1,
      },
      {
        id: "cat-services",
        name: "Services",
        nameLao: "ບໍລິການ",
        icon: "🛠️",
        sortOrder: 2,
      },
      {
        id: "cat-subscriptions",
        name: "Subscriptions",
        nameLao: "ສະມາຊິກ",
        icon: "💳",
        sortOrder: 3,
      },
    ],
    products: [],
  },

  // ========== GYM & FITNESS ==========
  {
    type: "gym",
    meta: SHOP_TYPE_META.find((m) => m.type === "gym")!,
    categories: [
      {
        id: "cat-memberships",
        name: "Memberships",
        nameLao: "ສະມາຊິກ",
        icon: "💳",
        sortOrder: 1,
      },
      {
        id: "cat-classes",
        name: "Classes",
        nameLao: "ຫ້ອງຮຽນ",
        icon: "🧘",
        sortOrder: 2,
      },
      {
        id: "cat-drinks-gym",
        name: "Drinks & Supplements",
        nameLao: "ເຄື່ອງດື່ມ",
        icon: "🥤",
        sortOrder: 3,
      },
      {
        id: "cat-merchandise",
        name: "Merchandise",
        nameLao: "ສິນຄ້າ",
        icon: "👕",
        sortOrder: 4,
      },
      {
        id: "cat-personal-training",
        name: "Personal Training",
        nameLao: "ຝຶກສ່ວນຕົວ",
        icon: "🏋️",
        sortOrder: 5,
      },
    ],
    products: [
      {
        id: "prod-day-pass",
        name: "Day Pass",
        nameLao: "ບັດມື້",
        categoryId: "cat-memberships",
        price: 50000,
        image:
          "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=400&fit=crop",
      },
      {
        id: "prod-monthly",
        name: "Monthly Membership",
        nameLao: "ສະມາຊິກລາຍເດືອນ",
        categoryId: "cat-memberships",
        price: 300000,
        image:
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop",
      },
      {
        id: "prod-3month",
        name: "3 Month Membership",
        nameLao: "ສະມາຊິກ 3 ເດືອນ",
        categoryId: "cat-memberships",
        price: 750000,
        image:
          "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=400&fit=crop",
      },
      {
        id: "prod-yearly",
        name: "Yearly Membership",
        nameLao: "ສະມາຊິກລາຍປີ",
        categoryId: "cat-memberships",
        price: 2500000,
        image:
          "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop",
      },
      {
        id: "prod-yoga-class",
        name: "Yoga Class",
        nameLao: "ຫ້ອງໂຢກະ",
        categoryId: "cat-classes",
        price: 60000,
        image:
          "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
      },
      {
        id: "prod-boxing-class",
        name: "Boxing Class",
        nameLao: "ຫ້ອງມວຍ",
        categoryId: "cat-classes",
        price: 80000,
        image:
          "https://images.unsplash.com/photo-1549719386-74a5820bc145?w=400&h=400&fit=crop",
      },
      {
        id: "prod-spinning",
        name: "Spinning Class",
        nameLao: "ຫ້ອງປັ່ນລົດ",
        categoryId: "cat-classes",
        price: 50000,
        image:
          "https://images.unsplash.com/photo-1520877880798-5ee004e3f11e?w=400&h=400&fit=crop",
      },
      {
        id: "prod-protein-shake",
        name: "Protein Shake",
        nameLao: "ເຄື່ອງດື່ມໂປຣຕີນ",
        categoryId: "cat-drinks-gym",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1622484211148-c6b9d8dba7bb?w=400&h=400&fit=crop",
      },
      {
        id: "prod-water-gym",
        name: "Water",
        nameLao: "ນ້ຳດື່ມ",
        categoryId: "cat-drinks-gym",
        price: 10000,
        image:
          "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop",
      },
      {
        id: "prod-energy-drink",
        name: "Energy Drink",
        nameLao: "ເຄື່ອງດື່ມຊູກຳລັງ",
        categoryId: "cat-drinks-gym",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&h=400&fit=crop",
      },
      {
        id: "prod-gym-tshirt",
        name: "Gym T-Shirt",
        nameLao: "ເສື້ອຢືດ",
        categoryId: "cat-merchandise",
        price: 150000,
        image:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
      },
      {
        id: "prod-towel",
        name: "Gym Towel",
        nameLao: "ຜ້າເຊັດໜ້າ",
        categoryId: "cat-merchandise",
        price: 50000,
        image:
          "https://images.unsplash.com/photo-1600369671236-e74521d4b6ad?w=400&h=400&fit=crop",
      },
      {
        id: "prod-pt-session",
        name: "PT Session (1hr)",
        nameLao: "ຝຶກສ່ວນຕົວ (1ຊົ່ວໂມງ)",
        categoryId: "cat-personal-training",
        price: 200000,
        image:
          "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop",
      },
      {
        id: "prod-pt-10pack",
        name: "PT 10 Sessions",
        nameLao: "ຝຶກສ່ວນຕົວ 10 ຄັ້ງ",
        categoryId: "cat-personal-training",
        price: 1800000,
        image:
          "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&h=400&fit=crop",
      },
    ],
  },

  // ========== KARAOKE ==========
  {
    type: "karaoke",
    meta: SHOP_TYPE_META.find((m) => m.type === "karaoke")!,
    categories: [
      {
        id: "cat-rooms",
        name: "Rooms",
        nameLao: "ຫ້ອງຮ້ອງເພງ",
        icon: "🚪",
        sortOrder: 1,
      },
      {
        id: "cat-drinks-ktv",
        name: "Drinks",
        nameLao: "ເຄື່ອງດື່ມ",
        icon: "🍻",
        sortOrder: 2,
      },
      {
        id: "cat-food-ktv",
        name: "Food",
        nameLao: "ອາຫານ",
        icon: "🍜",
        sortOrder: 3,
      },
      {
        id: "cat-packages-ktv",
        name: "Packages",
        nameLao: "ແພັກເກັດ",
        icon: "🎁",
        sortOrder: 4,
      },
    ],
    products: [
      {
        id: "prod-room-small",
        name: "Small Room (per hour)",
        nameLao: "ຫ້ອງນ້ອຍ (ຕໍ່ຊົ່ວໂມງ)",
        categoryId: "cat-rooms",
        price: 80000,
        image:
          "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop",
      },
      {
        id: "prod-room-medium",
        name: "Medium Room (per hour)",
        nameLao: "ຫ້ອງກາງ (ຕໍ່ຊົ່ວໂມງ)",
        categoryId: "cat-rooms",
        price: 120000,
        image:
          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
      },
      {
        id: "prod-room-large",
        name: "Large Room (per hour)",
        nameLao: "ຫ້ອງໃຫຍ່ (ຕໍ່ຊົ່ວໂມງ)",
        categoryId: "cat-rooms",
        price: 180000,
        image:
          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
      },
      {
        id: "prod-room-vip",
        name: "VIP Room (per hour)",
        nameLao: "ຫ້ອງ VIP (ຕໍ່ຊົ່ວໂມງ)",
        categoryId: "cat-rooms",
        price: 300000,
        image:
          "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=400&fit=crop",
      },
      {
        id: "prod-beer-lao-ktv",
        name: "Beer Lao",
        nameLao: "ເບຍລາວ",
        categoryId: "cat-drinks-ktv",
        price: 15000,
        image:
          "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop",
      },
      {
        id: "prod-beer-tiger",
        name: "Tiger Beer",
        nameLao: "ເບຍໄທເກີ",
        categoryId: "cat-drinks-ktv",
        price: 20000,
        image:
          "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop",
      },
      {
        id: "prod-whisky-bottle",
        name: "Whisky Bottle",
        nameLao: "ວິສກີແກ້ວ",
        categoryId: "cat-drinks-ktv",
        price: 350000,
        image:
          "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400&h=400&fit=crop",
      },
      {
        id: "prod-soft-drink",
        name: "Soft Drink",
        nameLao: "ນ້ຳອັດລົມ",
        categoryId: "cat-drinks-ktv",
        price: 10000,
        image:
          "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400&h=400&fit=crop",
      },
      {
        id: "prod-mixer",
        name: "Mixer Set",
        nameLao: "ຊຸດມິກເຊີ",
        categoryId: "cat-drinks-ktv",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-16099516556-5334e2706168?w=400&h=400&fit=crop",
      },
      {
        id: "prod-snack-platter",
        name: "Snack Platter",
        nameLao: "ຈານຂອງກິນຫຼິ້ນ",
        categoryId: "cat-food-ktv",
        price: 60000,
        image:
          "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop",
      },
      {
        id: "prod-fried-chicken",
        name: "Fried Chicken",
        nameLao: "ໄກ່ທອດ",
        categoryId: "cat-food-ktv",
        price: 50000,
        image:
          "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=400&fit=crop",
      },
      {
        id: "prod-fruit-platter",
        name: "Fruit Platter",
        nameLao: "ຈານຫມາກໄມ້",
        categoryId: "cat-food-ktv",
        price: 80000,
        image:
          "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=400&fit=crop",
      },
      {
        id: "prod-happy-hour",
        name: "Happy Hour Package (3hr)",
        nameLao: "ແພັກເກັດ Happy Hour (3ຊມ)",
        categoryId: "cat-packages-ktv",
        price: 200000,
        image:
          "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop",
      },
      {
        id: "prod-vip-package",
        name: "VIP Party Package",
        nameLao: "ແພັກເກັດ VIP",
        categoryId: "cat-packages-ktv",
        price: 800000,
        image:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop",
      },
    ],
  },

  // ========== GARAGE & AUTO REPAIR ==========
  {
    type: "garage",
    meta: SHOP_TYPE_META.find((m) => m.type === "garage")!,
    categories: [
      {
        id: "cat-repair-service",
        name: "Repair Services",
        nameLao: "ບໍລິການສ້ອມແປງ",
        icon: "🔧",
        sortOrder: 1,
      },
      {
        id: "cat-parts",
        name: "Parts & Accessories",
        nameLao: "ອະໄຫຼ່",
        icon: "⚙️",
        sortOrder: 2,
      },
      {
        id: "cat-maintenance",
        name: "Maintenance",
        nameLao: "ບຳລຸງຮັກສາ",
        icon: "🛢️",
        sortOrder: 3,
      },
      {
        id: "cat-labor",
        name: "Labor",
        nameLao: "ຄ່າແຮງ",
        icon: "👨‍🔧",
        sortOrder: 4,
      },
      {
        id: "cat-packages-garage",
        name: "Discount Packages",
        nameLao: "ແພັກເກັດສ່ວນຫຼຸດ",
        icon: "🏷️",
        sortOrder: 5,
      },
    ],
    products: [
      // Repair Services
      {
        id: "prod-engine-repair",
        name: "Engine Repair",
        nameLao: "ສ້ອມເຄື່ອງຈັກ",
        categoryId: "cat-repair-service",
        price: 500000,
        image:
          "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=400&fit=crop",
      },
      {
        id: "prod-brake-repair",
        name: "Brake Repair",
        nameLao: "ສ້ອມເບກ",
        categoryId: "cat-repair-service",
        price: 200000,
        image:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      },
      {
        id: "prod-suspension",
        name: "Suspension Repair",
        nameLao: "ສ້ອມຊ໊ອກອັບ",
        categoryId: "cat-repair-service",
        price: 350000,
        image:
          "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=400&fit=crop",
      },
      {
        id: "prod-electrical",
        name: "Electrical Repair",
        nameLao: "ສ້ອມໄຟຟ້າ",
        categoryId: "cat-repair-service",
        price: 150000,
        image:
          "https://images.unsplash.com/photo-1530128118208-89f6ce02b37b?w=400&h=400&fit=crop",
      },
      {
        id: "prod-tire-repair",
        name: "Tire Repair",
        nameLao: "ປະຢາງ",
        categoryId: "cat-repair-service",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=400&h=400&fit=crop",
      },
      // Parts
      {
        id: "prod-oil-filter",
        name: "Oil Filter",
        nameLao: "ກອງນ້ຳມັນ",
        categoryId: "cat-parts",
        price: 50000,
        image:
          "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=400&fit=crop",
      },
      {
        id: "prod-brake-pad",
        name: "Brake Pads",
        nameLao: "ຜ້າເບກ",
        categoryId: "cat-parts",
        price: 150000,
        image:
          "https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=400&h=400&fit=crop",
      },
      {
        id: "prod-spark-plug",
        name: "Spark Plug",
        nameLao: "ຫົວກຽນ",
        categoryId: "cat-parts",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
      },
      {
        id: "prod-battery",
        name: "Battery",
        nameLao: "ແບັດເຕີຣີ",
        categoryId: "cat-parts",
        price: 800000,
        image:
          "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=400&fit=crop",
      },
      {
        id: "prod-tire",
        name: "Tire",
        nameLao: "ຢາງລົດ",
        categoryId: "cat-parts",
        price: 600000,
        image:
          "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=400&fit=crop",
      },
      // Maintenance
      {
        id: "prod-oil-change",
        name: "Oil Change",
        nameLao: "ປ່ຽນນ້ຳມັນເຄື່ອງ",
        categoryId: "cat-maintenance",
        price: 100000,
        image:
          "https://images.unsplash.com/photo-1635784063944-37f66bc952d0?w=400&h=400&fit=crop",
      },
      {
        id: "prod-full-service",
        name: "Full Service",
        nameLao: "ບໍລິການເຕັມ",
        categoryId: "cat-maintenance",
        price: 250000,
        image:
          "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400&h=400&fit=crop",
      },
      {
        id: "prod-wash",
        name: "Car Wash",
        nameLao: "ລ້າງລົດ",
        categoryId: "cat-maintenance",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      },
      {
        id: "prod-inspection",
        name: "Vehicle Inspection",
        nameLao: "ກວດສອບລົດ",
        categoryId: "cat-maintenance",
        price: 50000,
        image:
          "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=400&fit=crop",
      },
      // Labor
      {
        id: "prod-labor-hour",
        name: "Labor (per hour)",
        nameLao: "ຄ່າແຮງ (ຕໍ່ຊົ່ວໂມງ)",
        categoryId: "cat-labor",
        price: 80000,
        image:
          "https://images.unsplash.com/photo-1504222490345-c075b6008014?w=400&h=400&fit=crop",
      },
      {
        id: "prod-labor-half",
        name: "Labor (30 min)",
        nameLao: "ຄ່າແຮງ (30 ນາທີ)",
        categoryId: "cat-labor",
        price: 40000,
        image:
          "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=400&fit=crop",
      },
      // Discount Packages
      {
        id: "prod-pkg-basic",
        name: "Basic Service Package (10% off)",
        nameLao: "ແພັກເກັດພື້ນຖານ (ຫຼຸດ 10%)",
        categoryId: "cat-packages-garage",
        price: 225000,
        image:
          "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=400&fit=crop",
      },
      {
        id: "prod-pkg-premium",
        name: "Premium Service (15% off)",
        nameLao: "ແພັກເກັດພິເສດ (ຫຼຸດ 15%)",
        categoryId: "cat-packages-garage",
        price: 400000,
        image:
          "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400&h=400&fit=crop",
      },
      {
        id: "prod-pkg-loyalty",
        name: "Loyalty Card (5 services)",
        nameLao: "ບັດສະມາຊິກ (5 ຄັ້ງ)",
        categoryId: "cat-packages-garage",
        price: 450000,
        image:
          "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=400&fit=crop",
      },
    ],
  },

  // ========== NOODLE SHOP ==========
  {
    type: "noodles",
    meta: SHOP_TYPE_META.find((m) => m.type === "noodles")!,
    categories: [
      {
        id: "cat-noodle-soup",
        name: "Noodle Soup",
        nameLao: "ເຝີນ້ຳ",
        icon: "🍜",
        sortOrder: 1,
      },
      {
        id: "cat-dry-noodles",
        name: "Dry Noodles",
        nameLao: "ເຝີແຫ້ງ",
        icon: "🍝",
        sortOrder: 2,
      },
      {
        id: "cat-rice-dishes",
        name: "Rice Dishes",
        nameLao: "ເຂົ້າ",
        icon: "🍚",
        sortOrder: 3,
      },
      {
        id: "cat-appetizers-noodles",
        name: "Appetizers",
        nameLao: "ອາຫານເລີ່ມຕົ້ນ",
        icon: "🥟",
        sortOrder: 4,
      },
      {
        id: "cat-drinks-noodles",
        name: "Drinks",
        nameLao: "ເຄື່ອງດື່ມ",
        icon: "🥤",
        sortOrder: 5,
      },
      {
        id: "cat-extras",
        name: "Add-ons & Extras",
        nameLao: "ເພີ່ມເຕີມ",
        icon: "➕",
        sortOrder: 6,
      },
    ],
    products: [
      // Noodle Soup
      {
        id: "prod-pho-beef",
        name: "Beef Pho",
        nameLao: "ເຝີນ້ຳເນື້ອ",
        categoryId: "cat-noodle-soup",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=400&fit=crop",
      },
      {
        id: "prod-pho-chicken",
        name: "Chicken Pho",
        nameLao: "ເຝີນ້ຳໄກ່",
        categoryId: "cat-noodle-soup",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop",
      },
      {
        id: "prod-khao-piak-sen",
        name: "Khao Piak Sen",
        nameLao: "ເຂົ້າປຽກເສັ້ນ",
        categoryId: "cat-noodle-soup",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=400&fit=crop",
      },
      {
        id: "prod-tom-yum-noodle",
        name: "Tom Yum Noodle",
        nameLao: "ເຝີຕົ້ມຍຳ",
        categoryId: "cat-noodle-soup",
        price: 40000,
        image:
          "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=400&h=400&fit=crop",
      },
      {
        id: "prod-wonton-soup",
        name: "Wonton Noodle Soup",
        nameLao: "ເຝີກຽວ",
        categoryId: "cat-noodle-soup",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=400&fit=crop",
      },
      {
        id: "prod-boat-noodle",
        name: "Boat Noodle",
        nameLao: "ເຝີເຮືອ",
        categoryId: "cat-noodle-soup",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=400&fit=crop",
      },
      {
        id: "prod-fish-ball-noodle",
        name: "Fish Ball Noodle Soup",
        nameLao: "ເຝີລູກຊິ້ນປາ",
        categoryId: "cat-noodle-soup",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1604908177453-7462950a6a7b?w=400&h=400&fit=crop",
      },
      // Dry Noodles
      {
        id: "prod-pad-thai",
        name: "Pad Thai",
        nameLao: "ຜັດໄທ",
        categoryId: "cat-dry-noodles",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&h=400&fit=crop",
      },
      {
        id: "prod-pad-see-ew",
        name: "Pad See Ew",
        nameLao: "ຜັດຊີອິ້ວ",
        categoryId: "cat-dry-noodles",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=400&h=400&fit=crop",
      },
      {
        id: "prod-dry-noodle-pork",
        name: "Dry Noodle with Pork",
        nameLao: "ເຝີແຫ້ງໝູ",
        categoryId: "cat-dry-noodles",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop",
      },
      {
        id: "prod-dry-wonton",
        name: "Dry Wonton Noodle",
        nameLao: "ເຝີກຽວແຫ້ງ",
        categoryId: "cat-dry-noodles",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&h=400&fit=crop",
      },
      {
        id: "prod-chow-mein",
        name: "Chow Mein",
        nameLao: "ເຝີຜັດ",
        categoryId: "cat-dry-noodles",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=400&fit=crop",
      },
      // Rice Dishes
      {
        id: "prod-fried-rice-noodles",
        name: "Fried Rice",
        nameLao: "ເຂົ້າຜັດ",
        categoryId: "cat-rice-dishes",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=400&fit=crop",
      },
      {
        id: "prod-khao-man-gai",
        name: "Chicken Rice",
        nameLao: "ເຂົ້າມັນໄກ່",
        categoryId: "cat-rice-dishes",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=400&fit=crop",
      },
      {
        id: "prod-congee",
        name: "Rice Porridge",
        nameLao: "ເຂົ້າປຽກ",
        categoryId: "cat-rice-dishes",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1589907579622-5ca0cd961a99?w=400&h=400&fit=crop",
      },
      {
        id: "prod-rice-pork",
        name: "Rice with Grilled Pork",
        nameLao: "ເຂົ້າໝູປີ້ງ",
        categoryId: "cat-rice-dishes",
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1585937421612-70e813a63fd8?w=400&h=400&fit=crop",
      },
      // Appetizers
      {
        id: "prod-spring-rolls-noodles",
        name: "Spring Rolls",
        nameLao: "ປໍເປ້ຍສົດ",
        categoryId: "cat-appetizers-noodles",
        price: 20000,
        image:
          "https://images.unsplash.com/photo-1548507200-e9df0fa8e0c6?w=400&h=400&fit=crop",
      },
      {
        id: "prod-fried-spring-rolls",
        name: "Fried Spring Rolls",
        nameLao: "ປໍເປ້ຍທອດ",
        categoryId: "cat-appetizers-noodles",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400&h=400&fit=crop",
      },
      {
        id: "prod-dumplings",
        name: "Dumplings (5pcs)",
        nameLao: "ກຽວ (5 ໂຕ)",
        categoryId: "cat-appetizers-noodles",
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=400&fit=crop",
      },
      {
        id: "prod-crispy-wonton",
        name: "Crispy Wonton",
        nameLao: "ກຽວທອດ",
        categoryId: "cat-appetizers-noodles",
        price: 20000,
        image:
          "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=400&fit=crop",
      },
      {
        id: "prod-fish-cake",
        name: "Fish Cake",
        nameLao: "ທອດມັນປາ",
        categoryId: "cat-appetizers-noodles",
        price: 30000,
        image:
          "https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?w=400&h=400&fit=crop",
      },
      // Drinks
      {
        id: "prod-thai-tea",
        name: "Thai Iced Tea",
        nameLao: "ຊາເຢັນ",
        categoryId: "cat-drinks-noodles",
        price: 15000,
        image:
          "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop",
      },
      {
        id: "prod-lemon-tea",
        name: "Lemon Tea",
        nameLao: "ຊານະມາວ",
        categoryId: "cat-drinks-noodles",
        price: 12000,
        image:
          "https://images.unsplash.com/photo-1577968897966-3d27ca2ba3b4?w=400&h=400&fit=crop",
      },
      {
        id: "prod-soy-milk",
        name: "Soy Milk",
        nameLao: "ນົມຖົ່ວເຫຼືອງ",
        categoryId: "cat-drinks-noodles",
        price: 10000,
        image:
          "https://images.unsplash.com/photo-1616799963053-f155a2d0c572?w=400&h=400&fit=crop",
      },
      {
        id: "prod-water-noodles",
        name: "Bottled Water",
        nameLao: "ນ້ຳດື່ມ",
        categoryId: "cat-drinks-noodles",
        price: 5000,
        image:
          "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop",
      },
      {
        id: "prod-soft-drink-noodles",
        name: "Soft Drink",
        nameLao: "ນ້ຳອັດລົມ",
        categoryId: "cat-drinks-noodles",
        price: 10000,
        image:
          "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400&h=400&fit=crop",
      },
      // Add-ons & Extras
      {
        id: "prod-extra-meat",
        name: "Extra Meat",
        nameLao: "ເນື້ອເພີ່ມ",
        categoryId: "cat-extras",
        price: 15000,
        image:
          "https://images.unsplash.com/photo-1588347818036-8f9e7e5f5e8b?w=400&h=400&fit=crop",
      },
      {
        id: "prod-extra-egg",
        name: "Extra Egg",
        nameLao: "ໄຂ່ເພີ່ມ",
        categoryId: "cat-extras",
        price: 5000,
        image:
          "https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&h=400&fit=crop",
      },
      {
        id: "prod-extra-noodles",
        name: "Extra Noodles",
        nameLao: "ເຝີເພີ່ມ",
        categoryId: "cat-extras",
        price: 10000,
        image:
          "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&h=400&fit=crop",
      },
      {
        id: "prod-extra-vegetables",
        name: "Extra Vegetables",
        nameLao: "ຜັກເພີ່ມ",
        categoryId: "cat-extras",
        price: 8000,
        image:
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop",
      },
      {
        id: "prod-extra-fish-balls",
        name: "Extra Fish Balls",
        nameLao: "ລູກຊິ້ນປາເພີ່ມ",
        categoryId: "cat-extras",
        price: 10000,
        image:
          "https://images.unsplash.com/photo-1604908177453-7462950a6a7b?w=400&h=400&fit=crop",
      },
    ],
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get shop type configuration by type
 */
export function getShopTypeConfig(type: ShopType): ShopTypeConfig | undefined {
  return SHOP_TYPE_TEMPLATES.find((t) => t.type === type);
}

/**
 * Get shop type metadata by type
 */
export function getShopTypeMeta(type: ShopType): ShopTypeMeta | undefined {
  return SHOP_TYPE_META.find((m) => m.type === type);
}

/**
 * Get all shop type metadata for selection UI
 */
export function getAllShopTypes(): ShopTypeMeta[] {
  return SHOP_TYPE_META;
}

/**
 * Determine if products should track stock by default for this shop type
 * Food service businesses (cafe, restaurant) typically don't track individual product stock
 * since they prepare items on-demand from ingredients.
 * Service businesses (dry clean, car care) don't track stock either.
 */
export function shouldTrackStockByDefault(type: ShopType): boolean {
  const noTrackTypes: ShopType[] = [
    "cafe",
    "restaurant",
    "noodles", // Food prepared on-demand from ingredients
    "karaoke", // Food/drinks prepared on-demand
    "service", // Services don't have physical stock
    "dry_clean", // Service-based, no stock tracking
    "car_care", // Service-based, no stock tracking
  ];
  return !noTrackTypes.includes(type);
}
