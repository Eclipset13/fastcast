@tool
extends StaticBody2D

enum PlatformKind {
	LONG,
	MEDIUM_A,
	MEDIUM_B,
	SMALL_A,
	SMALL_B,
}

const PLATFORM_LONG := preload("res://assets/biomes/emerald-forest/platforms/platform-long.png")
const PLATFORM_MEDIUM_A := preload("res://assets/biomes/emerald-forest/platforms/platform-medium-a.png")
const PLATFORM_MEDIUM_B := preload("res://assets/biomes/emerald-forest/platforms/platform-medium-b.png")
const PLATFORM_SMALL_A := preload("res://assets/biomes/emerald-forest/platforms/platform-small-a.png")
const PLATFORM_SMALL_B := preload("res://assets/biomes/emerald-forest/platforms/platform-small-b.png")

@export var platform_kind: PlatformKind = PlatformKind.LONG:
	set(value):
		platform_kind = value
		if is_inside_tree():
			call_deferred("_refresh_platform")


func _ready() -> void:
	_refresh_platform()


func _refresh_platform() -> void:
	var sprite := get_node_or_null("Sprite2D") as Sprite2D
	var collision := get_node_or_null("CollisionShape2D") as CollisionShape2D
	if sprite == null or collision == null:
		return

	var texture: Texture2D
	var art_scale: float
	var surface_x: float
	var surface_y: float
	var surface_width: float

	match platform_kind:
		PlatformKind.LONG:
			texture = PLATFORM_LONG
			art_scale = 0.068
			surface_x = 83.0
			surface_y = 334.0
			surface_width = 1989.0
		PlatformKind.MEDIUM_A:
			texture = PLATFORM_MEDIUM_A
			art_scale = 0.064
			surface_x = 84.0
			surface_y = 405.0
			surface_width = 1603.0
		PlatformKind.MEDIUM_B:
			texture = PLATFORM_MEDIUM_B
			art_scale = 0.064
			surface_x = 141.0
			surface_y = 398.0
			surface_width = 1529.0
		PlatformKind.SMALL_A:
			texture = PLATFORM_SMALL_A
			art_scale = 0.055
			surface_x = 126.0
			surface_y = 492.0
			surface_width = 1270.0
		PlatformKind.SMALL_B:
			texture = PLATFORM_SMALL_B
			art_scale = 0.055
			surface_x = 109.0
			surface_y = 499.0
			surface_width = 1319.0
		_:
			return

	sprite.texture = texture
	sprite.centered = false
	sprite.position = Vector2(
		-(surface_x + surface_width * 0.5) * art_scale,
		-surface_y * art_scale
	)
	sprite.scale = Vector2(art_scale, art_scale)

	var shape := RectangleShape2D.new()
	shape.size = Vector2(surface_width * art_scale, 6.0)
	collision.shape = shape
	collision.position = Vector2(0.0, 3.0)
