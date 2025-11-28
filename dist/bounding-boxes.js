var X=document.createElement("template");X.innerHTML=`
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
`;var D=class extends HTMLElement{static get observedAttributes(){return["items","value","placeholder"]}constructor(){super(),this._items=[],this._filteredItems=[],this._highlightedIndex=-1,this._open=!1,this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(X.content.cloneNode(!0)),this._input=this.shadowRoot.querySelector("input"),this._suggestions=this.shadowRoot.querySelector(".suggestions"),this._handleInput=this._handleInput.bind(this),this._handleFocus=this._handleFocus.bind(this),this._handleBlur=this._handleBlur.bind(this),this._handleKeyDown=this._handleKeyDown.bind(this),this._handleSuggestionClick=this._handleSuggestionClick.bind(this),this._handleExternalPointerDown=this._handleExternalPointerDown.bind(this)}connectedCallback(){this._upgradeProperty("items"),this._upgradeProperty("value"),this._upgradeProperty("placeholder"),this._input.addEventListener("input",this._handleInput),this._input.addEventListener("focus",this._handleFocus),this._input.addEventListener("blur",this._handleBlur),this._input.addEventListener("keydown",this._handleKeyDown),this._suggestions.addEventListener("pointerdown",this._handleSuggestionClick),document.addEventListener("pointerdown",this._handleExternalPointerDown),this._applyPlaceholder(),this._updateFilteredItems(),this._renderSuggestions()}disconnectedCallback(){this._input.removeEventListener("input",this._handleInput),this._input.removeEventListener("focus",this._handleFocus),this._input.removeEventListener("blur",this._handleBlur),this._input.removeEventListener("keydown",this._handleKeyDown),this._suggestions.removeEventListener("pointerdown",this._handleSuggestionClick),document.removeEventListener("pointerdown",this._handleExternalPointerDown)}attributeChangedCallback(t,e,i){t==="items"&&(this.items=this._parseItems(i)),t==="value"&&(this.value=i??""),t==="placeholder"&&(this.placeholder=i??"")}get items(){return this._items}set items(t){let e=Array.isArray(t)?t.map(i=>`${i}`):[];this._items=e,this._updateFilteredItems(),this._renderSuggestions()}get value(){return this._input.value}set value(t){let e=t??"";this._input.value!==e&&(this._input.value=e),this._input.setCustomValidity(""),this._updateFilteredItems(),this._renderSuggestions()}get placeholder(){return this._placeholder||""}set placeholder(t){this._placeholder=t??"",this._applyPlaceholder()}get inputElement(){return this._input}focus(t){this._input.focus(t)}setCustomValidity(t){this._input.setCustomValidity(t)}reportValidity(){return this._input.reportValidity()}_upgradeProperty(t){if(Object.prototype.hasOwnProperty.call(this,t)){let e=this[t];delete this[t],this[t]=e}}_handleInput(t){let e=t.target.value;this._input.setCustomValidity(""),this._updateFilteredItems(e),this._open=!0,this._renderSuggestions(),this._emitValueChange(e,"input")}_handleFocus(){this._updateFilteredItems(this.value),this._open=!0,this._renderSuggestions()}_handleBlur(){setTimeout(()=>{this._open=!1,this._renderSuggestions()},100)}_handleKeyDown(t){if(this._filteredItems.length)switch(t.key){case"ArrowDown":t.preventDefault(),t.stopPropagation(),this._moveHighlight(1);break;case"ArrowUp":t.preventDefault(),t.stopPropagation(),this._moveHighlight(-1);break;case"Enter":this._highlightedIndex>=0&&(t.preventDefault(),t.stopImmediatePropagation(),this._selectHighlighted());break;case"Escape":this._open=!1,this._highlightedIndex=-1,this._renderSuggestions();break;default:break}}_handleSuggestionClick(t){let e=t.target;if(!(e instanceof HTMLElement))return;let i=e.dataset.value;i!=null&&(t.preventDefault(),this.value=i,this._emitValueChange(i,"selection"),this._open=!1,this._highlightedIndex=-1,this._renderSuggestions(),this.focus({preventScroll:!0}))}_handleExternalPointerDown(t){t.target===this||this.contains(t.target)||(this._open=!1,this._highlightedIndex=-1,this._renderSuggestions())}_moveHighlight(t){if(!this._filteredItems.length){this._highlightedIndex=-1,this._renderSuggestions();return}this._open=!0;let e=this._filteredItems.length;this._highlightedIndex=(this._highlightedIndex+t+e)%e,this._renderSuggestions()}_selectHighlighted(){if(this._highlightedIndex<0||this._highlightedIndex>=this._filteredItems.length)return;let t=this._filteredItems[this._highlightedIndex];this.value=t,this._emitValueChange(t,"selection"),this._open=!1,this._highlightedIndex=-1,this._renderSuggestions()}_emitValueChange(t,e="input"){this.dispatchEvent(new CustomEvent("valuechange",{detail:{value:t,cause:e},bubbles:!0,composed:!0}))}_updateFilteredItems(t=this.value){let e=(t??"").trim().toLowerCase();e?this._filteredItems=this._items.filter(i=>i.toLowerCase().includes(e)):this._filteredItems=[...this._items],this._filteredItems.includes(this.value)||(this._highlightedIndex=-1)}_renderSuggestions(){let t=this._open&&this._filteredItems.length>0;this.toggleAttribute("open",t),this._suggestions.innerHTML="",t&&this._filteredItems.forEach((e,i)=>{let s=document.createElement("div");s.className="suggestion",s.textContent=e,s.dataset.value=e,s.setAttribute("role","option"),s.setAttribute("aria-selected",i===this._highlightedIndex?"true":"false"),this._suggestions.appendChild(s)})}_parseItems(t){if(!t)return[];try{let e=JSON.parse(t);return Array.isArray(e)?e.map(i=>`${i}`):[]}catch{return[]}}_applyPlaceholder(){this._input.placeholder=this._placeholder||""}};customElements.get("auto-suggest")||customElements.define("auto-suggest",D);var Y=["#f97316","#ef4444","#eab308","#22c55e","#0ea5e9","#a855f7"],T="#00ff88",U=document.createElement("template"),z=p=>{if(typeof p!="string")return null;let t=p.replace("#","");if(t.length!==3&&t.length!==6)return null;let e=t.length===3?t.split("").map(s=>s+s).join(""):t,i=parseInt(e,16);return Number.isNaN(i)?null:{r:i>>16&255,g:i>>8&255,b:i&255}},F=(p,t)=>{let e=z(p);if(!e)return p;let i=Math.min(Math.max(t,0),1);return`rgba(${e.r}, ${e.g}, ${e.b}, ${i})`},H=p=>{let t=z(p);if(!t)return"#111827";let e=s=>{let r=s/255;return r<=.03928?r/12.92:((r+.055)/1.055)**2.4};return .2126*e(t.r)+.7152*e(t.g)+.0722*e(t.b)>.55?"#111827":"#ffffff"};U.innerHTML=`
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
		<button class="add-button" type="button" title="Add tag" aria-label="Add tag" aria-pressed="false">\u2795</button>
		<div class="overlay"></div>
	</figure>
`;var N=class extends HTMLElement{static get observedAttributes(){return["src","boxes","autosuggestitems"]}constructor(){super(),this._boxes=[],this._image=null,this._ctx=null,this._layoutCache=[],this._activeIndex=null,this._labelDraft="",this._isUpdatingBoxesAttribute=!1,this._autosuggestItems=[],this._isUpdatingAutosuggestAttribute=!1,this._skipNextAutosuggestSave=!1,this._isAddMode=!1,this._draftBox=null,this._pendingNewBoxIndex=null,this._activePointerId=null,this._activeLabelInput=null,typeof ResizeObserver=="function"?this._resizeObserver=new ResizeObserver(()=>{this._draw()}):this._resizeObserver=null,this._handlePointerDown=this._handlePointerDown.bind(this),this._handleSaveClick=this._handleSaveClick.bind(this),this._handleCancelClick=this._handleCancelClick.bind(this),this._handleDeleteClick=this._handleDeleteClick.bind(this),this._handleLabelInput=this._handleLabelInput.bind(this),this._handleAddButtonClick=this._handleAddButtonClick.bind(this),this._handleAddPointerMove=this._handleAddPointerMove.bind(this),this._handleAddPointerUp=this._handleAddPointerUp.bind(this),this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(U.content.cloneNode(!0)),this._canvas=this.shadowRoot.querySelector("canvas"),this._overlay=this.shadowRoot.querySelector(".overlay"),this._addButton=this.shadowRoot.querySelector(".add-button")}connectedCallback(){this._ctx||(this._ctx=this._canvas.getContext("2d")),this.isConnected&&this._resizeObserver&&this._resizeObserver.observe(this),this._canvas.addEventListener("pointerdown",this._handlePointerDown),this._overlay&&this._overlay.addEventListener("pointerdown",this._handlePointerDown),this._addButton&&this._addButton.addEventListener("click",this._handleAddButtonClick),this.hasAttribute("boxes")&&this._setBoxesFromAttribute(this.getAttribute("boxes")),this.hasAttribute("autosuggestitems")&&this._setAutosuggestItemsFromAttribute(this.getAttribute("autosuggestitems")),this.hasAttribute("src")&&this._loadImage(this.getAttribute("src"))}disconnectedCallback(){this._resizeObserver&&this._resizeObserver.unobserve(this),this._canvas.removeEventListener("pointerdown",this._handlePointerDown),this._overlay&&this._overlay.removeEventListener("pointerdown",this._handlePointerDown),this._addButton&&this._addButton.removeEventListener("click",this._handleAddButtonClick),this._exitAddMode({redraw:!1})}attributeChangedCallback(t,e,i){t==="src"&&this._loadImage(i),t==="boxes"&&this._setBoxesFromAttribute(i),t==="autosuggestitems"&&this._setAutosuggestItemsFromAttribute(i)}set boxes(t){if(!Array.isArray(t)){console.warn("`boxes` must be an array.");return}this._boxes=t,this._activeIndex=null,this._labelDraft="",this._pendingNewBoxIndex=null,this._exitAddMode({redraw:!1}),this._draw()}get boxes(){return this._boxes}_setAutosuggestItemsFromAttribute(t){if(!this._isUpdatingAutosuggestAttribute){if(!t){this._autosuggestItems=[],this._renderActiveOverlay();return}try{let e=JSON.parse(t);this._autosuggestItems=this._normalizeAutosuggestItems(e)}catch(e){console.warn("Unable to parse `autosuggestitems` attribute. Expecting valid JSON.",e),this._autosuggestItems=[]}this._renderActiveOverlay()}}_normalizeAutosuggestItems(t){return Array.isArray(t)?t.map(e=>typeof e=="string"?e.trim():e==null?"":String(e).trim()).filter(e=>e.length>0):[]}set autosuggestItems(t){if(!Array.isArray(t)){console.warn("`autosuggestItems` must be an array.");return}let e=this._normalizeAutosuggestItems(t);this._autosuggestItems=e,this._isUpdatingAutosuggestAttribute||(this._isUpdatingAutosuggestAttribute=!0,e.length===0?this.removeAttribute("autosuggestitems"):this.setAttribute("autosuggestitems",JSON.stringify(e)),this._isUpdatingAutosuggestAttribute=!1),this._renderActiveOverlay()}get autosuggestItems(){return Array.isArray(this._autosuggestItems)?[...this._autosuggestItems]:[]}_setBoxesFromAttribute(t){if(!this._isUpdatingBoxesAttribute){if(!t){this.boxes=[];return}try{let e=JSON.parse(t);this.boxes=Array.isArray(e)?e:[]}catch(e){console.warn("Unable to parse `boxes` attribute. Expecting valid JSON.",e),this.boxes=[]}}}async _loadImage(t){if(!t){this._image=null,this._clear();return}let e=new Image;e.decoding="async",e.src=t;try{await e.decode(),this._image=e,this._draw()}catch(i){console.error("Unable to load image for <bounding-boxes> component.",i),this._image=null,this._clear()}}_draw(){if(!this._ctx)return;if(!this._image){this._clear();return}let{naturalWidth:t,naturalHeight:e}=this._image;if(!t||!e){this._clear();return}(this._canvas.width!==t||this._canvas.height!==e)&&(this._canvas.width=t,this._canvas.height=e),this._ctx.drawImage(this._image,0,0,t,e),this._drawBoxes(t,e),this._renderActiveOverlay()}_clear(){this._ctx&&(this._ctx.clearRect(0,0,this._canvas.width,this._canvas.height),this._layoutCache=[],this._draftBox=null,this._renderActiveOverlay())}_drawBoxes(t,e){this._layoutCache=[];let i=this._getDisplayScale(),s=4,r=16,a=8,d=6,h=i.canvasToCss(s),o=i.canvasToCss(r),f=i.canvasToCss(a),c=i.canvasToCss(d),u=Y.length||1,_=[];if(!Array.isArray(this._boxes)||this._boxes.length===0){this._layoutCache=_,this._drawDraftBox(h);return}for(let l=0;l<this._boxes.length;l+=1){let g=this._boxes[l],{xPosition:b,yPosition:v,width:m,height:x}=g,n=typeof g.label=="string"?g.label:"";if(typeof b!="number"||typeof v!="number"||typeof m!="number"||typeof x!="number")continue;let y=Y[l%u]||T,A=y,w=F(y,.8),k=H(y),I=this._activeIndex===l,O=this._pendingNewBoxIndex===l,P=Math.abs(m)*t,L=Math.abs(x)*e,C=(b-m/2)*t,B=(v-x/2)*e;I&&(this._ctx.fillStyle="rgba(0, 0, 0, 0.3)",this._ctx.fillRect(C,B,P,L)),this._ctx.save(),O&&this._ctx.setLineDash([8,6]),this._ctx.strokeStyle=A,this._ctx.lineWidth=h,this._ctx.strokeRect(C,B,P,L),this._ctx.restore(),this._ctx.font=`${o}px sans-serif`,this._ctx.textBaseline="top";let R=this._ctx.measureText(n).width+f*2,E=o+c*2,S=C,M=Math.max(B-E,0);!I&&n&&(this._ctx.fillStyle=w,this._ctx.fillRect(S,M,R,E),this._ctx.fillStyle=k,this._ctx.fillText(n,S+f,M+c)),_.push({index:l,boxRect:{x:C,y:B,width:P,height:L},labelRect:n||I?{x:S,y:M,width:Math.max(R,f*2+o*.6),height:Math.max(E,o+c*2)}:null,labelTextColor:k,labelPadding:{x:f,y:c},fontSize:o,label:n,strokeStyle:A,lineWidth:h,isActive:I,isPending:O})}this._layoutCache=_,this._drawDraftBox(h)}_drawDraftBox(t){if(!this._ctx||!this._draftBox||!this._isAddMode)return;let{startX:e,startY:i,currentX:s,currentY:r}=this._draftBox,a=Math.abs(s-e),d=Math.abs(r-i);if(a<1&&d<1)return;let h=Math.min(e,s),o=Math.min(i,r);this._ctx.save(),this._ctx.strokeStyle=T,this._ctx.lineWidth=t,this._ctx.setLineDash([8,6]),this._ctx.strokeRect(h,o,a,d),this._ctx.restore()}_renderActiveOverlay(){if(!this._overlay||(this._overlay.textContent="",this._overlay.style.pointerEvents="none",this._activeLabelInput=null,typeof this._activeIndex!="number"))return;let t=this._layoutCache.find(n=>n.index===this._activeIndex);if(!t)return;this._overlay.style.pointerEvents="auto";let e=this._canvas.width||1,i=this._canvas.height||1,s=this._overlay.getBoundingClientRect(),r=s.width||this._canvas.clientWidth||e,a=s.height||this._canvas.clientHeight||i,d=r/e||1,h=a/i||1,o=t.boxRect.x*d-5,f=t.boxRect.y*h-32,c=document.createElement("div");c.className="overlay-controls",c.style.top=`${Math.max(0,f)}px`,c.style.left=`${Math.max(0,o)}px`;let u=document.createElement("auto-suggest");u.placeholder="Label",u.items=this.autosuggestItems,u.value=this._labelDraft??t.label??"",u.addEventListener("valuechange",n=>{this._labelDraft=n.detail?.value??"",this._activeLabelInput&&this._activeLabelInput.setCustomValidity(""),n.detail?.cause==="selection"&&(this._skipNextAutosuggestSave=!0,queueMicrotask(()=>{this._skipNextAutosuggestSave=!1}))});let _=document.createElement("button");_.type="button",_.title="Delete bounding box",_.textContent="\u{1F6AE}",_.setAttribute("aria-label","Delete bounding box"),_.addEventListener("click",this._handleDeleteClick);let l=document.createElement("button");l.type="button",l.title="Save label",l.textContent="\u2705",l.setAttribute("aria-label","Save label"),l.addEventListener("click",this._handleSaveClick);let g=document.createElement("button");g.type="button",g.textContent="\u274C",g.title="Cancel editing",g.addEventListener("click",this._handleCancelClick);let b=document.createElement("div");b.className="overlay-controls-buttons",b.append(l,_,g);let v=document.createElement("div");v.className="overlay-controls-label",v.append(u);let m=n=>{if(!n.defaultPrevented){if(n.key==="Enter"){if(this._skipNextAutosuggestSave){this._skipNextAutosuggestSave=!1;return}n.preventDefault(),this._handleSaveClick();return}n.key==="Escape"&&(n.preventDefault(),this._handleCancelClick())}},x=()=>{let n=u.inputElement;n&&(n.addEventListener("input",this._handleLabelInput),n.addEventListener("keydown",m),n.setCustomValidity(""),this._activeLabelInput=n)};this._activeLabelInput=null,typeof queueMicrotask=="function"?queueMicrotask(x):Promise.resolve().then(x),c.append(b,v),this._overlay.appendChild(c),requestAnimationFrame(()=>{let y=b.getBoundingClientRect().width||_.getBoundingClientRect().width||0,A=Math.max(0,o-y-8);c.style.left=`${A}px`;try{u.focus({preventScroll:!0})}catch{u.focus()}let w=u.inputElement;w&&typeof w.select=="function"&&w.select()})}_handlePointerDown(t){if(t.target&&t.target.closest(".overlay-controls"))return;if(this._isAddMode){this._handleAddPointerDown(t);return}if(typeof t.button=="number"&&t.button!==0||!Array.isArray(this._boxes)||this._boxes.length===0)return;let{canvasX:e,canvasY:i}=this._getCanvasCoordinates(t),s=a=>a&&e>=a.x&&e<=a.x+a.width&&i>=a.y&&i<=a.y+a.height,r=null;for(let a=this._layoutCache.length-1;a>=0;a-=1){let d=this._layoutCache[a];if(s(d.labelRect)){r=d.index;break}if(s(d.boxRect)){r=d.index;break}}typeof r=="number"?(t.preventDefault(),this._activateBox(r)):typeof this._activeIndex=="number"&&this._deactivateActiveBox()}_handleAddPointerDown(t){if(t.target&&t.target.closest(".overlay-controls")||typeof t.button=="number"&&t.button!==0||!this._isAddMode||this._pendingNewBoxIndex!==null)return;let{canvasX:e,canvasY:i}=this._getCanvasCoordinates(t);if(this._draftBox={startX:e,startY:i,currentX:e,currentY:i},this._activePointerId=t.pointerId,this._canvas&&typeof this._canvas.setPointerCapture=="function")try{this._canvas.setPointerCapture(t.pointerId)}catch{}this._canvas&&(this._canvas.addEventListener("pointermove",this._handleAddPointerMove),this._canvas.addEventListener("pointerup",this._handleAddPointerUp),this._canvas.addEventListener("pointercancel",this._handleAddPointerUp)),this._draw()}_handleAddPointerMove(t){if(!this._draftBox||t.pointerId!==this._activePointerId)return;let{canvasX:e,canvasY:i}=this._getCanvasCoordinates(t);this._draftBox={...this._draftBox,currentX:e,currentY:i},this._draw()}_handleAddPointerUp(t){if(t.pointerId!==this._activePointerId)return;if(this._activePointerId=null,this._canvas&&typeof this._canvas.releasePointerCapture=="function")try{this._canvas.releasePointerCapture(t.pointerId)}catch{}if(this._canvas&&(this._canvas.removeEventListener("pointermove",this._handleAddPointerMove),this._canvas.removeEventListener("pointerup",this._handleAddPointerUp),this._canvas.removeEventListener("pointercancel",this._handleAddPointerUp)),!this._draftBox)return;if(t.type==="pointercancel"){this._draftBox=null,this._draw();return}let{startX:e,startY:i}=this._draftBox,{canvasX:s,canvasY:r}=this._getCanvasCoordinates(t),a=Math.min(e,s),d=Math.min(i,r),h=Math.abs(s-e),o=Math.abs(r-i);if(this._draftBox=null,h<4||o<4){this._draw();return}let f=this._canvas.width||1,c=this._canvas.height||1,u=Math.min(Math.max(h/f,0),1),_=Math.min(Math.max(o/c,0),1),l=Math.min(Math.max((a+h/2)/f,0),1),g=Math.min(Math.max((d+o/2)/c,0),1),b={xPosition:l,yPosition:g,width:u,height:_,label:""};this._boxes=[...this._boxes,b],this._pendingNewBoxIndex=this._boxes.length-1,this._activeIndex=this._pendingNewBoxIndex,this._labelDraft="",this._draw()}_handleAddButtonClick(t){t.preventDefault(),t.stopPropagation(),this._isAddMode?this._exitAddMode():this._enterAddMode()}_enterAddMode(){this._isAddMode||(this._isAddMode=!0,this._draftBox=null,this._pendingNewBoxIndex=null,this._activePointerId=null,this._addButton&&this._addButton.setAttribute("aria-pressed","true"),this._setCanvasCursor("copy"),this._deactivateActiveBox({redraw:!1}),this._draw())}_exitAddMode(t={}){let{redraw:e=!0}=t;if(!this._isAddMode){e&&this._draw();return}if(this._canvas&&this._activePointerId!==null){try{this._canvas.releasePointerCapture(this._activePointerId)}catch{}this._canvas.removeEventListener("pointermove",this._handleAddPointerMove),this._canvas.removeEventListener("pointerup",this._handleAddPointerUp),this._canvas.removeEventListener("pointercancel",this._handleAddPointerUp),this._activePointerId=null}this._pendingNewBoxIndex!==null&&(this._boxes=this._boxes.filter((i,s)=>s!==this._pendingNewBoxIndex)),this._deactivateActiveBox({redraw:!1}),this._isAddMode=!1,this._draftBox=null,this._pendingNewBoxIndex=null,this._addButton&&this._addButton.setAttribute("aria-pressed","false"),this._setCanvasCursor("default"),this._activeLabelInput=null,e?this._draw():this._renderActiveOverlay()}_setCanvasCursor(t){let e=t==="copy"?"copy":"default";this._canvas&&(this._canvas.style.cursor=e),this._overlay&&(this._overlay.style.cursor="default")}_getCanvasCoordinates(t){if(!this._canvas)return{canvasX:0,canvasY:0,scaleX:1,scaleY:1};let e=this._canvas.getBoundingClientRect(),i=this._canvas.width/(e.width||1),s=this._canvas.height/(e.height||1);return{canvasX:(t.clientX-e.left)*i,canvasY:(t.clientY-e.top)*s,scaleX:i,scaleY:s}}_handleLabelInput(t){t?.target?.setCustomValidity&&t.target.setCustomValidity(""),this._labelDraft=t.target.value}_handleSaveClick(){if(typeof this._activeIndex!="number")return;let t=this._boxes[this._activeIndex];if(!t)return;let e=(this._labelDraft??"").trim();if(!e){if(this._activeLabelInput){this._activeLabelInput.setCustomValidity("Label is required"),typeof this._activeLabelInput.reportValidity=="function"&&this._activeLabelInput.reportValidity();try{this._activeLabelInput.focus({preventScroll:!0})}catch{typeof this._activeLabelInput.focus=="function"&&this._activeLabelInput.focus()}}return}let i=e;this._boxes[this._activeIndex]={...t,label:i},this._labelDraft=i,this._updateBoxesAttribute(),this._dispatchBoxesChanged(),this._pendingNewBoxIndex===this._activeIndex?(this._pendingNewBoxIndex=null,this._deactivateActiveBox({redraw:!1}),this._exitAddMode({redraw:!1}),this._draw()):this._deactivateActiveBox()}_handleCancelClick(){if(typeof this._activeIndex!="number"){this._deactivateActiveBox();return}if(this._pendingNewBoxIndex===this._activeIndex){this._boxes=this._boxes.filter((e,i)=>i!==this._activeIndex),this._pendingNewBoxIndex=null,this._deactivateActiveBox({redraw:!1}),this._exitAddMode({redraw:!1}),this._draw();return}this._deactivateActiveBox()}_handleDeleteClick(){if(typeof this._activeIndex!="number")return;let t=this._pendingNewBoxIndex===this._activeIndex;if(this._boxes=this._boxes.filter((e,i)=>i!==this._activeIndex),t){this._pendingNewBoxIndex=null,this._deactivateActiveBox({redraw:!1}),this._exitAddMode({redraw:!1}),this._draw();return}this._deactivateActiveBox({redraw:!1}),this._updateBoxesAttribute(),this._dispatchBoxesChanged(),this._draw()}_activateBox(t){if(t<0||t>=this._boxes.length)return;this._activeIndex=t;let e=this._boxes[t];this._labelDraft=typeof e.label=="string"?e.label:"",this._draw()}_deactivateActiveBox(t={redraw:!0}){this._activeIndex=null,this._labelDraft="",this._activeLabelInput=null,t.redraw!==!1&&this._draw()}_updateBoxesAttribute(){if(this.isConnected){this._isUpdatingBoxesAttribute=!0;try{this.setAttribute("boxes",JSON.stringify(this._boxes))}catch(t){console.warn("Unable to serialise boxes attribute.",t)}finally{this._isUpdatingBoxesAttribute=!1}}}_dispatchBoxesChanged(){this.dispatchEvent(new CustomEvent("boxeschange",{detail:{boxes:this._boxes.map(t=>({...t}))},bubbles:!0,composed:!0}))}_getDisplayScale(){let t=this._canvas.width||1,e=this._canvas.height||1,i=this._canvas.getBoundingClientRect(),s=i.width||this._canvas.clientWidth||t,r=i.height||this._canvas.clientHeight||e,a=s/t||1,d=r/e||1,h=Math.min(a,d)||1;return{canvasToCss:o=>!isFinite(h)||h===0?o:Math.max(o/h,1)}}};customElements.get("bounding-boxes")||customElements.define("bounding-boxes",N);export{N as BoundingBoxesElement};
