class WT_G3x5_TSCProcedures extends WT_G3x5_TSCPageElement {
    /**
     * @param {String} homePageGroup
     * @param {String} homePageName
     */
    constructor(homePageGroup, homePageName) {
        super(homePageGroup, homePageName);
    }

    /**
     * @readonly
     * @type {WT_G3x5_TSCProceduresHTMLElement}
     */
    get htmlElement() {
        return this._htmlElement;
    }

    _createHTMLElement() {
        return new WT_G3x5_TSCProceduresHTMLElement();
    }

    _initButtonListeners() {
        this.htmlElement.departureButton.addButtonListener(this._onDepartureButtonPressed.bind(this));
        this.htmlElement.arrivalButton.addButtonListener(this._onArrivalButtonPressed.bind(this));
        this.htmlElement.approachButton.addButtonListener(this._onApproachButtonPressed.bind(this));
    }

    async _initHTMLElement() {
        this.htmlElement.setFlightPlan(this._fpm.activePlan);
        await WT_Wait.awaitCallback(() => this.htmlElement.isInitialized, this);
        this._initButtonListeners();
    }

    init(root) {
        this._fpm = this.instrument.flightPlanManagerWT;

        this.container.title = WT_G3x5_TSCProcedures.TITLE;
        this._htmlElement = this._createHTMLElement();
        root.appendChild(this.htmlElement);
        this._initHTMLElement();
    }

    _onDepartureButtonPressed(button) {
        this.instrument.SwitchToPageName("MFD", "Departure Selection WT");
    }

    _onArrivalButtonPressed(button) {
        this.instrument.SwitchToPageName("MFD", "Arrival Selection WT");
    }

    _onApproachButtonPressed(button) {
        this.instrument.SwitchToPageName("MFD", "Approach Selection WT");
    }

    onUpdate(deltaTime) {
        let activeLeg = this._fpm.getActiveLeg(true);
        let isApproachActive = activeLeg && activeLeg.segment === WT_FlightPlan.Segment.APPROACH;
        this.htmlElement.update(isApproachActive);
    }
}
WT_G3x5_TSCProcedures.TITLE = "Procedures";

class WT_G3x5_TSCProceduresHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._flightPlanListener = this._onFlightPlanEvent.bind(this);

        /**
         * @type {WT_FlightPlan}
         */
        this._flightPlan = null;
        this._isApproachActive = false;
        this._isInit = false;
    }

    _getTemplate() {
        return WT_G3x5_TSCProceduresHTMLElement.TEMPLATE;
    }

    /**
     * @readonly
     * @type {Boolean}
     */
    get isInitialized() {
        return this._isInit;
    }

    /**
     * @readonly
     * @type {WT_TSCValueButton}
     */
    get departureButton() {
        return this._departureButton;
    }

    /**
     * @readonly
     * @type {WT_TSCValueButton}
     */
    get arrivalButton() {
        return this._arrivalButton;
    }

    /**
     * @readonly
     * @type {WT_TSCValueButton}
     */
    get approachButton() {
        return this._approachButton;
    }

    async _defineChildren() {
        [
            this._departureButton,
            this._arrivalButton,
            this._approachButton,
            this._activateApproachButton
        ] = await Promise.all([
            WT_CustomElementSelector.select(this.shadowRoot, `#departure`, WT_TSCValueButton),
            WT_CustomElementSelector.select(this.shadowRoot, `#arrival`, WT_TSCValueButton),
            WT_CustomElementSelector.select(this.shadowRoot, `#approach`, WT_TSCValueButton),
            WT_CustomElementSelector.select(this.shadowRoot, `#activateapproach`, WT_TSCLabeledButton),
        ]);
    }

    async _connectedCallbackHelper() {
        await this._defineChildren();
        this._isInit = true;
        this._updateFromFlightPlan();
    }

    connectedCallback() {
        this._connectedCallbackHelper();
    }

    _cleanUpFlightPlan() {
        if (!this._flightPlan) {
            return;
        }

        this._flightPlan.removeListener(this._flightPlanListener);
    }

    _updateFromFlightPlan() {
        if (!this._flightPlan) {
            return;
        }

        this._flightPlan.addListener(this._flightPlanListener);
        if (this._flightPlan) {
            this._updateDepartureButton();
            this._updateArrivalButton();
            this._updateApproachButton();
            this._updateActivateApproachButton();
        }
    }

    setFlightPlan(flightPlan) {
        if (this._flightPlan === flightPlan) {
            return;
        }

        this._cleanUpFlightPlan();
        this._flightPlan = flightPlan;
        if (this._isInit) {
            this._updateFromFlightPlan();
        }
    }

    _getDepartureDisplayText() {
        if (this._flightPlan.hasDeparture()) {
            let departure = this._flightPlan.getDeparture();
            let departureProcedure = departure.procedure;
            let rwyTransition = departureProcedure.runwayTransitions.getByIndex(departure.runwayTransitionIndex);
            let enrouteTransition = departureProcedure.enrouteTransitions.getByIndex(departure.enrouteTransitionIndex);
            let prefix = `${rwyTransition ? `RW${rwyTransition.runway.designationFull}` : "ALL"}.`;
            let suffix = (enrouteTransition && departure.legs.length > 0) ? `.${departure.legs.last().fix.ident}` : "";
            return `${departureProcedure.airport.ident}–${prefix}${departureProcedure.name}${suffix}`;
        } else {
            return "____";
        }
    }

    _getArrivalDisplayText() {
        if (this._flightPlan.hasArrival()) {
            let arrival = this._flightPlan.getArrival();
            let arrivalProcedure = arrival.procedure;
            let enrouteTransition = arrivalProcedure.enrouteTransitions.getByIndex(arrival.enrouteTransitionIndex);
            let rwyTransition = arrivalProcedure.runwayTransitions.getByIndex(arrival.runwayTransitionIndex);
            let prefix = (enrouteTransition && arrival.legs.length > 0) ? `${arrival.legs.first().fix.ident}.` : "";
            let suffix = `.${rwyTransition ? `RW${rwyTransition.runway.designationFull}` : "ALL"}`;
            return `${arrivalProcedure.airport.ident}–${prefix}${arrivalProcedure.name}${suffix}`;
        } else {
            return "____";
        }
    }

    _getApproachDisplayText() {
        if (this._flightPlan.hasApproach()) {
            let approach = this._flightPlan.getApproach();
            let approachProcedure = approach.procedure;
            return `${approachProcedure.airport.ident}–${approachProcedure.name}`;
        } else {
            return "____";
        }
    }

    _updateDepartureButton() {
        this._departureButton.enabled = this._flightPlan.isOriginAirport();
        this._departureButton.valueText = this._getDepartureDisplayText();
    }

    _updateArrivalButton() {
        this._arrivalButton.enabled = this._flightPlan.isDestinationAirport();
        this._arrivalButton.valueText = this._getArrivalDisplayText();
    }

    _updateApproachButton() {
        this._approachButton.enabled = this._flightPlan.isDestinationAirport();
        this._approachButton.valueText = this._getApproachDisplayText();
    }

    _updateActivateApproachButton() {
        this._activateApproachButton.enabled = this._flightPlan.hasApproach() && !this._isApproachActive;
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     */
    _onFlightPlanEvent(event) {
        if (event.anyType(WT_FlightPlanEvent.Type.ORIGIN_CHANGED | WT_FlightPlanEvent.Type.DEPARTURE_CHANGED)) {
            this._updateDepartureButton();
        }
        if (event.anyType(WT_FlightPlanEvent.Type.ARRIVAL_CHANGED | WT_FlightPlanEvent.Type.DESTINATION_CHANGED)) {
            this._updateArrivalButton();
        }
        if (event.anyType(WT_FlightPlanEvent.Type.APPROACH_CHANGED | WT_FlightPlanEvent.Type.DESTINATION_CHANGED)) {
            this._updateApproachButton();
            this._updateActivateApproachButton();
        }
    }

    _updateApproachActive(isApproachActive) {
        if (this._isApproachActive === isApproachActive) {
            return;
        }

        this._isApproachActive = isApproachActive;
        this._updateActivateApproachButton();
    }

    _doUpdate(isApproachActive) {
        this._updateApproachActive(isApproachActive);
    }

    update(isApproachActive) {
        if (!this._isInit) {
            return;
        }

        this._doUpdate(isApproachActive);
    }
}
WT_G3x5_TSCProceduresHTMLElement.NAME = "wt-tsc-procedures";
WT_G3x5_TSCProceduresHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_TSCProceduresHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
        }

        #wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-rows: repeat(4, 1fr);
            grid-template-columns: 100%;
            grid-gap: var(--procedures-grid-row-gap, 0.5em) 0;
            justify-items: center;
        }
            .procedureButton {
                width: var(--procedures-procedurebutton-width, 90%);
                --button-value-font-size: var(--procedures-procedurebutton-value-font-size, 1.25em);
            }
            #bottom {
                width: 100%;
                display: grid;
                grid-template-rows: 100%;
                grid-template-columns: repeat(3, 1fr);
                grid-gap: 0 var(--procedures-bottom-grid-column-gap, 1em);
            }
    </style>
    <div id="wrapper">
        <wt-tsc-button-value id="departure" class="procedureButton" labeltext="Departure"></wt-tsc-button-value>
        <wt-tsc-button-value id="arrival" class="procedureButton" labeltext="Arrival"></wt-tsc-button-value>
        <wt-tsc-button-value id="approach" class="procedureButton" labeltext="Approach"></wt-tsc-button-value>
        <div id="bottom">
            <wt-tsc-button-label id="activateapproach" labeltext="Activate Approach" enabled="false"></wt-tsc-button-label>
            <wt-tsc-button-label id="activatevectors" labeltext="Activate Vectors To Final" enabled="false"></wt-tsc-button-label>
            <wt-tsc-button-label id="activatemissed" labeltext="Activate Missed Approach" enabled="false"></wt-tsc-button-label>
        </div>
    </div>
`;

customElements.define(WT_G3x5_TSCProceduresHTMLElement.NAME, WT_G3x5_TSCProceduresHTMLElement);

/**
 * @template {WT_Procedure} T
 */
class WT_G3x5_TSCProcedureSelection extends WT_G3x5_TSCPageElement {
    /**
     * @param {String} homePageGroup
     * @param {String} homePageName
     */
    constructor(homePageGroup, homePageName, instrumentID) {
        super(homePageGroup, homePageName);

        this._instrumentID = instrumentID;

        this._initState();
        this._initSettingModel();
    }

    _initState() {
        this._state = {
            _airplaneHeadingTrue: 0,

            get airplaneHeadingTrue() {
                return this._airplaneHeadingTrue;
            },
        };
    }

    _initSettings() {
    }

    _initSettingModel() {
        this._settingModel = new WT_DataStoreSettingModel(this._instrumentID);
        this._initSettings();
        this._settingModel.init();
    }

    /**
     * @readonly
     * @type {WT_G3x5_TSCProcedureSelectionHTMLElement<T>}
     */
    get htmlElement() {
        return this._htmlElement;
    }

    _initHTMLElement() {
        this.htmlElement.setParentPage(this);
        this.htmlElement.setFlightPlan(this._fpm.activePlan);
    }

    _initListener() {
        this.htmlElement.addListener(this._onHTMLElementEvent.bind(this));
    }

    init(root) {
        this._fpm = this.instrument.flightPlanManagerWT;

        this.container.title = this._getTitle();
        this._htmlElement = this._createHTMLElement();
        root.appendChild(this.htmlElement);
        this._initHTMLElement();
        this._initListener();
    }

    /**
     *
     * @param {String} icao
     */
    async _selectAirportICAO(icao) {
    }

    _removeProcedure() {
    }

    /**
     *
     * @param {WT_G3x5_TSCProcedureSelectionEvent} event
     */
    _loadProcedure(event) {
    }

    /**
     *
     * @param {WT_G3x5_TSCProcedureSelectionEvent} event
     */
    _onHTMLElementEvent(event) {
        switch (event.type) {
            case WT_G3x5_TSCProcedureSelectionHTMLElement.EventType.AIRPORT_SELECTED:
                this._selectAirportICAO(event.airportICAO);
                break;
            case WT_G3x5_TSCProcedureSelectionHTMLElement.EventType.PROCEDURE_REMOVED:
                this._removeProcedure();
                break;
            case WT_G3x5_TSCProcedureSelectionHTMLElement.EventType.PROCEDURE_LOADED:
                this._loadProcedure(event);
                break;
        }
    }

    _activateNavButtons() {
        super._activateNavButtons();

        this.instrument.activateNavButton(5, "Up", this._onUpPressed.bind(this), true, "ICON_TSC_BUTTONBAR_UP.png");
        this.instrument.activateNavButton(6, "Down", this._onDownPressed.bind(this), true, "ICON_TSC_BUTTONBAR_DOWN.png");
    }

    _deactivateNavButtons() {
        super._deactivateNavButtons();

        this.instrument.deactivateNavButton(5);
        this.instrument.deactivateNavButton(6);
    }

    onEnter() {
        super.onEnter();

        this.htmlElement.open();
    }

    _updateState() {
        this._state._airplaneHeadingTrue = this.instrument.airplane.navigation.headingTrue();
    }

    onUpdate(deltaTime) {
        this._updateState();
        this.htmlElement.update(this._state);
    }

    onExit() {
        super.onEnter();

        this.htmlElement.close();
    }

    _onUpPressed() {
        this.htmlElement.scrollUp();
    }

    _onDownPressed() {
        this.htmlElement.scrollDown();
    }
}

/**
 * @template {WT_Procedure} T
 */
class WT_G3x5_TSCProcedureSelectionHTMLElement extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(this._getTemplate().content.cloneNode(true));

        this._flightPlanListener = this._onFlightPlanEvent.bind(this);

        /**
         * @type {WT_G3x5_TSCProcedureSelection<T>}
         */
        this._parentPage = null;
        /**
         * @type {WT_FlightPlan}
         */
        this._flightPlan = null;
        /**
         * @type {WT_Airport}
         */
        this._airport = null;
        /**
         * @type {T}
         */
        this._selectedProcedure = null;
        this._selectedTransitionIndex = -1;
        this._isSelectedProcedureComplete = false;
        this._isSelectedProcedureLoaded = false;
        this._isInit = false;
        this._isOpen = false;

        /**
         * @type {((event:WT_G3x5_TSCProcedureSelectionEvent) => void)[]}
         */
        this._listeners = [];

        this._initWindowContexts();
        this._initAltitudeFormatter();
    }

    /**
     *
     * @returns {String}
     */
    _getProcedureSelectWindowTitle() {
    }

    _initProcedureSelectWindowContext() {
        this._procedureSelectWindowContext = {
            title: this._getProcedureSelectWindowTitle(),
            subclass: "standardDynamicSelectionListWindow",
            closeOnSelect: true
        };
    }

    _initTransitionSelectWindowContext() {
        this._transitionSelectWindowContext = {
            title: "Select Transition",
            subclass: "standardDynamicSelectionListWindow",
            closeOnSelect: true,
            callback: this._onTransitionSelected.bind(this),
            currentIndexGetter: {getCurrentIndex: this._getSelectedTransitionIndex.bind(this)}
        };
    }

    _initWindowContexts() {
        this._initProcedureSelectWindowContext();
        this._initTransitionSelectWindowContext();
    }

    _initAltitudeFormatter() {
        let formatterOpts = {
            precision: 1,
            unitCaps: true
        };
        let htmlFormatterOpts = {
            numberUnitDelim: "",
            classGetter: {
                _numberClassList: [],
                _unitClassList: [WT_G3x5_TSCProcedureSelectionHTMLElement.UNIT_CLASS],
                getNumberClassList() {
                    return this._numberClassList;
                },
                getUnitClassList() {
                    return this._unitClassList;
                }
            }
        };
        this._altitudeFormatter = new WT_NumberHTMLFormatter(new WT_NumberFormatter(formatterOpts), htmlFormatterOpts);
    }

    async _defineChildren() {
        [
            this._airportButton,
            this._procedureButton,
            this._transitionButton,
            this._previewButton,
            this._removeButton,
            this._loadButton,
            this._sequenceList
        ] = await Promise.all([
            WT_CustomElementSelector.select(this.shadowRoot, this._getAirportButtonQuery(), WT_G3x5_TSCProcedureSelectionAirportButton),
            WT_CustomElementSelector.select(this.shadowRoot, this._getProcedureButtonQuery(), WT_TSCValueButton),
            WT_CustomElementSelector.select(this.shadowRoot, this._getTransitionButtonQuery(), WT_TSCValueButton),
            WT_CustomElementSelector.select(this.shadowRoot, this._getPreviewButtonQuery(), WT_TSCValueButton),
            WT_CustomElementSelector.select(this.shadowRoot, this._getRemoveButtonQuery(), WT_TSCLabeledButton),
            WT_CustomElementSelector.select(this.shadowRoot, this._getLoadButtonQuery(), WT_TSCLabeledButton),
            WT_CustomElementSelector.select(this.shadowRoot, this._getSequenceListQuery(), WT_TSCScrollList),
        ]);

        this._optionsTitle = this.shadowRoot.querySelector(this._getOptionsTitleQuery());
    }

    _initButtons() {
        this._airportButton.setIconSrcFactory(new WT_G3x5_TSCWaypointButtonIconSrcFactory(WT_G3x5_TSCProcedureSelectionHTMLElement.WAYPOINT_ICON_IMAGE_DIRECTORY));
        this._procedureButton.enabled = "false";
        this._procedureButton.valueText = "____";
        this._transitionButton.enabled = "false";
        this._transitionButton.valueText = "____";
    }

    _initButtonManagers() {
    }

    _initSequenceLegRecycler() {
        this._sequenceLegRecycler = new WT_SimpleHTMLElementRecycler(this._sequenceList, "div", element => element.slot = "content");
    }

    _initButtonListeners() {
        this._airportButton.addButtonListener(this._onAirportButtonPressed.bind(this));
        this._procedureButton.addButtonListener(this._onProcedureButtonPressed.bind(this));
        this._transitionButton.addButtonListener(this._onTransitionButtonPressed.bind(this));
        this._removeButton.addButtonListener(this._onRemoveButtonPressed.bind(this));
        this._loadButton.addButtonListener(this._onLoadButtonPressed.bind(this));
    }

    _initChildren() {
        this._initTitles();
        this._initButtons();
        this._initSequenceLegRecycler();
        this._initButtonListeners();
    }

    async _connectedCallbackHelper() {
        await this._defineChildren();
        this._initChildren();
        this._isInit = true;
        if (this._parentPage) {
            this._initButtonManagers();
        }
        this._updateFromFlightPlan();
        if (this._isOpen) {
            this._doOpen();
        }
    }

    connectedCallback() {
        this._connectedCallbackHelper();
    }

    _updateFromParentPage() {
        if (this._isInit) {
            this._initButtonManagers();
        }
    }

    setParentPage(parentPage) {
        if (!parentPage || this._parentPage) {
            return;
        }

        this._parentPage = parentPage;
        this._updateFromParentPage();
    }

    /**
     *
     * @returns {Boolean}
     */
    _checkIfSelectedProcedureComplete() {
    }

    /**
     *
     * @returns {Boolean}
     */
    _checkIfSelectedProcedureLoaded() {
    }

    /**
     *
     * @param {WT_ProcedureLeg[]} legs
     * @param {WT_ProcedureLeg[]} nextLegs
     * @returns {Boolean}
     */
    _shouldRemoveInitialFix(legs, nextLegs) {
        let lastLeg = legs[legs.length - 1];
        if (!lastLeg) {
            return false;
        }

        let initialLeg = nextLegs[0];
        return initialLeg && initialLeg.type === WT_ProcedureLeg.Type.INITIAL_FIX && lastLeg.fixICAO === initialLeg.fixICAO;
    }

    /**
     * @returns {WT_ProcedureLeg[]}
     */
    _getProcedureLegs() {
    }

    /**
     *
     * @param {WT_ProcedureLeg} leg
     * @returns {String}
     */
    _getSequenceLegName(leg) {
        switch (leg.type) {
            case WT_ProcedureLeg.Type.INITIAL_FIX:
            case WT_ProcedureLeg.Type.FIX:
                return leg.fixICAO.substr(7, 5).trim();
            case WT_ProcedureLeg.Type.FLY_REFERENCE_RADIAL_FOR_DISTANCE:
                if (leg.fixICAO) {
                    return leg.fixICAO.substr(7, 5).trim();
                }
            case WT_ProcedureLeg.Type.FLY_HEADING_UNTIL_DISTANCE_FROM_REFERENCE:
            case WT_ProcedureLeg.Type.FLY_HEADING_TO_INTERCEPT:
            case WT_ProcedureLeg.Type.FLY_HEADING_UNTIL_REFERENCE_RADIAL_CROSSING:
                return `HDG ${leg.course.toFixed(0).padStart(3, "0")}°`;
            case WT_ProcedureLeg.Type.FLY_TO_BEARING_DISTANCE_FROM_REFERENCE:
                if (leg.fixICAO) {
                    return leg.fixICAO.substr(7, 5).trim();
                }
            case WT_ProcedureLeg.Type.FLY_VECTORS:
                return "MANSEQ";
            case WT_ProcedureLeg.Type.FLY_HEADING_TO_ALTITUDE:
                return this._altitudeFormatter.getFormattedHTML(leg.altitudeConstraint.floor);
            case WT_ProcedureLeg.Type.INITIAL_RUNWAY_FIX:
            case WT_ProcedureLeg.Type.RUNWAY_FIX:
                return `RW${leg.runway.designationFull}`;
        }
    }

    _updateSelectedProcedureStatus() {
        this._isSelectedProcedureComplete = this._checkIfSelectedProcedureComplete();
        this._isSelectedProcedureLoaded = this._isSelectedProcedureComplete && this._checkIfSelectedProcedureLoaded();
    }

    _updateSequenceList() {
        this._sequenceLegRecycler.recycleAll();
        let legs = this._getProcedureLegs();
        console.log(legs);
        legs.forEach(leg => {
            if (!leg) {
                return;
            }
            let sequenceLeg = this._sequenceLegRecycler.request();
            sequenceLeg.innerHTML = this._getSequenceLegName(leg);
        }, this);
    }

    _updateLoadButton() {
        this._loadButton.enabled = `${!this._isSelectedProcedureLoaded}`;
    }

    _cleanUpFlightPlan() {
        if (!this._flightPlan) {
            return;
        }

        this._flightPlan.removeListener(this._flightPlanListener);
    }

    _initFlightPlanListener() {
        this._flightPlan.addListener(this._flightPlanListener);
    }

    _updateAirportButtonFromAirport() {
        this._airportButton.setWaypoint(this._airport);
    }

    /**
     *
     * @param {WT_Airport} airport
     * @returns {WT_ProcedureList<T>}
     */
    _getProcedureList(airport) {
    }

    _updateSelectedProcedureFromAirport() {
        let procedureList = this._getProcedureList(this._airport);
        let procedure = null;
        if (procedureList && procedureList.array.length > 0) {
            procedure = procedureList.array.first();
        }
        this.selectProcedure(procedure);
        if (procedure) {
            this._procedureButton.enabled = "true";
        } else {
            this._procedureButton.enabled = "false";
        }
    }

    _updateFromAirport() {
        this._updateAirportButtonFromAirport();
        this._updateSelectedProcedureFromAirport();
    }

    /**
     * @returns {WT_Airport}
     */
    _getAirportFromFlightPlan() {
    }

    _updateAirport() {
        let airport = this._getAirportFromFlightPlan();
        if (!airport && !this._airport || (airport && airport.equals(this._airport))) {
            return;
        }

        this._airport = airport;
        this._updateFromAirport();
    }

    _updateFromFlightPlan() {
        if (!this._flightPlan) {
            return;
        }

        this._initFlightPlanListener();
        this._updateAirport();
        this._updateRemoveButton();
    }

    setFlightPlan(flightPlan) {
        if (this._flightPlan === flightPlan) {
            return;
        }

        this._cleanUpFlightPlan();
        this._flightPlan = flightPlan;
        if (this._isInit) {
            this._updateFromFlightPlan();
        }
    }

    _updateProcedureButton() {
        this._procedureButton.valueText = this._selectedProcedure ? this._selectedProcedure.name : "____";
    }

    /**
     *
     * @param {T} procedure
     * @returns {WT_ProcedureTransition}
     */
    _getTransitionList(procedure) {
    }

    _updateSelectedTransitionIndexFromProcedure() {
        let transitionList = this._getTransitionList(this._selectedProcedure);
        let transitionIndex = -1;
        if (transitionList && transitionList.array.length > 0) {
            transitionIndex = 0;
        }
        this.selectTransitionIndex(transitionIndex);
        if (transitionIndex >= 0) {
            this._transitionButton.enabled = "true";
        } else {
            this._transitionButton.enabled = "false";
        }
    }

    _updateFromSelectedProcedure() {
        this._updateProcedureButton();
        this._updateSelectedTransitionIndexFromProcedure();
    }

    /**
     *
     * @param {T} procedure
     */
    selectProcedure(procedure) {
        if ((procedure && !procedure.airport.equals(this._airport)) || (!procedure && !this._selectedProcedure) || (procedure && procedure.equals(this._selectedProcedure))) {
            return;
        }

        this._selectedProcedure = procedure;
        if (this._isInit) {
            this._updateFromSelectedProcedure();
        }
    }

    _updateTransitionButton() {
        let text = "____";
        if (this._selectedTransitionIndex >= 0) {
            let transitionList = this._getTransitionList(this._selectedProcedure);
            if (transitionList && transitionList.array.length > this._selectedTransitionIndex) {
                text = transitionList.array.get(this._selectedTransitionIndex).name;
            }
        }
        this._transitionButton.valueText = text;
    }

    _updateFromSelectedTransitionIndex() {
        this._updateTransitionButton();
        this._updateSelectedProcedureStatus();
        this._updateSequenceList();
        this._updateLoadButton();
    }

    selectTransitionIndex(index) {
        this._selectedTransitionIndex = index;
        if (this._isInit) {
            this._updateFromSelectedTransitionIndex();
        }
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     * @returns {Boolean}
     */
    _filterFlightPlanAirportEvent(event) {
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     * @returns {Boolean}
     */
    _filterFlightPlanProcedureEvent(event) {
    }

    /**
     *
     * @returns {Boolean}
     */
    _flightPlanHasProcedure() {
    }

    _updateRemoveButton() {
        this._removeButton.enabled = `${this._flightPlanHasProcedure()}`;
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     */
    _onFlightPlanEvent(event) {
        if (this._filterFlightPlanAirportEvent(event)) {
            this._updateAirport();
        }
        if (this._filterFlightPlanProcedureEvent(event)) {
            this._updateSelectedProcedureStatus();
            this._updateRemoveButton();
            this._updateLoadButton();
        }
    }

    /**
     *
     * @param {WT_G3x5_TSCProcedureSelectionEvent} event
     */
    _notifyListeners(event) {
        this._listeners.forEach(listener => listener(event));
    }

    _selectAirport(icao) {
        if (icao === "") {
            return;
        }

        this._notifyListeners({
            source: this,
            type: WT_G3x5_TSCProcedureSelectionHTMLElement.EventType.AIRPORT_SELECTED,
            airportICAO: icao
        });
    }

    _openAirportSelectWindow() {
        if (!this._parentPage) {
            return;
        }

        let instrument = this._parentPage.instrument;
        instrument.deactivateNavButton(5);
        instrument.deactivateNavButton(6);
        instrument.fullKeyboard.element.setContext(this._selectAirport.bind(this));
        instrument.switchToPopUpPage(instrument.fullKeyboard);
    }

    _onAirportButtonPressed(button) {
        this._openAirportSelectWindow();
    }

    /**
     *
     * @returns {T[]}
     */
    _getSelectableProcedures() {
    }

    _getSelectedProcedureIndex(procedures) {
        return procedures.indexOf(this._selectedProcedure);
    }

    _onProcedureSelected(procedures, selectedIndex) {
        let procedure = procedures[selectedIndex];
        if (procedure) {
            this.selectProcedure(procedure);
        }
    }

    _updateProcedureSelectWindowContext() {
        let procedures = this._getSelectableProcedures();
        let elementHandler = new WT_TSCStandardSelectionElementHandler(procedures.map(procedure => procedure.name));

        this._procedureSelectWindowContext.callback = this._onProcedureSelected.bind(this, procedures);
        this._procedureSelectWindowContext.elementConstructor = elementHandler;
        this._procedureSelectWindowContext.elementUpdater = elementHandler;
        this._procedureSelectWindowContext.currentIndexGetter = {getCurrentIndex: this._getSelectedProcedureIndex.bind(this, procedures)};
        this._procedureSelectWindowContext.homePageGroup = this._parentPage.homePageGroup;
        this._procedureSelectWindowContext.homePageName = this._parentPage.homePageName;
    }

    _openProcedureSelectWindow() {
        if (!this._parentPage) {
            return;
        }

        this._updateProcedureSelectWindowContext();
        let instrument = this._parentPage.instrument;
        instrument.selectionListWindow1.element.setContext(this._procedureSelectWindowContext);
        instrument.switchToPopUpPage(instrument.selectionListWindow1);
    }

    _onProcedureButtonPressed(button) {
        this._openProcedureSelectWindow();
    }

    /**
     *
     * @returns {WT_ProcedureTransition[]}
     */
    _getSelectableTransitions() {
    }

    _getSelectedTransitionIndex() {
        return this._selectedTransitionIndex;
    }

    _onTransitionSelected(index) {
        this.selectTransitionIndex(index);
    }

    _updateTransitionSelectWindowContext() {
        let transitions = this._getSelectableTransitions();
        let elementHandler = new WT_TSCStandardSelectionElementHandler(transitions.map(transition => transition.name));

        this._transitionSelectWindowContext.elementConstructor = elementHandler;
        this._transitionSelectWindowContext.elementUpdater = elementHandler;
        this._transitionSelectWindowContext.homePageGroup = this._parentPage.homePageGroup;
        this._transitionSelectWindowContext.homePageName = this._parentPage.homePageName;
    }

    _openTransitionSelectWindow() {
        if (!this._parentPage || !this._selectedProcedure) {
            return;
        }

        this._updateTransitionSelectWindowContext();
        let instrument = this._parentPage.instrument;
        instrument.selectionListWindow1.element.setContext(this._transitionSelectWindowContext);
        instrument.switchToPopUpPage(instrument.selectionListWindow1);
    }

    _onTransitionButtonPressed(button) {
        this._openTransitionSelectWindow();
    }

    _onRemoveButtonPressed(button) {
        this._notifyListeners({
            source: this,
            type: WT_G3x5_TSCProcedureSelectionHTMLElement.EventType.PROCEDURE_REMOVED
        });
    }

    /**
     *
     * @param {WT_G3x5_TSCProcedureSelectionEvent} event
     */
    _fillSelectedProcedureDetails(event) {
        event.procedure = this._selectedProcedure;
        event.transitionIndex = this._selectedTransitionIndex;
    }

    _onLoadButtonPressed(button) {
        if (!this._checkIfSelectedProcedureComplete()) {
            return;
        }

        let event = {
            source: this,
            type: WT_G3x5_TSCProcedureSelectionHTMLElement.EventType.PROCEDURE_LOADED,
        };
        this._fillSelectedProcedureDetails(event);
        this._notifyListeners(event);
    }

    /**
     *
     * @param {(event:WT_G3x5_TSCProcedureSelectionEvent) => void} listener
     */
    addListener(listener) {
        this._listeners.push(listener);
    }

    /**
     *
     * @param {(event:WT_G3x5_TSCProcedureSelectionEvent) => void} listener
     */
    removeListener(listener) {
        let index = this._listeners.indexOf(listener);
        if (index >= 0) {
            this._listeners.splice(index, 1);
        }
    }

    scrollUp() {
        if (!this._isInit) {
            return;
        }

        this._sequenceList.scrollManager.scrollUp();
    }

    scrollDown() {
        if (!this._isInit) {
            return;
        }

        this._sequenceList.scrollManager.scrollDown();
    }

    /**
     * @returns {WT_FlightPlanProcedureSegment<T>}
     */
    _getProcedureSegmentFromFlightPlan() {
    }

    /**
     *
     * @param {WT_FlightPlanProcedureSegment<T>} procedureSegment
     * @returns {Number}
     */
    _getTransitionIndexFromProcedureSegment(procedureSegment) {
    }

    _doSelectActiveProcedure(procedureSegment) {
        this.selectProcedure(procedureSegment.procedure);
        this.selectTransitionIndex(this._getTransitionIndexFromProcedureSegment(procedureSegment));
    }

    _selectActiveProcedure() {
        let lastPageName = this._parentPage.instrument.history[this._parentPage.instrument.history.length - 1].pageName;
        if (lastPageName === this._parentPage.container.name) {
            return;
        }

        let procedureSegment = this._getProcedureSegmentFromFlightPlan();
        if (procedureSegment) {
            this._doSelectActiveProcedure(procedureSegment);
        }
    }

    _doOpen() {
        this._selectActiveProcedure();
    }

    open() {
        this._isOpen = true;

        if (this._isInit) {
            this._doOpen();
        }
    }

    _updateAirportButton(state) {
        this._airportButton.update(state.airplaneHeadingTrue);
    }

    _doUpdate(state) {
        this._updateAirportButton(state);
        this._sequenceList.scrollManager.update();
    }

    update(state) {
        if (!this._isInit) {
            return;
        }

        this._doUpdate(state);
    }

    close() {
        this._isOpen = false;
    }
}
/**
 * @enum {Number}
 */
WT_G3x5_TSCProcedureSelectionHTMLElement.EventType = {
    AIRPORT_SELECTED: 0,
    PROCEDURE_LOADED: 1,
    PROCEDURE_REMOVED: 2,
    APPROACH_ACTIVATED: 3,
};
WT_G3x5_TSCProcedureSelectionHTMLElement.WAYPOINT_ICON_IMAGE_DIRECTORY = "/WTg3000/SDK/Assets/Images/Garmin/TSC/Waypoints";
WT_G3x5_TSCProcedureSelectionHTMLElement.UNIT_CLASS = "unit";

/**
 * @typedef WT_G3x5_TSCProcedureSelectionEvent
 * @property {WT_G3x5_TSCProcedureSelectionHTMLElement} source
 * @property {WT_G3x5_TSCProcedureSelectionHTMLElement.EventType} type
 * @property {String} [airportICAO]
 * @property {WT_Procedure} [procedure]
 * @property {Number} [transitionIndex]
 * @property {WT_Runway} [runway]
 */

class WT_G3x5_TSCProcedureSelectionAirportButton extends WT_G3x5_TSCWaypointButton {
    constructor() {
        super();
    }

    _createIdentStyle() {
        return `
            #ident {
                position: absolute;
                left: 2%;
                top: 30%;
                width: 96%;
                font-size: var(--waypoint-ident-font-size, 1.5em);
                text-align: center;
                color: var(--waypoint-ident-color, var(--wt-g3x5-lightblue));
            }
            :host([highlight=true][primed=false]) #ident {
                color: black;
            }
        `;
    }

    _createNameStyle() {
        return `
            #name {
                position: absolute;
                left: 2%;
                width: 96%;
                bottom: 5%;
                font-size: var(--waypoint-name-font-size, 1em);
                text-align: left;
                white-space: nowrap;
                overflow: hidden;
                color: var(--waypoint-name-color, white);
            }
            :host([highlight=true][primed=false]) #name {
                color: black;
            }
        `;
    }

    _createIconStyle() {
        return `
            #icon {
                position: absolute;
                right: 5%;
                top: 5%;
                height: 25%;
                max-width: 15%;
                fill: white;
                transform: rotateX(0deg);
            }
        `;
    }

    _createEmptyStyle() {
        return `
            #empty {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
            }
        `;
    }

    _createTitleStyle() {
        return `
            #title {
                position: absolute;
                left: 20%;
                width: 60%;
                top: 5%;
                font-size: var(--waypoint-title-font-size, 1em);
                text-align: center;
                color: var(--waypoint-title-color, white);
            }
            :host([highlight=true][primed=false]) #title {
                color: black;
            }
        `;
    }

    _createStyle() {
        let style = super._createStyle();
        let titleStyle = this._createTitleStyle();
        return `
            ${style}
            ${titleStyle}
        `;
    }

    _appendChildren() {
        super._appendChildren();

        this._title = document.createElement("div");
        this._title.id = "title";
        this._wrapper.appendChild(this._title);
    }

    static get observedAttributes() {
        return [...WT_G3x5_TSCWaypointButton.observedAttributes, "titletext"];
    }

    get titleText() {
        return this.getAttribute("titletext");
    }

    set titleText(value) {
        this.setAttribute("titletext", value);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "titletext") {
            this._title.innerHTML = newValue;
        } else {
            super.attributeChangedCallback(name, oldValue, newValue);
        }
    }
}
WT_G3x5_TSCProcedureSelectionAirportButton.NAME = "wt-tsc-button-procselectairport";

customElements.define(WT_G3x5_TSCProcedureSelectionAirportButton.NAME, WT_G3x5_TSCProcedureSelectionAirportButton);

/**
 * @abstract
 * @template {WT_DepartureArrival} T
 * @extends WT_G3x5_TSCProcedureSelection<T>
 */
class WT_G3x5_TSCDepartureArrivalSelection extends WT_G3x5_TSCProcedureSelection {
    /**
     *
     * @returns {String}
     */
    _getFilterSettingKey() {
    }

    _initSettings() {
        super._initSettings();

        this._settingModel.addSetting(this._filterSetting = new WT_DataStoreSetting(this._settingModel, this._getFilterSettingKey(), false, false, true));
    }

    /**
     * @readonly
     * @type {WT_DataStoreSetting}
     */
    get filterSetting() {
        return this._filterSetting;
    }

    /**
     *
     * @param {WT_Airport} airport
     * @returns {WT_ProcedureList<T>}
     */
    _getProcedureList(airport) {
    }

    async _doLoadProcedure(procedureIndex, enrouteTransitionIndex, runwayTransitionIndex) {
    }

    /**
     *
     * @param {WT_G3x5_TSCProcedureSelectionEvent} event
     */
    async _loadProcedure(event) {
        let airport = event.procedure.airport;
        let procedureList = this._getProcedureList(airport);
        let procedureIndex = procedureList.array.indexOf(event.procedure);
        let runwayTransitionIndex = event.runway ? event.procedure.runwayTransitions.array.findIndex(transition => transition.runway.equals(event.runway)) : -1;
        await this._doLoadProcedure(procedureIndex, event.transitionIndex, runwayTransitionIndex);
    }
}

/**
 * @abstract
 * @template {WT_DepartureArrival} T
 * @extends WT_G3x5_TSCProcedureSelectionHTMLElement<T>
 */
class WT_G3x5_TSCDepartureArrivalSelectionHTMLElement extends WT_G3x5_TSCProcedureSelectionHTMLElement {
    constructor() {
        super();

        /**
         * @type {WT_Runway}
         */
        this._selectedRunway = null;
        this._filterByRunway = false;
    }

    _getTemplate() {
        return WT_G3x5_TSCDepartureArrivalSelectionHTMLElement.TEMPLATE;
    }

    _initRunwaySelectWindowContext() {
        this._runwaySelectWindowContext = {
            title: "Select Runway",
            subclass: "standardDynamicSelectionListWindow",
            closeOnSelect: true
        };
    }

    _initWindowContexts() {
        super._initWindowContexts();

        this._initRunwaySelectWindowContext();
    }

    _getAirportButtonQuery() {
        return `#airport`;
    }

    _getProcedureButtonQuery() {
        return `#procedure`;
    }

    _getTransitionButtonQuery() {
        return `#transition`;
    }

    _getPreviewButtonQuery() {
        return `#preview`;
    }

    _getRemoveButtonQuery() {
        return `#remove`;
    }

    _getLoadButtonQuery() {
        return `#load`;
    }

    _getRunwayButtonQuery() {
        return `#runway`;
    }

    _getFilterButtonQuery() {
        return `#filter`;
    }

    _getSequenceListQuery() {
        return `#sequencelist`;
    }

    _getOptionsTitleQuery() {
        return `#optionstitle`;
    }

    async _defineChildren() {
        [
            ,
            this._runwayButton,
            this._filterButton
        ] = await Promise.all([
            super._defineChildren(),
            WT_CustomElementSelector.select(this.shadowRoot, this._getRunwayButtonQuery(), WT_TSCValueButton),
            WT_CustomElementSelector.select(this.shadowRoot, this._getFilterButtonQuery(), WT_TSCValueButton)
        ]);
    }

    _initButtons() {
        super._initButtons();

        this._runwayButton.valueText = "ALL";
    }

    /**
     *
     * @returns {String}
     */
    _getFilterByProcedureText() {
    }

    _initFilterButtonManager() {
        let filterByProcedureText = this._getFilterByProcedureText();
        let elementHandler = new WT_TSCStandardSelectionElementHandler([filterByProcedureText, "Runway"]);
        let context = {
            title: "Filter by Setting",
            subclass: "standardDynamicSelectionListWindow",
            closeOnSelect: true,
            elementConstructor: elementHandler,
            elementUpdater: elementHandler,
            homePageGroup: this._parentPage.homePageGroup,
            homePageName: this._parentPage.homePageName
        };
        this._filterButtonManager = new WT_TSCSettingValueButtonManager(this._parentPage.instrument, this._filterButton, this._parentPage.filterSetting, this._parentPage.instrument.selectionListWindow1, context, value => value ? "Runway" : filterByProcedureText, [false, true]);
        this._filterButtonManager.init();
    }

    _initButtonManagers() {
        super._initButtonManagers();

        this._initFilterButtonManager();
    }

    _initButtonListeners() {
        super._initButtonListeners();

        this._runwayButton.addButtonListener(this._onRunwayButtonPressed.bind(this));
    }

    _initFilterSettingListener() {
        this._parentPage.filterSetting.addListener(this._onFilterSettingChanged.bind(this));
        this._filterByRunway = this._parentPage.filterSetting.getValue();
    }

    _updateFromParentPage() {
        super._updateFromParentPage();

        this._initFilterSettingListener();
    }

    /**
     *
     * @returns {Boolean}
     */
    _checkIfSelectedProcedureComplete() {
        return this._selectedProcedure &&
               this._selectedProcedure.airport.equals(this._airport) &&
               ((this._selectedRunway && this._selectedRunway.airport.equals(this._airport)) || (!this._selectedRunway && this._selectedProcedure.runwayTransitions.array.length === 0)) &&
               (this._selectedTransitionIndex >= 0 || this._selectedProcedure.enrouteTransitions.array.length === 0);
    }

    _updateSelectedRunwayFromAirport() {
        let runway = null;
        if (this._airport && this._airport.runways.array.length > 0) {
            runway = this._airport.runways.array.first();
        }
        this.selectRunway(runway);
    }

    _updateFromAirport() {
        this._updateAirportButtonFromAirport();

        if (this._filterByRunway) {
            this._updateSelectedRunwayFromAirport();
        } else {
            this._updateSelectedProcedureFromAirport();
        }
    }

    _updateSelectedRunwayFromProcedure() {
        if (this._selectedProcedure) {
            let runway = null;
            if (this._selectedRunway && this._selectedProcedure.runwayTransitions.array.find(transition => transition.runway.equals(this._selectedRunway))) {
                runway = this._selectedRunway;
            } else {
                let transition = this._selectedProcedure.runwayTransitions.array.first();
                runway = transition ? transition.runway : null;
                this.selectRunway(runway);
            }
            this._runwayButton.enabled = "true";
        } else {
            this.selectRunway(null);
            this._runwayButton.enabled = "false";
        }
    }

    _updateFromSelectedProcedure() {
        super._updateFromSelectedProcedure();

        if (!this._filterByRunway) {
            this._updateSelectedRunwayFromProcedure();
        }
    }

    _updateRunwayButton() {
        this._runwayButton.valueText = this._selectedRunway ? `RW${this._selectedRunway.designationFull}` : "ALL";
    }

    /**
     *
     * @param {WT_Runway} runway
     * @returns {T[]}
     */
    _getProceduresFromRunway(runway) {
    }

    _updateSelectedProcedureFromRunway() {
        if (this._selectedRunway) {
            let procedures = this._getProceduresFromRunway(this._selectedRunway);
            let procedure = null;
            if (this._selectedProcedure && procedures.find(element => element.equals(this._selectedProcedure))) {
                procedure = this._selectedProcedure;
            } else {
                if (procedures && procedures.length > 0) {
                    procedure = procedures[0];
                }
                this.selectProcedure(procedure);
            }

            if (procedure) {
                this._procedureButton.enabled = "true";
            } else {
                this._procedureButton.enabled = "false";
            }
        } else {
            this._updateSelectedProcedureFromAirport();
        }
    }

    _updateFromRunway() {
        this._updateRunwayButton();
        if (this._filterByRunway) {
            this._updateSelectedProcedureFromRunway();
        } else {
            this._updateSelectedProcedureStatus();
            this._updateSequenceList();
            this._updateLoadButton();
        }
    }

    /**
     *
     * @param {WT_Runway} runway
     */
    selectRunway(runway) {
        if ((runway && !runway.airport.equals(this._airport)) || (!runway && !this._selectedRunway) || (runway && runway.equals(this._selectedRunway))) {
            return;
        }

        this._selectedRunway = runway;
        if (this._isInit) {
            this._updateFromRunway();
        }
    }

    _onFilterSettingChanged(setting, newValue, oldValue) {
        this._filterByRunway = newValue;
    }

    /**
     *
     * @returns {T[]}
     */
    _getSelectableProcedures() {
        let procedureList = this._getProcedureList(this._airport);
        if (!procedureList) {
            return [];
        }

        if (this._filterByRunway && this._selectedRunway) {
            return this._getProceduresFromRunway(this._selectedRunway);
        } else {
            return procedureList.array.slice();
        }
    }

    /**
     *
     * @returns {WT_ProcedureTransition[]}
     */
    _getSelectableTransitions() {
        return this._selectedProcedure ? this._selectedProcedure.enrouteTransitions.array.slice() : [];
    }

    /**
     *
     * @returns {WT_Runway[]}
     */
    _getSelectableRunways() {
        if (!this._airport) {
            return [];
        }

        if (this._filterByRunway) {
            return this._airport.runways.array.slice();
        } else {
            if (this._selectedProcedure) {
                return this._selectedProcedure.runwayTransitions.array.length > 0 ? this._selectedProcedure.runwayTransitions.array.map(transition => transition.runway) : [null];
            } else {
                return [null];
            }
        }
    }

    _getSelectedRunwayIndex(runways) {
        return runways.indexOf(this._selectedRunway);
    }

    _onRunwaySelected(runways, selectedIndex) {
        let runway = runways[selectedIndex];
        if (runway !== undefined) {
            this.selectRunway(runway);
        }
    }

    _updateRunwaySelectWindowContext() {
        let runways = this._getSelectableRunways();
        let elementHandler = new WT_TSCStandardSelectionElementHandler(runways.map(runway => runway ? `RW${runway.designationFull}` : "ALL"));

        this._runwaySelectWindowContext.callback = this._onRunwaySelected.bind(this, runways);
        this._runwaySelectWindowContext.elementConstructor = elementHandler;
        this._runwaySelectWindowContext.elementUpdater = elementHandler;
        this._runwaySelectWindowContext.currentIndexGetter = {getCurrentIndex: this._getSelectedRunwayIndex.bind(this, runways)};
        this._runwaySelectWindowContext.homePageGroup = this._parentPage.homePageGroup;
        this._runwaySelectWindowContext.homePageName = this._parentPage.homePageName;
    }

    _openRunwaySelectWindow() {
        if (!this._parentPage) {
            return;
        }

        this._updateRunwaySelectWindowContext();
        let instrument = this._parentPage.instrument;
        instrument.selectionListWindow1.element.setContext(this._runwaySelectWindowContext);
        instrument.switchToPopUpPage(instrument.selectionListWindow1);
    }

    _onRunwayButtonPressed(button) {
        this._openRunwaySelectWindow();
    }

    /**
     *
     * @param {WT_G3x5_TSCProcedureSelectionEvent} event
     */
    _fillSelectedProcedureDetails(event) {
        super._fillSelectedProcedureDetails(event);

        event.runway = this._selectedRunway;
    }

    /**
     *
     * @param {WT_FlightPlanDepartureArrival<T>} procedureSegment
     * @returns {Number}
     */
    _getTransitionIndexFromProcedureSegment(procedureSegment) {
        return procedureSegment.enrouteTransitionIndex;
    }

    /**
     *
     * @param {WT_FlightPlanDepartureArrival<T>} procedureSegment
     */
    _doSelectActiveProcedure(procedureSegment) {
        super._doSelectActiveProcedure(procedureSegment);

        let runwayTransition = procedureSegment.procedure.runwayTransitions.getByIndex(procedureSegment.runwayTransitionIndex);
        this.selectRunway(runwayTransition ? runwayTransition.runway : null);
    }
}
WT_G3x5_TSCDepartureArrivalSelectionHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_TSCDepartureArrivalSelectionHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
        }

        #wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-rows: repeat(2, var(--procedureselection-toprow-height, 25%)) 1fr;
            grid-template-columns: repeat(3, 1fr);
            grid-gap: var(--procedureselection-grid-row-gap, 0.5em) var(--procedureselection-grid-column-gap, 0.2em);
            color: white;
        }
            .selectionButton {
                --button-value-font-size: var(--procedureselection-selectionbutton-value-font-size, 1.25em);
            }
            #middle {
                grid-area: 2 / 1 / 3 / 3;
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                flex-flow: row nowrap;
                justify-content: center;
                align-items: stretch;
            }
                #runway {
                    width: 50%;
                }
            #sequencepadding {
                grid-area: 2 / 3 / 4 / 4;
                position: relative;
                border-radius: 5px;
                background: linear-gradient(#1f3445, black 25px);
                border: 3px solid var(--wt-g3x5-bordergray);
            }
                #sequence {
                    position: absolute;
                    left: var(--procedureselection-sequence-padding-left, 0.1em);
                    top: var(--procedureselection-sequence-padding-top, 0.1em);
                    width: calc(100% - var(--procedureselection-sequence-padding-left, 0.1em) - var(--procedureselection-sequence-padding-right, 0.1em));
                    height: calc(100% - var(--procedureselection-sequence-padding-top, 0.1em) - var(--procedureselection-sequence-padding-bottom, 0.1em));
                    display: grid;
                    grid-template-rows: var(--procedureselection-sequence-title-height, 1.2em) 1fr;
                    grid-template-columns: 100%;
                    grid-gap: var(--procedureselection-sequence-title-margin-bottom, 0.2em) 0;
                }
                    #sequencetitle {
                        align-self: center;
                        text-align: center;
                    }
                    #sequencelist {
                        --scrolllist-align-items: start;
                    }
            #optionspadding {
                grid-area: 3 / 1 / 4 / 3;
                position: relative;
                border-radius: 5px;
                background: linear-gradient(#1f3445, black 25px);
                border: 3px solid var(--wt-g3x5-bordergray);
            }
                #options {
                    position: absolute;
                    left: var(--procedureselection-options-padding-left, 0.2em);
                    top: var(--procedureselection-options-padding-top, 0.2em);
                    width: calc(100% - var(--procedureselection-options-padding-left, 0.2em) - var(--procedureselection-options-padding-right, 0.2em));
                    height: calc(100% - var(--procedureselection-options-padding-top, 0.2em) - var(--procedureselection-options-padding-bottom, 0.2em));
                    display: grid;
                    grid-template-rows: var(--procedureselection-options-title-height, 1.2em) 1fr;
                    grid-template-columns: 100%;
                    grid-gap: var(--procedureselection-options-title-margin-bottom, 0.1em) 0;
                }
                    #optionstitle {
                        align-self: center;
                        text-align: center;
                    }
                    #optionsbuttons {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        display: grid;
                        grid-template-rows: 1fr 1fr;
                        grid-template-columns: 1fr 1fr;
                        grid-gap: var(--procedureselection-options-buttons-row-gap, 0.2em) var(--procedureselection-options-buttons-column-gap, 0.5em);
                    }
                        #optionsbuttons wt-tsc-button-label {
                            font-size: var(--procedureselection-options-labeledbuttons-font-size, 1.25em);
                        }

        .${WT_G3x5_TSCProcedureSelectionHTMLElement.UNIT_CLASS} {
            font-size: var(--procedureselection-unit-font-size, 0.75em);
        }
    </style>
    <div id="wrapper">
        <wt-tsc-button-procselectairport id="airport" titletext="Airport"></wt-tsc-button-procselectairport>
        <wt-tsc-button-value id="procedure" class="selectionButton"></wt-tsc-button-value>
        <wt-tsc-button-value id="transition" class="selectionButton" labeltext="Transition"></wt-tsc-button-value>
        <div id="middle">
            <wt-tsc-button-value id="runway" class="selectionButton" labeltext="Runway"></wt-tsc-button-value>
        </div>
        <div id="sequencepadding">
            <div id="sequence">
                <div id="sequencetitle">Sequence</div>
                <wt-tsc-scrolllist id="sequencelist"></wt-tsc-scrolllist>
            </div>
        </div>
        <div id="optionspadding">
            <div id="options">
                <div id="optionstitle"></div>
                <div id="optionsbuttons">
                    <wt-tsc-button-value id="preview" labeltext="Preview"></wt-tsc-button-value>
                    <wt-tsc-button-value id="filter" labeltext="Filter by"></wt-tsc-button-value>
                    <wt-tsc-button-label id="remove" labeltext="Remove"></wt-tsc-button-label>
                    <wt-tsc-button-label id="load" labeltext="Load"></wt-tsc-button-label>
                </div>
            </div>
        </div>
    </div>
`;

/**
 * @extends WT_G3x5_TSCDepartureArrivalSelection<WT_Departure>
 */
class WT_G3x5_TSCDepartureSelection extends WT_G3x5_TSCDepartureArrivalSelection {
    /**
     *
     * @returns {String}
     */
    _getFilterSettingKey() {
        return WT_G3x5_TSCDepartureSelection.FILTER_SETTING_KEY;
    }

    _getTitle() {
        return WT_G3x5_TSCDepartureSelection.TITLE;
    }

    _createHTMLElement() {
        return new WT_G3x5_TSCDepartureSelectionHTMLElement();
    }

    /**
     *
     * @param {String} icao
     */
    async _selectAirportICAO(icao) {
        try {
            await this._fpm.setActiveOriginICAO(icao);
        } catch (e) {
            console.log(e);
        }
    }

    _removeProcedure() {
        this._fpm.removeDepartureFromActive();
    }

    /**
     *
     * @param {WT_Airport} airport
     * @returns {WT_ProcedureList<T>}
     */
    _getProcedureList(airport) {
        return airport.departures;
    }

    async _doLoadProcedure(procedureIndex, enrouteTransitionIndex, runwayTransitionIndex) {
        try {
            await this._fpm.loadDepartureToActive(procedureIndex, enrouteTransitionIndex, runwayTransitionIndex);
        } catch (e) {
            console.log(e);
        }
    }
}
WT_G3x5_TSCDepartureSelection.FILTER_SETTING_KEY = "WT_DepartureSelection_Filter";
WT_G3x5_TSCDepartureSelection.TITLE = "Departure Selection";

/**
 * @extends WT_G3x5_TSCDepartureArrivalSelectionHTMLElement<WT_Departure>
 */
class WT_G3x5_TSCDepartureSelectionHTMLElement extends WT_G3x5_TSCDepartureArrivalSelectionHTMLElement {
    /**
     *
     * @returns {String}
     */
    _getProcedureSelectWindowTitle() {
        return "Select Departure";
    }

    _initTitles() {
        this._procedureButton.labelText = "Departure";
        this._optionsTitle.textContent = "Departure Options";
    }

    /**
     *
     * @returns {String}
     */
    _getFilterByProcedureText() {
        return "Departure";
    }

    /**
     *
     * @returns {Boolean}
     */
    _checkIfSelectedProcedureLoaded() {
        let flightPlanDeparture = this._getProcedureSegmentFromFlightPlan();
        if (!flightPlanDeparture) {
            return false;
        }

        return flightPlanDeparture.procedure.name === this._selectedProcedure.name &&
               (this._selectedProcedure.enrouteTransitions.array.length === 0 || flightPlanDeparture.enrouteTransitionIndex === this._selectedTransitionIndex) &&
               (this._selectedProcedure.runwayTransitions.array.length === 0 || (flightPlanDeparture.runwayTransitionIndex < 0 && !this._selectedRunway) || this._selectedProcedure.runwayTransitions.getByIndex(flightPlanDeparture.runwayTransitionIndex).runway.equals(this._selectedRunway));
    }

    /**
     * @returns {WT_ProcedureLeg[]}
     */
    _getProcedureLegs() {
        let legs = [];
        if (this._checkIfSelectedProcedureComplete()) {
            if (this._selectedRunway) {
                let transition = this._selectedProcedure.runwayTransitions.array.find(transition => transition.runway.equals(this._selectedRunway), this);
                if (transition) {
                    legs.push(...transition.legs);
                }
            }

            let commonLegs = this._selectedProcedure.commonLegs.slice();
            if (this._shouldRemoveInitialFix(legs, commonLegs)) {
                commonLegs.shift();
            }
            legs.push(...commonLegs);

            if (this._selectedTransitionIndex >= 0) {
                let transition = this._selectedProcedure.enrouteTransitions.getByIndex(this._selectedTransitionIndex);
                if (transition) {
                    let transitionLegs = transition.legs.slice();
                    if (this._shouldRemoveInitialFix(legs, transitionLegs)) {
                        transitionLegs.shift();
                    }
                    legs.push(...transitionLegs);
                }
            }
        }
        return legs;
    }

    /**
     * @returns {WT_Airport}
     */
    _getAirportFromFlightPlan() {
        return this._flightPlan ? this._flightPlan.getOrigin().waypoint : null;
    }

    /**
     *
     * @param {WT_Airport} airport
     * @returns {WT_ProcedureList<WT_Departure>}
     */
    _getProcedureList(airport) {
        return airport ? airport.departures : null;
    }

    /**
     *
     * @param {WT_Departure} procedure
     * @returns {WT_TransitionList<WT_DepartureEnrouteTransition>}
     */
    _getTransitionList(procedure) {
        return procedure ? procedure.enrouteTransitions : null;
    }

    /**
     *
     * @param {WT_Runway} runway
     * @returns {WT_Departure[]}
     */
    _getProceduresFromRunway(runway) {
        return runway ? runway.airport.departures.array.filter(departure => departure.runwayTransitions.array.find(transition => transition.runway.equals(runway))) : null;
    }

    /**
     * @returns {WT_FlightPlanDeparture}
     */
    _getProcedureSegmentFromFlightPlan() {
        return this._flightPlan ? this._flightPlan.getDeparture() : null;
    }

    /**
     *
     * @returns {Boolean}
     */
    _flightPlanHasProcedure() {
        return this._flightPlan.hasDeparture();
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     * @returns {Boolean}
     */
    _filterFlightPlanAirportEvent(event) {
        return event.anyType(WT_FlightPlanEvent.Type.ORIGIN_CHANGED);
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     * @returns {Boolean}
     */
    _filterFlightPlanProcedureEvent(event) {
        return event.anyType(WT_FlightPlanEvent.Type.DEPARTURE_CHANGED);
    }
}
WT_G3x5_TSCDepartureSelectionHTMLElement.NAME = "wt-tsc-departureselection";

customElements.define(WT_G3x5_TSCDepartureSelectionHTMLElement.NAME, WT_G3x5_TSCDepartureSelectionHTMLElement);

/**
 * @extends WT_G3x5_TSCDepartureArrivalSelection<WT_Arrival>
 */
class WT_G3x5_TSCArrivalSelection extends WT_G3x5_TSCDepartureArrivalSelection {
    /**
     *
     * @returns {String}
     */
    _getFilterSettingKey() {
        return WT_G3x5_TSCArrivalSelection.FILTER_SETTING_KEY;
    }

    _getTitle() {
        return WT_G3x5_TSCArrivalSelection.TITLE;
    }

    _createHTMLElement() {
        return new WT_G3x5_TSCArrivalSelectionHTMLElement();
    }

    /**
     *
     * @param {String} icao
     */
    async _selectAirportICAO(icao) {
        try {
            await this._fpm.setActiveDestinationICAO(icao);
        } catch (e) {
            console.log(e);
        }
    }

    _removeProcedure() {
        this._fpm.removeArrivalFromActive();
    }

    /**
     *
     * @param {WT_Airport} airport
     * @returns {WT_ProcedureList<T>}
     */
    _getProcedureList(airport) {
        return airport.arrivals;
    }

    async _doLoadProcedure(procedureIndex, enrouteTransitionIndex, runwayTransitionIndex) {
        try {
            await this._fpm.loadArrivalToActive(procedureIndex, enrouteTransitionIndex, runwayTransitionIndex);
        } catch (e) {
            console.log(e);
        }
    }
}
WT_G3x5_TSCArrivalSelection.FILTER_SETTING_KEY = "WT_ArrivalSelection_Filter";
WT_G3x5_TSCArrivalSelection.TITLE = "Arrival Selection";

/**
 * @extends WT_G3x5_TSCDepartureArrivalSelectionHTMLElement<WT_Arrival>
 */
class WT_G3x5_TSCArrivalSelectionHTMLElement extends WT_G3x5_TSCDepartureArrivalSelectionHTMLElement {
    /**
     *
     * @returns {String}
     */
    _getProcedureSelectWindowTitle() {
        return "Select Arrival";
    }

    _initTitles() {
        this._procedureButton.labelText = "Arrival";
        this._optionsTitle.textContent = "Arrival Options";
    }

    /**
     *
     * @returns {String}
     */
    _getFilterByProcedureText() {
        return "Arrival";
    }

    /**
     *
     * @returns {Boolean}
     */
    _checkIfSelectedProcedureLoaded() {
        let flightPlanArrival = this._getProcedureSegmentFromFlightPlan();
        if (!flightPlanArrival) {
            return false;
        }

        return flightPlanArrival.procedure.name === this._selectedProcedure.name &&
               (this._selectedProcedure.enrouteTransitions.array.length === 0 || flightPlanArrival.enrouteTransitionIndex === this._selectedTransitionIndex) &&
               (this._selectedProcedure.runwayTransitions.array.length === 0 || (flightPlanArrival.runwayTransitionIndex < 0 && !this._selectedRunway) || this._selectedProcedure.runwayTransitions.getByIndex(flightPlanArrival.runwayTransitionIndex).runway.equals(this._selectedRunway));
    }

    /**
     * @returns {WT_ProcedureLeg[]}
     */
    _getProcedureLegs() {
        let legs = [];
        if (this._checkIfSelectedProcedureComplete()) {
            if (this._selectedTransitionIndex >= 0) {
                let transition = this._selectedProcedure.enrouteTransitions.getByIndex(this._selectedTransitionIndex);
                if (transition) {
                    legs.push(...transition.legs);
                }
            }

            let commonLegs = this._selectedProcedure.commonLegs.slice();
            if (this._shouldRemoveInitialFix(legs, commonLegs)) {
                commonLegs.shift();
            }
            legs.push(...commonLegs);

            if (this._selectedRunway) {
                let transition = this._selectedProcedure.runwayTransitions.array.find(transition => transition.runway.equals(this._selectedRunway), this);
                if (transition) {
                    let transitionLegs = transition.legs.slice();
                    if (this._shouldRemoveInitialFix(legs, transitionLegs)) {
                        transitionLegs.shift();
                    }
                    legs.push(...transitionLegs);
                }
            }
        }
        return legs;
    }

    /**
     * @returns {WT_Airport}
     */
    _getAirportFromFlightPlan() {
        return this._flightPlan ? this._flightPlan.getDestination().waypoint : null;
    }

    /**
     *
     * @param {WT_Airport} airport
     * @returns {WT_ProcedureList<WT_Arrival>}
     */
    _getProcedureList(airport) {
        return airport ? airport.arrivals : null;
    }

    /**
     *
     * @param {WT_Arrival} procedure
     * @returns {WT_TransitionList<WT_ArrivalEnrouteTransition>}
     */
    _getTransitionList(procedure) {
        return procedure ? procedure.enrouteTransitions : null;
    }

    /**
     *
     * @param {WT_Runway} runway
     * @returns {WT_Arrival[]}
     */
    _getProceduresFromRunway(runway) {
        return runway ? runway.airport.arrivals.array.filter(arrival => arrival.runwayTransitions.array.find(transition => transition.runway.equals(runway))) : null;
    }

    /**
     * @returns {WT_FlightPlanArrival}
     */
    _getProcedureSegmentFromFlightPlan() {
        return this._flightPlan ? this._flightPlan.getArrival() : null;
    }

    /**
     *
     * @returns {Boolean}
     */
    _flightPlanHasProcedure() {
        return this._flightPlan.hasArrival();
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     * @returns {Boolean}
     */
    _filterFlightPlanAirportEvent(event) {
        return event.anyType(WT_FlightPlanEvent.Type.DESTINATION_CHANGED);
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     * @returns {Boolean}
     */
    _filterFlightPlanProcedureEvent(event) {
        return event.anyType(WT_FlightPlanEvent.Type.ARRIVAL_CHANGED);
    }
}
WT_G3x5_TSCArrivalSelectionHTMLElement.NAME = "wt-tsc-arrivalselection";

customElements.define(WT_G3x5_TSCArrivalSelectionHTMLElement.NAME, WT_G3x5_TSCArrivalSelectionHTMLElement);

/**
 * @extends WT_G3x5_TSCProcedureSelection<WT_Approach>
 */
class WT_G3x5_TSCApproachSelection extends WT_G3x5_TSCProcedureSelection {
    _initState() {
        this._state = {
            _airplaneHeadingTrue: 0,
            _isApproachActive: false,

            get airplaneHeadingTrue() {
                return this._airplaneHeadingTrue;
            },
            get isApproachActive() {
                return this._isApproachActive;
            }
        };
    }

    _getTitle() {
        return WT_G3x5_TSCApproachSelection.TITLE;
    }

    _createHTMLElement() {
        return new WT_G3x5_TSCApproachSelectionHTMLElement();
    }

    /**
     *
     * @param {WT_Airport} airport
     * @returns {WT_ProcedureList<WT_Approach>}
     */
    _getProcedureList(airport) {
        return airport.approaches;
    }

    /**
     *
     * @param {String} icao
     */
    async _selectAirportICAO(icao) {
        try {
            await this._fpm.setActiveDestinationICAO(icao);
        } catch (e) {
            console.log(e);
        }
    }

    _removeProcedure() {
        this._fpm.removeApproachFromActive();
    }

    async _doLoadProcedure(procedureIndex, transitionIndex) {
        try {
            await this._fpm.loadApproachToActive(procedureIndex, transitionIndex);
        } catch (e) {
            console.log(e);
        }
    }

    /**
     *
     * @param {WT_G3x5_TSCProcedureSelectionEvent} event
     */
    async _loadProcedure(event) {
        let airport = event.procedure.airport;
        let procedureList = this._getProcedureList(airport);
        let procedureIndex = procedureList.array.indexOf(event.procedure);
        await this._doLoadProcedure(procedureIndex, event.transitionIndex);
    }

    async _activateApproach() {
        await this._fpm.activateApproach();
    }

    /**
     *
     * @param {WT_G3x5_TSCProcedureSelectionEvent} event
     */
    _onHTMLElementEvent(event) {
        if (event.type === WT_G3x5_TSCProcedureSelectionHTMLElement.EventType.APPROACH_ACTIVATED) {
            this._activateApproach();
        } else {
            super._onHTMLElementEvent(event);
        }
    }

    _updateState() {
        super._updateState();

        let activeLeg = this._fpm.getActiveLeg(true);
        this._state._isApproachActive = activeLeg && activeLeg.segment === WT_FlightPlan.Segment.APPROACH;
    }
}
WT_G3x5_TSCApproachSelection.TITLE = "Approach Selection";

/**
 * @extends WT_G3x5_TSCProcedureSelectionHTMLElement<WT_Approach>
 */
class WT_G3x5_TSCApproachSelectionHTMLElement extends WT_G3x5_TSCProcedureSelectionHTMLElement {
    _getTemplate() {
        return WT_G3x5_TSCApproachSelectionHTMLElement.TEMPLATE;
    }

    /**
     *
     * @returns {String}
     */
    _getProcedureSelectWindowTitle() {
        return "Select Approach";
    }

    _getAirportButtonQuery() {
        return `#airport`;
    }

    _getProcedureButtonQuery() {
        return `#procedure`;
    }

    _getTransitionButtonQuery() {
        return `#transition`;
    }

    _getPreviewButtonQuery() {
        return `#preview`;
    }

    _getRemoveButtonQuery() {
        return `#remove`;
    }

    _getLoadButtonQuery() {
        return `#load`;
    }

    _getActivateButtonQuery() {
        return `#activate`;
    }

    _getSequenceListQuery() {
        return `#sequencelist`;
    }

    _getOptionsTitleQuery() {
        return `#optionstitle`;
    }

    async _defineChildren() {
        [
            ,
            this._activateButton,
        ] = await Promise.all([
            super._defineChildren(),
            WT_CustomElementSelector.select(this.shadowRoot, this._getActivateButtonQuery(), WT_TSCLabeledButton),
        ]);
    }

    _initTitles() {
        this._procedureButton.labelText = "Approach";
        this._optionsTitle.textContent = "Approach Options";
    }

    _initButtonListeners() {
        super._initButtonListeners();

        this._activateButton.addButtonListener(this._onActivateButtonPressed.bind(this));
    }

    /**
     *
     * @returns {Boolean}
     */
    _checkIfSelectedProcedureComplete() {
        return this._selectedProcedure &&
               this._selectedProcedure.airport.equals(this._airport) &&
               (this._selectedTransitionIndex >= 0 || this._selectedProcedure.transitions.array.length === 0);
    }

    /**
     *
     * @returns {Boolean}
     */
    _checkIfSelectedProcedureLoaded() {
        let flightPlanApproach = this._getProcedureSegmentFromFlightPlan();
        if (!flightPlanApproach) {
            return false;
        }

        return flightPlanApproach.procedure.name === this._selectedProcedure.name &&
               (this._selectedProcedure.transitions.array.length === 0 || flightPlanApproach.transitionIndex === this._selectedTransitionIndex);
    }

    /**
     * @returns {WT_ProcedureLeg[]}
     */
    _getProcedureLegs() {
        let legs = [];
        if (this._checkIfSelectedProcedureComplete()) {
            if (this._selectedTransitionIndex >= 0) {
                let transition = this._selectedProcedure.transitions.getByIndex(this._selectedTransitionIndex);
                if (transition) {
                    legs.push(...transition.legs);
                }
            }

            let finalLegs = this._selectedProcedure.finalLegs.slice();
            if (this._shouldRemoveInitialFix(legs, finalLegs)) {
                finalLegs.shift();
            }
            legs.push(...finalLegs);
        }
        return legs;
    }

    /**
     * @returns {WT_Airport}
     */
    _getAirportFromFlightPlan() {
        return this._flightPlan ? this._flightPlan.getDestination().waypoint : null;
    }

    /**
     *
     * @param {WT_Airport} airport
     * @returns {WT_ProcedureList<WT_Approach>}
     */
    _getProcedureList(airport) {
        return airport ? airport.approaches : null;
    }

    /**
     *
     * @param {WT_Approach} procedure
     * @returns {WT_TransitionList<WT_ApproachTransition>}
     */
    _getTransitionList(procedure) {
        return procedure ? procedure.transitions : null;
    }

    /**
     * @returns {WT_FlightPlanApproach}
     */
    _getProcedureSegmentFromFlightPlan() {
        return this._flightPlan ? this._flightPlan.getApproach() : null;
    }

    /**
     *
     * @param {WT_FlightPlanApproach} procedureSegment
     * @returns {Number}
     */
    _getTransitionIndexFromProcedureSegment(procedureSegment) {
        return procedureSegment.transitionIndex;
    }

    /**
     *
     * @returns {Boolean}
     */
    _flightPlanHasProcedure() {
        return this._flightPlan.hasApproach();
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     * @returns {Boolean}
     */
    _filterFlightPlanAirportEvent(event) {
        return event.anyType(WT_FlightPlanEvent.Type.DESTINATION_CHANGED);
    }

    /**
     *
     * @param {WT_FlightPlanEvent} event
     * @returns {Boolean}
     */
    _filterFlightPlanProcedureEvent(event) {
        return event.anyType(WT_FlightPlanEvent.Type.APPROACH_CHANGED);
    }

    /**
     *
     * @returns {T[]}
     */
    _getSelectableProcedures() {
        let procedureList = this._getProcedureList(this._airport);
        return procedureList ? procedureList.array.slice() : [];
    }

    /**
     *
     * @returns {WT_ApproachTransition[]}
     */
    _getSelectableTransitions() {
        return this._selectedProcedure ? this._selectedProcedure.transitions.array.slice() : [];
    }

    _onActivateButtonPressed(button) {
        this._notifyListeners({
            source: this,
            type: WT_G3x5_TSCProcedureSelectionHTMLElement.EventType.APPROACH_ACTIVATED
        });
    }

    _updateActivateButton(state) {
        this._activateButton.enabled = `${this._isSelectedProcedureLoaded && !state.isApproachActive}`;
    }

    _doUpdate(state) {
        super._doUpdate(state);

        this._updateActivateButton(state);
    }
}
WT_G3x5_TSCApproachSelectionHTMLElement.NAME = "wt-tsc-approachselection";
WT_G3x5_TSCApproachSelectionHTMLElement.TEMPLATE = document.createElement("template");
WT_G3x5_TSCApproachSelectionHTMLElement.TEMPLATE.innerHTML = `
    <style>
        :host {
            display: block;
        }

        #wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-rows: repeat(2, var(--procedureselection-toprow-height, 25%)) 1fr;
            grid-template-columns: repeat(3, 1fr);
            grid-gap: var(--procedureselection-grid-row-gap, 0.5em) var(--procedureselection-grid-column-gap, 0.2em);
            color: white;
        }
            .selectionButton {
                --button-value-font-size: var(--procedureselection-selectionbutton-value-font-size, 1.25em);
            }
            #middle {
                grid-area: 2 / 1 / 3 / 3;
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                flex-flow: row nowrap;
                justify-content: center;
                align-items: stretch;
            }
                #runway {
                    width: 50%;
                }
            #sequencepadding {
                grid-area: 2 / 3 / 4 / 4;
                position: relative;
                border-radius: 5px;
                background: linear-gradient(#1f3445, black 25px);
                border: 3px solid var(--wt-g3x5-bordergray);
            }
                #sequence {
                    position: absolute;
                    left: var(--procedureselection-sequence-padding-left, 0.1em);
                    top: var(--procedureselection-sequence-padding-top, 0.1em);
                    width: calc(100% - var(--procedureselection-sequence-padding-left, 0.1em) - var(--procedureselection-sequence-padding-right, 0.1em));
                    height: calc(100% - var(--procedureselection-sequence-padding-top, 0.1em) - var(--procedureselection-sequence-padding-bottom, 0.1em));
                    display: grid;
                    grid-template-rows: var(--procedureselection-sequence-title-height, 1.2em) 1fr;
                    grid-template-columns: 100%;
                    grid-gap: var(--procedureselection-sequence-title-margin-bottom, 0.2em) 0;
                }
                    #sequencetitle {
                        align-self: center;
                        text-align: center;
                    }
                    #sequencelist {
                        --scrolllist-align-items: start;
                    }
            #optionspadding {
                grid-area: 3 / 1 / 4 / 3;
                position: relative;
                border-radius: 5px;
                background: linear-gradient(#1f3445, black 25px);
                border: 3px solid var(--wt-g3x5-bordergray);
            }
                #options {
                    position: absolute;
                    left: var(--procedureselection-options-padding-left, 0.2em);
                    top: var(--procedureselection-options-padding-top, 0.2em);
                    width: calc(100% - var(--procedureselection-options-padding-left, 0.2em) - var(--procedureselection-options-padding-right, 0.2em));
                    height: calc(100% - var(--procedureselection-options-padding-top, 0.2em) - var(--procedureselection-options-padding-bottom, 0.2em));
                    display: grid;
                    grid-template-rows: var(--procedureselection-options-title-height, 1.2em) 1fr;
                    grid-template-columns: 100%;
                    grid-gap: var(--procedureselection-options-title-margin-bottom, 0.1em) 0;
                }
                    #optionstitle {
                        align-self: center;
                        text-align: center;
                    }
                    #optionsbuttons {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        display: grid;
                        grid-template-rows: 1fr 1fr;
                        grid-template-columns: repeat(3, 1fr);
                        grid-gap: var(--procedureselection-options-buttons-row-gap, 0.2em) var(--procedureselection-options-buttons-column-gap, 0.5em);
                    }
                        #optionsbuttons wt-tsc-button-label {
                            font-size: var(--procedureselection-options-labeledbuttons-font-size, 1.25em);
                        }
                        #preview {
                            grid-area: 1 / 1 / 2 / 4;
                            justify-self: center;
                            width: 75%;
                        }

        .${WT_G3x5_TSCProcedureSelectionHTMLElement.UNIT_CLASS} {
            font-size: var(--procedureselection-unit-font-size, 0.75em);
        }
    </style>
    <div id="wrapper">
        <wt-tsc-button-procselectairport id="airport" titletext="Airport"></wt-tsc-button-procselectairport>
        <wt-tsc-button-value id="procedure" class="selectionButton"></wt-tsc-button-value>
        <wt-tsc-button-value id="transition" class="selectionButton" labeltext="Transition"></wt-tsc-button-value>
        <div id="middle">
        </div>
        <div id="sequencepadding">
            <div id="sequence">
                <div id="sequencetitle">Sequence</div>
                <wt-tsc-scrolllist id="sequencelist"></wt-tsc-scrolllist>
            </div>
        </div>
        <div id="optionspadding">
            <div id="options">
                <div id="optionstitle"></div>
                <div id="optionsbuttons">
                    <wt-tsc-button-value id="preview" labeltext="Preview"></wt-tsc-button-value>
                    <wt-tsc-button-label id="remove" labeltext="Remove"></wt-tsc-button-label>
                    <wt-tsc-button-label id="load" labeltext="Load"></wt-tsc-button-label>
                    <wt-tsc-button-label id="activate" labeltext="Activate"></wt-tsc-button-label>
                </div>
            </div>
        </div>
    </div>
`;

customElements.define(WT_G3x5_TSCApproachSelectionHTMLElement.NAME, WT_G3x5_TSCApproachSelectionHTMLElement);