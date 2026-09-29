extends CanvasLayer

const SPELL_TEXTURES := {
	"spark": preload("res://assets/moves/mage/spark.png"),
	"fireball": preload("res://assets/moves/mage/fireball.png"),
	"ice-spike": preload("res://assets/moves/mage/ice-spike.png"),
	"mend": preload("res://assets/moves/mage/mend.png"),
	"aegis": preload("res://assets/moves/mage/aegis.png"),
	"gale": preload("res://assets/moves/mage/gale.png"),
}

const COLOR_MUTED := Color(0.38, 0.46, 0.49, 0.82)
const COLOR_NEXT := Color(0.76, 0.83, 0.83, 1.0)
const COLOR_TYPED := Color(1.0, 0.95, 0.84, 1.0)

@onready var _root: Control = $Root
@onready var _enemy_name: Label = $Root/EnemyBlock/EnemyName
@onready var _enemy_bar: ProgressBar = $Root/EnemyBlock/EnemyBar
@onready var _enemy_hp: Label = $Root/EnemyBlock/EnemyHP
@onready var _player_state: Label = $Root/PlayerState
@onready var _icon: TextureRect = $Root/SpellBlock/Icon
@onready var _spell_name: Label = $Root/SpellBlock/SpellName
@onready var _word_row: HBoxContainer = $Root/SpellBlock/WordRow
@onready var _hint: Label = $Root/SpellBlock/Hint
@onready var _defense_block: Control = $Root/DefenseBlock
@onready var _defense_result: Label = $Root/DefenseBlock/Result
@onready var _defense_ring: Control = $Root/DefenseBlock/Ring
@onready var _defense_digit: Label = $Root/DefenseBlock/Ring/Digit
@onready var _feedback: Label = $Root/Feedback

var _word: String = ""
var _letter_labels: Array[Label] = []


func open_battle(enemy_name: String) -> void:
	_enemy_name.text = enemy_name.to_upper()
	_root.visible = true
	_defense_block.visible = false
	_feedback.text = ""
	_hint.text = "TYPE TO CAST"


func close_overlay() -> void:
	_root.visible = false
	_clear_word()


func set_enemy_hp(current: int, maximum: int) -> void:
	_enemy_bar.max_value = maximum
	_enemy_bar.value = current
	_enemy_hp.text = "%d / %d" % [current, maximum]


func set_player_state(hp: int, max_hp: int, mana: float, max_mana: int) -> void:
	_player_state.text = "HP %d/%d    MP %d/%d" % [hp, max_hp, int(round(mana)), max_mana]


func set_spell(spell_id: String, spell_name: String, word: String, typed_count: int) -> void:
	_icon.texture = SPELL_TEXTURES.get(spell_id)
	_icon.visible = _icon.texture != null
	_spell_name.text = spell_name.to_upper()
	_hint.text = "TYPE TO CAST"
	_feedback.text = ""
	if word != _word:
		_build_word(word)
	_update_word(typed_count)


func set_waiting(message: String) -> void:
	_icon.visible = false
	_spell_name.text = ""
	_clear_word()
	_hint.text = message.to_upper()


func set_defense(digit: String, progress: float, result: String) -> void:
	if digit.is_empty():
		_defense_block.visible = false
		return

	_defense_block.visible = true
	_defense_digit.text = digit
	_defense_ring.call("set_state", progress, result)

	if result == "perfect":
		_defense_result.text = "PERFECT"
	elif result == "failed":
		_defense_result.text = "CRITICAL"
	elif progress >= 0.8:
		_defense_result.text = "NOW"
	else:
		_defense_result.text = ""


func show_feedback(message: String) -> void:
	_feedback.text = message.to_upper()


func show_result(message: String) -> void:
	_icon.visible = false
	_spell_name.text = ""
	_clear_word()
	_hint.text = ""
	_defense_block.visible = false
	_feedback.text = message


func _build_word(word: String) -> void:
	_clear_word()
	_word = word
	for index in range(word.length()):
		var character := word.substr(index, 1).to_upper()
		var label := Label.new()
		label.text = character
		label.custom_minimum_size = Vector2(20.0, 38.0)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_font_size_override("font_size", 28)
		label.add_theme_color_override("font_color", COLOR_MUTED)
		label.add_theme_color_override("font_shadow_color", Color(0.02, 0.06, 0.08, 0.95))
		label.add_theme_constant_override("shadow_offset_x", 2)
		label.add_theme_constant_override("shadow_offset_y", 2)
		_word_row.add_child(label)
		_letter_labels.append(label)


func _update_word(typed_count: int) -> void:
	for index in range(_letter_labels.size()):
		var label := _letter_labels[index]
		if index < typed_count:
			label.add_theme_color_override("font_color", COLOR_TYPED)
		elif index == typed_count:
			label.add_theme_color_override("font_color", COLOR_NEXT)
		else:
			label.add_theme_color_override("font_color", COLOR_MUTED)


func _clear_word() -> void:
	_word = ""
	for label in _letter_labels:
		if is_instance_valid(label):
			label.queue_free()
	_letter_labels.clear()
