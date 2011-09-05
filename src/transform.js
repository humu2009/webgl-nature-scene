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


Transform = function() {
	this.translation = [0, 0, 0];
	this.rotation = [0, 0, 0];
	this.scale = [1, 1, 1];

	this.matrix = sglIdentityM4();
	this.isDirty = false;
};

Transform.prototype.getTranslation = function() {
	return this.translation;
};

Transform.prototype.setTranslation = function(translation) {
	copyV3(this.translation, translation);
	this.isDirty = true;
};

Transform.prototype.getRotation = function() {
	return this.rotation;
};

Transform.prototype.setRotation = function(rotation) {
	copyV3(this.rotation, rotation);
	this.isDirty = true;
};

Transform.prototype.getScale = function() {
	return this.scale;
};

Transform.prototype.setScale = function(scale) {
	copyV3(this.scale, scale);
	this.isDirty = true;
};

Transform.prototype.getMatrix = function() {
	if(this.isDirty) {
		var sMat  = sglScalingM4V(this.scale);
		var rxMat = sglRotationAngleAxisM4C(this.rotation[0], 1, 0, 0);
		var ryMat = sglRotationAngleAxisM4C(this.rotation[1], 0, 1, 0);
		var rzMat = sglRotationAngleAxisM4C(this.rotation[2], 0, 0, 1);
		var tMat  = sglTranslationM4V(this.translation);

		this.matrix = sglMulM4(tMat, sglMulM4(rzMat, sglMulM4(ryMat, sglMulM4(rxMat, sMat))));
		this.isDirty = false;
	}

	return this.matrix;
};
