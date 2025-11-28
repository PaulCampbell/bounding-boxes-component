import './auto-suggest.js';

const COLOR_PALETTE = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#0ea5e9', '#a855f7'];
const DEFAULT_COLOR = '#00ff88';

const template = document.createElement('template');
const hexToRgb = (hex) => {
	if (typeof hex !== 'string') {
		return null;
	}
	const normalized = hex.replace('#', '');
	if (normalized.length !== 3 && normalized.length !== 6) {
		return null;
	}
	const expanded = normalized.length === 3
		? normalized
			.split('')
			.map((char) => char + char)
			.join('')
		: normalized;
	const value = parseInt(expanded, 16);
	if (Number.isNaN(value)) {
		return null;
	}
	return {
		r: (value >> 16) & 0xff,
		g: (value >> 8) & 0xff,
		b: value & 0xff,
	};
};

const hexToRgba = (hex, alpha) => {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return hex;
	}
	const clamped = Math.min(Math.max(alpha, 0), 1);
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamped})`;
};

const getContrastingTextColor = (hex) => {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return '#111827';
	}
	const normalize = (value) => {
		const channel = value / 255;
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	};
	const luminance = 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b);
	return luminance > 0.55 ? '#111827' : '#ffffff';
};

template.innerHTML = `
	<style>
		:host {
			display: inline-block;
			position: relative;
			font-family: sans-serif;
		}

		figure {
			margin: 0;
			position: relative;
			width: 100%;
		}

		canvas {
			display: block;
			width: 100%;
			height: auto;
		}

		.add-button {
			position: absolute;
			top: 0.5rem;
			left: 0.5rem;
			padding: 0.35rem 0.45rem;
			border: 0;
			border-radius: 999px;
			background: #22c55e;
			color: #ffffff;
			font-size: 1.25rem;
			cursor: pointer;
			box-shadow: 0 6px 20px rgba(15, 23, 42, 0.35);
		}

		.add-button[aria-pressed='true'] {
			background: #16a34a;
			box-shadow: 0 0 0 5px rgba(138, 183, 155, 0.6);
		}

		.overlay {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		.overlay-controls {
			position: absolute;
			display: flex;
			align-items: flex-start;
			gap: 0.5rem;
			pointer-events: auto;
			border-radius: 6px;
			padding: 0.35rem 0.45rem;
		}

		.overlay-controls-buttons {
			display: flex;
			flex-direction: column;
			gap: 0.35rem;
		}

		.overlay-controls-label {
			display: flex;
			align-items: center;
			min-width: 7.5rem;
		}

		.overlay-controls-label auto-suggest {
			width: 100%;
		}

		.overlay-controls-label input[type="text"] {
			width: 100%;
		}

		.overlay-controls button,
		.overlay-controls input[type="text"] {
			font: inherit;
		}

		.overlay-controls button {
			width: 2.1rem;
			height: 2.1rem;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 0;
			border: 0px ;
			background: rgba(226, 232, 240, 0);
			color: #0f172a;
			border-radius: 4px;
			cursor: pointer;
			font-size: 1.5rem;
		}

		.overlay-controls input[type="text"] {
			min-width: 6rem;
			padding: 0.1rem 0.3rem;
			border: 1px solid #94a3b8;
			background: rgba(15, 23, 42, 0.9);
			color: #f8fafc;
            left: -5px;
		}
	</style>
	<figure>
		<canvas aria-label="Bounding boxes viewer"></canvas>
		<button class="add-button" type="button" title="Add tag" aria-label="Add tag" aria-pressed="false">➕</button>
		<div class="overlay"></div>
	</figure>
`;

export class BoundingBoxesElement extends HTMLElement {
	static get observedAttributes() {
		return ['src', 'boxes', 'autosuggestitems'];
	}

	constructor() {
		super();

		this._boxes = [];
		this._image = null;
		this._ctx = null;
		this._layoutCache = [];
		this._activeIndex = null;
		this._labelDraft = '';
		this._isUpdatingBoxesAttribute = false;
		this._autosuggestItems = [];
		this._isUpdatingAutosuggestAttribute = false;
		this._skipNextAutosuggestSave = false;
		this._isAddMode = false;
		this._draftBox = null;
		this._pendingNewBoxIndex = null;
		this._activePointerId = null;
		this._activeLabelInput = null;
		if (typeof ResizeObserver === 'function') {
			this._resizeObserver = new ResizeObserver(() => {
				this._draw();
			});
		} else {
			this._resizeObserver = null;
		}
		this._handlePointerDown = this._handlePointerDown.bind(this);
		this._handleSaveClick = this._handleSaveClick.bind(this);
		this._handleCancelClick = this._handleCancelClick.bind(this);
		this._handleDeleteClick = this._handleDeleteClick.bind(this);
		this._handleLabelInput = this._handleLabelInput.bind(this);
		this._handleAddButtonClick = this._handleAddButtonClick.bind(this);
		this._handleAddPointerMove = this._handleAddPointerMove.bind(this);
		this._handleAddPointerUp = this._handleAddPointerUp.bind(this);

		this.attachShadow({ mode: 'open' });
		this.shadowRoot.appendChild(template.content.cloneNode(true));

		this._canvas = this.shadowRoot.querySelector('canvas');
		this._overlay = this.shadowRoot.querySelector('.overlay');
		this._addButton = this.shadowRoot.querySelector('.add-button');
	}

	connectedCallback() {
		if (!this._ctx) {
			this._ctx = this._canvas.getContext('2d');
		}

		if (this.isConnected && this._resizeObserver) {
			this._resizeObserver.observe(this);
		}

		this._canvas.addEventListener('pointerdown', this._handlePointerDown);
		if (this._overlay) {
			this._overlay.addEventListener('pointerdown', this._handlePointerDown);
		}

		if (this._addButton) {
			this._addButton.addEventListener('click', this._handleAddButtonClick);
		}

		if (this.hasAttribute('boxes')) {
			this._setBoxesFromAttribute(this.getAttribute('boxes'));
		}

		if (this.hasAttribute('autosuggestitems')) {
			this._setAutosuggestItemsFromAttribute(this.getAttribute('autosuggestitems'));
		}

		if (this.hasAttribute('src')) {
			this._loadImage(this.getAttribute('src'));
		}
	}

	disconnectedCallback() {
		if (this._resizeObserver) {
			this._resizeObserver.unobserve(this);
		}

		this._canvas.removeEventListener('pointerdown', this._handlePointerDown);
		if (this._overlay) {
			this._overlay.removeEventListener('pointerdown', this._handlePointerDown);
		}

		if (this._addButton) {
			this._addButton.removeEventListener('click', this._handleAddButtonClick);
		}

		this._exitAddMode({ redraw: false });
	}

	attributeChangedCallback(name, _oldValue, newValue) {
		if (name === 'src') {
			this._loadImage(newValue);
		}

		if (name === 'boxes') {
			this._setBoxesFromAttribute(newValue);
		}

		if (name === 'autosuggestitems') {
			this._setAutosuggestItemsFromAttribute(newValue);
		}
	}

	set boxes(value) {
		if (!Array.isArray(value)) {
			console.warn('`boxes` must be an array.');
			return;
		}

		this._boxes = value;
		this._activeIndex = null;
		this._labelDraft = '';
		this._pendingNewBoxIndex = null;
		this._exitAddMode({ redraw: false });
		this._draw();
	}

	get boxes() {
		return this._boxes;
	}

	_setAutosuggestItemsFromAttribute(value) {
		if (this._isUpdatingAutosuggestAttribute) {
			return;
		}

		if (!value) {
			this._autosuggestItems = [];
			this._renderActiveOverlay();
			return;
		}

		try {
			const parsed = JSON.parse(value);
			this._autosuggestItems = this._normalizeAutosuggestItems(parsed);
		} catch (error) {
			console.warn('Unable to parse `autosuggestitems` attribute. Expecting valid JSON.', error);
			this._autosuggestItems = [];
		}

		this._renderActiveOverlay();
	}

	_normalizeAutosuggestItems(items) {
		if (!Array.isArray(items)) {
			return [];
		}

		return items
			.map((item) => {
				if (typeof item === 'string') {
					return item.trim();
				}
				if (item == null) {
					return '';
				}
				return String(item).trim();
			})
			.filter((item) => item.length > 0);
	}

	set autosuggestItems(value) {
		if (!Array.isArray(value)) {
			console.warn('`autosuggestItems` must be an array.');
			return;
		}

		const normalized = this._normalizeAutosuggestItems(value);
		this._autosuggestItems = normalized;

		if (!this._isUpdatingAutosuggestAttribute) {
			this._isUpdatingAutosuggestAttribute = true;
			if (normalized.length === 0) {
				this.removeAttribute('autosuggestitems');
			} else {
				this.setAttribute('autosuggestitems', JSON.stringify(normalized));
			}
			this._isUpdatingAutosuggestAttribute = false;
		}

		this._renderActiveOverlay();
	}

	get autosuggestItems() {
		return Array.isArray(this._autosuggestItems) ? [...this._autosuggestItems] : [];
	}

	_setBoxesFromAttribute(value) {
		if (this._isUpdatingBoxesAttribute) {
			return;
		}

		if (!value) {
			this.boxes = [];
			return;
		}

		try {
			const parsed = JSON.parse(value);
			this.boxes = Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			console.warn('Unable to parse `boxes` attribute. Expecting valid JSON.', error);
			this.boxes = [];
		}
	}

	async _loadImage(src) {
		if (!src) {
			this._image = null;
			this._clear();
			return;
		}

		const image = new Image();
		image.decoding = 'async';
		image.src = src;

		try {
			await image.decode();
			this._image = image;
			this._draw();
		} catch (error) {
			console.error('Unable to load image for <bounding-boxes> component.', error);
			this._image = null;
			this._clear();
		}
	}

	_draw() {
		if (!this._ctx) {
			return;
		}

		if (!this._image) {
			this._clear();
			return;
		}

		const { naturalWidth, naturalHeight } = this._image;
		if (!naturalWidth || !naturalHeight) {
			this._clear();
			return;
		}

		if (this._canvas.width !== naturalWidth || this._canvas.height !== naturalHeight) {
			this._canvas.width = naturalWidth;
			this._canvas.height = naturalHeight;
		}

		this._ctx.drawImage(this._image, 0, 0, naturalWidth, naturalHeight);
		this._drawBoxes(naturalWidth, naturalHeight);
		this._renderActiveOverlay();
	}

	_clear() {
		if (!this._ctx) {
			return;
		}

		this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
		this._layoutCache = [];
		this._draftBox = null;
		this._renderActiveOverlay();
	}

	_drawBoxes(imageWidth, imageHeight) {
		this._layoutCache = [];

		const scale = this._getDisplayScale();
		const desiredStrokeWidthPx = 4;
		const desiredFontSizePx = 16;
		const desiredPaddingXPx = 8;
		const desiredPaddingYPx = 6;
		const lineWidth = scale.canvasToCss(desiredStrokeWidthPx);
		const fontSize = scale.canvasToCss(desiredFontSizePx);
		const paddingX = scale.canvasToCss(desiredPaddingXPx);
		const paddingY = scale.canvasToCss(desiredPaddingYPx);
		const paletteSize = COLOR_PALETTE.length || 1;
		const layouts = [];

		if (!Array.isArray(this._boxes) || this._boxes.length === 0) {
			this._layoutCache = layouts;
			this._drawDraftBox(lineWidth);
			return;
		}

		for (let index = 0; index < this._boxes.length; index += 1) {
			const box = this._boxes[index];
			const { xPosition, yPosition, width, height } = box;
			const label = typeof box.label === 'string' ? box.label : '';

			if (
				typeof xPosition !== 'number' ||
				typeof yPosition !== 'number' ||
				typeof width !== 'number' ||
				typeof height !== 'number'
			) {
				continue;
			}

			const baseColor = COLOR_PALETTE[index % paletteSize] || DEFAULT_COLOR;
			const strokeStyle = baseColor;
			const labelBackground = hexToRgba(baseColor, 0.8);
			const labelTextColor = getContrastingTextColor(baseColor);
			const isActive = this._activeIndex === index;
			const isPending = this._pendingNewBoxIndex === index;

			const boxWidth = Math.abs(width) * imageWidth;
			const boxHeight = Math.abs(height) * imageHeight;

			const originX = (xPosition - width / 2) * imageWidth;
			const originY = (yPosition - height / 2) * imageHeight;

			if (isActive) {
				this._ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
				this._ctx.fillRect(originX, originY, boxWidth, boxHeight);
			}

			this._ctx.save();
			if (isPending) {
				this._ctx.setLineDash([8, 6]);
			}
			this._ctx.strokeStyle = strokeStyle;
			this._ctx.lineWidth = lineWidth;
			this._ctx.strokeRect(originX, originY, boxWidth, boxHeight);
			this._ctx.restore();

			this._ctx.font = `${fontSize}px sans-serif`;
			this._ctx.textBaseline = 'top';

			const textWidth = this._ctx.measureText(label).width;
			const backgroundWidth = textWidth + paddingX * 2;
			const backgroundHeight = fontSize + paddingY * 2;

			const backgroundX = originX;
			const backgroundY = Math.max(originY - backgroundHeight, 0);

			if (!isActive && label) {
				this._ctx.fillStyle = labelBackground;
				this._ctx.fillRect(backgroundX, backgroundY, backgroundWidth, backgroundHeight);

				this._ctx.fillStyle = labelTextColor;
				this._ctx.fillText(label, backgroundX + paddingX, backgroundY + paddingY);
			}

			layouts.push({
				index,
				boxRect: {
					x: originX,
					y: originY,
					width: boxWidth,
					height: boxHeight,
				},
				labelRect: label || isActive
					? {
						x: backgroundX,
						y: backgroundY,
						width: Math.max(backgroundWidth, paddingX * 2 + fontSize * 0.6),
						height: Math.max(backgroundHeight, fontSize + paddingY * 2),
					}
					: null,
				labelTextColor,
				labelPadding: { x: paddingX, y: paddingY },
				fontSize,
				label,
				strokeStyle,
				lineWidth,
				isActive,
				isPending,
			});
		}

		this._layoutCache = layouts;
		this._drawDraftBox(lineWidth);
	}

	_drawDraftBox(lineWidth) {
		if (!this._ctx || !this._draftBox || !this._isAddMode) {
			return;
		}

		const { startX, startY, currentX, currentY } = this._draftBox;
		const boxWidth = Math.abs(currentX - startX);
		const boxHeight = Math.abs(currentY - startY);

		if (boxWidth < 1 && boxHeight < 1) {
			return;
		}

		const originX = Math.min(startX, currentX);
		const originY = Math.min(startY, currentY);

		this._ctx.save();
		this._ctx.strokeStyle = DEFAULT_COLOR;
		this._ctx.lineWidth = lineWidth;
		this._ctx.setLineDash([8, 6]);
		this._ctx.strokeRect(originX, originY, boxWidth, boxHeight);
		this._ctx.restore();
	}

	_renderActiveOverlay() {
		if (!this._overlay) {
			return;
		}

		this._overlay.textContent = '';
		this._overlay.style.pointerEvents = 'none';
		this._activeLabelInput = null;

		if (typeof this._activeIndex !== 'number') {
			return;
		}

		const layout = this._layoutCache.find((item) => item.index === this._activeIndex);
		if (!layout) {
			return;
		}
		this._overlay.style.pointerEvents = 'auto';

		const canvasWidth = this._canvas.width || 1;
		const canvasHeight = this._canvas.height || 1;
		const overlayRect = this._overlay.getBoundingClientRect();
		const overlayWidth = overlayRect.width || this._canvas.clientWidth || canvasWidth;
		const overlayHeight = overlayRect.height || this._canvas.clientHeight || canvasHeight;
		const scaleX = overlayWidth / canvasWidth || 1;
		const scaleY = overlayHeight / canvasHeight || 1;

		const boxTopLeftX = layout.boxRect.x * scaleX -5;
		const boxTopLeftY = layout.boxRect.y * scaleY - 32;

		const controls = document.createElement('div');
		controls.className = 'overlay-controls';
		controls.style.top = `${Math.max(0, boxTopLeftY)}px`;
		controls.style.left = `${Math.max(0, boxTopLeftX)}px`;

		const autoSuggest = document.createElement('auto-suggest');
		autoSuggest.placeholder = 'Label';
		autoSuggest.items = this.autosuggestItems;
		autoSuggest.value = this._labelDraft ?? layout.label ?? '';
		autoSuggest.addEventListener('valuechange', (event) => {
			this._labelDraft = event.detail?.value ?? '';
			if (this._activeLabelInput) {
				this._activeLabelInput.setCustomValidity('');
			}
			if (event.detail?.cause === 'selection') {
				this._skipNextAutosuggestSave = true;
				queueMicrotask(() => {
					this._skipNextAutosuggestSave = false;
				});
			}
		});

		const deleteButton = document.createElement('button');
		deleteButton.type = 'button';
        deleteButton.title = 'Delete bounding box';
		deleteButton.textContent = '🚮';
		deleteButton.setAttribute('aria-label', 'Delete bounding box');
		deleteButton.addEventListener('click', this._handleDeleteClick);

		const saveButton = document.createElement('button');
		saveButton.type = 'button';
        saveButton.title = 'Save label';
		saveButton.textContent = '✅';
		saveButton.setAttribute('aria-label', 'Save label');
		saveButton.addEventListener('click', this._handleSaveClick);

		const cancelButton = document.createElement('button');
		cancelButton.type = 'button';
		cancelButton.textContent = '❌';
        cancelButton.title = 'Cancel editing';
		cancelButton.addEventListener('click', this._handleCancelClick);

		const buttonColumn = document.createElement('div');
		buttonColumn.className = 'overlay-controls-buttons';
		buttonColumn.append(saveButton, deleteButton, cancelButton);

		const labelWrapper = document.createElement('div');
		labelWrapper.className = 'overlay-controls-label';
		labelWrapper.append(autoSuggest);

		const handleLabelKeyDown = (event) => {
			if (event.defaultPrevented) {
				return;
			}

			if (event.key === 'Enter') {
				if (this._skipNextAutosuggestSave) {
					this._skipNextAutosuggestSave = false;
					return;
				}
				event.preventDefault();
				this._handleSaveClick();
				return;
			}

			if (event.key === 'Escape') {
				event.preventDefault();
				this._handleCancelClick();
			}
		};

		const attachInputListeners = () => {
			const internalInput = autoSuggest.inputElement;
			if (!internalInput) {
				return;
			}

			internalInput.addEventListener('input', this._handleLabelInput);
			internalInput.addEventListener('keydown', handleLabelKeyDown);
			internalInput.setCustomValidity('');
			this._activeLabelInput = internalInput;
		};

		this._activeLabelInput = null;

		if (typeof queueMicrotask === 'function') {
			queueMicrotask(attachInputListeners);
		} else {
			Promise.resolve().then(attachInputListeners);
		}

		controls.append(buttonColumn, labelWrapper);
		this._overlay.appendChild(controls);

		requestAnimationFrame(() => {
			const columnRect = buttonColumn.getBoundingClientRect();
			const buttonWidth = columnRect.width || deleteButton.getBoundingClientRect().width || 0;
			const desiredLeft = Math.max(0, boxTopLeftX - buttonWidth - 8);
			controls.style.left = `${desiredLeft}px`;
			try {
				autoSuggest.focus({ preventScroll: true });
			} catch (error) {
				autoSuggest.focus();
			}
			const focusTarget = autoSuggest.inputElement;
			if (focusTarget && typeof focusTarget.select === 'function') {
				focusTarget.select();
			}
		});
	}

	_handlePointerDown(event) {
		if (event.target && event.target.closest('.overlay-controls')) {
			return;
		}

		if (this._isAddMode) {
			this._handleAddPointerDown(event);
			return;
		}

		if (typeof event.button === 'number' && event.button !== 0) {
			return;
		}

		if (!Array.isArray(this._boxes) || this._boxes.length === 0) {
			return;
		}

		const { canvasX, canvasY } = this._getCanvasCoordinates(event);

		const hitTest = (targetRect) => {
			return (
				targetRect &&
				canvasX >= targetRect.x &&
				canvasX <= targetRect.x + targetRect.width &&
				canvasY >= targetRect.y &&
				canvasY <= targetRect.y + targetRect.height
			);
		};

		let targetIndex = null;

		for (let i = this._layoutCache.length - 1; i >= 0; i -= 1) {
			const layout = this._layoutCache[i];
			if (hitTest(layout.labelRect)) {
				targetIndex = layout.index;
				break;
			}
			if (hitTest(layout.boxRect)) {
				targetIndex = layout.index;
				break;
			}
		}

		if (typeof targetIndex === 'number') {
			event.preventDefault();
			this._activateBox(targetIndex);
		} else if (typeof this._activeIndex === 'number') {
			this._deactivateActiveBox();
		}
	}

	_handleAddPointerDown(event) {
		if (event.target && event.target.closest('.overlay-controls')) {
			return;
		}

		if (typeof event.button === 'number' && event.button !== 0) {
			return;
		}

		if (!this._isAddMode || this._pendingNewBoxIndex !== null) {
			return;
		}

		const { canvasX, canvasY } = this._getCanvasCoordinates(event);

		this._draftBox = {
			startX: canvasX,
			startY: canvasY,
			currentX: canvasX,
			currentY: canvasY,
		};
		this._activePointerId = event.pointerId;

		if (this._canvas && typeof this._canvas.setPointerCapture === 'function') {
			try {
				this._canvas.setPointerCapture(event.pointerId);
			} catch (error) {
				// No-op if the environment does not support pointer capture.
			}
		}

		if (this._canvas) {
			this._canvas.addEventListener('pointermove', this._handleAddPointerMove);
			this._canvas.addEventListener('pointerup', this._handleAddPointerUp);
			this._canvas.addEventListener('pointercancel', this._handleAddPointerUp);
		}
		this._draw();
	}

	_handleAddPointerMove(event) {
		if (!this._draftBox || event.pointerId !== this._activePointerId) {
			return;
		}

		const { canvasX, canvasY } = this._getCanvasCoordinates(event);
		this._draftBox = {
			...this._draftBox,
			currentX: canvasX,
			currentY: canvasY,
		};
		this._draw();
	}

	_handleAddPointerUp(event) {
		if (event.pointerId !== this._activePointerId) {
			return;
		}

		this._activePointerId = null;
		if (this._canvas && typeof this._canvas.releasePointerCapture === 'function') {
			try {
				this._canvas.releasePointerCapture(event.pointerId);
			} catch (error) {
				// Ignore release errors when pointer capture was not set.
			}
		}

		if (this._canvas) {
			this._canvas.removeEventListener('pointermove', this._handleAddPointerMove);
			this._canvas.removeEventListener('pointerup', this._handleAddPointerUp);
			this._canvas.removeEventListener('pointercancel', this._handleAddPointerUp);
		}

		if (!this._draftBox) {
			return;
		}

		if (event.type === 'pointercancel') {
			this._draftBox = null;
			this._draw();
			return;
		}

		const { startX, startY } = this._draftBox;
		const { canvasX: endX, canvasY: endY } = this._getCanvasCoordinates(event);

		const minX = Math.min(startX, endX);
		const minY = Math.min(startY, endY);
		const widthPx = Math.abs(endX - startX);
		const heightPx = Math.abs(endY - startY);

		this._draftBox = null;

		if (widthPx < 4 || heightPx < 4) {
			this._draw();
			return;
		}

		const canvasWidth = this._canvas.width || 1;
		const canvasHeight = this._canvas.height || 1;
		const width = Math.min(Math.max(widthPx / canvasWidth, 0), 1);
		const height = Math.min(Math.max(heightPx / canvasHeight, 0), 1);
		const centerX = Math.min(Math.max((minX + widthPx / 2) / canvasWidth, 0), 1);
		const centerY = Math.min(Math.max((minY + heightPx / 2) / canvasHeight, 0), 1);

		const newBox = {
			xPosition: centerX,
			yPosition: centerY,
			width,
			height,
			label: '',
		};

		this._boxes = [...this._boxes, newBox];
		this._pendingNewBoxIndex = this._boxes.length - 1;
		this._activeIndex = this._pendingNewBoxIndex;
		this._labelDraft = '';
		this._draw();
	}

	_handleAddButtonClick(event) {
		event.preventDefault();
		event.stopPropagation();

		if (this._isAddMode) {
			this._exitAddMode();
		} else {
			this._enterAddMode();
		}
	}

	_enterAddMode() {
		if (this._isAddMode) {
			return;
		}

		this._isAddMode = true;
		this._draftBox = null;
		this._pendingNewBoxIndex = null;
		this._activePointerId = null;

		if (this._addButton) {
			this._addButton.setAttribute('aria-pressed', 'true');
		}

		this._setCanvasCursor('copy');
		this._deactivateActiveBox({ redraw: false });
		this._draw();
	}

	_exitAddMode(options = {}) {
		const { redraw = true } = options;

		if (!this._isAddMode) {
			if (redraw) {
				this._draw();
			}
			return;
		}

		if (this._canvas && this._activePointerId !== null) {
			try {
				this._canvas.releasePointerCapture(this._activePointerId);
			} catch (error) {
				// Ignore release errors if no capture exists.
			}

			this._canvas.removeEventListener('pointermove', this._handleAddPointerMove);
			this._canvas.removeEventListener('pointerup', this._handleAddPointerUp);
			this._canvas.removeEventListener('pointercancel', this._handleAddPointerUp);
			this._activePointerId = null;
		}

		if (this._pendingNewBoxIndex !== null) {
			this._boxes = this._boxes.filter((_box, index) => index !== this._pendingNewBoxIndex);
		}

		this._deactivateActiveBox({ redraw: false });
		this._isAddMode = false;
		this._draftBox = null;
		this._pendingNewBoxIndex = null;

		if (this._addButton) {
			this._addButton.setAttribute('aria-pressed', 'false');
		}

		this._setCanvasCursor('default');
		this._activeLabelInput = null;

		if (redraw) {
			this._draw();
		} else {
			this._renderActiveOverlay();
		}
	}

	_setCanvasCursor(mode) {
		const cursor = mode === 'copy' ? 'copy' : 'default';

		if (this._canvas) {
			this._canvas.style.cursor = cursor;
		}

		if (this._overlay) {
			this._overlay.style.cursor = 'default';
		}
	}

	_getCanvasCoordinates(event) {
		if (!this._canvas) {
			return { canvasX: 0, canvasY: 0, scaleX: 1, scaleY: 1 };
		}

		const rect = this._canvas.getBoundingClientRect();
		const scaleX = this._canvas.width / (rect.width || 1);
		const scaleY = this._canvas.height / (rect.height || 1);

		return {
			canvasX: (event.clientX - rect.left) * scaleX,
			canvasY: (event.clientY - rect.top) * scaleY,
			scaleX,
			scaleY,
		};
	}

	_handleLabelInput(event) {
		if (event?.target?.setCustomValidity) {
			event.target.setCustomValidity('');
		}
		this._labelDraft = event.target.value;
	}

	_handleSaveClick() {
		if (typeof this._activeIndex !== 'number') {
			return;
		}

		const activeBox = this._boxes[this._activeIndex];
		if (!activeBox) {
			return;
		}

		const trimmedLabel = (this._labelDraft ?? '').trim();
		if (!trimmedLabel) {
			if (this._activeLabelInput) {
				this._activeLabelInput.setCustomValidity('Label is required');
				if (typeof this._activeLabelInput.reportValidity === 'function') {
					this._activeLabelInput.reportValidity();
				}
				try {
					this._activeLabelInput.focus({ preventScroll: true });
				} catch (error) {
					if (typeof this._activeLabelInput.focus === 'function') {
						this._activeLabelInput.focus();
					}
				}
			}
			return;
		}

		const nextLabel = trimmedLabel;
		this._boxes[this._activeIndex] = { ...activeBox, label: nextLabel };
		this._labelDraft = nextLabel;
		this._updateBoxesAttribute();
		this._dispatchBoxesChanged();
		const isPendingSave = this._pendingNewBoxIndex === this._activeIndex;
		if (isPendingSave) {
			this._pendingNewBoxIndex = null;
			this._deactivateActiveBox({ redraw: false });
			this._exitAddMode({ redraw: false });
			this._draw();
		} else {
			this._deactivateActiveBox();
		}
	}

	_handleCancelClick() {
		if (typeof this._activeIndex !== 'number') {
			this._deactivateActiveBox();
			return;
		}

		const isPending = this._pendingNewBoxIndex === this._activeIndex;
		if (isPending) {
			this._boxes = this._boxes.filter((_box, index) => index !== this._activeIndex);
			this._pendingNewBoxIndex = null;
			this._deactivateActiveBox({ redraw: false });
			this._exitAddMode({ redraw: false });
			this._draw();
			return;
		}

		this._deactivateActiveBox();
	}

	_handleDeleteClick() {
		if (typeof this._activeIndex !== 'number') {
			return;
		}

		const isPending = this._pendingNewBoxIndex === this._activeIndex;

		this._boxes = this._boxes.filter((_box, index) => index !== this._activeIndex);
		if (isPending) {
			this._pendingNewBoxIndex = null;
			this._deactivateActiveBox({ redraw: false });
			this._exitAddMode({ redraw: false });
			this._draw();
			return;
		}

		this._deactivateActiveBox({ redraw: false });
		this._updateBoxesAttribute();
		this._dispatchBoxesChanged();
		this._draw();
	}

	_activateBox(index) {
		if (index < 0 || index >= this._boxes.length) {
			return;
		}

		this._activeIndex = index;
		const activeBox = this._boxes[index];
		this._labelDraft = typeof activeBox.label === 'string' ? activeBox.label : '';
		this._draw();
	}

	_deactivateActiveBox(options = { redraw: true }) {
		this._activeIndex = null;
		this._labelDraft = '';
		this._activeLabelInput = null;
		if (options.redraw !== false) {
			this._draw();
		}
	}

	_updateBoxesAttribute() {
		if (!this.isConnected) {
			return;
		}

		this._isUpdatingBoxesAttribute = true;
		try {
			this.setAttribute('boxes', JSON.stringify(this._boxes));
		} catch (error) {
			console.warn('Unable to serialise boxes attribute.', error);
		} finally {
			this._isUpdatingBoxesAttribute = false;
		}
	}

	_dispatchBoxesChanged() {
		this.dispatchEvent(
			new CustomEvent('boxeschange', {
				detail: {
					boxes: this._boxes.map((box) => ({ ...box })),
				},
				bubbles: true,
				composed: true,
			})
		);
	}

	_getDisplayScale() {
		const canvasWidth = this._canvas.width || 1;
		const canvasHeight = this._canvas.height || 1;
		const rect = this._canvas.getBoundingClientRect();
		const displayWidth = rect.width || this._canvas.clientWidth || canvasWidth;
		const displayHeight = rect.height || this._canvas.clientHeight || canvasHeight;
		const scaleX = displayWidth / canvasWidth || 1;
		const scaleY = displayHeight / canvasHeight || 1;
		const scale = Math.min(scaleX, scaleY) || 1;

		return {
			canvasToCss: (desiredPx) => {
				if (!isFinite(scale) || scale === 0) {
					return desiredPx;
				}

				return Math.max(desiredPx / scale, 1);
			},
		};
	}
}

if (!customElements.get('bounding-boxes')) {
	customElements.define('bounding-boxes', BoundingBoxesElement);
}
