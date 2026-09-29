extends Node2D

const WORLD_WIDTH := 2600.0
const VIEW_WIDTH := 480.0
const VIEW_HEIGHT := 270.0
const GROUND_Y := 226.0

const BG_FAR := preload("res://assets/biomes/emerald-forest/bg-far.png")
const BG_MID := preload("res://assets/biomes/emerald-forest/bg-mid.png")
const BG_NEAR := preload("res://assets/biomes/emerald-forest/bg-near.png")

@onready var _player = $Player
@onready var _combat_overlay = $CombatOverlay

var _parallax_layers: Array[Dictionary] = []
var _active_enemy = null


func _ready() -> void:
	_create_backgrounds()
	_configure_camera()
	_connect_encounters()
	_combat_overlay.connect("close_requested", Callable(self, "_end_test_encounter"))


func _process(_delta: float) -> void:
	var camera := get_viewport().get_camera_2d()
	if camera == null:
		return

	var camera_left := camera.get_screen_center_position().x - VIEW_WIDTH * 0.5
	for runtime in _parallax_layers:
		var layer := runtime["node"] as Node2D
		var parallax := float(runtime["parallax"])
		layer.position.x = camera_left * (1.0 - parallax)


func _connect_encounters() -> void:
	for enemy in $Enemies.get_children():
		if enemy.has_signal("encounter_requested"):
			enemy.connect("encounter_requested", Callable(self, "_on_encounter_requested"))


func _on_encounter_requested(enemy) -> void:
	if _active_enemy != null:
		return

	_active_enemy = enemy
	_player.call("set_control", false)
	_player.call("face_toward", enemy.global_position.x)
	enemy.call("set_combat_locked", true, _player.global_position.x)
	_combat_overlay.call(
		"open_for_enemy",
		String(enemy.get("enemy_name")),
		int(enemy.get("hp")),
		int(enemy.get("max_hp")),
		int(enemy.get("attack_damage")),
		float(enemy.get("attack_interval")),
		int(enemy.get("xp_reward"))
	)


func _end_test_encounter() -> void:
	if _active_enemy == null:
		_combat_overlay.call("close_overlay")
		return

	_combat_overlay.call("close_overlay")
	_active_enemy.call("set_combat_locked", false, _player.global_position.x)
	_active_enemy = null
	_player.call("set_control", true)


func _configure_camera() -> void:
	var camera := $Player/Camera2D as Camera2D
	camera.limit_left = 0
	camera.limit_right = int(WORLD_WIDTH)
	camera.limit_top = 0
	camera.limit_bottom = int(VIEW_HEIGHT)
	camera.limit_smoothed = true


func _create_backgrounds() -> void:
	var background_root := $Background as Node2D
	_create_far_layer(background_root, BG_FAR, 0.08, -120)
	_create_repeated_layer(background_root, BG_MID, 0.28, -110, 0.0, 0.0)
	_create_repeated_layer(background_root, BG_NEAR, 0.55, -100, 0.15, 0.85)


func _create_far_layer(
	parent: Node2D,
	texture: Texture2D,
	parallax: float,
	depth: int
) -> void:
	var layer := Node2D.new()
	layer.name = "Far"
	layer.z_index = depth
	parent.add_child(layer)

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
	parent: Node2D,
	texture: Texture2D,
	parallax: float,
	depth: int,
	horizontal_overlap: float,
	ground_anchor: float
) -> void:
	var layer := Node2D.new()
	layer.name = "Layer_%d" % abs(depth)
	layer.z_index = depth
	parent.add_child(layer)

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
