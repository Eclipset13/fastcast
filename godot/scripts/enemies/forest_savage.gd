@tool
extends CharacterBody2D

signal encounter_requested(enemy: CharacterBody2D)

@export_category("Forest Savage")
@export var enemy_name: String = "Forest Savage"
@export var max_hp: int = 58
@export var attack_damage: int = 9
@export var attack_interval: float = 3.4
@export var xp_reward: int = 42

@export_category("World movement")
@export var patrol_distance: float = 45.0
@export var patrol_speed: float = 20.0
@export var gravity: float = 720.0
@export var max_fall_speed: float = 420.0
@export var starts_facing_left: bool = true

@onready var _visual: Sprite2D = $Visual
@onready var _encounter_area: Area2D = $EncounterArea

var hp: int
var defeated: bool = false
var combat_locked: bool = false
var _home_x: float
var _direction: float = -1.0


func _ready() -> void:
	hp = max_hp
	_home_x = global_position.x
	_direction = -1.0 if starts_facing_left else 1.0
	_update_facing()
	if not Engine.is_editor_hint():
		_encounter_area.body_entered.connect(_on_encounter_body_entered)


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint() or defeated or combat_locked:
		return

	if not is_on_floor():
		velocity.y = minf(velocity.y + gravity * delta, max_fall_speed)

	if global_position.x < _home_x - patrol_distance:
		_direction = 1.0
	elif global_position.x > _home_x + patrol_distance:
		_direction = -1.0

	velocity.x = _direction * patrol_speed
	_update_facing()
	move_and_slide()


func set_combat_locked(locked: bool, player_x: float = global_position.x) -> void:
	combat_locked = locked
	velocity = Vector2.ZERO
	if locked:
		_direction = -1.0 if player_x < global_position.x else 1.0
		_update_facing()


func take_damage(amount: int) -> void:
	if defeated:
		return
	hp = maxi(0, hp - amount)
	if hp == 0:
		defeat()


func reset_enemy() -> void:
	defeated = false
	hp = max_hp
	combat_locked = false
	visible = true
	process_mode = Node.PROCESS_MODE_INHERIT
	collision_layer = 1
	collision_mask = 1


func defeat() -> void:
	defeated = true
	combat_locked = true
	velocity = Vector2.ZERO
	visible = false
	process_mode = Node.PROCESS_MODE_DISABLED


func _update_facing() -> void:
	if _visual:
		_visual.flip_h = _direction < 0.0


func _on_encounter_body_entered(body: Node) -> void:
	if defeated or combat_locked:
		return
	if body.name != "Player":
		return
	encounter_requested.emit(self)
