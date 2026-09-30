extends RefCounted

const STARTER_DECK = [
	{
		"id": "spark",
		"name": "Spark",
		"words": ["zap", "zapis", "zapstorm"],
		"cost": 0.0,
		"powers": [10.0, 14.0, 19.0],
		"kind": "damage",
		"delays": [0.0, 0.0, 0.0],
		"guards": [0.0, 0.0, 0.0],
		"upgrade_costs": [1, 2],
	},
	{
		"id": "fireball",
		"name": "Fireball",
		"words": ["ignis", "ignisflare", "ignisinferno"],
		"cost": 14.0,
		"powers": [15.0, 21.0, 29.0],
		"kind": "damage",
		"delays": [0.0, 0.0, 0.0],
		"guards": [0.0, 0.0, 0.0],
		"upgrade_costs": [2, 3],
	},
	{
		"id": "ice-spike",
		"name": "Ice Spike",
		"words": ["glac", "glacies", "glacieslance"],
		"cost": 12.0,
		"powers": [13.0, 18.0, 24.0],
		"kind": "damage",
		"delays": [0.8, 1.2, 1.7],
		"guards": [0.0, 0.0, 0.0],
		"upgrade_costs": [2, 3],
	},
	{
		"id": "mend",
		"name": "Mend",
		"words": ["vita", "vitae", "vitaemajor"],
		"cost": 16.0,
		"powers": [14.0, 22.0, 32.0],
		"kind": "heal",
		"delays": [0.0, 0.0, 0.0],
		"guards": [0.0, 0.0, 0.0],
		"upgrade_costs": [2, 3],
	},
	{
		"id": "aegis",
		"name": "Aegis",
		"words": ["ward", "wardis", "wardismajor"],
		"cost": 9.0,
		"powers": [0.0, 0.0, 0.0],
		"kind": "guard",
		"delays": [0.0, 0.0, 0.0],
		"guards": [0.45, 0.62, 0.78],
		"upgrade_costs": [2, 3],
	},
	{
		"id": "gale",
		"name": "Gale",
		"words": ["bora", "boralis", "boralisrex"],
		"cost": 10.0,
		"powers": [10.0, 16.0, 23.0],
		"kind": "damage",
		"delays": [0.5, 0.9, 1.3],
		"guards": [0.0, 0.0, 0.0],
		"upgrade_costs": [2, 3],
	},
]


static func starter_deck() -> Array:
	return STARTER_DECK.duplicate(true)


static func max_rank(spell: Dictionary) -> int:
	return (spell.get("words", []) as Array).size()


static func upgrade_cost(spell: Dictionary, rank: int):
	var costs: Array = spell.get("upgrade_costs", [])
	if rank < 1 or rank >= max_rank(spell):
		return null
	var index := rank - 1
	if index < 0 or index >= costs.size():
		return 1
	return int(costs[index])


static func find_spell(spell_id: String) -> Dictionary:
	for spell in STARTER_DECK:
		if String(spell["id"]) == spell_id:
			return spell.duplicate(true)
	return {}


static func at_rank(spell: Dictionary, rank: int) -> Dictionary:
	var result := spell.duplicate(true)
	var rank_index := clampi(rank - 1, 0, maxi(0, max_rank(spell) - 1))
	var words: Array = spell.get("words", [])
	var powers: Array = spell.get("powers", [])
	var delays: Array = spell.get("delays", [])
	var guards: Array = spell.get("guards", [])

	result["rank"] = rank_index + 1
	result["word"] = String(words[rank_index]) if rank_index < words.size() else ""
	result["power"] = float(powers[rank_index]) if rank_index < powers.size() else 0.0
	result["delay"] = float(delays[rank_index]) if rank_index < delays.size() else 0.0
	result["guard"] = float(guards[rank_index]) if rank_index < guards.size() else 0.0
	return result
