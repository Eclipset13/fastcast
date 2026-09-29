extends CharacterBody2D

@export var move_speed: float = 92.0
@export var ground_acceleration: float = 900.0
@export var air_acceleration: float = 520.0
@export var ground_friction: float = 1100.0
@export var jump_velocity: float = -225.0
@export var gravity: float = 720.0
@export var max_fall_speed: float = 420.0
@export var dash_speed: float = 255.0
@export var dash_duration: float = 0.13
@export var dash_cooldown: float = 0.32

var _facing: float = 1.0
var _air_jumps_left: int = 1
var _dash_time_left: float = 0.0
var _dash_cooldown_left: float = 0.0
var _jump_requested: bool = false
var _dash_requested: bool = false


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
		_air_jumps_left = 1

	if wants_dash and _dash_cooldown_left <= 0.0:
		_dash_time_left = dash_duration
		_dash_cooldown_left = dash_cooldown

	if _dash_time_left > 0.0:
		_dash_time_left = maxf(_dash_time_left - delta, 0.0)
		velocity.x = _facing * dash_speed
		velocity.y = 0.0
		move_and_slide()
		return

	if wants_jump:
		if is_on_floor():
			velocity.y = jump_velocity
		elif _air_jumps_left > 0:
			_air_jumps_left -= 1
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


func _get_move_input() -> float:
	var direction := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		direction -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		direction += 1.0
	return clampf(direction, -1.0, 1.0)
