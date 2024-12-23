function makeFragmentShader(objects) {
    let shader =
        start +
        concat(objects, function (o) { return o.makeObject(); }) +
        intersect +
        colorOnRoom +
        randoms +
        normals +
        makeShadow(objects) +
        makeCalculateColor(objects) +
        main;
    return shader;
}

class myLightSource {
    constructor(position) {
        this.position = position;
    }
    makeObject() {
        return 'LightSource light = LightSource(' + vec3ToStr(this.position) + ', 0.8, 0.2);'
    }
    getDiffuseIntensity() {
        return '';
    }
    makeIfT() {
        return '';
    }
    getCalculateColorIntersect() {
        return '';
    }
    getCalculateColorNormal() {
        return '';
    }
    getCalculateColorNextRay() {
        return '';
    }
    getShadow() {
        return '';
    }
}

//material
//1:Diffuse
//2:Reflective
//3:Glossy

class myCube {
    constructor(id, cubeMin, cubeMax, material) {
        this.id = id;
        this.cubeMin = cubeMin;
        this.cubeMax = cubeMax;
        this.material = material;
    }
    makeObject() {
        return 'Cube c' +
            this.id +
            ' = Cube(' +
            vec3ToStr(this.cubeMin) + ', ' +
            vec3ToStr(this.cubeMax) + ');'
    }
    getDiffuseIntensity() {
        return 'vec2 tCube' + this.id
            + ' = intersectCube(point, toLightSource, c' + this.id
            + ');';
    }
    makeIfT() {
        return 'if(tCube' + this.id + '.x > 0.0 && tCube' + this.id +
            '.x < tCube' + this.id + '.y && tCube' + this.id +
            '.x < t) t = tCube' + this.id + '.x;';
    }
    getCalculateColorIntersect() {
        return 'vec2 tCube' + this.id
            + ' = intersectCube(origin, direction, c' + this.id
            + ');';
    }
    getCalculateColorNormal() {
        return 'if(t == tCube' + this.id + '.x && tCube' + this.id + '.x < tCube' + this.id
            + '.y)  normal = normalOfCube(hitPoint, c' + this.id + ');';
    }
    getCalculateColorNextRay() {
        if (this.material == 1) {
            return 'else if(t == tCube' + this.id + '.x && tCube' + this.id + '.x < tCube' + this.id + '.y) {' +
                'direction = cosineWeightedDirection(seed, normal);' +
                '}'
        } else if (this.material == 2) {
            return 'else if(t == tCube' + this.id + '.x && tCube' + this.id + '.x < tCube' + this.id + '.y) {' +
                '\
                direction = reflect(direction, normal);\
                vec3 reflectedLight = normalize(reflect(light.position - hitPoint, normal));\
                specularHighlight = max(0.0, dot(reflectedLight, normalize(hitPoint - origin)));\
                specularHighlight = 2.0 * pow(specularHighlight, 20.0);' +
                '}'
        } else if (this.material == 3) {
            return 'else if(t == tCube' + this.id + '.x && tCube' + this.id + '.x < tCube' + this.id + '.y) {' +
                '\
                direction = normalize(reflect(direction, normal)) + getNormalizedRandomDirection(seed) * 0.6;\
                vec3 reflectedLight = normalize(reflect(light.position - hitPoint, normal));\
                specularHighlight = max(0.0, dot(reflectedLight, normalize(hitPoint - origin)));\
                specularHighlight = pow(specularHighlight, 3.0);' +
                '}'
        }
    }
    getShadow() {
        return '\
        vec2 tCube'+ this.id + ' = intersectCube(origin, ray, c' + this.id + ');\
        if(tCube'+ this.id + '.x > 0.0 && tCube' + this.id + '.x < 1.0 && tCube' + this.id + '.x < tCube' + this.id + '.y) {\
        return 0.0;\
        }';
    }
}

class mySphere {
    constructor(id, center, radius, material) {
        this.id = id;
        this.center = center;
        this.radius = radius;
        this.material = material;
    }
    makeObject() {
        return 'Sphere s' +
            this.id +
            ' = Sphere(' +
            vec3ToStr(this.center) +
            ', ' + this.radius + ');'
    }
    getDiffuseIntensity() {
        return 'float tSphere' + this.id
            + ' = intersectSphere(point, toLightSource, s' + this.id
            + ');';
    }
    makeIfT() {
        return 'if(t > tSphere' + this.id + ') t = tSphere' + this.id + ';';
    }
    getCalculateColorIntersect() {
        return 'float tSphere' + this.id
            + ' = intersectSphere(origin, direction, s' + this.id
            + ');';
    }
    getCalculateColorNormal() {
        return 'if(t == tSphere' + this.id + ') normal = normalOfSphere(hitPoint, s' + this.id + ');';
    }
    getCalculateColorNextRay() {
        if (this.material == 1) {
            return 'else if(t == tSphere' + this.id + ') {' +
                'direction = cosineWeightedDirection(seed, normal);' +
                '}'
        } else if (this.material == 2) {
            return 'else if(t == tSphere' + this.id + ') {' +
                '\
                direction = reflect(direction, normal);\
                vec3 reflectedLight = normalize(reflect(light.position - hitPoint, normal));\
                specularHighlight = max(0.0, dot(reflectedLight, normalize(hitPoint - origin)));\
                specularHighlight = 2.0 * pow(specularHighlight, 20.0);' +
                '}'
        } else if (this.material == 3) {
            return 'else if(t == tSphere' + this.id + ') {' +
                '\
                direction = normalize(reflect(direction, normal)) + getNormalizedRandomDirection(seed) * 0.6;\
                vec3 reflectedLight = normalize(reflect(light.position - hitPoint, normal));\
                specularHighlight = max(0.0, dot(reflectedLight, normalize(hitPoint - origin)));\
                specularHighlight = pow(specularHighlight, 3.0);' +
                '}'
        }
    }
    getShadow() {
        return '\
        float tSphere' + this.id + ' = intersectSphere(origin, ray, s' + this.id + ');\
        if(tSphere' + this.id + ' < 1.0)\
        return 0.0;';
    }

}

function vec3ToStr(vec) {
    return 'vec3(' + vec.elements[0] + ',' + vec.elements[1] + ',' + vec.elements[2] + ')';
}

function concat(objects, func) {
    var text = '';
    for (var i = 0; i < objects.length; i++) {
        text += func(objects[i]);
    }
    return text;
}

let start = '\
precision mediump float;\
const float INFINITY = 1000000.0;\
const vec3 SCENE_COLOR = vec3(0.1, 0.1, 0.1);\
const vec3 WHITE = vec3(1.0);\
const int MAX_BOUNCE = 5;\
const int SAMPLE_NUM = 50;\
varying vec3 initialRay;\
\
uniform vec3 eye;\
\
uniform vec3 center;\
uniform float radius;\
float seed = 0.93725856;\
struct Cube {\
    vec3 minCorner;\
    vec3 maxCorner;\
};\
struct Sphere {\
    vec3 center;\
    float radius;\
};\
struct LightSource {\
    vec3 position;\
    float intensity;\
    float lightSize;\
};\
Cube room = Cube(vec3(-1.0, -1.0, -1.0), vec3(1.0, 1.0, 1.0));\
';

let intersect = '\
float intersectSphere(vec3 origin, vec3 direction, Sphere sphere) {\
    vec3 toSphere = origin - sphere.center;\
    float a = dot(direction, direction);\
    float b = 2.0 * dot(toSphere, direction);\
    float c = dot(toSphere, toSphere) - sphere.radius * sphere.radius;\
    float discriminant = b * b - 4.0 * a * c;\
    if(discriminant > 0.0) {\
        float t = (-b - sqrt(discriminant)) / (2.0 * a);\
        if(t > 0.0)\
            return t;\
    }\
    return INFINITY + 1.0;\
}\
vec2 intersectCube(vec3 origin, vec3 ray, Cube cube) {\
    vec3 tMin = (cube.minCorner - origin) / ray;\
    vec3 tMax = (cube.maxCorner - origin) / ray;\
    vec3 t1 = min(tMin, tMax);\
    vec3 t2 = max(tMin, tMax);\
    float tNear = max(max(t1.x, t1.y), t1.z);\
    float tFar = min(min(t2.x, t2.y), t2.z);\
    return vec2(tNear, tFar);\
}\
';

let colorOnRoom = '\
vec3 colorOnRoom(vec3 position) {\
    if(position.x < -0.9999) {\
        return vec3(0.1, 0.5, 1.0);\
    } else if(position.x > 0.9999) {\
        return vec3(1.0, 0.9, 0.1);\
    }\
    return WHITE;\
}\
';

// function makeDiffuseIntensity(objects) {
//     return '\
//     float getDiffuseIntensity(vec3 point, vec3 normal, LightSource lightSource) {\
//     vec3 toLightSource = lightSource.position - point;\
//     float t = INFINITY + 1.0;\
//     vec2 tRoom = intersectCube(point, toLightSource, room);'+
//         concat(objects, function (o) { return o.getDiffuseIntensity(); }) +
//         'if(tRoom.x < tRoom.y)\
//         t = tRoom.y;'+
//         concat(objects, function (o) { return o.makeIfT(); }) +
//         'if(t < 1.0) {\
//       \
//         return 0.0;\
//     } else {\
//     \
//         return max(0.0, dot(normalize(toLightSource), normal)) * light.intensity;\
//     }\
//     }\
// ';
// }
let randoms = '\
float random(vec3 scale, float seed) {\
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
}\
\
vec3 cosineWeightedDirection(float seed, vec3 normal) {\
    float u = random(vec3(12.9898, 78.233, 151.7182), seed);\
    float v = random(vec3(63.7264, 10.873, 623.6736), seed);\
    float r = sqrt(u);\
    float angle = 6.283185307179586 * v;\
    vec3 sdir, tdir;\
    if(abs(normal.x) < .5) {\
        sdir = cross(normal, vec3(1, 0, 0));\
    } else {\
        sdir = cross(normal, vec3(0, 1, 0));\
    }\
    tdir = cross(normal, sdir);\
    return r * cos(angle) * sdir + r * sin(angle) * tdir + sqrt(1. - u) * normal;\
}\
\
vec3 getNormalizedRandomDirection(float seed) {\
    float x = random(vec3(12.9898, 78.233, 151.7182), seed);\
    float y = random(vec3(63.7264, 10.873, 623.6736), seed);\
    float z = random(vec3(36.7539, 50.368, 306.2759), seed);\
    return normalize(vec3(x, y, z));\
}\
';
let normals = '\
vec3 normalOfCube(vec3 point, Cube cube) {\
    if(point.x < cube.minCorner.x + 0.0001) {\
        return vec3(-1.0, 0.0, 0.0);\
    } else if(point.x > cube.maxCorner.x - 0.0001) {\
        return vec3(1.0, 0.0, 0.0);\
    } else if(point.y < cube.minCorner.y + 0.0001) {\
        return vec3(0.0, -1.0, 0.0);\
    } else if(point.y > cube.maxCorner.y - 0.0001) {\
        return vec3(0.0, 1.0, 0.0);\
    } else if(point.z < cube.minCorner.z + 0.0001) {\
        return vec3(0.0, 0.0, -1.0);\
    } else {\
        return vec3(0.0, 0.0, 1.0);\
    }\
}\
vec3 normalOfSphere(vec3 point, Sphere sphere) {\
    return normalize(point - sphere.center);\
}\
';

function makeShadow(objects) {
    return '\
    float shadow(vec3 origin, vec3 ray) {'+
        concat(objects, function (o) { return o.getShadow(); }) +
        'return 1.0;\
}\
';
}


function makeCalculateColor(objects) {
    return '\
    vec3 calculateColor(vec3 origin, vec3 direction, float seed) {\
    vec3 accumulatedColor = vec3(0.0);\
\
    vec3 colorMask = vec3(1.0);\
    for(int bounce = 0; bounce < MAX_BOUNCE; bounce++) {\
    \
        float t = INFINITY + 1.0;\
        vec2 tRoom = intersectCube(origin, direction, room);'+
        concat(objects, function (o) { return o.getCalculateColorIntersect(); }) +
        'if(tRoom.x < tRoom.y)\
            t = tRoom.y;'+
        concat(objects, function (o) { return o.makeIfT(); }) +
        '\
        if(t > INFINITY) {\
            \
            accumulatedColor += SCENE_COLOR;\
            break;\
        }\
        vec3 hitPoint = origin + t * direction;\
        vec3 normal;\
        vec3 surfaceColor = WHITE;\
        float specularHighlight = 0.0;\
     \
        if(t == tRoom.y) {\
            normal = -normalOfCube(hitPoint, room);\
            surfaceColor = colorOnRoom(hitPoint);\
        }' +
        concat(objects, function (o) { return o.getCalculateColorNormal(); }) +
        '\
       \
        origin = hitPoint;\
        if(false) {}'+
        concat(objects, function (o) { return o.getCalculateColorNextRay(); }) +
        'else {\
            direction = cosineWeightedDirection(seed, normal);\
        }\
        if(dot(normal, direction) < 0.0) {\
            direction = -direction;\
        }\
        vec3 toLight = light.position - hitPoint;\
        float diffuse = max(0.0, dot(normalize(toLight), normal));\
        float shadowIntensity = shadow(hitPoint + normal * 0.0001, toLight);\
        colorMask *= surfaceColor;\
        accumulatedColor += (colorMask * (0.5 * diffuse * shadowIntensity)) * 0.6;\
        accumulatedColor += (colorMask * specularHighlight * shadowIntensity) * 0.6;\
\
    }\
\
    return accumulatedColor;\
}\
    ';
};

let main = '\
void main() {\
    light.position += getNormalizedRandomDirection(seed) * light.lightSize;\
    vec3 sumColor = vec3(0.0);\
    for(int i = 0; i < SAMPLE_NUM; i++) {\
        sumColor = sumColor + calculateColor(eye, initialRay, seed);\
        seed += 1.4732648392;\
    }\
    gl_FragColor = vec4(sumColor / float(SAMPLE_NUM), 1.0);\
}\
';