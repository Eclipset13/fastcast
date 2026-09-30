extends CanvasLayer

const SILKSCREEN_BOLD := preload("res://assets/fonts/silkscreen-latin-700-normal.woff2")

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
@onready var _icon: TextureRect = $Root/SpellBlock/Icon
@onready var _spell_name: Label = $Root/SpellBlock/SpellName
@onready var _word_row: HBoxContainer = $Root/SpellBlock/WordRow
@onready var _hint: Label = $Root/SpellBlock/Hint
@onready var _defense_block: Control = $Root/DefenseBlock
@onready var _defense_result: Label = $Root/DefenseBlock/Result
@onready var _defense_ring: Control = $Root/DefenseBlock/Ring
@onready var _defense_digit: Label = $Root/DefenseBlock/Ring/Digit
@onready var _feedback: Label = $Root/Feedback
@onready var _damage_flash: ColorRect = $Root/DamageFlash
@onready var _parry_flash: ColorRect = $Root/ParryFlash

var _word: String = ""
var _letter_labels: Array[Label] = []
var _last_typed_count: int = 0


func open_battle(enemy_name: String) -> void:
	_enemy_name.text = enemy_name.to_upper()
	_root.visible = true
	_defense_block.visible = false
	_feedback.text = ""
	_hint.text = "TYPE TO CAST"
	_last_typed_count = 0
	_damage_flash.visible = false
	_parry_flash.visible = false


func close_overlay() -> void:
	_root.visible = false
	_clear_word()


func set_enemy_hp(current: int, maximum: int) -> void:
	_enemy_bar.max_value = maximum
	_enemy_bar.value = current
	_enemy_hp.text = "%d / %d" % [current, maximum]


func set_player_state(_hp: int, _max_hp: int, _mana: float, _max_mana: int) -> void:
	pass


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


func flash_damage(critical: bool = true) -> void:
	_damage_flash.visible = true
	var flash_material := _damage_flash.material as ShaderMaterial
	if flash_material == null:
		return

	var start_strength: float = 0.95 if critical else 0.58
	flash_material.set_shader_parameter("strength", start_strength)

	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_method(
		func(value: float) -> void:
			flash_material.set_shader_parameter("strength", value),
		start_strength,
		0.0,
		0.42 if critical else 0.30
	)
	tween.finished.connect(func() -> void:
		_damage_flash.visible = false
	)


func flash_parry() -> void:
	_parry_flash.visible = true
	_parry_flash.modulate.a = 0.08

	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(_parry_flash, "modulate:a", 0.0, 0.16)
	tween.finished.connect(func() -> void:
		_parry_flash.visible = false
	)


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
	_last_typed_count = 0
	for index in range(word.length()):
		var character := word.substr(index, 1).to_upper()
		var label := Label.new()
		label.text = character
		label.custom_minimum_size = Vector2(20.0, 38.0)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_font_override("font", SILKSCREEN_BOLD)
		label.add_theme_font_size_override("font_size", 28)
		label.add_theme_color_override("font_color", COLOR_MUTED)
		label.add_theme_color_override("font_shadow_color", Color(0.02, 0.06, 0.08, 0.95))
		label.add_theme_color_override("font_outline_color", Color(0.02, 0.06, 0.08, 0.9))
		label.add_theme_constant_override("outline_size", 1)
		label.add_theme_constant_override("shadow_offset_x", 2)
		label.add_theme_constant_override("shadow_offset_y", 2)
		label.pivot_offset = Vector2(10.0, 19.0)
		_word_row.add_child(label)
		_letter_labels.append(label)


func _update_word(typed_count: int) -> void:
	var clamped_count := clampi(typed_count, 0, _letter_labels.size())

	for index in range(_letter_labels.size()):
		var label := _letter_labels[index]
		if index < clamped_count:
			label.add_theme_color_override("font_color", COLOR_TYPED)
			label.add_theme_color_override("font_outline_color", Color(0.72, 0.50, 0.12, 0.9))
			label.add_theme_constant_override("outline_size", 2)
		elif index == clamped_count:
			label.add_theme_color_override("font_color", COLOR_NEXT)
			label.add_theme_color_override("font_outline_color", Color(0.25, 0.62, 0.72, 0.65))
			label.add_theme_constant_override("outline_size", 1)
		else:
			label.add_theme_color_override("font_color", COLOR_MUTED)
			label.add_theme_color_override("font_outline_color", Color(0.02, 0.06, 0.08, 0.9))
			label.add_theme_constant_override("outline_size", 1)

	if clamped_count > _last_typed_count:
		for index in range(_last_typed_count, clamped_count):
			_animate_typed_letter(_letter_labels[index])

	_last_typed_count = clamped_count


func _animate_typed_letter(label: Label) -> void:
	label.scale = Vector2(1.55, 1.55)
	label.modulate = Color(1.0, 0.88, 0.42, 1.0)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.set_trans(Tween.TRANS_BACK)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(label, "scale", Vector2.ONE, 0.17)
	tween.tween_property(label, "modulate", Color.WHITE, 0.20)


func _clear_word() -> void:
	_word = ""
	_last_typed_count = 0
	for label in _letter_labels:
		if is_instance_valid(label):
			label.queue_free()
	_letter_labels.clear()
