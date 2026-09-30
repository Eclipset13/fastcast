@tool
extends Node2D

@export var texture: Texture2D:
	set(value):
		texture = value
		_refresh()

@export var art_scale: float = 1.0:
	set(value):
		art_scale = value
		_refresh()

@export var target_height: float = 0.0:
	set(value):
		target_height = value
		_refresh()

@export var flip_h: bool = false:
	set(value):
		flip_h = value
		_refresh()

@export var depth: int = 0:
	set(value):
		depth = value
		z_index = depth


func _ready() -> void:
	_refresh()


func _refresh() -> void:
	var sprite := get_node_or_null("Sprite2D") as Sprite2D
	if sprite == null:
		return

	sprite.texture = texture
	sprite.flip_h = flip_h
	z_index = depth

	if texture == null:
		return

	var final_scale := art_scale
	if target_height > 0.0:
		final_scale = target_height / float(texture.get_height())

	sprite.scale = Vector2(final_scale, final_scale)
	sprite.position = Vector2(0.0, -float(texture.get_height()) * final_scale * 0.5)
