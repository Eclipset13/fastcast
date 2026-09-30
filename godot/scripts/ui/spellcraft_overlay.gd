extends CanvasLayer

signal closed
signal upgrade_purchased(spell_id: String)

const SPELL_BORDER := preload("res://assets/ui/spellcraft/spell-border.png")
const SILK_REGULAR := preload("res://assets/fonts/silkscreen-latin-400-normal.woff2")
const SILK_BOLD := preload("res://assets/fonts/silkscreen-latin-700-normal.woff2")

const COLOR_TEXT := Color(0.93, 0.95, 0.94, 1.0)
const COLOR_MUTED := Color(0.61, 0.69, 0.70, 1.0)
const COLOR_GOLD := Color(0.91, 0.78, 0.36, 1.0)
const COLOR_CARD := Color(0.028, 0.078, 0.105, 0.96)
const COLOR_CARD_BORDER := Color(0.29, 0.42, 0.48, 0.95)

enum Tab {
	DECK,
	LEARN,
	UPGRADE,
}

@onready var _root: Control = $Root
@onready var _sp_value: Label = $Root/Frame/Content/Header/SPBadge/SPValue
@onready var _deck_tab: Button = $Root/Frame/Content/Tabs/Deck
@onready var _learn_tab: Button = $Root/Frame/Content/Tabs/Learn
@onready var _upgrade_tab: Button = $Root/Frame/Content/Tabs/Upgrade
@onready var _section_title: Label = $Root/Frame/Content/SectionTitle
@onready var _section_copy: Label = $Root/Frame/Content/SectionCopy
@onready var _list: GridContainer = $Root/Frame/Content/Scroll/List

var _controller: Node = null
var _tab: int = Tab.UPGRADE


func _ready() -> void:
	_root.visible = false
	_deck_tab.pressed.connect(_set_tab.bind(Tab.DECK))
	_learn_tab.pressed.connect(_set_tab.bind(Tab.LEARN))
	_upgrade_tab.pressed.connect(_set_tab.bind(Tab.UPGRADE))
	_update_tab_styles()


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


func _set_tab(tab: int) -> void:
	_tab = tab
	_update_tab_styles()
	_refresh()


func _refresh() -> void:
	if _controller == null:
		return

	_sp_value.text = "%d SP" % int(_controller.get("skill_points"))

	for child in _list.get_children():
		child.queue_free()

	match _tab:
		Tab.DECK:
			_section_title.text = "YOUR DECK"
			_section_copy.text = "SIX ACTIVE SPELLS · CHOOSE RANKS"
			_render_deck()
		Tab.LEARN:
			_section_title.text = "LEARN SPELLS"
			_section_copy.text = "UNLOCK NEW MAGIC WITH SP"
			_render_learn()
		_:
			_section_title.text = "UPGRADE SPELLS"
			_section_copy.text = "STRONGER MAGIC · LONGER WORDS"
			_render_upgrade()


func _render_upgrade() -> void:
	var ids: Array = _controller.call("get_upgradeable_spell_ids")
	for spell_id_value in ids:
		var spell_id := String(spell_id_value)
		var preview: Dictionary = _controller.call("get_spell_preview", spell_id)
		if preview.is_empty():
			continue
		_list.add_child(_make_upgrade_card(spell_id, preview))


func _render_learn() -> void:
	var ids: Array = _controller.call("get_catalog_spell_ids")
	for spell_id_value in ids:
		var spell_id := String(spell_id_value)
		var preview: Dictionary = _controller.call("get_spell_preview", spell_id)
		if preview.is_empty():
			continue
		_list.add_child(_make_learn_card(spell_id, preview))


func _render_deck() -> void:
	var deck_ids: Array = _controller.call("get_deck_spell_ids")
	for slot in range(6):
		if slot < deck_ids.size():
			var spell_id := String(deck_ids[slot])
			var preview: Dictionary = _controller.call("get_spell_preview", spell_id)
			if not preview.is_empty():
				_list.add_child(_make_deck_card(spell_id, preview, slot))
		else:
			_list.add_child(_make_empty_slot(slot))

	var learned_ids: Array = _controller.call("get_learned_spell_ids")
	for spell_id_value in learned_ids:
		var spell_id := String(spell_id_value)
		if deck_ids.has(spell_id):
			continue
		var preview: Dictionary = _controller.call("get_spell_preview", spell_id)
		if preview.is_empty():
			continue
		_list.add_child(_make_reserve_card(spell_id, preview))


func _make_upgrade_card(spell_id: String, preview: Dictionary) -> Control:
	var card := _make_card_shell()
	var stack := card.get_node("Margin/Stack") as VBoxContainer
	var current: Dictionary = preview["current"]
	var next: Dictionary = preview["next"]

	stack.add_child(_make_spell_top(spell_id, preview, current, next, true))

	var button := _make_action_button()
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


func _make_learn_card(spell_id: String, preview: Dictionary) -> Control:
	var card := _make_card_shell()
	var stack := card.get_node("Margin/Stack") as VBoxContainer
	var current: Dictionary = preview["current"]
	stack.add_child(_make_spell_top(spell_id, preview, current, {}, false))

	var button := _make_action_button()
	if bool(preview["learned"]):
		button.text = "LEARNED"
		button.disabled = true
	else:
		var cost := int(preview["unlock_cost"])
		button.text = "LEARN  ·  %d SP" % cost
		button.disabled = int(_controller.get("skill_points")) < cost
		button.pressed.connect(_on_learn_pressed.bind(spell_id))
	stack.add_child(button)
	return card


func _make_deck_card(
	spell_id: String,
	preview: Dictionary,
	slot: int
) -> Control:
	var card := _make_card_shell()
	var stack := card.get_node("Margin/Stack") as VBoxContainer
	var selected: Dictionary = preview["selected"]
	stack.add_child(_make_spell_top(spell_id, preview, selected, {}, false))

	var controls := HBoxContainer.new()
	controls.add_theme_constant_override("separation", 3)
	stack.add_child(controls)

	var slot_label := Label.new()
	slot_label.text = "0%d" % (slot + 1)
	slot_label.add_theme_font_override("font", SILK_REGULAR)
	slot_label.add_theme_font_size_override("font_size", 4)
	slot_label.add_theme_color_override("font_color", Color(0.44, 0.55, 0.59, 1.0))
	controls.add_child(slot_label)

	var unlocked := int(preview["rank"])
	var selected_rank := int(preview["selected_rank"])
	for rank in range(1, unlocked + 1):
		var rank_button := Button.new()
		rank_button.custom_minimum_size = Vector2(19.0, 13.0)
		rank_button.text = "R%d" % rank
		rank_button.add_theme_font_override("font", SILK_BOLD)
		rank_button.add_theme_font_size_override("font_size", 4)
		rank_button.add_theme_stylebox_override(
			"normal",
			_rank_button_style(rank == selected_rank)
		)
		rank_button.add_theme_stylebox_override("hover", _rank_button_style(true))
		rank_button.pressed.connect(_on_rank_pressed.bind(spell_id, rank))
		controls.add_child(rank_button)

	var remove := Button.new()
	remove.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	remove.text = "REMOVE"
	remove.add_theme_font_override("font", SILK_BOLD)
	remove.add_theme_font_size_override("font_size", 4)
	remove.add_theme_stylebox_override("normal", _button_style(false))
	remove.add_theme_stylebox_override("hover", _button_style(true))
	remove.pressed.connect(_on_unequip_pressed.bind(spell_id))
	controls.add_child(remove)
	return card


func _make_reserve_card(spell_id: String, preview: Dictionary) -> Control:
	var card := _make_card_shell()
	var stack := card.get_node("Margin/Stack") as VBoxContainer
	var selected: Dictionary = preview["selected"]
	stack.add_child(_make_spell_top(spell_id, preview, selected, {}, false))

	var button := _make_action_button()
	button.text = "EQUIP"
	var deck_ids: Array = _controller.call("get_deck_spell_ids")
	button.disabled = deck_ids.size() >= 6
	button.pressed.connect(_on_equip_pressed.bind(spell_id))
	stack.add_child(button)
	return card


func _make_empty_slot(slot: int) -> Control:
	var card := _make_card_shell()
	var stack := card.get_node("Margin/Stack") as VBoxContainer

	var title := Label.new()
	title.text = "0%d  ·  EMPTY SLOT" % (slot + 1)
	title.add_theme_font_override("font", SILK_BOLD)
	title.add_theme_font_size_override("font_size", 6)
	title.add_theme_color_override("font_color", Color(0.46, 0.57, 0.60, 1.0))
	stack.add_child(title)

	var hint := Label.new()
	hint.text = "EQUIP A LEARNED SPELL"
	hint.add_theme_font_override("font", SILK_REGULAR)
	hint.add_theme_font_size_override("font_size", 4)
	hint.add_theme_color_override("font_color", COLOR_MUTED)
	stack.add_child(hint)
	return card


func _make_spell_top(
	spell_id: String,
	preview: Dictionary,
	current: Dictionary,
	next: Dictionary,
	show_upgrade: bool
) -> Control:
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 5)

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
	icon.texture = _spell_icon(spell_id)
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

	var words := Label.new()
	words.add_theme_font_override("font", SILK_REGULAR)
	words.add_theme_font_size_override("font_size", 5)
	words.add_theme_color_override("font_color", COLOR_GOLD)
	if show_upgrade and not next.is_empty():
		words.text = "%s  >  %s" % [
			String(current["word"]).to_upper(),
			String(next["word"]).to_upper(),
		]
	else:
		words.text = String(current["word"]).to_upper()
	words.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	copy.add_child(words)

	var effect := Label.new()
	effect.add_theme_font_override("font", SILK_REGULAR)
	effect.add_theme_font_size_override("font_size", 4)
	effect.add_theme_color_override("font_color", COLOR_MUTED)
	effect.text = _effect_text(current, next if show_upgrade else {})
	effect.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	copy.add_child(effect)

	return top


func _make_card_shell() -> PanelContainer:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(128.0, 58.0)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", _card_style())

	var margin := MarginContainer.new()
	margin.name = "Margin"
	margin.add_theme_constant_override("margin_left", 6)
	margin.add_theme_constant_override("margin_right", 6)
	margin.add_theme_constant_override("margin_top", 4)
	margin.add_theme_constant_override("margin_bottom", 4)
	card.add_child(margin)

	var stack := VBoxContainer.new()
	stack.name = "Stack"
	stack.add_theme_constant_override("separation", 3)
	margin.add_child(stack)
	return card


func _make_action_button() -> Button:
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
	return button


func _spell_icon(spell_id: String) -> Texture2D:
	var path := "res://assets/moves/mage/%s.png" % spell_id
	if not ResourceLoader.exists(path):
		return null
	return load(path) as Texture2D


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
	var kind := String(current.get("kind", "damage"))
	if next.is_empty():
		if kind == "guard":
			return "WARD %d%%" % int(round(float(current.get("guard", 0.0)) * 100.0))
		if kind == "heal":
			return "RESTORE %d HP" % int(current.get("power", 0))
		if kind == "utility":
			return "DELAY %.1fs" % float(current.get("delay", 0.0))
		if kind == "hybrid":
			return "%d DMG + %d HP" % [
				int(current.get("power", 0)),
				int(current.get("power", 0)),
			]
		var dot_total := float(current.get("dot_total", 0.0))
		if dot_total > 0.0:
			return "%d DMG + %d DOT" % [
				int(current.get("power", 0)),
				int(dot_total),
			]
		var self_cost := int(current.get("self_cost", 0))
		if self_cost > 0:
			return "%d DMG · -%d HP" % [
				int(current.get("power", 0)),
				self_cost,
			]
		if float(current.get("delay", 0.0)) > 0.0:
			return "%d DMG · %.1fs DELAY" % [
				int(current.get("power", 0)),
				float(current.get("delay", 0.0)),
			]
		return "%d DAMAGE" % int(current.get("power", 0))

	if kind == "guard":
		return "WARD %d%%  >  %d%%" % [
			int(round(float(current.get("guard", 0.0)) * 100.0)),
			int(round(float(next.get("guard", 0.0)) * 100.0)),
		]
	if kind == "heal":
		return "HEAL %d  >  %d" % [
			int(current.get("power", 0)),
			int(next.get("power", 0)),
		]
	if kind == "utility":
		return "DELAY %.1f  >  %.1fs" % [
			float(current.get("delay", 0.0)),
			float(next.get("delay", 0.0)),
		]
	return "%d DAMAGE  >  %d" % [
		int(current.get("power", 0)),
		int(next.get("power", 0)),
	]


func _on_upgrade_pressed(spell_id: String) -> void:
	if _controller == null:
		return
	if bool(_controller.call("upgrade_spell", spell_id)):
		upgrade_purchased.emit(spell_id)
		_refresh()


func _on_learn_pressed(spell_id: String) -> void:
	if _controller != null and bool(_controller.call("learn_spell", spell_id)):
		_refresh()


func _on_equip_pressed(spell_id: String) -> void:
	if _controller != null and bool(_controller.call("equip_spell", spell_id)):
		_refresh()


func _on_unequip_pressed(spell_id: String) -> void:
	if _controller != null and bool(_controller.call("unequip_spell", spell_id)):
		_refresh()


func _on_rank_pressed(spell_id: String, rank: int) -> void:
	if _controller != null and bool(_controller.call("select_spell_rank", spell_id, rank)):
		_refresh()


func _update_tab_styles() -> void:
	var tabs := [_deck_tab, _learn_tab, _upgrade_tab]
	for index in range(tabs.size()):
		var button := tabs[index] as Button
		var active := index == _tab
		button.add_theme_font_override("font", SILK_BOLD if active else SILK_REGULAR)
		button.add_theme_font_size_override("font_size", 5)
		button.add_theme_color_override(
			"font_color",
			Color(0.96, 0.87, 0.63, 1.0) if active else Color(0.43, 0.52, 0.55, 1.0)
		)
		button.add_theme_stylebox_override("normal", _tab_style(active))
		button.add_theme_stylebox_override("hover", _tab_style(true))
		button.add_theme_stylebox_override("pressed", _tab_style(true))


func _tab_style(active: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.07, 0.15, 0.19, 0.96) if active else Color(0.02, 0.06, 0.08, 0.35)
	style.border_color = Color(0.84, 0.74, 0.40, 1.0) if active else Color(0.25, 0.34, 0.38, 0.55)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 2 if active else 1
	return style


func _rank_button_style(active: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.20, 0.20, 1.0) if active else Color(0.035, 0.08, 0.10, 1.0)
	style.border_color = COLOR_GOLD if active else Color(0.25, 0.34, 0.37, 1.0)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	return style


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
