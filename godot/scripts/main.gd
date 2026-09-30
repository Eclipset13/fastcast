extends Node

@onready var _forest: Node = $EmeraldForest
@onready var _hud: CanvasLayer = $HUD


func _ready() -> void:
	var combat_controller: Node = _forest.get_node("CombatController")
	_hud.call("bind_controller", combat_controller)

	if _forest.has_signal("objective_changed"):
		_forest.connect("objective_changed", Callable(_hud, "set_objective"))
	if _forest.has_signal("toast_requested"):
		_forest.connect("toast_requested", Callable(_hud, "show_toast"))
