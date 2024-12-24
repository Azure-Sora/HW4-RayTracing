// 用来画占满整个画面的两个三角形
const vertices = [
    -1, -1,
    1, -1,
    1, 1,
    1, 1,
    -1, 1,
    -1, -1,
]

const lineVertices = [
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
    1, 1, 0,
    0, 0, 1,
    1, 0, 1,
    0, 1, 1,
    1, 1, 1
];
const lineIndices = [
    0, 1, 1, 3, 3, 2, 2, 0,
    4, 5, 5, 7, 7, 6, 6, 4,
    0, 4, 1, 5, 2, 6, 3, 7
];

function getEyeRay(matrix, x, y, eye) {
    return matrix.multiply(Vector.create([x, y, 0, 1])).divideByW().ensure3().subtract(eye);
}

let eye = Vector.create([0, 0, 0])
let uniforms = {};
let canvas;
let gl;
let eyeRadius = 2.5;
let angleX = 0.0;
let angleY = 0.0;
let eyePos;
let textureBuffer = [];
let tracerProgram;
let renderProgram;
let lineProgram;
let frameBuffer;
let vertexBuffer;
let lineVertexBuffer;
let lineIndexBuffer;
let renderVertexAttribute;
let tracerVertexAttribute;
let lineVertexAttribute
let objects = [];
let sampleCount = 1;
let interval;
let sceneSelected = 0;
let roomColorType = 0;
let objectID = 0;
let objectCount = 0;
let selectedObject;
let modelviewProjection;

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

    initVertexBuffer();
    initFramebuffer();
    initRender();
    initLineShader();

    newScene();
}

function initVertexBuffer() {
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function initFramebuffer() {
    gl.useProgram(tracerProgram);
    frameBuffer = gl.createFramebuffer();
    for (let i = 0; i < 2; i++) {
        textureBuffer.push(gl.createTexture());
        gl.bindTexture(gl.TEXTURE_2D, textureBuffer[i]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 512, 512, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
}

function makeTracer() {
    if (tracerProgram != null) {
        gl.deleteProgram(tracerProgram);
    }
    let tracerVertexShaderSource = loadFileAJAX('./shaders/tracer.vert');
    let tracerFragmentShaderSource = makeFragmentShader(objects);
    tracerProgram = createProgram(gl, tracerVertexShaderSource, tracerFragmentShaderSource);
    tracerVertexAttribute = gl.getAttribLocation(tracerProgram, 'vertex');
    gl.vertexAttribPointer(tracerVertexAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(tracerVertexAttribute);
}

function initRender() {
    let renderVertexShaderSource = loadFileAJAX('./shaders/render.vert');
    let renderFragmentShaderSource = loadFileAJAX('./shaders/render.frag');
    renderProgram = createProgram(gl, renderVertexShaderSource, renderFragmentShaderSource);
    renderVertexAttribute = gl.getAttribLocation(renderProgram, 'vertex');
    gl.vertexAttribPointer(renderVertexAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(renderVertexAttribute);

}

function initLineShader() {
    // create line shader
    let lineVertexSource = loadFileAJAX('./shaders/line.vert');
    let lineFragmentSource = loadFileAJAX('./shaders/line.frag');
    lineProgram = createProgram(gl, lineVertexSource, lineFragmentSource);
    lineVertexAttribute = gl.getAttribLocation(lineProgram, 'vertex');
    gl.enableVertexAttribArray(lineVertexAttribute);
    gl.useProgram(lineProgram);

    // create vertex buffer
    lineVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.STATIC_DRAW);

    // create index buffer
    lineIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineIndices), gl.STATIC_DRAW);

}

function drawSelectedBox() {
    gl.useProgram(lineProgram);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIndexBuffer);
    gl.vertexAttribPointer(lineVertexAttribute, 3, gl.FLOAT, false, 0, 0);
    setUniforms(gl, lineProgram, {
        cubeMin: selectedObject.getMinCorner(),
        cubeMax: selectedObject.getMaxCorner(),
        modelviewProjection: modelviewProjection
    });
    gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);
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
        case 32: //space

            break;
    }
    refresh();
}

function update() {

    changeEye();

    let modelview = makeLookAt(eye.elements[0], eye.elements[1], eye.elements[2], 0, 0, 0, 0, 1, 0);
    let projection = makePerspective(55, 1, 0.1, 100);
    modelviewProjection = projection.multiply(modelview);

    let inverse = modelviewProjection.inverse();

    uniforms.eye = eye
    uniforms.ray00 = getEyeRay(inverse, -1, -1, eye);
    uniforms.ray01 = getEyeRay(inverse, -1, +1, eye);
    uniforms.ray10 = getEyeRay(inverse, +1, -1, eye);
    uniforms.ray11 = getEyeRay(inverse, +1, +1, eye);
    uniforms.textureWeight = sampleCount / (sampleCount + 1);
    uniforms.rdSeed = Math.random();

    //console.log(uniforms.textureWeight)

    gl.useProgram(tracerProgram);
    setUniforms(gl, tracerProgram, uniforms)

    gl.bindTexture(gl.TEXTURE_2D, textureBuffer[0]);
    gl.enableVertexAttribArray(tracerVertexAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureBuffer[1], 0);
    gl.vertexAttribPointer(tracerVertexAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    textureBuffer.reverse();
    sampleCount++;
}

function render() {
    update();

    gl.useProgram(renderProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bindTexture(gl.TEXTURE_2D, textureBuffer[0]);
    gl.vertexAttribPointer(renderVertexAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    drawSelectedBox();

}

let scenes = [
    sceneClassic,
    sceneStackedSphere,
    sceneTableAndChair
];

let lightPosTipStr;

function sceneClassic() {
    objects = [];
    objectID = 0;
    objects.push(new myLightSource(Vector.create([0.0, 0.8, 0.0])));
    objects.push(new myCube(objectID++, Vector.create([0.3, -1.0, 0.3]), Vector.create([0.6, 0.0, 0.9]), 1));
    objects.push(new myCube(objectID++, Vector.create([-0.9, -0.4, -0.5]), Vector.create([0.6, 0.6, -0.1]), 2));
    objects.push(new mySphere(objectID++, Vector.create([0.6, 0.0, 0.0]), 0.4, 1));
    objects.push(new mySphere(objectID++, Vector.create([-0.3, -0.6, 0.6]), 0.3, 2));
    objectCount = 4;
    selectedObject = objects[1];
    lightPosTipStr = '本场景光源位置：0.0, 0.8, 0.0，注意请勿遮挡';
}

function sceneStackedSphere() {
    objects = [];
    objectID = 0;
    objects.push(new myLightSource(Vector.create([0.3, 0.0, 0.3])));
    objects.push(new mySphere(objectID++, Vector.create([0.0, 0.75, 0]), 0.25, 1));
    objects.push(new mySphere(objectID++, Vector.create([0.0, 0.25, 0]), 0.25, 2));
    objects.push(new mySphere(objectID++, Vector.create([0.0, -0.25, 0]), 0.25, 3));
    objects.push(new mySphere(objectID++, Vector.create([0.0, -0.75, 0]), 0.25, 1));
    objectCount = 4;
    selectedObject = objects[1];
    lightPosTipStr = '本场景光源位置：0.3, 0.0, 0.3，注意请勿遮挡';
}

function sceneTableAndChair() {
    objects = [];
    objectID = 0;

    objects.push(new myLightSource(Vector.create([0.0, 0.8, 0.0])));
    // table top
    objects.push(new myCube(objectID++, Vector.create([-0.5, -0.35, -0.5]), Vector.create([0.3, -0.3, 0.5]), 2));

    // table legs
    objects.push(new myCube(objectID++, Vector.create([-0.45, -1, -0.45]), Vector.create([-0.4, -0.35, -0.4]), 2));
    objects.push(new myCube(objectID++, Vector.create([0.2, -1, -0.45]), Vector.create([0.25, -0.35, -0.4]), 2));
    objects.push(new myCube(objectID++, Vector.create([-0.45, -1, 0.4]), Vector.create([-0.4, -0.35, 0.45]), 2));
    objects.push(new myCube(objectID++, Vector.create([0.2, -1, 0.4]), Vector.create([0.25, -0.35, 0.45]), 2));

    // chair seat
    objects.push(new myCube(objectID++, Vector.create([0.3, -0.6, -0.2]), Vector.create([0.7, -0.55, 0.2]), 1));

    // chair legs
    objects.push(new myCube(objectID++, Vector.create([0.3, -1, -0.2]), Vector.create([0.35, -0.6, -0.15]), 1));
    objects.push(new myCube(objectID++, Vector.create([0.3, -1, 0.15]), Vector.create([0.35, -0.6, 0.2]), 1));
    objects.push(new myCube(objectID++, Vector.create([0.65, -1, -0.2]), Vector.create([0.7, 0.1, -0.15]), 1));
    objects.push(new myCube(objectID++, Vector.create([0.65, -1, 0.15]), Vector.create([0.7, 0.1, 0.2]), 1));

    // chair back
    objects.push(new myCube(objectID++, Vector.create([0.65, 0.05, -0.15]), Vector.create([0.7, 0.1, 0.15]), 1));
    objects.push(new myCube(objectID++, Vector.create([0.65, -0.55, -0.09]), Vector.create([0.7, 0.1, -0.03]), 1));
    objects.push(new myCube(objectID++, Vector.create([0.65, -0.55, 0.03]), Vector.create([0.7, 0.1, 0.09]), 1));

    // sphere on table
    objects.push(new mySphere(objectID++, Vector.create([-0.1, -0.05, 0]), 0.25, 3));
    objectCount = 14;
    selectedObject = objects[1];
    lightPosTipStr = '本场景光源位置：0.0, 0.8, 0.0，注意请勿遮挡';
}

function refresh() {
    sampleCount = 1;
    render();
}

function newScene() {
    let selectBox = document.getElementById("scene");
    let sceneSelected = parseInt(selectBox.value);
    scenes[sceneSelected]();

    document.getElementById("lightTipStr").innerHTML = lightPosTipStr;

    changeScene();
}

function changeScene() {
    clearInterval(interval);

    makeTracer();
    angleX = 0.0;
    angleY = 0.0;
    changeEye();
    refresh();
    if (objectCount >= 10) {
        interval = setInterval(render, 50);
    } else if (objectCount >= 5) {
        interval = setInterval(render, 33);
    } else {
        interval = setInterval(render, 17);
    }
}

function addSphere() {
    let cX = parseFloat(document.getElementById("centerX").value);
    let cY = parseFloat(document.getElementById("centerY").value);
    let cZ = parseFloat(document.getElementById("centerZ").value);
    let rd = parseFloat(document.getElementById("radius").value);
    let mat = parseInt(document.getElementById("sphereMaterial").value);
    if (!(cX > -1.0 && cX < 1.0)) {
        alert("数据不合规");
        return;
    }
    if (!(cY > -1.0 && cY < 1.0)) {
        alert("数据不合规");
        return;
    }
    if (!(cZ > -1.0 && cZ < 1.0)) {
        alert("数据不合规");
        return;
    }
    if (!(rd >= 0.0)) {
        alert("数据不合规");
        return;
    }
    objects.push(new mySphere(objectID++, Vector.create([cX, cY, cZ]), rd, mat));
    objectCount++;
    changeScene();
}

function addCube() {
    let minX = parseFloat(document.getElementById("minX").value);
    let minY = parseFloat(document.getElementById("minY").value);
    let minZ = parseFloat(document.getElementById("minZ").value);
    let maxX = parseFloat(document.getElementById("maxX").value);
    let maxY = parseFloat(document.getElementById("maxY").value);
    let maxZ = parseFloat(document.getElementById("maxZ").value);
    let mat = parseInt(document.getElementById("cubeMaterial").value);
    if (!(minX > -1.0 && minX < 1.0)) {
        alert("数据不合规");
        return;
    }
    if (!(minY > -1.0 && minY < 1.0)) {
        alert("数据不合规");
        return;
    }
    if (!(minZ > -1.0 && minZ < 1.0)) {
        alert("数据不合规");
        return;
    }
    if (!(maxX > -1.0 && maxX < 1.0)) {
        alert("数据不合规");
        return;
    }
    if (!(maxY > -1.0 && maxY < 1.0)) {
        alert("数据不合规");
        return;
    }
    if (!(maxZ > -1.0 && maxZ < 1.0)) {
        alert("数据不合规");
        return;
    }
    //alert("" + minX + minY + minZ + maxX + maxY + maxZ + mat)

    objects.push(new myCube(objectID++, Vector.create([minX, minY, minZ]), Vector.create([maxX, maxY, maxZ]), mat));
    objectCount++;
    changeScene();
}

function changeSelectedObject() {

}

function deleteObject() {

}