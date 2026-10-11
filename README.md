# Seed Atlas

HTML, strikt geprüftes TypeScript und TailwindCSS (Vite-Plugin). Google Fonts (Inter) und Font Awesome Free 6.7.2 werden per CDN eingebunden. Der Seed Explorer unter `/#/seed-explorer` bietet eine lokal berechnete, interaktive Minecraft-Java-Biomkarte.

## Seed Explorer

- Releases: 26.1, 26.1.1, 26.1.2, 26.2 und 26.3; Standard und Große Biome.
- Vorzeichenbehaftete 64-Bit-Seeds, Zufallsbutton, Verschieben, Maus-/Touch-Zoom, Tastatursteuerung.
- Overworld-Biomschnitt bei Y=64, keine Geländeoberfläche. X/Z sind auf −10.000 bis +10.000 begrenzt. Die Gesamtübersicht kann außerhalb dieser Grenzen leere Randflächen zeigen, wenn das Seitenverhältnis dies erfordert.
- Ein oder zwei Worker berechnen 128×128-Kacheln mit Sampling 64/16/4/1. Vor der Anzeige werden die vollständige Übersicht (64 Blöcke/Sample), die Startansicht in ihrer Detailstufe und der geschätzte Weltspawn berechnet. Bis dahin bleibt der abgedunkelte Platzhalter mit Ladebalken sichtbar. Weitere Details laden beim Navigieren nach. Punktabfragen sind auf Blockauflösung. Der Detailcache hat maximal 64 MiB; die Übersicht bleibt separat erhalten.
- Animierter Spawn-Pin mit ausdrücklich gekennzeichneter Schätzung; die tatsächliche Minecraft-Spawnposition kann abweichen.
- Bilddownload ausschließlich des sichtbaren Ausschnitts: ein Pixel pro Sample der beim Öffnen des Downloaddialogs aktiven Detailstufe, ohne Bedienelemente und Pin. Ein separater Worker berechnet die Biome einmal und vergleicht verlustfreies WebP mit JPEG (Qualität 90, ohne Chroma-Subsampling). Die kleinere Datei wird automatisch heruntergeladen. Fortschritt, Abbruch und Wiederholung sind im Dialog verfügbar. Bei sehr großen Ausschnitten oder einem WebP-Ladefehler wird JPEG verwendet.
- Nur ganzzahlige numerische Seeds sind zugelassen. Texte, Datapacks, Mods und andere Dimensionen sind nicht unterstützt.

Die mitgelieferten Assets `public/wasm/biomes.js` und `biomes.wasm` erlauben sofortige Entwicklung ohne lokale C-Toolchain. Neu erzeugen mit `npm run build:wasm` (Docker erforderlich). Der Docker-Produktionsbuild kompiliert sie selbst mit Emscripten 4.0.15. Quellen und Referenzen stehen in `vendor/README.md`, auslieferbare Lizenzhinweise unter `/wasm/LICENSES.txt`.

Der Bildexport verwendet zusätzlich `public/wasm/jpeg.js` und `jpeg.wasm`, die derselbe Build erstellt, sowie den lokal mitgelieferten WebP-Encoder `/wasm/webp.wasm` aus dem fest gepinnten Paket `@jsquash/webp` 1.5.0. This software is based in part on the work of the Independent JPEG Group.

## Startbiom

Unter `/#/biome-finder` stehen 29 Oberwelt-Biome zur Auswahl. Die Kategorien umfassen offene Landschaften, Wälder, Wüste, Schnee und Feuchtgebiete; die Filter zeigen die jeweilige Anzahl. Flüsse, Strände, Küsten, Ozeane, Höhlenbiome und schmale Übergangsbiome sind ausgeschlossen. Hohe Bergbiome werden wegen der Prüfung bei Y=64 ebenfalls nicht angeboten.

Jede Card übergibt eine feste Biom-ID an die Seed-Suche. Geprüft werden das Biom am geschätzten Spawn und der gewählte Mindestanteil im Biomradius; die tatsächliche Minecraft-Spawnposition kann davon abweichen. Seltene Biome und große Mindestradien können längere Suchen erfordern. Für die 23 neu ergänzten Biome werden bis zum Einfügen eigener Screenshots ausdrücklich gekennzeichnete Icon-Platzhalter angezeigt; die vorhandenen sechs Screenshots bleiben erhalten.

## Technische Prüfung

```sh
npm run typecheck
npm test
npm run build
npm run build:wasm
```

`npm test` prüft unabhängige Vanilla-Referenzdaten, Kachelübergänge, Seed-Verarbeitung, Grenzen, Zoomanker, Cache, Worker-Abbruch sowie DOM-/Canvas-Bedienung einschließlich Sprachwechsel, HTML-Hot-Update und Ladefehler. Der Integrationstest nutzt jsdom, ein Canvas im Arbeitsspeicher und echte Node-WASM-Worker. Er öffnet keinen Browser und schreibt keine Bilder.

Zusätzlich werden Spawn-Schätzungen gegen native Cubiomes-Fixtures, die Startfreigabe, Bildabmessungen und Farben, automatische Formatwahl sowie Download/Abbruch/Fehler geprüft. Die native Spawn-Referenz lässt sich mit `powershell -ExecutionPolicy Bypass -File scripts/validate-spawn.ps1` erneut erzeugen und vergleichen. Ausschnitt-Exportmessungen: `node scripts/benchmark-export.ts`; dieser Lauf schreibt ausschließlich Messdaten in `.cache`.

Den vollständigen Vanilla-Vergleich unter Windows mit Java 25 und PowerShell wiederholen:

```sh
npm run test:vanilla
```

Dieser Test lädt offizielle Release-Serverdateien in `.cache/vanilla`, prüft ihre SHA1-Hashes und ruft deren unveränderten Biomgenerator auf. Minecraft wird dabei nicht als Server gestartet. Nach erfolgreichem Vergleich werden die dauerhaft mitgelieferten Referenzdaten aktualisiert. Prüfergebnisse und Grenzen der Performance-Messung: `docs/seed-explorer-validation.md`.

Die kompakte Sprachauswahl bietet Deutsch und Englisch mit lokal eingebundenen Länderflaggen (Deutschland/Großbritannien). Ohne manuelle Auswahl wird die erste unterstützte Sprache aus der Browser-Sprachliste erkannt (`de`/`en`, einschließlich regionaler Varianten); ohne Treffer gilt Englisch. Die manuelle Auswahl wird in Local Storage gespeichert. Die aktive Sprache setzt das HTML-Attribut `lang` und die Texte mit `data-i18n`; Übersetzungen liegen in `src/language.ts`.

## Entwicklung

Voraussetzung: Node.js 24 und npm. Tests und Hilfsskripte laufen mit der nativen TypeScript-Typentfernung von Node; ein zusätzlicher Transpiler ist nicht erforderlich. Lokale TypeScript-Module werden ausdrücklich mit `.ts` importiert.

```sh
npm ci
npm run typecheck
npm run dev
```

Adresse: http://localhost:5173

Alternativ vollständig mit Docker:

```sh
docker compose -f compose.dev.yaml up --build -d
```

CSS und TypeScript werden per Hot Module Replacement aktualisiert. Änderungen an `index.html` ersetzen den Body-Inhalt und aktualisieren Titel, Sprache, Body-Attribute, Metadaten und Stylesheet-Links ohne Seitenreload. Eingaben und lokale DOM-Zustände werden dabei zurückgesetzt. Script-Tags werden nicht erneut ausgeführt; Anwendungscode gehört in `src/main.ts`. Bei HTML-Updates kann JavaScript über das Fenster-Event `app:html-updated` neue Elemente initialisieren. Event-Listener und Timer beim TypeScript-Hot-Update über `import.meta.hot.dispose` aufräumen.

Änderungen an Vite-Konfiguration und Abhängigkeiten können einen Neustart erfordern. Docker verwendet Polling, damit Dateiänderungen auch unter Windows erkannt werden.

## Deployment

```sh
docker compose up --build -d
```

Adresse: http://localhost:8080 (Port über `PORT` konfigurierbar). Ein mehrstufiger Docker-Build erstellt statische Produktionsdateien, die Nginx ausliefert. Nach Änderungen für das Deployment erneut bauen.

```sh
docker compose down
docker compose -f compose.dev.yaml down
```

## Dateien

- `index.html`: HTML-Grundgerüst, Navigation und CDN-Links
- `src/style.css`: TailwindCSS und Basisschrift
- `src/theme.css`: Seed-Atlas-Dark-Theme mit Markenfarben und semantischen Farbwerten; z. B. `bg-surface`, `text-primary` und `border-border`
- `src/main.ts`: Einstiegspunkt für TypeScript
- `src/seed-explorer.ts`: Kartenoberfläche und Navigation; Worker, Generator und Kachelcache in den zugehörigen Explorer-Modulen
- `vite.config.ts`: Entwicklungsserver und Live-HTML-Updates

CDN-Schrift und Icons benötigen eine Internetverbindung. TailwindCSS wird lokal gebaut, auch für das Deployment.

Dokumentation: [Tailwind mit Vite](https://tailwindcss.com/docs/installation/using-vite), [Vite HMR](https://vite.dev/guide/api-hmr).
