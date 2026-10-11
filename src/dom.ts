export function query(root: ParentNode, selector: string): HTMLElement;
export function query<Tag extends keyof HTMLElementTagNameMap>(root: ParentNode, selector: string, tag: Tag): HTMLElementTagNameMap[Tag];
export function query(root: ParentNode, selector: string, tag?: keyof HTMLElementTagNameMap): HTMLElement {
  const element = root.querySelector(selector);
  const view = element?.ownerDocument.defaultView;
  if (!view || !(element instanceof view.HTMLElement) || (tag && element.localName !== tag)) throw new Error(`Missing or invalid element: ${selector}`);
  return element;
}

export function canvasContext(canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', options);
  if (!context) throw new Error('Canvas2D unavailable');
  return context;
}

export function closest(target: EventTarget | null, selector: string): HTMLElement | null {
  // Use the document's realm: jsdom need not install global Element constructors.
  const view = document.defaultView;
  if (!view || !(target instanceof view.Element)) return null;
  const element = target.closest(selector);
  return element instanceof view.HTMLElement ? element : null;
}

export function translated<Dictionary extends Record<string, string>>(dictionary: Dictionary, key: unknown): string {
  if (typeof key !== 'string') throw new Error('Missing translation key');
  const entry = Object.entries(dictionary).find(([name]) => name === key);
  if (!entry) throw new Error(`Unknown translation key: ${key}`);
  return entry[1];
}

export type Listen = <Key extends keyof HTMLElementEventMap>(element: HTMLElement, event: Key, handler: (event: HTMLElementEventMap[Key]) => void, options?: AddEventListenerOptions) => void;
