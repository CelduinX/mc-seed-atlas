# Seed Explorer — technische Validierung

Stand: 14.10.2026. Keine Website geöffnet, keine optische Kontrolle und keine Screenshots. Die optische Abnahme übernimmt der Nutzer.

## Generierungsgenauigkeit

Unveränderte offizielle Minecraft Java Release-Serverdateien wurden über das Mojang-Versionsmanifest geladen und deren SHA1 geprüft. Bei obfuskierten Releases werden zusätzlich die offiziellen, SHA1-geprüften Server-Mappings für den reflektiven Zugriff verwendet; die JAR-Dateien werden nicht umgeschrieben. `scripts/VanillaOracle.java` initialisiert Vanilla-Registries, den Noise-Generator für Standard beziehungsweise Große Biome und den BiomeManager mit seiner blockgenauen Voronoi-Auswahl bei Y=64. Dieser Referenzpfad verwendet weder Cubiomes noch dessen Tabellen.

| Release | Standard + Große Biome | Abweichungen |
| --- | ---: | ---: |
| 1.18.2 | 29.472 Abfragen | 0 |
| 1.19, 1.19.1, 1.19.2, 1.19.3, 1.19.4 | 147.360 Abfragen | 0 |
| 1.20 und 1.20.1–1.20.6 | 206.304 Abfragen | 0 |
| 1.21 und 1.21.1–1.21.11 | 353.664 Abfragen | 0 |
| 26.1, 26.1.1, 26.1.2, 26.2, 26.3 | 147.360 Abfragen | 0 |

Insgesamt **884.160 übereinstimmende unabhängige Punktabfragen**, 29.472 pro Release. Seeds: 0, 123456789, −123456789, 9223372036854775807, −9223372036854775808 und 3000000007807634720. Pro Seed/Welttyp 400 deterministisch verteilte Punkte, Grenz-/Ursprungspunkte und zwei dichte Linien über negative und positive Kachelgrenzen. Dies ist eine umfangreiche Stichprobe, kein Beweis für jede mögliche Weltkoordinate.

**Historische Einschränkung:** Vor 1.19.3 kann der Vanilla-RTree bei gleichwertigen Biomkandidaten den vorherigen Suchtreffer bevorzugen (MC-241546). Für unabhängige, reproduzierbare Punktabfragen leert der Oracle vor jedem Zugriff diesen ThreadLocal-Suchcache. Die Anwendung liefert ebenfalls eine von der Abfragereihenfolge unabhängige Detailkarte. Mit beibehaltenem Vanilla-Cache wurden in 1.19.2 beim Seed 9223372036854775807, Standardwelt, Z=−129, X=498–500 drei Abweichungen beobachtet: Vanilla mit Suchhistorie Tiefsee, unabhängige Abfrage und Atlas kalte Tiefsee. Bereits generierte Spielwelten können daher an einzelnen historischen Biomgrenzen abweichen. Der Cache-Vergleich lässt sich mit der Umgebungsvariable `ATLAS_VANILLA_KEEP_CACHE=1` und `scripts/validate-vanilla.ps1 -Versions 1.19.2` wiederholen; dieser Lauf schlägt erwartungsgemäß beim Vergleich fehl.

Versionsdefinitionen und Generatorfamilien stehen zentral in `src/versions.ts`. `scripts/create-version-header.ts` erzeugt daraus `wasm/versions.h`; `npm run build:wasm` führt dies automatisch aus. Startbiome und Kartenlegende berücksichtigen die Einführung von Mangrovensumpf/Tiefem Dunkel (1.19), Kirschhain (1.20), Blassem Garten (1.21.4), Schwefelhöhlen (26.2) und Gesprenkeltem Wald (26.3). Unmögliche Startbiom-Suchen werden sowohl im Dialog als auch im Worker verhindert.

Die wiederholbaren Tests vergleichen zusätzlich Blockkacheln mit Einzelabfragen über negative Kachelgrenzen für sämtliche Versionen/Welttypen und führen alle Samplingstufen aus. Ein Auszug der unabhängigen Vanilla-Ergebnisse liegt in `tests/vanilla-fixtures.json`.

## Oberfläche und Performance

Technischer Integrationstest auf AMD Ryzen 7 7800X3D (8 Kerne/16 logische Prozessoren), Windows, Node.js 24.19.0, jsdom und nativem Canvas2D ausschließlich im Arbeitsspeicher, zwei echten WASM-Worker-Threads; Kartenfläche 1200×600 CSS-Pixel, DPR=1. Letzter Lauf nach Abschluss der separaten Exportmessung:

| Messung | Ergebnis |
| --- | ---: |
| Vollständige Übersichtskacheln nach Worker-Initialisierung | 407,4 ms |
| Freigabe nach Start, inklusive Initialisierung, Übersicht, Startdetail und Spawn | 1.661,3 ms |
| Karten-Zeichenaufgaben, Maximum | 14,91 ms |
| Karten-Zeichenaufgaben, 95. Perzentil | 1,67 ms |
| Worker-Ergebnisverarbeitung auf dem Hauptthread, Maximum | 1,80 ms |

Diese Messung prüft den tatsächlich implementierten Zeichen-/Kachelpfad ohne Browser. Browser-Compositing, reale Touch-Hardware und mobile Laufzeiten wurden nicht gemessen. Laufzeiten können mit CPU-Auslastung variieren; unter gleichzeitiger Export-/Buildlast trat in einem separaten Lauf ein Zeichenmaximum von 17,6 ms auf. Der Regressionstest prüft den Zwei-Sekunden-Grenzwert für die Übersichtskacheln und 16 ms im 95. Perzentil für Hauptthread-Aufgaben. Rohdaten: `.cache/ui-performance.json`.

Geprüfte Abläufe: Seedfehler, Zufallsseed, 64-Bit-Grenzseed, Mausposition/Biomabfrage, Tastaturzoom, Mausrad, Zwei-Finger-Pinch, Koordinatengrenzen und feldbezogene Fehler, Sprachwechsel ohne Seedverlust, schnelle Versionswechsel, Worker-Bereinigung, HTML-Hot-Update, simulierter WASM-Ladefehler und erfolgreiche Wiederholung. Zusätzlich: Platzhalter bleibt bis zur vollständigen Freigabe stehen; alle 16 Übersichtskacheln und Spawn liegen dann vor; Fortschritt innerhalb der Kartenbox; Download gesperrt bis zur Freigabe; Exportdialog, echter Bilddownload, Abbruch, veraltete Exportantworten und Wiederholung nach simuliertem Exportfehler. `npm test`: **27 Tests bestanden**.

## Geschätzter Weltspawn

`wasm/spawn-reference.c` ruft den gepinnten, gepatchten Cubiomes-Estimator unabhängig mit nativem GCC auf. 300 Referenzen für alle 30 Releases, beide Welttypen und Seeds 0, 123456789, −123456789 sowie beide 64-Bit-Grenzwerte stimmen mit der WASM-Ausgabe überein. Wiederholbar mit `powershell -ExecutionPolicy Bypass -File scripts/validate-spawn.ps1`; Fixtures: `tests/spawn-fixtures.json`.

Dies validiert ausschließlich die Cubiomes-Schätzung. Minecraft berücksichtigt zusätzlich Gelände und Blöcke; eine Übereinstimmung mit dem tatsächlichen Vanilla-Weltspawn wird nicht behauptet. Die Oberfläche kennzeichnet diese Einschränkung. Der Pin ist an seiner Spitze verankert, bleibt 36×44 CSS-Pixel groß und fällt nach Freigabe einmalig 600 ms animiert; bei reduzierter Bewegung erscheint er unmittelbar. Die optische Wirkung wurde nicht geprüft.

## Ausschnitt-Export und Komprimierung

Der Gesamtexport wurde entfernt. Der Downloaddialog exportiert ausschließlich den beim Öffnen sichtbaren Ausschnitt in dessen Original-Sampling-Auflösung, ohne Pin oder Bedienelemente. Ausschnitt, Seed und Einstellungen bleiben während des Exports festgehalten. Die Weltgrenzen und das am Ursprung ausgerichtete Raster bleiben erhalten.

Der Worker berechnet die Biome einmal und erzeugt aus denselben Samples zwei Dateien: verlustfreies WebP (@jsquash/webp 1.5.0, method 3) und JPEG (IJG 9f, Qualität 90, ohne Chroma-Subsampling). Die tatsächlich kleinere Datei wird mit passender MIME-Type und Dateiendung heruntergeladen. Falls WebP nicht geladen oder kodiert werden kann, bleibt JPEG verfügbar. Bei Ausschnitten über 4.194.304 Samples wird direkt JPEG in Zeilenbändern erstellt, um große WebP-Raster zu vermeiden.

WebP erhält alle Biomfarben exakt. Tests prüfen die dekodierten Samples in allen vier Detailstufen, die Dateigrößen-Auswahl, JPEG-Fallback, Abbruch, veraltete Antworten und das Fehlen der Gesamtexport-Auswahl. Keine Browser-Vorschau und keine Bilddateien werden erstellt.

Technische Ausschnittmessung auf dem oben genannten Rechner, Minecraft 26.3/Standard, Seed −123456789, 1200×600 CSS-Pixel; echte WASM-Encoder, Ausgabebilder nur im Speicher. Der Startausschnitt verwendet 4096 Blöcke Breite, die anderen Messungen eine Zoomauflösung von scale/2 Blöcken je CSS-Pixel:

| Detailstufe | Bildabmessungen | Berechnung und beide Encoder | JPEG 90 | Verlustfreies WebP | Gewählt |
| ---: | ---: | ---: | ---: | ---: | --- |
| 64 | 314×300 | 319 ms | 115.857 Bytes | 29.902 Bytes | WebP |
| 16 | 600×300 | 391 ms | 132.849 Bytes | 19.406 Bytes | WebP |
| 4 (Startansicht) | 1024×512 | 1.464 ms | 157.562 Bytes | 18.490 Bytes | WebP |
| 1 | 600×300 | 93 ms | 21.379 Bytes | 1.810 Bytes | WebP |

Damit ist die Startansicht etwa 88 % kleiner als JPEG 90, bei verlustfreien Biomfarben. Der WebP-Rasterpuffer ist auf 16 MiB begrenzt; zusätzlich benötigen Encoder und komprimierte Dateien Speicher. Der Prozess-RSS dieser Messreihe lag maximal bei 82,6 MB. Dies ist kein Browser-Speicherbenchmark. Wiederholbar mit node scripts/benchmark-export.ts; Rohdaten: .cache/viewport-export-performance.json.

## Build und Auslieferung

WASM kompiliert mit Emscripten 4.0.15, Cubiomes `e61f90580cbdd883214a8054670dacae655e59c0` und SeedForge-Patches `8cb704bbde7e0de557060be06d51d8305280f11b`. Zusätzlich wird der geschätzte Spawn-Finder eingebunden; unbenutzte Struktur-/Suchfunktionen entfernt der Linker. Ein separates WASM-Modul verwendet den von Emscripten gepinnten IJG-libjpeg-9f-Port; der WebP-Encoder stammt aus @jsquash/webp 1.5.0 und wird lokal ausgeliefert. Herkunft und Lizenzhinweise sind unter `/wasm/LICENSES.txt` enthalten.

Vite- und mehrstufiger Docker-Produktionsbuild erfolgreich. HTTP-Prüfung des gebauten Nginx-Containers: HTML, Karten-/Exportworker-JavaScript, beide WASM-Loader, Generator-, JPEG- und WebP-WASM-Dateien, Platzhalterbild und Lizenzhinweise jeweils Status 200; WASM mit `application/wasm`. Der Prüfcontainer wurde anschließend gestoppt.
