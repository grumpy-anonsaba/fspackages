class WT_G3x5_MapViewTrafficStatusLayer extends WT_MapViewLayer {
    constructor(operatingModeText, altitudeRestrictionModeText, motionVectorModeText, className = WT_G3x5_MapViewTrafficStatusLayer.CLASS_DEFAULT, configName = WT_G3x5_MapViewTrafficStatusLayer.CONFIG_NAME_DEFAULT) {
        super(className, configName);

        this._operatingModeText = operatingModeText;
        this._altitudeRestrictionText = altitudeRestrictionModeText;
        this._motionVectorModeText = motionVectorModeText;

        this._initChildren();
    }

    _createHTMLElement() {
        let container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = 0;
        container.style.top = 0;
        container.style.width = "100%";
        container.style.height = "100%";
        return container;
    }

    _initChildren() {
        let topInfos = document.createElement("div");
        topInfos.classList.add(WT_G3x5_MapViewTrafficStatusLayer.TOP_INFO_CLASS);

        this._operatingMode = new WT_G3x5_MapViewTrafficOperatingModeHTMLElement();
        this._operatingMode.setContext({text: this._operatingModeText});
        topInfos.appendChild(this._operatingMode);

        this._altitudeRestrictionMode = new WT_G3x5_MapViewTrafficAltitudeRestrictionModeHTMLElement();
        this._altitudeRestrictionMode.setContext({text: this._altitudeRestrictionText});
        topInfos.appendChild(this._altitudeRestrictionMode);

        this.htmlElement.appendChild(topInfos);

        this._motionVectorMode = new WT_G3x5_MapViewTrafficMotionVectorModeHTMLElement();
        this._motionVectorMode.setContext({text: this._motionVectorModeText});
        this.htmlElement.appendChild(this._motionVectorMode);
    }

    /**
     * @param {WT_MapViewState} state
     */
    onUpdate(state) {
        this._operatingMode.update(state);
        this._altitudeRestrictionMode.update(state);
        this._motionVectorMode.update(state);
    }
}
WT_G3x5_MapViewTrafficStatusLayer.CLASS_DEFAULT = "trafficStatusLayer";
WT_G3x5_MapViewTrafficStatusLayer.CONFIG_NAME_DEFAULT = "trafficStatus";
WT_G3x5_MapViewTrafficStatusLayer.TOP_INFO_CLASS = "trafficStatusTopInfo";

class WT_G3x5_MapViewTrafficOperatingModeHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._isInit = false;
    }

    _getTemplate() {
        return WT_G3x5_MapViewTrafficOperatingModeHTMLElement.TEMPLATE;
    }

    _defineChildren() {
        this._mode = new WT_CachedElement(this.shadowRoot.querySelector(`#mode`));
    }

    connectedCallback() {
        this._defineChildren();
        this._isInit = true;
    }

    setContext(context) {
        this._context = context;
    }

    /**
     * @param {WT_MapViewState} state
     */
    _updateDisplay(state) {
        this._mode.textContent = this._context.text[state.model.traffic.trafficSystem.operatingMode];
    }

    /**
     * @param {WT_MapViewState} state
     */
    update(state) {
        if (!this._isInit || !this._context) {
            return;
        }

        this._updateDisplay(state);
    }
}
WT_G3x5_MapViewTrafficOperatingModeHTMLElement.NAME = "wt-map-view-traffic-operatingmode";
WT_G3x5_MapViewTrafficOperatingModeHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_MapViewTrafficOperatingModeHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            position: relative;
            width: 100%;
            background-color: black;
            border: solid 1px white;
            border-radius: 3px;
            text-align: center;
            display: block;
        }

        #mode {
            margin: var(--traffic-operatingmode-margin, 0 0.1em);
            color: white;
        }
    </style>
    <div id="mode"></div>
`;

customElements.define(WT_G3x5_MapViewTrafficOperatingModeHTMLElement.NAME, WT_G3x5_MapViewTrafficOperatingModeHTMLElement);

class WT_G3x5_MapViewTrafficAltitudeRestrictionModeHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._isInit = false;
    }

    _getTemplate() {
        return WT_G3x5_MapViewTrafficAltitudeRestrictionModeHTMLElement.TEMPLATE;
    }

    _defineChildren() {
        this._mode = new WT_CachedElement(this.shadowRoot.querySelector(`#mode`));
    }

    connectedCallback() {
        this._defineChildren();
        this._isInit = true;
    }

    setContext(context) {
        this._context = context;
    }

    /**
     * @param {WT_MapViewState} state
     */
    _updateDisplay(state) {
        this._mode.textContent = this._context.text[state.model.traffic.altitudeRestrictionMode];
    }

    /**
     * @param {WT_MapViewState} state
     */
    update(state) {
        if (!this._isInit || !this._context) {
            return;
        }

        this._updateDisplay(state);
    }
}
WT_G3x5_MapViewTrafficAltitudeRestrictionModeHTMLElement.NAME = "wt-map-view-traffic-altituderestrictionmode";
WT_G3x5_MapViewTrafficAltitudeRestrictionModeHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_MapViewTrafficAltitudeRestrictionModeHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            position: relative;
            width: 100%;
            background-color: black;
            border: solid 1px white;
            border-radius: 3px;
            text-align: center;
            display: block;
        }

        #mode {
            margin: var(--traffic-altituderestriction-margin, 0 0.1em);
            color: white;
        }
    </style>
    <div id="mode"></div>
`;

customElements.define(WT_G3x5_MapViewTrafficAltitudeRestrictionModeHTMLElement.NAME, WT_G3x5_MapViewTrafficAltitudeRestrictionModeHTMLElement);

class WT_G3x5_MapViewTrafficMotionVectorModeHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._isInit = false;
    }

    _getTemplate() {
        return WT_G3x5_MapViewTrafficMotionVectorModeHTMLElement.TEMPLATE;
    }

    _defineChildren() {
        this._mode = new WT_CachedElement(this.shadowRoot.querySelector(`#mode`));
    }

    connectedCallback() {
        this._defineChildren();
        this._isInit = true;
    }

    setContext(context) {
        this._context = context;
    }

    /**
     * @param {WT_MapViewState} state
     */
    _updateDisplay(state) {
        this._mode.textContent = this._context.text[state.model.traffic.motionVectorMode];
    }

    /**
     * @param {WT_MapViewState} state
     */
    update(state) {
        if (!this._isInit || !this._context) {
            return;
        }

        this._updateDisplay(state);
    }
}
WT_G3x5_MapViewTrafficMotionVectorModeHTMLElement.NAME = "wt-map-view-traffic-motionvectormode";
WT_G3x5_MapViewTrafficMotionVectorModeHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_MapViewTrafficMotionVectorModeHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            background-color: black;
            border: solid 1px white;
            border-radius: 3px;
            text-align: center;
        }

        #text {
            margin: var(--traffic-motionvectormode-margin, 0 0.2em);
            color: white;
        }
            #mode {
                color: var(--wt-g3x5-lightblue);
            }
    </style>
    <div id="text">
        Motion: <span id="mode"></span>
    </div>
`;

customElements.define(WT_G3x5_MapViewTrafficMotionVectorModeHTMLElement.NAME, WT_G3x5_MapViewTrafficMotionVectorModeHTMLElement);