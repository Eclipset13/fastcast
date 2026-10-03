shader_type canvas_item;

uniform vec4 accent : source_color = vec4(0.8, 0.55, 1.0, 1.0);

void fragment() {
	vec4 art = texture(TEXTURE, UV);
	float node_alpha = COLOR.a;
	float high = max(art.r, max(art.g, art.b));
	float low = min(art.r, min(art.g, art.b));
	// Keep the painted navy glass neutral; recolor only luminous ornament ink.
	float ink = smoothstep(0.06, 0.24, high) * smoothstep(0.02, 0.12, high - low);
	vec3 tinted = mix(accent.rgb, vec3(1.0), smoothstep(0.55, 1.0, high) * 0.65) * high * 0.84;
	float glass_shade = mix(0.58, 1.0, smoothstep(0.22, 0.65, high));
	// Fragment COLOR already contains the texture. Multiplying it again would
	// square the painted glass colors and crush the navy interior to black.
	COLOR = vec4(mix(art.rgb, tinted, ink) * glass_shade, node_alpha * mix(0.92, 1.0, ink));
}
