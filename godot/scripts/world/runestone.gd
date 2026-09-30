extends Node2D

signal spellcraft_requested

const STONE_TEXTURE := preload("res://assets/biomes/emerald-forest/props/runestone-start.png")
const INTERACTION_RADIUS := 72.0
const ART_SCALE := 0.06

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
	_glow.visible = false


func bind_player(player: CharacterBody2D) -> void:
	_player = player


func set_menu_open(open: bool) -> void:
	_menu_open = open
	_prompt.visible = _nearby and not _menu_open


func _process(delta: float) -> void:
	if _player == null or not is_instance_valid(_player):
		return

	_pulse_time += delta
	var center := global_position + Vector2(0.0, -42.0)
	var nearby_now := _player.global_position.distance_to(center) <= INTERACTION_RADIUS

	if nearby_now != _nearby:
		_nearby = nearby_now
		_prompt.visible = _nearby and not _menu_open
		_glow.visible = _nearby

	if _nearby:
		var pulse := 0.14 + (sin(_pulse_time * 3.0) + 1.0) * 0.055
		_glow.modulate.a = pulse


func _unhandled_input(event: InputEvent) -> void:
	if _menu_open or not _nearby:
		return
	if not (event is InputEventKey):
		return

	var key_event := event as InputEventKey
	if key_event.pressed and not key_event.echo and key_event.keycode == KEY_E:
		spellcraft_requested.emit()
		get_viewport().set_input_as_handled()


func _configure_art() -> void:
	_stone.texture = STONE_TEXTURE
	_stone.scale = Vector2(ART_SCALE, ART_SCALE)
	_stone.position = Vector2(
		0.0,
		-float(STONE_TEXTURE.get_height()) * ART_SCALE * 0.5
	)
