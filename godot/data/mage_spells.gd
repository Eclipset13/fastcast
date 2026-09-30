extends RefCounted

const STARTER_DECK_IDS: Array[String] = [
	"spark",
	"fireball",
	"ice-spike",
	"mend",
	"aegis",
	"gale",
]

const ALL_SPELLS = [
	{
		"id": "spark", "name": "Spark",
		"words": ["zap", "zapis", "zapstorm"],
		"cost": 0.0, "powers": [10.0, 14.0, 19.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 0, "upgrade_costs": [1, 2], "starter": true,
	},
	{
		"id": "fireball", "name": "Fireball",
		"words": ["ignis", "ignisflare", "ignisinferno"],
		"cost": 14.0, "powers": [15.0, 21.0, 29.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 0, "upgrade_costs": [2, 3], "starter": true,
	},
	{
		"id": "ice-spike", "name": "Ice Spike",
		"words": ["glac", "glacies", "glacieslance"],
		"cost": 12.0, "powers": [13.0, 18.0, 24.0], "kind": "damage",
		"delays": [0.8, 1.2, 1.7], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 0, "upgrade_costs": [2, 3], "starter": true,
	},
	{
		"id": "mend", "name": "Mend",
		"words": ["vita", "vitae", "vitaemajor"],
		"cost": 16.0, "powers": [14.0, 22.0, 32.0], "kind": "heal",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 0, "upgrade_costs": [2, 3], "starter": true,
	},
	{
		"id": "void-rift", "name": "Void Rift",
		"words": ["rift", "riftvoid", "riftvoidcore"],
		"cost": 18.0, "powers": [8.0, 13.0, 19.0], "kind": "damage",
		"delays": [0.7, 1.0, 1.4], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 4, "upgrade_costs": [2, 3], "starter": false,
	},
	{
		"id": "moon-slice", "name": "Moon Slice",
		"words": ["luna", "lunaris", "lunablade"],
		"cost": 8.0, "powers": [12.0, 17.0, 23.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 2, "upgrade_costs": [1, 2], "starter": false,
	},
	{
		"id": "arc-volley", "name": "Arc Volley",
		"words": ["arc", "arcus", "arcvolley"],
		"cost": 13.0, "powers": [15.0, 20.0, 30.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 3, "upgrade_costs": [2, 3], "starter": false,
	},
	{
		"id": "aegis", "name": "Aegis",
		"words": ["ward", "wardis", "wardismajor"],
		"cost": 9.0, "powers": [0.0, 0.0, 0.0], "kind": "guard",
		"delays": [0.0, 0.0, 0.0], "guards": [0.45, 0.62, 0.78],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 0, "upgrade_costs": [2, 3], "starter": true,
	},
	{
		"id": "hourglass", "name": "Hourglass",
		"words": ["tempus", "tempusbind", "tempusaeterna"],
		"cost": 20.0, "powers": [0.0, 0.0, 0.0], "kind": "utility",
		"delays": [1.8, 2.6, 3.5], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 5, "upgrade_costs": [3, 4], "starter": false,
	},
	{
		"id": "ascend", "name": "Ascend",
		"words": ["soar", "ascendra"],
		"cost": 11.0, "powers": [0.0, 0.0], "kind": "utility",
		"delays": [1.0, 1.8], "guards": [0.0, 0.0],
		"self_costs": [0, 0], "dot_totals": [0.0, 0.0],
		"unlock_cost": 4, "upgrade_costs": [3], "starter": false,
	},
	{
		"id": "blood-crescent", "name": "Blood Crescent",
		"words": ["crimson", "crimsonedge", "crimsonluna"],
		"cost": 10.0, "powers": [22.0, 31.0, 42.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [4, 5, 6], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 6, "upgrade_costs": [3, 5], "starter": false,
	},
	{
		"id": "venom", "name": "Venom",
		"words": ["poison", "poisonis", "poisonmortis"],
		"cost": 12.0, "powers": [10.0, 14.0, 18.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [6.0, 10.0, 16.0],
		"unlock_cost": 3, "upgrade_costs": [2, 3], "starter": false,
	},
	{
		"id": "arcane-bind", "name": "Arcane Bind",
		"words": ["knot", "knotarc", "knotarcana"],
		"cost": 15.0, "powers": [5.0, 8.0, 12.0], "kind": "damage",
		"delays": [1.0, 1.7, 2.5], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 4, "upgrade_costs": [2, 3], "starter": false,
	},
	{
		"id": "nova", "name": "Nova",
		"words": ["nova", "novara", "novaburst"],
		"cost": 19.0, "powers": [17.0, 24.0, 33.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 5, "upgrade_costs": [3, 4], "starter": false,
	},
	{
		"id": "gale", "name": "Gale",
		"words": ["bora", "boralis", "boralisrex"],
		"cost": 10.0, "powers": [10.0, 16.0, 23.0], "kind": "damage",
		"delays": [0.5, 0.9, 1.3], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 0, "upgrade_costs": [2, 3], "starter": true,
	},
	{
		"id": "frost-shards", "name": "Frost Shards",
		"words": ["frost", "frostbite", "frostshards"],
		"cost": 14.0, "powers": [15.0, 24.0, 35.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 3, "upgrade_costs": [2, 3], "starter": false,
	},
	{
		"id": "phase", "name": "Phase",
		"words": ["drift", "driftstep"],
		"cost": 13.0, "powers": [0.0, 0.0], "kind": "guard",
		"delays": [0.0, 0.0], "guards": [0.60, 0.85],
		"self_costs": [0, 0], "dot_totals": [0.0, 0.0],
		"unlock_cost": 5, "upgrade_costs": [4], "starter": false,
	},
	{
		"id": "judgment", "name": "Judgment",
		"words": ["judex", "judexlux", "judexdivine"],
		"cost": 24.0, "powers": [24.0, 34.0, 48.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 7, "upgrade_costs": [4, 6], "starter": false,
	},
	{
		"id": "soulflame", "name": "Soulflame",
		"words": ["ember", "embersoul", "embersoulflame"],
		"cost": 20.0, "powers": [16.0, 23.0, 31.0], "kind": "damage",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [6.0, 10.0, 16.0],
		"unlock_cost": 6, "upgrade_costs": [4, 5], "starter": false,
	},
	{
		"id": "astral-bloom", "name": "Astral Bloom",
		"words": ["heaven", "heavenbloom", "heavenastral"],
		"cost": 25.0, "powers": [10.0, 16.0, 24.0], "kind": "hybrid",
		"delays": [0.0, 0.0, 0.0], "guards": [0.0, 0.0, 0.0],
		"self_costs": [0, 0, 0], "dot_totals": [0.0, 0.0, 0.0],
		"unlock_cost": 7, "upgrade_costs": [4, 6], "starter": false,
	},
]


static func all_spells() -> Array:
	return ALL_SPELLS.duplicate(true)


static func starter_deck() -> Array:
	var result: Array = []
	for spell_id in STARTER_DECK_IDS:
		var spell := find_spell(spell_id)
		if not spell.is_empty():
			result.append(spell)
	return result


static func starter_deck_ids() -> Array[String]:
	return STARTER_DECK_IDS.duplicate()


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


static func unlock_cost(spell: Dictionary) -> int:
	return int(spell.get("unlock_cost", 0))


static func find_spell(spell_id: String) -> Dictionary:
	for spell in ALL_SPELLS:
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
	var self_costs: Array = spell.get("self_costs", [])
	var dot_totals: Array = spell.get("dot_totals", [])

	result["rank"] = rank_index + 1
	result["word"] = String(words[rank_index]) if rank_index < words.size() else ""
	result["power"] = float(powers[rank_index]) if rank_index < powers.size() else 0.0
	result["delay"] = float(delays[rank_index]) if rank_index < delays.size() else 0.0
	result["guard"] = float(guards[rank_index]) if rank_index < guards.size() else 0.0
	result["self_cost"] = int(self_costs[rank_index]) if rank_index < self_costs.size() else 0
	result["dot_total"] = float(dot_totals[rank_index]) if rank_index < dot_totals.size() else 0.0
	return result
