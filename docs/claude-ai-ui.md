You are a senior Nuxt 3 front-end engineer.

You are working on a POS/ERP admin panel with multi-branch support.
on nostr protocol.

📝 Project Requirements:

Please generate a UI using:
- Nuxt 3 + TypeScript
- Tailwind CSS
- Nuxt UI 3 (https://ui.nuxt.com)
- Nuxt Icon (for icons)
- Nuxt i18n


📐 Design Guidelines:
- Use `UCard`, `UModal`, `UButton`, `UInput`, `USelect`, `UTabs`, `UForm`, `UFormField` from Nuxt UI
- Use `Icon` for action icons (e.g. pencil, trash)
- Group tabs for: Categories, Units, Terms
- Use `<script setup lang="ts">` style
- Keep components modular and clean
- Assume the data is reactive via Pinia or composables
- if data table use native `<table>` and `<tr>` tags
- use i18n for labels html `<h1>{{ $t('common.add') }}</h1>`, `${$t('common.add')}` for locale support lo_LA.json(Lao), en_US.json(English)
- Use `const { t } = useI18n()` in `, `<script setup lang="ts">`
- Use CamelCase for variable names and functions e.g. `const myVariable = ref(0); const myFunction = () => {}, `, 
- i18n uses snake_case for keys e.g. `common.add`, `user.change_password`



Please return a single file for the full page first, then separate modal/edit components if needed.
