shader_type canvas_item;

uniform vec4 accent : source_color = vec4(0.8, 0.55, 1.0, 1.0);

void fragment() {
	vec4 art = texture(TEXTURE, UV);
	float node_alpha = COLOR.a;
	float high = max(art.r, max(art.g, art.b));
	vec3 ink = mix(accent.rgb, vec3(1.0), smoothstep(0.55, 1.0, high) * 0.65) * high * 0.84;
	// This texture contains ornaments only; the interior has zero alpha.
	// Translucent navy glass is a separate ColorRect underneath the frame.
	COLOR = vec4(ink, node_alpha);
}
