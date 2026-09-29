@tool
extends CharacterBody2D

signal encounter_requested(enemy: CharacterBody2D)
signal attack_impact
signal attack_finished

const IDLE_TEXTURE := preload("res://assets/characters/enemies/forest-savage/idle.png")
const WALK_TEXTURE := preload("res://assets/characters/enemies/forest-savage/walk-sheet.png")
const ATTACK_TEXTURE := preload("res://assets/characters/enemies/forest-savage/attack-sheet.png")

const FRAME_COUNT := 8
const ALPHA_THRESHOLD := 10
const DISPLAY_HEIGHT := 36.0
const WALK_FPS := 10.0
const ATTACK_FPS := 10.0
const ATTACK_IMPACT_FRAME := 5

static var _walk_frames_cache: Array = []
static var _attack_frames_cache: Array = []
static var _walk_scale_cache: float = 0.0
static var _attack_scale_cache: float = 0.0

@export_category("Forest Savage")
@export var enemy_name: String = "Forest Savage"
@export var max_hp: int = 58
@export var attack_damage: int = 9
@export var attack_interval: float = 3.4
@export var xp_reward: int = 42

@export_category("World movement")
@export var patrol_distance: float = 45.0
@export var patrol_speed: float = 20.0
@export var gravity: float = 720.0
@export var max_fall_speed: float = 420.0
@export var starts_facing_left: bool = true

@onready var _visual: Sprite2D = $Visual
@onready var _encounter_area: Area2D = $EncounterArea

var hp: int
var defeated: bool = false
var combat_locked: bool = false

var _home_x: float
var _direction: float = -1.0
var _walk_time: float = 0.0
var _attacking: bool = false
var _attack_time: float = 0.0
var _attack_frame: int = -1
var _impact_emitted: bool = false
var _walk_frames: Array = []
var _attack_frames: Array = []
var _walk_scale: float = 0.0
var _attack_scale: float = 0.0


func _ready() -> void:
	hp = max_hp
	_home_x = global_position.x
	_direction = -1.0 if starts_facing_left else 1.0
	_show_idle()
	_update_facing()

	if Engine.is_editor_hint():
		return

	_prepare_animation_frames()
	_encounter_area.body_entered.connect(_on_encounter_body_entered)


func _process(delta: float) -> void:
	if Engine.is_editor_hint() or not _attacking:
		return

	_attack_time += delta
	var frame := mini(int(floor(_attack_time * ATTACK_FPS)), FRAME_COUNT - 1)
	if frame != _attack_frame:
		_attack_frame = frame
		_show_attack_frame(frame)
		if frame >= ATTACK_IMPACT_FRAME and not _impact_emitted:
			_impact_emitted = true
			attack_impact.emit()

	if _attack_time >= float(FRAME_COUNT) / ATTACK_FPS:
		_attacking = false
		_attack_time = 0.0
		_attack_frame = -1
		_impact_emitted = false
		_show_idle()
		attack_finished.emit()


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint() or defeated or combat_locked or _attacking:
		return

	if not is_on_floor():
		velocity.y = minf(velocity.y + gravity * delta, max_fall_speed)

	if global_position.x < _home_x - patrol_distance:
		_direction = 1.0
	elif global_position.x > _home_x + patrol_distance:
		_direction = -1.0

	velocity.x = _direction * patrol_speed
	_update_facing()
	move_and_slide()

	if absf(velocity.x) > 1.0 and not _walk_frames.is_empty():
		_walk_time += delta
		var frame := int(floor(_walk_time * WALK_FPS)) % FRAME_COUNT
		_show_walk_frame(frame)
	else:
		_walk_time = 0.0
		_show_idle()


func set_combat_locked(locked: bool, player_x: float = global_position.x) -> void:
	combat_locked = locked
	velocity = Vector2.ZERO
	_walk_time = 0.0
	if locked:
		_direction = -1.0 if player_x < global_position.x else 1.0
		_update_facing()
		if not _attacking:
			_show_idle()
	elif not _attacking:
		_show_idle()


func play_attack() -> void:
	if defeated or _attacking:
		return
	combat_locked = true
	velocity = Vector2.ZERO
	_attacking = true
	_attack_time = 0.0
	_attack_frame = 0
	_impact_emitted = false
	_show_attack_frame(0)


func cancel_attack() -> void:
	_attacking = false
	_attack_time = 0.0
	_attack_frame = -1
	_impact_emitted = false
	_show_idle()


func take_damage(amount: int) -> void:
	if defeated:
		return
	hp = maxi(0, hp - amount)
	if hp == 0:
		defeat()


func reset_enemy() -> void:
	defeated = false
	hp = max_hp
	combat_locked = false
	visible = true
	process_mode = Node.PROCESS_MODE_INHERIT
	collision_layer = 1
	collision_mask = 1
	_attacking = false
	_show_idle()


func defeat() -> void:
	defeated = true
	combat_locked = true
	velocity = Vector2.ZERO
	_attacking = false
	visible = false
	process_mode = Node.PROCESS_MODE_DISABLED


func _prepare_animation_frames() -> void:
	if _walk_frames_cache.is_empty():
		_walk_frames_cache = _detect_frames(WALK_TEXTURE, FRAME_COUNT)
		_walk_scale_cache = DISPLAY_HEIGHT / _median_frame_height(_walk_frames_cache)
	if _attack_frames_cache.is_empty():
		_attack_frames_cache = _detect_frames(ATTACK_TEXTURE, FRAME_COUNT)
		_attack_scale_cache = DISPLAY_HEIGHT / _median_frame_height(_attack_frames_cache)

	_walk_frames = _walk_frames_cache
	_attack_frames = _attack_frames_cache
	_walk_scale = _walk_scale_cache
	_attack_scale = _attack_scale_cache


func _show_idle() -> void:
	_visual.texture = IDLE_TEXTURE
	_visual.region_enabled = true
	_visual.region_rect = Rect2(0.0, 0.0, float(IDLE_TEXTURE.get_width()), float(IDLE_TEXTURE.get_height()))
	var art_scale := DISPLAY_HEIGHT / float(IDLE_TEXTURE.get_height())
	_visual.scale = Vector2(art_scale, art_scale)
	_visual.position = Vector2(0.0, 12.0 - float(IDLE_TEXTURE.get_height()) * 0.5 * art_scale)
	_update_facing()


func _show_walk_frame(index: int) -> void:
	if _walk_frames.is_empty():
		_show_idle()
		return
	_apply_frame(WALK_TEXTURE, _walk_frames[index % _walk_frames.size()], _walk_scale)


func _show_attack_frame(index: int) -> void:
	if _attack_frames.is_empty():
		_show_idle()
		return
	_apply_frame(ATTACK_TEXTURE, _attack_frames[index % _attack_frames.size()], _attack_scale)


func _apply_frame(texture: Texture2D, frame: Dictionary, art_scale: float) -> void:
	var rect: Rect2 = frame["rect"]
	var anchor_x := float(frame["anchor_x"])
	var foot_y := float(frame["foot_y"])
	_visual.texture = texture
	_visual.region_enabled = true
	_visual.region_rect = rect
	_visual.scale = Vector2(art_scale, art_scale)
	_visual.position = Vector2(
		(rect.size.x * 0.5 - anchor_x) * art_scale,
		12.0 - (foot_y - rect.size.y * 0.5) * art_scale
	)
	_update_facing()


func _update_facing() -> void:
	if _visual:
		_visual.flip_h = _direction < 0.0


func _on_encounter_body_entered(body: Node) -> void:
	if defeated or combat_locked:
		return
	if body.name != "Player":
		return
	encounter_requested.emit(self)


static func _detect_frames(texture: Texture2D, expected: int) -> Array:
	var image := texture.get_image()
	image.convert(Image.FORMAT_RGBA8)
	var width := image.get_width()
	var height := image.get_height()
	var pixel_count := width * height
	var data := image.get_data()

	var visited := PackedByteArray()
	visited.resize(pixel_count)
	var queue := PackedInt32Array()
	queue.resize(pixel_count)
	var components: Array = []

	for start in range(pixel_count):
		if visited[start] != 0 or data[start * 4 + 3] <= ALPHA_THRESHOLD:
			continue

		var head := 0
		var tail := 0
		queue[tail] = start
		tail += 1
		visited[start] = 1

		var min_x := width
		var min_y := height
		var max_x := -1
		var max_y := -1
		var pixels := 0

		while head < tail:
			var index := queue[head]
			head += 1
			var x := index % width
			var y := int(floor(float(index) / float(width)))
			min_x = mini(min_x, x)
			max_x = maxi(max_x, x)
			min_y = mini(min_y, y)
			max_y = maxi(max_y, y)
			pixels += 1

			for dy in range(-1, 2):
				var ny := y + dy
				if ny < 0 or ny >= height:
					continue
				for dx in range(-1, 2):
					if dx == 0 and dy == 0:
						continue
					var nx := x + dx
					if nx < 0 or nx >= width:
						continue
					var next := ny * width + nx
					if visited[next] != 0 or data[next * 4 + 3] <= ALPHA_THRESHOLD:
						continue
					visited[next] = 1
					queue[tail] = next
					tail += 1

		if pixels > 120:
			components.append({
				"min_x": min_x, "min_y": min_y,
				"max_x": max_x, "max_y": max_y,
				"pixels": pixels,
			})

	components.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return int(a["pixels"]) > int(b["pixels"])
	)

	var selected: Array = []
	for index in range(mini(expected, components.size())):
		selected.append(components[index])

	if selected.size() != expected:
		return _fallback_grid(width, height, expected)

	var ordered: Array = []
	if float(width) / float(height) > 2.2:
		selected.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
			return _center_x(a) < _center_x(b)
		)
		ordered = selected
	else:
		selected.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
			return _center_y(a) < _center_y(b)
		)
		var rows: Array = []
		var row_gap := float(height) * 0.18
		for component in selected:
			if rows.is_empty():
				rows.append([component])
				continue
			var last_row: Array = rows[rows.size() - 1]
			if absf(_center_y(component) - _average_center_y(last_row)) > row_gap:
				rows.append([component])
			else:
				last_row.append(component)

		for row in rows:
			row.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				return _center_x(a) < _center_x(b)
			)
			ordered.append_array(row)

	var frames: Array = []
	for component in ordered:
		var min_x := int(component["min_x"])
		var min_y := int(component["min_y"])
		var max_x := int(component["max_x"])
		var max_y := int(component["max_y"])
		var frame_width := max_x - min_x + 1
		var frame_height := max_y - min_y + 1
		var band_top := maxi(min_y, max_y - maxi(8, int(round(float(frame_height) * 0.22))))
		var min_foot_x := max_x
		var max_foot_x := min_x
		var found_foot := false

		for py in range(band_top, max_y + 1):
			for px in range(min_x, max_x + 1):
				if data[(py * width + px) * 4 + 3] <= ALPHA_THRESHOLD:
					continue
				min_foot_x = mini(min_foot_x, px)
				max_foot_x = maxi(max_foot_x, px)
				found_foot = true

		var anchor_x := float(frame_width) * 0.5
		if found_foot:
			anchor_x = (float(min_foot_x + max_foot_x) * 0.5) - float(min_x)

		frames.append({
			"rect": Rect2(float(min_x), float(min_y), float(frame_width), float(frame_height)),
			"anchor_x": anchor_x,
			"foot_y": float(frame_height),
		})

	return frames


static func _fallback_grid(width: int, height: int, expected: int) -> Array:
	var columns := expected if float(width) / float(height) > 2.4 else mini(4, expected)
	var rows := int(ceil(float(expected) / float(columns)))
	var cell_width := int(floor(float(width) / float(columns)))
	var cell_height := int(floor(float(height) / float(rows)))
	var frames: Array = []

	for index in range(expected):
		var column := index % columns
		var row := int(floor(float(index) / float(columns)))
		var x := column * cell_width
		var y := row * cell_height
		var frame_width := width - x if column == columns - 1 else cell_width
		var frame_height := height - y if row == rows - 1 else cell_height
		frames.append({
			"rect": Rect2(float(x), float(y), float(frame_width), float(frame_height)),
			"anchor_x": float(frame_width) * 0.5,
			"foot_y": float(frame_height),
		})

	return frames


static func _median_frame_height(frames: Array) -> float:
	var heights: Array[float] = []
	for frame in frames:
		var rect: Rect2 = frame["rect"]
		heights.append(rect.size.y)
	heights.sort()
	if heights.is_empty():
		return 1.0
	var middle := heights.size() >> 1
	if heights.size() % 2 == 1:
		return heights[middle]
	return (heights[middle - 1] + heights[middle]) * 0.5


static func _center_x(component: Dictionary) -> float:
	return (float(component["min_x"]) + float(component["max_x"])) * 0.5


static func _center_y(component: Dictionary) -> float:
	return (float(component["min_y"]) + float(component["max_y"])) * 0.5


static func _average_center_y(row: Array) -> float:
	var total := 0.0
	for component in row:
		total += _center_y(component)
	return total / float(row.size())
