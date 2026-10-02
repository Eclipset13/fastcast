@tool
extends Node2D

signal enter_requested

const FRAME_TEXTURE := preload("res://assets/biomes/emerald-forest/portal/portal-frame-off.png")
const ACTIVE_TEXTURE := preload("res://assets/biomes/emerald-forest/portal/portal-active-sheet.png")

const FRAME_HEIGHT := 202.0
const ENERGY_DISPLAY_WIDTH := 70.0
const ENERGY_SOURCE_WIDTH := 150.0
const ENERGY_SOURCE_HEIGHT := 264.0
const ENERGY_CENTER_OFFSET_Y := 92.0
const ACTIVATION_DURATION := 1.2
const INTERACTION_RADIUS := 68.0
const FRAME_RATE := 10.0
const FRAME_COUNT := 8

const GLOW_COLOR := Color8(109, 201, 119)
const PARTICLE_COLORS := [
	Color8(109, 201, 119),
	Color8(155, 219, 122),
	Color8(156, 227, 134),
	Color8(209, 249, 133),
]

enum PortalState {
	DORMANT,
	ACTIVATING,
	ACTIVE,
}

@onready var _frame: Sprite2D = $Frame
@onready var _energy: Sprite2D = $Energy
@onready var _prompt: Label = $Prompt

var _state: int = PortalState.DORMANT
var _activation_time: float = 0.0
var _animation_time: float = 0.0
var _time_ms: float = 0.0
var _next_particle_at: float = INF
var _player: CharacterBody2D = null

var _outer_alpha: float = 0.0
var _outer_scale: float = 1.0
var _inner_alpha: float = 0.06
var _inner_scale: float = 1.0
var _ground_alpha: float = 0.0

var _orbit_particles: Array[Dictionary] = []
var _particles: Array[Dictionary] = []
var _activation_pulse: Line2D = null
var _activation_pulse_age: float = 0.0
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_configure_art()
	if Engine.is_editor_hint():
		set_process(false)
		return

	_rng.randomize()
	var additive := CanvasItemMaterial.new()
	additive.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = additive

	_prompt.visible = false
	_energy.visible = false
	set_process(true)
	queue_redraw()


func bind_player(player: CharacterBody2D) -> void:
	_player = player


func activate() -> void:
	if Engine.is_editor_hint() or _state != PortalState.DORMANT:
		return

	_state = PortalState.ACTIVATING
	_activation_time = 0.0
	_animation_time = 0.0
	_time_ms = 0.0
	_next_particle_at = 170.0
	_energy.visible = true
	_energy.modulate.a = 0.0
	_create_orbit_particles()
	queue_redraw()


func is_active() -> bool:
	return _state == PortalState.ACTIVE


func _process(delta: float) -> void:
	if Engine.is_editor_hint() or _state == PortalState.DORMANT:
		return

	_animation_time += delta
	_time_ms += delta * 1000.0
	_set_energy_frame(int(floor(_animation_time * FRAME_RATE)) % FRAME_COUNT)

	var pulse: float = 0.92 + sin(_time_ms * 0.0032) * 0.08
	var energy_strength: float = 1.0

	if _state == PortalState.ACTIVATING:
		_activation_time += delta
		var progress: float = clampf(_activation_time / ACTIVATION_DURATION, 0.0, 1.0)
		var vortex_raw: float = clampf((progress - 0.34) / 0.56, 0.0, 1.0)
		var vortex_progress: float = 1.0 - pow(1.0 - vortex_raw, 2.0)
		energy_strength = vortex_progress

		_energy.modulate.a = vortex_progress
		_outer_alpha = vortex_progress * 0.12
		_outer_scale = 0.98 + vortex_progress * 0.14
		_inner_alpha = 0.04 + vortex_progress * 0.20
		_inner_scale = 0.96 + vortex_progress * 0.14
		_ground_alpha = vortex_progress * 0.12

		if progress >= 1.0:
			_finish_activation()
	else:
		_energy.modulate.a = 0.92 + sin(_time_ms * 0.003) * 0.05
		_outer_alpha = 0.11 * pulse
		_outer_scale = 1.02 + sin(_time_ms * 0.0026) * 0.035
		_inner_alpha = 0.21 * pulse
		_inner_scale = 1.06 + sin(_time_ms * 0.0038) * 0.045
		_ground_alpha = 0.11 * pulse

	_update_orbit_particles(delta)
	_update_particles(delta)
	_update_activation_pulse(delta)

	if _time_ms >= _next_particle_at:
		_emit_particle(_state == PortalState.ACTIVE)
		if _state == PortalState.ACTIVE:
			_next_particle_at = _time_ms + float(_rng.randi_range(28, 60))
		else:
			_next_particle_at = _time_ms + float(_rng.randi_range(80, 120))

	_update_prompt()
	queue_redraw()


func _unhandled_input(event: InputEvent) -> void:
	if Engine.is_editor_hint() or _state != PortalState.ACTIVE:
		return
	if _player == null or not _is_player_nearby():
		return
	if not (event is InputEventKey):
		return

	var key_event := event as InputEventKey
	if key_event.pressed and not key_event.echo and key_event.keycode == KEY_E:
		enter_requested.emit()
		get_viewport().set_input_as_handled()


func _draw() -> void:
	if _state == PortalState.DORMANT:
		return

	var center := Vector2(0.0, -ENERGY_CENTER_OFFSET_Y)

	_draw_soft_ellipse(center, 82.0 * _outer_scale, 92.0 * _outer_scale, GLOW_COLOR, _outer_alpha, 14)
	_draw_soft_ellipse(center, 55.0 * _inner_scale, 72.0 * _inner_scale, Color8(143, 224, 126), _inner_alpha, 12)
	_draw_soft_ellipse(Vector2(0.0, -5.0), 90.0, 18.0, GLOW_COLOR, _ground_alpha, 10)

	for particle in _orbit_particles:
		var angle: float = float(particle["angle"])
		var radius: float = float(particle["radius"]) + sin(_time_ms * 0.0022 + float(particle["phase"])) * 3.4
		var point := center + Vector2(
			cos(angle) * radius,
			sin(angle) * radius * float(particle["vertical_scale"])
		)
		if not _inside_opening(point):
			continue

		var spin: float = angle + _time_ms * 0.0028 * float(particle["spin"])
		var scale_value: float = 1.0 + sin(_time_ms * 0.006 + float(particle["phase"])) * 0.7
		var alpha: float = float(particle["strength"]) * float(particle["base_alpha"]) * (
			0.9 + sin(_time_ms * 0.004 + float(particle["phase"])) * 0.28
		)
		var size: float = float(particle["size"]) * scale_value
		var color_index: int = int(particle["color_index"])
		var base_color: Color = PARTICLE_COLORS[color_index]
		var color := Color(base_color.r, base_color.g, base_color.b, alpha)

		draw_set_transform(point, spin, Vector2.ONE)
		draw_rect(Rect2(Vector2(-size * 0.5, -size * 0.5), Vector2(size, size)), color)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_soft_ellipse(
	center: Vector2,
	radius_x: float,
	radius_y: float,
	color: Color,
	alpha: float,
	steps: int
) -> void:
	if alpha <= 0.0 or steps <= 0:
		return

	# Draw from the faint outer edge toward the core. Each layer is deliberately
	# low-alpha so additive blending builds a smooth falloff instead of a disc.
	for index in range(steps):
		var t: float = float(index) / float(maxi(steps - 1, 1))
		var scale_value: float = lerpf(1.0, 0.34, t)
		var layer_alpha: float = alpha * lerpf(0.025, 0.12, t * t)
		draw_set_transform(
			center,
			0.0,
			Vector2(radius_x * scale_value, radius_y * scale_value)
		)
		draw_circle(
			Vector2.ZERO,
			1.0,
			Color(color.r, color.g, color.b, layer_alpha)
		)

	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _finish_activation() -> void:
	if _state == PortalState.ACTIVE:
		return

	_state = PortalState.ACTIVE
	_next_particle_at = _time_ms
	_create_activation_pulse()


func _create_orbit_particles() -> void:
	if not _orbit_particles.is_empty():
		return

	var count: int = 52
	for index in range(count):
		var size: float = 6.0 if index % 8 == 0 else (4.0 if index % 4 == 0 else 2.0)
		_orbit_particles.append({
			"angle": float(index) / float(count) * TAU + _rng.randf_range(-0.18, 0.18),
			"radius": _rng.randf_range(16.0, 42.0),
			"vertical_scale": _rng.randf_range(1.2, 1.8),
			"speed": _rng.randf_range(0.5, 1.2),
			"phase": _rng.randf_range(0.0, TAU),
			"base_alpha": _rng.randf_range(0.7, 1.1),
			"spin": _rng.randf_range(-1.4, 1.4),
			"size": size,
			"color_index": index % PARTICLE_COLORS.size(),
			"strength": 0.0,
		})


func _update_orbit_particles(delta: float) -> void:
	var strength: float = 1.0
	if _state == PortalState.ACTIVATING:
		var progress: float = clampf(_activation_time / ACTIVATION_DURATION, 0.0, 1.0)
		var raw: float = clampf((progress - 0.34) / 0.56, 0.0, 1.0)
		strength = 1.0 - pow(1.0 - raw, 2.0)

	for index in range(_orbit_particles.size()):
		var particle: Dictionary = _orbit_particles[index]
		particle["angle"] = float(particle["angle"]) + float(particle["speed"]) * delta * 1.2
		particle["strength"] = strength
		_orbit_particles[index] = particle


func _emit_particle(full_strength: bool) -> void:
	var burst_count: int = _rng.randi_range(14, 26) if full_strength else _rng.randi_range(6, 10)
	var center := Vector2(0.0, -ENERGY_CENTER_OFFSET_Y)

	for _index in range(burst_count):
		var angle: float = _rng.randf_range(-PI, PI)
		var base_position := center + Vector2(
			cos(angle) * float(_rng.randi_range(8, 30)),
			sin(angle) * float(_rng.randi_range(10, 42))
		)
		var leaf: bool = _rng.randf() < 0.28
		var width: float
		var height: float
		if leaf:
			width = 8.0
			height = 3.0
		else:
			width = 5.0 if _rng.randf() < 0.35 else 2.0
			height = 5.0 if _rng.randf() < 0.35 else 2.0

		var color_index: int = 3 if _rng.randf() < 0.12 else _rng.randi_range(0, 2)
		var shape := Polygon2D.new()
		shape.polygon = PackedVector2Array([
			Vector2(-width * 0.5, -height * 0.5),
			Vector2(width * 0.5, -height * 0.5),
			Vector2(width * 0.5, height * 0.5),
			Vector2(-width * 0.5, height * 0.5),
		])
		shape.color = PARTICLE_COLORS[color_index]
		shape.position = base_position
		shape.rotation = _rng.randf_range(-0.6, 0.6) if leaf else angle
		shape.modulate.a = 0.95 if full_strength else 0.55
		shape.z_index = 5
		var additive := CanvasItemMaterial.new()
		additive.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		shape.material = additive
		add_child(shape)

		var duration: float = float(_rng.randi_range(420, 1100)) / 1000.0
		var drift := Vector2(
			cos(angle) * float(_rng.randi_range(52, 128)),
			sin(angle) * float(_rng.randi_range(38, 92)) - float(_rng.randi_range(18, 54))
		)
		_particles.append({
			"node": shape,
			"start": base_position,
			"delta": drift,
			"start_rotation": shape.rotation,
			"rotation_delta": _rng.randf_range(-2.6, 2.6),
			"start_scale": 1.5 if leaf else 1.0,
			"start_alpha": 1.0 if full_strength else 0.55,
			"age": 0.0,
			"duration": duration,
		})


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
		var sine_out: float = sin(t * PI * 0.5)
		node.position = (particle["start"] as Vector2) + (particle["delta"] as Vector2) * sine_out
		node.rotation = float(particle["start_rotation"]) + float(particle["rotation_delta"]) * sine_out
		var scale_value: float = lerpf(float(particle["start_scale"]), 0.0, sine_out)
		node.scale = Vector2.ONE * scale_value
		node.modulate.a = lerpf(float(particle["start_alpha"]), 0.0, sine_out)
		particle["age"] = age

		if t >= 1.0:
			node.queue_free()
			_particles.remove_at(index)
		else:
			_particles[index] = particle


func _create_activation_pulse() -> void:
	if _activation_pulse != null and is_instance_valid(_activation_pulse):
		_activation_pulse.queue_free()

	_activation_pulse = Line2D.new()
	_activation_pulse.width = 2.0
	_activation_pulse.default_color = Color(156.0 / 255.0, 227.0 / 255.0, 134.0 / 255.0, 0.7)
	_activation_pulse.z_index = 6

	var points := PackedVector2Array()
	for index in range(49):
		var angle: float = TAU * float(index) / 48.0
		points.append(Vector2(cos(angle) * 43.0, sin(angle) * 62.0))
	_activation_pulse.points = points
	_activation_pulse.position = Vector2(0.0, -ENERGY_CENTER_OFFSET_Y)

	var additive := CanvasItemMaterial.new()
	additive.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_activation_pulse.material = additive
	add_child(_activation_pulse)
	_activation_pulse_age = 0.0


func _update_activation_pulse(delta: float) -> void:
	if _activation_pulse == null or not is_instance_valid(_activation_pulse):
		return

	_activation_pulse_age += delta
	var t: float = clampf(_activation_pulse_age / 0.36, 0.0, 1.0)
	var eased: float = sin(t * PI * 0.5)
	_activation_pulse.scale = Vector2.ONE * lerpf(1.0, 1.32, eased)
	_activation_pulse.modulate.a = 1.0 - eased

	if t >= 1.0:
		_activation_pulse.queue_free()
		_activation_pulse = null


func _inside_opening(point: Vector2) -> bool:
	if point.x < -34.0 or point.x > 34.0 or point.y < -138.0 or point.y > -33.0:
		return false

	if point.y < -110.0 and absf(point.x) > 6.0:
		var corner_x: float = 6.0 if point.x > 0.0 else -6.0
		return Vector2(point.x - corner_x, point.y + 110.0).length() <= 28.0

	if point.y > -41.0 and absf(point.x) > 26.0:
		var corner_x: float = 26.0 if point.x > 0.0 else -26.0
		return Vector2(point.x - corner_x, point.y + 41.0).length() <= 8.0

	return true


func _configure_art() -> void:
	if _frame == null or _energy == null:
		return

	_frame.texture = FRAME_TEXTURE
	var frame_scale: float = FRAME_HEIGHT / float(FRAME_TEXTURE.get_height())
	_frame.scale = Vector2(frame_scale, frame_scale)
	_frame.position = Vector2(0.0, -float(FRAME_TEXTURE.get_height()) * frame_scale * 0.5)

	_energy.texture = ACTIVE_TEXTURE
	_energy.region_enabled = true
	var energy_scale: float = ENERGY_DISPLAY_WIDTH / ENERGY_SOURCE_WIDTH
	_energy.scale = Vector2(energy_scale, energy_scale)
	_energy.position = Vector2(
		0.0,
		-30.0 - ENERGY_SOURCE_HEIGHT * energy_scale * 0.5
	)
	_set_energy_frame(0)


func _set_energy_frame(frame: int) -> void:
	if _energy == null:
		return

	var column: int = frame % 4
	var row: int = frame >> 2
	var row_offset: float = 0.0 if row == 0 else -8.0
	_energy.region_rect = Rect2(
		float(column * 362 + 106),
		float(row * 543 + 189) + row_offset,
		ENERGY_SOURCE_WIDTH,
		ENERGY_SOURCE_HEIGHT
	)


func _update_prompt() -> void:
	if _prompt == null:
		return
	_prompt.visible = _state == PortalState.ACTIVE and _is_player_nearby()


func _is_player_nearby() -> bool:
	if _player == null or not is_instance_valid(_player):
		return false

	var center := global_position + Vector2(0.0, -18.0)
	return _player.global_position.distance_to(center) <= INTERACTION_RADIUS
