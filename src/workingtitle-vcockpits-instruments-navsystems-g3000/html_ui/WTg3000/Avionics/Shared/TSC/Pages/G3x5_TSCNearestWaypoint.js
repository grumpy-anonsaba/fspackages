/**
 * @template {WT_ICAOWaypoint} T
 */
class WT_G3x5_TSCNearestWaypoint extends WT_G3x5_TSCPageElement {
    constructor(homePageGroup, homePageName) {
        super(homePageGroup, homePageName);

        this._selectedWaypoint = null;
    }

    /**
     * @readonly
     * @type {WT_G3x5_TSCNearestWaypointHTMLElement<T>}
     */
    get htmlElement() {
        return this._htmlElement;
    }

    /**
     * @readonly
     * @type {T}
     */
    get selectedWaypoint() {
        return this._selectedWaypoint;
    }

    _createUnitsModel() {
        return new WT_G3x5_TSCNearestWaypointUnitsModel(this.instrument.unitsSettingModel);
    }

    _initHTMLElement() {
        this.htmlElement.addListener(this._onHTMLElementEvent.bind(this));
    }

    init(root) {
        this.container.title = this._getTitle();

        this._unitsModel = this._createUnitsModel();

        this._htmlElement = this._createHTMLElement();
        root.appendChild(this.htmlElement);
        this._initHTMLElement();
    }

    /**
     *
     * @param {T} waypoint
     */
    _setSelectedWaypoint(waypoint) {
        if ((waypoint === null && this.selectedWaypoint === null) || (waypoint && waypoint.equals(this.selectedWaypoint))) {
            return;
        }

        this._selectedWaypoint = waypoint;
    }

    /**
     *
     * @param {T} waypoint
     */
    _onWaypointButtonPressed(waypoint) {
        if (waypoint.equals(this.selectedWaypoint)) {
            this.htmlElement.toggleOptionsBanner();
        } else {
            this.htmlElement.showOptionsBanner();
        }
        this._setSelectedWaypoint(waypoint);
    }

    _onDRCTButtonPressed() {
        this.instrument.SwitchToPageName("MFD", "Direct To");
    }

    _onInfoButtonPressed() {
    }

    _onHTMLElementEvent(source, eventType, data) {
        switch (eventType) {
            case this._getWaypointButtonEventType():
                this._onWaypointButtonPressed(data);
                break;
            case this._getDRCTButtonEventType():
                this._onDRCTButtonPressed();
                break;
            case this._getInfoButtonEventType():
                this._onInfoButtonPressed();
                break;
        }
    }

    _onUpPressed() {
        this.htmlElement.scrollUp();
    }

    _onDownPressed() {
        this.htmlElement.scrollDown();
    }

    _activateNavButtons() {
        super._activateNavButtons();

        this.instrument.activateNavButton(5, "Up", this._onUpPressed.bind(this), false, "ICON_TSC_BUTTONBAR_UP.png");
        this.instrument.activateNavButton(6, "Down", this._onDownPressed.bind(this), false, "ICON_TSC_BUTTONBAR_DOWN.png");
    }

    _deactivateNavButtons() {
        super._deactivateNavButtons();

        this.instrument.deactivateNavButton(5, false);
        this.instrument.deactivateNavButton(6, false);
    }

    onEnter() {
        super.onEnter();

        this.htmlElement.open();
    }

    _updateWaypoints() {
        let waypoints = this._getWaypoints();
        this.htmlElement.setWaypoints(waypoints);

        if (this.selectedWaypoint !== null && !waypoints.some(waypoint => waypoint.equals(this.selectedWaypoint), this)) {
            this._setSelectedWaypoint(null);
        }
    }

    onUpdate(deltaTime) {
        this._updateWaypoints();
        this.htmlElement.update();
    }

    _updateDirectTo() {
        // TODO: Implement a more sane way to push data to direct to page.
        let waypoint = this.selectedWaypoint;
        this.instrument.lastRelevantICAO = waypoint ? waypoint.icao : null;
    }

    onExit() {
        super.onExit();

        this.htmlElement.close();
        this._updateDirectTo();
    }
}

class WT_G3x5_TSCNearestWaypointUnitsModel extends WT_G3x5_UnitsSettingModelAdapter {
    /**
     * @param {WT_G3x5_UnitsSettingModel} unitsSettingModel
     */
    constructor(unitsSettingModel) {
        super(unitsSettingModel);

        this._initListeners();
        this._initModel();
    }

    /**
     * @readonly
     * @type {WT_NavAngleUnit}
     */
    get bearingUnit() {
        return this._bearingUnit;
    }

    /**
     * @readonly
     * @type {WT_Unit}
     */
    get distanceUnit() {
        return this._distanceUnit;
    }

    /**
     * @readonly
     * @type {WT_Unit}
     */
    get lengthUnit() {
        return this._lengthUnit;
    }

    _updateBearing() {
        this._bearingUnit = this.unitsSettingModel.navAngleSetting.getNavAngleUnit();
    }

    _updateDistance() {
        if (this.unitsSettingModel.distanceSpeedSetting.getValue() === WT_G3x5_DistanceSpeedUnitsSetting.Value.NAUTICAL) {
            this._distanceUnit = WT_Unit.NMILE;
            this._lengthUnit = WT_Unit.FOOT;
        } else {
            this._distanceUnit = WT_Unit.KILOMETER;
            this._lengthUnit = WT_Unit.METER;
        }
    }
}

/**
 * @template {WT_ICAOWaypoint} T
 */
class WT_G3x5_TSCNearestWaypointHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        /**
         * @type {WT_G3x5_TSCNearestWaypointRowHTMLElement<T>[]}
         */
        this._rows = [];
        /**
         * @type {T[]}
         */
        this._waypoints = [];
        this._waypointRowListener = this._onWaypointRowEvent.bind(this);

        /**
         * @type {((source:WT_G3x5_TSCNearestWaypointHTMLElement<T>, eventType:Number, data:*) => void)[]}
         */
        this._listeners = [];

        /**
         * @type {{airplane:WT_PlayerAirplane, unitsModel:WT_G3x5_TSCNearestWaypointUnitsModel}}
         */
        this._context = null;
        this._isInit = false;
    }

    _getTemplate() {
        return WT_G3x5_TSCNearestWaypointHTMLElement.TEMPLATE;
    }

    async _defineChildren() {
        this._col1Title = this.shadowRoot.querySelector(`#col1title`);
        this._col2Title = this.shadowRoot.querySelector(`#col2title`);
        this._col3Title = this.shadowRoot.querySelector(`#col3title`);
        this._col4Title = this.shadowRoot.querySelector(`#col4title`);
        [
            this._waypointsList,
            this._optionsBanner,
            this._drctButton,
            this._showMapButton,
            this._infoButton
        ] = await Promise.all([
            WT_CustomElementSelector.select(this.shadowRoot, `#waypoints`, WT_TSCScrollList),
            WT_CustomElementSelector.select(this.shadowRoot, `#optionsbanner`, WT_TSCSlidingBanner),
            WT_CustomElementSelector.select(this.shadowRoot, `#directto`, WT_TSCImageButton),
            WT_CustomElementSelector.select(this.shadowRoot, `#map`, WT_TSCStatusBarButton),
            WT_CustomElementSelector.select(this.shadowRoot, `#info`, WT_TSCLabeledButton)
        ]);
    }

    _initWaypointRowRecycler() {
        /**
         * @type {WT_G3x5_TSCNearestWaypointRowRecycler<WT_G3x5_TSCNearestWaypointRowHTMLElement<T>>}
         */
        this._waypointRowRecycler = this._createWaypointRowRecycler();
    }

    _initHeader() {
        this._col1Title.innerHTML = this._getCol1TitleText();
        this._col2Title.innerHTML = this._getCol2TitleText();
        this._col3Title.innerHTML = this._getCol3TitleText();
        this._col4Title.innerHTML = this._getCol4TitleText();
    }

    _initOptions() {
        this._drctButton.addButtonListener(this._onDRCTButtonPressed.bind(this));
        this._showMapButton.addButtonListener(this._onShowMapButtonPressed.bind(this));
        this._infoButton.addButtonListener(this._onInfoButtonPressed.bind(this));
        this._infoButton.labelText = this._getOptionsInfoButtonLabelText();
    }

    async _connectedCallbackHelper() {
        await this._defineChildren();
        this._initWaypointRowRecycler();
        this._initHeader();
        this._initOptions();
        this._isInit = true;
    }

    connectedCallback() {
        this._connectedCallbackHelper();
    }

    setContext(context) {
        this._context = context;
    }

    /**
     *
     * @param {(source:WT_G3x5_TSCNearestWaypointHTMLElement<T>, eventType:Number, data:*) => void} listener
     */
    addListener(listener) {
        this._listeners.push(listener);
    }

    /**
     *
     * @param {(source:WT_G3x5_TSCNearestWaypointHTMLElement<T>, eventType:Number, data:*) => void} listener
     */
    removeListener(listener) {
        let index = this._listeners.indexOf(listener);
        if (index >= 0) {
            this._listeners.splice(index, 1);
        }
    }

    _fireEvent(eventType, data) {
        this._listeners.forEach(listener => listener(this, eventType, data));
    }

    _onDRCTButtonPressed(button) {
        this._fireEvent(this._getDRCTButtonEventType());
    }

    _onShowMapButtonPressed(button) {
        this._fireEvent(this._getShowMapButtonEventType());
    }

    _onInfoButtonPressed(button) {
        this._fireEvent(this._getInfoButtonEventType());
    }

    _onWaypointRowEvent(row, eventType) {
    }

    showOptionsBanner() {
        this._optionsBanner.slideIn(WT_TSCSlidingBanner.Direction.RIGHT);
    }

    hideOptionsBanner() {
        this._optionsBanner.slideOut(WT_TSCSlidingBanner.Direction.RIGHT);
    }

    toggleOptionsBanner() {
        if (this._optionsBanner.isVisible) {
            this.hideOptionsBanner();
        } else {
            this.showOptionsBanner();
        }
    }

    /**
     *
     * @param {WT_ReadOnlyArray<T>} waypoints
     */
    setWaypoints(waypoints) {
        if (waypoints.length === this._waypoints.length && waypoints.every((waypoint, index) => waypoint.equals(this._waypoints[index]))) {
            return;
        }

        for (let i = 0; i < this._rows.length; i++) {
            let row = this._rows[i];
            let index = waypoints.findIndex(waypoint => waypoint.equals(row.waypoint));
            if (index < 0) {
                this._waypointRowRecycler.recycle(row);
                this._rows.splice(i, 1);
                i--;
            }
        }

        for (let i = 0; i < waypoints.length; i++) {
            let waypoint = waypoints.get(i);
            let index = this._rows.findIndex(row => row.waypoint.equals(waypoint));
            let row;
            if (index >= 0) {
                row = this._rows[index];
            } else {
                row = this._waypointRowRecycler.request();
                row.setContext({
                    parentPage: this._context.parentPage,
                    airplane: this._context.airplane,
                    unitsModel: this._context.unitsModel
                });
                row.setWaypoint(waypoint);
                this._rows.push(row);
            }
            row.style.order = `${i}`;
        }

        this._waypoints = waypoints.slice();
    }

    open() {
    }

    _updateRows() {
        this._rows.forEach(row => row.update());
    }

    _doUpdate() {
        this._updateRows();
        this._waypointsList.scrollManager.update();
    }

    update() {
        if (!this._isInit || !this._context) {
            return;
        }

        this._doUpdate();
    }

    close() {
        this._optionsBanner.popOut();
    }

    scrollUp() {
        this._waypointsList.scrollManager.scrollUp();
    }

    scrollDown() {
        this._waypointsList.scrollManager.scrollDown();
    }
}
WT_G3x5_TSCNearestWaypointHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_TSCNearestWaypointHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
            border-radius: 5px;
            border: 3px solid var(--wt-g3x5-bordergray);
            background: linear-gradient(#1f3445, black 25px);
        }

        #wrapper {
            position: absolute;
            left: var(--nearestwaypoints-padding-left, 0.1em);
            top: var(--nearestwaypoints-padding-top, 0.1em);
            width: calc(100% - var(--nearestwaypoints-padding-left, 0.1em) - var(--nearestwaypoints-padding-right, 0.1em));
            height: calc(100% - var(--nearestwaypoints-padding-top, 0.1em) - var(--nearestwaypoints-padding-bottom, 0.1em));
        }
            #header {
                position: absolute;
                left: var(--nearestwaypoint-row-padding-left, 0.1em);
                top: 0%;
                width: calc(100% - var(--scrolllist-scrollbar-width, 1vw) - var(--nearestwaypoint-row-padding-left, 0.1em) - var(--nearestwaypoint-row-padding-right, 0.1em));
                height: var(--nearestwaypoints-header-height, calc(var(--nearestwaypoints-header-font-size, 0.75em) * 1.5));
                display: grid;
                grid-template-rows: 100%;
                grid-template-columns: var(--nearestwaypoints-col1-width, 1fr) var(--nearestwaypoints-col2-width, 1fr) var(--nearestwaypoints-col3-width, 1fr) var(--nearestwaypoints-col4-width, 1fr);
                grid-gap: 0 var(--nearestwaypoints-column-gap, 0.1em);
                align-items: center;
                font-size: var(--nearestwaypoints-header-font-size, 0.75em);
            }
                #col2title,
                #col3title,
                #col4title {
                    text-align: center;
                }
            #waypoints {
                position: absolute;
                left: 0%;
                top: var(--nearestwaypoints-header-height, calc(var(--nearestwaypoints-header-font-size, 0.75em) * 1.5));
                width: 100%;
                height: calc(100% - var(--nearestwaypoints-header-height, calc(var(--nearestwaypoints-header-font-size, 0.75em) * 1.5)));
                --scrolllist-padding-left: 0px;
                --scrolllist-padding-right: 0px;
                --scrolllist-padding-top: 0px;
                --scrolllist-padding-bottom: 0px;
                --scrolllist-align-items: stretch;
            }
                #waypoints wt-tsc-nearestairport-row {
                    height: var(--nearestwaypoints-row-height, 3em);
                    margin: var(--nearestwaypoints-row-margin, 0);
                }
            #optionsbanner {
                position: absolute;
                right: -1vw;
                top: 50%;
                width: calc(var(--nearestwaypoints-options-width, 25%) + 1vw + var(--nearestwaypoints-options-margin-right, 0px));
                height: var(--nearestwaypoints-options-height, 98%);
                transform: translateY(-50%);
                --slidingbanner-padding-right: calc(1vw + var(--nearestwaypoints-options-margin-right, 0px));
            }
                #optionscontainer {
                    width: 100%;
                    height: 100%;
                    border-radius: 5px;
                    border: 3px solid var(--wt-g3x5-bordergray);
                    background: black;
                    font-size: var(--nearestwaypoints-options-font-size, 0.85em);
                    display: flex;
                    flex-flow: column nowrap;
                    align-items: stretch;
                }
                    .optionsButton {
                        height: var(--nearestwaypoints-options-button-height, 4em);
                        margin: var(--nearestwaypoints-options-button-margin, 0.25em 0.25em);
                    }
                    #directto {
                        --button-img-image-height: 100%;
                    }
    </style>
    <div id="wrapper">
        <div id="header">
            <div id="col1title"></div>
            <div id="col2title"></div>
            <div id="col3title"></div>
            <div id="col4title"></div>
        </div>
        <wt-tsc-scrolllist id="waypoints"></wt-tsc-scrolllist>
        <wt-tsc-slidingbanner id="optionsbanner">
            <div slot="content" id="optionscontainer">
                <wt-tsc-button-img id="directto" class="optionsButton" imgsrc="/WTg3000/SDK/Assets/Images/Garmin/TSC/ICON_MAP_DIRECT_TO_1.png"></wt-tsc-button-img>
                <wt-tsc-button-statusbar id="map" class="optionsButton" labeltext="Show On Map"></wt-tsc-button-statusbar>
                <wt-tsc-button-label id="info" class="optionsButton"></wt-tsc-button-label>
            </div>
        </wt-tsc-slidingbanner>
    </div>
`;

/**
 * @template T
 * @extends WT_CustomHTMLElementRecycler<T>
 */
class WT_G3x5_TSCNearestWaypointRowRecycler extends WT_CustomHTMLElementRecycler {
    /**
     *
     * @param {HTMLElement} parent
     * @param {new T} htmlElementConstructor
     * @param {(source:T, eventType:Number) => void} listener
     */
    constructor(parent, htmlElementConstructor, listener) {
        super(parent, htmlElementConstructor);

        this._listener = listener;
    }

    _createElement() {
        let element = super._createElement();
        element.addListener(this._listener);
        element.slot = "content";
        return element;
    }
}

/**
 * @template {WT_ICAOWaypoint} T
 */
class WT_G3x5_TSCNearestWaypointRowHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        /**
         * @type {((source:WT_G3x5_TSCNearestWaypointRowHTMLElement<T>, eventType:Number) => void)[]}
         */
        this._listeners = [];

        /**
         * @type {{parentPage:WT_G3x5_TSCNearestWaypoint<T>, airplane:WT_PlayerAirplane, unitsModel:WT_G3x5_TSCNearestWaypointUnitsModel}}
         */
        this._context = null;
        /**
         * @type {T}
         */
        this._waypoint = null;
        this._isHighlighted = false;
        this._isInit = false;

        this._initFormatters();

        this._tempGARad = new WT_NumberUnit(0, WT_Unit.GA_RADIAN);
        this._tempTrueBearing = new WT_NavAngleUnit(false).createNumber(0);
        this._tempGeoPoint = new WT_GeoPoint(0, 0);
    }

    _initDistanceFormatter() {
        let formatterOpts = {
            precision: 0.1,
            forceDecimalZeroes: true,
            maxDigits: 3,
            unitCaps: true
        };
        let htmlFormatterOpts = {
            numberUnitDelim: "",
            classGetter: {
                getNumberClassList() {
                    return [];
                },
                getUnitClassList() {
                    return [WT_G3x5_TSCNearestWaypointRowHTMLElement.UNIT_CLASS];
                }
            }
        };
        this._distanceFormatter = new WT_NumberHTMLFormatter(new WT_NumberFormatter(formatterOpts), htmlFormatterOpts);
    }

    _initBearingFormatter() {
        this._bearingFormatter = new WT_NumberFormatter({
            precision: 1,
            unitSpaceBefore: false
        });
    }

    _initFormatters() {
        this._initDistanceFormatter();
        this._initBearingFormatter();
    }

    /**
     * @readonly
     * @type {T}
     */
    get waypoint() {
        return this._waypoint;
    }

    async _defineChildren() {
        [
            this._waypointButton,
            this._bearingArrow
        ] = await Promise.all([
            WT_CustomElementSelector.select(this.shadowRoot, this._getWaypointButtonQuery(), WT_G3x5_TSCWaypointButton),
            WT_CustomElementSelector.select(this.shadowRoot, this._getBearingArrowQuery(), WT_TSCBearingArrow)
        ]);

        this._bearingText = new WT_CachedElement(this.shadowRoot.querySelector(this._getBearingTextQuery()));
        this._distanceText = new WT_CachedElement(this.shadowRoot.querySelector(this._getDistanceTextQuery()));
    }

    _initWaypointButton() {
        this._waypointButton.setIconSrcFactory(new WT_G3x5_TSCWaypointButtonIconSrcFactory(WT_G3x5_TSCNearestWaypointRowHTMLElement.WAYPOINT_ICON_PATH));
        this._waypointButton.addButtonListener(this._onWaypointButtonPressed.bind(this));
    }

    _initChildren() {
        this._initWaypointButton();
    }

    async _connectedCallbackHelper() {
        await this._defineChildren();
        this._initChildren();
        this._isInit = true;
        this._updateFromWaypoint();
    }

    connectedCallback() {
        this._connectedCallbackHelper();
    }

    setContext(context) {
        this._context = context;
    }

    _updateWaypointButton() {
        this._waypointButton.setWaypoint(this._waypoint);
    }

    _updateFromWaypoint() {
        this._updateWaypointButton();
    }

    /**
     *
     * @param {WT_ICAOWaypoint} waypoint
     */
    setWaypoint(waypoint) {
        this._waypoint = waypoint;
        if (this._isInit) {
            this._updateFromWaypoint();
        }
    }

    /**
     *
     * @param {(source:WT_G3x5_TSCNearestWaypointRowHTMLElement<T>, eventType:Number) => void} listener
     */
    addListener(listener) {
        this._listeners.push(listener);
    }

    /**
     *
     * @param {(source:WT_G3x5_TSCNearestWaypointRowHTMLElement<T>, eventType:Number) => void} listener
     */
    removeListener(listener) {
        let index = this._listeners.indexOf(listener);
        if (index >= 0) {
            this._listeners.splice(index, 1);
        }
    }

    _fireEvent(eventType) {
        this._listeners.forEach(listener => listener(this, eventType));
    }

    _onWaypointButtonPressed(button) {
        this._fireEvent(this._getWaypointButtonEvent());
    }

    _updateHighlight() {
        let shouldHighlight = this.waypoint.equals(this._context.parentPage.selectedWaypoint);
        if (shouldHighlight !== this._isHighlighted) {
            this._waypointButton.highlight = `${shouldHighlight}`;
            this._isHighlighted = shouldHighlight;
        }
    }

    _clearBearingInfo() {
        this._bearingArrow.setBearing(0);
        this._bearingText.textContent = "";
    }

    _updateBearing(planePosition) {
        if (!this.waypoint) {
            this._clearBearingInfo();
        }

        let bearing = this._tempTrueBearing.set(planePosition.bearingTo(this.waypoint.location));
        bearing.unit.setLocation(planePosition);

        let heading = this._context.airplane.navigation.headingTrue();
        this._bearingArrow.setBearing(bearing.number - heading);

        let unit = this._context.unitsModel.bearingUnit;
        this._bearingText.textContent = this._bearingFormatter.getFormattedString(bearing, unit);
    }

    _clearDistanceInfo() {
        this._distanceText.innerHTML = "";
    }

    _updateDistance(planePosition) {
        if (!this.waypoint) {
            this._clearDistanceInfo();
        }

        let distance = this._tempGARad.set(this.waypoint.location.distance(planePosition));
        let unit = this._context.unitsModel.distanceUnit;
        this._distanceText.innerHTML = this._distanceFormatter.getFormattedHTML(distance, unit);
    }

    _doUpdate() {
        let planePosition = this._context.airplane.navigation.position(this._tempGeoPoint);
        this._updateHighlight();
        this._updateBearing(planePosition);
        this._updateDistance(planePosition);
    }

    update() {
        if (!this._isInit || !this._context) {
            return;
        }

        this._doUpdate();
    }
}
WT_G3x5_TSCNearestWaypointRowHTMLElement.WAYPOINT_ICON_PATH = "/WTg3000/SDK/Assets/Images/Garmin/TSC/Waypoints";
WT_G3x5_TSCNearestWaypointRowHTMLElement.UNIT_CLASS = "unit";

// NEAREST AIRPORT

/**
 * @extends WT_G3x5_TSCNearestWaypoint<WT_Airport>
 */
class WT_G3x5_TSCNearestAirport extends WT_G3x5_TSCNearestWaypoint {
    _getTitle() {
        return "Nearest Airport";
    }

    _createHTMLElement() {
        let htmlElement = new WT_G3x5_TSCNearestAirportHTMLElement();
        htmlElement.setContext({
            parentPage: this,
            airplane: this.instrument.airplane,
            unitsModel: this._unitsModel
        });
        return htmlElement;
    }

    _getWaypoints() {
        return this.instrument.nearestAirportList.airports;
    }

    _getWaypointButtonEventType() {
        return WT_G3x5_TSCNearestAirportHTMLElement.EventType.WAYPOINT_BUTTON_PRESSED;
    }

    _getDRCTButtonEventType() {
        return WT_G3x5_TSCNearestAirportHTMLElement.EventType.DRCT_BUTTON_PRESSED;
    }

    _getInfoButtonEventType() {
        return WT_G3x5_TSCNearestAirportHTMLElement.EventType.INFO_BUTTON_PRESSED;
    }

    _onInfoButtonPressed() {
        let airportInfoPage = this.instrument.getSelectedMFDPanePages().airportInfo;
        airportInfoPage.element.icaoSetting.setValue(this.selectedWaypoint.icao);
        this.instrument.SwitchToPageName("MFD", airportInfoPage.name);
    }
}

/**
 * @extends WT_G3x5_TSCNearestWaypointHTMLElement<WT_Airport>
 */
 class WT_G3x5_TSCNearestAirportHTMLElement extends WT_G3x5_TSCNearestWaypointHTMLElement {
    _createWaypointRowRecycler() {
        return new WT_G3x5_TSCNearestWaypointRowRecycler(this._waypointsList, WT_G3x5_TSCNearestAirportRowHTMLElement, this._waypointRowListener);
    }

    _getCol1TitleText() {
        return "Airport";
    }

    _getCol2TitleText() {
        return "BRG";
    }

    _getCol3TitleText() {
        return "DIS";
    }

    _getCol4TitleText() {
        return "APPR/RWY";
    }

    _getOptionsInfoButtonLabelText() {
        return "Airport Info";
    }

    _getWaypointButtonEventType() {
        return WT_G3x5_TSCNearestAirportHTMLElement.EventType.WAYPOINT_BUTTON_PRESSED;
    }

    _getDRCTButtonEventType() {
        return WT_G3x5_TSCNearestAirportHTMLElement.EventType.DRCT_BUTTON_PRESSED;
    }

    _getShowMapButtonEventType() {
        return WT_G3x5_TSCNearestAirportHTMLElement.EventType.MAP_BUTTON_PRESSED;
    }

    _getInfoButtonEventType() {
        return WT_G3x5_TSCNearestAirportHTMLElement.EventType.INFO_BUTTON_PRESSED;
    }

    /**
     *
     * @param {WT_G3x5_TSCNearestAirportRowHTMLElement} row
     */
    _onWaypointButtonPressed(row) {
        this._fireEvent(this._getWaypointButtonEventType(), row.waypoint);
    }

    _onWaypointRowEvent(row, eventType) {
        if (eventType === WT_G3x5_TSCNearestAirportRowHTMLElement.EventType.WAYPOINT_BUTTON_PRESSED) {
            this._onWaypointButtonPressed(row);
        }
    }
}
/**
 * @enum {Number}
 */
WT_G3x5_TSCNearestAirportHTMLElement.EventType = {
    WAYPOINT_BUTTON_PRESSED: 0,
    DRCT_BUTTON_PRESSED: 1,
    MAP_BUTTON_PRESSED: 2,
    INFO_BUTTON_PRESSED: 3
};
WT_G3x5_TSCNearestAirportHTMLElement.NAME = "wt-tsc-nearestairport";

customElements.define(WT_G3x5_TSCNearestAirportHTMLElement.NAME, WT_G3x5_TSCNearestAirportHTMLElement);

/**
 * @extends WT_G3x5_TSCNearestWaypointRowHTMLElement<WT_Airport>
 */
class WT_G3x5_TSCNearestAirportRowHTMLElement extends WT_G3x5_TSCNearestWaypointRowHTMLElement {
    constructor() {
        super();

        this._lastLengthUnit = null;
    }

    _initLengthFormatter() {
        let formatterOpts = {
            precision: 1,
            unitCaps: true
        };
        let htmlFormatterOpts = {
            numberUnitDelim: "",
            classGetter: {
                getNumberClassList() {
                    return [];
                },
                getUnitClassList() {
                    return [WT_G3x5_TSCNearestWaypointRowHTMLElement.UNIT_CLASS];
                }
            }
        };
        this._lengthFormatter = new WT_NumberHTMLFormatter(new WT_NumberFormatter(formatterOpts), htmlFormatterOpts);
    }

    _initFormatters() {
        super._initFormatters();

        this._initLengthFormatter();
    }

    _getTemplate() {
        return WT_G3x5_TSCNearestAirportRowHTMLElement.TEMPLATE;
    }

    _getWaypointButtonQuery() {
        return `#waypointbutton`;
    }

    _getBearingArrowQuery() {
        return `#bearingarrow`;
    }

    _getBearingTextQuery() {
        return `#bearingtext`;
    }

    _getDistanceTextQuery() {
        return `#distancetext`;
    }

    async _defineChildren() {
        await super._defineChildren();

        this._approachText = this.shadowRoot.querySelector(`#app`);
        this._runwayText = this.shadowRoot.querySelector(`#rwy`);
    }

    _clearApproachInfo() {
        this._approachText.textContent = "";
    }

    /**
     *
     * @param {WT_Runway} runway
     * @returns {WT_Approach.Type}
     */
    _calculateBestApproachType(runway) {
        return runway.approaches.reduce((prev, curr) => {
            switch (prev) {
                case WT_Approach.Type.UNKNOWN:
                    return curr.type;
                case WT_Approach.Type.RNAV:
                    if (curr.type === WT_Approach.Type.ILS_LOC) {
                        return curr.type;
                    }
                case WT_Approach.Type.ILS_LOC:
                default:
                    return prev;
            }
        }, WT_Approach.Type.UNKNOWN);
    }

    _updateApproach() {
        if (!this.waypoint) {
            this._clearApproachInfo();
        }

        let longest = this.waypoint.runways.longest();
        let text = "";
        if (longest) {
            let approachType = this._calculateBestApproachType(longest);
            text = WT_G3x5_TSCNearestAirportRowHTMLElement.APPROACH_TEXT[approachType];
        }
        this._approachText.textContent = text;
    }

    _clearRunwayInfo() {
        this._runwayText.textContent = "";
    }

    _updateRunway() {
        if (!this.waypoint) {
            this._clearRunwayInfo();
        }

        let longest = this.waypoint.runways.longest();
        let length = longest ? longest.length : WT_G3x5_TSCNearestAirportRowHTMLElement.ZERO_LENGTH;
        let unit = this._context.unitsModel.lengthUnit;
        this._runwayText.innerHTML = this._lengthFormatter.getFormattedHTML(length, unit);
        this._lastLengthUnit = unit;
    }

    _updateFromWaypoint() {
        super._updateFromWaypoint();

        this._updateApproach();
        this._updateRunway();
    }

    _getWaypointButtonEvent() {
        return WT_G3x5_TSCNearestAirportRowHTMLElement.EventType.WAYPOINT_BUTTON_PRESSED;
    }

    _updateLengthUnit() {
        let unit = this._context.unitsModel.lengthUnit;
        if (!unit.equals(this._lastLengthUnit)) {
            this._updateRunway();
        }
    }

    _doUpdate() {
        super._doUpdate();

        this._updateLengthUnit();
    }
}
/**
 * @enum {Number}
 */
WT_G3x5_TSCNearestAirportRowHTMLElement.EventType = {
    WAYPOINT_BUTTON_PRESSED: 0
};
WT_G3x5_TSCNearestAirportRowHTMLElement.ZERO_LENGTH = WT_Unit.FOOT.createNumber(0);
WT_G3x5_TSCNearestAirportRowHTMLElement.APPROACH_TEXT = [
    "",
    "ILS",
    "RNA"
];
WT_G3x5_TSCNearestAirportRowHTMLElement.NAME = "wt-tsc-nearestairport-row";
WT_G3x5_TSCNearestAirportRowHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_TSCNearestAirportRowHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
            position: relative;
            border-radius: 5px;
            border: 1px solid var(--wt-g3x5-bordergray);
            background: black;
        }

        #wrapper {
            position: absolute;
            left: var(--nearestwaypoint-row-padding-left, 0.1em);
            top: var(--nearestwaypoint-row-padding-top, 0.1em);
            width: calc(100% - var(--nearestwaypoint-row-padding-left, 0.1em) - var(--nearestwaypoint-row-padding-right, 0.1em));
            height: calc(100% - var(--nearestwaypoint-row-padding-top, 0.1em) - var(--nearestwaypoint-row-padding-bottom, 0.1em));
            display: grid;
            grid-template-rows: 100%;
            grid-template-columns: var(--nearestwaypoints-col1-width, 1fr) var(--nearestwaypoints-col2-width, 1fr) var(--nearestwaypoints-col3-width, 1fr) var(--nearestwaypoints-col4-width, 1fr);
            grid-gap: 0 var(--nearestwaypoints-column-gap, 0.1em);
            color: white;
        }
            #waypointbutton {
                font-size: var(--nearestwaypoint-row-button-font-size, 0.75em);
                --waypoint-ident-color: white;
            }
            #bearing {
                position: relative;
            }
                #bearingarrow {
                    position: absolute;
                    left: 50%;
                    top: 0%;
                    height: 50%;
                    transform: translateX(-50%);
                }
                #bearingtext {
                    position: absolute;
                    left: 0%;
                    top: 75%;
                    width: 100%;
                    transform: translateY(-50%);
                    text-align: center;
                }
            #distance {
                position: relative;
            }
                #distancetext {
                    position: absolute;
                    left: 0%;
                    top: 50%;
                    width: 100%;
                    transform: translateY(-50%);
                    text-align: center;
                }
            #apprwy {
                position: relative;
                text-align: center;
            }
                #app {
                    position: absolute;
                    left: 0%;
                    bottom: 50%;
                    width: 100%;
                }
                #rwy {
                    position: absolute;
                    left: 0%;
                    top: 50%;
                    width: 100%;
                }

        .${WT_G3x5_TSCNearestWaypointRowHTMLElement.UNIT_CLASS} {
            font-size: var(--nearestwaypoint-row-unit-font-size, 0.75em);
        }
    </style>
    <div id="wrapper">
        <wt-tsc-button-waypoint id="waypointbutton"></wt-tsc-button-waypoint>
        <div id="bearing">
            <wt-tsc-bearingarrow id="bearingarrow"></wt-tsc-bearingarrow>
            <div id="bearingtext"></div>
        </div>
        <div id="distance">
            <div id="distancetext"></div>
        </div>
        <div id="apprwy">
            <div id="app"></div>
            <div id="rwy"></div>
        </div>
    </div>
`;

customElements.define(WT_G3x5_TSCNearestAirportRowHTMLElement.NAME, WT_G3x5_TSCNearestAirportRowHTMLElement);