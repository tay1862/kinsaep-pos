/**
 * Help System Composable
 * Manages contextual help content per page/feature
 */

export interface HelpSection {
  id: string;
  title: string;
  content: string;
  icon?: string;
}

export interface HelpPage {
  id: string;
  title: string;
  description: string;
  sections: HelpSection[];
  relatedPages?: string[];
}

// Help content structure with i18n keys
const helpStructure: Record<
  string,
  {
    id: string;
    titleKey: string;
    descKey: string;
    sections: {
      id: string;
      titleKey: string;
      contentKey: string;
      icon: string;
    }[];
  }
> = {
  "/": {
    id: "dashboard",
    titleKey: "helpContent.dashboard.title",
    descKey: "helpContent.dashboard.description",
    sections: [
      {
        id: "stats",
        titleKey: "helpContent.dashboard.sections.stats.title",
        contentKey: "helpContent.dashboard.sections.stats.content",
        icon: "i-heroicons-chart-bar",
      },
      {
        id: "quick-actions",
        titleKey: "helpContent.dashboard.sections.quickActions.title",
        contentKey: "helpContent.dashboard.sections.quickActions.content",
        icon: "i-heroicons-bolt",
      },
    ],
  },
  "/pos": {
    id: "pos",
    titleKey: "helpContent.pos.title",
    descKey: "helpContent.pos.description",
    sections: [
      {
        id: "cart",
        titleKey: "helpContent.pos.sections.cart.title",
        contentKey: "helpContent.pos.sections.cart.content",
        icon: "i-heroicons-shopping-cart",
      },
      {
        id: "checkout",
        titleKey: "helpContent.pos.sections.checkout.title",
        contentKey: "helpContent.pos.sections.checkout.content",
        icon: "i-heroicons-credit-card",
      },
      {
        id: "tables",
        titleKey: "helpContent.pos.sections.tables.title",
        contentKey: "helpContent.pos.sections.tables.content",
        icon: "i-heroicons-table-cells",
      },
    ],
  },
  "/products": {
    id: "products",
    titleKey: "helpContent.products.title",
    descKey: "helpContent.products.description",
    sections: [
      {
        id: "add-product",
        titleKey: "helpContent.products.sections.addProduct.title",
        contentKey: "helpContent.products.sections.addProduct.content",
        icon: "i-heroicons-plus-circle",
      },
      {
        id: "edit-product",
        titleKey: "helpContent.products.sections.editProduct.title",
        contentKey: "helpContent.products.sections.editProduct.content",
        icon: "i-heroicons-pencil-square",
      },
      {
        id: "categories",
        titleKey: "helpContent.products.sections.categories.title",
        contentKey: "helpContent.products.sections.categories.content",
        icon: "i-heroicons-folder",
      },
      {
        id: "barcode",
        titleKey: "helpContent.products.sections.barcode.title",
        contentKey: "helpContent.products.sections.barcode.content",
        icon: "i-heroicons-qr-code",
      },
    ],
  },
  "/inventory": {
    id: "inventory",
    titleKey: "helpContent.inventory.title",
    descKey: "helpContent.inventory.description",
    sections: [
      {
        id: "stock-levels",
        titleKey: "helpContent.inventory.sections.stockLevels.title",
        contentKey: "helpContent.inventory.sections.stockLevels.content",
        icon: "i-heroicons-archive-box",
      },
      {
        id: "adjustments",
        titleKey: "helpContent.inventory.sections.adjustments.title",
        contentKey: "helpContent.inventory.sections.adjustments.content",
        icon: "i-heroicons-pencil-square",
      },
      {
        id: "transfers",
        titleKey: "helpContent.inventory.sections.transfers.title",
        contentKey: "helpContent.inventory.sections.transfers.content",
        icon: "i-heroicons-arrows-right-left",
      },
      {
        id: "purchase-orders",
        titleKey: "helpContent.inventory.sections.purchaseOrders.title",
        contentKey: "helpContent.inventory.sections.purchaseOrders.content",
        icon: "i-heroicons-document-text",
      },
      {
        id: "suppliers",
        titleKey: "helpContent.inventory.sections.suppliers.title",
        contentKey: "helpContent.inventory.sections.suppliers.content",
        icon: "i-heroicons-truck",
      },
    ],
  },
  "/orders": {
    id: "orders",
    titleKey: "helpContent.orders.title",
    descKey: "helpContent.orders.description",
    sections: [
      {
        id: "order-list",
        titleKey: "helpContent.orders.sections.orderList.title",
        contentKey: "helpContent.orders.sections.orderList.content",
        icon: "i-heroicons-clipboard-document-list",
      },
      {
        id: "order-details",
        titleKey: "helpContent.orders.sections.orderDetails.title",
        contentKey: "helpContent.orders.sections.orderDetails.content",
        icon: "i-heroicons-document-magnifying-glass",
      },
      {
        id: "refunds",
        titleKey: "helpContent.orders.sections.refunds.title",
        contentKey: "helpContent.orders.sections.refunds.content",
        icon: "i-heroicons-arrow-uturn-left",
      },
    ],
  },
  "/settings": {
    id: "settings",
    titleKey: "helpContent.settings.title",
    descKey: "helpContent.settings.description",
    sections: [
      {
        id: "account",
        titleKey: "helpContent.settings.sections.account.title",
        contentKey: "helpContent.settings.sections.account.content",
        icon: "i-heroicons-user-circle",
      },
      {
        id: "business",
        titleKey: "helpContent.settings.sections.business.title",
        contentKey: "helpContent.settings.sections.business.content",
        icon: "i-heroicons-building-storefront",
      },
      {
        id: "integrations",
        titleKey: "helpContent.settings.sections.integrations.title",
        contentKey: "helpContent.settings.sections.integrations.content",
        icon: "i-heroicons-puzzle-piece",
      },
    ],
  },
};

export function useHelp() {
  const route = useRoute();
  const { t } = useI18n();
  const isDrawerOpen = useState<boolean>("isDrawerOpen", () => false);
  const currentHelp = useState<HelpPage | null>("currentHelp", () => null);

  /**
   * Translate a help page structure
   */
  function translateHelpPage(
    structure: (typeof helpStructure)[string]
  ): HelpPage {
    return {
      id: structure.id,
      title: t(structure.titleKey),
      description: t(structure.descKey),
      sections: structure.sections.map((s) => ({
        id: s.id,
        title: t(s.titleKey),
        content: t(s.contentKey),
        icon: s.icon,
      })),
    };
  }

  /**
   * Get help content for current route
   */
  function getHelpForCurrentPage(): HelpPage | null {
    const path = route.path;
    let structure = helpStructure[path];

    // Try base path
    if (!structure) {
      const basePath = "/" + path.split("/")[1];
      structure = helpStructure[basePath];
    }

    if (structure) {
      return translateHelpPage(structure);
    }

    return null;
  }

  /**
   * Get all translated help pages
   */
  function getAllHelpPages(): HelpPage[] {
    return Object.values(helpStructure).map(translateHelpPage);
  }

  /**
   * Search help content
   */
  function searchHelp(query: string): HelpSection[] {
    const results: HelpSection[] = [];
    const lowerQuery = query.toLowerCase();
    const allPages = getAllHelpPages();

    for (const page of allPages) {
      for (const section of page.sections) {
        if (
          section.title.toLowerCase().includes(lowerQuery) ||
          section.content.toLowerCase().includes(lowerQuery)
        ) {
          results.push(section);
        }
      }
    }

    return results;
  }

  /**
   * Open help drawer
   */
  function openHelp() {
    currentHelp.value = getHelpForCurrentPage();
    isDrawerOpen.value = true;
  }

  /**
   * Close help drawer
   */
  function closeHelp() {
    isDrawerOpen.value = false;
  }

  // Watch route changes to update current help
  watch(
    () => route.path,
    () => {
      if (isDrawerOpen.value) {
        currentHelp.value = getHelpForCurrentPage();
      }
    }
  );

  /**
   * Get help for a specific page
   */
  function getHelpForPage(pageId: string): HelpPage | null {
    const struct = Object.values(helpStructure).find((h) => h.id === pageId);
    return struct ? translateHelpPage(struct) : null;
  }

  return {
    isDrawerOpen,
    currentHelp,
    openHelp,
    closeHelp,
    getHelpForCurrentPage,
    getHelpForPage,
    getAllHelpPages,
    searchHelp,
  };
}
