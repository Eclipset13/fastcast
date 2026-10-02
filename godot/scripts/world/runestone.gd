extends Node2D

signal spellcraft_requested

const STONE_TEXTURE := preload("res://assets/biomes/emerald-forest/props/runestone-start.png")
const INTERACTION_RADIUS := 72.0
const ART_SCALE := 0.06

const COLOR_IDLE_RUNES := Color8(15, 68, 61)
const COLOR_LIT_RUNES := Color8(209, 249, 133)
const COLOR_AURA_NEAR := Color(156.0 / 255.0, 227.0 / 255.0, 134.0 / 255.0, 0.36)
const COLOR_AURA_FAR := Color(109.0 / 255.0, 201.0 / 255.0, 119.0 / 255.0, 0.10)
const DUST_COLORS := [
	Color8(209, 249, 133),
	Color8(209, 249, 133),
	Color8(156, 227, 134),
	Color8(155, 219, 122),
	Color8(109, 201, 119),
]

enum ShrineState {
	IDLE,
	NEARBY,
	MENU_OPEN,
	DEACTIVATING,
}

@onready var _stone: Sprite2D = $Stone
@onready var _prompt: Label = $Prompt
@onready var _legacy_glow: Polygon2D = $Glow

var _player: CharacterBody2D = null
var _state: int = ShrineState.IDLE
var _inside_range: bool = false
var _time_ms: float = 0.0
var _next_idle_particle_at: float = 0.0
var _success_glow_until: float = 0.0
var _deactivation_until: float = 0.0

var _glow_intensity: float = 0.0
var _fade_from: float = 0.0
var _fade_to: float = 0.0
var _fade_elapsed: float = 0.0
var _fade_duration: float = 0.0

var _idle_runes: Sprite2D = null
var _rune_glow: Sprite2D = null
var _aura: Sprite2D = null
var _particles: Array[Dictionary] = []
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.randomize()
	_configure_art()
	_create_rune_overlays()
	_prompt.visible = false
	_legacy_glow.visible = false


func bind_player(player: CharacterBody2D) -> void:
	_player = player


func set_menu_open(open: bool) -> void:
	if open:
		if _state == ShrineState.NEARBY:
			_state = ShrineState.MENU_OPEN
			_prompt.visible = false
		return

	if _state != ShrineState.MENU_OPEN:
		return

	if _is_player_inside_range():
		_activate()
	else:
		_deactivate()


func notify_upgrade_purchased() -> void:
	if _state != ShrineState.MENU_OPEN and _state != ShrineState.NEARBY:
		return
	_success_glow_until = _time_ms + 500.0
	_emit_burst(14, false)


func _process(delta: float) -> void:
	_time_ms += delta * 1000.0
	_inside_range = _is_player_inside_range()

	if _inside_range and (_state == ShrineState.IDLE or _state == ShrineState.DEACTIVATING):
		_activate()
	elif not _inside_range and (_state == ShrineState.NEARBY or _state == ShrineState.MENU_OPEN):
		_deactivate()

	if _state == ShrineState.DEACTIVATING and _time_ms >= _deactivation_until:
		_state = ShrineState.IDLE

	_update_glow_fade(delta)

	var pulse: float = 0.925 + sin(_time_ms * 0.0022) * 0.075
	var success_boost: float = maxf(0.0, (_success_glow_until - _time_ms) / 500.0) * 0.3
	var rune_alpha: float = _glow_intensity * minf(1.0, pulse + success_boost)
	var aura_alpha: float = _glow_intensity * minf(1.0, pulse * 0.75 + success_boost)

	if _rune_glow != null:
		_rune_glow.modulate.a = rune_alpha
	if _aura != null:
		_aura.modulate.a = aura_alpha

	var active: bool = _state == ShrineState.NEARBY or _state == ShrineState.MENU_OPEN
	if active and _state == ShrineState.NEARBY:
		_prompt.visible = true
	else:
		_prompt.visible = false

	if active and _time_ms >= _next_idle_particle_at:
		_emit_idle_particle()
		_next_idle_particle_at = _time_ms + float(_rng.randi_range(280, 520))

	_update_particles(delta)


func _unhandled_input(event: InputEvent) -> void:
	if _state != ShrineState.NEARBY:
		return
	if not (event is InputEventKey):
		return

	var key_event := event as InputEventKey
	if key_event.pressed and not key_event.echo and key_event.keycode == KEY_E:
		_state = ShrineState.MENU_OPEN
		_prompt.visible = false
		spellcraft_requested.emit()
		get_viewport().set_input_as_handled()


func _activate() -> void:
	_state = ShrineState.NEARBY
	_fade_glow(1.0, 0.18)
	_prompt.visible = true
	_next_idle_particle_at = _time_ms + 120.0


func _deactivate() -> void:
	if _state == ShrineState.DEACTIVATING or _state == ShrineState.IDLE:
		return

	_state = ShrineState.DEACTIVATING
	_prompt.visible = false
	_fade_glow(0.0, 0.36)
	_emit_burst(64, true)
	_deactivation_until = _time_ms + 180.0


func _fade_glow(target: float, duration: float) -> void:
	_fade_from = _glow_intensity
	_fade_to = target
	_fade_elapsed = 0.0
	_fade_duration = maxf(duration, 0.001)


func _update_glow_fade(delta: float) -> void:
	if absf(_glow_intensity - _fade_to) <= 0.0001 and _fade_elapsed >= _fade_duration:
		return

	_fade_elapsed = minf(_fade_elapsed + delta, _fade_duration)
	var t: float = clampf(_fade_elapsed / _fade_duration, 0.0, 1.0)
	var eased: float = 0.5 - cos(t * PI) * 0.5
	_glow_intensity = lerpf(_fade_from, _fade_to, eased)


func _emit_idle_particle() -> void:
	var particle := _create_particle(
		Vector2(
			_rng.randi_range(-10, 10),
			_rune_center_local_y() + float(_rng.randi_range(-10, 12))
		),
		1
	)
	_start_particle(
		particle,
		Vector2(
			_rng.randi_range(-4, 4),
			-_rng.randi_range(8, 17)
		),
		float(_rng.randi_range(800, 1200)) / 1000.0
	)


func _emit_burst(count: int, large: bool) -> void:
	for index in range(count):
		var angle: float = _rng.randf_range(0.0, TAU)
		var distance: float
		if index % 3 == 0:
			distance = float(_rng.randi_range(8, 20))
		else:
			distance = float(_rng.randi_range(20, 49 if large else 28))

		var size_choices := [1, 1, 1, 1, 2, 2, 3]
		var size: int = int(size_choices[_rng.randi_range(0, size_choices.size() - 1)])
		var particle := _create_particle(
			Vector2(
				_rng.randi_range(-8, 8),
				_rune_center_local_y() + float(_rng.randi_range(-16, 16))
			),
			size
		)
		var drift := Vector2(
			cos(angle) * distance,
			sin(angle) * distance - float(_rng.randi_range(8, 20))
		)
		var duration_ms: int = _rng.randi_range(500 if large else 450, 1400 if large else 1000)
		_start_particle(particle, drift, float(duration_ms) / 1000.0)


func _create_particle(position: Vector2, size: int) -> Dictionary:
	var shape := Polygon2D.new()
	shape.polygon = PackedVector2Array([
		Vector2.ZERO,
		Vector2(float(size), 0.0),
		Vector2(float(size), float(size)),
		Vector2(0.0, float(size)),
	])
	shape.color = DUST_COLORS[_rng.randi_range(0, DUST_COLORS.size() - 1)]
	shape.position = Vector2(round(position.x), round(position.y))
	shape.z_index = 4
	add_child(shape)

	return {
		"node": shape,
		"start": shape.position,
		"delta": Vector2.ZERO,
		"age": 0.0,
		"duration": 1.0,
	}


func _start_particle(particle: Dictionary, drift: Vector2, duration: float) -> void:
	particle["delta"] = drift
	particle["duration"] = duration
	_particles.append(particle)


func _update_particles(delta: float) -> void:
	for index in range(_particles.size() - 1, -1, -1):
		var particle: Dictionary = _particles[index]
		var node := particle["node"] as Polygon2D
		if node == null or not is_instance_valid(node):
			_particles.remove_at(index)
			continue

		var age: float = float(particle["age"]) + delta
		var duration: float = float(particle["duration"])
		var t: float = clampf(age / duration, 0.0, 1.0)
		var travel: float = 1.0 - pow(1.0 - t, 2.0)
		var start := particle["start"] as Vector2
		var drift := particle["delta"] as Vector2
		var position := start + drift * travel
		node.position = Vector2(round(position.x), round(position.y))
		node.modulate.a = 1.0 - t * t
		particle["age"] = age

		if t >= 1.0:
			node.queue_free()
			_particles.remove_at(index)
		else:
			_particles[index] = particle


func _rune_center_local_y() -> float:
	return -float(STONE_TEXTURE.get_height()) * ART_SCALE * 0.52


func _is_player_inside_range() -> bool:
	if _player == null or not is_instance_valid(_player):
		return false
	var center := global_position + Vector2(0.0, _rune_center_local_y())
	return _player.global_position.distance_to(center) <= INTERACTION_RADIUS


func _configure_art() -> void:
	_stone.texture = STONE_TEXTURE
	_stone.scale = Vector2(ART_SCALE, ART_SCALE)
	_stone.position = Vector2(
		0.0,
		-float(STONE_TEXTURE.get_height()) * ART_SCALE * 0.5
	)


func _create_rune_overlays() -> void:
	var source: Image = STONE_TEXTURE.get_image()
	if source == null or source.is_empty():
		return
	source.convert(Image.FORMAT_RGBA8)

	var width: int = source.get_width()
	var height: int = source.get_height()
	var idle_source := Image.create(width, height, false, Image.FORMAT_RGBA8)
	var lit_source := Image.create(width, height, false, Image.FORMAT_RGBA8)
	idle_source.fill(Color.TRANSPARENT)
	lit_source.fill(Color.TRANSPARENT)

	var start_y: int = int(floor(float(height) * 0.28))
	var end_y: int = int(ceil(float(height) * 0.78))
	var start_x: int = int(floor(float(width) * 0.40))
	var end_x: int = int(ceil(float(width) * 0.635))

	for y in range(start_y, end_y):
		for x in range(start_x, end_x):
			var color := source.get_pixel(x, y)
			var r: float = color.r * 255.0
			var g: float = color.g * 255.0
			var b: float = color.b * 255.0
			var a: float = color.a * 255.0
			if a > 160.0 and r > 135.0 and g > 165.0 and r > b * 1.2 and g > b * 1.15:
				idle_source.set_pixel(x, y, COLOR_IDLE_RUNES)
				lit_source.set_pixel(x, y, COLOR_LIT_RUNES)

	var display_width: int = maxi(1, int(round(float(width) * ART_SCALE)))
	var display_height: int = maxi(1, int(round(float(height) * ART_SCALE)))
	idle_source.resize(display_width, display_height, Image.INTERPOLATE_NEAREST)
	lit_source.resize(display_width, display_height, Image.INTERPOLATE_NEAREST)

	var aura_image := Image.create(display_width, display_height, false, Image.FORMAT_RGBA8)
	aura_image.fill(Color.TRANSPARENT)

	for y in range(display_height):
		for x in range(display_width):
			if lit_source.get_pixel(x, y).a > 0.0:
				continue

			var distance: int = 3
			for dy in range(-2, 3):
				for dx in range(-2, 3):
					var nx: int = x + dx
					var ny: int = y + dy
					if nx < 0 or nx >= display_width or ny < 0 or ny >= display_height:
						continue
					if lit_source.get_pixel(nx, ny).a <= 0.0:
						continue
					distance = mini(distance, absi(dx) + absi(dy))

			if distance == 1:
				aura_image.set_pixel(x, y, COLOR_AURA_NEAR)
			elif distance == 2:
				aura_image.set_pixel(x, y, COLOR_AURA_FAR)

	_idle_runes = Sprite2D.new()
	_idle_runes.texture = ImageTexture.create_from_image(idle_source)
	_idle_runes.position = _stone.position
	_idle_runes.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_idle_runes.z_index = 1
	add_child(_idle_runes)

	_rune_glow = Sprite2D.new()
	_rune_glow.texture = ImageTexture.create_from_image(lit_source)
	_rune_glow.position = _stone.position
	_rune_glow.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_rune_glow.z_index = 2
	_rune_glow.modulate.a = 0.0
	add_child(_rune_glow)

	_aura = Sprite2D.new()
	_aura.texture = ImageTexture.create_from_image(aura_image)
	_aura.position = _stone.position
	_aura.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_aura.z_index = 2
	_aura.modulate.a = 0.0
	var additive := CanvasItemMaterial.new()
	additive.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_aura.material = additive
	add_child(_aura)
