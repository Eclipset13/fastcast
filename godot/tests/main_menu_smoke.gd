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


func _run() -> void:
	_menu_scene = load("res://scenes/ui/main_menu.tscn") as PackedScene
	var menu: Control = _menu_scene.instantiate() as Control
	root.add_child(menu)
	current_scene = menu
	await process_frame
	await create_timer(0.1).timeout
	await _capture("character-select")
	_check((menu.get_node("Header") as CanvasItem).z_index > (menu.get_node("MenuColorGrade") as CanvasItem).z_index, "Header must render after world grading")
	for id: String in IDS:
		var hit: Button = menu.call("_slot", id).get_node("HitArea") as Button
		hit.pressed.emit()
		await create_timer(0.35).timeout
		# Repeated activation during entrance cannot reverse an in-flight transition.
		(menu.get_node("ActionMenu/Buttons/Back") as Button).pressed.emit()
		_check(menu.get("_selected") == id, "Selection changed during entrance")
		await _capture(id + "-entrance")
		await create_timer(0.85).timeout
		var action: Control = menu.get_node("ActionMenu") as Control
		_check(action.visible and action.position.is_equal_approx(Vector2(1010, 18)), "Panel failed to open for " + id)
		_check(not bool(menu.get("_transitioning")), "Entrance did not finish")
		_check(root.get_node("GameSession").get("selected_class") == id, "Session class mismatch")
		var accent: Color = menu.get("_action_accent")
		var panel_material: ShaderMaterial = (action.get_node("Panel") as TextureRect).material as ShaderMaterial
		_check(panel_material.get_shader_parameter("accent") == accent, "Panel accent mismatch")
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
