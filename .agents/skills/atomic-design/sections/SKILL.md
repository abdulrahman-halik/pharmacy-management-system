---
name: atomic-design-sections
description: Complex standalone UI sections like headers, footers, product cards, comment sections, sidebars, and data tables in src/components/sections/ built with Tailwind CSS.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Atomic Design: Sections

Master the creation of sections (Level 3 — formerly known as Organisms) — complex, distinct sections of an interface composed of composites and Core UI primitives (`src/components/core/`). Sections represent standalone UI sections that could exist independently and are styled using **Tailwind CSS utility classes**, responsive design modifiers, and the `cn()` helper under **`src/components/sections/`** without custom `.module.css` files.

---

## What Are Sections?

Sections are relatively complex UI components that form distinct, meaningful regions of an interface:

- **Composed of composites and core primitives**: Combines `components/core/` primitives, `components/composites/`, and sibling sections
- **Located in `src/components/sections/`**: Replaces legacy `components/organisms/`
- **Standalone sections**: Distinct UI regions that can function as cohesive interface blocks
- **Utility-first layout**: Structured with Tailwind flex, grid, sticky positioning, container queries, and responsive variants
- **Context-aware & Stateful**: Often tied to feature domain needs and custom state hooks (e.g. `useHeader`, `useTableSort`)
- **Reusable**: Reusable across layouts and concrete pages

---

## Common Section Types

| Category | Sections | Composed Parts |
|---|---|---|
| **Navigation** | Header, Footer, Sidebar | NavItem, SearchForm, Avatar, Icon, Button |
| **Content Sections** | ProductCard, CommentSection, ArticlePreview | MediaObject, Badge, Button, Heading, Text |
| **Data Display** | DataTable, StatGrid, ActivityTimeline | Checkbox, Button, Icon, Text, Pagination |
| **Complex Forms** | MultiStepForm, CheckoutSummary, FilterDrawer | FormField, Checkbox, ButtonGroup, Separator |

---

## 1. Header Section Example

Combines `Avatar`, `Button`, `Icon` from `components/core/` with `NavItem` and `SearchForm` composites from `components/composites/`:

```typescript
// src/components/sections/Header/Header.tsx
import React, { useState } from 'react';
import { Icon } from '@/components/core/Icon';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { NavItem } from '@/components/composites/NavItem';
import { SearchForm } from '@/components/composites/SearchForm';
import { cn } from '@/lib/utils';

export interface NavLink {
  id: string;
  label: string;
  href: string;
  icon?: string;
  badge?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarSrc?: string;
}

export interface HeaderProps {
  logo: React.ReactNode;
  navLinks: NavLink[];
  activeLinkId?: string;
  user?: User;
  onSearch?: (query: string) => void;
  onNotificationsClick?: () => void;
  notificationCount?: number;
  onUserMenuClick?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  logo,
  navLinks,
  activeLinkId,
  user,
  onSearch,
  onNotificationsClick,
  notificationCount = 0,
  onUserMenuClick,
  className,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className={cn('sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60', className)}>
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center">{logo}</div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavItem
                key={link.id}
                label={link.label}
                href={link.href}
                icon={link.icon}
                badge={link.badge}
                isActive={link.id === activeLinkId}
              />
            ))}
          </nav>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-3">
          {onSearch && (
            <div className="hidden lg:block w-72">
              <SearchForm onSubmit={onSearch} size="sm" placeholder="Search..." />
            </div>
          )}

          {/* Notifications */}
          {onNotificationsClick && (
            <button
              type="button"
              onClick={onNotificationsClick}
              className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Icon name="bell" size="sm" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 flex size-2 rounded-full bg-destructive" />
              )}
            </button>
          )}

          {/* User Avatar Menu */}
          {user ? (
            <button
              type="button"
              onClick={onUserMenuClick}
              className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
              aria-label="User menu"
            >
              <Avatar
                src={user.avatarSrc}
                alt={user.name}
                initials={user.name.slice(0, 2).toUpperCase()}
                size="sm"
              />
            </button>
          ) : (
            <Button size="sm">Sign In</Button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Icon name={isMobileMenuOpen ? 'x' : 'menu'} size="md" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="border-b border-border bg-background p-4 md:hidden space-y-2">
          {onSearch && (
            <div className="mb-4">
              <SearchForm onSubmit={onSearch} size="sm" />
            </div>
          )}
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <NavItem
                key={link.id}
                label={link.label}
                href={link.href}
                icon={link.icon}
                badge={link.badge}
                isActive={link.id === activeLinkId}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

Header.displayName = 'Header';
```

---

## 2. Footer Section Example

```typescript
// src/components/sections/Footer/Footer.tsx
import React from 'react';
import { Icon } from '@/components/core/Icon';
import { Text } from '@/components/core/Typography';
import { cn } from '@/lib/utils';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface SocialLink {
  platform: string;
  href: string;
  icon: string;
}

export interface FooterProps {
  logo: React.ReactNode;
  tagline?: string;
  sections: FooterSection[];
  socialLinks?: SocialLink[];
  copyright?: string;
  legalLinks?: FooterLink[];
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  logo,
  tagline,
  sections,
  socialLinks = [],
  copyright,
  legalLinks = [],
  className,
}) => {
  const currentYear = new Date().getFullYear();
  const copyrightText = copyright || `${currentYear} Company. All rights reserved.`;

  return (
    <footer className={cn('border-t border-border bg-muted/30 text-muted-foreground', className)}>
      <div className="container mx-auto px-4 py-12 sm:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div>{logo}</div>
            {tagline && (
              <Text size="sm" color="muted" className="max-w-sm">
                {tagline}
              </Text>
            )}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.href}
                    className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-accent hover:text-foreground transition-colors"
                    aria-label={`Follow on ${link.platform}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name={link.icon} size="sm" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links Grid */}
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {section.title}
              </div>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row text-xs">
          <div>{copyrightText}</div>
          {legalLinks.length > 0 && (
            <div className="flex items-center gap-4">
              {legalLinks.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

Footer.displayName = 'Footer';
```

---

## 3. ProductCard Section Example

Combines `Button`, `Badge`, `Icon`, and `Typography` primitives from `components/core/`:

```typescript
// src/components/sections/ProductCard/ProductCard.tsx
import React from 'react';
import { Button } from '@/components/core/Button';
import { Badge } from '@/components/core/Badge';
import { Icon } from '@/components/core/Icon';
import { Text, Heading } from '@/components/core/Typography';
import { cn } from '@/lib/utils';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  image: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  badge?: string;
}

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  onFavorite?: (product: Product) => void;
  isFavorite?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onQuickView,
  onFavorite,
  isFavorite = false,
  className,
}) => {
  const currency = product.currency || '$';
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className={cn('group relative flex flex-col rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs transition-all hover:shadow-md', className)}>
      {/* Product Image & Badges */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {product.badge && (
          <div className="absolute top-2 left-2">
            <Badge variant="default">{product.badge}</Badge>
          </div>
        )}

        {onFavorite && (
          <button
            type="button"
            onClick={() => onFavorite(product)}
            className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur shadow-xs hover:bg-background transition-colors cursor-pointer"
            aria-label="Add to favorites"
          >
            <Icon
              name="heart"
              size="sm"
              className={cn(isFavorite ? 'text-destructive fill-destructive' : 'text-muted-foreground')}
            />
          </button>
        )}
      </div>

      {/* Info Block */}
      <div className="flex flex-1 flex-col pt-4">
        {product.rating !== undefined && (
          <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
            <Icon name="star" size="xs" />
            <span>{product.rating.toFixed(1)}</span>
            {product.reviewCount && (
              <span className="text-muted-foreground">({product.reviewCount})</span>
            )}
          </div>
        )}

        <Heading level={4} className="mt-1 font-semibold text-base truncate">
          {product.name}
        </Heading>

        {product.description && (
          <Text size="sm" color="muted" truncate className="mt-1">
            {product.description}
          </Text>
        )}

        {/* Price & Add to Cart */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg text-foreground">
              {currency}{product.price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {currency}{product.originalPrice?.toFixed(2)}
              </span>
            )}
          </div>

          <Button
            size="sm"
            disabled={product.inStock === false}
            onClick={() => onAddToCart?.(product)}
          >
            {product.inStock === false ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </div>
  );
};

ProductCard.displayName = 'ProductCard';
```

---

## 4. Sidebar Section Example

```typescript
// src/components/sections/Sidebar/Sidebar.tsx
import React from 'react';
import { Avatar } from '@/components/core/Avatar';
import { Text } from '@/components/core/Typography';
import { NavItem } from '@/components/composites/NavItem';
import { cn } from '@/lib/utils';

export interface SidebarLink {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface SidebarSection {
  title?: string;
  links: SidebarLink[];
}

export interface SidebarProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  sections: SidebarSection[];
  activeLinkId?: string;
  onLinkClick?: (id: string) => void;
  isCollapsed?: boolean;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  sections,
  activeLinkId,
  onLinkClick,
  isCollapsed = false,
  className,
}) => {
  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* User Profile Summary */}
      {user && (
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Avatar src={user.avatar} alt={user.name} size="sm" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{user.name}</div>
              <Text size="xs" color="muted" truncate>
                {user.email}
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Nav Link Groups */}
      <div className="flex-1 space-y-6 overflow-y-auto p-3">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && !isCollapsed && (
              <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
            )}
            <nav className="space-y-0.5">
              {section.links.map((link) => (
                <NavItem
                  key={link.id}
                  label={isCollapsed ? '' : link.label}
                  href={link.href}
                  icon={link.icon}
                  badge={isCollapsed ? undefined : link.badge}
                  isActive={link.id === activeLinkId}
                  onClick={() => onLinkClick?.(link.id)}
                />
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};

Sidebar.displayName = 'Sidebar';
```

---

## Best Practices for Sections

### 1. Composes Core Primitives and Composites
Sections should delegate lower-level rendering to `components/core` primitives (`Button`, `Avatar`, `Badge`, `Icon`) and `components/composites` (`NavItem`, `SearchForm`, `FormField`).

### 2. Pure Tailwind Styling
Avoid separate `.module.css` files. Build responsive sections cleanly with Tailwind utilities (`grid`, `flex`, `sticky`, `container`, `@container`).

### 3. State Decoupling via Custom Hooks
When a section requires complex UI state (like pagination, filtering, or multi-step progression), extract state into a dedicated custom hook (`useHeader`, `useDataTable`, `useProductFilter`) to keep the component presentationally clear.

---

## Related Subskills

- [Atomic Design Hub](../SKILL.md) — Master methodology and subskill routing
- [Fundamentals](../fundamentals/SKILL.md) — Core hierarchy, directory layouts, and composition rules
- [Theme & Tokens](../theme/SKILL.md) — Design tokens under `src/theme/`, Tailwind v4 `@theme` tokens, and CSS variables
- [Core UI Primitives](../atoms/SKILL.md) — Indivisible Core UI primitives in `src/components/core/`
- [Composites](../composites/SKILL.md) — Functional core primitive combinations (form fields, search inputs)
- [Layouts](../layouts/SKILL.md) — Page layout skeletons with slot-based content
- [Integration](../integration/SKILL.md) — Framework integration (React/Next.js, Vue 3, Storybook, Vitest)
