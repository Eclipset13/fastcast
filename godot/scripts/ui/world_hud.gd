extends CanvasLayer

const HEART_EMPTY := preload("res://assets/ui/hud/heart-empty.svg")
const HEART_FULL := preload("res://assets/ui/hud/heart-full.svg")
const ORB_SHAPE := preload("res://assets/ui/hud/orb-shape.svg")
const ORB_SHADING := preload("res://assets/ui/hud/orb-shading.svg")

const HEART_COUNT := 8
const ORB_COUNT := 8
const MANA_COLOR := Color(0.4, 0.725, 1.0, 1.0)
const ORB_EMPTY_COLOR := Color(0.212, 0.357, 0.365, 1.0)

@onready var _hearts: HBoxContainer = $Root/Hearts
@onready var _orbs: HBoxContainer = $Root/ManaPanel/Orbs
@onready var _level_label: Label = $Root/PlayerPanel/ClassRow/Level
@onready var _xp_bar: ProgressBar = $Root/ProgressPanel/XPBar
@onready var _xp_value: Label = $Root/ProgressPanel/XPValue
@onready var _sp_value: Label = $Root/SPValue
@onready var _objective: Label = $Root/ObjectivePanel/Objective
@onready var _toast: Label = $Root/Toast

var _controller: Node = null
var _heart_widgets: Array[TextureProgressBar] = []
var _orb_widgets: Array[TextureProgressBar] = []

var _previous_hp: int = -1
var _previous_xp: int = -1
var _previous_level: int = -1
var _previous_sp: int = -1
var _toast_tween: Tween = null


func _ready() -> void:
	_build_hearts()
	_build_orbs()
	_toast.visible = false


func bind_controller(controller: Node) -> void:
	_controller = controller
	_refresh(true)


func set_objective(message: String) -> void:
	_objective.text = message.to_upper()


func show_toast(message: String) -> void:
	if _toast_tween != null:
		_toast_tween.kill()

	_toast.text = message.to_upper()
	_toast.visible = true
	_toast.modulate = Color.WHITE

	_toast_tween = create_tween()
	_toast_tween.tween_interval(1.5)
	_toast_tween.tween_property(_toast, "modulate:a", 0.0, 0.35)
	_toast_tween.finished.connect(func() -> void:
		_toast.visible = false
		_toast.modulate = Color.WHITE
	)


func _process(_delta: float) -> void:
	if _controller != null:
		_refresh(false)


func _build_hearts() -> void:
	for child in _hearts.get_children():
		child.queue_free()
	_heart_widgets.clear()

	for _index in range(HEART_COUNT):
		var heart := TextureProgressBar.new()
		heart.custom_minimum_size = Vector2(8.0, 8.0)
		heart.min_value = 0.0
		heart.max_value = 100.0
		heart.value = 100.0
		heart.texture_under = HEART_EMPTY
		heart.texture_progress = HEART_FULL
		heart.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		heart.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_hearts.add_child(heart)
		_heart_widgets.append(heart)


func _build_orbs() -> void:
	for child in _orbs.get_children():
		child.queue_free()
	_orb_widgets.clear()

	for _index in range(ORB_COUNT):
		var holder := Control.new()
		holder.custom_minimum_size = Vector2(6.0, 6.0)
		holder.mouse_filter = Control.MOUSE_FILTER_IGNORE

		var orb := TextureProgressBar.new()
		orb.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		orb.min_value = 0.0
		orb.max_value = 100.0
		orb.value = 100.0
		orb.texture_under = ORB_SHAPE
		orb.texture_progress = ORB_SHAPE
		orb.tint_under = ORB_EMPTY_COLOR
		orb.tint_progress = MANA_COLOR
		orb.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		orb.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(orb)

		var shading := TextureRect.new()
		shading.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		shading.texture = ORB_SHADING
		shading.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		shading.stretch_mode = TextureRect.STRETCH_SCALE
		shading.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		shading.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(shading)

		_orbs.add_child(holder)
		_orb_widgets.append(orb)


func _refresh(force: bool) -> void:
	if _controller == null:
		return

	var hp: int = int(_controller.get("player_hp"))
	var max_hp: int = maxi(1, int(_controller.get("player_max_hp")))
	var mana: float = float(_controller.get("mana"))
	var max_mana: int = maxi(1, int(_controller.get("max_mana")))
	var level: int = int(_controller.get("player_level"))
	var xp: int = int(_controller.get("player_xp"))
	var sp: int = int(_controller.get("skill_points"))

	_update_hearts(hp, max_hp)
	_update_orbs(mana, max_mana)

	_level_label.text = "LV %d" % level
	var xp_target: int = _xp_for_level(level)
	_xp_bar.max_value = xp_target
	_xp_bar.value = xp
	_xp_value.text = "%d/%d" % [xp, xp_target]
	_sp_value.text = "%d SP" % sp

	if not force:
		if _previous_hp >= 0 and hp < _previous_hp:
			_animate_damage()
		elif _previous_hp >= 0 and hp > _previous_hp:
			_animate_heal()

		if _previous_xp >= 0 and xp > _previous_xp:
			_animate_xp()
		if _previous_level >= 0 and level > _previous_level:
			_animate_level()
		if _previous_sp >= 0 and sp > _previous_sp:
			_animate_sp()

	_previous_hp = hp
	_previous_xp = xp
	_previous_level = level
	_previous_sp = sp


func _update_hearts(hp: int, max_hp: int) -> void:
	var half_units: int = int(round(
		(float(maxi(hp, 0)) / float(max_hp)) * float(HEART_COUNT * 2)
	))

	for index in range(_heart_widgets.size()):
		var units: int = clampi(half_units - index * 2, 0, 2)
		_heart_widgets[index].value = float(units) * 50.0


func _update_orbs(mana: float, max_mana: int) -> void:
	var filled: int = int(round(
		(maxf(mana, 0.0) / float(max_mana)) * float(ORB_COUNT)
	))

	for index in range(_orb_widgets.size()):
		_orb_widgets[index].value = 100.0 if index < filled else 0.0


func _animate_damage() -> void:
	var base_x: float = _hearts.position.x
	var tween := create_tween()
	tween.tween_property(_hearts, "position:x", base_x - 1.0, 0.04)
	tween.tween_property(_hearts, "position:x", base_x + 1.0, 0.05)
	tween.tween_property(_hearts, "position:x", base_x, 0.05)


func _animate_heal() -> void:
	_hearts.scale = Vector2.ONE
	var tween := create_tween()
	tween.tween_property(_hearts, "scale", Vector2(1.05, 1.05), 0.10)
	tween.tween_property(_hearts, "scale", Vector2.ONE, 0.14)


func _animate_xp() -> void:
	_xp_bar.modulate = Color(1.25, 1.18, 0.72, 1.0)
	var tween := create_tween()
	tween.tween_property(_xp_bar, "modulate", Color.WHITE, 0.30)


func _animate_level() -> void:
	_level_label.scale = Vector2(1.15, 1.15)
	var tween := create_tween()
	tween.tween_property(_level_label, "scale", Vector2.ONE, 0.30)


func _animate_sp() -> void:
	_sp_value.modulate = Color(1.3, 1.18, 0.55, 1.0)
	var tween := create_tween()
	tween.tween_property(_sp_value, "modulate", Color.WHITE, 0.30)


func _xp_for_level(level: int) -> int:
	return int(round(60.0 * pow(float(level), 1.5)))
