extends CanvasLayer

const HEART_EMPTY := preload("res://assets/ui/hud/heart-empty.svg")
const HEART_FULL := preload("res://assets/ui/hud/heart-full.svg")
const ORB_SHAPE := preload("res://assets/ui/hud/orb-shape.svg")
const ORB_SHADING := preload("res://assets/ui/hud/orb-shading.svg")

const REFERENCE_VIEW := Vector2(1648.0, 928.0)
const REFERENCE_EDGE := Vector2(28.0, 26.0)
const HEART_COUNT := 8
const ORB_COUNT := 8
const MANA_COLOR := Color(0.40, 0.725, 1.0, 1.0)
const ORB_OUTER := Color(0.212, 0.357, 0.365, 1.0)
const ORB_INNER := Color(0.027, 0.106, 0.125, 1.0)

@onready var _root: Control = $Root
@onready var _hearts: HBoxContainer = $Root/Hearts
@onready var _orbs: HBoxContainer = $Root/ManaFrame/Orbs
@onready var _level_label: Label = $Root/PlayerPanel/ClassRow/Level
@onready var _xp_fill: ColorRect = $Root/ProgressPanel/XPTrack/Fill
@onready var _xp_value: Label = $Root/ProgressPanel/XPValue
@onready var _sp_value: Label = $Root/SPGroup/SPValue
@onready var _objective: Label = $Root/ObjectivePanel/Objective
@onready var _toast: Label = $Root/Toast

var _controller: Node = null
var _heart_widgets: Array[TextureProgressBar] = []
var _orb_fills: Array[TextureRect] = []

var _previous_hp: int = -1
var _previous_xp: int = -1
var _previous_level: int = -1
var _previous_sp: int = -1
var _toast_tween: Tween = null


func _ready() -> void:
	_build_hearts()
	_build_orbs()
	_toast.visible = false
	_apply_reference_scale()
	get_viewport().size_changed.connect(_apply_reference_scale)


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


func _apply_reference_scale() -> void:
	var viewport_size := Vector2(get_viewport().get_visible_rect().size)
	var scale_factor := minf(
		viewport_size.x / REFERENCE_VIEW.x,
		viewport_size.y / REFERENCE_VIEW.y
	)
	_root.scale = Vector2(scale_factor, scale_factor)
	_root.position = REFERENCE_EDGE * scale_factor


func _build_hearts() -> void:
	for child in _hearts.get_children():
		child.queue_free()
	_heart_widgets.clear()

	for _index in range(HEART_COUNT):
		var heart := TextureProgressBar.new()
		heart.custom_minimum_size = Vector2(32.0, 32.0)
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
	_orb_fills.clear()

	for _index in range(ORB_COUNT):
		var holder := Control.new()
		holder.custom_minimum_size = Vector2(24.0, 24.0)
		holder.mouse_filter = Control.MOUSE_FILTER_IGNORE

		var outer := TextureRect.new()
		outer.position = Vector2.ZERO
		outer.size = Vector2(24.0, 24.0)
		outer.texture = ORB_SHAPE
		outer.modulate = ORB_OUTER
		outer.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		outer.stretch_mode = TextureRect.STRETCH_SCALE
		outer.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		outer.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(outer)

		var inner := TextureRect.new()
		inner.position = Vector2(2.0, 2.0)
		inner.size = Vector2(20.0, 20.0)
		inner.texture = ORB_SHAPE
		inner.modulate = ORB_INNER
		inner.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		inner.stretch_mode = TextureRect.STRETCH_SCALE
		inner.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		inner.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(inner)

		var fill := TextureRect.new()
		fill.position = Vector2.ZERO
		fill.size = Vector2(24.0, 24.0)
		fill.texture = ORB_SHAPE
		fill.modulate = MANA_COLOR
		fill.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		fill.stretch_mode = TextureRect.STRETCH_SCALE
		fill.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(fill)

		var shading := TextureRect.new()
		shading.position = Vector2.ZERO
		shading.size = Vector2(24.0, 24.0)
		shading.texture = ORB_SHADING
		shading.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		shading.stretch_mode = TextureRect.STRETCH_SCALE
		shading.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		shading.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(shading)

		_orbs.add_child(holder)
		_orb_fills.append(fill)


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
	var xp_ratio: float = clampf(float(xp) / float(maxi(xp_target, 1)), 0.0, 1.0)
	var fill_size: Vector2 = _xp_fill.size
	fill_size.x = 270.0 * xp_ratio
	_xp_fill.size = fill_size
	_xp_value.text = "%d / %d" % [xp, xp_target]
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

	for index in range(_orb_fills.size()):
		_orb_fills[index].visible = index < filled


func _animate_damage() -> void:
	var base_x: float = _hearts.position.x
	var tween := create_tween()
	tween.tween_property(_hearts, "position:x", base_x - 3.0, 0.05)
	tween.tween_property(_hearts, "position:x", base_x + 3.0, 0.06)
	tween.tween_property(_hearts, "position:x", base_x - 2.0, 0.05)
	tween.tween_property(_hearts, "position:x", base_x, 0.06)


func _animate_heal() -> void:
	_hearts.scale = Vector2.ONE
	var tween := create_tween()
	tween.tween_property(_hearts, "scale", Vector2(1.08, 1.08), 0.14)
	tween.tween_property(_hearts, "scale", Vector2.ONE, 0.18)


func _animate_xp() -> void:
	_xp_fill.modulate = Color(1.35, 1.25, 0.72, 1.0)
	var tween := create_tween()
	tween.tween_property(_xp_fill, "modulate", Color.WHITE, 0.36)


func _animate_level() -> void:
	_level_label.scale = Vector2(1.18, 1.18)
	var tween := create_tween()
	tween.tween_property(_level_label, "scale", Vector2.ONE, 0.42)


func _animate_sp() -> void:
	_sp_value.modulate = Color(1.35, 1.2, 0.55, 1.0)
	var tween := create_tween()
	tween.tween_property(_sp_value, "modulate", Color.WHITE, 0.42)


func _xp_for_level(level: int) -> int:
	return int(round(60.0 * pow(float(level), 1.5)))
