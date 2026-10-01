extends Control

const SLOT_IDS: Array[String] = ["runesinger", "berserker", "wayfarer"]

@onready var _prompt: Label = $Header/Prompt
@onready var _action_menu: Control = $ActionMenu
@onready var _action_title: Label = $ActionMenu/ClassName
@onready var _status: Label = $ActionMenu/Status

var _selected: String = ""
var _slot_home: Dictionary = {}
var _slot_tweens: Dictionary = {}


func _ready() -> void:
	for slot_id in SLOT_IDS:
		var slot := _slot(slot_id)
		_slot_home[slot_id] = slot.position
		var button := slot.get_node("HitArea") as Button
		button.pressed.connect(_select_character.bind(slot_id))
		button.mouse_entered.connect(_hover_slot.bind(slot_id, true))
		button.mouse_exited.connect(_hover_slot.bind(slot_id, false))

	$ExitButton.pressed.connect(_exit_game)
	$ActionMenu/Buttons/NewGame.pressed.connect(_new_game)
	$ActionMenu/Buttons/Saves.pressed.connect(_show_placeholder.bind("SAVES"))
	$ActionMenu/Buttons/Settings.pressed.connect(_show_placeholder.bind("SETTINGS"))
	$ActionMenu/Buttons/Controls.pressed.connect(_show_placeholder.bind("CONTROLS"))
	$ActionMenu/Buttons/Back.pressed.connect(_back_to_character_select)

	_action_menu.visible = false
	_status.text = ""


func _slot(slot_id: String) -> Control:
	match slot_id:
		"runesinger":
			return $Characters/Runesinger
		"berserker":
			return $Characters/Berserker
		_:
			return $Characters/Wayfarer


func _hover_slot(slot_id: String, hovered: bool) -> void:
	if not _selected.is_empty():
		return

	var slot := _slot(slot_id)
	_kill_slot_tween(slot_id)
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(
		slot,
		"scale",
		Vector2(1.035, 1.035) if hovered else Vector2.ONE,
		0.12
	).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(
		slot.get_node("Beam"),
		"modulate:a",
		0.10 if hovered else 0.045,
		0.12
	)
	_slot_tweens[slot_id] = tween


func _select_character(slot_id: String) -> void:
	if not _selected.is_empty():
		return

	_selected = slot_id
	GameSession.selected_class = slot_id
	_action_title.text = _display_name(slot_id)
	_status.text = ""

	var prompt_tween := create_tween()
	prompt_tween.tween_property(_prompt, "modulate:a", 0.0, 0.16)

	for id in SLOT_IDS:
		var button := _slot(id).get_node("HitArea") as Button
		button.mouse_filter = Control.MOUSE_FILTER_IGNORE

	match slot_id:
		"runesinger":
			_move_slot("runesinger", Vector2(-5.0, 0.0), true)
			_move_slot("berserker", Vector2(303.0, 0.0), false)
			_move_slot("wayfarer", Vector2(455.0, 0.0), false)
			_action_menu.position = Vector2(174.0, 87.0)
		"berserker":
			_move_slot("runesinger", Vector2(-138.0, 0.0), false)
			_move_slot("berserker", Vector2(160.0, 0.0), true)
			_move_slot("wayfarer", Vector2(458.0, 0.0), false)
			_action_menu.position = Vector2(326.0, 87.0)
		"wayfarer":
			_move_slot("runesinger", Vector2(-142.0, 0.0), false)
			_move_slot("berserker", Vector2(8.0, 0.0), false)
			_move_slot("wayfarer", Vector2(325.0, 0.0), true)
			_action_menu.position = Vector2(174.0, 87.0)

	await get_tree().create_timer(0.16).timeout
	_action_menu.modulate.a = 0.0
	_action_menu.visible = true
	var menu_tween := create_tween()
	menu_tween.set_parallel(true)
	menu_tween.tween_property(_action_menu, "modulate:a", 1.0, 0.20)
	menu_tween.tween_property(
		_action_menu,
		"position:y",
		_action_menu.position.y - 4.0,
		0.20
	).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)


func _move_slot(slot_id: String, target: Vector2, chosen: bool) -> void:
	var slot := _slot(slot_id)
	_kill_slot_tween(slot_id)
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(slot, "position", target, 0.34).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(
		slot,
		"scale",
		Vector2(1.07, 1.07) if chosen else Vector2(0.96, 0.96),
		0.30
	)
	tween.tween_property(
		slot,
		"modulate",
		Color.WHITE if chosen else Color(0.55, 0.59, 0.67, 0.72),
		0.25
	)
	_slot_tweens[slot_id] = tween


func _back_to_character_select() -> void:
	if _selected.is_empty():
		return

	_action_menu.visible = false
	_status.text = ""

	for slot_id in SLOT_IDS:
		var slot := _slot(slot_id)
		_kill_slot_tween(slot_id)
		var tween := create_tween()
		tween.set_parallel(true)
		tween.tween_property(
			slot,
			"position",
			_slot_home[slot_id],
			0.34
		).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.tween_property(slot, "scale", Vector2.ONE, 0.28)
		tween.tween_property(slot, "modulate", Color.WHITE, 0.24)
		tween.tween_property(slot.get_node("Beam"), "modulate:a", 0.045, 0.24)
		_slot_tweens[slot_id] = tween

		var button := slot.get_node("HitArea") as Button
		button.mouse_filter = Control.MOUSE_FILTER_STOP

	_selected = ""
	var prompt_tween := create_tween()
	prompt_tween.tween_property(_prompt, "modulate:a", 1.0, 0.20)


func _new_game() -> void:
	if _selected.is_empty():
		return
	GameSession.selected_class = _selected
	get_tree().change_scene_to_file("res://scenes/main.tscn")


func _show_placeholder(section: String) -> void:
	_status.text = "%s · COMING NEXT" % section
	_status.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(_status, "modulate:a", 1.0, 0.15)


func _exit_game() -> void:
	get_tree().quit()


func _display_name(slot_id: String) -> String:
	match slot_id:
		"runesinger":
			return "RUNESINGER"
		"berserker":
			return "BERSERKER"
		_:
			return "WAYFARER"


func _kill_slot_tween(slot_id: String) -> void:
	if not _slot_tweens.has(slot_id):
		return
	var tween: Tween = _slot_tweens[slot_id]
	if tween != null:
		tween.kill()
