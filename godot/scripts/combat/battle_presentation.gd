extends Node2D

const SPELL_COLORS := {
	"spark": Color(1.0, 0.835, 0.29, 1.0),
	"fireball": Color(1.0, 0.416, 0.196, 1.0),
	"ice-spike": Color(0.439, 0.812, 1.0, 1.0),
	"mend": Color(0.447, 0.929, 0.553, 1.0),
	"aegis": Color(0.514, 0.788, 1.0, 1.0),
	"gale": Color(0.741, 0.918, 1.0, 1.0),
}

var _player: CharacterBody2D = null
var _enemy: CharacterBody2D = null
var _camera: Camera2D = null
var _rng := RandomNumberGenerator.new()

var _shake_time: float = 0.0
var _shake_duration: float = 0.0
var _shake_intensity: float = 0.0


func _ready() -> void:
	_rng.randomize()


func _process(delta: float) -> void:
	if _camera == null:
		return

	if _shake_time > 0.0:
		_shake_time = maxf(0.0, _shake_time - delta)
		var fade := _shake_time / maxf(_shake_duration, 0.001)
		_camera.offset = Vector2(
			_rng.randf_range(-1.0, 1.0),
			_rng.randf_range(-1.0, 1.0)
		) * _shake_intensity * fade
	elif _camera.offset != Vector2.ZERO:
		_camera.offset = Vector2.ZERO


func begin(player: CharacterBody2D, enemy: CharacterBody2D) -> void:
	clear()
	_player = player
	_enemy = enemy
	_camera = _player.get_node_or_null("Camera2D") as Camera2D


func end() -> void:
	if _camera != null:
		_camera.offset = Vector2.ZERO
	_player = null
	_enemy = null
	_camera = null
	clear()


func cast_spell(spell_id: String, kind: String, amount: int) -> void:
	if _player == null or _enemy == null:
		return

	var color: Color = SPELL_COLORS.get(spell_id, Color(0.95, 0.85, 0.55, 1.0))
	var player_point := _player.global_position + Vector2(0.0, -10.0)

	_burst(player_point, color, 8, 12.0)

	if kind == "heal":
		_halo(player_point + Vector2(0.0, 4.0), color, 18.0)
		_float_text(_player.global_position + Vector2(0.0, -27.0), "+%d" % amount, color)
		_flash_visual(_player, Color(0.75, 1.0, 0.78, 1.0), 0.18)
		return

	if kind == "guard":
		_halo(player_point + Vector2(0.0, 4.0), color, 20.0)
		_float_text(_player.global_position + Vector2(0.0, -27.0), "WARD", color)
		return

	var target := _enemy.global_position + Vector2(0.0, -8.0)
	var projectile := _make_disc(3.0, color)
	projectile.global_position = player_point
	projectile.z_index = 45
	add_child(projectile)

	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD)
	tween.set_ease(Tween.EASE_IN)
	tween.tween_property(projectile, "global_position", target, 0.16)
	tween.tween_callback(Callable(self, "_spell_impact").bind(projectile, target, color, amount))


func damage_player(amount: int, critical: bool) -> void:
	if _player == null:
		return

	var point := _player.global_position + Vector2(0.0, -8.0)
	_flash_visual(_player, Color(1.0, 0.32, 0.4, 1.0), 0.18)
	_burst(point, Color(1.0, 0.25, 0.35, 1.0), 22 if critical else 12, 29.0 if critical else 18.0)
	_float_text(_player.global_position + Vector2(0.0, -27.0), "-%d" % amount, Color(1.0, 0.32, 0.39, 1.0))
	shake(3.2 if critical else 1.8, 0.16 if critical else 0.10)


func parry() -> void:
	if _player == null:
		return

	var point := _player.global_position + Vector2(0.0, -6.0)
	_halo(point, Color(1.0, 0.91, 0.64, 1.0), 18.0)
	_burst(point, Color(1.0, 0.95, 0.75, 1.0), 14, 20.0)
	_flash_visual(_player, Color(1.0, 1.0, 0.88, 1.0), 0.12)
	_float_text(_player.global_position + Vector2(0.0, -29.0), "PERFECT", Color(0.82, 1.0, 1.0, 1.0))
	shake(1.5, 0.08)


func enemy_death() -> void:
	if _enemy == null:
		return

	var point := _enemy.global_position + Vector2(0.0, -7.0)
	_burst(point, Color(0.65, 1.0, 0.88, 1.0), 24, 32.0)
	_halo(point, Color(0.65, 1.0, 0.88, 1.0), 24.0)
	shake(2.3, 0.14)


func shake(intensity: float, duration: float) -> void:
	if _camera == null:
		return
	_shake_intensity = maxf(_shake_intensity, intensity)
	_shake_duration = maxf(_shake_duration, duration)
	_shake_time = maxf(_shake_time, duration)


func clear() -> void:
	for child in get_children():
		child.queue_free()
	_shake_time = 0.0
	_shake_duration = 0.0
	_shake_intensity = 0.0


func _spell_impact(
	projectile: Polygon2D,
	target: Vector2,
	color: Color,
	amount: int
) -> void:
	if is_instance_valid(projectile):
		projectile.queue_free()

	_halo(target, color, 18.0)
	_burst(target, color, 14, 18.0)
	_float_text(target + Vector2(0.0, -18.0), "-%d" % amount, color)
	if _enemy != null:
		_flash_visual(_enemy, Color.WHITE, 0.10)
	shake(1.4, 0.07)


func _flash_visual(character: Node, color: Color, duration: float) -> void:
	var visual := character.get_node_or_null("Visual") as Sprite2D
	if visual == null:
		return

	visual.modulate = color
	var tween := create_tween()
	tween.tween_property(visual, "modulate", Color.WHITE, duration)


func _halo(point: Vector2, color: Color, radius: float) -> void:
	var ring := Line2D.new()
	ring.width = 1.5
	ring.default_color = color
	ring.z_index = 44
	for index in range(33):
		var angle := TAU * float(index) / 32.0
		ring.add_point(Vector2(cos(angle), sin(angle)) * radius)
	ring.global_position = point
	ring.scale = Vector2(0.4, 0.4)
	add_child(ring)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.set_trans(Tween.TRANS_QUAD)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(ring, "scale", Vector2(1.25, 1.25), 0.36)
	tween.tween_property(ring, "modulate:a", 0.0, 0.36)
	tween.finished.connect(Callable(ring, "queue_free"))


func _burst(point: Vector2, color: Color, count: int, radius: float) -> void:
	for index in range(count):
		var pixel := Polygon2D.new()
		var size := 1.5 if index % 3 == 0 else 1.0
		pixel.polygon = PackedVector2Array([
			Vector2(-size, -size),
			Vector2(size, -size),
			Vector2(size, size),
			Vector2(-size, size),
		])
		pixel.color = color
		pixel.global_position = point
		pixel.z_index = 48
		add_child(pixel)

		var angle := TAU * float(index) / float(maxi(count, 1)) + _rng.randf_range(-0.18, 0.18)
		var distance := radius * _rng.randf_range(0.65, 1.05)
		var target := point + Vector2(cos(angle), sin(angle)) * distance
		var duration := _rng.randf_range(0.20, 0.38)

		var tween := create_tween()
		tween.set_parallel(true)
		tween.set_trans(Tween.TRANS_CUBIC)
		tween.set_ease(Tween.EASE_OUT)
		tween.tween_property(pixel, "global_position", target, duration)
		tween.tween_property(pixel, "modulate:a", 0.0, duration)
		tween.finished.connect(Callable(pixel, "queue_free"))


func _float_text(point: Vector2, message: String, color: Color) -> void:
	var label := Label.new()
	label.text = message
	label.global_position = point
	label.z_index = 60
	label.add_theme_font_size_override("font_size", 8)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0.02, 0.06, 0.08, 1.0))
	label.add_theme_constant_override("shadow_offset_x", 1)
	label.add_theme_constant_override("shadow_offset_y", 1)
	add_child(label)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(label, "global_position", point + Vector2(0.0, -15.0), 0.65)
	tween.tween_property(label, "modulate:a", 0.0, 0.65)
	tween.finished.connect(Callable(label, "queue_free"))


func _make_disc(radius: float, color: Color) -> Polygon2D:
	var disc := Polygon2D.new()
	var points := PackedVector2Array()
	for index in range(12):
		var angle := TAU * float(index) / 12.0
		points.append(Vector2(cos(angle), sin(angle)) * radius)
	disc.polygon = points
	disc.color = color
	return disc
