extends RefCounted

var word: String = ""
var typed: int = 0
var _times_ms: Array[float] = []


func reset() -> void:
	word = ""
	typed = 0
	_times_ms.clear()


func select(new_word: String) -> void:
	reset()
	word = new_word


func key(character: String, now_ms: float) -> Dictionary:
	if word.is_empty() or character.length() != 1 or typed >= word.length():
		return {"type": "noop"}

	var code := character.unicode_at(0)
	if code < 97 or code > 122:
		return {"type": "noop"}

	var expected := word.substr(typed, 1)
	if character != expected:
		return {
			"type": "miss",
			"progress": float(typed) / float(word.length()),
			"expected": expected,
			"got": character,
		}

	typed += 1
	_times_ms.append(now_ms)
	if typed < word.length():
		return {"type": "progress"}

	var cps = _cps_from_times()
	return {
		"type": "complete",
		"cps": cps,
		"multiplier": _speed_multiplier(cps),
	}


func _cps_from_times():
	if _times_ms.size() < 2:
		return null
	var seconds := (_times_ms[_times_ms.size() - 1] - _times_ms[0]) / 1000.0
	if seconds <= 0.0:
		return 7.0
	return float(_times_ms.size() - 1) / seconds


func _speed_multiplier(cps) -> float:
	if cps == null:
		return 1.0
	var position := clampf((float(cps) - 2.0) / 5.0, 0.0, 1.0)
	return 0.5 + 1.5 * position
