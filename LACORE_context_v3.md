# LACORE — Контекст проекта v4.0
*Обновлено: 5 апреля 2026*

---

## Правила работы

- Мыслить как профессионал мирового уровня в разработке, дизайне, продукте
- Представлять себя на месте пользователя — эмоция должна быть WOW
- Люди должны хотеть платить немедленно
- Убирать всё лишнее, добавлять только нужное
- В голове цифра: $100,000,000
- Слабые решения не подходят. Только магия и WOW эффект
- ВСЕ ЗАДАЧИ ВЫПОЛНЯЮТСЯ ЧЕРЕЗ CURSOR AGENT — Стан не программист
- Каждый промт для агента заканчивается: git add -A && git commit -m "..." && git push origin main

---

## Кто мы
Stan (Тбилиси) строит LACORE (lacore.ai) — AI sales automation platform.
GitHub: kudotigerman/lacore-mvp
X: @Al3x403 (building in public, Day 5)

## Позиционирование
Tagline: "Your business. Our sales machine."
Hero: "YOU SAY WHAT YOU SELL. LACORE DOES THE REST."
Суть: Первая AI система продаж для фрилансеров, консультантов, коучей и малых агентств.
Аудитория: Дизайнеры, консультанты, коучи, разработчики, копирайтеры, малые агентства.

---

## Стек
- Next.js 14 App Router
- Supabase (auth + database + Edge Functions)
- Claude API (claude-sonnet-4-20250514) — ANTHROPIC_API_KEY
- OpenAI API (GPT-4o) — OPENAI_API_KEY
- Gemini API — GEMINI_API_KEY
- Resend — email уведомления — RESEND_API_KEY
- Telegram Bot — уведомления — TELEGRAM_BOT_TOKEN
- Vercel Pro — VERCEL_TOKEN, VERCEL_PROJECT_ID=prj_OgEMkPT0kZtMLfZQQ5nZdKh8X2ma
- Namecheap DNS (lacore.ai)
- Geist Sans + Bebas Neue (шрифты)

---

## Supabase
Project ref: bsjqjucaqstvpeetlles
URL: https://bsjqjucaqstvpeetlles.supabase.co

### Таблицы
- offers: user_id, offer, audience, pricing, positioning, headline
- landing_pages: user_id, slug, html_content, jsx_content
- leads: user_id, slug, name, email, message, created_at, status (new/contacted/in_talks/won/lost)
- profiles: user_id, display_name, telegram, whatsapp, email_notifications, telegram_chat_id, updated_at
- custom_domains: user_id, slug, domain, verified, vercel_domain_id, created_at
- stripe_settings: user_id, publishable_key, secret_key, price_id, payment_type, button_text, connected_at

### Edge Functions (задеплоены)
npx supabase functions deploy generate-landing --project-ref bsjqjucaqstvpeetlles --no-verify-jwt
npx supabase functions deploy edit-landing --project-ref bsjqjucaqstvpeetlles --no-verify-jwt

---

## Структура страниц
app/
  page.tsx — Главная
  auth/page.tsx — Авторизация
  dashboard/
    layout.tsx — Layout + Sidebar + Floating Sales Builder
    offer/page.tsx — Layer 01
    landing/page.tsx — Layer 02
    content/page.tsx — Layer 03
    leads/page.tsx — Layer 04
    closing/page.tsx — Layer 05
    analytics/page.tsx — Layer 06
    settings/page.tsx — Настройки
  blog/
    page.tsx — Список статей
    [slug]/page.tsx — Статья
  p/[slug]/page.tsx — Публичный лендинг
  privacy/page.tsx — Privacy Policy
  terms/page.tsx — Terms of Service
  cookies/page.tsx — Cookie Policy
  sitemap.ts — Автоматический sitemap

---

## API Routes
/api/generate-offer — 3 варианта оффера
/api/generate-landing — Vercel route
/api/edit-landing — JSX редактор
/api/dashboard-chat — Sales Builder AI
/api/content/generate — Посты (Claude/GPT-4o/Gemini)
/api/content/generate-image — Картинки (DALL-E 3)
/api/content/proxy-image — Прокси скачивания
/api/domains/add|verify|remove — Домены через Vercel API
/api/stripe/save|settings|checkout-session — Stripe
/api/leads/list|notify|status — Лиды

---

## Дизайн система

### Цвета (dark theme)
--bg-primary: #0A0A0D
--bg-secondary: #060608
--bg-card: #111116
--bg-input: #16161C
--text-primary: #FAFAFA
--text-secondary: #A1A1AA
--text-muted: #52525B
--border-primary: #1C1C22
--accent: #06B6D4

### Шрифты
- Geist Sans — везде в UI
- Bebas Neue — заголовки на homepage

---

## Dashboard Layout
- Sidebar 220px (bg #060608) с cyan линией справа
- Floating Sales Builder кнопка (pill, cyan gradient) внизу справа
- Sales Builder панель slide-in 400px справа с blur overlay
- Quick actions в чате: Improve my offer, Write landing copy, Generate posts, DM scripts, Growth strategy
- System prompt включает контекст оффера пользователя
- cleanMarkdown убирает ** и ## из ответов AI

---

## Что готово ✅

### Layer 01 — OFFER
- Просмотр и inline редактирование оффера
- Генерация прямо в дашборде (не редирект на главную)
- После регистрации → сразу дашборд (не главная)

### Layer 02 — LANDING PAGE
- Превью лендинга в iframe
- URL + Copy, Preview, Edit Page
- DomainConnect — реальный роутинг через Vercel API
- StripeConnect — publishable key + secret key + price_id
- Regenerate Site

### Layer 03 — CONTENT MACHINE
- Платформы: Instagram, X, LinkedIn, Threads, Telegram
- Типы постов: Hook, Value, Story, Offer, Case Study
- Модели: Standard (Claude), Pro (GPT-4o), Creative (Gemini)
- Custom Prompt поле — свободный запрос
- Лимиты символов: X=280, Threads=500, Instagram=2200, LinkedIn=1300
- Generate Image под каждым постом (DALL-E 3, контекст поста)
- Download через прокси роут

### Layer 04 — LEADS
- Список лидов из таблицы leads
- Статусы: New/Contacted/In Talks/Won/Lost с цветами
- Кнопка "What to say?" — AI подсказка что написать лиду
- Кнопка Reply → mailto

### Layer 05 — CLOSING SYSTEM
- DM Scripts генерация
- Objection Handling генерация
- Follow-up Sequences генерация
- Все через /api/dashboard-chat с контекстом оффера

### Layer 06 — ANALYTICS
- Метрики: Leads Total, This Week, Landing Views (0), Conversion (0%)
- Recent Leads список

### Settings
- Profile: display name, email, telegram, whatsapp
- Notifications: email toggle, telegram chat_id
- Appearance: dark/light
- Account: Sign Out

---

## Уведомления о лидах
- Email через Resend (from: leads@lacore.ai)
- Telegram через Bot API (chat_id из profiles)
- Fire-and-forget после сохранения лида в Supabase

---

## SEO и Blog
- Blog система на MDX (gray-matter + next-mdx-remote)
- Статьи в content/blog/*.mdx
- Автоматический sitemap.ts
- Google Search Console подключён и подтверждён для lacore.ai
- Sitemap отправлен: https://lacore.ai/sitemap.xml
- Опубликовано 3 статьи, пишутся ещё 7

### Статьи опубликованы
1. how-to-get-first-freelance-client.mdx
2. freelance-offer-that-sells.mdx
3. ai-tools-for-freelancers-2026.mdx

### Статьи в работе
4. how-to-price-freelance-services.mdx
5. cold-dm-scripts-that-work.mdx
6. freelance-personal-brand.mdx
7. landing-page-vs-website-freelancers.mdx
8. instagram-content-strategy-service-business.mdx
9. automate-client-acquisition.mdx
10. freelance-sales-funnel-guide.mdx

---

## Юридические страницы
- /privacy — Privacy Policy
- /terms — Terms of Service
- /cookies — Cookie Policy
Все ссылки в футере работают.

---

## Кастомные домены
- Vercel API подключён
- Пользователь вводит домен → DNS инструкция → проверка статуса
- Middleware.ts роутит по Host header на нужный лендинг
- Тест: geth.meme подключён и работает

---

## Pricing
| План | Цена | Что включено |
|------|------|-------------|
| STARTER | FREE (beta) | Landing page, AI editor, Lead capture, Sales Builder chat, 1 active page |
| PRO | $49/mo | + Custom domain, Content machine, Lead notifications, 3 pages, Analytics |
| SCALE | $99/mo | + All platforms, AI closing scripts, Auto follow-up, WhatsApp bot, Stripe, Unlimited pages, CRM |

---

## Бизнес статус
- Продукт работает в продакшне на lacore.ai
- Building in public на X (@Al3x403)
- Day 5 — получены первые фидбеки от тестировщиков
- Первый лид получен через форму на лендинге

## Фидбек от тестировщиков (Day 5)
1. Идея крутая но нет ощущения что даст результат — нужно соцдоказательство
2. Оффер — ни один вариант не подошёл, нужен чат-режим для уточнений
3. Лендинг слабый, редактор неудобный
4. Content Machine — нет свободного запроса (ИСПРАВЛЕНО ✅)
5. Названия AI моделей убрать (ИСПРАВЛЕНО ✅ — Standard/Pro/Creative)
6. Leads — нет системы, непонятно что делать с лидом (ИСПРАВЛЕНО ✅ — статусы + What to say)
7. Analytics — мало данных, нет графиков

---

## Следующие задачи
1. Проверить blog на lacore.ai/blog
2. Загрузить 7 новых статей в блог
3. Улучшить качество генерации лендингов
4. Онбординг для новых пользователей
5. Соцдоказательство на главной
6. Analytics с графиками
