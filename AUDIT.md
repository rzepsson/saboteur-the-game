# Audyt kodu — Saboteur the Game
Data: 2026-06-14  
Audytor: Claude Sonnet 4.6 (Senior React + Convex Developer)  
Zakres: cały obecny codebase (lobby, Convex backend, typy, i18n, komponenty UI)

---

## Metodologia

Przejrzano każdy plik źródłowy projektu (`src/`, `convex/`, `messages/`).  
Znaleziska podzielono na cztery priorytety:

| Priorytet | Znaczenie |
|-----------|-----------|
| 🔴 KRYTYCZNY | Błąd umożliwiający nadużycie / utratę danych |
| 🟠 WYSOKI | Błąd / defekt wpływający na poprawność działania w produkcji |
| 🟡 ŚREDNI | Dług techniczny, UX lub spójność kodu |
| 🟢 NISKI | Styl, drobiazgi, dobry do poprawienia przy okazji |

---

## 🔴 KRYTYCZNE

### C1 — `sessionId` jest tokenem autoryzacyjnym, ale jest publiczny

**Pliki:** `convex/rooms.ts`, `src/lib/session.ts`

Wszystkie mutacje przyjmują `sessionId` jako zwykły argument i używają go do autoryzacji
(np. `room.hostSessionId !== args.sessionId`). Jednocześnie query `get` zwraca **pełne
obiekty graczy** zawierające pole `sessionId` dla każdego gracza w pokoju.

**Konsekwencja:** każdy gracz widzi sessionId wszystkich pozostałych. Może więc:
- wywołać `kickPlayer` z cudzym `sessionId` jako hosta i wyrzucić kogokolwiek,
- wywołać `updateSettings` lub `transferHost` jako host,
- wykluczyć hosta z jego własnego pokoju.

**Wymaganie z Convex guidelines:** *"NEVER accept a userId or any user identifier as a
function argument for authorization purposes."*

**Rekomendacja:** Docelowo należy wdrożyć Convex Auth (Anonymous / Clerk / custom JWT).
Do czasu implementacji auth przynajmniej **nie zwracać `sessionId` w query `get`** —
zastąpić je wewnętrznym identyfikatorem widocznym tylko dla właściciela sesji.

---

### C2 — Brak walidacji `avatarId` po stronie serwera

**Pliki:** `convex/rooms.ts` — mutacje `create`, `join`

`avatarId` jest akceptowany jako dowolna liczba (`v.number()`). Serwer nie sprawdza, czy
wartość mieści się w zakresie 1–8. Klient może zapisać `avatarId: -99` lub `avatarId: 999`,
co spowoduje 404 obrazka lub złamanie logiki `getAvatarUrl`.

**Rekomendacja:**
```typescript
avatarId: v.union(v.literal(1), v.literal(2), ..., v.literal(8))
// lub
avatarId: v.number(), // + guard: Math.min(8, Math.max(1, Math.round(args.avatarId)))
```

---

## 🟠 WYSOKIE

### H1 — `getAvatarUrl` nie zadziała poprawnie w produkcyjnym buildzie Vite

**Plik:** `src/lib/avatar.ts:5`

```typescript
return new URL(`/src/assets/avatars/avatar${clamped}.png`, import.meta.url).href;
```

`import.meta.url` w runtime modułu po zbundlowaniu wskazuje na URL skompilowanego
chunk'a, nie na plik źródłowy. Ścieżka `/src/assets/avatars/...` nie istnieje po buildzie
(pliki trafiają do `dist/assets/` z content-hash w nazwie).

**Objaw:** obrazki avatarów nie ładują się w środowisku produkcyjnym (np. po `vp build`).

**Rekomendacja:** zaimportować statycznie lub użyć dynamic `import()`:
```typescript
// Opcja 1 — explicit imports (pewna, statycznie analysowalna przez Vite)
import avatar1 from "../assets/avatars/avatar1.png";
// ...

// Opcja 2 — glob import
const avatars = import.meta.glob("../assets/avatars/avatar*.png", { eager: true, as: "url" });
export function getAvatarUrl(id: number) { return avatars[`../assets/avatars/avatar${id}.png`]; }
```

---

### H2 — `cleanupInactivePlayers` nie ma mechanizmu kontynuacji przy dużej liczbie graczy

**Plik:** `convex/rooms.ts:318-319`

```typescript
const stalePlayers = await ctx.db
  .query("players")
  .withIndex("by_lastHeartbeat", (q) => q.lt("lastHeartbeat", cutoff))
  .take(50);
```

Jeśli więcej niż 50 graczy jest jednocześnie nieaktywnych, tylko 50 zostanie usuniętych
per cykl crona (co 30 s). Reszta czeka do kolejnego cyklu — w ekstremalnym przypadku
pokoje nie zostaną wyczyszczone w rozsądnym czasie.

**Rekomendacja wg Convex guidelines:** po przetworzeniu batcha, jeśli znaleziono 50
rekordów, zaplanować siebie samego od razu:
```typescript
if (stalePlayers.length === 50) {
  await ctx.scheduler.runAfter(0, internal.rooms.cleanupInactivePlayers, {});
}
```

---

### H3 — Brak strony 404 / catch-all route

**Plik:** `src/App.tsx`

Zdefiniowane są tylko dwa route: `/` i `/lobby/:code`. Wejście na dowolny inny URL
(np. `/lobby/`, `/settings`, błędna ścieżka z linku zewnętrznego) renderuje pustą stronę
bez żadnego komunikatu.

**Rekomendacja:**
```tsx
<Route path="*" element={<NotFoundPage />} />
```

---

### H4 — Komunikat błędu awaryjny hardcoded po angielsku

**Plik:** `src/components/GamePanel.tsx:22`

```typescript
return "An unexpected error occurred.";
```

Gdy serwer zwróci nieznany błąd, wyświetlana jest wiadomość zawsze po angielsku,
niezależnie od ustawień języka użytkownika.

**Rekomendacja:** dodać klucz i18n, np. `panel_error_generic`, i użyć `m.panel_error_generic()`.

---

## 🟡 ŚREDNIE

### M1 — Podwójny stan "pending" przy kick i transfer host

**Pliki:** `src/pages/LobbyPage.tsx`, `src/components/game/PlayerCard.tsx`

`LobbyPage` przechowuje `kickingPlayer` i `transferringTo` (blokuje `onKick`/`onTransferHost`
prop), a `PlayerCard` **dodatkowo** ma własne `kickPending` i `hostPending` (z `setTimeout`
fallbackiem). Te dwa mechanizmy są niespójne — `PlayerCard.kickPending` może wygasnąć
po 3 s mimo że rodzic nadal blokuje akcję, lub odwrotnie.

**Rekomendacja:** wybrać jeden poziom. Wystarczy `LobbyPage` — nie przekazywać `onKick`
gdy trwa operacja; w `PlayerCard` usunąć lokalny `setTimeout`-based state.

---

### M2 — `as Room` cast ukrywa typowanie Convexa

**Plik:** `src/pages/LobbyPage.tsx:24`

```typescript
const room = useQuery(api.rooms.get, { code: code ?? "" }) as Room | null | undefined;
```

`useQuery` zwraca typowany rezultat bezpośrednio z `api.rooms.get`. Ręczny cast `as Room`
omija TypeScript i nie ma gwarancji, że oba typy są spójne (np. jeśli schemat Convex się
zmieni, kompilator nie wykaże błędu).

**Rekomendacja:** usunąć cast, użyć `Doc<"rooms"> & { players: Doc<"players">[] }` lub
wyeksportować `ReturnType` z query.

---

### M3 — `status: "starting"` jest dead code

**Pliki:** `convex/schema.ts:8`, `src/types/game.ts:22`

Stan `"starting"` jest zdefiniowany w schemacie i typie `Room`, ale nigdzie nie jest
ustawiany. Żadna mutacja nie przechodzi do stanu `starting`. Jeżeli planowany jest
odliczanie przed grą (`starting` → `playing`), powinna być mutacja `startGame`.
Jeśli nie — należy go usunąć ze schematu.

---

### M4 — Klucz `lobby_turn_time_unlimited` istnieje w i18n, ale nigdy nie jest używany

**Pliki:** `messages/en.json`, `messages/pl.json`

Klucz `lobby_turn_time_unlimited: "∞"` jest zdefiniowany w obu plikach tłumaczeń,
ale panel ustawień nie ma opcji "bez limitu czasu". Opcje to tylko `[30, 60, 90, 120]`.
Albo funkcja powinna być zaimplementowana, albo klucz usunięty.

---

### M5 — Brak potwierdzenia przed kick i transfer hosta

**Plik:** `src/components/game/PlayerCard.tsx`

Jedno kliknięcie natychmiast wyrzuca gracza lub oddaje status hosta. To destruktywna akcja
bez możliwości cofnięcia (gracz musi ponownie dołączyć kodem). Wypadałoby dodać dialog
potwierdzenia, szczególnie dla projektu portfolio demonstrowanego publicznie.

---

### M6 — `useLocale()` wywoływany w komponentach tylko dla side-effectu

**Pliki:** większość komponentów (`PlayerCard`, `GamePanel`, `LobbyPage`, etc.)

```typescript
useLocale(); // zwracana wartość ignorowana
```

Komponenty wywołują `useLocale()` wyłącznie by re-renderować się po zmianie języka
(Paraglide nie jest reaktywny bez subskrypcji kontekstu). Działa poprawnie, ale jest
nieczytelne — czytelnik kodu nie rozumie dlaczego hook jest wywołany bez użycia wartości.

**Rekomendacja:** dodać komentarz wyjaśniający *dlaczego* (np. `// re-render on locale change`)
lub rozważyć własny hook `useTranslation()` zwracający obiekt `m` z typem reaktywnym.

---

### M7 — Opis "Znajdź zdrajcę" zawiera mechanikę głosowania, której nie ma w planach

**Pliki:** `messages/en.json`, `messages/pl.json` — klucze `tip_3_title`, `tip_3_desc`

Ekran "Jak grać" opisuje głosowanie (`"vote out who you suspect"`), które:
1. Nie jest częścią oryginalnych zasad Saboteura,
2. Nie jest zaimplementowane ani wymienione w schemacie gry.

Jeśli głosowanie nie jest planowane, opis wprowadza w błąd. Jeśli jest planowane —
potrzebuje odpowiednich tabel w schemacie.

---

## 🟢 NISKIE

### L1 — Schema ma pola `optional`, które zawsze są wypełniane przy tworzeniu

**Plik:** `convex/schema.ts:10-13`

```typescript
numberOfRounds: v.optional(v.number()),
turnTimeLimitSeconds: v.optional(v.number()),
enableBrokenToolPenalty: v.optional(v.boolean()),
```

Mutacja `create` zawsze ustawia te pola. `resolveSettings` w `game.ts` też obsługuje
brakujące wartości przez `?? default`. Skutek: dwie warstwy obronności bez potrzeby.
Można zmienić na `v.number()` / `v.boolean()` i usunąć `resolveSettings`.

---

### L2 — `numberOfRounds` max hardcoded w dwóch miejscach

**Pliki:** `convex/rooms.ts:225`, `src/components/game/SettingsPanel.tsx:52`

Konwex clampuje do 3, stepper ma `max={3}`. Przy zmianie reguł gry trzeba pamiętać
o obu miejscach.

---

### L3 — Brak obsługi błędu gdy `VITE_CONVEX_URL` nie jest ustawiony

**Plik:** `src/main.tsx:8`

```typescript
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
```

Jeśli zmienna środowiskowa nie jest ustawiona, `undefined` zostanie przekazane jako URL.
`ConvexReactClient` może cicho zawieść lub rzucić cryptic error.

**Rekomendacja:**
```typescript
const url = import.meta.env.VITE_CONVEX_URL;
if (!url) throw new Error("VITE_CONVEX_URL is not set");
const convex = new ConvexReactClient(url);
```

---

### L4 — `nickname` — brak walidacji długości po stronie serwera

**Plik:** `convex/rooms.ts` — mutacje `create`, `join`

Frontend ogranicza nick do 20 znaków (`maxLength={20}`), ale serwer nie sprawdza długości.
Klient z wyłączonym frontendem może zapisać nick dowolnej długości.

**Rekomendacja:**
```typescript
nickname: v.string(), // + guard: args.nickname.trim().slice(0, 20) || "Górnik"
```

---

### L5 — `HowToPlayPanel` tworzy nowe referencje funkcji w tablicy `TIPS` przy każdym renderze

**Plik:** `src/components/HowToPlayPanel.tsx:12-16`

```typescript
const TIPS: TipDef[] = [
  { titleFn: () => m.tip_1_title(), ... },
```

`TIPS` jest definiowany wewnątrz modułu (na poziomie globalnym), więc NIE jest
re-tworzony przy każdym renderze — to jest OK. Nie wymaga akcji, jedynie weryfikacja.

---

## Podsumowanie

| Priorytet | Liczba znalezisk |
|-----------|-----------------|
| 🔴 KRYTYCZNY | 2 (C1, C2) |
| 🟠 WYSOKI | 4 (H1, H2, H3, H4) |
| 🟡 ŚREDNI | 7 (M1–M7) |
| 🟢 NISKI | 5 (L1–L5) |
| **Razem** | **18** |

---

## Kolejność napraw (rekomendowana)

1. **H1** — `getAvatarUrl` bug (zepsuje produkcję przy pierwszym buildzie)
2. **H4** — hardcoded English fallback (szybka poprawka)
3. **H3** — cleanup batch continuation (Convex best practice)
4. **C2** — walidacja `avatarId` na serwerze
5. **H2** — strona 404
6. **M1** — uproszczenie stanu pending
7. **M3** — usunięcie `"starting"` lub implementacja `startGame`
8. **M4** — ∞ opcja lub usunięcie klucza i18n
9. **C1** — auth (większy refactor, priorytet przed wdrożeniem publicznym)
10. Pozostałe w dowolnej kolejności

---

*Projekt jest w dobrym stanie ogólnym. Architektura Convex (heartbeat cleanup, host
reassignment, index-based queries) jest poprawna i przemyślana. Głównym ryzykiem przed
wdrożeniem publicznym jest C1 (brak prawdziwej autoryzacji) i H1 (asset URL w buildzie).*
