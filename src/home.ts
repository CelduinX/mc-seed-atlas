import { query } from './dom.ts';
import { createTemplatePicker } from './seed-crafter.ts';
import './home.css';

const forest = new URL('./assets/biomes/forest.webp', import.meta.url).href;
const copy = {
  de: {
    eyebrow: 'MINECRAFT JAVA · SEEDS NACH DEINEN WÜNSCHEN', title: 'Dein Wunsch.', titleAccent: 'Dein Minecraft-Seed.',
    intro: 'Bestimme, wie deine nächste Welt aussehen soll. Seed Atlas findet passende Seeds anhand deiner Wünsche – du bist nicht auf eine vorgegebene Seed-Liste beschränkt.',
    primary: 'Mit Wunschbiom starten', secondary: 'Eigene Parameter festlegen', heroNote: 'Individuelle Seed-Suche · Interaktive Biomkarte · Direkt im Browser',
    visualEyebrow: 'DEIN NÄCHSTES ABENTEUER', visualTitle: 'Du bestimmst die Richtung.', biome: 'Wunschbiom', radius: 'Suchradius', world: 'Weltvariante',
    toolsEyebrow: 'DEIN WEG ZUR WUNSCHWELT', toolsTitle: 'Was möchtest du als Nächstes tun?', ready: 'Verfügbar', preview: 'UI-Vorschau',
    startTitle: 'Startbiom', startText: 'Wald, Dschungel oder Kirschhain? Finde einen Seed mit deinem Lieblingsbiom am geschätzten Spawn.', startAction: 'Wunschbiom auswählen',
    craftTitle: 'Seed Crafter', craftText: 'Gestalte dein eigenes Suchprofil mit Reglern für Radius, Biome, Landschaft und Strukturen.', craftAction: 'Parameter-Editor öffnen',
    explorerTitle: 'Seed Explorer', explorerText: 'Erkunde die Biome eines Seeds auf der interaktiven Karte und speichere deinen Kartenausschnitt.', explorerAction: 'Seed erkunden',
    templatesEyebrow: 'VORLAGEN FÜR DEIN NÄCHSTES ABENTEUER', closingTitle: 'Deine Wünsche sind der Ausgangspunkt.',
    closingText: 'Templates geben dir ein Spielziel. Im Seed Crafter legst du deine eigenen Kriterien fest. Die passenden Seeds werden gesucht, statt aus einer festen Sammlung ausgewählt.',
    closingAction: 'Wünsche selbst festlegen',
  },
  en: {
    eyebrow: 'MINECRAFT JAVA · SEEDS SHAPED BY YOUR PREFERENCES', title: 'Your vision.', titleAccent: 'Your Minecraft seed.',
    intro: 'Decide what your next world should look like. Seed Atlas finds matching seeds based on your preferences, so you are not limited to a predefined list.',
    primary: 'Start with your favourite biome', secondary: 'Set your own parameters', heroNote: 'Personalised seed search · Interactive biome map · In your browser',
    visualEyebrow: 'YOUR NEXT ADVENTURE', visualTitle: 'You choose the direction.', biome: 'Favourite biome', radius: 'Search radius', world: 'World type',
    toolsEyebrow: 'YOUR PATH TO THE PERFECT WORLD', toolsTitle: 'What would you like to do next?', ready: 'Available', preview: 'UI preview',
    startTitle: 'Starting Biome', startText: 'Forest, jungle or cherry grove? Find a seed with your favourite biome at the estimated spawn.', startAction: 'Choose a starting biome',
    craftTitle: 'Seed Crafter', craftText: 'Design your own search profile with controls for radius, biomes, landscapes and structures.', craftAction: 'Open the parameter editor',
    explorerTitle: 'Seed Explorer', explorerText: 'Explore the biomes of a seed on an interactive map and save the visible map area.', explorerAction: 'Explore a seed',
    templatesEyebrow: 'TEMPLATES FOR YOUR NEXT ADVENTURE', closingTitle: 'Your preferences come first.',
    closingText: 'Templates give you a play style. Seed Crafter lets you define your own criteria. Matching seeds are searched for instead of picked from a fixed collection.',
    closingAction: 'Set your preferences',
  },
};
const icon = (name: string) => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;

export function createHome(container: HTMLElement) {
  container.innerHTML = `<section class="home" data-page="home" aria-labelledby="home-title">
    <header class="home-hero"><div class="home-hero-copy"><p class="home-eyebrow" data-home-copy="eyebrow"></p><h1 id="home-title"><span data-home-copy="title"></span><span data-home-copy="titleAccent"></span></h1><p class="home-hero-intro" data-home-copy="intro"></p><div class="home-hero-actions"><a class="home-primary" href="/biome-finder">${icon('compass')}<span data-home-copy="primary"></span>${icon('arrow-right')}</a><a class="home-secondary" href="/seed-crafter">${icon('sliders')}<span data-home-copy="secondary"></span></a></div><p class="home-hero-note" data-home-copy="heroNote"></p></div>
      <div class="home-hero-visual" aria-hidden="true"><img src="${forest}" alt="" fetchpriority="high" decoding="async" /><div class="home-visual-label">${icon('leaf')}<span data-home-copy="visualEyebrow"></span></div><div class="home-visual-profile"><strong data-home-copy="visualTitle"></strong><div><span>${icon('tree')}<span data-home-copy="biome"></span></span><span>${icon('bullseye')}<span data-home-copy="radius"></span></span><span>${icon('globe')}<span data-home-copy="world"></span></span></div></div></div>
    </header>
    <section class="home-section" aria-labelledby="home-tools-title"><div class="home-section-heading"><p class="home-eyebrow" data-home-copy="toolsEyebrow"></p><h2 id="home-tools-title" data-home-copy="toolsTitle"></h2></div><div class="home-tool-grid">${[
      { key: 'start', route: '/biome-finder', icon: 'compass', status: 'ready', accent: '#22c55e' },
      { key: 'craft', route: '/seed-crafter', icon: 'sliders', status: 'preview', accent: '#f4d28b' },
      { key: 'explorer', route: '/seed-explorer', icon: 'map', status: 'ready', accent: '#7baaf7' },
    ].map(tool => `<a class="home-tool" href="${tool.route}" style="--tool-accent:${tool.accent}"><div class="home-tool-top"><span class="home-tool-icon">${icon(tool.icon)}</span><span class="home-tool-status ${tool.status === 'preview' ? 'is-preview' : ''}" data-home-copy="${tool.status}"></span></div><h3 data-home-copy="${tool.key}Title"></h3><p data-home-copy="${tool.key}Text"></p><span class="home-tool-action"><span data-home-copy="${tool.key}Action"></span>${icon('arrow-right')}</span></a>`).join('')}</div></section>
    <section class="home-section home-templates" aria-labelledby="crafter-templates-title"><p class="home-eyebrow" data-home-copy="templatesEyebrow"></p><div class="home-template-mount"></div></section>
    <section class="home-closing"><div><h2 data-home-copy="closingTitle"></h2><p data-home-copy="closingText"></p></div><a class="home-secondary" href="/seed-crafter"><span data-home-copy="closingAction"></span>${icon('arrow-right')}</a></section>
  </section>`;
  const root = query(container, '.home');
  const picker = createTemplatePicker(query(root, '.home-template-mount'));
  function refresh() {
    const language = document.documentElement.lang === 'de' ? 'de' : 'en';
    root.querySelectorAll<HTMLElement>('[data-home-copy]').forEach(el => { el.textContent = copy[language][el.dataset.homeCopy as keyof typeof copy.en]; });
  }
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  refresh();
  return { dispose() { observer.disconnect(); picker.dispose(); root.remove(); } };
}
