extends CanvasLayer

signal closed
signal upgrade_purchased(spell_id: String)

const SPELL_ICONS := {
	"spark": preload("res://assets/moves/mage/spark.png"),
	"fireball": preload("res://assets/moves/mage/fireball.png"),
	"ice-spike": preload("res://assets/moves/mage/ice-spike.png"),
	"mend": preload("res://assets/moves/mage/mend.png"),
	"aegis": preload("res://assets/moves/mage/aegis.png"),
	"gale": preload("res://assets/moves/mage/gale.png"),
}

const SPELL_BORDER := preload("res://assets/ui/spellcraft/spell-border.png")
const SILK_REGULAR := preload("res://assets/fonts/silkscreen-latin-400-normal.woff2")
const SILK_BOLD := preload("res://assets/fonts/silkscreen-latin-700-normal.woff2")

const COLOR_TEXT := Color(0.93, 0.95, 0.94, 1.0)
const COLOR_MUTED := Color(0.61, 0.69, 0.70, 1.0)
const COLOR_GOLD := Color(0.91, 0.78, 0.36, 1.0)
const COLOR_CYAN := Color(0.55, 0.78, 0.85, 1.0)
const COLOR_CARD := Color(0.028, 0.078, 0.105, 0.96)
const COLOR_CARD_BORDER := Color(0.29, 0.42, 0.48, 0.95)

@onready var _root: Control = $Root
@onready var _sp_value: Label = $Root/Frame/Content/Header/SPBadge/SPValue
@onready var _list: GridContainer = $Root/Frame/Content/Scroll/List

var _controller: Node = null


func _ready() -> void:
	_root.visible = false


func open(controller: Node) -> void:
	_controller = controller
	_root.visible = true
	_refresh()


func close() -> void:
	if not _root.visible:
		return
	_root.visible = false
	closed.emit()


func _unhandled_input(event: InputEvent) -> void:
	if not _root.visible or not (event is InputEventKey):
		return

	var key_event := event as InputEventKey
	if key_event.pressed and not key_event.echo and key_event.keycode == KEY_ESCAPE:
		close()
		get_viewport().set_input_as_handled()


func _refresh() -> void:
	if _controller == null:
		return

	_sp_value.text = "%d SP" % int(_controller.get("skill_points"))

	for child in _list.get_children():
		child.queue_free()

	var ids: Array = _controller.call("get_upgradeable_spell_ids")
	for spell_id_value in ids:
		var spell_id := String(spell_id_value)
		var preview: Dictionary = _controller.call("get_spell_preview", spell_id)
		if preview.is_empty():
			continue
		_list.add_child(_make_spell_card(spell_id, preview))


func _make_spell_card(spell_id: String, preview: Dictionary) -> Control:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(128.0, 58.0)
	card.add_theme_stylebox_override("panel", _card_style())

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 6)
	margin.add_theme_constant_override("margin_right", 6)
	margin.add_theme_constant_override("margin_top", 4)
	margin.add_theme_constant_override("margin_bottom", 4)
	card.add_child(margin)

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 3)
	margin.add_child(stack)

	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 5)
	stack.add_child(top)

	var icon_holder := Control.new()
	icon_holder.custom_minimum_size = Vector2(31.0, 31.0)
	top.add_child(icon_holder)

	var border := TextureRect.new()
	border.position = Vector2(-3.0, -3.0)
	border.size = Vector2(37.0, 37.0)
	border.texture = SPELL_BORDER
	border.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	border.stretch_mode = TextureRect.STRETCH_SCALE
	border.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	border.mouse_filter = Control.MOUSE_FILTER_IGNORE
	icon_holder.add_child(border)

	var icon := TextureRect.new()
	icon.position = Vector2(4.0, 4.0)
	icon.size = Vector2(23.0, 23.0)
	icon.texture = SPELL_ICONS.get(spell_id) as Texture2D
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	icon_holder.add_child(icon)

	var copy := VBoxContainer.new()
	copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	copy.add_theme_constant_override("separation", 1)
	top.add_child(copy)

	var title_row := HBoxContainer.new()
	copy.add_child(title_row)

	var title := Label.new()
	title.text = String(preview["name"]).to_upper()
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_override("font", SILK_BOLD)
	title.add_theme_font_size_override("font_size", 6)
	title.add_theme_color_override("font_color", COLOR_TEXT)
	title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	title_row.add_child(title)

	var pips := _make_rank_pips(int(preview["rank"]), int(preview["max_rank"]))
	title_row.add_child(pips)

	var rank := Label.new()
	rank.text = "RANK %d / %d" % [int(preview["rank"]), int(preview["max_rank"])]
	rank.add_theme_font_override("font", SILK_REGULAR)
	rank.add_theme_font_size_override("font_size", 4)
	rank.add_theme_color_override("font_color", Color(0.51, 0.64, 0.67, 1.0))
	copy.add_child(rank)

	var current: Dictionary = preview["current"]
	var next: Dictionary = preview["next"]

	var words := Label.new()
	words.add_theme_font_override("font", SILK_REGULAR)
	words.add_theme_font_size_override("font_size", 5)
	words.add_theme_color_override("font_color", COLOR_GOLD)
	if next.is_empty():
		words.text = String(current["word"]).to_upper()
	else:
		words.text = "%s  >  %s" % [
			String(current["word"]).to_upper(),
			String(next["word"]).to_upper(),
		]
	words.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	copy.add_child(words)

	var effect := Label.new()
	effect.add_theme_font_override("font", SILK_REGULAR)
	effect.add_theme_font_size_override("font_size", 4)
	effect.add_theme_color_override("font_color", COLOR_MUTED)
	effect.text = _effect_text(current, next)
	effect.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	copy.add_child(effect)

	var button := Button.new()
	button.custom_minimum_size = Vector2(0.0, 17.0)
	button.add_theme_font_override("font", SILK_BOLD)
	button.add_theme_font_size_override("font_size", 5)
	button.add_theme_color_override("font_color", Color(0.88, 0.93, 0.72, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.91, 0.62, 1.0))
	button.add_theme_stylebox_override("normal", _button_style(false))
	button.add_theme_stylebox_override("hover", _button_style(true))
	button.add_theme_stylebox_override("pressed", _button_style(true))
	button.add_theme_stylebox_override("disabled", _disabled_button_style())

	var cost = preview["cost"]
	if cost == null:
		button.text = "MASTERED"
		button.disabled = true
	else:
		button.text = "UPGRADE  ·  %d SP" % int(cost)
		button.disabled = int(_controller.get("skill_points")) < int(cost)
		button.pressed.connect(_on_upgrade_pressed.bind(spell_id))
	stack.add_child(button)

	return card


func _make_rank_pips(rank: int, max_rank: int) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 4)

	for index in range(max_rank):
		var slot := Control.new()
		slot.custom_minimum_size = Vector2(7.0, 7.0)

		var diamond := ColorRect.new()
		diamond.position = Vector2(1.0, 1.0)
		diamond.size = Vector2(5.0, 5.0)
		diamond.pivot_offset = Vector2(2.5, 2.5)
		diamond.rotation = deg_to_rad(45.0)
		diamond.color = COLOR_GOLD if index < rank else Color(0.12, 0.20, 0.22, 1.0)
		diamond.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.add_child(diamond)

		row.add_child(slot)

	return row


func _effect_text(current: Dictionary, next: Dictionary) -> String:
	var kind := String(current["kind"])
	if next.is_empty():
		if kind == "guard":
			return "WARD %d%%" % int(round(float(current["guard"]) * 100.0))
		if kind == "heal":
			return "RESTORE %d HP" % int(current["power"])
		if float(current["delay"]) > 0.0:
			return "%d DMG  ·  %.1fs DELAY" % [int(current["power"]), float(current["delay"])]
		return "%d DAMAGE" % int(current["power"])

	if kind == "guard":
		return "WARD %d%%  >  %d%%" % [
			int(round(float(current["guard"]) * 100.0)),
			int(round(float(next["guard"]) * 100.0)),
		]
	if kind == "heal":
		return "HEAL %d  >  %d" % [int(current["power"]), int(next["power"])]
	if float(current["delay"]) > 0.0:
		return "%d/%.1fs  >  %d/%.1fs" % [
			int(current["power"]),
			float(current["delay"]),
			int(next["power"]),
			float(next["delay"]),
		]
	return "%d DAMAGE  >  %d" % [int(current["power"]), int(next["power"])]


func _on_upgrade_pressed(spell_id: String) -> void:
	if _controller == null:
		return
	if bool(_controller.call("upgrade_spell", spell_id)):
		upgrade_purchased.emit(spell_id)
		_refresh()


func _card_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = COLOR_CARD
	style.border_color = COLOR_CARD_BORDER
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 1
	style.corner_radius_top_right = 1
	style.corner_radius_bottom_left = 1
	style.corner_radius_bottom_right = 1
	return style


func _button_style(hovered: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.09, 0.17, 0.20, 1.0) if hovered else Color(0.045, 0.11, 0.14, 1.0)
	style.border_color = Color(0.84, 0.72, 0.35, 1.0) if hovered else Color(0.33, 0.45, 0.49, 1.0)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	return style


func _disabled_button_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.04, 0.07, 0.08, 1.0)
	style.border_color = Color(0.23, 0.29, 0.30, 1.0)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	return style
