---
version: "1.0.0"
name: Clinical Solid Pharmacy
description: Production-grade clinical pharmacy design system designed with 100% solid fills, zero transparency, high-contrast typography, and tactile 150ms micro-animations for high-glare dispensary and POS environments.
colors:
  primary: "#047857"
  primaryHover: "#059669"
  primaryDark: "#065F46"
  primaryLight: "#D1FAE5"
  primaryText: "#064E3B"
  accent: "#0D9488"
  accentHover: "#0F766E"
  accentLight: "#CCFBF1"
  accentText: "#115E59"
  warning: "#D97706"
  warningHover: "#B45309"
  warningLight: "#FEF3C7"
  warningText: "#78350F"
  danger: "#DC2626"
  dangerHover: "#B91C1C"
  dangerLight: "#FEE2E2"
  dangerText: "#7F1D1D"
  canvas: "#F1F5F9"
  surface: "#FFFFFF"
  border: "#CBD5E1"
  textPrimary: "#0F172A"
  textBody: "#334155"
  textMuted: "#64748B"
typography:
  display:
    fontFamily: Outfit, sans-serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
  h1:
    fontFamily: Outfit, sans-serif
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
  h2:
    fontFamily: Outfit, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Inter, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  bodyBold:
    fontFamily: Inter, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: Inter, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button:
    transition: "all 150ms ease-out"
    activeTransform: "translateY(2px) scale(0.99)"
  card:
    border: "1px solid #CBD5E1"
    boxShadow: "0 2px 0 0 #0F172A"
---

# Clinical Solid Pharmacy Design System

## Overview
The Clinical Solid Pharmacy design system is specifically engineered for high-throughput pharmacy counters, dispensary workstations, and POS environments. In clinical pharmacy environments subjected to harsh fluorescent or outdoor glare, low-contrast text and semi-transparent blur backdrops cause operator eye strain and dangerous dosage misreadings. This design system enforces **100% solid opacity**, high-contrast typography, and tactile 150ms ease-out micro-interactions.

## Colors
- **Emerald (`primary`):** Standard dispensing actions, active orders, confirmation CTA.
- **Teal (`accent`):** Clinical prescriptions, doctor registration actions, pharmacist verification.
- **Amber (`warning`):** Low inventory alerts, near-expiry drug warnings (<= 90 days), batch warnings.
- **Crimson (`danger`):** Out-of-stock items, Schedule II Controlled drug lockouts, dangerous drug interactions.
- **Slate Palette:** 
  - Canvas: `#F1F5F9` (solid soft grey page substrate).
  - Surface: `#FFFFFF` (100% opaque white cards, modals, popovers).
  - Borders: `#CBD5E1` (solid high-definition card & input boundaries).
  - Text: `#0F172A` (deep dark headers), `#334155` (crisp body text).

## Typography
- **Headings & Price Displays:** `Outfit` (sans-serif, geometric clarity).
- **Clinical & Tabular Data:** `Inter` (sans-serif, high x-height, maximum legibility).
- Strict weight differentiation: `font-bold` and `font-semibold` applied to dosage amounts, drug strengths, and currency figures.

## Layout & Micro-interactions
- **Zero Transparency Rule:** No `bg-opacity-*` or `backdrop-blur-*` anywhere in the system.
- **Hardware-accelerated Tactile Feedback:** Buttons and interactive cards respond with `transition-all duration-150 ease-out active:translate-y-0.5 active:scale-[0.99]`.
- **Keyboard Navigation:** High-contrast 2px emerald focus outlines on all interactive elements.

## Components
- **Button:** 5 solid variants (`solid-primary`, `solid-accent`, `solid-danger`, `solid-warning`, `solid-neutral`).
- **Input & Select:** Solid opaque background, high-contrast 1px border, bold labels.
- **Badge:** Solid high-contrast clinical status and drug schedule classification (OTC, Rx, Schedule II).
- **Card:** Solid surface with crisp border and solid shadow (`box-shadow: 0 2px 0 0 #0F172A`).
- **Modal & Drawer:** 100% opaque surface with solid high-contrast dark overlay (`bg-[#0F172A]`) and ESC keyboard dismissal.

## Do's and Don'ts
- **DO:** Use solid opaque fills for all dialogs, cards, tooltips, and badges.
- **DO:** Format all currency values using `formatLKR` (`Rs. 1,250.00`).
- **DO:** Highlight drug schedule and controlled status with distinct solid badges.
- **DON'T:** Use glassmorphism, blur effects, or translucent pastel backgrounds.
- **DON'T:** Allow ambiguous error states without clear remediation hints.
