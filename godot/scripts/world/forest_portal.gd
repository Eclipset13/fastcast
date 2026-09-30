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
	var glow := Color(0.43, 0.79, 0.47, 0.16 * strength * pulse)

	draw_set_transform(Vector2(0.0, -ENERGY_CENTER_OFFSET_Y), 0.0, Vector2(1.0, 1.18))
	draw_circle(Vector2.ZERO, 58.0, glow)
	draw_circle(Vector2.ZERO, 39.0, Color(0.61, 0.87, 0.48, 0.16 * strength * pulse))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	draw_set_transform(Vector2(0.0, -5.0), 0.0, Vector2(1.0, 0.22))
	draw_circle(Vector2.ZERO, 72.0, Color(0.43, 0.79, 0.47, 0.12 * strength))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	var particle_count := 20
	for index in range(particle_count):
		var angle: float = _orbit_phase * (0.72 + float(index % 4) * 0.08) + TAU * float(index) / float(particle_count)
		var radius: float = 16.0 + float((index * 7) % 24)
		var point := Vector2(
			cos(angle) * radius,
			-ENERGY_CENTER_OFFSET_Y + sin(angle) * radius * 1.45
		)
		var size: float = 1.0 if index % 5 else 2.0
		var color := Color(0.62, 0.89, 0.53, (0.45 + float(index % 4) * 0.12) * strength)
		draw_rect(Rect2(point - Vector2(size * 0.5, size * 0.5), Vector2(size, size)), color)


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
