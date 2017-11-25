'use strict';

function randomInUnitSphere() {
  var r = [0, 0, 0];
  do {
    r = [Math.random(), Math.random(), Math.random()];
    vec3.scale(r, r, 2);
    vec3.subtract(r, r, [1, 1, 1]);
  } while (vec3.squaredLength(r) >= 1);
  return r;
}

function reflect(ray_direction, surface_normal) {
  var r_dot_n = vec3.dot(ray_direction, surface_normal);
  var reflected = ray_direction;
  vec3.scaleAndAdd(reflected, ray_direction, surface_normal, -2 * r_dot_n)
  return reflected;
}

function refract(ray_direction, surface_normal, refractive_index) {
  var r_dot_n = vec3.dot(ray_direction, surface_normal);
  var discriminant = 1 - refractive_index*refractive_index*(1 - r_dot_n*r_dot_n);
  var refracted = [0, 0, 0];
  if (discriminant > 0) {
    vec3.scale(refracted, ray_direction, refractive_index);
    vec3.scaleAndAdd(refracted, refracted, surface_normal, -refractive_index * r_dot_n - Math.sqrt(discriminant))
  }
  return refracted;
}

function Ray(origin, direction) {
  this.origin = origin;
  this.direction = [0, 0, 0];
  vec3.normalize(this.direction, direction);
}

Ray.prototype.point = function(t) {
  var point = [0, 0, 0];
  vec3.scaleAndAdd(point, this.origin, this.direction, t);
  return point;
};

function Lambertian(albedo) {
  this.albedo = albedo;
}

Lambertian.prototype.scatter = function(ray, hit_record) {
  var direction = [0, 0, 0];
  vec3.add(direction, hit_record.normal, randomInUnitSphere());
  return {
    scattered: true,
    ray: new Ray(hit_record.point, direction),
    attenuation: this.albedo
  };
};

function Metal(albedo) {
  this.albedo = albedo;
}

Metal.prototype.scatter = function(ray, hit_record) {
  var reflected = reflect(ray.direction, hit_record.normal);
  if (vec3.dot(reflected, hit_record.normal) > 0) {
    return {
      scattered: true,
      ray: new Ray(hit_record.point, reflected),
      attenuation: this.albedo
    }
  } else {
    return {
      scattered: false,
      ray: new Ray([0, 0, 0], [0, 0, 0]),
      attenuation: [0, 0, 0]
    }
  }
}

function Dielectric(refractive_index) {
  this.refractive_index = refractive_index;
}

Dielectric.prototype.scatter = function(ray, hit_record) {
  var r_dot_n = vec3.dot(ray.direction, hit_record.normal);
  var attenuation = [1, 1, 0];
  var refractive_index = 1;
  var outward_normal = [0, 0, 0];
  var scattered = [0, 0, 0];
  // Outgoing ray.
  if (r_dot_n > 0) {
    refractive_index = this.refractive_index;
    vec3.scale(outward_normal, hit_record.normal, -1);
  } else {
    refractive_index = 1 / this.refractive_index;
    outward_normal = hit_record.normal;
  }
  var refracted = refract(ray.direction, outward_normal, refractive_index);
  if (vec3.squaredLength(refracted) > 0) {
    scattered = refracted;
  } else {
    scattered = reflect(ray.direction, outward_normal);
  }
  return {
   scattered: true,
   ray: new Ray(hit_record.point, scattered),
   attenuation: attenuation
 }
}

function Sphere(center, radius, material) {
  this.center = center;
  this.radius = radius;
  this.material = material;
}

Sphere.prototype.hitTest = function(ray, t_min, t_max) {
  var to_sphere = [0, 0, 0];
  vec3.subtract(to_sphere, ray.origin, this.center);
  var a = vec3.dot(ray.direction, ray.direction);
  var b = 2 * vec3.dot(ray.direction, to_sphere);
  var c = vec3.dot(to_sphere, to_sphere) - this.radius*this.radius;
  var discriminant = b*b - 4*a*c;
  var hit_record = {
    hit: false,
    t: 0,
    point: [0, 0, 0],
    normal: [0, 0, 0],
    material: null
  };
  if (discriminant > 0) {
    var t = (-b - Math.sqrt(discriminant)) / (2*a);
    if (t < t_max && t > t_min) {
      hit_record.hit = true;
      hit_record.t = t;
      hit_record.point = ray.point(t);
      vec3.subtract(hit_record.normal, hit_record.point, this.center);
      vec3.normalize(hit_record.normal, hit_record.normal);
      hit_record.material = this.material;
      return hit_record;
    }
    t = (-b + Math.sqrt(discriminant)) / (2*a);
    if (t < t_max && t > t_min) {
      hit_record.hit = true;
      hit_record.t = t;
      hit_record.point = ray.point(t);
      vec3.subtract(hit_record.normal, hit_record.point, this.center);
      vec3.normalize(hit_record.normal, hit_record.normal);
      hit_record.material = this.material;
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

function getColor(ray, world, depth) {
  var hit_record = world.hitTest(ray, 0.001, Number.MAX_VALUE);
  if (hit_record.hit) {
    if (depth >= 50)
      return [0, 0, 0];
    var scatter_record = hit_record.material.scatter(ray, hit_record);
    if (scatter_record.scattered) {
      var color = getColor(scatter_record.ray, world, depth + 1);
      vec3.multiply(color, color, scatter_record.attenuation);
      return color;
    } else {
      return [0, 0, 0];
    }
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
  var image_data = ctx.createImageData(canvas.width, canvas.height);
  var data = image_data.data;

  var camera = new Camera();
  var num_samples = 100;

  var world = new HitableList(
    new Sphere([0, 0, -1], 0.5, new Lambertian([0.8, 0.3, 0.3])),
    new Sphere([0,-100.5,-1], 100, new Lambertian([0.8, 0.8, 0])),
    new Sphere([1, 0, -1], 0.5, new Metal([0.8, 0.6, 0.2])),
    new Sphere([-1, 0, -1], 0.5, new Dielectric(1.5)));

  for (var j = 0; j < image_data.height; j++) {
    for (var i = 0; i < image_data.width; i++) {
      var color = [0, 0, 0];
      for (var s = 0; s < num_samples; s++) {
        var u = (i + Math.random()) / image_data.width;
        var v = (j + Math.random()) / image_data.height;
        vec3.add(color, color, getColor(camera.getRay(u, v), world, 0));
      }
      vec3.scale(color, color, 1 / num_samples);
      color[0] = Math.sqrt(color[0]);
      color[1] = Math.sqrt(color[1]);
      color[2] = Math.sqrt(color[2]);
      vec3.scale(color, color, 255);

      var idx = (j * image_data.width + i) * 4;
      data[idx] = color[0];
      data[idx+1] = color[1];
      data[idx+2] = color[2];
      data[idx+3] = 255; // alpha
    }
  }
  ctx.putImageData(image_data, 0, 0);
}

document.addEventListener('DOMContentLoaded', draw);
