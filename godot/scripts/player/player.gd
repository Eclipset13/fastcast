extends CharacterBody2D

const MAGE_WALK := preload("res://assets/characters/mage/mage-walk.png")
const MAGE_RUN := preload("res://assets/characters/mage/mage-run.png")
const MAGE_JUMP := preload("res://assets/characters/mage/mage-jump.png")
const DASH_AFTERIMAGE_SHADER := preload("res://shaders/player/dash_afterimage.gdshader")

const DASH_AFTERIMAGE_INTERVAL := 0.028
const DASH_AFTERIMAGE_LIFETIME := 0.20
const DASH_AFTERIMAGE_MIN_DISTANCE := 3.0
const DASH_AFTERIMAGE_COLOR := Color8(143, 234, 255)
const DASH_AFTERIMAGE_GLOW := Color8(38, 191, 255)

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

var _control_enabled: bool = true
var _facing: float = 1.0
var _dash_direction: float = 1.0
var _air_dash_available: bool = true
var _dash_time_left: float = 0.0
var _dash_cooldown_left: float = 0.0
var _jump_requested: bool = false
var _dash_requested: bool = false
var _spawn_position: Vector2
var _run_animation_time: float = 0.0
var _dash_afterimage_elapsed: float = 0.0
var _dash_afterimage_last_position: Vector2 = Vector2.ZERO
var _dash_afterimage_has_position: bool = false


func _ready() -> void:
	_spawn_position = global_position
	_show_idle()


func set_control(enabled: bool) -> void:
	_control_enabled = enabled
	_jump_requested = false
	_dash_requested = false
	_dash_time_left = 0.0
	if not enabled:
		velocity = Vector2.ZERO
		_run_animation_time = 0.0
		_dash_afterimage_elapsed = 0.0
		_dash_afterimage_has_position = false
		_show_idle()


func face_toward(world_x: float) -> void:
	_facing = -1.0 if world_x < global_position.x else 1.0
	_visual.flip_h = _facing < 0.0


func reset_to_spawn() -> void:
	global_position = _spawn_position
	velocity = Vector2.ZERO
	_dash_time_left = 0.0
	_dash_cooldown_left = 0.0
	_air_dash_available = true
	_run_animation_time = 0.0
	_dash_afterimage_elapsed = 0.0
	_dash_afterimage_has_position = false
	_show_idle()


func prepare_for_battle_position(world_position: Vector2) -> void:
	global_position = world_position
	velocity = Vector2.ZERO
	_dash_time_left = 0.0
	_dash_cooldown_left = 0.0
	_jump_requested = false
	_dash_requested = false
	_run_animation_time = 0.0
	_dash_afterimage_elapsed = 0.0
	_dash_afterimage_has_position = false
	_show_idle()


func is_standing_on_body(body: Node) -> bool:
	if not is_on_floor():
		return false

	for index in range(get_slide_collision_count()):
		var collision := get_slide_collision(index)
		if collision.get_collider() == body and collision.get_normal().y < -0.7:
			return true

	return false


func _unhandled_input(event: InputEvent) -> void:
	if not _control_enabled:
		return
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo:
			if key_event.keycode in [KEY_SPACE, KEY_W, KEY_UP]:
				_jump_requested = true
			elif key_event.keycode == KEY_SHIFT:
				_dash_requested = true


func _physics_process(delta: float) -> void:
	if not _control_enabled:
		velocity = Vector2.ZERO
		return

	_dash_cooldown_left = maxf(_dash_cooldown_left - delta, 0.0)

	var wants_jump := _jump_requested
	var wants_dash := _dash_requested
	_jump_requested = false
	_dash_requested = false

	# Once a dash starts, ordinary movement input cannot change its direction,
	# speed, or duration. This keeps dash distance identical whether A/D is held.
	if _dash_time_left > 0.0:
		_continue_dash(delta)
		return

	var move_input := _get_move_input()
	if not is_zero_approx(move_input):
		_facing = signf(move_input)

	if is_on_floor():
		_air_dash_available = true

	var can_dash := is_on_floor() or _air_dash_available
	if wants_dash and can_dash and _dash_cooldown_left <= 0.0:
		_dash_direction = _facing
		if not is_on_floor():
			_air_dash_available = false
		_dash_time_left = dash_duration
		_dash_cooldown_left = dash_cooldown
		_dash_afterimage_elapsed = 0.0
		_dash_afterimage_has_position = false
		_show_dash()
		_emit_dash_afterimage(true)
		_continue_dash(delta)
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


func _continue_dash(delta: float) -> void:
	velocity.x = _dash_direction * dash_speed
	velocity.y = 0.0
	move_and_slide()
	_dash_time_left = maxf(_dash_time_left - delta, 0.0)
	_show_dash()

	_dash_afterimage_elapsed += delta
	if _dash_afterimage_elapsed >= DASH_AFTERIMAGE_INTERVAL:
		_dash_afterimage_elapsed = fmod(_dash_afterimage_elapsed, DASH_AFTERIMAGE_INTERVAL)
		_emit_dash_afterimage(false)

	_check_fall_respawn()


func _emit_dash_afterimage(force: bool) -> void:
	if _visual.texture == null:
		return

	var current_position := _visual.global_position
	if not force and _dash_afterimage_has_position:
		if current_position.distance_to(_dash_afterimage_last_position) < DASH_AFTERIMAGE_MIN_DISTANCE:
			return

	_dash_afterimage_last_position = current_position
	_dash_afterimage_has_position = true

	var world_parent := get_parent()
	if world_parent == null:
		return

	# Browser version used a filled cyan silhouette with additive glow. Recreate it
	# with a bright core and two slightly expanded halo silhouettes.
	var halo_far: Sprite2D = _make_afterimage_layer(DASH_AFTERIMAGE_GLOW, 0.07, 1.14)
	var halo_near: Sprite2D = _make_afterimage_layer(DASH_AFTERIMAGE_GLOW, 0.12, 1.07)
	var core: Sprite2D = _make_afterimage_layer(DASH_AFTERIMAGE_COLOR, 0.55, 1.0)
	var ghosts: Array[Sprite2D] = [halo_far, halo_near, core]

	for ghost: Sprite2D in ghosts:
		world_parent.add_child(ghost)
		ghost.global_transform = _visual.global_transform
		ghost.z_index = z_index - 1
		if not is_equal_approx(ghost.scale.x, 0.0):
			var layer_scale: float = float(ghost.get_meta("afterimage_scale", 1.0))
			ghost.scale *= layer_scale
		ghost.remove_meta("afterimage_scale")
		var tween: Tween = ghost.create_tween()
		tween.tween_property(ghost, "modulate:a", 0.0, DASH_AFTERIMAGE_LIFETIME).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.finished.connect(ghost.queue_free)


func _make_afterimage_layer(color: Color, alpha: float, scale_multiplier: float) -> Sprite2D:
	var ghost: Sprite2D = Sprite2D.new()
	ghost.texture = _visual.texture
	ghost.centered = _visual.centered
	ghost.offset = _visual.offset
	ghost.region_enabled = _visual.region_enabled
	ghost.region_rect = _visual.region_rect
	ghost.flip_h = _visual.flip_h
	ghost.flip_v = _visual.flip_v
	ghost.texture_filter = _visual.texture_filter
	ghost.modulate = Color(1.0, 1.0, 1.0, alpha)
	ghost.set_meta("afterimage_scale", scale_multiplier)

	var material: ShaderMaterial = ShaderMaterial.new()
	material.shader = DASH_AFTERIMAGE_SHADER
	material.set_shader_parameter("silhouette_color", color)
	ghost.material = material
	return ghost


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
	var row := frame >> 2
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
	var row := frame >> 2
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
	_dash_afterimage_elapsed = 0.0
	_dash_afterimage_has_position = false
	_show_idle()


func _get_move_input() -> float:
	var direction := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		direction -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		direction += 1.0
	return clampf(direction, -1.0, 1.0)
