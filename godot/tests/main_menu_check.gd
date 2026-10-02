extends SceneTree

# Run with --path godot --script res://tests/main_menu_check.gd.
# A rendered run also writes 1440x810 captures to user://menu-review/.
func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var packed := load("res://scenes/ui/main_menu.tscn") as PackedScene
	assert(packed != null, "Menu must load with all authored resources")
	var menu := packed.instantiate()
	root.add_child(menu)
	current_scene = menu
	await process_frame
	assert(root.content_scale_size == Vector2i(1440, 810))
	assert(menu.get_node("Background").texture.get_size() == Vector2(1440, 810))
	# Source-space foot rows and platform planes, measured from the authored PNGs.
	var feet: Array[float] = [126.0, 119.0, 122.0]
	var surfaces: Array[float] = [53.0, 46.0, 53.0]
	var slot_index := 0
	for slot_name in ["Runesinger", "Berserker", "Wayfarer"]:
		var slot := menu.get_node("Characters/" + slot_name)
		var aura := slot.get_node("Aura") as TextureRect
		assert(aura.texture != null)
		assert(aura.size == Vector2(240, 720))
		assert(aura.position == Vector2(120, -65))
		var art := slot.get_node("Character") as TextureRect
		assert(art.size == art.texture.get_size() * 2, "Characters use crisp integer scaling")
		var platform := slot.get_node("Platform") as TextureRect
		var ground_y := platform.position.y + surfaces[slot_index] * platform.size.y / platform.texture.get_height()
		assert(absf(art.position.y + feet[slot_index] * 2 - ground_y) < 0.01, "Feet touch their platform")
		slot_index += 1
	await _capture("overview")
	var homes: Array[Vector2] = [Vector2(26, 0), Vector2(480, 0), Vector2(934, 0)]
	var names := ["Runesinger", "Berserker", "Wayfarer"]
	for selected in range(3):
		var button := menu.get_node("Characters/" + names[selected] + "/HitArea") as Button
		button.pressed.emit()
		await create_timer(0.65).timeout
		assert(menu.get_node("ActionMenu").visible)
		for index in range(3):
			var slot := menu.get_node("Characters/" + names[index]) as Control
			if index == selected:
				assert(slot.position == homes[index])
			elif index < selected:
				assert(slot.position.x + slot.size.x < 0, "Left sections leave the viewport")
			else:
				assert(slot.position.x > 1440, "Right sections leave the viewport")
		await _capture(names[selected].to_lower())
		menu.get_node("ActionMenu/Buttons/Back").pressed.emit()
		await create_timer(0.45).timeout
		for index in range(3):
			assert(menu.get_node("Characters/" + names[index]).position == homes[index])
	menu.get_node("Characters/Runesinger/HitArea").pressed.emit()
	await create_timer(0.5).timeout
	menu.get_node("ActionMenu/Buttons/NewGame").pressed.emit()
	await create_timer(1.0).timeout
	assert(current_scene.scene_file_path == "res://scenes/main.tscn")
	assert(root.content_scale_size == Vector2i(480, 270), "Gameplay restores its own viewport")
	print("MENU CHECK PASS: resources, layout, three selections, back, New Game, gameplay viewport")
	quit()


func _capture(label: String) -> void:
	if DisplayServer.get_name() == "headless":
		return
	await RenderingServer.frame_post_draw
	DirAccess.make_dir_recursive_absolute("user://menu-review")
	var capture := root.get_texture().get_image()
	assert(capture.get_size() == Vector2i(1440, 810), "Menu is rendered at native resolution")
	assert(capture.save_png("user://menu-review/" + label + ".png") == OK)
	print("CAPTURE: ", ProjectSettings.globalize_path("user://menu-review/" + label + ".png"))
