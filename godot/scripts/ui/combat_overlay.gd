extends CanvasLayer

@onready var _root: Control = $Root
@onready var _enemy_name: Label = $Root/Panel/Margin/VBox/Header/EnemyName
@onready var _enemy_hp: Label = $Root/Panel/Margin/VBox/Header/EnemyHP
@onready var _player_hp: Label = $Root/Panel/Margin/VBox/PlayerRow/PlayerHP
@onready var _mana: Label = $Root/Panel/Margin/VBox/PlayerRow/Mana
@onready var _spell_name: Label = $Root/Panel/Margin/VBox/SpellName
@onready var _typed: Label = $Root/Panel/Margin/VBox/WordRow/Typed
@onready var _remaining: Label = $Root/Panel/Margin/VBox/WordRow/Remaining
@onready var _defense: Label = $Root/Panel/Margin/VBox/Defense
@onready var _feedback: Label = $Root/Panel/Margin/VBox/Feedback


func open_battle(enemy_name: String) -> void:
	_enemy_name.text = enemy_name.to_upper()
	_feedback.text = "Type the shown spell."
	_root.visible = true


func close_overlay() -> void:
	_root.visible = false


func set_enemy_hp(current: int, maximum: int) -> void:
	_enemy_hp.text = "HP %d/%d" % [current, maximum]


func set_player_state(hp: int, max_hp: int, mana: float, max_mana: int) -> void:
	_player_hp.text = "HP %d/%d" % [hp, max_hp]
	_mana.text = "MP %d/%d" % [int(round(mana)), max_mana]


func set_spell(spell_name: String, word: String, typed_count: int) -> void:
	_spell_name.text = spell_name
	var split := clampi(typed_count, 0, word.length())
	_typed.text = word.substr(0, split)
	_remaining.text = word.substr(split)


func set_waiting(message: String) -> void:
	_spell_name.text = message
	_typed.text = ""
	_remaining.text = ""


func set_defense(digit: String, progress: float, result: String) -> void:
	if digit.is_empty():
		_defense.text = ""
		return

	if result == "perfect":
		_defense.text = "DEFEND [%s]  PERFECT" % digit
	elif result == "failed":
		_defense.text = "DEFEND [%s]  MISSED" % digit
	elif progress >= 0.8:
		_defense.text = "DEFEND [%s]  NOW!" % digit
	else:
		_defense.text = "DEFEND [%s]" % digit


func show_feedback(message: String) -> void:
	_feedback.text = message


func show_result(message: String) -> void:
	_spell_name.text = message
	_typed.text = ""
	_remaining.text = ""
	_defense.text = ""
	_feedback.text = ""
