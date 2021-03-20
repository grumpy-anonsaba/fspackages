class WT_G3x5_PFDAoAIndicator extends WT_G3x5_PFDElement {
    constructor() {
        super();

        this._initController();
    }

    _initController() {
        this._controller = new WT_DataStoreController("PFD", null);
        this._controller.addSetting(this._aoaModeSetting = new WT_G3x5_PFDAoAModeSetting(this._controller));

        this._controller.init();
        this._mode = this.aoaModeSetting.getValue();
    }

    /**
     * @readonly
     * @property {WT_G3x5_PFDAoAModeSetting} aoaModeSetting
     * @type {WT_G3x5_PFDAoAModeSetting}
     */
    get aoaModeSetting() {
        return this._aoaModeSetting;
    }
}