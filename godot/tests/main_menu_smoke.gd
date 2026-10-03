extends SceneTree
## Run with --headless for behavior or a rendering driver for review PNGs.

var _menu_scene: PackedScene
const IDS: Array[String] = ["runesinger", "berserker", "wayfarer"]
var _failed: bool = false


func _initialize() -> void:
	_run.call_deferred()


func _check(condition: bool, message: String) -> void:
	if not condition:
		_failed = true
		push_error(message)


func _capture(label: String) -> void:
	if DisplayServer.get_name() == "headless":
		return
	await RenderingServer.frame_post_draw
	var screenshot: Image = root.get_texture().get_image()
	var directory: String = "res://.godot/menu-review"
	DirAccess.make_dir_recursive_absolute(directory)
	_check(screenshot.save_png(directory.path_join(label + ".png")) == OK, "Screenshot save failed")
	# The title must contain actual white pixels after all screen effects.
	var white_pixels: int = 0
	for y: int in range(72, 137):
		for x: int in range(500, 940):
			var pixel: Color = screenshot.get_pixel(x, y)
			if pixel.r > 0.995 and pixel.g > 0.995 and pixel.b > 0.995:
				white_pixels += 1
	_check(white_pixels > 400, "FASTCAST lost its pure white lettering")


func _check_start_lighting(menu: Control) -> void:
	var lighting: Control = menu.get_node("SelectionLighting") as Control
	_check(lighting.visible, "Start lighting is hidden")
	var strengths: Array = lighting.get("_strengths")
	var fields: Array = lighting.get("_fields")
	_check(fields.size() == 3, "Start state must have three light fields")
	for index: int in range(IDS.size()):
		_check(is_equal_approx(float(strengths[index]), 0.62), "Start class glows must have equal strengths")
		var field: ColorRect = fields[index] as ColorRect
		var slot: Control = menu.call("_slot", IDS[index]) as Control
		_check(absf(field.position.x + field.size.x * 0.5 - (slot.position.x + 240.0)) < 1.0, "Glow does not follow its character")


func _run() -> void:
	_menu_scene = load("res://scenes/ui/main_menu.tscn") as PackedScene
	var menu: Control = _menu_scene.instantiate() as Control
	root.add_child(menu)
	current_scene = menu
	await process_frame
	await create_timer(0.1).timeout
	_check_start_lighting(menu)
	await _capture("character-select")
	_check((menu.get_node("Header") as CanvasItem).z_index > (menu.get_node("MenuColorGrade") as CanvasItem).z_index, "Header must render after world grading")
	for id: String in IDS:
		var hit: Button = menu.call("_slot", id).get_node("HitArea") as Button
		hit.pressed.emit()
		await create_timer(0.20).timeout
		var lighting: Control = menu.get_node("SelectionLighting") as Control
		var strengths: Array = lighting.get("_strengths")
		_check(strengths.min() > 0.30 and strengths.max() < 1.0, "Lighting reset during selection")
		await create_timer(0.15).timeout
		# Repeated activation during entrance cannot reverse an in-flight transition.
		(menu.get_node("ActionMenu/Buttons/Back") as Button).pressed.emit()
		_check(menu.get("_selected") == id, "Selection changed during entrance")
		await _capture(id + "-entrance")
		await create_timer(0.85).timeout
		var action: Control = menu.get_node("ActionMenu") as Control
		_check(action.visible and action.position.is_equal_approx(Vector2(1010, 4)), "Panel failed to open for " + id)
		_check(not bool(menu.get("_transitioning")), "Entrance did not finish")
		_check(root.get_node("GameSession").get("selected_class") == id, "Session class mismatch")
		var accent: Color = menu.get("_action_accent")
		var panel_material: ShaderMaterial = (action.get_node("PanelFrame") as NinePatchRect).material as ShaderMaterial
		_check(panel_material.get_shader_parameter("accent") == accent, "Panel accent mismatch")
		var frame: NinePatchRect = action.get_node("PanelFrame") as NinePatchRect
		var glass: ColorRect = action.get_node("PanelBackground") as ColorRect
		_check(action.size.y == 802.0 and action.position.y <= 8.0 and action.position.y + action.size.y >= 802.0, "Panel is not full height")
		_check(frame.scale.x == frame.scale.y and frame.axis_stretch_vertical == NinePatchRect.AXIS_STRETCH_MODE_TILE, "Frame decorations are stretched")
		_check(glass.color.a >= 0.70 and glass.color.a <= 0.85, "Panel glass opacity is out of range")
		var frame_image: Image = frame.texture.get_image()
		_check(frame_image.get_pixel(frame_image.get_width() / 2, frame_image.get_height() / 2).a == 0.0, "Frame interior is not transparent")
		for y: int in range(600, 1250, 40):
			for x: int in range(210, 560, 40):
				_check(frame_image.get_pixel(x, y).a < 0.01, "Scenery remains in the frame interior")
		strengths = lighting.get("_strengths")
		for class_index: int in range(IDS.size()):
			var expected: float = 1.0 if IDS[class_index] == id else 0.31
			_check(is_equal_approx(float(strengths[class_index]), expected), "Selected lighting strength mismatch")
		await _capture(id + "-selected")
		var saves: Button = action.get_node("Buttons/Saves") as Button
		saves.mouse_entered.emit()
		await create_timer(0.18).timeout
		_check(float(saves.get("hover_amount")) > 0.99, "Hover did not complete")
		await _capture(id + "-hover")
		saves.mouse_exited.emit()
		saves.pressed.emit()
		_check("SAVES" in (action.get_node("Status") as Label).text, "Existing section action broke")
		(action.get_node("Buttons/Back") as Button).pressed.emit()
		await create_timer(0.4).timeout
		for slot_id: String in IDS:
			var slot: Control = menu.call("_slot", slot_id) as Control
			_check((slot.get_node("Aura") as CanvasItem).modulate.a < 0.01, "Runes returned before characters")
			_check((slot.get_node("HitArea") as Button).disabled, "Selection unlocked during return")
		await create_timer(0.65).timeout
		_check(menu.get("_selected") == "" and not action.visible, "BACK did not restore selection")
		_check_start_lighting(menu)
		await _capture(id + "-back")
		for slot_id: String in IDS:
			var slot: Control = menu.call("_slot", slot_id) as Control
			var homes: Dictionary = menu.get("_slot_home")
			_check(slot.position.is_equal_approx(homes[slot_id]), "Character failed to return")
			_check((slot.get_node("Aura") as CanvasItem).modulate.a > 0.73, "Runes not restored")
			_check(not (slot.get_node("HitArea") as Button).disabled, "Selection still locked")
	# NEW GAME must carry every class into the existing playable scene.
	for id: String in IDS:
		(menu.call("_slot", id).get_node("HitArea") as Button).pressed.emit()
		await create_timer(1.1).timeout
		(menu.get_node("ActionMenu/Buttons/NewGame") as Button).pressed.emit()
		await create_timer(0.4).timeout
		_check(current_scene.scene_file_path == "res://scenes/main.tscn", "NEW GAME failed")
		_check(root.get_node("GameSession").get("selected_class") == id, "NEW GAME lost class")
		_check(root.content_scale_size == Vector2i(480, 270), "Gameplay viewport was not restored")
		_check(change_scene_to_packed(_menu_scene) == OK, "Could not return to test menu")
		await scene_changed
		menu = current_scene as Control
		await process_frame
	print("MAIN_MENU_SMOKE: ", "FAIL" if _failed else "PASS", " — all classes, hover, BACK, transition locking, NEW GAME")
	quit(1 if _failed else 0)
