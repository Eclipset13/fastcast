extends Button
## Texture-backed ornament, with shared class accents and mouse/keyboard hover.

const FEATURE_FRAME: Texture2D = preload("res://assets/ui/main-menu/action-menu-feature-frame.svg")
const ROW_RULE: Texture2D = preload("res://assets/ui/main-menu/action-menu-row-rule.svg")
const ICONS: Dictionary = {
	"NewGame": preload("res://assets/ui/main-menu/icon-new-game.svg"),
	"Saves": preload("res://assets/ui/main-menu/icon-saves.svg"),
	"Settings": preload("res://assets/ui/main-menu/icon-settings.svg"),
	"Controls": preload("res://assets/ui/main-menu/icon-controls.svg"),
	"Skills": preload("res://assets/ui/main-menu/icon-skills.svg"),
	"Back": preload("res://assets/ui/main-menu/icon-back.svg"),
}

var hover_amount: float = 0.0:
	set(value):
		hover_amount = value
		_update_ink()

var _accent: Color = Color("cb91ff")
var _caption: Label
var _icon: TextureRect
var _hover_tween: Tween
var _pointer_inside: bool = false
var _featured: bool = false


func _ready() -> void:
	_featured = name == "NewGame"
	var empty: StyleBoxEmpty = StyleBoxEmpty.new()
	for state: String in ["normal", "hover", "pressed", "focus", "disabled"]:
		add_theme_stylebox_override(state, empty)
	_caption = Label.new()
	_caption.text = text
	text = ""
	_caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_caption.add_theme_font_override("font", get_theme_font("font"))
	_caption.add_theme_font_size_override("font_size", 28 if _featured else 26)
	_caption.add_theme_color_override("font_shadow_color", Color(0.025, 0.02, 0.055, 1.0))
	_caption.add_theme_constant_override("shadow_offset_y", 2)
	_caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	add_child(_caption)
	_icon = TextureRect.new()
	_icon.texture = ICONS.get(String(name)) as Texture2D
	_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_icon.size = Vector2(32, 32)
	add_child(_icon)
	resized.connect(_update_ink)
	mouse_entered.connect(func() -> void:
		_pointer_inside = true
		_animate_hover()
	)
	mouse_exited.connect(func() -> void:
		_pointer_inside = false
		_animate_hover()
	)
	focus_entered.connect(_animate_hover)
	focus_exited.connect(_animate_hover)
	_update_ink()


func set_accent(color: Color) -> void:
	_accent = color
	_update_ink()


func reset_hover() -> void:
	_pointer_inside = false
	if _hover_tween != null:
		_hover_tween.kill()
	hover_amount = 0.0


func _animate_hover() -> void:
	if _hover_tween != null:
		_hover_tween.kill()
	_hover_tween = create_tween()
	var target: float = 1.0 if (_pointer_inside or has_focus()) and not disabled else 0.0
	_hover_tween.tween_property(self, "hover_amount", target, 0.14).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func _update_ink() -> void:
	if not is_instance_valid(_caption):
		return
	var shift: float = hover_amount * 3.0
	_caption.position = Vector2(94.0 + shift, 0.0)
	_caption.size = Vector2(size.x - 112.0, size.y - 3.0)
	var resting: Color = Color.WHITE if _featured else _accent.lightened(0.48)
	_caption.add_theme_color_override("font_color", resting.lerp(Color.WHITE, hover_amount * 0.88))
	_icon.position = Vector2(30.0 + shift, (size.y - 32.0) * 0.5 - 1.0)
	_icon.modulate = _accent.lightened(0.40 + hover_amount * 0.40)
	queue_redraw()


func _draw() -> void:
	var ink: Color = _accent.lightened(0.45)
	if _featured:
		var rect: Rect2 = Rect2(Vector2(-8, -5), size + Vector2(16, 10))
		draw_texture_rect(FEATURE_FRAME, rect.grow(2.0), false, Color(_accent, 0.18 + hover_amount * 0.14))
		var wash: StyleBoxFlat = _hover_wash()
		wash.bg_color = Color(_accent, 0.07 + hover_amount * 0.05)
		draw_style_box(wash, Rect2(Vector2(4, 4), size - Vector2(8, 8)))
		# Soft texture halos are baked in the reusable frame, not a flat button box.
		draw_texture_rect(FEATURE_FRAME, rect, false, Color(ink, 0.84 + hover_amount * 0.16))
		if hover_amount > 0.001:
			draw_texture_rect(FEATURE_FRAME, rect.grow(1.0), false, Color(_accent, hover_amount * 0.22))
	else:
		if hover_amount > 0.001:
			draw_style_box(_hover_wash(), Rect2(Vector2(14, 6), size - Vector2(28, 12)))
		if name != "Back":
			draw_texture_rect(ROW_RULE, Rect2(36, size.y - 2, size.x - 58, 4), false, Color(_accent, 0.48 + hover_amount * 0.25))


func _hover_wash() -> StyleBoxFlat:
	var wash: StyleBoxFlat = StyleBoxFlat.new()
	wash.bg_color = Color(_accent, hover_amount * 0.065)
	wash.set_corner_radius_all(12)
	return wash
