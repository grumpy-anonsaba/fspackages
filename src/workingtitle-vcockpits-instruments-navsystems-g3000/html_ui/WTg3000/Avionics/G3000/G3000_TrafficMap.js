class WT_G3000_TrafficMap extends WT_G3x5_TrafficMap {
    /**
     * @returns {WT_G3000_MapViewTrafficIntruderLayer}
     */
    _createTrafficIntruderLayer() {
        return new WT_G3000_MapViewTrafficIntruderLayer(true);
    }

    /**
     * @returns {WT_G3x5_MapViewTrafficStatusLayer}
     */
    _createTrafficStatusLayer() {
        return new WT_G3x5_MapViewTrafficStatusLayer(WT_G3000_TrafficMap.STATUS_OPERATING_MODE_TEXT, WT_G3x5_TrafficMap.STATUS_ALTITUDE_RESTRICTION_MODE_TEXT, WT_G3x5_TrafficMap.STATUS_MOTION_VECTOR_MODE_TEXT);
    }
}
WT_G3000_TrafficMap.STATUS_OPERATING_MODE_TEXT = [
    "TAS: STANDBY",
    "TAS: OPERATING"
];