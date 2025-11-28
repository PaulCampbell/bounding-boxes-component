import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './setup.js';
import '../src/auto-suggest.js';

describe('<auto-suggest>', () => {
  let element;

  beforeEach(() => {
    element = document.createElement('auto-suggest');
    element.setAttribute('items', JSON.stringify(['Bee', 'Cat', 'Dog', 'Fish']));
    document.body.append(element);
  });

  afterEach(() => {
    element?.remove();
  });

  it('shows all items when the input is empty and focused', () => {
    const input = element.inputElement;
    input.dispatchEvent(new Event('focus'));

    const suggestions = element.shadowRoot.querySelectorAll('.suggestion');
    expect(suggestions).toHaveLength(4);
  });

  it('filters suggestions based on the input value', () => {
    const input = element.inputElement;
    input.value = 'ca';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const suggestions = element.shadowRoot.querySelectorAll('.suggestion');
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].textContent).toBe('Cat');
  });

  it('cycles through suggestions with arrow keys and selects with enter', () => {
    const input = element.inputElement;
    input.dispatchEvent(new Event('focus'));

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    expect(input.value).toBe('Dog');
    const suggestionsContainer = element.shadowRoot.querySelector('.suggestions');
    expect(suggestionsContainer.children).toHaveLength(0);
  });
});
