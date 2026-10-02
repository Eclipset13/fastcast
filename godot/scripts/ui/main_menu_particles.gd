extends Control

@export var particle_count: int = 80
@export var speed_min: float = 9.0
@export var speed_max: float = 22.0
@export var alpha_scale: float = 0.42
@export var foreground: bool = false
@export var seed_offset: int = 0

const PURPLE := Color("c99aff")
const RED := Color("ff654f")
const BLUE := Color("62ceff")

var focus_blend: float = 0.0
var _focus_index: int = 0
var _particles: Array[Dictionary] = []
var _time: float = 0.0
var _focus_tween: Tween = null
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_rng.seed = 0x5A17C0DE + seed_offset

	var additive := CanvasItemMaterial.new()
	additive.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = additive

	for index in range(particle_count):
		_particles.append(_make_particle(true))
	queue_redraw()


func focus_class(index: int) -> void:
	_focus_index = clampi(index, 0, 2)
	_kill_focus_tween()
	_focus_tween = create_tween()
	_focus_tween.tween_property(self, "focus_blend", 1.0, 0.55).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func clear_focus() -> void:
	_kill_focus_tween()
	_focus_tween = create_tween()
	_focus_tween.tween_property(self, "focus_blend", 0.0, 0.45).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


func _process(delta: float) -> void:
	_time += delta

	var height: float = maxf(size.y, 810.0)
	for index in range(_particles.size()):
		var particle: Dictionary = _particles[index]
		particle["y"] = float(particle["y"]) - float(particle["speed"]) * delta

		if float(particle["y"]) < -18.0:
			particle = _make_particle(false)
			particle["y"] = height + _rng.randf_range(4.0, 56.0)

		_particles[index] = particle

	queue_redraw()


func _draw() -> void:
	var width: float = maxf(size.x, 1440.0)

	for particle in _particles:
		var x_base: float = float(particle["x"])
		var x: float = x_base + sin(_time * float(particle["drift_speed"]) + float(particle["phase"])) * float(particle["drift"])
		var y: float = float(particle["y"])
		var position := Vector2(round(x), round(y))

		var twinkle: float = 0.72 + sin(_time * float(particle["twinkle_speed"]) + float(particle["phase"]) * 1.71) * 0.28
		var alpha: float = float(particle["alpha"]) * alpha_scale * maxf(0.18, twinkle)
		var base_color: Color = _split_color(clampf(x_base / width, 0.0, 1.0))
		var focused_color: Color = [PURPLE, RED, BLUE][_focus_index]
		var color: Color = base_color.lerp(focused_color, focus_blend)
		color.a = alpha

		var particle_size: float = float(particle["size"])
		var shape: int = int(particle["shape"])

		if shape == 0:
			draw_rect(
				Rect2(position - Vector2.ONE * particle_size * 0.5, Vector2.ONE * particle_size),
				color
			)
		elif shape == 1:
			var length: float = particle_size * (3.0 if foreground else 2.0)
			draw_line(
				position + Vector2(0.0, length),
				position - Vector2(0.0, length),
				color,
				maxf(1.0, particle_size * 0.55)
			)
		else:
			var radius: float = particle_size * 1.8
			draw_line(position + Vector2(-radius, 0.0), position + Vector2(radius, 0.0), color, 1.0)
			draw_line(position + Vector2(0.0, -radius), position + Vector2(0.0, radius), color, 1.0)


func _make_particle(initial: bool) -> Dictionary:
	var width: float = maxf(size.x, 1440.0)
	var height: float = maxf(size.y, 810.0)
	var depth: float = _rng.randf_range(0.35, 1.0)

	var shape_roll: float = _rng.randf()
	var shape: int = 0
	if shape_roll > 0.91:
		shape = 2
	elif shape_roll > 0.72:
		shape = 1

	var particle_size: float = 1.0
	if foreground:
		particle_size = 1.0 if _rng.randf() < 0.62 else 2.0
		if _rng.randf() < 0.08:
			particle_size = 3.0
	else:
		particle_size = 1.0 if _rng.randf() < 0.84 else 2.0

	return {
		"x": _rng.randf_range(0.0, width),
		"y": _rng.randf_range(-10.0, height + 20.0) if initial else height,
		"speed": lerpf(speed_min, speed_max, depth),
		"size": particle_size,
		"alpha": _rng.randf_range(0.22, 0.72) * depth,
		"phase": _rng.randf_range(0.0, TAU),
		"drift": _rng.randf_range(2.0, 12.0) * depth,
		"drift_speed": _rng.randf_range(0.32, 0.82),
		"twinkle_speed": _rng.randf_range(1.1, 2.8),
		"shape": shape,
	}


func _split_color(x: float) -> Color:
	var first_mix: float = _smoothstep(0.285, 0.385, x)
	var second_mix: float = _smoothstep(0.615, 0.715, x)
	return PURPLE.lerp(RED, first_mix).lerp(BLUE, second_mix)


func _smoothstep(edge0: float, edge1: float, value: float) -> float:
	var t: float = clampf((value - edge0) / maxf(edge1 - edge0, 0.0001), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)


func _kill_focus_tween() -> void:
	if _focus_tween != null:
		_focus_tween.kill()
		_focus_tween = null
