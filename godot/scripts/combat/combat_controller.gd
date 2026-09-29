extends Node

signal battle_started
signal battle_finished(victory: bool, xp: int)

const TypingParser = preload("res://scripts/combat/typing_parser.gd")
const MageSpells = preload("res://data/mage_spells.gd")

const PLAYER_BASE_HP := 82
const PLAYER_BASE_MANA := 60
const MANA_REGEN := 4.5
const SPELL_DELAY := 0.28
const MISCAST_DELAY := 0.38
const INPUT_DELAY := 0.45
const DEFENSE_WARNING := 1.0
const PERFECT_WINDOW := 0.2
const CRITICAL_MULTIPLIER := 1.7
const ATTACK_IMPACT_LEAD := 0.5
const DEFENSE_RESULT_TIME := 0.43

var active: bool = false

var player_level: int = 1
var player_xp: int = 0
var skill_points: int = 0
var player_hp: int = PLAYER_BASE_HP
var player_max_hp: int = PLAYER_BASE_HP
var mana: float = float(PLAYER_BASE_MANA)
var max_mana: int = PLAYER_BASE_MANA

var _player = null
var _enemy = null
var _overlay = null
var _camera: Camera2D = null
var _saved_camera_position := Vector2.ZERO
var _saved_camera_zoom := Vector2.ONE
var _parser = TypingParser.new()
var _rng := RandomNumberGenerator.new()

var _spell: Dictionary = {}
var _previous_spell_id: String = ""
var _next_spell_at: float = 0.0
var _input_enabled_at: float = 0.0

var _next_attack_at: float = 0.0
var _pending_attack_delay: float = 0.0
var _guard: float = 0.0

var _defense_active: bool = false
var _defense_digit: String = ""
var _defense_target_at: float = 0.0
var _defense_result: String = "pending"
var _attack_started: bool = false
var _attack_impact_applied: bool = false
var _defense_clear_at: float = 0.0

var _ending: bool = false
var _ending_timer: float = 0.0
var _victory: bool = false
var _victory_xp: int = 0


func _ready() -> void:
	_rng.randomize()


func start(enemy, player, overlay) -> void:
	if active or enemy == null or bool(enemy.get("defeated")):
		return

	active = true
	_ending = false
	_victory = false
	_victory_xp = 0
	_player = player
	_enemy = enemy
	_overlay = overlay
	_camera = _player.get_node_or_null("Camera2D") as Camera2D
	if _camera != null:
		_saved_camera_position = _camera.position
		_saved_camera_zoom = _camera.zoom
		_enter_battle_camera()
	_parser.reset()
	_spell.clear()
	_previous_spell_id = ""
	_guard = 0.0
	_pending_attack_delay = 0.0
	_reset_defense()

	var now := _now()
	_input_enabled_at = now + INPUT_DELAY
	_next_spell_at = now + 0.30
	_next_attack_at = now + INPUT_DELAY + float(_enemy.get("attack_interval"))

	_player.call("set_control", false)
	_player.call("face_toward", _enemy.global_position.x)
	_enemy.call("set_combat_locked", true, _player.global_position.x)

	var impact_callable := Callable(self, "_on_enemy_attack_impact")
	if not _enemy.is_connected("attack_impact", impact_callable):
		_enemy.connect("attack_impact", impact_callable)

	_overlay.call("open_battle", String(_enemy.get("enemy_name")))
	_refresh_ui()
	battle_started.emit()


func _process(delta: float) -> void:
	if not active:
		return

	if _ending:
		_ending_timer -= delta
		if _ending_timer <= 0.0:
			_complete_battle()
		return

	var now := _now()
	mana = minf(float(max_mana), mana + MANA_REGEN * delta)

	if _spell.is_empty() and now >= _next_spell_at:
		_choose_spell(now)

	_update_defense(now)
	_refresh_ui()


func _unhandled_input(event: InputEvent) -> void:
	if not active or _ending or not (event is InputEventKey):
		return

	var key_event := event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return
	if key_event.ctrl_pressed or key_event.alt_pressed or key_event.meta_pressed:
		return

	var handled := false
	var code := int(key_event.keycode)
	var now := _now()

	if code >= KEY_0 and code <= KEY_9:
		handled = true
		if _defense_active and _defense_result == "pending":
			_resolve_defense_press(String.chr(code), now)
	elif code >= KEY_A and code <= KEY_Z:
		handled = true
		if now >= _input_enabled_at and not _spell.is_empty():
			var character := String.chr(code + 32)
			_handle_letter(character)

	if handled:
		get_viewport().set_input_as_handled()


func _handle_letter(character: String) -> void:
	var result: Dictionary = _parser.key(character, float(Time.get_ticks_msec()))
	var result_type := String(result.get("type", "noop"))

	if result_type == "progress":
		_overlay.call("set_spell", String(_spell["id"]), String(_spell["name"]), String(_spell["word"]), _parser.typed)
	elif result_type == "complete":
		_cast_spell(result)
	elif result_type == "miss":
		_miscast(result)


func _choose_spell(now: float) -> void:
	var affordable: Array = []
	for spell in MageSpells.starter_deck():
		if float(spell["cost"]) <= mana:
			affordable.append(spell)

	if affordable.is_empty():
		_overlay.call("set_waiting", "Recovering mana")
		_next_spell_at = now + 0.10
		return

	var choices: Array = []
	if affordable.size() > 1:
		for spell in affordable:
			if String(spell["id"]) != _previous_spell_id:
				choices.append(spell)
	else:
		choices = affordable

	if choices.is_empty():
		choices = affordable

	_spell = choices[_rng.randi_range(0, choices.size() - 1)].duplicate(true)
	_previous_spell_id = String(_spell["id"])
	_parser.select(String(_spell["word"]))
	_overlay.call("set_spell", String(_spell["id"]), String(_spell["name"]), String(_spell["word"]), 0)


func _cast_spell(result: Dictionary) -> void:
	var spell_name := String(_spell["name"])
	var kind := String(_spell["kind"])
	var multiplier := float(result.get("multiplier", 1.0))
	var cps = result.get("cps")
	var cost := float(_spell["cost"])
	mana = maxf(0.0, mana - cost)

	var power := int(round(
		float(_spell["power"]) * multiplier * (1.0 + 0.06 * float(player_level - 1))
	))

	if kind == "heal":
		var healed := mini(power, player_max_hp - player_hp)
		player_hp += healed
		_overlay.call("show_feedback", "%s · +%d HP%s" % [
			spell_name,
			healed,
			_speed_text(cps),
		])
	elif kind == "guard":
		_guard = float(_spell["guard"])
		_overlay.call("show_feedback", "%s · WARD %d%%" % [
			spell_name,
			int(round(_guard * 100.0)),
		])
	else:
		_enemy.call("take_damage", power)
		_overlay.call("show_feedback", "%s · %d damage%s" % [
			spell_name,
			power,
			_speed_text(cps),
		])

		var delay := float(_spell.get("delay", 0.0))
		if delay > 0.0:
			_delay_attack(delay)

	_parser.reset()
	_spell.clear()
	_next_spell_at = _now() + SPELL_DELAY

	if int(_enemy.get("hp")) <= 0:
		_finish(true)


func _miscast(result: Dictionary) -> void:
	var progress := float(result.get("progress", 0.0))
	var wrong := String(result.get("got", "?"))
	var expected := String(result.get("expected", "?"))
	var damage := maxi(2, int(round(float(player_max_hp) * (0.05 + progress * 0.08))))
	player_hp = maxi(0, player_hp - damage)

	_overlay.call("show_feedback", "MISCAST · '%s' instead of '%s' · -%d HP" % [
		wrong,
		expected,
		damage,
	])

	_parser.reset()
	_spell.clear()
	_next_spell_at = _now() + MISCAST_DELAY

	if player_hp <= 0:
		_finish(false)


func _update_defense(now: float) -> void:
	if _defense_active:
		if _defense_result == "pending" and now > _defense_target_at + PERFECT_WINDOW:
			_defense_result = "failed"

		var attack_start_at := _defense_target_at + PERFECT_WINDOW - ATTACK_IMPACT_LEAD
		if not _attack_started and now >= attack_start_at:
			_attack_started = true
			_enemy.call("play_attack")

		var progress := clampf(
			(now - (_defense_target_at - DEFENSE_WARNING)) / DEFENSE_WARNING,
			0.0,
			1.0
		)
		_overlay.call("set_defense", _defense_digit, progress, _defense_result)

		if _attack_impact_applied and _defense_clear_at > 0.0 and now >= _defense_clear_at:
			_reset_defense()
		return

	if not _defense_active and now >= _next_attack_at - DEFENSE_WARNING:
		_defense_active = true
		_defense_digit = str(_rng.randi_range(0, 9))
		_defense_target_at = _next_attack_at
		_defense_result = "pending"
		_attack_started = false
		_attack_impact_applied = false
		_defense_clear_at = 0.0


func _resolve_defense_press(digit: String, now: float) -> void:
	if digit == _defense_digit and absf(now - _defense_target_at) <= PERFECT_WINDOW:
		_defense_result = "perfect"
		_overlay.call("show_feedback", "PERFECT DEFENSE")
	else:
		_defense_result = "failed"
		_overlay.call("show_feedback", "Defense missed")


func _on_enemy_attack_impact() -> void:
	if not active or _ending or _attack_impact_applied:
		return

	var now := _now()
	_attack_impact_applied = true

	if _defense_result == "pending":
		_defense_result = "failed"

	if _defense_result == "perfect":
		_overlay.call("show_feedback", "PERFECT · no damage")
	else:
		var raw_damage := float(_enemy.get("attack_damage")) * CRITICAL_MULTIPLIER
		var damage := maxi(1, int(round(raw_damage * (1.0 - _guard))))
		player_hp = maxi(0, player_hp - damage)
		_guard = 0.0
		_overlay.call("show_feedback", "Forest Savage strikes · -%d HP" % damage)

	_defense_clear_at = now + DEFENSE_RESULT_TIME
	_next_attack_at = now + float(_enemy.get("attack_interval")) + _pending_attack_delay
	_pending_attack_delay = 0.0
	_refresh_ui()

	if player_hp <= 0:
		_finish(false)


func _delay_attack(seconds: float) -> void:
	if _defense_active and not _attack_impact_applied:
		_pending_attack_delay += seconds
	else:
		_next_attack_at += seconds


func _finish(victory: bool) -> void:
	if _ending:
		return

	_ending = true
	_victory = victory
	_ending_timer = 0.85
	_parser.reset()
	_spell.clear()
	_enemy.call("cancel_attack")

	if victory:
		_victory_xp = int(_enemy.get("xp_reward"))
		_gain_xp(_victory_xp)
		_overlay.call("show_result", "VICTORY  +%d XP" % _victory_xp)
	else:
		_overlay.call("show_result", "DEFEAT")


func _complete_battle() -> void:
	var impact_callable := Callable(self, "_on_enemy_attack_impact")
	if _enemy != null and _enemy.is_connected("attack_impact", impact_callable):
		_enemy.disconnect("attack_impact", impact_callable)

	if _victory:
		pass
	else:
		player_hp = player_max_hp
		mana = float(max_mana)
		_enemy.call("reset_enemy")
		_player.call("reset_to_spawn")

	if not _victory:
		_enemy.call("set_combat_locked", false, _player.global_position.x)

	_restore_camera()
	_player.call("set_control", true)
	_overlay.call("close_overlay")

	var finished_xp := _victory_xp
	var finished_victory := _victory
	active = false
	_ending = false
	_enemy = null
	_player = null
	_overlay = null
	_camera = null
	_reset_defense()
	battle_finished.emit(finished_victory, finished_xp)


func _enter_battle_camera() -> void:
	if _camera == null:
		return

	var spacing := absf(_player.global_position.x - _enemy.global_position.x)
	var battle_zoom := minf(1.38, 480.0 / (spacing + 110.0))
	var midpoint_offset_x := (_enemy.global_position.x - _player.global_position.x) * 0.5
	var target_position := Vector2(midpoint_offset_x, -39.0)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(_camera, "position", target_position, 0.38)
	tween.tween_property(_camera, "zoom", Vector2(battle_zoom, battle_zoom), 0.38)


func _restore_camera() -> void:
	if _camera == null:
		return

	var tween := create_tween()
	tween.set_parallel(true)
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(_camera, "position", _saved_camera_position, 0.38)
	tween.tween_property(_camera, "zoom", _saved_camera_zoom, 0.38)


func _gain_xp(amount: int) -> void:
	player_xp += amount
	while player_xp >= _xp_for_level(player_level):
		player_xp -= _xp_for_level(player_level)
		player_level += 1
		skill_points += 1
		player_max_hp = int(round(float(player_max_hp) * 1.12))
		max_mana = int(round(float(max_mana) * 1.10))
		player_hp = player_max_hp
		mana = float(max_mana)


func _xp_for_level(level: int) -> int:
	return int(round(60.0 * pow(float(level), 1.5)))


func _speed_text(cps) -> String:
	if cps == null:
		return ""
	return " · %.1f CPS" % float(cps)


func _refresh_ui() -> void:
	if _overlay == null or _enemy == null:
		return
	_overlay.call("set_enemy_hp", int(_enemy.get("hp")), int(_enemy.get("max_hp")))
	_overlay.call("set_player_state", player_hp, player_max_hp, mana, max_mana)
	if not _spell.is_empty():
		_overlay.call("set_spell", String(_spell["id"]), String(_spell["name"]), String(_spell["word"]), _parser.typed)


func _reset_defense() -> void:
	_defense_active = false
	_defense_digit = ""
	_defense_target_at = 0.0
	_defense_result = "pending"
	_attack_started = false
	_attack_impact_applied = false
	_defense_clear_at = 0.0
	if _overlay != null:
		_overlay.call("set_defense", "", 0.0, "pending")


func _now() -> float:
	return float(Time.get_ticks_msec()) / 1000.0
