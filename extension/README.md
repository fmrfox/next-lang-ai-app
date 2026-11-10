# Languito – rozszerzenie Chrome

Zaznacz słowo lub zdanie na dowolnej stronie → prawy przycisk → **Utwórz fiszkę w Languito**
(albo skrót `Alt+Shift+F`). AI tworzy fiszkę z uwzględnieniem kontekstu zdania i zapisuje ją
na koncie użytkownika w stałej, przypiętej kategorii **„Z rozszerzenia”** (w bazie klucz
`__languito_extension__`, w UI nazwa w języku interfejsu). Kategorii nie da się usunąć ani
dogenerować do niej fiszek; pojedyncze fiszki można z niej usuwać.

Manifest V3 · React 19 · TypeScript · Vite.

## Uruchomienie lokalne

```bash
cd extension
npm install
npm run build:dev        # VITE_LANGUITO_URL z .env.development (http://localhost:3000)
```

W Chrome: `chrome://extensions` → tryb dewelopera → **Załaduj rozpakowane** → `extension/dist`.
Po instalacji otworzy się `/{locale}/extension/connect` — zaloguj się i kliknij **Połącz rozszerzenie**.

Produkcja: `npm run build` (używa `.env.production` → `https://www.languito.eu` — kanoniczny host;
`languito.eu` przekierowuje na www, a przekierowanie gubi nagłówek `Authorization`). Manifest obejmuje obie domeny.

## Dystrybucja

- `npm run release` — buduje wersję produkcyjną, pakuje ją do ZIP i kopiuje do
  `public/downloads/languito-extension.zip` (pobierany z popupu na stronie). Uruchom po każdej zmianie rozszerzenia.
- Po publikacji w Chrome Web Store ustaw w Vercel `NEXT_PUBLIC_CHROME_EXTENSION_URL=<link do sklepu>` —
  popup na stronie pokaże wtedy przycisk „Dodaj do Chrome” zamiast pobierania ZIP-a.

Popup promujący (`src/components/extension/extension-promo-modal.tsx`) pokazuje się po decyzji o cookies,
tylko na desktopie, gdy rozszerzenie nie jest zainstalowane; po zamknięciu wraca po 30 dniach.

## Jak to działa

| Element | Plik | Rola |
| --- | --- | --- |
| Service worker | `src/background/index.ts` | menu kontekstowe, skrót, wywołania API, zapis historii |
| Skrypty wstrzykiwane | `src/background/page-scripts.ts` | odczyt zaznaczenia + zdania wokół, toast (Shadow DOM) |
| Bridge | `src/bridge/index.ts` | content script tylko na domenie Languito; odbiera token ze strony `/extension/connect` |
| Popup | `src/popup/` | status połączenia, języki i poziom, ostatnio dodane słowa |

**Uwierzytelnianie.** Rozszerzenie nie współdzieli sesji Supabase (rotacja refresh tokenów
wylogowywałaby użytkownika z aplikacji). Zamiast tego strona `/extension/connect` (wymaga
zalogowania) wydaje osobny token `lgt_…`; w bazie (`ExtensionToken`) trzymany jest tylko jego
SHA-256. „Odłącz” w popupie odwołuje token (`DELETE /api/extension/token`).

**API** (Next.js, nagłówek `Authorization: Bearer lgt_…`):

- `POST /api/extension/flashcards` — `{ text, context?, learningLanguage, nativeLanguage, level }` → `{ duplicate, flashcard: { id, term, translation, example, exampleTranslation } }`
- `GET /api/extension/me` — `{ email }`
- `DELETE /api/extension/token`

Serwer zapisuje fiszkę w konwencji aplikacji: `targetLanguage` = język nauki (`translate_text`, przód karty),
`sourceLanguage` = język ojczysty (`origin_text`). Tokeny nieużywane przez 90 dni wygasają.

**Uprawnienia:** `contextMenus`, `storage`, `activeTab` + `scripting` (dostęp tylko do karty, na której
użytkownik wywołał akcję), `notifications` (fallback na stronach, gdzie nie da się wstrzyknąć toasta,
np. `chrome://` czy podgląd PDF), host tylko dla domeny Languito.

## Ikony

`python3 scripts/generate-icons.py` (wymaga Pillow) generuje `public/icons/*`.
