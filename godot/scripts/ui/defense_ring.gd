extends Control

var progress: float = 0.0
var result: String = "pending"


func set_state(new_progress: float, new_result: String) -> void:
	progress = clampf(new_progress, 0.0, 1.0)
	result = new_result
	queue_redraw()


func _draw() -> void:
	var center := size * 0.5
	var target_radius := minf(size.x, size.y) * 0.22
	var window_radius := target_radius * 1.3
	var moving_radius := lerpf(minf(size.x, size.y) * 0.43, target_radius, progress)

	var color := Color(0.55, 0.91, 1.0, 0.95)
	if result == "failed":
		color = Color(1.0, 0.26, 0.36, 0.98)
	elif result == "perfect":
		color = Color(0.78, 1.0, 1.0, 1.0)

	draw_arc(center, window_radius, 0.0, TAU, 64, Color(color.r, color.g, color.b, 0.09), 8.0, true)
	draw_arc(center, target_radius, 0.0, TAU, 64, Color(color.r, color.g, color.b, 0.65), 1.5, true)
	draw_arc(center, moving_radius, 0.0, TAU, 64, color, 2.5, true)
