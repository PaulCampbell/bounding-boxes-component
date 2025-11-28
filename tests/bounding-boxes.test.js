import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import './setup.js';
import { BoundingBoxesElement } from '../src/bounding-boxes.js';

let originalGetContext;

beforeAll(() => {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};

	originalGetContext = HTMLCanvasElement.prototype.getContext;
	const getContextMock = vi.fn(() => ({
		drawImage: vi.fn(),
		fillRect: vi.fn(),
		strokeRect: vi.fn(),
		measureText: vi.fn(() => ({ width: 0 })),
		clearRect: vi.fn(),
		setLineDash: vi.fn(),
		save: vi.fn(),
		restore: vi.fn(),
		fillText: vi.fn(),
	}));

	Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
		configurable: true,
		writable: true,
		value: getContextMock,
	});
});

afterAll(() => {
	if (originalGetContext) {
		Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
			configurable: true,
			writable: true,
			value: originalGetContext,
		});
	} else {
		delete HTMLCanvasElement.prototype.getContext;
	}
});

beforeEach(() => {
	document.body.innerHTML = '';
});

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('BoundingBoxesElement', () => {
	it('parses valid boxes JSON from attribute', () => {
		const element = new BoundingBoxesElement();
		const boxes = [
			{ xPosition: 0.4, yPosition: 0.6, width: 0.2, height: 0.25, label: 'test' },
		];

		element.setAttribute('boxes', JSON.stringify(boxes));
		document.body.appendChild(element);

		expect(element.boxes).toEqual(boxes);
	});

	it('falls back to empty boxes on invalid JSON input', () => {
		const element = new BoundingBoxesElement();
		element.setAttribute('boxes', 'not-json');
		document.body.appendChild(element);

		expect(element.boxes).toEqual([]);
	});

	it('emits boxeschange event with cloned payload on save', () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		const boxes = [
			{ xPosition: 0.5, yPosition: 0.5, width: 0.2, height: 0.2, label: 'initial' },
		];

		element.boxes = boxes;
		element._activeIndex = 0;
		element._labelDraft = 'updated';

		const listener = vi.fn();
		element.addEventListener('boxeschange', listener);

		element._handleSaveClick();

		expect(listener).toHaveBeenCalledTimes(1);
		const event = listener.mock.calls[0][0];
		expect(event.detail.boxes).toEqual([
			{ xPosition: 0.5, yPosition: 0.5, width: 0.2, height: 0.2, label: 'updated' },
		]);
		expect(event.detail.boxes).not.toBe(element.boxes);
	});

	it('toggles add mode cursor state', () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		element._enterAddMode();

		expect(element._isAddMode).toBe(true);
		expect(element._canvas.style.cursor).toBe('copy');

		element._exitAddMode();
		expect(element._isAddMode).toBe(false);
		expect(element._canvas.style.cursor).toBe('default');
	});

	it('activates a box when clicking inside its bounds', () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		element._canvas.width = 200;
		element._canvas.height = 200;
		element._canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });

		vi.spyOn(element, '_draw').mockImplementation(() => {});

		element._boxes = [
			{ xPosition: 0.5, yPosition: 0.5, width: 0.4, height: 0.4, label: 'box-1' },
		];
		element._layoutCache = [
			{
				index: 0,
				boxRect: { x: 50, y: 50, width: 80, height: 80 },
				labelRect: null,
			},
		];

		const preventDefault = vi.fn();
		element._handlePointerDown({
			target: element._canvas,
			button: 0,
			clientX: 100,
			clientY: 100,
			preventDefault,
		});

		expect(preventDefault).toHaveBeenCalled();
		expect(element._activeIndex).toBe(0);
	});

	it('deactivates the active box when clicking empty space', () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		element._canvas.width = 200;
		element._canvas.height = 200;
		element._canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });

		vi.spyOn(element, '_draw').mockImplementation(() => {});
		element._boxes = [
			{ xPosition: 0.5, yPosition: 0.5, width: 0.4, height: 0.4, label: 'box-1' },
		];
		element._layoutCache = [
			{
				index: 0,
				boxRect: { x: 50, y: 50, width: 80, height: 80 },
				labelRect: null,
			},
		];
		element._activeIndex = 0;

		element._handlePointerDown({
			target: element._canvas,
			button: 0,
			clientX: 10,
			clientY: 10,
			preventDefault: vi.fn(),
		});

		expect(element._activeIndex).toBeNull();
	});

	it('creates a pending box after drag in add mode', () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		element._canvas.width = 200;
		element._canvas.height = 200;
		element._canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });
		element._canvas.setPointerCapture = vi.fn();
		element._canvas.releasePointerCapture = vi.fn();

		vi.spyOn(element, '_draw').mockImplementation(() => {});

		const coordSpy = vi.spyOn(element, '_getCanvasCoordinates');
		coordSpy
			.mockReturnValueOnce({ canvasX: 10, canvasY: 20, scaleX: 1, scaleY: 1 })
			.mockReturnValueOnce({ canvasX: 110, canvasY: 120, scaleX: 1, scaleY: 1 })
			.mockReturnValueOnce({ canvasX: 110, canvasY: 120, scaleX: 1, scaleY: 1 });

		element._enterAddMode();

		const pointerId = 1;
		element._handleAddPointerDown({
			pointerId,
			button: 0,
			target: element._canvas,
			clientX: 0,
			clientY: 0,
		});

		element._handleAddPointerMove({ pointerId });
		element._handleAddPointerUp({ pointerId, type: 'pointerup' });

		expect(element.boxes).toHaveLength(1);
		expect(element._pendingNewBoxIndex).toBe(0);
		expect(element._activeIndex).toBe(0);
		expect(element.boxes[0]).toMatchObject({
			xPosition: 0.3,
			yPosition: 0.35,
			width: 0.5,
			height: 0.5,
			label: '',
		});
	});

	it('cancel removes pending box and exits add mode', () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		vi.spyOn(element, '_draw').mockImplementation(() => {});

		element._boxes = [
			{ xPosition: 0.5, yPosition: 0.5, width: 0.2, height: 0.2, label: '' },
		];
		element._pendingNewBoxIndex = 0;
		element._activeIndex = 0;
		element._isAddMode = true;

		element._handleCancelClick();

		expect(element.boxes).toEqual([]);
		expect(element._pendingNewBoxIndex).toBeNull();
		expect(element._isAddMode).toBe(false);
	});

	it('delete removes existing box and emits boxeschange', () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		const boxes = [
			{ xPosition: 0.3, yPosition: 0.3, width: 0.2, height: 0.2, label: 'one' },
			{ xPosition: 0.7, yPosition: 0.7, width: 0.1, height: 0.1, label: 'two' },
		];

		element.boxes = boxes;
		vi.spyOn(element, '_draw').mockImplementation(() => {});
		element._activeIndex = 0;

		const listener = vi.fn();
		element.addEventListener('boxeschange', listener);

		element._handleDeleteClick();

		expect(element.boxes).toEqual([
			{ xPosition: 0.7, yPosition: 0.7, width: 0.1, height: 0.1, label: 'two' },
		]);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(element.getAttribute('boxes')).toEqual(JSON.stringify(element.boxes));
	});

	it('prevents saving when label is empty', async () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		vi.spyOn(element, '_draw').mockImplementation(() => {});
		const updateSpy = vi.spyOn(element, '_updateBoxesAttribute');
		const dispatchSpy = vi.spyOn(element, '_dispatchBoxesChanged');

		element._canvas.width = 200;
		element._canvas.height = 200;
		element._canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });

		element._boxes = [
			{ xPosition: 0.5, yPosition: 0.5, width: 0.4, height: 0.4, label: '' },
		];
		element._layoutCache = [
			{
				index: 0,
				boxRect: { x: 50, y: 50, width: 80, height: 80 },
				labelRect: { x: 50, y: 30, width: 60, height: 24 },
				label: '',
			},
		];
		element._activeIndex = 0;
		element._labelDraft = '';

		element._renderActiveOverlay();
		await Promise.resolve();
		const autoSuggest = element.shadowRoot.querySelector('auto-suggest');
		const labelInput = autoSuggest?.inputElement ?? autoSuggest?.shadowRoot?.querySelector('input');
		if (!labelInput) {
			throw new Error('Expected auto-suggest input to be present');
		}
		const validitySpy = vi.spyOn(labelInput, 'setCustomValidity');
		const reportSpy = vi.spyOn(labelInput, 'reportValidity');
		vi.spyOn(labelInput, 'focus');

		element._handleSaveClick();

		expect(validitySpy).toHaveBeenCalledWith('Label is required');
		expect(reportSpy).toHaveBeenCalled();
		expect(element._activeIndex).toBe(0);
		expect(element.boxes[0].label).toBe('');
		expect(updateSpy).not.toHaveBeenCalled();
		expect(dispatchSpy).not.toHaveBeenCalled();
	});

	it('does not save when autosuggest handles enter key selection', async () => {
		const element = new BoundingBoxesElement();
		document.body.appendChild(element);

		element.autosuggestItems = ['Bee', 'Cat', 'Dog'];
		element._boxes = [
			{ xPosition: 0.5, yPosition: 0.5, width: 0.4, height: 0.4, label: 'B' },
		];
		element._layoutCache = [
			{
				index: 0,
				boxRect: { x: 50, y: 50, width: 80, height: 80 },
				labelRect: { x: 50, y: 30, width: 60, height: 24 },
				label: 'B',
				labelPadding: { x: 4, y: 4 },
				fontSize: 14,
				strokeStyle: '#fff',
				lineWidth: 2,
				isActive: true,
				isPending: false,
			},
		];
		element._canvas.width = 200;
		element._canvas.height = 200;
		element._canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });
		element._activeIndex = 0;
		element._labelDraft = 'B';
		element._renderActiveOverlay();
		await Promise.resolve();

		const autoSuggest = element.shadowRoot.querySelector('auto-suggest');
		expect(autoSuggest).not.toBeNull();
		const input = autoSuggest.inputElement;
		expect(input).not.toBeNull();
		const saveSpy = vi.spyOn(element, '_handleSaveClick');

		input.dispatchEvent(new Event('focus'));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
		const highlighted = autoSuggest.shadowRoot.querySelector('[aria-selected="true"]');
		expect(highlighted).not.toBeNull();
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

		expect(saveSpy).not.toHaveBeenCalled();
		expect(input.value).toBe('Bee');
		expect(element._labelDraft).toBe('Bee');
	});
});
