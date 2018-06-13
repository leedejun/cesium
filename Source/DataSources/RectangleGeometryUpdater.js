define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/Ellipsoid',
        '../Core/GeometryInstance',
        '../Core/GeometryOffsetAttribute',
        '../Core/Iso8601',
        '../Core/OffsetGeometryInstanceAttribute',
        '../Core/Rectangle',
        '../Core/RectangleGeometry',
        '../Core/RectangleOutlineGeometry',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
        '../Scene/HeightReference',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        './ColorMaterialProperty',
        './DynamicGeometryUpdater',
        './GeometryHeightProperty',
        './GeometryUpdater',
        './GroundGeometryUpdater',
        './Property'
    ], function(
        Cartesian3,
        Cartographic,
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        Ellipsoid,
        GeometryInstance,
        GeometryOffsetAttribute,
        Iso8601,
        OffsetGeometryInstanceAttribute,
        Rectangle,
        RectangleGeometry,
        RectangleOutlineGeometry,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        HeightReference,
        MaterialAppearance,
        PerInstanceColorAppearance,
        ColorMaterialProperty,
        DynamicGeometryUpdater,
        GeometryHeightProperty,
        GeometryUpdater,
        GroundGeometryUpdater,
        Property) {
    'use strict';

    var scratchColor = new Color();
    var defaultOffset = Cartesian3.ZERO;
    var offsetScratch = new Cartesian3();
    var scratchRectangleGeometry = new RectangleGeometry({rectangle: new Rectangle()});
    var scratchCenterRect = new Rectangle();
    var scratchCarto = new Cartographic();

    function RectangleGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.rectangle = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.rotation = undefined;
        this.offsetAttribute = undefined;
    }

    /**
     * A {@link GeometryUpdater} for rectangles.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias RectangleGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function RectangleGeometryUpdater(entity, scene) {
        GroundGeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new RectangleGeometryOptions(entity),
            geometryPropertyName : 'rectangle',
            observedPropertyNames : ['availability', 'rectangle']
        });

        this._onEntityPropertyChanged(entity, 'rectangle', entity.rectangle, undefined);
    }

    if (defined(Object.create)) {
        RectangleGeometryUpdater.prototype = Object.create(GroundGeometryUpdater.prototype);
        RectangleGeometryUpdater.prototype.constructor = RectangleGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    RectangleGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._fillEnabled) {
            throw new DeveloperError('This instance does not represent a filled geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);

        var attributes;

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);
        var offset = OffsetGeometryInstanceAttribute.fromCartesian3(Property.getValueOrDefault(this._terrainOffsetProperty, time, defaultOffset, offsetScratch));
        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time, scratchColor);
            }
            if (!defined(currentColor)) {
                currentColor = Color.WHITE;
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute,
                color : color,
                offset : offset
            };
        } else {
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute,
                offset : offset
            };
        }

        return new GeometryInstance({
            id : entity,
            geometry : new RectangleGeometry(this._options),
            attributes : attributes
        });
    };

    /**
     * Creates the geometry instance which represents the outline of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent an outlined geometry.
     */
    RectangleGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._outlineEnabled) {
            throw new DeveloperError('This instance does not represent an outlined geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK, scratchColor);
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);
        var offset = OffsetGeometryInstanceAttribute.fromCartesian3(Property.getValueOrDefault(this._terrainOffsetProperty, time, defaultOffset, offsetScratch));

        return new GeometryInstance({
            id : entity,
            geometry : new RectangleOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition),
                offset : offset
            }
        });
    };

    RectangleGeometryUpdater.prototype._computeCenter = function(time, result) {
        var rect = Property.getValueOrUndefined(this._entity.rectangle.coordinates, time, scratchCenterRect);
        if (!defined(rect)) {
            return;
        }
        var center = Rectangle.center(rect, scratchCarto);
        return Cartographic.toCartesian(center, Ellipsoid.WGS84, result);
    };

    RectangleGeometryUpdater.prototype._isHidden = function(entity, rectangle) {
        return !defined(rectangle.coordinates) || GeometryUpdater.prototype._isHidden.call(this, entity, rectangle);
    };

    RectangleGeometryUpdater.prototype._isOnTerrain = function(entity, rectangle) {
        return this._fillEnabled && !defined(rectangle.height) && !defined(rectangle.extrudedHeight) && GroundPrimitive.isSupported(this._scene);
    };

    RectangleGeometryUpdater.prototype._isDynamic = function(entity, rectangle) {
        return !rectangle.coordinates.isConstant || //
               !Property.isConstant(rectangle.height) || //
               !Property.isConstant(rectangle.extrudedHeight) || //
               !Property.isConstant(rectangle.granularity) || //
               !Property.isConstant(rectangle.stRotation) || //
               !Property.isConstant(rectangle.rotation) || //
               !Property.isConstant(rectangle.outlineWidth) || //
               !Property.isConstant(rectangle.zIndex) || //
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    RectangleGeometryUpdater.prototype._setStaticOptions = function(entity, rectangle) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var height = rectangle.height;
        var extrudedHeight = rectangle.extrudedHeight;
        var granularity = rectangle.granularity;
        var stRotation = rectangle.stRotation;
        var rotation = rectangle.rotation;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.rectangle = rectangle.coordinates.getValue(Iso8601.MINIMUM_VALUE, options.rectangle);
        options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.offsetAttribute = GeometryHeightProperty.computeGeometryOffsetAttribute(height, extrudedHeight, Iso8601.MINIMUM_VALUE);

        if (extrudedHeight instanceof GeometryHeightProperty && Property.getValueOrDefault(extrudedHeight.height, Iso8601.MINIMUM_VALUE, HeightReference.NONE) === HeightReference.CLAMP_TO_GROUND) {
            scratchRectangleGeometry.setOptions(options);
            options.extrudedHeight = GeometryHeightProperty.getMinimumTerrainValue(scratchRectangleGeometry.rectangle);
        }
    };

    RectangleGeometryUpdater.prototype._getIsClosed = function(options) {
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        return height === 0 || defined(extrudedHeight) && extrudedHeight !== height;
    };

    RectangleGeometryUpdater.DynamicGeometryUpdater = DynamicRectangleGeometryUpdater;

    /**
     * @private
     */
    function DynamicRectangleGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DynamicRectangleGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicRectangleGeometryUpdater.prototype.constructor = DynamicRectangleGeometryUpdater;
    }

    DynamicRectangleGeometryUpdater.prototype._isHidden = function(entity, rectangle, time) {
        return  !defined(this._options.rectangle) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, rectangle, time);
    };

    DynamicRectangleGeometryUpdater.prototype._setOptions = function(entity, rectangle, time) {
        var options = this._options;
        var height = rectangle.height;
        var extrudedHeight = rectangle.extrudedHeight;

        options.rectangle = Property.getValueOrUndefined(rectangle.coordinates, time, options.rectangle);
        options.height = Property.getValueOrUndefined(height, time);
        options.extrudedHeight = Property.getValueOrUndefined(extrudedHeight, time);
        options.granularity = Property.getValueOrUndefined(rectangle.granularity, time);
        options.stRotation = Property.getValueOrUndefined(rectangle.stRotation, time);
        options.rotation = Property.getValueOrUndefined(rectangle.rotation, time);
        options.offsetAttribute = GeometryHeightProperty.computeGeometryOffsetAttribute(height, extrudedHeight, time);

        if (extrudedHeight instanceof GeometryHeightProperty && Property.getValueOrDefault(extrudedHeight.height, time, HeightReference.NONE) === HeightReference.CLAMP_TO_GROUND) {
            scratchRectangleGeometry.setOptions(options);
            options.extrudedHeight = GeometryHeightProperty.getMinimumTerrainValue(scratchRectangleGeometry.rectangle);
        }
    };

    return RectangleGeometryUpdater;
});
