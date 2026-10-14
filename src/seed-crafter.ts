import { query, closest } from './dom.ts';
import { VERSIONS, biomeAvailable, type Version } from './versions.ts';
import { BIOMES } from './biome-palette.ts';
import './seed-crafter.css';

const copy = {
  de: {
    eyebrow: 'DEINE WELT. DEINE REGELN.', intro: 'Lege selbst fest, welche Biome, Landschaften und Strukturen deinen Start ausmachen sollen.',
    draft: 'UI-Entwurf', templates: 'Ein Spielziel. Dein passender Seed.', templatesHint: 'Templates beschreiben Suchwünsche, keine festen Seeds. Wähle ein Profil für deine nächste Welt. Die Template-Suche befindet sich noch im Entwurf.',
    templateMode: 'Template wählen', manualMode: 'Eigene Parameter', templateModeHint: 'Mit einem fertigen Suchprofil starten', manualModeHint: 'Deine Wünsche selbst festlegen', modeLabel: 'Art der Seed-Suche',
    templateSettings: 'Einstellungen für dieses Template', templateSummary: 'Dein Template', manualSummary: 'Deine Einstellungen', manualTitle: 'Individuelles Suchprofil', templateRadiusHint: 'Der Radius gilt nur für die Template-Suche.',
    recommended: 'Für Entdecker', all: 'Alle Biome in der Nähe', allHint: 'Eine Vorlage für alle Oberflächenbiome im eingestellten Radius um deinen Suchmittelpunkt.',
    discoverTag: 'Entdecken', buildTag: 'Bauen', islandsTag: 'Erkunden',
    build: 'Platz zum Bauen', buildHint: 'Viel ebenes Land für deine großen Ideen.', islands: 'Insel-Abenteuer', islandsHint: 'Mehr Wasser, Inseln und neue Horizonte.',
    rare: 'Seltene Biome entdecken', rareHint: 'Pilzland, Tafelberge und weitere seltene Biome in Reichweite.',
    village: 'Dorf als Nachbar', villageHint: 'Ein Dorf in deiner Nähe als Ausgangspunkt für dein Abenteuer.',
    mountains: 'Bauen mit Bergpanorama', mountainsHint: 'Eine offene Startfläche mit eindrucksvollen Bergbiomen in der Umgebung.',
    survivalTag: 'Survival', structures: 'Strukturen', villageNearby: 'Dorf in der Nähe',
    villageDistance: 'Maximale Entfernung zum Dorf', villageDistanceHint: 'So weit darf das Dorf vom Suchmittelpunkt entfernt liegen.',
    settings: 'Lege deine Parameter fest', settingsHint: 'Bestimme, wonach in deiner Wunschwelt gesucht werden soll.', reset: 'Einstellungen zurücksetzen',
    version: 'Minecraft Java Version', world: 'Weltvariante', standard: 'Standard', large: 'Große Biome', center: 'Mittelpunkt der Suche', spawn: 'Geschätzter Weltspawn', origin: 'Weltursprung (0 / 0)',
    radius: 'Suchradius', radiusHint: 'So weit möchtest du vom Mittelpunkt aus erkunden.', radiusLow: 'Kurze Wege', radiusHigh: 'Großes Abenteuer',
    diversity: 'Biomvielfalt', diversityHint: 'Wie abwechslungsreich soll deine Umgebung sein?', diversityLow: 'Wenige, große Biome', diversityHigh: 'Alle Oberflächenbiome',
    flatness: 'Flaches Gelände', flatnessHint: 'Wie wichtig ist dir Platz für entspanntes Bauen?', flatnessLow: 'Nicht wichtig', flatnessHigh: 'Sehr wichtig',
    water: 'Gewässer', waterHint: 'Wähle den gewünschten Wasseranteil in deiner Umgebung.', waterLow: 'Viel Land', waterHigh: 'Viel Wasser',
    biomes: 'Biomauswahl', biomesHint: 'Wähle die Biome, die dir besonders wichtig sind.', selectAll: 'Alle auswählen', clear: 'Auswahl aufheben',
    summary: 'Dein Suchprofil', custom: 'Individuell angepasst', template: 'Vorlage', blocks: 'Blöcke', surface: 'Oberflächenbiome', focus: 'Suchgebiet',
    preferences: 'Deine Prioritäten', varied: 'Biomvielfalt', flat: 'Flaches Gelände', wet: 'Gewässeranteil',
    action: 'Passenden Seed finden', unavailable: 'Die Seed-Suche kommt als nächster Schritt. Du kannst bereits alle Einstellungen ausprobieren.',
    illustration: 'Schematisches Suchgebiet', empty: 'Keine Biome ausgewählt', selection: 'ausgewählt', note: 'Die Einstellungen beschreiben deine Wunschwelt. Ein passender Seed wird erst mit der späteren Suche geprüft.',
  },
  en: {
    eyebrow: 'YOUR WORLD. YOUR RULES.', intro: 'Decide which biomes, landscapes and structures should define your starting world.',
    draft: 'UI draft', templates: 'One play style. Your matching seed.', templatesHint: 'Templates describe search preferences, not fixed seeds. Choose a profile for your next world. Template search is still a draft.',
    templateMode: 'Choose a template', manualMode: 'Custom parameters', templateModeHint: 'Start with a ready-made search profile', manualModeHint: 'Set your own preferences', modeLabel: 'Seed search method',
    templateSettings: 'Settings for this template', templateSummary: 'Your template', manualSummary: 'Your settings', manualTitle: 'Custom search profile', templateRadiusHint: 'This radius applies only to template search.',
    recommended: 'For explorers', all: 'All biomes nearby', allHint: 'A template for all surface biomes within the selected radius around your search centre.',
    discoverTag: 'Discovery', buildTag: 'Building', islandsTag: 'Exploration',
    build: 'Room to build', buildHint: 'Plenty of flat land for your big ideas.', islands: 'Island adventure', islandsHint: 'More water, islands and new horizons.',
    rare: 'Discover rare biomes', rareHint: 'Mushroom fields, badlands and other rare biomes within reach.',
    village: 'A village nearby', villageHint: 'A nearby village as a starting point for your adventure.',
    mountains: 'Build with mountain views', mountainsHint: 'An open starting area with impressive mountain biomes nearby.',
    survivalTag: 'Survival', structures: 'Structures', villageNearby: 'Nearby village',
    villageDistance: 'Maximum village distance', villageDistanceHint: 'How far the village may be from your search centre.',
    settings: 'Set your parameters', settingsHint: 'Decide what to look for in your ideal world.', reset: 'Reset settings',
    version: 'Minecraft Java version', world: 'World type', standard: 'Default', large: 'Large Biomes', center: 'Search centre', spawn: 'Estimated world spawn', origin: 'World origin (0 / 0)',
    radius: 'Search radius', radiusHint: 'How far would you like to explore from the centre?', radiusLow: 'Short journeys', radiusHigh: 'A big adventure',
    diversity: 'Biome variety', diversityHint: 'How varied should your surroundings be?', diversityLow: 'A few large biomes', diversityHigh: 'All surface biomes',
    flatness: 'Flat terrain', flatnessHint: 'How important is having room for easy building?', flatnessLow: 'Not important', flatnessHigh: 'Very important',
    water: 'Bodies of water', waterHint: 'Choose your preferred water coverage.', waterLow: 'More land', waterHigh: 'More water',
    biomes: 'Biome selection', biomesHint: 'Choose the biomes that matter most to you.', selectAll: 'Select all', clear: 'Clear selection',
    summary: 'Your search profile', custom: 'Customised', template: 'Template', blocks: 'blocks', surface: 'surface biomes', focus: 'Search area',
    preferences: 'Your priorities', varied: 'Biome variety', flat: 'Flat terrain', wet: 'Water coverage',
    action: 'Find a matching seed', unavailable: 'Seed search is coming next. You can already try out all the settings.',
    illustration: 'Schematic search area', empty: 'No biomes selected', selection: 'selected', note: 'These settings describe your ideal world. A matching seed will be checked when search becomes available.',
  },
};
type CopyKey = keyof typeof copy.en;
interface CrafterPreset {
  id: string; tag: CopyKey; icon: string; accent: string; image: string;
  radius: number; diversity: number; flatness: number; water: number;
  key: CopyKey; hint: CopyKey; biomes: readonly number[] | 'all'; villageDistance?: number;
}
const presets: readonly CrafterPreset[] = [
  { id: 'all', tag: 'discoverTag', icon: 'earth-europe', accent: '#22c55e', image: new URL('./assets/biomes/jungle.webp', import.meta.url).href, radius: 5000, diversity: 100, flatness: 50, water: 35, key: 'all', hint: 'allHint', biomes: 'all' },
  { id: 'build', tag: 'buildTag', icon: 'hammer', accent: '#f4d28b', image: new URL('./assets/biomes/plains.webp', import.meta.url).href, radius: 1500, diversity: 35, flatness: 90, water: 15, key: 'build', hint: 'buildHint', biomes: [1,4,27,129,177] },
  { id: 'islands', tag: 'islandsTag', icon: 'water', accent: '#6acbd0', image: new URL('./assets/biomes/deep_frozen_ocean.webp', import.meta.url).href, radius: 3500, diversity: 55, flatness: 25, water: 75, key: 'islands', hint: 'islandsHint', biomes: [0,16,24,44,45,4,21] },
  { id: 'rare', tag: 'discoverTag', icon: 'gem', accent: '#d7a5d8', image: new URL('./assets/biomes/badlands.webp', import.meta.url).href, radius: 5000, diversity: 85, flatness: 30, water: 35, key: 'rare', hint: 'rareHint', biomes: [14,37,165,185,186,140] },
  { id: 'village', tag: 'survivalTag', icon: 'house', accent: '#e9bd87', image: new URL('./assets/biomes/plains.webp', import.meta.url).href, radius: 1000, diversity: 40, flatness: 75, water: 20, key: 'village', hint: 'villageHint', biomes: [1,4], villageDistance: 500 },
  { id: 'mountains', tag: 'buildTag', icon: 'mountain-sun', accent: '#b8cad9', image: new URL('./assets/biomes/ice_spikes.webp', import.meta.url).href, radius: 2000, diversity: 65, flatness: 85, water: 15, key: 'mountains', hint: 'mountainsHint', biomes: [1,177,178,180,181,182] },
];
const sliders = [
  { id: 'radius', icon: 'bullseye', min: 500, max: 10000, step: 250 },
  { id: 'diversity', icon: 'leaf', min: 0, max: 100, step: 5 },
  { id: 'flatness', icon: 'mountain-sun', min: 0, max: 100, step: 5 },
  { id: 'water', icon: 'water', min: 0, max: 100, step: 5 },
] as const;
const manualDefaults = { radius: 2500, diversity: 50, flatness: 50, water: 25 };
const icon = (name: string) => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;

function createSearchEditor(container: HTMLElement, kind: 'templates' | 'manual') {
  container.innerHTML = `<section class="crafter ${kind === 'templates' ? 'home-template-picker' : ''}" ${kind === 'manual' ? 'data-page="seed-crafter"' : ''} aria-labelledby="${kind === 'manual' ? 'crafter-title' : 'crafter-templates-title'}">
    ${kind === 'manual' ? `<header class="crafter-heading"><div><p class="crafter-eyebrow" data-craft-copy="eyebrow"></p><h1 id="crafter-title">Seed Crafter <span data-craft-copy="draft"></span></h1><p data-craft-copy="intro"></p></div><span class="crafter-heading-icon" aria-hidden="true">${icon('sliders')}</span></header>` : ''}
    <div class="crafter-workspace"><div class="crafter-editor-content">
    ${kind === 'templates' ? `<section class="crafter-templates" id="crafter-template-panel" aria-labelledby="crafter-templates-title"><div class="crafter-section-title"><span class="crafter-step">${icon('layer-group')}</span><div><h2 id="crafter-templates-title" data-craft-copy="templates"></h2><p data-craft-copy="templatesHint"></p></div></div>
      <div class="crafter-template-grid">${presets.map(p => `<button type="button" class="crafter-template" data-preset="${p.id}" style="--template-accent:${p.accent}" aria-pressed="${p.id === 'all'}" aria-labelledby="template-title-${p.id}" aria-describedby="template-description-${p.id}">
        <span class="crafter-template-visual"><img class="crafter-template-image" src="${p.image}" alt="" loading="lazy" decoding="async" /><span class="crafter-template-category" data-craft-copy="${p.tag}"></span><span class="crafter-template-check">${icon('check')}</span></span>
        <span class="crafter-template-content"><span class="crafter-template-title"><span class="crafter-template-icon">${icon(p.icon)}</span><strong id="template-title-${p.id}" data-craft-copy="${p.key}"></strong></span><span class="crafter-template-description" id="template-description-${p.id}" data-craft-copy="${p.hint}"></span>
        </span></button>`).join('')}</div>
      <section class="crafter-panel crafter-template-settings" aria-labelledby="template-settings-title"><h2 id="template-settings-title" data-craft-copy="templateSettings"></h2>
        <div class="crafter-world-fields"><label><span data-craft-copy="version"></span><select name="templateVersion">${[...VERSIONS].reverse().map(v => `<option value="${v}">${v}</option>`).join('')}</select></label><label><span data-craft-copy="world"></span><select name="templateWorld"><option value="standard" data-craft-copy="standard"></option><option value="large" data-craft-copy="large"></option></select></label></div>
        <fieldset class="crafter-centre"><legend data-craft-copy="center"></legend><label><input type="radio" name="templateCenter" value="spawn" checked />${icon('location-dot')}<span data-craft-copy="spawn"></span></label><label><input type="radio" name="templateCenter" value="origin" />${icon('crosshairs')}<span data-craft-copy="origin"></span></label></fieldset>
        <label class="crafter-template-radius-field"><span data-craft-copy="radius"></span><select name="templateRadius">${[500,750,1000,1250,1500,2000,2500,3000,3500,4000,5000,7500,10000].map(value => `<option value="${value}"></option>`).join('')}</select><span class="crafter-field-hint" data-craft-copy="templateRadiusHint"></span></label>
      </section>
    </section>` : `<section class="crafter-controls" id="crafter-manual-panel" aria-labelledby="crafter-settings-title">

      <section class="crafter-panel" aria-labelledby="crafter-settings-title"><div class="crafter-section-title"><span class="crafter-step">${icon('sliders')}</span><div><h2 id="crafter-settings-title" data-craft-copy="settings"></h2><p data-craft-copy="settingsHint"></p></div><button class="crafter-reset" type="button" data-craft-action="reset">${icon('rotate-left')}<span data-craft-copy="reset"></span></button></div>
        <div class="crafter-world-fields"><label><span data-craft-copy="version"></span><select name="craftVersion">${[...VERSIONS].reverse().map(v => `<option value="${v}">${v}</option>`).join('')}</select></label><label><span data-craft-copy="world"></span><select name="craftWorld"><option value="standard" data-craft-copy="standard"></option><option value="large" data-craft-copy="large"></option></select></label></div>
        <fieldset class="crafter-centre"><legend data-craft-copy="center"></legend><label><input type="radio" name="craftCenter" value="spawn" checked />${icon('location-dot')}<span data-craft-copy="spawn"></span></label><label><input type="radio" name="craftCenter" value="origin" />${icon('crosshairs')}<span data-craft-copy="origin"></span></label></fieldset>
        <div class="crafter-sliders">${sliders.map(s => `<div class="crafter-slider" data-slider="${s.id}"><div class="crafter-slider-heading"><label for="craft-${s.id}">${icon(s.icon)}<span data-craft-copy="${s.id}"></span></label><output for="craft-${s.id}"></output></div><p data-craft-copy="${s.id}Hint"></p><input type="range" id="craft-${s.id}" name="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${manualDefaults[s.id]}" /><div class="crafter-range-labels"><span data-craft-copy="${s.id}Low"></span><span data-craft-copy="${s.id}High"></span></div></div>`).join('')}</div>
      </section>
      <details class="crafter-panel crafter-biomes"><summary><span>${icon('layer-group')}<span data-craft-copy="biomes"></span></span><span class="crafter-biome-count"></span>${icon('chevron-down')}</summary><p data-craft-copy="biomesHint"></p><div class="crafter-biome-actions"><button type="button" data-craft-action="all" data-craft-copy="selectAll"></button><button type="button" data-craft-action="clear" data-craft-copy="clear"></button></div><div class="crafter-biome-grid"></div></details>
      <section class="crafter-panel crafter-structures" aria-labelledby="crafter-structures-title"><h2 id="crafter-structures-title">${icon('house')} <span data-craft-copy="structures"></span></h2><label class="crafter-structure-toggle"><input type="checkbox" name="craftVillage" /><span data-craft-copy="villageNearby"></span></label><div class="crafter-slider crafter-village-distance" hidden><div class="crafter-slider-heading"><label for="craft-village-distance" data-craft-copy="villageDistance"></label><output for="craft-village-distance"></output></div><p data-craft-copy="villageDistanceHint"></p><input type="range" id="craft-village-distance" name="villageDistance" min="125" max="2000" step="125" value="500" /></div></section>
    </section>`}
</div>
    <aside class="crafter-summary" aria-labelledby="crafter-summary-title"><p class="crafter-eyebrow" data-summary-heading></p><h2 id="crafter-summary-title"></h2><span class="crafter-summary-tag"></span>
      <div class="crafter-orbit" role="img"><span class="crafter-orbit-ring"></span><span class="crafter-orbit-ring crafter-orbit-inner"></span><span class="crafter-orbit-dot dot-one"></span><span class="crafter-orbit-dot dot-two"></span><span class="crafter-orbit-dot dot-three"></span><span class="crafter-orbit-center">${icon('location-dot')}</span><span class="crafter-orbit-radius"></span><span class="crafter-orbit-caption" data-craft-copy="focus"></span></div>
      <dl class="crafter-summary-facts"><div><dt data-craft-copy="version"></dt><dd data-fact="version"></dd></div><div><dt data-craft-copy="world"></dt><dd data-fact="world"></dd></div><div><dt data-craft-copy="center"></dt><dd data-fact="center"></dd></div><div><dt data-craft-copy="biomes"></dt><dd data-fact="biomes"></dd></div><div data-village-fact hidden><dt data-craft-copy="villageNearby"></dt><dd data-fact="village"></dd></div></dl>
      <h3 data-craft-copy="preferences"></h3><div class="crafter-priorities">${(['diversity', 'flatness', 'water'] as const).map((id, i) => `<div><span data-craft-copy="${['varied','flat','wet'][i]}"></span><span data-priority-value="${id}"></span><div class="crafter-priority-track"><span data-priority="${id}"></span></div></div>`).join('')}</div>
      <button type="button" class="crafter-search" disabled>${icon('wand-magic-sparkles')}<span data-craft-copy="action"></span></button><p class="crafter-draft-note">${icon('circle-info')}<span data-craft-copy="unavailable"></span></p>
    </aside></div><p class="crafter-bottom-note" data-craft-copy="note"></p>
  </section>`;
  const root = query(container, '.crafter');
  const mode = kind;
  let preset: CrafterPreset = presets[0]!;
  // Manual selection belongs exclusively to the manual panel.
  const selected = new Set<number>([1,4]);
  const language = () => document.documentElement.lang === 'de' ? 'de' : 'en';
  const t = (key: CopyKey) => copy[language()][key];
  const number = (value: number) => value.toLocaleString(language() === 'de' ? 'de-DE' : 'en-GB');
  const manualVersion = () => query(root, '[name="craftVersion"]', 'select').value as Version;
  const surfaceBiomes = (version: Version) => [...BIOMES.values()].filter(b => ![174,175,183,187].includes(b.id) && biomeAvailable(b.id, version));
  function biomeOptions() {
    query(root, '.crafter-biome-grid').innerHTML = surfaceBiomes(manualVersion()).map(b => `<label class="crafter-biome-chip" style="--biome-color:${b.color}"><input type="checkbox" name="craftBiome" value="${b.id}" ${selected.has(b.id) ? 'checked' : ''} /><span class="crafter-biome-swatch"></span><span>${b[language()]}</span></label>`).join('');
  }
  function refresh() {
    root.querySelectorAll<HTMLElement>('[data-craft-copy]').forEach(el => { el.textContent = t(el.dataset.craftCopy as CopyKey); });
    root.querySelectorAll<HTMLElement>('[data-preset]').forEach(el => { el.setAttribute('aria-pressed', String(el.dataset.preset === preset.id)); });
    if (mode === 'templates') {
      const radius = query(root, '[name="templateRadius"]', 'select');
      for (const option of radius.options) option.textContent = `${number(Number(option.value))} ${t('blocks')}`;
    }
    if (mode === 'manual') {
      for (const slider of sliders) {
        const input = query(root, `[name="${slider.id}"]`, 'input');
        const value = Number(input.value), text = slider.id === 'radius' ? `${number(value)} ${t('blocks')}` : `${value}%`;
        query(root, `[data-slider="${slider.id}"] output`).textContent = text;
        input.setAttribute('aria-valuetext', slider.id === 'diversity' && value === 100 ? t('diversityHigh') : text);
        input.style.setProperty('--range-fill', `${(value - slider.min) / (slider.max - slider.min) * 100}%`);
      }
      const manualVillage = query(root, '[name="craftVillage"]', 'input').checked;
      const distance = query(root, '[name="villageDistance"]', 'input');
      const distanceText = `${number(Number(distance.value))} ${t('blocks')}`;
      query(root, '.crafter-village-distance').hidden = !manualVillage;
      distance.disabled = !manualVillage;
      distance.setAttribute('aria-valuetext', distanceText);
      distance.style.setProperty('--range-fill', `${(Number(distance.value) - 125) / 1875 * 100}%`);
      query(root, '.crafter-village-distance output').textContent = distanceText;
      query(root, '.crafter-biome-count').textContent = `${selected.size} ${t('selection')}`;
    }

    const templateMode = mode === 'templates';
    const version = templateMode ? query(root, '[name="templateVersion"]', 'select').value as Version : manualVersion();
    const world = query(root, `[name="${templateMode ? 'templateWorld' : 'craftWorld'}"]`, 'select').value;
    const center = query(root, `[name="${templateMode ? 'templateCenter' : 'craftCenter'}"]:checked`, 'input').value;
    const values = templateMode ? { ...preset, radius: Number(query(root, '[name="templateRadius"]', 'select').value) } : {
      radius: Number(query(root, '[name="radius"]', 'input').value),
      diversity: Number(query(root, '[name="diversity"]', 'input').value),
      flatness: Number(query(root, '[name="flatness"]', 'input').value),
      water: Number(query(root, '[name="water"]', 'input').value),
    };
    const available = surfaceBiomes(version).map(b => b.id);
    const wanted = templateMode ? (preset.biomes === 'all' ? available : preset.biomes) : [...selected];
    const biomeCount = wanted.filter(id => available.includes(id)).length;
    const villageDistance = templateMode ? preset.villageDistance : query(root, '[name="craftVillage"]', 'input').checked ? Number(query(root, '[name="villageDistance"]', 'input').value) : undefined;
    query(root, '[data-summary-heading]').textContent = t(templateMode ? 'templateSummary' : 'manualSummary');
    query(root, '#crafter-summary-title').textContent = t(templateMode ? preset.key : 'manualTitle');
    query(root, '.crafter-summary-tag').textContent = t(templateMode ? 'templateMode' : 'manualMode');
    query(root, '.crafter-orbit-radius').textContent = `${number(values.radius)} ${t('blocks')}`;
    query(root, '.crafter-orbit').setAttribute('aria-label', t('illustration'));
    for (const id of ['diversity', 'flatness', 'water'] as const) {
      query(root, `[data-priority="${id}"]`).style.width = `${values[id]}%`;
      query(root, `[data-priority-value="${id}"]`).textContent = `${values[id]}%`;
    }
    query(root, '[data-fact="version"]').textContent = version;
    query(root, '[data-fact="world"]').textContent = t(world === 'large' ? 'large' : 'standard');
    query(root, '[data-fact="center"]').textContent = t(center === 'spawn' ? 'spawn' : 'origin');
    query(root, '[data-fact="biomes"]').textContent = biomeCount ? `${biomeCount} / ${available.length}` : t('empty');
    query(root, '[data-village-fact]').hidden = villageDistance === undefined;
    query(root, '[data-fact="village"]').textContent = villageDistance === undefined ? '' : `≤ ${number(villageDistance)} ${t('blocks')}`;
  }
  function resetManual() {
    for (const slider of sliders) query(root, `[name="${slider.id}"]`, 'input').value = String(manualDefaults[slider.id]);
    query(root, '[name="craftVersion"]', 'select').value = VERSIONS.at(-1)!;
    query(root, '[name="craftWorld"]', 'select').value = 'standard';
    query(root, '[name="craftCenter"][value="spawn"]', 'input').checked = true;
    query(root, '[name="craftVillage"]', 'input').checked = false;
    query(root, '[name="villageDistance"]', 'input').value = '500';
    selected.clear(); [1,4].forEach(id => selected.add(id)); biomeOptions(); refresh();
  }
  function onClick(event: MouseEvent) {
    const button = closest(event.target, '[data-preset], [data-craft-action]');
    if (!button) return;
    const found = presets.find(p => p.id === button.dataset.preset);
    if (found) { preset = found; query(root, '[name="templateRadius"]', 'select').value = String(found.radius); refresh(); return; }
    const action = button.dataset.craftAction;
    if (action === 'reset') { resetManual(); return; }
    if (action === 'all' || action === 'clear') {
      selected.clear(); if (action === 'all') surfaceBiomes(manualVersion()).forEach(b => selected.add(b.id)); biomeOptions(); refresh();
    }
  }
  function onInput(event: Event) {
    const input = event.target;
    if (!(input instanceof document.defaultView!.HTMLInputElement) && !(input instanceof document.defaultView!.HTMLSelectElement)) return;
    if (input.name === 'craftBiome') {
      const checkbox = input as HTMLInputElement;
      if (checkbox.checked) selected.add(Number(checkbox.value)); else selected.delete(Number(checkbox.value));
    }
    if (input.name === 'craftVersion') {
      const available = surfaceBiomes(manualVersion()).map(b => b.id);
      for (const id of selected) if (!available.includes(id)) selected.delete(id);
      biomeOptions();
    }
    refresh();
  }
  root.addEventListener('click', onClick); root.addEventListener('input', onInput);
  const observer = new MutationObserver(() => { if (kind === 'manual') biomeOptions(); refresh(); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  if (kind === 'templates') query(root, '[name="templateRadius"]', 'select').value = String(preset.radius);
  else biomeOptions();
  refresh();
  return { dispose() { observer.disconnect(); root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.remove(); } };
}

export function createSeedCrafter(container: HTMLElement) { return createSearchEditor(container, 'manual'); }
export function createTemplatePicker(container: HTMLElement) { return createSearchEditor(container, 'templates'); }
