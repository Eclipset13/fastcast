extends Control

const SLOT_IDS: Array[String] = ["runesinger", "berserker", "wayfarer"]
const AURA_COLORS: Array[Color] = [Color("c38aef"), Color("ef5841"), Color("48bbef")]
const AURA_ALPHA := 0.74

@onready var _prompt: Label = $Header/Prompt
@onready var _action_menu: Control = $ActionMenu
@onready var _action_title: Label = $ActionMenu/ClassName
@onready var _status: Label = $ActionMenu/Status

var _selected: String = ""
var _slot_home: Dictionary = {}
var _slot_tweens: Dictionary = {}


func _ready() -> void:
	get_window().content_scale_size = Vector2i(1440, 810)
	$Header.draw.connect(_draw_title_ornament)
	$Header.queue_redraw()
	$ExitButton.draw.connect(_draw_exit_icon)
	for slot_id in SLOT_IDS:
		var slot := _slot(slot_id)
		var aura := slot.get_node("Aura") as TextureRect
		aura.modulate = Color(1, 1, 1, AURA_ALPHA)
		# Continue the light below the platform, keeping the rune's aspect ratio.
		var underglow := TextureRect.new()
		underglow.name = "Underglow"
		var light_crop := AtlasTexture.new()
		light_crop.atlas = aura.texture
		light_crop.region = Rect2(32, 330, 96, 145)
		underglow.texture = light_crop
		underglow.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		underglow.position = Vector2(168, 592)
		underglow.size = Vector2(144, 218)
		underglow.modulate.a = 0.24
		underglow.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.add_child(underglow)
		slot.move_child(underglow, 1)
		var lines := Control.new()
		lines.name = "RuneLines"
		lines.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.add_child(lines)
		slot.move_child(lines, 2)
		lines.draw.connect(_draw_rune_lines.bind(lines, AURA_COLORS[SLOT_IDS.find(slot_id)]))
		_slot_home[slot_id] = slot.position
		var button := slot.get_node("HitArea") as Button
		button.pressed.connect(_select_character.bind(slot_id))
		button.mouse_entered.connect(_hover_slot.bind(slot_id, true))
		button.mouse_exited.connect(_hover_slot.bind(slot_id, false))
		var character := slot.get_node("Character") as Control
		character.pivot_offset = Vector2(240, 604) - character.position

	$ExitButton.pressed.connect(_exit_game)
	$ActionMenu/Buttons/NewGame.pressed.connect(_new_game)
	$ActionMenu/Buttons/Saves.pressed.connect(_show_placeholder.bind("SAVES"))
	$ActionMenu/Buttons/Settings.pressed.connect(_show_placeholder.bind("SETTINGS"))
	$ActionMenu/Buttons/Controls.pressed.connect(_show_placeholder.bind("CONTROLS"))
	$ActionMenu/Buttons/Back.pressed.connect(_back_to_character_select)

	_action_menu.visible = false
	_status.text = ""


func _draw_rune_lines(canvas: Control, tint: Color) -> void:
	for x in [180.0, 300.0]:
		for y in range(0, 810, 6):
			var strength := 0.36 + 0.26 * sin(float(y) / 810.0 * PI)
			canvas.draw_rect(Rect2(x - 2, y, 5, 6), Color(tint, strength * 0.08))
			canvas.draw_rect(Rect2(x, y, 1, 6), Color(tint, strength))


func _draw_title_ornament() -> void:
	var canvas := $Header as Control
	var center := Vector2(720, 100)
	var ink := Color("725299")
	canvas.draw_arc(center, 66, 0, TAU, 64, Color(ink, 0.65), 2.0)
	canvas.draw_arc(center, 55, 0, TAU, 64, Color(ink, 0.35), 1.0)
	canvas.draw_colored_polygon(PackedVector2Array([
		center + Vector2(0, -82), center + Vector2(6, -40),
		center + Vector2(0, -30), center + Vector2(-6, -40),
	]), Color("ba92d3"))
	for index in range(8):
		var direction := Vector2.UP.rotated(index * PI / 4.0)
		var tangent := direction.orthogonal()
		var length := 80.0 if index % 2 == 0 else 70.0
		canvas.draw_colored_polygon(PackedVector2Array([
			center + direction * length,
			center + direction * 40 + tangent * 5,
			center + direction * 49,
			center + direction * 40 - tangent * 5,
		]), Color(ink, 0.8))
	for side in [-1.0, 1.0]:
		canvas.draw_line(center + Vector2(side * 200, 7), center + Vector2(side * 272, 7), Color(ink, 0.8), 1.0)
		var jewel := center + Vector2(side * 220, 7)
		canvas.draw_polyline(PackedVector2Array([
			jewel + Vector2(0, -4), jewel + Vector2(4, 0), jewel + Vector2(0, 4),
			jewel + Vector2(-4, 0), jewel + Vector2(0, -4),
		]), Color("e8b9db"), 2.0)


func _draw_exit_icon() -> void:
	var button := $ExitButton as Button
	button.draw_line(Vector2(14, 14), Vector2(34, 34), Color("ddc5e7"), 3.0)
	button.draw_line(Vector2(34, 14), Vector2(14, 34), Color("ddc5e7"), 3.0)


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
		slot.get_node("Character"),
		"scale",
		Vector2(1.015, 1.015) if hovered else Vector2.ONE,
		0.12
	).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(
		slot.get_node("Aura"),
		"modulate:a",
		0.94 if hovered else AURA_ALPHA,
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
		(_slot(id).get_node("Character") as Control).scale = Vector2.ONE

	match slot_id:
		"runesinger":
			_move_slot("runesinger", _slot_home["runesinger"], true)
			_move_slot("berserker", Vector2(1470.0, 0.0), false)
			_move_slot("wayfarer", Vector2(1950.0, 0.0), false)
			_action_menu.position = Vector2(522.0, 261.0)
		"berserker":
			_move_slot("runesinger", Vector2(-510.0, 0.0), false)
			_move_slot("berserker", Vector2(480.0, 0.0), true)
			_move_slot("wayfarer", Vector2(1470.0, 0.0), false)
			_action_menu.position = Vector2(978.0, 261.0)
		"wayfarer":
			_move_slot("runesinger", Vector2(-990.0, 0.0), false)
			_move_slot("berserker", Vector2(-510.0, 0.0), false)
			_move_slot("wayfarer", _slot_home["wayfarer"], true)
			_action_menu.position = Vector2(522.0, 261.0)

	await get_tree().create_timer(0.16).timeout
	_action_menu.modulate.a = 0.0
	_action_menu.visible = true
	var menu_tween := create_tween()
	menu_tween.set_parallel(true)
	menu_tween.tween_property(_action_menu, "modulate:a", 1.0, 0.20)
	menu_tween.tween_property(
		_action_menu,
		"position:y",
		_action_menu.position.y - 12.0,
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
		Vector2.ONE,
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
		tween.tween_property(slot.get_node("Aura"), "modulate:a", AURA_ALPHA, 0.24)
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
	get_window().content_scale_size = Vector2i(480, 270)
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
