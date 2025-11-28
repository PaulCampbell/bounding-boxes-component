import { Window } from 'happy-dom';

const windowInstance = new Window();
const { document } = windowInstance;

Object.assign(globalThis, {
  window: windowInstance,
  document,
  navigator: windowInstance.navigator,
  customElements: windowInstance.customElements,
  HTMLElement: windowInstance.HTMLElement,
  HTMLTemplateElement: windowInstance.HTMLTemplateElement,
  HTMLCanvasElement: windowInstance.HTMLCanvasElement,
  Event: windowInstance.Event,
  CustomEvent: windowInstance.CustomEvent,
  KeyboardEvent: windowInstance.KeyboardEvent,
  MouseEvent: windowInstance.MouseEvent,
  PointerEvent: windowInstance.PointerEvent,
});

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 16);
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);
}
