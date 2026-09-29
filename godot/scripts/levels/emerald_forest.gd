extends Node2D

const WORLD_WIDTH := 2600.0
const VIEW_WIDTH := 480.0
const VIEW_HEIGHT := 270.0
const GROUND_Y := 226.0
const GROUND_TILE_WIDTH := 360.0
const GROUND_SURFACE_Y := 384.0

const BG_FAR := preload("res://assets/biomes/emerald-forest/bg-far.png")
const BG_MID := preload("res://assets/biomes/emerald-forest/bg-mid.png")
const BG_NEAR := preload("res://assets/biomes/emerald-forest/bg-near.png")
const GROUND_TEXTURE := preload("res://assets/biomes/emerald-forest/ground/ground-main.png")
const PLATFORM_LONG := preload("res://assets/biomes/emerald-forest/platforms/platform-long.png")
const PLATFORM_MEDIUM_A := preload("res://assets/biomes/emerald-forest/platforms/platform-medium-a.png")
const PLATFORM_MEDIUM_B := preload("res://assets/biomes/emerald-forest/platforms/platform-medium-b.png")
const PLATFORM_SMALL_A := preload("res://assets/biomes/emerald-forest/platforms/platform-small-a.png")
const PLATFORM_SMALL_B := preload("res://assets/biomes/emerald-forest/platforms/platform-small-b.png")

const PLATFORM_DATA := [
	{"x": 320.0, "y": 182.0, "kind": "medium_a"},
	{"x": 425.0, "y": 139.0, "kind": "small_a"},
	{"x": 545.0, "y": 112.0, "kind": "long"},
	{"x": 700.0, "y": 162.0, "kind": "medium_b"},
	{"x": 850.0, "y": 188.0, "kind": "small_b"},
	{"x": 950.0, "y": 144.0, "kind": "medium_a"},
	{"x": 1070.0, "y": 103.0, "kind": "long"},
	{"x": 1225.0, "y": 151.0, "kind": "small_a"},
	{"x": 1350.0, "y": 184.0, "kind": "long"},
	{"x": 1515.0, "y": 176.0, "kind": "medium_b"},
	{"x": 1620.0, "y": 130.0, "kind": "small_b"},
	{"x": 1740.0, "y": 96.0, "kind": "long"},
	{"x": 1900.0, "y": 149.0, "kind": "medium_a"},
	{"x": 2030.0, "y": 111.0, "kind": "small_a"},
	{"x": 2160.0, "y": 170.0, "kind": "long"},
	{"x": 2320.0, "y": 132.0, "kind": "medium_b"},
	{"x": 2440.0, "y": 94.0, "kind": "small_b"},
]

var _parallax_layers: Array[Dictionary] = []


func _ready() -> void:
	_create_backgrounds()
	_create_ground()
	_create_platforms()
	_configure_camera()


func _process(_delta: float) -> void:
	var camera := get_viewport().get_camera_2d()
	if camera == null:
		return

	var camera_left := camera.get_screen_center_position().x - VIEW_WIDTH * 0.5
	for runtime in _parallax_layers:
		var layer := runtime["node"] as Node2D
		var parallax := float(runtime["parallax"])
		layer.position.x = camera_left * (1.0 - parallax)


func _configure_camera() -> void:
	var camera := $Player/Camera2D as Camera2D
	camera.limit_left = 0
	camera.limit_right = int(WORLD_WIDTH)
	camera.limit_top = 0
	camera.limit_bottom = int(VIEW_HEIGHT)
	camera.limit_smoothed = true


func _create_backgrounds() -> void:
	_create_far_layer(BG_FAR, 0.08, -120)
	_create_repeated_layer(BG_MID, 0.28, -110, 0.0, 0.0)
	_create_repeated_layer(BG_NEAR, 0.55, -100, 0.15, 0.85)


func _create_far_layer(texture: Texture2D, parallax: float, depth: int) -> void:
	var layer := Node2D.new()
	layer.name = "FarBackground"
	layer.z_index = depth
	add_child(layer)
	move_child(layer, 0)

	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.centered = false
	var coverage_width := VIEW_WIDTH + (WORLD_WIDTH - VIEW_WIDTH) * parallax
	sprite.scale = Vector2(
		coverage_width / float(texture.get_width()),
		VIEW_HEIGHT / float(texture.get_height())
	)
	layer.add_child(sprite)

	_parallax_layers.append({"node": layer, "parallax": parallax})


func _create_repeated_layer(
	texture: Texture2D,
	parallax: float,
	depth: int,
	horizontal_overlap: float,
	ground_anchor: float
) -> void:
	var layer := Node2D.new()
	layer.name = "ParallaxLayer%d" % abs(depth)
	layer.z_index = depth
	add_child(layer)
	move_child(layer, 0)

	var art_scale := VIEW_HEIGHT / float(texture.get_height())
	var scaled_width := float(texture.get_width()) * art_scale
	var overlap := maxf(1.0, scaled_width * horizontal_overlap)
	var stride := scaled_width - overlap
	var maximum_shift := (WORLD_WIDTH - VIEW_WIDTH) * parallax
	var copy_count := int(ceil((VIEW_WIDTH + maximum_shift) / stride)) + 1
	var layer_y := 0.0
	if ground_anchor > 0.0:
		layer_y = GROUND_Y - float(texture.get_height()) * ground_anchor * art_scale

	for index in range(copy_count):
		var sprite := Sprite2D.new()
		sprite.texture = texture
		sprite.centered = false
		sprite.position = Vector2(float(index) * stride, layer_y)
		sprite.scale = Vector2(art_scale, art_scale)
		layer.add_child(sprite)

	_parallax_layers.append({"node": layer, "parallax": parallax})


func _create_ground() -> void:
	var ground_body := StaticBody2D.new()
	ground_body.name = "GroundCollision"
	add_child(ground_body)

	var ground_shape := RectangleShape2D.new()
	ground_shape.size = Vector2(WORLD_WIDTH, VIEW_HEIGHT - GROUND_Y)
	var collision := CollisionShape2D.new()
	collision.shape = ground_shape
	collision.position = Vector2(WORLD_WIDTH * 0.5, GROUND_Y + (VIEW_HEIGHT - GROUND_Y) * 0.5)
	ground_body.add_child(collision)

	var art_scale := GROUND_TILE_WIDTH / float(GROUND_TEXTURE.get_width())
	var tile_width := float(GROUND_TEXTURE.get_width()) * art_scale
	var tile_y := GROUND_Y - GROUND_SURFACE_Y * art_scale
	var tile_count := int(ceil(WORLD_WIDTH / tile_width))

	for index in range(tile_count):
		var sprite := Sprite2D.new()
		sprite.texture = GROUND_TEXTURE
		sprite.centered = false
		sprite.position = Vector2(float(index) * tile_width, tile_y)
		sprite.scale = Vector2(art_scale, art_scale)
		sprite.z_index = 5
		add_child(sprite)


func _create_platforms() -> void:
	for platform in PLATFORM_DATA:
		_create_platform(float(platform["x"]), float(platform["y"]), String(platform["kind"]))


func _create_platform(x: float, y: float, kind: String) -> void:
	var texture: Texture2D
	var art_scale: float
	var surface_x: float
	var surface_y: float
	var surface_width: float

	match kind:
		"long":
			texture = PLATFORM_LONG
			art_scale = 0.068
			surface_x = 83.0
			surface_y = 334.0
			surface_width = 1989.0
		"medium_a":
			texture = PLATFORM_MEDIUM_A
			art_scale = 0.064
			surface_x = 84.0
			surface_y = 405.0
			surface_width = 1603.0
		"medium_b":
			texture = PLATFORM_MEDIUM_B
			art_scale = 0.064
			surface_x = 141.0
			surface_y = 398.0
			surface_width = 1529.0
		"small_a":
			texture = PLATFORM_SMALL_A
			art_scale = 0.055
			surface_x = 126.0
			surface_y = 492.0
			surface_width = 1270.0
		"small_b":
			texture = PLATFORM_SMALL_B
			art_scale = 0.055
			surface_x = 109.0
			surface_y = 499.0
			surface_width = 1319.0
		_:
			return

	var body := StaticBody2D.new()
	body.name = "Platform_%s_%d" % [kind, int(x)]

	var shape := RectangleShape2D.new()
	shape.size = Vector2(surface_width * art_scale, 6.0)
	var collision := CollisionShape2D.new()
	collision.shape = shape
	collision.position = Vector2(x, y + 3.0)
	body.add_child(collision)
	add_child(body)

	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.centered = false
	sprite.position = Vector2(
		x - (surface_x + surface_width * 0.5) * art_scale,
		y - surface_y * art_scale
	)
	sprite.scale = Vector2(art_scale, art_scale)
	sprite.z_index = 5
	add_child(sprite)
