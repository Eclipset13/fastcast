extends CharacterBody2D

const MAGE_WALK := preload("res://assets/characters/mage/mage-walk.png")
const MAGE_RUN := preload("res://assets/characters/mage/mage-run.png")
const MAGE_JUMP := preload("res://assets/characters/mage/mage-jump.png")

@export var move_speed: float = 92.0
@export var ground_acceleration: float = 900.0
@export var air_acceleration: float = 520.0
@export var ground_friction: float = 1100.0
@export var jump_velocity: float = -270.0
@export var gravity: float = 720.0
@export var max_fall_speed: float = 420.0
@export var dash_speed: float = 255.0
@export var dash_duration: float = 0.13
@export var dash_cooldown: float = 0.32
@export var fall_respawn_y: float = 360.0

@onready var _visual: Sprite2D = $Visual

var _facing: float = 1.0
var _air_dash_available: bool = true
var _dash_time_left: float = 0.0
var _dash_cooldown_left: float = 0.0
var _jump_requested: bool = false
var _dash_requested: bool = false
var _spawn_position: Vector2
var _run_animation_time: float = 0.0


func _ready() -> void:
	_spawn_position = global_position
	_show_idle()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo:
			if key_event.keycode in [KEY_SPACE, KEY_W, KEY_UP]:
				_jump_requested = true
			elif key_event.keycode == KEY_SHIFT:
				_dash_requested = true


func _physics_process(delta: float) -> void:
	_dash_cooldown_left = maxf(_dash_cooldown_left - delta, 0.0)

	var move_input := _get_move_input()
	if not is_zero_approx(move_input):
		_facing = signf(move_input)

	var wants_jump := _jump_requested
	var wants_dash := _dash_requested
	_jump_requested = false
	_dash_requested = false

	if is_on_floor():
		_air_dash_available = true

	var can_dash := is_on_floor() or _air_dash_available
	if wants_dash and can_dash and _dash_cooldown_left <= 0.0:
		if not is_on_floor():
			_air_dash_available = false
		_dash_time_left = dash_duration
		_dash_cooldown_left = dash_cooldown

	if _dash_time_left > 0.0:
		_dash_time_left = maxf(_dash_time_left - delta, 0.0)
		velocity.x = _facing * dash_speed
		velocity.y = 0.0
		move_and_slide()
		_show_dash()
		_check_fall_respawn()
		return

	if wants_jump and is_on_floor():
		velocity.y = jump_velocity

	if not is_on_floor():
		velocity.y = minf(velocity.y + gravity * delta, max_fall_speed)

	if not is_zero_approx(move_input):
		var acceleration := ground_acceleration if is_on_floor() else air_acceleration
		velocity.x = move_toward(velocity.x, move_input * move_speed, acceleration * delta)
	elif is_on_floor():
		velocity.x = move_toward(velocity.x, 0.0, ground_friction * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, air_acceleration * 0.25 * delta)

	move_and_slide()
	_update_visual(delta)
	_check_fall_respawn()


func _update_visual(delta: float) -> void:
	_visual.flip_h = _facing < 0.0

	if not is_on_floor():
		if velocity.y < -100.0:
			_show_jump_frame(3)
		elif velocity.y < 95.0:
			_show_jump_frame(4)
		else:
			_show_jump_frame(5)
		return

	if absf(velocity.x) > 8.0:
		_run_animation_time += delta
		var frame := int(floor(_run_animation_time * 14.0)) % 8
		_show_run_frame(frame)
	else:
		_run_animation_time = 0.0
		_show_idle()


func _show_idle() -> void:
	_visual.texture = MAGE_WALK
	_visual.region_rect = Rect2(362.0, 0.0, 362.0, 543.0)
	_apply_art_layout(543.0, 543.0, 36.0)


func _show_run_frame(frame: int) -> void:
	var column := frame % 4
	var row := frame / 4
	var crop_y := 120.0 if row == 0 else 90.0
	_visual.texture = MAGE_RUN
	_visual.region_rect = Rect2(
		float(column * 384 + 40),
		float(row * 512) + crop_y,
		312.0,
		352.0
	)
	_apply_art_layout(352.0, 342.0, 35.0)


func _show_jump_frame(frame: int) -> void:
	var column := frame % 4
	var row := frame / 4
	var row_offset := 0.0 if row == 0 else -10.0
	_visual.texture = MAGE_JUMP
	_visual.region_rect = Rect2(
		float(column * 384),
		float(row * 512) + row_offset,
		384.0,
		512.0
	)
	_apply_art_layout(512.0, 484.0, 40.0)


func _show_dash() -> void:
	_visual.flip_h = _facing < 0.0
	_show_run_frame(3)


func _apply_art_layout(frame_height: float, foot_y: float, display_height: float) -> void:
	var art_scale := display_height / frame_height
	_visual.scale = Vector2(art_scale, art_scale)
	_visual.position = Vector2(0.0, 12.0 - (foot_y - frame_height * 0.5) * art_scale)


func _check_fall_respawn() -> void:
	if global_position.y <= fall_respawn_y:
		return

	global_position = _spawn_position
	velocity = Vector2.ZERO
	_dash_time_left = 0.0
	_dash_cooldown_left = 0.0
	_air_dash_available = true
	_run_animation_time = 0.0
	_show_idle()


func _get_move_input() -> float:
	var direction := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		direction -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		direction += 1.0
	return clampf(direction, -1.0, 1.0)
