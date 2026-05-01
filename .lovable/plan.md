## Goal

Replace decorative emojis used as **UI icons** with consistently-styled Lucide React line icons (matching the Adobe red-line look from the reference). Keep emojis where they represent **personality / gamification** (user avatar, badge rewards) — those aren't UI icons.

## Icon mapping

| Concept | Today | New (Lucide) |
|---|---|---|
| Picks / soccer ball | ⚽ | `Volleyball` |
| Quiniela / league / trophy | 🏆 | `Trophy` |
| Results / clipboard | 📋 | `ClipboardList` |
| Profile tab | 👤 | `User` |
| Members | 👥 | `Users` |
| Stats / chart (future team stats) | 📊 | `BarChart3` |
| WhatsApp/chat | 💬 | `MessageCircle` |
| Share | 📤 | `Share2` |
| Copy link | 📋 | `Copy` |
| Celebrate | 🎉 | `PartyPopper` |
| Empty/sad | 😕 | `Frown` |
| Checkmark bullets | ✅ | `CheckCircle2` |
| Admin: matches/calendar/stadium | ⚽📅🏟️ | `Volleyball` / `CalendarDays` / `Building2` |

Style for all: `strokeWidth={2.25}`, color via Tailwind semantic tokens (`text-primary`, `text-muted-foreground`, `text-destructive`), size scaled to context (16–48). No hardcoded hex colors.

## Files to change

1. **`src/components/BottomNav.tsx`** — swap emoji map for Lucide icons (`Volleyball`, `Trophy`, `ClipboardList`, `User`); render `<Icon size={22} strokeWidth={2.25} />` instead of `<span>{emoji}</span>`.

2. **`src/pages/LandingPage.tsx`** — "How it works" cards use `Volleyball` / `Trophy` / `ClipboardList` inside the `bg-primary/10` circle with `text-primary`; trust bullets use `CheckCircle2`.

3. **`src/pages/PicksPage.tsx`** (line 156) — empty state ⚽ → `<Volleyball size={48} className="text-muted-foreground mx-auto mb-4" />`.

4. **`src/pages/LeaguePage.tsx`**:
   - Line 78 (not found state) 😕 → `Frown`.
   - Line 101 share button 📤 → `Share2`.
   - Line 117 tab labels: replace `📊 Tabla` / `👥 Miembros` with inline `<BarChart3 />` + label and `<Users />` + label.
   - Line 125 empty members 👥 → `Users`.

5. **`src/pages/LeaguesListPage.tsx`**:
   - Line 163 empty 🏆 → `Trophy`.
   - Line 200 dialog 🎉 → `PartyPopper`.

6. **`src/pages/CreateLeaguePage.tsx`**:
   - Line 76 heading 🎉 → inline `PartyPopper` + text.
   - Line 90 WhatsApp button 💬 → `MessageCircle`.
   - Line 99 copy 📋 → `Copy`.

7. **`src/pages/ProfilePage.tsx`**:
   - Line 155 WhatsApp prompt 💬 → `MessageCircle` (keep `text-primary`).
   - Line 240 badge fallback ❓ — keep, this is gamification, but swap to `HelpCircle` for consistency with the Lucide style on locked badges. Earned-badge emojis remain (gamification personality).

8. **`src/pages/AdminPage.tsx`** (lines 463-466) — dashboard stat icons: `CalendarDays`, `Volleyball`, `Building2`. Render as Lucide components inside the existing card.

## Files explicitly NOT changing

- **`src/components/TopBar.tsx`** avatar circle — shows `profile.avatar_emoji` (user-personal, picked by user).
- **`src/components/LeaderboardRow.tsx`** medals 🥇🥈🥉 — these read clearly as podium positions and are universally recognized; converting to Lucide makes ranking less scannable. Confirm if you want them swapped.
- **`src/lib/mockData.ts`** badge emojis — gamification rewards (debut ⚽, racha 🔥, perfecta ⭐, campeón 🏆). These are part of the "fun" brand and shown small inside earned-badge tiles. Confirm if you want these as Lucide too.

## Out of scope

Future team-statistics screens — `BarChart3` / `TrendingUp` / `LineChart` will be wired in when those screens exist.
