extends Node2D

signal spellcraft_requested

const STONE_TEXTURE := preload("res://assets/biomes/emerald-forest/props/runestone-start.png")
const INTERACTION_RADIUS := 72.0
const ART_SCALE := 0.06

const AMBIENT_COLOR := Color(0.56, 0.96, 0.42, 1.0)
const BRIGHT_COLOR := Color(0.82, 1.0, 0.62, 1.0)
const CORE_CENTER := Vector2(0.0, -43.0)

@onready var _stone: Sprite2D = $Stone
@onready var _prompt: Label = $Prompt
@onready var _glow: Polygon2D = $Glow

var _player: CharacterBody2D = null
var _menu_open: bool = false
var _nearby: bool = false
var _pulse_time: float = 0.0


func _ready() -> void:
	_configure_art()
	_prompt.visible = false
	_glow.visible = true
	queue_redraw()


func bind_player(player: CharacterBody2D) -> void:
	_player = player


func set_menu_open(open: bool) -> void:
	_menu_open = open
	_prompt.visible = _nearby and not _menu_open


func _process(delta: float) -> void:
	_pulse_time += delta

	var nearby_now := false
	if _player != null and is_instance_valid(_player):
		var center := global_position + CORE_CENTER
		nearby_now = _player.global_position.distance_to(center) <= INTERACTION_RADIUS

	if nearby_now != _nearby:
		_nearby = nearby_now
		_prompt.visible = _nearby and not _menu_open

	var proximity_strength: float = 1.0 if _nearby else 0.34
	var pulse: float = (sin(_pulse_time * 3.0) + 1.0) * 0.5
	_glow.modulate.a = (0.08 + pulse * 0.07) * proximity_strength
	_stone.modulate = Color(
		0.95 + pulse * 0.05 * proximity_strength,
		1.0,
		0.93 + pulse * 0.07 * proximity_strength,
		1.0
	)

	queue_redraw()


func _unhandled_input(event: InputEvent) -> void:
	if _menu_open or not _nearby:
		return
	if not (event is InputEventKey):
		return

	var key_event := event as InputEventKey
	if key_event.pressed and not key_event.echo and key_event.keycode == KEY_E:
		spellcraft_requested.emit()
		get_viewport().set_input_as_handled()


func _draw() -> void:
	var strength: float = 1.0 if _nearby else 0.34
	var pulse: float = 0.82 + sin(_pulse_time * 2.8) * 0.18

	# Soft magical aura behind the stone.
	draw_set_transform(CORE_CENTER, 0.0, Vector2(1.0, 1.25))
	draw_circle(Vector2.ZERO, 27.0, Color(0.34, 0.82, 0.28, 0.045 * strength * pulse))
	draw_circle(Vector2.ZERO, 18.0, Color(0.61, 1.0, 0.43, 0.055 * strength * pulse))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	# Slow rune motes orbiting the upper half of the stone.
	for index in range(10):
		var angle: float = _pulse_time * (0.48 + float(index % 3) * 0.07) + TAU * float(index) / 10.0
		var radius_x: float = 23.0 + float((index * 7) % 10)
		var radius_y: float = 27.0 + float((index * 5) % 12)
		var point := CORE_CENTER + Vector2(cos(angle) * radius_x, sin(angle) * radius_y)
		var twinkle: float = 0.55 + sin(_pulse_time * 4.0 + float(index) * 1.7) * 0.35
		var size: float = 1.0 if index % 4 else 2.0
		var color := Color(0.66, 1.0, 0.48, maxf(0.0, twinkle) * 0.58 * strength)
		draw_rect(Rect2(point - Vector2.ONE * size * 0.5, Vector2.ONE * size), color)

	# Rising emerald sparks. They keep the stone alive even before interaction.
	for index in range(18):
		var speed: float = 0.12 + float(index % 5) * 0.018
		var phase: float = fposmod(_pulse_time * speed + float(index) * 0.137, 1.0)
		var base_x: float = sin(float(index) * 11.73) * 25.0
		var drift: float = sin(_pulse_time * (0.8 + float(index % 4) * 0.11) + float(index)) * 4.0
		var point := Vector2(base_x + drift, -18.0 - phase * 86.0)
		var fade: float = sin(phase * PI)
		var size: float = 1.0 if index % 5 else 2.0
		var alpha: float = fade * (0.26 + float(index % 3) * 0.08) * strength
		draw_rect(
			Rect2(point - Vector2(size * 0.5, size * 0.5), Vector2(size, size)),
			Color(0.64, 1.0, 0.44, alpha)
		)

	# Tiny cross-shaped glints appear when the player is close.
	if _nearby:
		for index in range(3):
			var angle: float = _pulse_time * (0.72 + float(index) * 0.09) + float(index) * TAU / 3.0
			var point := CORE_CENTER + Vector2(cos(angle) * 32.0, sin(angle) * 24.0)
			var alpha: float = 0.36 + sin(_pulse_time * 5.0 + float(index)) * 0.18
			var color := Color(BRIGHT_COLOR.r, BRIGHT_COLOR.g, BRIGHT_COLOR.b, alpha)
			draw_line(point + Vector2(-2.0, 0.0), point + Vector2(2.0, 0.0), color, 1.0)
			draw_line(point + Vector2(0.0, -2.0), point + Vector2(0.0, 2.0), color, 1.0)


func _configure_art() -> void:
	_stone.texture = STONE_TEXTURE
	_stone.scale = Vector2(ART_SCALE, ART_SCALE)
	_stone.position = Vector2(
		0.0,
		-float(STONE_TEXTURE.get_height()) * ART_SCALE * 0.5
	)
