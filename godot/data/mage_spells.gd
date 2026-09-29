extends RefCounted

const STARTER_DECK = [
	{
		"id": "spark",
		"name": "Spark",
		"word": "zap",
		"cost": 0.0,
		"power": 10.0,
		"kind": "damage",
		"delay": 0.0,
		"guard": 0.0,
	},
	{
		"id": "fireball",
		"name": "Fireball",
		"word": "ignis",
		"cost": 14.0,
		"power": 15.0,
		"kind": "damage",
		"delay": 0.0,
		"guard": 0.0,
	},
	{
		"id": "ice-spike",
		"name": "Ice Spike",
		"word": "glac",
		"cost": 12.0,
		"power": 13.0,
		"kind": "damage",
		"delay": 0.8,
		"guard": 0.0,
	},
	{
		"id": "mend",
		"name": "Mend",
		"word": "vita",
		"cost": 16.0,
		"power": 14.0,
		"kind": "heal",
		"delay": 0.0,
		"guard": 0.0,
	},
	{
		"id": "aegis",
		"name": "Aegis",
		"word": "ward",
		"cost": 9.0,
		"power": 0.0,
		"kind": "guard",
		"delay": 0.0,
		"guard": 0.45,
	},
	{
		"id": "gale",
		"name": "Gale",
		"word": "bora",
		"cost": 10.0,
		"power": 10.0,
		"kind": "damage",
		"delay": 0.5,
		"guard": 0.0,
	},
]


static func starter_deck() -> Array:
	return STARTER_DECK.duplicate(true)
