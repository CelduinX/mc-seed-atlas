# Entwicklung und technische Dokumentation

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

Dieser Test lädt offizielle Release-Serverdateien und gegebenenfalls deren offizielle Server-Mappings in `.cache/vanilla`, prüft ihre SHA1-Hashes und ruft deren unveränderten Biomgenerator auf. Für Versionen vor 1.19.3 wird der historische Suchcache vor jeder Punktabfrage geleert; dadurch werden Ergebnisse unabhängig von der Abfragereihenfolge verglichen. Einzelne historische Biomgrenzen können von bereits generierten Spielwelten abweichen. Minecraft wird dabei nicht als Server gestartet. Nach erfolgreichem Vergleich werden die dauerhaft mitgelieferten Referenzdaten aktualisiert. Prüfergebnisse und Grenzen der Performance-Messung: `docs/seed-explorer-validation.md`.

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
