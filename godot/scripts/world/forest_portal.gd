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
var _orbit_phase: float = 0.0
var _activation_burst: float = 0.0
var _player: CharacterBody2D = null


func _ready() -> void:
	_configure_art()
	if Engine.is_editor_hint():
		set_process(false)
		return

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
	_activation_burst = 1.0
	_energy.visible = true
	_energy.modulate.a = 0.0
	queue_redraw()


func is_active() -> bool:
	return _state == PortalState.ACTIVE


func _process(delta: float) -> void:
	if Engine.is_editor_hint() or _state == PortalState.DORMANT:
		return

	_animation_time += delta
	_orbit_phase += delta * 0.9
	_activation_burst = maxf(0.0, _activation_burst - delta * 0.72)
	_set_energy_frame(int(floor(_animation_time * FRAME_RATE)) % FRAME_COUNT)

	if _state == PortalState.ACTIVATING:
		_activation_time += delta
		var progress: float = clampf(_activation_time / ACTIVATION_DURATION, 0.0, 1.0)
		var eased: float = 1.0 - pow(1.0 - progress, 2.0)
		_energy.modulate.a = eased
		_frame.modulate = Color(1.0, 1.0 + eased * 0.08, 1.0, 1.0)
		if progress >= 1.0:
			_state = PortalState.ACTIVE
	else:
		var pulse: float = 0.92 + sin(Time.get_ticks_msec() * 0.0032) * 0.08
		_energy.modulate.a = pulse

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

	var strength: float = 1.0
	if _state == PortalState.ACTIVATING:
		strength = clampf(_activation_time / ACTIVATION_DURATION, 0.0, 1.0)

	var pulse: float = 0.92 + sin(Time.get_ticks_msec() * 0.0032) * 0.08
	var center := Vector2(0.0, -ENERGY_CENTER_OFFSET_Y)

	# Layered portal bloom.
	draw_set_transform(center, 0.0, Vector2(1.0, 1.18))
	draw_circle(Vector2.ZERO, 62.0, Color(0.34, 0.78, 0.42, 0.10 * strength * pulse))
	draw_circle(Vector2.ZERO, 48.0, Color(0.43, 0.86, 0.47, 0.13 * strength * pulse))
	draw_circle(Vector2.ZERO, 34.0, Color(0.68, 0.96, 0.56, 0.14 * strength * pulse))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	# Ground spill makes the portal feel connected to the floor.
	draw_set_transform(Vector2(0.0, -5.0), 0.0, Vector2(1.0, 0.22))
	draw_circle(Vector2.ZERO, 76.0, Color(0.43, 0.79, 0.47, 0.11 * strength))
	draw_circle(Vector2.ZERO, 52.0, Color(0.65, 0.93, 0.52, 0.08 * strength))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	# Two layers of orbiting magical fragments.
	for index in range(30):
		var direction: float = -1.0 if index % 2 else 1.0
		var angle: float = _orbit_phase * direction * (0.66 + float(index % 5) * 0.055) + TAU * float(index) / 30.0
		var radius_x: float = 20.0 + float((index * 7) % 31)
		var radius_y: float = 27.0 + float((index * 11) % 39)
		var point := center + Vector2(cos(angle) * radius_x, sin(angle) * radius_y)
		var twinkle: float = 0.62 + sin(_animation_time * 4.2 + float(index) * 1.37) * 0.28
		var size: float = 1.0 if index % 6 else 2.0
		var color := Color(0.64, 0.95, 0.54, maxf(0.0, twinkle) * 0.66 * strength)
		draw_rect(Rect2(point - Vector2.ONE * size * 0.5, Vector2.ONE * size), color)

	# Sparks rise through and above the arch.
	for index in range(22):
		var speed: float = 0.12 + float(index % 6) * 0.014
		var phase: float = fposmod(_animation_time * speed + float(index) * 0.103, 1.0)
		var base_x: float = sin(float(index) * 14.31) * 39.0
		var drift: float = sin(_animation_time * (0.72 + float(index % 4) * 0.08) + float(index) * 0.9) * 6.0
		var point := Vector2(base_x + drift, -18.0 - phase * 176.0)
		var fade: float = sin(phase * PI)
		var size: float = 1.0 if index % 5 else 2.0
		var alpha: float = fade * (0.24 + float(index % 4) * 0.065) * strength
		draw_rect(
			Rect2(point - Vector2.ONE * size * 0.5, Vector2.ONE * size),
			Color(0.59, 0.95, 0.46, alpha)
		)

	# Fast edge sparks trace the outer portal silhouette.
	for index in range(12):
		var angle: float = -_animation_time * (1.0 + float(index % 3) * 0.08) + TAU * float(index) / 12.0
		var point := center + Vector2(cos(angle) * 54.0, sin(angle) * 74.0)
		var alpha: float = (0.28 + sin(_animation_time * 5.0 + float(index)) * 0.16) * strength
		draw_rect(Rect2(point - Vector2(0.75, 0.75), Vector2(1.5, 1.5)), Color(0.78, 1.0, 0.61, alpha))

	# One short expanding wave when the portal wakes up.
	if _activation_burst > 0.0:
		var burst_progress: float = 1.0 - _activation_burst
		var radius: float = 30.0 + burst_progress * 64.0
		var alpha: float = _activation_burst * 0.34
		draw_arc(center, radius, 0.0, TAU, 48, Color(0.68, 1.0, 0.55, alpha), 1.0)


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
