# BillFlow — Frontend Design System

The BillFlow design system provides a cohesive, premium dark-mode user experience utilizing tailored HSL slate tokens, vivid emerald accents, crisp typography, and accessible interactive primitives.

---

## 1. Color Tokens & Theme Semantics

| Semantic Role | Tailwind Token | Hex / HSL Equivalent | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `bg-slate-950` | `#0B0F19` | Root page canvas background |
| **Surface (Cards/Panels)** | `bg-slate-900/80` | `#111827` | Elevated cards, tables, modal containers |
| **Elevated Surfaces** | `bg-slate-800` | `#1F2937` | Dropdowns, hover states, input backgrounds |
| **Subtle Borders** | `border-slate-800/80` | `rgba(31, 41, 55, 0.8)` | Dividers, card borders, table borders |
| **Active / Focus Borders**| `border-emerald-500/50`| `rgba(16, 185, 129, 0.5)` | Focused inputs, active selections |
| **Text Primary** | `text-slate-100` | `#F1F5F9` | Headers, invoice titles, primary data |
| **Text Secondary** | `text-slate-400` | `#94A3B8` | Subtitles, labels, secondary metadata |
| **Text Muted** | `text-slate-500` | `#64748B` | Captions, placeholders, disabled text |
| **Primary Accent** | `bg-emerald-600` / `text-emerald-400` | `#10B981` | CTA buttons, active tabs, paid status |
| **Warning Accent** | `bg-amber-500/20` / `text-amber-400` | `#F59E0B` | Pending/Sent status, overdue warnings |
| **Danger Accent** | `bg-rose-500/20` / `text-rose-400` | `#F43F5E` | Overdue alerts, delete actions, errors |

---

## 2. Typography & Hierarchy

BillFlow uses the **Inter** typeface via Next.js `next/font/google`:
- **Heading 1 (`h1`)**: `text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl`
- **Heading 2 (`h2`)**: `text-xl font-semibold tracking-tight text-slate-100`
- **Heading 3 (`h3`)**: `text-lg font-medium text-slate-200`
- **Body (`p`)**: `text-sm text-slate-300 leading-relaxed`
- **Caption / Meta**: `text-xs font-medium text-slate-400`

---

## 3. UI Component Primitives

### 3.1 Buttons (`src/components/ui/Button.tsx`)
- **Variants**: `primary` (emerald solid), `secondary` (slate-800 with slate-700 border), `danger` (rose-600), `ghost` (transparent).
- **Sizes**: `sm` (px-3 py-1.5 text-xs), `md` (px-4 py-2 text-sm), `lg` (px-6 py-3 text-base).
- **State**: Native loading spinner (`Loader2`) and disabled opacity reduction.

### 3.2 Cards (`src/components/ui/Card.tsx`)
- Constructed with `rounded-xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-sm backdrop-blur-sm`.
- Card subcomponents: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

### 3.3 Status Badges (`src/components/ui/Badge.tsx`)
- **`draft`**: `bg-slate-800 text-slate-300 border-slate-700`
- **`sent`**: `bg-amber-500/10 text-amber-400 border-amber-500/20`
- **`paid`**: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
- **`overdue`**: `bg-rose-500/10 text-rose-400 border-rose-500/20`

### 3.4 Forms & Inputs (`src/components/ui/Input.tsx`, `Select.tsx`, `Textarea.tsx`)
- Unified dark styling: `bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20`.
- Integrated error label rendering with animated appearance.

### 3.5 Tables (`src/components/ui/Table.tsx`)
- Semantic layout: `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td`.
- Zebra-free clean dark styling with `divide-y divide-slate-800/60` and hover highlighting (`hover:bg-slate-800/40`).

### 3.6 Modals & Confirmation Dialogs (`src/components/ui/Modal.tsx`)
- Centered overlay with backdrop blur (`backdrop-blur-md bg-slate-950/70`).
- Supports ESC key listener, outside-click closing, and accessible focus trapping.

### 3.7 Skeletons, Empty & Error States
- **`Skeleton`**: Shimmering container (`bg-slate-800/60 animate-pulse rounded-md`).
- **`EmptyState`**: Centered illustration icon with descriptive title, helper text, and CTA button.
- **`ErrorState`**: Elevated warning box with reload/retry action button.

### 3.8 Toast System (`src/components/ui/Toast.tsx`)
- Floating notification alerts (`success`, `error`, `warning`, `info`) fixed to bottom-right viewport with automatic dismissal.

---

## 4. Icon System

- Powered by **Lucide React** (`lucide-react`).
- Standard icon sizing: `h-4 w-4` (inline/buttons), `h-5 w-5` (navigation/actions), `h-8 w-8` (feature headers).
- Icons inherit color semantics (`text-emerald-400`, `text-slate-400`, etc.).

---

## 5. Responsive Breakpoint Matrix

| Breakpoint | Minimum Width | Target Devices | UI Adaptation |
| :--- | :--- | :--- | :--- |
| **Mobile S/M** | 375px / 390px | iPhone SE, iPhone 14/15 | Single column, mobile header drawer, card views |
| **Tablet** | 768px (`md`) | iPad, Surface Duo | Two-column grid, compact table layout |
| **Laptop** | 1024px (`lg`) | MacBook Air, Ultrabooks | Persistent sidebar navigation, full table views |
| **Desktop** | 1440px (`2xl`) | Large external monitors | Max-width content containers (`max-w-7xl`), multi-column analytics |
