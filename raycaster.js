'use strict';

function Ray(origin, direction) {
  this.origin = origin;
  this.direction = direction;
}

Ray.prototype.point = function(t) {
  var point = [0, 0, 0]; 
  vec3.scaleAndAdd(point, this.origin, this.direction, t);
  return point;  
};

function Sphere(center, radius) {
  this.center = center;
  this.radius = radius;
}

Sphere.prototype.hitTest = function(ray, t_min, t_max) {
  var toSphere = [0, 0, 0];
  vec3.subtract(toSphere, ray.origin, this.center);
  var a = vec3.dot(ray.direction, ray.direction);
  var b = 2 * vec3.dot(ray.direction, toSphere);
  var c = vec3.dot(toSphere, toSphere) - this.radius*this.radius;
  var discriminant = b*b - 4*a*c;
  var hit_record = {
    hit: false,
    t: 0,
    point: [0, 0, 0],
    normal: [0, 0, 0]
  };
  if (discriminant > 0) {
    var t = (-b - Math.sqrt(discriminant)) / (2*a);
    if (t < t_max && t > t_min) {
      hit_record.hit = true;
      hit_record.t = t;
      hit_record.point = ray.point(t);
      vec3.subtract(hit_record.normal, hit_record.point, this.center);
      vec3.normalize(hit_record.normal, hit_record.normal);
      return hit_record;
    }
    t = (-b + Math.sqrt(discriminant)) / (2*a);
    if (t < t_max && t > t_min) {
      hit_record.hit = true;
      hit_record.t = t;
      hit_record.point = ray.point(t);
      vec3.subtract(hit_record.normal, hit_record.point, this.center);
      vec3.normalize(hit_record.normal, hit_record.normal);
      return hit_record;
    }
  }
  return hit_record;
};

function HitableList() {
  this.hitable_list = Array.from(arguments);
}

HitableList.prototype.hitTest = function(ray, t_min, t_max) {
  var closest_hit_record = {
    hit: false,
    t: t_max,
    point: [0, 0, 0],
    normal: [0, 0, 0]
  };
  this.hitable_list.forEach(function(hitable) {
    var hit_record = hitable.hitTest(ray, t_min, closest_hit_record.t);
    if (hit_record.hit && hit_record.t < closest_hit_record.t)
      closest_hit_record = hit_record;
  });
  return closest_hit_record;
};

function Camera() {
  this.top_left_corner = [-2, 1, -1]; // canvas origin is top left corner
  this.horizontal = [4, 0, 0];
  this.vertical = [0, -2, 0]; // v goes down along the y axis
  this.origin = [0, 0, 0];
}

Camera.prototype.getRay = function(u, v) {
  var direction = vec3.clone(this.top_left_corner);
  vec3.scaleAndAdd(direction, direction, this.horizontal, u);
  vec3.scaleAndAdd(direction, direction, this.vertical, v);
  return new Ray(this.origin, direction);
}

function randomInUnitSphere() {
  var r = [0, 0, 0];
  do {
    r = [Math.random(), Math.random(), Math.random()];
    vec3.scale(r, r, 2);
    vec3.subtract(r, r, [1, 1, 1]);
  } while (vec3.squaredLength(r) >= 1);
  return r;
}

function getColor(ray, world) {
  var hit_record = world.hitTest(ray, 0.001, Number.MAX_VALUE);
  if (hit_record.hit) {
    var randomDirection = [0, 0, 0]
    vec3.add(randomDirection, hit_record.normal, randomInUnitSphere());
    var color = getColor(new Ray(hit_record.point, randomDirection), world);
    vec3.scale(color, color, 0.5);
    return color;
  }
  var unit_direction = [0, 0, 0];
  vec3.normalize(unit_direction, ray.direction);
  var t = 0.5 * (unit_direction[1] + 1.0);
  var white = [1, 1, 1];
  var bluish = [0.5, 0.7, 1.0];
  var color = [0, 0, 0];
  vec3.lerp(color, white, bluish, t);
  return color;
}

function draw() {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var imageData = ctx.createImageData(canvas.width, canvas.height);
  var data = imageData.data;

  var camera = new Camera();
  var numSamples = 100;

  var world = new HitableList(
    new Sphere([0, 0, -1], 0.5),
    new Sphere([0,-100.5,-1], 100));

  for (var j = 0; j < imageData.height; j++) {
    for (var i = 0; i < imageData.width; i++) {
      var color = [0, 0, 0];
      for (var s = 0; s < numSamples; s++) {
        var u = (i + Math.random()) / imageData.width;
        var v = (j + Math.random()) / imageData.height;
        vec3.add(color, color, getColor(camera.getRay(u, v), world));
      }
      vec3.scale(color, color, 1 / numSamples);
      color[0] = Math.sqrt(color[0]);
      color[1] = Math.sqrt(color[1]);
      color[2] = Math.sqrt(color[2]);
      vec3.scale(color, color, 255);

      var idx = (j * imageData.width + i) * 4;
      data[idx] = color[0];
      data[idx+1] = color[1];
      data[idx+2] = color[2];
      data[idx+3] = 255; // alpha
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

document.addEventListener('DOMContentLoaded', draw);