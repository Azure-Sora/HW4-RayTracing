precision mediump float;

varying vec2 texCoord;
uniform sampler2D texture;
void main() {
    // if(texCoord.x > 0.5)
    //     gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    // else
    gl_FragColor = texture2D(texture, texCoord);
}