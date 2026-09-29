extends CanvasLayer

signal close_requested

@onready var _root: Control = $Root
@onready var _enemy_name: Label = $Root/Panel/Margin/VBox/EnemyName
@onready var _enemy_hp: Label = $Root/Panel/Margin/VBox/EnemyHP
@onready var _enemy_stats: Label = $Root/Panel/Margin/VBox/EnemyStats

var active: bool = false


func open_for_enemy(name: String, hp: int, max_hp: int, attack: int, interval: float, xp: int) -> void:
	active = true
	_enemy_name.text = name.to_upper()
	_enemy_hp.text = "HP  %d / %d" % [hp, max_hp]
	_enemy_stats.text = "ATK %d   STRIKE %.1fs   XP %d" % [attack, interval, xp]
	_root.visible = true


func close_overlay() -> void:
	active = false
	_root.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if not active:
		return
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.pressed and not key_event.echo and key_event.keycode == KEY_ESCAPE:
			close_requested.emit()
			get_viewport().set_input_as_handled()
