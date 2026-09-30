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

const SILK_REGULAR := preload("res://assets/fonts/silkscreen-latin-400-normal.woff2")
const SILK_BOLD := preload("res://assets/fonts/silkscreen-latin-700-normal.woff2")

@onready var _root: Control = $Root
@onready var _sp_value: Label = $Root/Panel/SPValue
@onready var _list: VBoxContainer = $Root/Panel/Scroll/List

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
		_list.add_child(_make_spell_row(spell_id, preview))


func _make_spell_row(spell_id: String, preview: Dictionary) -> Control:
	var row := PanelContainer.new()
	row.custom_minimum_size = Vector2(0.0, 48.0)
	row.add_theme_stylebox_override("panel", _row_style())

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 6)
	margin.add_theme_constant_override("margin_right", 6)
	margin.add_theme_constant_override("margin_top", 5)
	margin.add_theme_constant_override("margin_bottom", 5)
	row.add_child(margin)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 7)
	margin.add_child(hbox)

	var icon := TextureRect.new()
	icon.custom_minimum_size = Vector2(34.0, 34.0)
	icon.texture = SPELL_ICONS.get(spell_id)
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	hbox.add_child(icon)

	var copy := VBoxContainer.new()
	copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	copy.add_theme_constant_override("separation", 1)
	hbox.add_child(copy)

	var name_row := HBoxContainer.new()
	copy.add_child(name_row)

	var title := Label.new()
	title.text = String(preview["name"]).to_upper()
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_override("font", SILK_BOLD)
	title.add_theme_font_size_override("font_size", 7)
	title.add_theme_color_override("font_color", Color(0.94, 0.96, 0.93, 1.0))
	name_row.add_child(title)

	var rank := Label.new()
	rank.text = "R%d/%d" % [int(preview["rank"]), int(preview["max_rank"])]
	rank.add_theme_font_override("font", SILK_REGULAR)
	rank.add_theme_font_size_override("font_size", 5)
	rank.add_theme_color_override("font_color", Color(0.55, 0.73, 0.78, 1.0))
	name_row.add_child(rank)

	var current: Dictionary = preview["current"]
	var next: Dictionary = preview["next"]

	var words := Label.new()
	words.add_theme_font_override("font", SILK_REGULAR)
	words.add_theme_font_size_override("font_size", 6)
	words.add_theme_color_override("font_color", Color(0.92, 0.78, 0.38, 1.0))
	if next.is_empty():
		words.text = String(current["word"]).to_upper() + "  ·  MASTERED"
	else:
		words.text = "%s  >  %s" % [
			String(current["word"]).to_upper(),
			String(next["word"]).to_upper(),
		]
	copy.add_child(words)

	var effect := Label.new()
	effect.add_theme_font_override("font", SILK_REGULAR)
	effect.add_theme_font_size_override("font_size", 4)
	effect.add_theme_color_override("font_color", Color(0.58, 0.67, 0.69, 1.0))
	effect.text = _effect_text(current, next)
	copy.add_child(effect)

	var button := Button.new()
	button.custom_minimum_size = Vector2(64.0, 28.0)
	button.add_theme_font_override("font", SILK_BOLD)
	button.add_theme_font_size_override("font_size", 5)
	var cost = preview["cost"]
	if cost == null:
		button.text = "MASTERED"
		button.disabled = true
	else:
		button.text = "UPGRADE\n%d SP" % int(cost)
		button.disabled = int(_controller.get("skill_points")) < int(cost)
		button.pressed.connect(_on_upgrade_pressed.bind(spell_id))
	hbox.add_child(button)

	return row


func _effect_text(current: Dictionary, next: Dictionary) -> String:
	var kind := String(current["kind"])
	if next.is_empty():
		if kind == "guard":
			return "WARD %d%%" % int(round(float(current["guard"]) * 100.0))
		if kind == "heal":
			return "RESTORE %d HP" % int(current["power"])
		if float(current["delay"]) > 0.0:
			return "%d DMG  ·  DELAY %.1fs" % [int(current["power"]), float(current["delay"])]
		return "%d DAMAGE" % int(current["power"])

	if kind == "guard":
		return "WARD %d%%  >  %d%%" % [
			int(round(float(current["guard"]) * 100.0)),
			int(round(float(next["guard"]) * 100.0)),
		]
	if kind == "heal":
		return "HEAL %d  >  %d" % [int(current["power"]), int(next["power"])]
	if float(current["delay"]) > 0.0:
		return "%d DMG / %.1fs  >  %d / %.1fs" % [
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


func _row_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.035, 0.09, 0.12, 0.94)
	style.border_color = Color(0.29, 0.42, 0.48, 0.9)
	style.set_border_width_all(1)
	return style
