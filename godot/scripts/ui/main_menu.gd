extends Control

const SLOT_IDS: Array[String] = ["runesinger", "berserker", "wayfarer"]
const AURA_ALPHA := 0.74
const SELECTION_GLOW_SHADER := preload("res://shaders/ui/character_selection_glow.gdshader")
const SELECTION_GLOW_COLORS := {
	"runesinger": Color("c987ff"),
	"berserker": Color("ff5a43"),
	"wayfarer": Color("50c9ff"),
}
const SELECTED_SLOT_POSITION := Vector2(55.0, -8.0)
const SELECTED_SLOT_SCALE := Vector2(1.24, 1.24)
const BACK_SLOT_POSITIONS := [Vector2(390.0, 64.0), Vector2(650.0, 64.0)]
const BACK_SLOT_SCALE := Vector2(0.62, 0.62)
const ACTION_MENU_OPEN_POSITION := Vector2(1010.0, 4.0)
const ACTION_MENU_CLOSED_POSITION := Vector2(1452.0, 4.0)
const CLASS_ACCENTS := {
	"runesinger": Color("cb91ff"),
	"berserker": Color("ff624d"),
	"wayfarer": Color("59d1ff"),
}

@onready var _prompt: Label = $Header/Prompt
@onready var _background: TextureRect = $Background
@onready var _background_particles: Control = $BackgroundParticles
@onready var _foreground_particles: Control = $ForegroundParticles
@onready var _selection_lighting: Control = $SelectionLighting
@onready var _action_menu: Control = $ActionMenu
@onready var _action_title: Label = $ActionMenu/ClassName
@onready var _action_panel: NinePatchRect = $ActionMenu/PanelFrame
@onready var _action_decor: NinePatchRect = $ActionMenu/PanelGlow
@onready var _action_rule: ColorRect = $ActionMenu/Rule
@onready var _action_buttons: VBoxContainer = $ActionMenu/Buttons
@onready var _status: Label = $ActionMenu/Status

var _transitioning: bool = false
var _menu_tween: Tween = null
var _selected: String = ""
var _slot_home: Dictionary = {}
var _slot_tweens: Dictionary = {}
var _background_blend: float = 0.0
var _background_tween: Tween = null
var _action_accent: Color = Color("cb91ff")


func _ready() -> void:
	get_window().content_scale_size = Vector2i(1440, 810)
	var background_material := _background.material as ShaderMaterial
	if background_material != null:
		background_material.set_shader_parameter("selection_blend", 0.0)
		background_material.set_shader_parameter("selected_index", 0.0)
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

		var character := slot.get_node("Character") as TextureRect
		var character_rim := _create_character_rim(slot_id, character)
		slot.add_child(character_rim)
		slot.move_child(character_rim, character.get_index())

		_slot_home[slot_id] = slot.position
		var button := slot.get_node("HitArea") as Button
		button.pressed.connect(_select_character.bind(slot_id))
		button.mouse_entered.connect(_hover_slot.bind(slot_id, true))
		button.mouse_exited.connect(_hover_slot.bind(slot_id, false))
		character.pivot_offset = Vector2(240, 604) - character.position

	$ExitButton.pressed.connect(_exit_game)
	$ActionMenu/Buttons/NewGame.pressed.connect(_new_game)
	$ActionMenu/Buttons/Saves.pressed.connect(_show_placeholder.bind("SAVES"))
	$ActionMenu/Buttons/Settings.pressed.connect(_show_placeholder.bind("SETTINGS"))
	$ActionMenu/Buttons/Controls.pressed.connect(_show_placeholder.bind("CONTROLS"))
	$ActionMenu/Buttons/Skills.pressed.connect(_show_placeholder.bind("SKILLS"))
	$ActionMenu/Buttons/Back.pressed.connect(_back_to_character_select)

	_action_menu.visible = false
	_status.text = ""
	_set_action_interactive(false)


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
	var ink: Color = Color("ddc5e7") if _selected.is_empty() else _action_accent.lightened(0.45)
	button.draw_line(Vector2(14, 14), Vector2(34, 34), ink, 3.0)
	button.draw_line(Vector2(34, 14), Vector2(14, 34), ink, 3.0)


func _slot(slot_id: String) -> Control:
	match slot_id:
		"runesinger":
			return $Characters/Runesinger
		"berserker":
			return $Characters/Berserker
		_:
			return $Characters/Wayfarer


func _hover_slot(slot_id: String, hovered: bool) -> void:
	if not _selected.is_empty() or _transitioning:
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
	if not _selected.is_empty() or _transitioning:
		return

	_transitioning = true
	_selected = slot_id
	GameSession.selected_class = slot_id
	_apply_action_theme(slot_id)
	_action_title.text = _display_name(slot_id)
	_status.text = ""
	_set_action_interactive(false)
	_prompt.text = "%s SELECTED" % _display_name(slot_id)
	_prompt.add_theme_color_override("font_color", _action_accent.lightened(0.30))
	_prompt.modulate.a = 0.0
	var prompt_tween: Tween = create_tween()
	prompt_tween.tween_property(_prompt, "modulate:a", 1.0, 0.30).set_delay(0.16).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

	for id: String in SLOT_IDS:
		_kill_slot_tween(id)
		var hit: Button = _slot(id).get_node("HitArea") as Button
		hit.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hit.disabled = true
		(_slot(id).get_node("Character") as Control).scale = Vector2.ONE
		_fade_slot_runes(id, 0.0, 0.14)

	# Runes disappear in place; environmental color follows before movement.
	await get_tree().create_timer(0.08).timeout
	_focus_background(slot_id)
	await get_tree().create_timer(0.06).timeout
	_selection_lighting.call("show_selection", slot_id)
	_move_slot(slot_id, SELECTED_SLOT_POSITION, true, SELECTED_SLOT_SCALE)
	var background_index: int = 0
	for id: String in SLOT_IDS:
		if id != slot_id:
			_move_slot(id, BACK_SLOT_POSITIONS[background_index], false, BACK_SLOT_SCALE)
			background_index += 1

	await get_tree().create_timer(0.18).timeout
	_action_menu.position = ACTION_MENU_CLOSED_POSITION
	_action_menu.pivot_offset = Vector2(430, 401)
	_action_menu.scale = Vector2(0.985, 1.0)
	_action_menu.modulate.a = 0.0
	_action_decor.modulate.a = 0.0
	for child: Node in _action_buttons.get_children():
		(child as CanvasItem).modulate.a = 0.0
	_action_menu.visible = true
	_menu_tween = create_tween().set_parallel(true)
	_menu_tween.tween_property(_action_menu, "position", ACTION_MENU_OPEN_POSITION - Vector2(4, 0), 0.38).set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_OUT)
	_menu_tween.tween_property(_action_menu, "position", ACTION_MENU_OPEN_POSITION, 0.08).set_delay(0.38).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_menu_tween.tween_property(_action_menu, "scale", Vector2.ONE, 0.46).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	_menu_tween.tween_property(_action_menu, "modulate:a", 1.0, 0.30).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	_menu_tween.tween_property(_action_decor, "modulate:a", 1.0, 0.28).set_delay(0.16).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	var row_index: int = 0
	for child: Node in _action_buttons.get_children():
		_menu_tween.tween_property(child, "modulate:a", 1.0, 0.20).set_delay(0.20 + row_index * 0.04).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		row_index += 1
	await _menu_tween.finished
	_transitioning = false
	_set_action_interactive(true)


func _move_slot(slot_id: String, target: Vector2, chosen: bool, target_scale: Vector2) -> void:
	var slot := _slot(slot_id)
	_kill_slot_tween(slot_id)
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(
		slot,
		"position",
		target,
		0.50
	).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(
		slot,
		"scale",
		target_scale,
		0.48
	).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	var character := slot.get_node("Character") as CanvasItem
	var platform := slot.get_node("Platform") as CanvasItem
	var rim := slot.get_node_or_null("CharacterRim") as CanvasItem
	var dim_color := Color.WHITE if chosen else Color(0.68, 0.70, 0.78, 0.65)

	tween.tween_property(character, "modulate", dim_color, 0.30)
	tween.tween_property(platform, "modulate", dim_color, 0.30)
	if rim != null:
		tween.tween_property(
			rim,
			"modulate:a",
			1.0 if chosen else 0.30,
			0.34
		)
	_slot_tweens[slot_id] = tween


func _back_to_character_select() -> void:
	if _selected.is_empty() or _transitioning:
		return

	_transitioning = true
	_set_action_interactive(false)
	_status.text = ""
	_menu_tween = create_tween().set_parallel(true)
	var row_index: int = 0
	var rows: Array[Node] = _action_buttons.get_children()
	rows.reverse()
	for child: Node in rows:
		_menu_tween.tween_property(child, "modulate:a", 0.0, 0.12).set_delay(row_index * 0.025).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
		row_index += 1
	_menu_tween.tween_property(_action_decor, "modulate:a", 0.0, 0.18).set_delay(0.08).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	_menu_tween.tween_property(_action_menu, "position", ACTION_MENU_CLOSED_POSITION, 0.38).set_delay(0.18).set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_IN_OUT)
	_menu_tween.tween_property(_action_menu, "modulate:a", 0.0, 0.28).set_delay(0.24).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)

	# Restore the world once the panel has started leaving, with hit areas locked.
	await get_tree().create_timer(0.22).timeout
	_selection_lighting.call("show_start")
	_clear_background_focus()
	var return_tween: Tween = create_tween().set_parallel(true)
	for slot_id: String in SLOT_IDS:
		var slot: Control = _slot(slot_id)
		_kill_slot_tween(slot_id)
		return_tween.tween_property(slot, "position", _slot_home[slot_id], 0.48).set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_IN_OUT)
		return_tween.tween_property(slot, "scale", Vector2.ONE, 0.48).set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_IN_OUT)
		return_tween.tween_property(slot.get_node("Character"), "modulate", Color.WHITE, 0.36).set_trans(Tween.TRANS_SINE)
		return_tween.tween_property(slot.get_node("Platform"), "modulate", Color.WHITE, 0.36).set_trans(Tween.TRANS_SINE)
		var rim: CanvasItem = slot.get_node_or_null("CharacterRim") as CanvasItem
		if rim != null:
			return_tween.tween_property(rim, "modulate:a", 0.42, 0.48).set_trans(Tween.TRANS_SINE)
	await return_tween.finished
	_action_menu.visible = false
	_selected = ""
	_prompt.text = "CHOOSE YOUR CHARACTER"
	_prompt.add_theme_color_override("font_color", Color(0.82, 0.80, 0.88, 0.92))
	for slot_id: String in SLOT_IDS:
		_fade_slot_runes(slot_id, AURA_ALPHA, 0.22)
	await get_tree().create_timer(0.22).timeout
	for slot_id: String in SLOT_IDS:
		var hit: Button = _slot(slot_id).get_node("HitArea") as Button
		hit.disabled = false
		hit.mouse_filter = Control.MOUSE_FILTER_STOP
	_transitioning = false


func _set_action_interactive(enabled: bool) -> void:
	for child: Node in _action_buttons.get_children():
		var button: Button = child as Button
		button.disabled = not enabled
		button.mouse_filter = Control.MOUSE_FILTER_STOP if enabled else Control.MOUSE_FILTER_IGNORE
		if not enabled:
			button.release_focus()
			button.call("reset_hover")


func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and not _selected.is_empty():
		_back_to_character_select()
		get_viewport().set_input_as_handled()


func _create_character_rim(slot_id: String, character: TextureRect) -> TextureRect:
	var rim := TextureRect.new()
	rim.name = "CharacterRim"
	rim.position = character.position
	rim.size = character.size
	rim.texture = character.texture
	rim.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rim.stretch_mode = character.stretch_mode
	rim.texture_filter = character.texture_filter
	rim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rim.modulate.a = 0.42

	var material := ShaderMaterial.new()
	material.shader = SELECTION_GLOW_SHADER
	material.set_shader_parameter(
		"glow_color",
		SELECTION_GLOW_COLORS.get(slot_id, Color("c987ff"))
	)
	material.set_shader_parameter("intensity", 0.82)
	rim.material = material
	return rim


func _fade_slot_runes(slot_id: String, target_alpha: float, duration: float) -> void:
	var slot := _slot(slot_id)
	var aura := slot.get_node_or_null("Aura") as CanvasItem
	if aura != null:
		var aura_tween := create_tween()
		aura_tween.tween_property(aura, "modulate:a", target_alpha, duration).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

	var underglow := slot.get_node_or_null("Underglow") as CanvasItem
	if underglow != null:
		var underglow_target: float = 0.0 if target_alpha <= 0.001 else 0.24
		var underglow_tween := create_tween()
		underglow_tween.tween_property(underglow, "modulate:a", underglow_target, duration).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)


func _apply_action_theme(slot_id: String) -> void:
	_action_accent = CLASS_ACCENTS.get(slot_id, Color("cb91ff"))
	var exit_button: Button = $ExitButton as Button
	for state: String in ["normal", "hover", "pressed"]:
		var exit_style: StyleBoxFlat = exit_button.get_theme_stylebox(state).duplicate() as StyleBoxFlat
		exit_style.border_color = Color(_action_accent.lightened(0.25), 0.75 if state == "normal" else 1.0)
		exit_button.add_theme_stylebox_override(state, exit_style)
	exit_button.queue_redraw()
	_action_title.add_theme_color_override("font_color", _action_accent.lightened(0.28))
	_status.add_theme_color_override("font_color", _action_accent.lightened(0.18))
	for art: NinePatchRect in [_action_panel, _action_decor]:
		var shader_material: ShaderMaterial = art.material as ShaderMaterial
		shader_material.set_shader_parameter("accent", _action_accent)
	for child: Node in _action_buttons.get_children():
		child.call("set_accent", _action_accent)


func _focus_background(slot_id: String) -> void:
	var index := _slot_index(slot_id)
	var background_material := _background.material as ShaderMaterial
	if background_material != null:
		background_material.set_shader_parameter("selected_index", float(index))

	if _background_tween != null:
		_background_tween.kill()
	_background_tween = create_tween()
	_background_tween.tween_method(
		Callable(self, "_set_background_blend"),
		_background_blend,
		1.0,
		0.55
	).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

	_background_particles.call("focus_class", index)
	_foreground_particles.call("focus_class", index)


func _clear_background_focus() -> void:
	if _background_tween != null:
		_background_tween.kill()
	_background_tween = create_tween()
	_background_tween.tween_method(
		Callable(self, "_set_background_blend"),
		_background_blend,
		0.0,
		0.45
	).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

	_background_particles.call("clear_focus")
	_foreground_particles.call("clear_focus")


func _set_background_blend(value: float) -> void:
	_background_blend = clampf(value, 0.0, 1.0)
	var background_material := _background.material as ShaderMaterial
	if background_material != null:
		background_material.set_shader_parameter("selection_blend", _background_blend)


func _slot_index(slot_id: String) -> int:
	var index := SLOT_IDS.find(slot_id)
	return maxi(index, 0)


func _new_game() -> void:
	if _selected.is_empty() or _transitioning:
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
