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
	assert(menu.get_node("Header/Title").get_theme_color("font_color") == Color.WHITE, "FASTCAST is pure white")
	var lighting := menu.get_node("SelectionLighting")
	assert(lighting.get_node("PrimaryGlow") != null)
	assert(lighting.get_node("SecondaryGlowA") != null)
	assert(lighting.get_node("SecondaryGlowB") != null)
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
		await create_timer(0.75).timeout
		assert(menu.get_node("ActionMenu").visible)
		assert(menu.get_node("ActionMenu").position == Vector2(1010, 18))
		assert(lighting.visible)
		assert(float(lighting.get("selection_alpha")) > 0.99)
		var background_slot := 0
		for index in range(3):
			var slot := menu.get_node("Characters/" + names[index]) as Control
			var aura := slot.get_node("Aura") as CanvasItem
			var rim := slot.get_node("CharacterRim") as CanvasItem
			assert(aura.modulate.a < 0.01, "Old rune columns stay hidden while selected")
			if index == selected:
				assert(slot.position == Vector2(55, -8))
				assert(slot.scale == Vector2(1.24, 1.24))
				assert(rim.modulate.a > 0.98)
			else:
				assert(slot.position == [Vector2(390, 64), Vector2(650, 64)][background_slot])
				assert(slot.scale == Vector2(0.62, 0.62))
				assert(rim.modulate.a > 0.28 and rim.modulate.a < 0.32)
				background_slot += 1
		await _capture(names[selected].to_lower())
		menu.get_node("ActionMenu/Buttons/Back").pressed.emit()
		await create_timer(0.70).timeout
		assert(not lighting.visible)
		assert(not menu.get_node("ActionMenu").visible)
		for index in range(3):
			var slot := menu.get_node("Characters/" + names[index]) as Control
			assert(slot.position == homes[index])
			assert(slot.scale == Vector2.ONE)
			assert((slot.get_node("Aura") as CanvasItem).modulate.a > 0.70, "Rune columns return after Back")
	menu.get_node("Characters/Runesinger/HitArea").pressed.emit()
	await create_timer(0.75).timeout
	menu.get_node("ActionMenu/Buttons/NewGame").pressed.emit()
	await create_timer(1.0).timeout
	assert(current_scene.scene_file_path == "res://scenes/main.tscn")
	assert(root.content_scale_size == Vector2i(480, 270), "Gameplay restores its own viewport")
	print("MENU CHECK PASS: resources, selection lighting, three selections, Back, New Game, gameplay viewport")
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
