const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      display: inline-block;
      position: relative;
      font: inherit;
      color: inherit;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      font: inherit;
      padding: 0.1rem 0.3rem;
      border: 1px solid #94a3b8;
      border-radius: 4px;
      background: rgba(15, 23, 42, 0.9);
      color: #f8fafc;
    }

    .suggestions {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      max-height: 200px;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #1e293b;
      border-radius: 6px;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.45);
      padding: 0.25rem 0;
      display: none;
      z-index: 10;
    }

    :host([open]) .suggestions {
      display: block;
    }

    .suggestion {
      padding: 0.3rem 0.6rem;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.95rem;
      color: #f8fafc;
    }

    .suggestion[aria-selected='true'],
    .suggestion:hover {
      background: #0ea5e9;
      color: #0b1120;
    }
  </style>
  <div class="wrapper">
    <input type="text" autocomplete="off" spellcheck="false" />
    <div class="suggestions" role="listbox"></div>
  </div>
`;

export class AutoSuggestElement extends HTMLElement {
  static get observedAttributes() {
    return ['items', 'value', 'placeholder'];
  }

  constructor() {
    super();

    this._items = [];
    this._filteredItems = [];
    this._highlightedIndex = -1;
    this._open = false;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._input = this.shadowRoot.querySelector('input');
    this._suggestions = this.shadowRoot.querySelector('.suggestions');

    this._handleInput = this._handleInput.bind(this);
    this._handleFocus = this._handleFocus.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleSuggestionClick = this._handleSuggestionClick.bind(this);
    this._handleExternalPointerDown = this._handleExternalPointerDown.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('items');
    this._upgradeProperty('value');
    this._upgradeProperty('placeholder');

    this._input.addEventListener('input', this._handleInput);
    this._input.addEventListener('focus', this._handleFocus);
    this._input.addEventListener('blur', this._handleBlur);
    this._input.addEventListener('keydown', this._handleKeyDown);
    this._suggestions.addEventListener('pointerdown', this._handleSuggestionClick);
    document.addEventListener('pointerdown', this._handleExternalPointerDown);

    this._applyPlaceholder();
    this._updateFilteredItems();
    this._renderSuggestions();
  }

  disconnectedCallback() {
    this._input.removeEventListener('input', this._handleInput);
    this._input.removeEventListener('focus', this._handleFocus);
    this._input.removeEventListener('blur', this._handleBlur);
    this._input.removeEventListener('keydown', this._handleKeyDown);
    this._suggestions.removeEventListener('pointerdown', this._handleSuggestionClick);
    document.removeEventListener('pointerdown', this._handleExternalPointerDown);
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === 'items') {
      this.items = this._parseItems(newValue);
    }

    if (name === 'value') {
      this.value = newValue ?? '';
    }

    if (name === 'placeholder') {
      this.placeholder = newValue ?? '';
    }
  }

  get items() {
    return this._items;
  }

  set items(value) {
    const nextValue = Array.isArray(value) ? value.map((v) => `${v}`) : [];
    this._items = nextValue;
    this._updateFilteredItems();
    this._renderSuggestions();
  }

  get value() {
    return this._input.value;
  }

  set value(nextValue) {
    const stringValue = nextValue ?? '';
    if (this._input.value !== stringValue) {
      this._input.value = stringValue;
    }
    this._input.setCustomValidity('');
    this._updateFilteredItems();
    this._renderSuggestions();
  }

  get placeholder() {
    return this._placeholder || '';
  }

  set placeholder(value) {
    this._placeholder = value ?? '';
    this._applyPlaceholder();
  }

  get inputElement() {
    return this._input;
  }

  focus(options) {
    this._input.focus(options);
  }

  setCustomValidity(message) {
    this._input.setCustomValidity(message);
  }

  reportValidity() {
    return this._input.reportValidity();
  }

  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  _handleInput(event) {
    const value = event.target.value;
    this._input.setCustomValidity('');
    this._updateFilteredItems(value);
    this._open = true;
    this._renderSuggestions();
    this._emitValueChange(value, 'input');
  }

  _handleFocus() {
    this._updateFilteredItems(this.value);
    this._open = true;
    this._renderSuggestions();
  }

  _handleBlur() {
    setTimeout(() => {
      this._open = false;
      this._renderSuggestions();
    }, 100);
  }

  _handleKeyDown(event) {
    if (!this._filteredItems.length) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        this._moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        this._moveHighlight(-1);
        break;
      case 'Enter':
        if (this._highlightedIndex >= 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this._selectHighlighted();
        }
        break;
      case 'Escape':
        this._open = false;
        this._highlightedIndex = -1;
        this._renderSuggestions();
        break;
      default:
        break;
    }
  }

  _handleSuggestionClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const itemValue = target.dataset.value;
    if (itemValue == null) {
      return;
    }

    event.preventDefault();
    this.value = itemValue;
    this._emitValueChange(itemValue, 'selection');
    this._open = false;
    this._highlightedIndex = -1;
    this._renderSuggestions();
    this.focus({ preventScroll: true });
  }

  _handleExternalPointerDown(event) {
    if (event.target === this || this.contains(event.target)) {
      return;
    }

    this._open = false;
    this._highlightedIndex = -1;
    this._renderSuggestions();
  }

  _moveHighlight(direction) {
    if (!this._filteredItems.length) {
      this._highlightedIndex = -1;
      this._renderSuggestions();
      return;
    }

    this._open = true;
    const itemCount = this._filteredItems.length;
    this._highlightedIndex = (this._highlightedIndex + direction + itemCount) % itemCount;
    this._renderSuggestions();
  }

  _selectHighlighted() {
    if (this._highlightedIndex < 0 || this._highlightedIndex >= this._filteredItems.length) {
      return;
    }

    const item = this._filteredItems[this._highlightedIndex];
    this.value = item;
    this._emitValueChange(item, 'selection');
    this._open = false;
    this._highlightedIndex = -1;
    this._renderSuggestions();
  }

  _emitValueChange(value, cause = 'input') {
    this.dispatchEvent(
      new CustomEvent('valuechange', {
        detail: { value, cause },
        bubbles: true,
        composed: true,
      })
    );
  }

  _updateFilteredItems(query = this.value) {
    const normalizedQuery = (query ?? '').trim().toLowerCase();
    if (!normalizedQuery) {
      this._filteredItems = [...this._items];
    } else {
      this._filteredItems = this._items.filter((item) =>
        item.toLowerCase().includes(normalizedQuery)
      );
    }

    if (!this._filteredItems.includes(this.value)) {
      this._highlightedIndex = -1;
    }
  }

  _renderSuggestions() {
    const shouldOpen = this._open && this._filteredItems.length > 0;
    this.toggleAttribute('open', shouldOpen);

    this._suggestions.innerHTML = '';
    if (!shouldOpen) {
      return;
    }

    this._filteredItems.forEach((item, index) => {
      const option = document.createElement('div');
      option.className = 'suggestion';
      option.textContent = item;
      option.dataset.value = item;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', index === this._highlightedIndex ? 'true' : 'false');
      this._suggestions.appendChild(option);
    });
  }

  _parseItems(value) {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((v) => `${v}`) : [];
    } catch (error) {
      return [];
    }
  }

  _applyPlaceholder() {
    this._input.placeholder = this._placeholder || '';
  }
}

if (!customElements.get('auto-suggest')) {
  customElements.define('auto-suggest', AutoSuggestElement);
}
