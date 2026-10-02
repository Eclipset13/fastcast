extends Control

const LIGHT_SHADER := preload("res://shaders/ui/character_selection_lighting.gdshader")

const CLASS_COLORS := {
	"runesinger": Color("c987ff"),
	"berserker": Color("ff5543"),
	"wayfarer": Color("4fcaff"),
}
const SLOT_IDS: Array[String] = ["runesinger", "berserker", "wayfarer"]
const ZONE_RECTS: Array[Rect2] = [
	Rect2(-38.0, 24.0, 640.0, 766.0),
	Rect2(455.0, 218.0, 350.0, 560.0),
	Rect2(715.0, 218.0, 350.0, 560.0),
]
const ZONE_INTENSITIES: Array[float] = [1.0, 0.31, 0.31]
const PARTICLES_PER_ZONE: Array[int] = [96, 30, 30]

var selection_alpha: float = 0.0:
	set(value):
		selection_alpha = clampf(value, 0.0, 1.0)
		_apply_alpha()

var _selected_id: String = ""
var _zone_ids: Array[String] = ["runesinger", "berserker", "wayfarer"]
var _fields: Array[ColorRect] = []
var _particles: Array[Dictionary] = []
var _fade_tween: Tween = null
var _time: float = 0.0
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false
	_rng.seed = 0x51EC710

	var additive := CanvasItemMaterial.new()
	additive.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = additive

	for zone_index in range(ZONE_RECTS.size()):
		var field := ColorRect.new()
		field.name = ["PrimaryGlow", "SecondaryGlowA", "SecondaryGlowB"][zone_index]
		field.position = ZONE_RECTS[zone_index].position
		field.size = ZONE_RECTS[zone_index].size
		field.mouse_filter = Control.MOUSE_FILTER_IGNORE

		var field_material := ShaderMaterial.new()
		field_material.shader = LIGHT_SHADER
		field_material.set_shader_parameter("glow_color", Color.WHITE)
		field_material.set_shader_parameter("intensity", ZONE_INTENSITIES[zone_index])
		field_material.set_shader_parameter("seed", float(zone_index) * 4.17 + 0.73)
		field.material = field_material
		add_child(field)
		_fields.append(field)

	set_process(true)


func show_selection(selected_id: String) -> void:
	_selected_id = selected_id
	_zone_ids = [selected_id]
	for slot_id in SLOT_IDS:
		if slot_id != selected_id:
			_zone_ids.append(slot_id)

	for zone_index in range(_fields.size()):
		var field_material := _fields[zone_index].material as ShaderMaterial
		field_material.set_shader_parameter(
			"glow_color",
			CLASS_COLORS.get(_zone_ids[zone_index], Color("c987ff"))
		)

	_rebuild_particles()
	visible = true
	selection_alpha = 0.0
	_kill_fade_tween()
	_fade_tween = create_tween()
	_fade_tween.tween_property(self, "selection_alpha", 1.0, 0.46).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func hide_selection() -> void:
	_kill_fade_tween()
	_fade_tween = create_tween()
	_fade_tween.tween_property(self, "selection_alpha", 0.0, 0.34).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	_fade_tween.finished.connect(func() -> void:
		if selection_alpha <= 0.001:
			visible = false
			_selected_id = ""
			_particles.clear()
	)


func _process(delta: float) -> void:
	if not visible:
		return

	_time += delta
	for index in range(_particles.size()):
		var particle: Dictionary = _particles[index]
		particle["y"] = float(particle["y"]) - float(particle["speed"]) * delta
		particle["life"] = float(particle["life"]) - delta
		if float(particle["life"]) <= 0.0 or float(particle["y"]) < float(particle["top"]):
			particle = _make_particle(int(particle["zone"]), false)
		_particles[index] = particle

	queue_redraw()


func _draw() -> void:
	if selection_alpha <= 0.001:
		return

	for particle in _particles:
		var zone_index := int(particle["zone"])
		var class_id := _zone_ids[zone_index]
		var base_color: Color = CLASS_COLORS.get(class_id, Color("c987ff"))
		var phase := float(particle["phase"])
		var x := float(particle["x"]) + sin(_time * float(particle["drift_speed"]) + phase) * float(particle["drift"])
		var y := float(particle["y"])
		var position := Vector2(round(x), round(y))
		var life_ratio := clampf(float(particle["life"]) / float(particle["max_life"]), 0.0, 1.0)
		var life_fade := smoothstep(0.0, 0.16, life_ratio) * smoothstep(0.0, 0.18, 1.0 - life_ratio)
		var twinkle := 0.74 + sin(_time * float(particle["twinkle_speed"]) + phase) * 0.26
		var alpha := float(particle["alpha"]) * life_fade * twinkle * selection_alpha
		var zone_strength := 1.0 if zone_index == 0 else 0.42
		var color := Color(base_color.r, base_color.g, base_color.b, alpha * zone_strength)
		var particle_size := float(particle["size"])
		var shape := int(particle["shape"])

		if shape == 0:
			var halo := Color(color.r, color.g, color.b, color.a * 0.22)
			draw_rect(Rect2(position - Vector2.ONE * (particle_size + 3.0) * 0.5, Vector2.ONE * (particle_size + 3.0)), halo)
			draw_rect(Rect2(position - Vector2.ONE * particle_size * 0.5, Vector2.ONE * particle_size), color)
		elif shape == 1:
			var streak_length := particle_size * (5.5 if zone_index == 0 else 3.8)
			draw_line(
				position + Vector2(0.0, streak_length),
				position - Vector2(0.0, streak_length),
				color,
				maxf(1.0, particle_size * 0.55)
			)
		else:
			var radius := particle_size * 3.2
			draw_line(position + Vector2(-radius, 0.0), position + Vector2(radius, 0.0), color, 1.0)
			draw_line(position + Vector2(0.0, -radius), position + Vector2(0.0, radius), color, 1.0)
			var core := Color(1.0, 0.96, 1.0, color.a * 0.85)
			draw_rect(Rect2(position - Vector2.ONE, Vector2(2.0, 2.0)), core)


func _rebuild_particles() -> void:
	_particles.clear()
	for zone_index in range(ZONE_RECTS.size()):
		for particle_index in range(PARTICLES_PER_ZONE[zone_index]):
			_particles.append(_make_particle(zone_index, true))


func _make_particle(zone_index: int, initial: bool) -> Dictionary:
	var zone := ZONE_RECTS[zone_index]
	var center_x := zone.position.x + zone.size.x * 0.5
	var spread := zone.size.x * (0.34 if zone_index == 0 else 0.27)
	var bottom := zone.position.y + zone.size.y * (0.90 if zone_index == 0 else 0.91)
	var top := zone.position.y + zone.size.y * (0.16 if zone_index == 0 else 0.28)
	var max_life := _rng.randf_range(2.3, 5.4) if zone_index == 0 else _rng.randf_range(2.0, 4.2)
	var shape_roll := _rng.randf()
	var shape := 0
	if shape_roll > 0.94:
		shape = 2
	elif shape_roll > 0.76:
		shape = 1

	var particle_y := _rng.randf_range(top, bottom) if initial else bottom + _rng.randf_range(0.0, 32.0)
	var life := _rng.randf_range(0.25, max_life) if initial else max_life
	return {
		"zone": zone_index,
		"x": center_x + _rng.randfn(0.0, spread),
		"y": particle_y,
		"top": top,
		"speed": _rng.randf_range(30.0, 76.0) if zone_index == 0 else _rng.randf_range(22.0, 48.0),
		"size": _rng.randf_range(1.3, 3.1) if zone_index == 0 else _rng.randf_range(1.0, 2.2),
		"alpha": _rng.randf_range(0.40, 0.92),
		"phase": _rng.randf_range(0.0, TAU),
		"drift": _rng.randf_range(2.0, 13.0),
		"drift_speed": _rng.randf_range(0.32, 0.88),
		"twinkle_speed": _rng.randf_range(0.8, 2.1),
		"life": life,
		"max_life": max_life,
		"shape": shape,
	}


func _apply_alpha() -> void:
	for field in _fields:
		field.modulate.a = selection_alpha
	queue_redraw()


func _kill_fade_tween() -> void:
	if _fade_tween != null:
		_fade_tween.kill()
		_fade_tween = null
