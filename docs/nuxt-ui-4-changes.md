# Nuxt UI 4 Component Changes

This document tracks component naming changes from Nuxt UI 3 to Nuxt UI 4 for reference.

## Component Renames

| Nuxt UI 3 | Nuxt UI 4 | Notes |
|-----------|-----------|-------|
| `UDropdown` | `UDropdownMenu` | Dropdown menu component renamed |
| `USelectMenu` | `USelect` | Select component simplified |
| `UToggle` | `USwitch` | Toggle renamed to Switch |
| `UVerticalNavigation` | `UNavigationMenu` | Navigation component renamed |

## Props Changes

### UButton
- `variant="ghost"` - still supported
- `color="gray"` → `color="neutral"` 

### UBadge
- `color="gray"` → `color="neutral"`

### UModal
- `v-model` → `v-model:open`

### UCard
- Structure remains similar with `#header`, `#default`, `#footer` slots

## CSS Class Changes

### Tailwind v4 Syntax
- `bg-gradient-to-br` → `bg-linear-to-br` (new syntax, old still works)
- Color classes still use `primary`, `success`, `error`, `warning`, `info`, `neutral`

## Common Issues & Solutions

### Issue: "resolve component: UDropdown"
**Solution:** Replace `UDropdown` with `UDropdownMenu`

```vue
<!-- Before (Nuxt UI 3) -->
<UDropdown :items="items">
  <UButton />
</UDropdown>

<!-- After (Nuxt UI 4) -->
<UDropdownMenu :items="items">
  <UButton />
</UDropdownMenu>
```

### Issue: "resolve component: USelectMenu"  
**Solution:** Replace `USelectMenu` with `USelect`

### Issue: Modal not opening/closing
**Solution:** Use `v-model:open` instead of `v-model`

```vue
<!-- Before -->
<UModal v-model="isOpen">

<!-- After -->
<UModal v-model:open="isOpen">
```

## Files Updated

- `app/pages/settings/receipt.vue` - Changed `UDropdown` to `UDropdownMenu` (2024-12-04)
- `app/pages/products/[id]/index.vue` - Changed `UToggle` to `USwitch` (11 instances) (2024-12-04)
- `app/pages/settings/users.vue` - Changed `UToggle` to `USwitch` (1 instance) (2024-12-04)

## Reference Links

- [Nuxt UI 4 Documentation](https://ui.nuxt.com/)
- [Migration Guide](https://ui.nuxt.com/getting-started/migration)
