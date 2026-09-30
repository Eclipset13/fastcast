extends Node2D

signal objective_changed(message: String)
signal toast_requested(message: String)

const WORLD_WIDTH := 2600.0
const VIEW_WIDTH := 480.0
const VIEW_HEIGHT := 270.0
const GROUND_Y := 226.0

const BODY_HALF_HEIGHT := 12.0
const BATTLE_TARGET_SPACING := 132.0
const BATTLE_MIN_SPACING := 24.0
const BATTLE_SEARCH_RADIUS := 170.0
const BATTLE_SAMPLE_STEP := 4.0
const BATTLE_SURFACE_TOLERANCE := 5.0
const BATTLE_EDGE_MARGIN := 18.0

const BG_FAR := preload("res://assets/biomes/emerald-forest/bg-far.png")
const BG_MID := preload("res://assets/biomes/emerald-forest/bg-mid.png")
const BG_NEAR := preload("res://assets/biomes/emerald-forest/bg-near.png")

@onready var _player: CharacterBody2D = $Player
@onready var _combat_overlay = $CombatOverlay
@onready var _combat_controller = $CombatController
@onready var _portal: Node2D = $Portals/ForestExitPortal
@onready var _runestone: Node2D = $Decorations/RunestoneStart
@onready var _spellcraft_overlay: CanvasLayer = $SpellcraftOverlay

var _parallax_layers: Array[Dictionary] = []


func _ready() -> void:
	_create_backgrounds()
	_configure_camera()
	_connect_encounters()
	_portal.call("bind_player", _player)
	_portal.connect("enter_requested", Callable(self, "_on_portal_enter_requested"))
	_runestone.call("bind_player", _player)
	_runestone.connect("spellcraft_requested", Callable(self, "_on_spellcraft_requested"))
	_spellcraft_overlay.connect("closed", Callable(self, "_on_spellcraft_closed"))
	_spellcraft_overlay.connect("upgrade_purchased", Callable(self, "_on_spell_upgraded"))
	_combat_controller.connect("battle_finished", Callable(self, "_on_battle_finished"))
	call_deferred("_refresh_room_progress")


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


func _on_encounter_requested(enemy: CharacterBody2D) -> void:
	var standing_on_enemy := bool(_player.call("is_standing_on_body", enemy))
	if standing_on_enemy and not _stage_stacked_encounter(enemy):
		enemy.call("cancel_encounter_request")
		return

	_combat_controller.call("start", enemy, _player, _combat_overlay)


func _stage_stacked_encounter(enemy: CharacterBody2D) -> bool:
	var surface_y: float = enemy.global_position.y + BODY_HALF_HEIGHT
	var center_x: float = enemy.global_position.x
	var candidates: Array[Vector2] = []

	var start_x: float = maxf(BATTLE_EDGE_MARGIN, center_x - BATTLE_SEARCH_RADIUS)
	var end_x: float = minf(WORLD_WIDTH - BATTLE_EDGE_MARGIN, center_x + BATTLE_SEARCH_RADIUS)
	var sample_count: int = int(floor((end_x - start_x) / BATTLE_SAMPLE_STEP)) + 1

	for index in range(sample_count):
		var x: float = start_x + float(index) * BATTLE_SAMPLE_STEP
		var support: Variant = _find_battle_support(x, surface_y, enemy)
		if support is Vector2:
			candidates.append(support as Vector2)

	if candidates.size() < 2:
		return false

	var best_left: Vector2 = Vector2.ZERO
	var best_right: Vector2 = Vector2.ZERO
	var best_spacing: float = -1.0
	var best_center_error: float = INF

	for left_index in range(candidates.size()):
		for right_index in range(left_index + 1, candidates.size()):
			var left: Vector2 = candidates[left_index]
			var right: Vector2 = candidates[right_index]
			var spacing: float = right.x - left.x
			if spacing < BATTLE_MIN_SPACING or spacing > BATTLE_TARGET_SPACING + BATTLE_SAMPLE_STEP:
				continue
			if absf(left.y - right.y) > BATTLE_SURFACE_TOLERANCE:
				continue

			var pair_center: float = (left.x + right.x) * 0.5
			var center_error: float = absf(pair_center - center_x)
			var better_spacing: bool = spacing > best_spacing + 0.1
			var same_spacing_better_center: bool = (
				absf(spacing - best_spacing) <= 0.1
				and center_error < best_center_error
			)
			if better_spacing or same_spacing_better_center:
				best_spacing = spacing
				best_center_error = center_error
				best_left = left
				best_right = right

	if best_spacing < BATTLE_MIN_SPACING:
		return false

	var player_was_right: bool = _player.global_position.x > enemy.global_position.x + 1.0
	var player_position: Vector2 = best_right if player_was_right else best_left
	var enemy_position: Vector2 = best_left if player_was_right else best_right

	_player.call("prepare_for_battle_position", player_position)
	enemy.call("prepare_for_battle_position", enemy_position)
	return true


func _find_battle_support(
	x: float,
	reference_surface_y: float,
	enemy: CharacterBody2D
) -> Variant:
	var ray_from: Vector2 = Vector2(x, reference_surface_y - 18.0)
	var ray_to: Vector2 = Vector2(x, reference_surface_y + 26.0)
	var exclude: Array[RID] = [_player.get_rid(), enemy.get_rid()]
	var query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(
		ray_from,
		ray_to,
		1,
		exclude
	)
	query.collide_with_areas = false
	query.collide_with_bodies = true

	var hit: Dictionary = get_world_2d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return null

	var collider: Object = hit.get("collider") as Object
	if collider is CharacterBody2D:
		return null

	var hit_position: Vector2 = hit["position"] as Vector2
	if absf(hit_position.y - reference_surface_y) > BATTLE_SURFACE_TOLERANCE:
		return null

	return Vector2(x, hit_position.y - BODY_HALF_HEIGHT)


func _on_battle_finished(victory: bool, _xp: int) -> void:
	if victory:
		_refresh_room_progress()


func _refresh_room_progress() -> void:
	var total: int = 0
	var defeated: int = 0

	for enemy in $Enemies.get_children():
		if not (enemy is CharacterBody2D):
			continue
		total += 1
		if bool(enemy.get("defeated")):
			defeated += 1

	if total > 0 and defeated >= total:
		objective_changed.emit("PORTAL AWAKENED")
		_portal.call("activate")
	else:
		objective_changed.emit("DEFEAT THE FOREST GUARDIANS")


func _on_portal_enter_requested() -> void:
	if bool(_combat_controller.get("active")):
		return
	toast_requested.emit("THE PATH BEYOND IS NOT YET FORMED.")


func _on_spellcraft_requested() -> void:
	if bool(_combat_controller.get("active")):
		return

	_player.call("set_control", false)
	_runestone.call("set_menu_open", true)
	_spellcraft_overlay.call("open", _combat_controller)


func _on_spellcraft_closed() -> void:
	_runestone.call("set_menu_open", false)
	_player.call("set_control", true)


func _on_spell_upgraded(spell_id: String) -> void:
	var preview: Dictionary = _combat_controller.call("get_spell_preview", spell_id)
	if preview.is_empty():
		return
	toast_requested.emit("%s UPGRADED · RANK %d" % [
		String(preview["name"]).to_upper(),
		int(preview["rank"]),
	])


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
