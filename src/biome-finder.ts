import type { BiomeCard } from './types.ts';
import { query, closest } from './dom.ts';
import { BIOMES } from './biome-palette.ts';
import './biome-finder.css';
import { createStartBiomeDialog } from './start-biome-dialog.ts';
const plains = new URL('./assets/biomes/plains.webp', import.meta.url).href;
const forest = new URL('./assets/biomes/forest.webp', import.meta.url).href;
const jungle = new URL('./assets/biomes/jungle.webp', import.meta.url).href;
const desert = new URL('./assets/biomes/desert.webp', import.meta.url).href;
const badlands = new URL('./assets/biomes/badlands.webp', import.meta.url).href;
const woodedBadlands = new URL('./assets/biomes/wooded_badlands.webp', import.meta.url).href;
const taiga = new URL('./assets/biomes/taiga.webp', import.meta.url).href;
const birchForest = new URL('./assets/biomes/birch_forest.webp', import.meta.url).href;
const oldGrowthPineTaiga = new URL('./assets/biomes/old_growth_pine_taiga.webp', import.meta.url).href;
const snowyPlains = new URL('./assets/biomes/snowy_plains.webp', import.meta.url).href;
const snowyTaiga = new URL('./assets/biomes/snowy_taiga.webp', import.meta.url).href;

const biomes: BiomeCard[] = [
  { categories: ['wasteland'], id: 1, image: plains, icon: 'fa-seedling', color: '#a3cc75', de: ['Ebene', 'Weite Graslandschaften mit Blumen und freiem Blick.'], en: ['Plains', 'Open grasslands with flowers and sweeping views.'] },
  { categories: ['forests'], id: 4, image: forest, icon: 'fa-tree', color: '#72bd86', de: ['Wald', 'Grüne Wälder mit Eichen und Birken.'], en: ['Forest', 'Green woodlands filled with oak and birch trees.'] },
  { categories: ['forests'], id: 21, image: jungle, icon: 'fa-leaf', color: '#a2cb56', de: ['Dschungel', 'Dichte Vegetation mit hohen Bäumen und Lianen.'], en: ['Jungle', 'Dense greenery with towering trees and vines.'] },
  { categories: ['desert', 'wasteland'], id: 2, image: desert, icon: 'fa-sun', color: '#f4d28b', de: ['Wüste', 'Weite Sandlandschaften mit Dünen und Kakteen.'], en: ['Desert', 'Vast sandy landscapes with dunes and cacti.'] },
  { categories: ['desert'], id: 37, image: badlands, icon: 'fa-mountain', color: '#df9a73', de: ['Tafelberge', 'Markante Felsformationen aus buntem Terrakotta.'], en: ['Badlands', 'Striking rock formations of colorful terracotta.'] },
  { categories: ['forests', 'desert'], id: 38, image: woodedBadlands, icon: 'fa-tree', color: '#b7bc7e', de: ['Bewaldete Tafelberge', 'Terrakotta-Hochebenen mit lichten Eichenwäldern.'], en: ['Wooded Badlands', 'Terracotta plateaus dotted with oak woodlands.'] },
  { id: 5, categories: ['forests'], image: taiga, icon: 'fa-tree', color: '#79b4a1', de: ['Taiga', 'Kühle Nadelwälder mit Fichten, Farnen und Beeren.'], en: ['Taiga', 'Cool spruce forests with ferns and berry bushes.'] },
  { id: 27, categories: ['forests'], image: birchForest, icon: 'fa-tree', color: '#b5ce87', de: ['Birkenwald', 'Helle Birkenwälder mit weißen Stämmen und grünen Kronen.'], en: ['Birch Forest', 'Bright woodlands with white trunks and green canopies.'] },
  { id: 29, categories: ['forests'], image: null, icon: 'fa-tree', color: '#83a46e', de: ['Dunkler Wald', 'Dichte Schwarzeichenwälder mit riesigen Pilzen.'], en: ['Dark Forest', 'Dense dark oak forests with giant mushrooms.'] },
  { id: 155, categories: ['forests'], image: null, icon: 'fa-tree', color: '#b3cd91', de: ['Birken-Urwald', 'Hohe alte Birken zwischen Blumen und üppigem Grün.'], en: ['Old Growth Birch Forest', 'Tall ancient birches among flowers and lush greenery.'] },
  { id: 32, categories: ['forests'], image: oldGrowthPineTaiga, icon: 'fa-tree', color: '#a4b67a', de: ['Kiefern-Urtaiga', 'Riesige Nadelbäume über moosigem Boden und Podsol.'], en: ['Old Growth Pine Taiga', 'Giant conifers above mossy ground and podzol.'] },
  { id: 160, categories: ['forests'], image: null, icon: 'fa-tree', color: '#81af94', de: ['Fichten-Urtaiga', 'Dichte alte Fichtenwälder mit breiten Baumkronen.'], en: ['Old Growth Spruce Taiga', 'Dense ancient spruce forests with broad canopies.'] },
  { id: 132, categories: ['forests'], image: null, icon: 'fa-seedling', color: '#e4a6c9', de: ['Blumenwald', 'Lichte Wälder mit bunten Blumen und summenden Bienen.'], en: ['Flower Forest', 'Open woodlands with colorful flowers and buzzing bees.'] },
  { id: 168, categories: ['forests'], image: null, icon: 'fa-leaf', color: '#b2cf70', de: ['Bambusdschungel', 'Hoher Bambus, tropisches Grün und ein Zuhause für Pandas.'], en: ['Bamboo Jungle', 'Tall bamboo, tropical greenery and a home for pandas.'] },
  { id: 35, categories: ['wasteland'], image: null, icon: 'fa-sun', color: '#d3c27d', de: ['Savanne', 'Warme Graslandschaften mit Akazien und weitem Horizont.'], en: ['Savanna', 'Warm grasslands with acacias and wide horizons.'] },
  { id: 129, categories: ['wasteland'], image: null, icon: 'fa-seedling', color: '#e5cd70', de: ['Sonnenblumenebene', 'Offene Wiesen mit leuchtend gelben Sonnenblumen.'], en: ['Sunflower Plains', 'Open grasslands filled with bright yellow sunflowers.'] },
  { id: 12, categories: ['snow'], image: snowyPlains, icon: 'fa-snowflake', color: '#b8deea', de: ['Verschneite Ebene', 'Weite Schneelandschaften mit freiem Blick und wenig Bäumen.'], en: ['Snowy Plains', 'Wide snowy landscapes with open views and few trees.'] },
  { id: 30, categories: ['forests', 'snow'], image: snowyTaiga, icon: 'fa-snowflake', color: '#a8cfc2', de: ['Verschneite Taiga', 'Winterliche Fichtenwälder unter einer weißen Schneedecke.'], en: ['Snowy Taiga', 'Wintry spruce forests beneath a blanket of snow.'] },
  { id: 6, categories: ['wetlands'], image: null, icon: 'fa-water', color: '#a4b67a', de: ['Sumpf', 'Flache Feuchtgebiete mit Seerosen, Eichen und Wasserläufen.'], en: ['Swamp', 'Low wetlands with lily pads, oaks and waterways.'] },
  { id: 184, categories: ['forests', 'wetlands'], image: null, icon: 'fa-water', color: '#91b47e', de: ['Mangrovensumpf', 'Dichte Mangroven mit verschlungenen Wurzeln und Schlammboden.'], en: ['Mangrove Swamp', 'Dense mangroves with tangled roots and muddy ground.'] },
  { id: 177, categories: ['wasteland'], image: null, icon: 'fa-seedling', color: '#afd088', de: ['Bergwiese', 'Blumenreiche Grasflächen mit Aussicht auf die Berge.'], en: ['Meadow', 'Flower-filled grasslands overlooking the mountains.'] },
  { id: 185, categories: ['forests'], image: null, icon: 'fa-leaf', color: '#efb6cf', de: ['Kirschhain', 'Rosa Kirschblüten und sanfte Wiesen zwischen den Bäumen.'], en: ['Cherry Grove', 'Pink cherry blossoms and gentle meadows between trees.'] },
  { id: 186, categories: ['forests'], image: null, icon: 'fa-tree', color: '#c0c4ad', de: ['Blasser Garten', 'Stille Wälder mit blassen Eichen und hängendem Moos.'], en: ['Pale Garden', 'Quiet forests with pale oaks and hanging moss.'] },
  { id: 3, categories: ['wasteland'], image: null, icon: 'fa-mountain', color: '#b3b5a0', de: ['Windige Hügel', 'Offene Hügellandschaften mit steinigen Höhen und Gras.'], en: ['Windswept Hills', 'Open hills with rocky heights and grasslands.'] },
  { id: 34, categories: ['forests'], image: null, icon: 'fa-wind', color: '#9bb790', de: ['Windiger Wald', 'Bewaldete Hügel mit Eichen, Fichten und felsigen Hängen.'], en: ['Windswept Forest', 'Wooded hills with oaks, spruces and rocky slopes.'] },
  { id: 131, categories: ['wasteland'], image: null, icon: 'fa-mountain', color: '#b4b6af', de: ['Windige Geröllhügel', 'Raue Hügellandschaften mit Kies, Stein und wenigen Bäumen.'], en: ['Windswept Gravelly Hills', 'Rugged hills with gravel, stone and scattered trees.'] },
  { id: 163, categories: ['wasteland'], image: null, icon: 'fa-wind', color: '#c2c48c', de: ['Windige Savanne', 'Zerklüftete Savannen mit Akazien und steilen Felsen.'], en: ['Windswept Savanna', 'Rugged savannas with acacias and steep cliffs.'] },
  { id: 36, categories: ['wasteland'], image: null, icon: 'fa-mountain', color: '#c6b975', de: ['Savannenhochebene', 'Hoch gelegene Akazienlandschaften mit trockenem Gras.'], en: ['Savanna Plateau', 'Elevated acacia landscapes with dry grass.'] },
  { id: 165, categories: ['desert'], image: null, icon: 'fa-mountain', color: '#e9ad7e', de: ['Abgetragene Tafelberge', 'Schmale Terrakotta-Türme in einer weiten roten Landschaft.'], en: ['Eroded Badlands', 'Slender terracotta towers across a broad red landscape.'] },
];

function biomeKey(id: number) {
  const biome = BIOMES.get(id);
  if (!biome) throw new Error(`Unknown biome ID: ${id}`);
  return biome.key;
}

const filters = [
  { id: 'all', icon: 'fa-layer-group' },
  { id: 'wasteland', icon: 'fa-mountain' },
  { id: 'forests', icon: 'fa-tree' },
  { id: 'desert', icon: 'fa-sun' },
  { id: 'snow', icon: 'fa-snowflake' },
  { id: 'wetlands', icon: 'fa-water' },
].map((filter, labelIndex) => ({ ...filter, labelIndex }))
  .sort((a, b) => filterCount(b.id) - filterCount(a.id));

function filterCount(id: string) {
  return id === 'all' ? biomes.length : biomes.filter(biome => biome.categories.includes(id)).length;
}
const filterCopy = {
  de: { labels: ['Alle', 'Offene Landschaften', 'Wälder', 'Wüste', 'Schnee', 'Feuchtgebiete'], group: 'Biom-Kategorie filtern', empty: 'Für diese Kategorie sind noch keine Biome vorhanden.' },
  en: { labels: ['All', 'Open Landscapes', 'Forests', 'Desert', 'Snow', 'Wetlands'], group: 'Filter biome category', empty: 'No biomes are available in this category yet.' },
};

export function createBiomeFinder(container: HTMLElement) {
  container.innerHTML = `<section class="biome-finder" aria-labelledby="biome-finder-title">
    <header class="biome-finder-heading"><h1 id="biome-finder-title"></h1><p></p></header>
    <div class="biome-filters" role="group">${filters.map((filter, index) => `<button type="button" data-biome-filter="${filter.id}" aria-pressed="${index === 0}">
      <i class="fa-solid ${filter.icon} biome-filter-icon" aria-hidden="true"></i>
      <span class="biome-filter-label"></span>
      <span class="biome-filter-count" aria-hidden="true">${filterCount(filter.id)}</span>
    </button>`).join('')}</div>
    <p class="biome-filter-empty" role="status" hidden></p>
    <div class="biome-grid">${biomes.map((biome, index) => `<article class="biome-card" data-biome-id="${biome.id}" style="--biome-accent: ${biome.color}" aria-labelledby="biome-title-${index}">
      <button type="button" class="biome-card-trigger" data-biome="${index}" aria-labelledby="biome-action-${index} biome-title-${index}" aria-describedby="biome-description-${index}" aria-haspopup="dialog"></button>
      <div class="biome-card-image">
        ${biome.image ? `<img src="${biome.image}" alt="" loading="lazy" decoding="async" />` : `<div class="biome-card-placeholder"><i class="fa-solid ${biome.icon}" aria-hidden="true"></i><span></span></div>`}
      </div>
      <div class="biome-card-content">
        <div class="biome-card-heading">
          <h2 id="biome-title-${index}"><i class="fa-solid ${biome.icon}" aria-hidden="true"></i><span></span></h2>
          <code class="biome-card-key">${biomeKey(biome.id)}</code>
        </div>
        <p id="biome-description-${index}" class="biome-card-description"></p>
        <div class="biome-card-action"><span id="biome-action-${index}"></span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></div>
      </div>
    </article>`).join('')}</div>
  </section>`;
  const root = query(container, '.biome-finder');
  const popup = createStartBiomeDialog(root, biomes);
  function onBiomeClick(event: MouseEvent) {
    const trigger = closest(event.target, '[data-biome]');
    if (trigger) popup.open(Number(trigger.dataset.biome), trigger);
  }
  root.addEventListener('click', onBiomeClick);
  let activeFilter = 'all';
  const cards = [...root.querySelectorAll<HTMLElement>('.biome-card')];
  const buttons = [...root.querySelectorAll<HTMLElement>('[data-biome-filter]')];
  const empty = query(root, '.biome-filter-empty');
  function applyFilter() {
    cards.forEach((card, index) => { card.hidden = activeFilter !== 'all' && !biomes[index]!.categories.includes(activeFilter); });
    buttons.forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.biomeFilter === activeFilter)); });
    empty.hidden = cards.some(card => !card.hidden);
  }
  function onFilterClick(event: MouseEvent) {
    const button = closest(event.target, '[data-biome-filter]');
    if (!button) return;
    activeFilter = button.dataset.biomeFilter ?? 'all';
    applyFilter();
  }
  const filterBar = query(root, '.biome-filters');
  filterBar.addEventListener('click', onFilterClick);
  function refreshLanguage() {
    const language = document.documentElement.lang === 'de' ? 'de' : 'en';
    filterBar.setAttribute('aria-label', filterCopy[language].group);
    buttons.forEach((button, index) => {
      const label = filterCopy[language].labels[filters[index]!.labelIndex]!;
      const count = filterCount(filters[index]!.id);
      query(button, '.biome-filter-label').textContent = label;
      const noun = language === 'de' ? (count === 1 ? 'Biom' : 'Biome') : (count === 1 ? 'biome' : 'biomes');
      button.setAttribute('aria-label', `${label}: ${count} ${noun}`);
    });
    empty.textContent = filterCopy[language].empty;
    query(root, 'h1').textContent = language === 'de' ? 'Startbiom' : 'Starting Biome';
    query(root, '.biome-finder-heading p').textContent = language === 'de' ? 'Starte direkt in deinem Lieblingsbiom – wähle ein Biom und erhalte den passenden Minecraft-Seed.' : 'Start right in your favorite biome – choose a biome and get the matching Minecraft seed.';
    root.querySelectorAll<HTMLElement>('.biome-card').forEach((card, index) => {
      const [name, description] = biomes[index]![language];
      query(card, 'h2 span').textContent = name;
      query(card, 'p').textContent = description;
      query(card, '.biome-card-action span').textContent = language === 'de' ? 'Seed finden' : 'Find seed';
      const image = card.querySelector<HTMLImageElement>('img');
      if (image) image.alt = language === 'de' ? `Minecraft-Biom: ${name}` : `Minecraft biome: ${name}`;
      const placeholder = card.querySelector('.biome-card-placeholder span');
      if (placeholder) placeholder.textContent = language === 'de' ? 'Screenshot folgt' : 'Screenshot coming soon';
    });
    popup.refresh();
  }
  const observer = new MutationObserver(refreshLanguage);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  refreshLanguage();
  return { dispose() { popup.dispose(); observer.disconnect(); root.removeEventListener('click', onBiomeClick); filterBar.removeEventListener('click', onFilterClick); container.replaceChildren(); } };
}
