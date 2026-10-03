extends Control

const LIGHT_SHADER := preload("res://shaders/ui/character_selection_lighting.gdshader")

const CLASS_COLORS := {
	"runesinger": Color("c987ff"),
	"berserker": Color("ff5543"),
	"wayfarer": Color("4fcaff"),
}
const SLOT_IDS: Array[String] = ["runesinger", "berserker", "wayfarer"]
const START_INTENSITY: float = 0.62
const SECONDARY_INTENSITY: float = 0.31
const PARTICLES_PER_CLASS: int = 72
const FIELD_SIZE: Vector2 = Vector2(516.0, 618.0)
const FOOT_ANCHOR: Vector2 = Vector2(240.0, 604.0)

var _selected_id: String = ""
var _slots: Array[Control] = []
var _fields: Array[ColorRect] = []
var _strengths: Array[float] = [START_INTENSITY, START_INTENSITY, START_INTENSITY]
var _particles: Array[Dictionary] = []
var _strength_tween: Tween = null
var _time: float = 0.0
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_rng.seed = 0x51EC710
	var additive: CanvasItemMaterial = CanvasItemMaterial.new()
	additive.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = additive
	for index: int in range(SLOT_IDS.size()):
		var slot_name: String = ["Runesinger", "Berserker", "Wayfarer"][index]
		_slots.append(get_parent().get_node("Characters/" + slot_name) as Control)
		var field: ColorRect = ColorRect.new()
		field.name = slot_name + "Glow"
		field.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var field_material: ShaderMaterial = ShaderMaterial.new()
		field_material.shader = LIGHT_SHADER
		field_material.set_shader_parameter("glow_color", CLASS_COLORS[SLOT_IDS[index]])
		field_material.set_shader_parameter("intensity", START_INTENSITY)
		field_material.set_shader_parameter("seed", float(index) * 4.17 + 0.73)
		field.material = field_material
		add_child(field)
		_fields.append(field)
	_update_fields()
	for zone_index: int in range(SLOT_IDS.size()):
		for particle_index: int in range(PARTICLES_PER_CLASS):
			_particles.append(_make_particle(zone_index, true))
	visible = true
	set_process(true)


func show_selection(selected_id: String) -> void:
	_selected_id = selected_id
	_transition_strengths()


func show_start() -> void:
	_selected_id = ""
	_transition_strengths()


func _transition_strengths() -> void:
	if _strength_tween != null:
		_strength_tween.kill()
	_strength_tween = create_tween().set_parallel(true)
	for index: int in range(SLOT_IDS.size()):
		var target: float = START_INTENSITY
		if not _selected_id.is_empty():
			target = 1.0 if SLOT_IDS[index] == _selected_id else SECONDARY_INTENSITY
		_strength_tween.tween_method(_set_strength.bind(index), _strengths[index], target, 0.50).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)


func _set_strength(value: float, index: int) -> void:
	_strengths[index] = value
	var field_material: ShaderMaterial = _fields[index].material as ShaderMaterial
	field_material.set_shader_parameter("intensity", value)


func _update_fields() -> void:
	# Each class keeps its field and particles for the entire menu lifetime.
	# Follow the real slot transform so the light never jumps between fixed zones.
	for index: int in range(_slots.size()):
		var slot: Control = _slots[index]
		var scale_factor: Vector2 = slot.scale
		var foot: Vector2 = slot.position + slot.pivot_offset * (Vector2.ONE - scale_factor) + FOOT_ANCHOR * scale_factor
		_fields[index].size = FIELD_SIZE * scale_factor
		_fields[index].position = foot + Vector2(0.0, 26.0) * scale_factor - _fields[index].size * Vector2(0.5, 0.79)


func _process(delta: float) -> void:
	_update_fields()
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
	for particle in _particles:
		var zone_index := int(particle["zone"])
		var class_id: String = SLOT_IDS[zone_index]
		var base_color: Color = CLASS_COLORS.get(class_id, Color("c987ff"))
		var phase := float(particle["phase"])
		var x := float(particle["x"]) + sin(_time * float(particle["drift_speed"]) + phase) * float(particle["drift"])
		var y := float(particle["y"])
		var field: ColorRect = _fields[zone_index]
		var world_position: Vector2 = field.position + Vector2(x, y) * field.size
		var position: Vector2 = world_position.round()
		var life_ratio := clampf(float(particle["life"]) / float(particle["max_life"]), 0.0, 1.0)
		var life_fade := smoothstep(0.0, 0.16, life_ratio) * smoothstep(0.0, 0.18, 1.0 - life_ratio)
		var twinkle := 0.74 + sin(_time * float(particle["twinkle_speed"]) + phase) * 0.26
		var alpha: float = float(particle["alpha"]) * life_fade * twinkle
		var zone_strength: float = _strengths[zone_index]
		var color := Color(base_color.r, base_color.g, base_color.b, alpha * zone_strength)
		var particle_size := float(particle["size"])
		var shape := int(particle["shape"])

		if shape == 0:
			var halo := Color(color.r, color.g, color.b, color.a * 0.22)
			draw_rect(Rect2(position - Vector2.ONE * (particle_size + 3.0) * 0.5, Vector2.ONE * (particle_size + 3.0)), halo)
			draw_rect(Rect2(position - Vector2.ONE * particle_size * 0.5, Vector2.ONE * particle_size), color)
		elif shape == 1:
			var streak_length: float = particle_size * 4.5
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


func _make_particle(zone_index: int, initial: bool) -> Dictionary:
	# Positions and velocities are normalized within the moving light field.
	var top: float = 0.16
	var bottom: float = 0.90
	var max_life: float = _rng.randf_range(2.3, 5.4)
	var shape_roll: float = _rng.randf()
	var shape: int = 0
	if shape_roll > 0.94:
		shape = 2
	elif shape_roll > 0.76:
		shape = 1
	return {
		"zone": zone_index,
		"x": clampf(0.5 + _rng.randfn(0.0, 0.22), 0.04, 0.96),
		"y": _rng.randf_range(top, bottom) if initial else bottom + _rng.randf_range(0.0, 0.04),
		"top": top,
		"speed": _rng.randf_range(30.0, 76.0) / FIELD_SIZE.y,
		"size": _rng.randf_range(1.3, 2.7),
		"alpha": _rng.randf_range(0.40, 0.85),
		"phase": _rng.randf_range(0.0, TAU),
		"drift": _rng.randf_range(2.0, 13.0) / FIELD_SIZE.x,
		"drift_speed": _rng.randf_range(0.32, 0.88),
		"twinkle_speed": _rng.randf_range(0.8, 2.1),
		"life": _rng.randf_range(0.25, max_life) if initial else max_life,
		"max_life": max_life,
		"shape": shape,
	}
