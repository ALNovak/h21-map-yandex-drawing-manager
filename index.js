
ymaps.modules.define('DrawingManager',
    function (
        provide
    ) {
        let DRAWING_MODE_MARKER = "marker";
        let DRAWING_MODE_CIRCLE = "circle";

        var DrawingManager = function (map, opts) {

            this.map = map;
            this._opts = opts;
            this._drawingType = opts.drawingMode || DRAWING_MODE_MARKER;
            this._fitBounds = opts._fitBounds || true;
            this.markerOptions = opts.markerOptions || {};
            this.circleOptions = opts.circleOptions || {};
            this._enableDraw = opts.enableDraw;
            this.radius = opts.circleOptions.radius;


        };

        DrawingManager.prototype.setDrawingMode = function (drawingType) {

            let me = this;
            this._drawingType = drawingType;

            switch (drawingType) {
                case DRAWING_MODE_MARKER:
                    me._bindMarker();
                    break;
                case DRAWING_MODE_CIRCLE:
                    me._bindCircle();
                    break;
            }
        };

        DrawingManager.prototype.setPosition = function (latitude, longitude) {

            let me = this;
            me.position = null;
            me.position = [latitude, longitude];
        };

        DrawingManager.prototype._setPosition = function (e) {

            let me = this;
            me.position = null;
            me.position = e.get('coords');

        };

        DrawingManager.prototype.setEnableDraw = function (enabled) {

            this._enableDraw = enabled;
        };


        DrawingManager.prototype.setDefaultCursor = function (cursor) { };

        DrawingManager.prototype.setAreaFitBounds = function () { };

        DrawingManager.prototype.setMarkerFitBounds = function () { };

        DrawingManager.prototype.setCircleFitBounds = function () { };

        DrawingManager.prototype._getInfo = function () { };

        DrawingManager.prototype._vertexMarkerAddEventListener = function () { };

        DrawingManager.prototype._bindMarker = function () {

            let me = this;

            if (me._centerMarker) {
                me.map.geoObjects.removeAll();
                me._centerMarker = null;
                me.map.container.events.remove('click');
            }

            var createCenterMarker = (e) => {

                if (me._centerMarker) {
                    me.map.geoObjects.removeAll();
                    me._centerMarker = null;
                }

                if (e) {
                    me._setPosition(e);
                }


                if (me.position) {
                    const geo = {
                        geometry: {
                            type: "Point",
                            coordinates: me.position
                        }
                    }

                    options = {
                        iconLayout: 'default#image',
                        iconImageSize: [24, 28],
                        iconImageOffset: [0, 0],
                        iconImageHref: me.markerOptions.iconUrl,
                        draggable: false,

                    }

                    me._centerMarker = new ymaps.GeoObject(geo, options);
                    me.map.geoObjects.add(me._centerMarker);

                    me.map.setCenter(me.position, 9, {
                        checkZoomRange: true
                    });

                    me.position = null;

                    me.map.events.fire('draw:marker_create', null);

                }

            }

            if (!this._enableDraw) {
                createCenterMarker();
                me.map.container.events.remove('click');

            }

            this.map.container.events.add('click', (event) => {
                event.stopImmediatePropagation();
                if (this._enableDraw) {
                    createCenterMarker(event)
                }
            });

        };

        DrawingManager.prototype._bindCircle = function () {

            let me = this;

            if (me.circle) {
                me.map.geoObjects.remove(me.circle);
                me.map.geoObjects.remove(me._vertexMarker);
                me.map.events.fire('draw:circle_remove', null);
            }

            if (me._centerMarker) {
                const position = [me._centerMarker.geometry.getCoordinates(), me.radius];

                const options = {
                    fillColor: me.circleOptions.fillColor,
                    fillOpacity: me.circleOptions.fillOpacity,
                    strokeColor: me.circleOptions.strokeColor,
                    strokeOpacity: me.circleOptions.strokeOpacity,
                    strokeWidth: me.circleOptions.strokeWeight,

                }

                this.circle = new ymaps.Circle(position, {}, options);

                me.map.geoObjects.add(this.circle);

                me.map.events.fire('draw:circle_create', me._getInfo());

                me.map.setBounds(this.circle.geometry.getBounds());

                me._centerMarker.options.set({
                    draggable: true,
                });

                me._centerMarker.options.set({
                    cursor: 'move',
                });

                me._centerMarker.options.set({
                    zIndex: 9999,
                });

                me._centerMarkerAddEventListener();
                me._createVertexMarker();

            }

        };

        DrawingManager.prototype._centerMarkerAddEventListener = function () {

            let me = this;

            me._centerMarker.events.add('drag', function (event) {

                var coords = event.get('target').geometry.getCoordinates();
                me.circle.geometry.setCoordinates(coords);

                let to = me.destination(coords, 90, me.radius);

                if (me._vertexMarker) {
                    me._vertexMarker.geometry.setCoordinates(to);
                };

                me.map.events.fire('draw:circle_centre_change', me._getInfo());

            })

            me._centerMarker.events.add('dragend', () => {

                me.map.events.fire('draw:circle_center_complete', me._getInfo());

            });


            me._centerMarker.events.add('mouseover', () => {

                me.map.events.fire('draw:marker_mouseover', me._getInfo());

            });


            me._centerMarker.events.add('mouseout', () => {

                me.map.events.fire('draw:marker_mouseout', me._getInfo());

            });

            me._centerMarker.events.add('click', () => {

                me.map.events.fire('draw:marker_click', me._getInfo());

            })

        };

        DrawingManager.prototype._createVertexMarker = function () {

            let me = this;

            me.to = null;
            me.to = me.destination(me._centerMarker.geometry.getCoordinates(), 90, me.radius);

            const g = {
                geometry: {
                    type: "Point",
                    coordinates: me.to
                }
            }

            const svg = [
                '<?xml version="1.0"?>',
                '<svg width="15px" height="15px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">',
                '<circle stroke="#003dd9" fill="white" stroke-width="10" cx="50" cy="50" r="35"/>',
                '</svg>'
            ].join('\n');

            const opt = {
                iconLayout: 'default#imageWithContent',
                iconImageSize: [24, 28],
                iconImageOffset: [-9, -5],
                iconImageHref: '',
                draggable: true,
                iconContentLayout: ymaps.templateLayoutFactory.createClass(svg),

            }

            me._vertexMarker = new ymaps.GeoObject(g, opt);
            me.map.geoObjects.add(me._vertexMarker);

            me._vertexMarker.options.set({
                cursor: 'col-resize',
            });

            me._vertexMarkerAddEventListener();

        };

        DrawingManager.prototype._vertexMarkerAddEventListener = function () {

            let me = this;

            me._vertexMarker.events.add('drag', (event) => {

                var coords = event.get('target').geometry.getCoordinates();
                let distance = me.getDistanceTo(me._centerMarker.geometry.getCoordinates(), coords);

                me.radius = distance;

                if (me.circle) {
                    me.circle.geometry.setRadius(distance);
                }

                let pixel = {
                    clientX: event.get('domEvent').get('clientX'),
                    clientY: event.get('domEvent').get('clientY'),
                }
                let ev = {
                    pixel,
                    radius: me.circle.geometry.getRadius(),

                }

                me.map.events.fire('draw:circle_radius_change', ev);

            });

            me._vertexMarker.events.add('dragend', () => {

                me.map.events.fire('draw:circle_radius_complete', me._getInfo());

            })
        };


        DrawingManager.prototype._getInfo = function () {

            let me = this;

            let position = {
                latitude: me._centerMarker.geometry.getCoordinates()[0],
                longitude: me._centerMarker.geometry.getCoordinates()[1]
            }
            let info = {
                radius: me.circle.geometry.getRadius(),
                position
            };

            return info;
        }

        DrawingManager.prototype.destination = function (latlng, heading, distance) {

            heading = (heading + 360) % 360;
            var rad = Math.PI / 180,
                radInv = 180 / Math.PI,
                R = 6378137,
                lon1 = latlng[1] * rad,
                lat1 = latlng[0] * rad,
                rheading = heading * rad,
                sinLat1 = Math.sin(lat1),
                cosLat1 = Math.cos(lat1),
                cosDistR = Math.cos(distance / R),
                sinDistR = Math.sin(distance / R),
                lat2 = Math.asin(sinLat1 * cosDistR + cosLat1 *
                    sinDistR * Math.cos(rheading)),
                lon2 = lon1 + Math.atan2(Math.sin(rheading) * sinDistR *
                    cosLat1, cosDistR - sinLat1 * Math.sin(lat2));
            lon2 = lon2 * radInv;
            lon2 = lon2 > 180 ? lon2 - 360 : lon2 < -180 ? lon2 + 360 : lon2;
            return [lat2 * radInv, lon2]

        };

        DrawingManager.prototype.degreeToRad = function (degree) {

            return Math.PI * degree / 180;
        };

        DrawingManager.prototype._getRange = function (v, a, b) {

            if (a != null) {
                v = Math.max(v, a);
            }
            if (b != null) {
                v = Math.min(v, b);
            }
            return v;
        };

        DrawingManager.prototype._getLoop = function (v, a, b) {

            while (v > b) {
                v -= b - a
            }
            while (v < a) {
                v += b - a
            }
            return v;
        };

        DrawingManager.prototype.getDistanceTo = function (point1, point2) {

            var me = this;

            point1[1] = me._getLoop(point1[1], -180, 180);
            point1[0] = me._getRange(point1[0], -74, 74);
            point2[1] = me._getLoop(point2[1], -180, 180);
            point2[0] = me._getRange(point2[0], -74, 74);

            var x1, x2, y1, y2;
            x1 = this.degreeToRad(point1[1]);
            y1 = this.degreeToRad(point1[0]);
            x2 = this.degreeToRad(point2[1]);
            y2 = this.degreeToRad(point2[0]);

            return 6370996.81 * Math.acos((Math.sin(y1) * Math.sin(y2) + Math.cos(y1) * Math.cos(y2) * Math.cos(x2 - x1)));
        };


        DrawingManager.prototype.setMap = function (map) {

        };

        DrawingManager.prototype.destroy = function () {
            this._data = null;
            this.setMap(null);
        };

        DrawingManager.prototype._refresh = function () {
            if (this._layer) {
                this._layer.update();
            }
            return this;
        };

        provide(DrawingManager);
    });
