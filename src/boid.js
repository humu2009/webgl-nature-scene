/**
	@preserve Copyright (c) 2011 Humu humu2009@gmail.com
	This file is freely distributable under the terms of the MIT license.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
**/

Boid = function(radius, maxSpeed, maxSteerForce) {
	this.position = [0, 0, 0];
	this.velocity = [0, 0, 0];
	this.acceleration = [0, 0, 0];
	this.neighborhoodRadius = radius;
	this.maxSpeed = maxSpeed;
	this.maxSteerForce = (maxSteerForce != undefined) ? maxSteerForce : 0.1;
	this.worldBox = new SglBox3;
	this.target = null;
};

Boid.prototype.getPosition = function() {
	return this.position;
};

Boid.prototype.setPosition = function(position) {
	copyV3(this.position, position);
};

Boid.prototype.getVelocity = function() {
	return this.velocity;
};

Boid.prototype.setVelocity = function(velocity) {
	copyV3(this.velocity, velocity);
};

Boid.prototype.getAcceleration = function() {
	return this.acceleration;
};

Boid.prototype.setAcceleration = function(acceleration) {
	copyV3(this.acceleration, acceleration);
};

Boid.prototype.getTarget = function() {
	return this.target;
};

Boid.prototype.setTarget = function(target) {
	if(!this.target)
		this.target = [0, 0, 0];

	copyV3(this.target, target);
};

Boid.prototype.getWorldBox = function() {
	return this.worldBox;
};

Boid.prototype.setWorldBox = function(worldBox) {
	this.worldBox.setup(worldBox.min, worldBox.max);
};

Boid.prototype.run = function(boids, deltaTime) {
	var v = [0, 0, 0];

	assignV3(v, this.worldBox.min[0], this.position[1], this.position[2]);
	v = this.avoid(v);
	sglSelfMulV3S(v, 5);
	sglSelfAddV3(this.acceleration, v);

	assignV3(v, this.worldBox.max[0], this.position[1], this.position[2]);
	v = this.avoid(v);
	sglSelfMulV3S(v, 5);
	sglSelfAddV3(this.acceleration, v);

	assignV3(v, this.position[0], this.worldBox.min[1], this.position[2]);
	v = this.avoid(v);
	sglSelfMulV3S(v, 5);
	sglSelfAddV3(this.acceleration, v);

	assignV3(v, this.position[0], this.worldBox.max[1], this.position[2]);
	v = this.avoid(v);
	sglSelfMulV3S(v, 5);
	sglSelfAddV3(this.acceleration, v);

	assignV3(v, this.position[0], this.position[1], this.worldBox.min[2]);
	v = this.avoid(v);
	sglSelfMulV3S(v, 5);
	sglSelfAddV3(this.acceleration, v);

	assignV3(v, this.position[0], this.position[1], this.worldBox.max[2]);
	v = this.avoid(v);
	sglSelfMulV3S(v, 5);
	sglSelfAddV3(this.acceleration, v);

	if(Math.random() > 0.5) {
		this.flock(boids);
	}

	this.move(deltaTime);
};

Boid.prototype.repulse = function(target) {
	var dist = distanceV3(this.position, target);
	if(dist < this.neighborhoodRadius) {
		var steer = sglSubV3(this.position, target);
		sglSelfMulV3S(steer, 0.5 / dist);
		sglSelfAddV3(this.acceleration, steer);
	}
};

Boid.prototype.avoid = function(target) {
	var steer = sglSubV3(this.position, target);
	return sglSelfMulV3S(steer, 1 / sglSqLengthV3(steer));
};

Boid.prototype.reach = function(target, amount) {
	var steer = sglSubV3(target, this.position);
	return sglSelfMulV3S(steer, amount);
};

Boid.prototype.flock = function(boids) {
	if(this.target) {
		sglSelfAddV3(this.acceleration, this.reach(this.target, 0.005));
	}

	sglSelfAddV3(this.acceleration, this.alignment(boids));
	sglSelfAddV3(this.acceleration, this.cohesion(boids));
	sglSelfAddV3(this.acceleration, this.separation(boids));
};

Boid.prototype.move = function(deltaTime) {
	sglSelfAddV3(this.velocity, this.acceleration);

	var l = sglLengthV3(this.velocity);
	if(l > this.maxSpeed) {
		sglSelfDivV3S(this.velocity, l / this.maxSpeed);
	}

	this.checkBounds();
	sglSelfAddV3(this.position, sglMulV3S(this.velocity, deltaTime));
	assignV3(this.acceleration, 0, 0, 0);
};

Boid.prototype.alignment = function(boids) {
	var velSum = [0, 0, 0];

	var count = 0;
	for(var i=0; i<boids.length; i++) {
		if(Math.random() > 0.6)
			continue;

		var boid = boids[i];
		var dist = distanceV3(boid.getPosition(), this.position);
		if(dist > 0 && dist <= this.neighborhoodRadius) {
			sglSelfAddV3(velSum, boid.getVelocity());
			count++;
		}
	}

	if(count > 0) {
		sglSelfMulV3S(velSum, 1 / count);
		var l = sglLengthV3(velSum);
		if(l > this.maxSteerForce) {
			sglSelfDivV3S(velSum, l / this.maxSteerForce);
		}
	}

	return velSum;
};

Boid.prototype.cohesion = function(boids) {
	var posSum = [0, 0, 0];

	var count = 0;
	for(var i=0; i<boids.length; i++) {
		if(Math.random() > 0.6)
			continue;

		var boid = boids[i];
		var dist = distanceV3(boid.getPosition(), this.position);
		if(dist > 0 && dist <= this.neighborhoodRadius) {
			sglSelfAddV3(posSum, boid.getPosition());
			count++;
		}
	}

	if(count > 0) {
		sglSelfMulV3S(posSum, 1 / count);
	}

	var steer = sglSubV3(posSum, this.position);
	var l = sglLengthV3(steer);
	if(l > this.maxSteerForce) {
		sglSelfDivV3S(steer, l / this.maxSteerForce);
	}

	return steer;
};

Boid.prototype.separation = function(boids) {
	var posSum = [0, 0, 0];

	for(var i=0; i<boids.length; i++) {
		if(Math.random() > 0.6)
			continue;

		var boid = boids[i];
		var dist = distanceV3(boid.getPosition(), this.position);
		if(dist > 0 && dist <= this.neighborhoodRadius) {
			var repulse = sglSelfNormalizeV3(sglSubV3(this.position, boid.getPosition()));
			sglSelfMulV3S(repulse, 1 / dist);
			sglSelfAddV3(posSum, repulse);
		}
	}

	return posSum;
};

Boid.prototype.checkBounds = function() {
	var worldMin = this.worldBox.min;
	var worldMax = this.worldBox.max;

	if(this.position[0] < worldMin[0] && this.velocity[0] < 0)
		 this.velocity[0] = - this.velocity[0];
	else if(this.position[0] > worldMax[0] && this.velocity[0] > 0)
		this.velocity[0] = - this.velocity[0];
	if(this.position[1] < worldMin[1] && this.velocity[1] < 0)
		this.velocity[1] = -this.velocity[1];
	else if(this.position[1] > worldMax[1] && this.velocity[1] > 0)
		this.velocity[1] = -this.velocity[1];
	if(this.position[2] < worldMin[2] && this.velocity[2] < 0)
		this.velocity[2] = -this.velocity[2];
	else if(this.position[2] > worldMax[2] && this.velocity[2] > 0)
		this.velocity[2] = -this.velocity[2];
};
