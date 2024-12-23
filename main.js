// 用来画占满整个画面的两个三角形
const vertices = [
    -1, -1,
    1, -1,
    1, 1,
    1, 1,
    -1, 1,
    -1, -1,
]

function getEyeRay(matrix, x, y, eye) {
    return matrix.multiply(Vector.create([x, y, 0, 1])).divideByW().ensure3().subtract(eye);
}

let eye = Vector.create([0, 0, 0])
let uniforms = {};
let canvas;
let gl;
let eyeRadius = 3;
let angleX = 0.0;
let angleY = 0.0;
let eyePos;
let textures;
let tracerProgram;
let renderProgram;
let framebuffer;
let vertexBuffer;
let renderVertexAttribute;
let tracerVertexAttribute;
let objects = [];

function changeEye() {
    eye.elements[0] = eyeRadius * Math.sin(toRad(angleY)) * Math.cos(toRad(angleX));
    eye.elements[1] = eyeRadius * Math.sin(toRad(angleX));
    eye.elements[2] = eyeRadius * Math.cos(toRad(angleY)) * Math.cos(toRad(angleX));
}

window.onload = function () {
    // 初始化阶段
    canvas = document.querySelector('#canvas')
    gl = canvas.getContext('webgl')

    if (!gl) {
        console.log('WebGL not supported!')
        return
    }
    // 创建program
    makeClassicScene();
    generateTracer();

    changeEye();

    //console.log(makeFragmentShader(objects));

    render();
}

function generateTracer() {
    if (tracerProgram != null) {
        gl.deleteProgram(tracerProgram);
    }
    let tracerVertexShaderSource = loadFileAJAX('./shaders/tracer.vert');
    //let tracerFragmentShaderSource = loadFileAJAX('./shaders/tracer.frag');
    let tracerFragmentShaderSource = makeFragmentShader(objects);
    console.log(tracerFragmentShaderSource);
    tracerProgram = createProgram(gl, tracerVertexShaderSource, tracerFragmentShaderSource);
    tracerVertexAttribute = gl.getAttribLocation(tracerProgram, 'vertex');
    gl.enableVertexAttribArray(tracerVertexAttribute);
}

window.onkeydown = function (e) {
    let code = e.keyCode;
    switch (code) {
        case 87:  // W
            if (angleX > -85) angleX -= 5;
            break;
        case 83:    // S
            if (angleX < 85) angleX += 5;
            break;
        case 65:    // A
            if (angleY == 360) angleY = 0;
            angleY += 5;
            break;
        case 68:    // D
            if (angleY == -360) angleY = 0;
            angleY -= 5;
            break;
    }
    update();
}

function update() {
    changeEye();

    let modelview = makeLookAt(eye.elements[0], eye.elements[1], eye.elements[2], 0, 0, 0, 0, 1, 0);
    let projection = makePerspective(55, 1, 0.1, 100);
    let modelviewProjection = projection.multiply(modelview);

    let inverse = modelviewProjection.inverse();

    uniforms.eye = eye
    uniforms.ray00 = getEyeRay(inverse, -1, -1, eye);
    uniforms.ray01 = getEyeRay(inverse, -1, +1, eye);
    uniforms.ray10 = getEyeRay(inverse, +1, -1, eye);
    uniforms.ray11 = getEyeRay(inverse, +1, +1, eye);

    gl.useProgram(tracerProgram);
    setUniforms(gl, tracerProgram, uniforms)

    let vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

    let vertexAttributeLocation = gl.getAttribLocation(tracerProgram, 'vertex')
    gl.vertexAttribPointer(vertexAttributeLocation, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(vertexAttributeLocation)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function render() {
    update();


}

function makeClassicScene() {
    objects.push(new myLightSource(Vector.create([0.0, 0.8, 0.0])));
    objects.push(new myCube(1, Vector.create([0.3, -1.0, 0.3]), Vector.create([0.6, 0.0, 0.9]), 1));
    objects.push(new myCube(2, Vector.create([-0.9, -0.4, -0.5]), Vector.create([0.6, 0.6, -0.1]), 2));
    objects.push(new mySphere(1, Vector.create([0.6, 0.0, 0.0]), 0.4, 1));
    objects.push(new mySphere(2, Vector.create([-0.3, -0.6, 0.6]), 0.3, 2));
}