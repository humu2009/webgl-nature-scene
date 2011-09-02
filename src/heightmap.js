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


HMVertex = function() {
	this.uv       = null;
	this.binormal = null;
	this.tangent  = null;
	this.normal   = null;
	this.vertex   = null;
};



HeightMap = function() {
	this.width = 0;
	this.height = 0;
	this.indexCount = 0;
	this.vertices = null;
};

HeightMap.prototype.setup = function(heightmap, watermap) {
	var w = heightmap.width;
	var h = heightmap.height;

	if(watermap.width != w || watermap.height != h) {
		err('water map has unexpected dimensions');
		return false;
	}

	this.width = w;
	this.height = h;
	this.vertices = new Array(this.width * this.height);

	var heightData = getImageData(heightmap);
	var waterData = getImageData(watermap);
	for(var y=0; y<h; y++) {
		for(var x=0; x<w; x++) {
			var index = y * w + x;
			var waterHeight = waterData[index * 4] / 255;
			var newHeight = heightData[index * 4] / 255;
			newHeight = waterHeight < 0.8 ? (0.8 - waterHeight) * TerrainConsts.WATER_MIN_HEIGHT : newHeight * TerrainConsts.TERRAIN_MAX_HEIGHT;

			var v = new HMVertex;

			v.vertex = [ 
				(-TerrainConsts.TERRAIN_X_OFFSET + x) * TerrainConsts.TERRAIN_WIDTH_SCALE, 
				newHeight, 
				(-TerrainConsts.TERRAIN_Z_OFFSET + y) * TerrainConsts.TERRAIN_DEPTH_SCALE
			];

			v.uv = [
				x / TerrainConsts.HEIGHT_MAP_WIDTH, 
				y / TerrainConsts.HEIGHT_MAP_DEPTH
			];

			this.vertices[index] = v;
		}
	}

	this.computeBTangents();

	return true;
};

HeightMap.prototype.getVertexStream = function() {
	return this.vertices;
};

HeightMap.prototype.buildWeightMap = function() {
};

HeightMap.prototype.getHeight = function(position) {
	if(!this.vertices)
		return -1;

	var local = sglDupV3(this.vertices[0].vertex);
	local[0] *= -1;
	local[2] *= -1;
	sglSelfAddV3(local, position);

	var x0 = sglClamp(Math.floor(local[0] / TerrainConsts.TERRAIN_WIDTH_SCALE), 0, this.width - 2);
	var z0 = sglClamp(Math.floor(local[2] / TerrainConsts.TERRAIN_DEPTH_SCALE), 0, this.height - 2);
	var x1 = x0 + 1;
	var z1 = z0 + 1;

	var xInter = (position[0] - this.vertices[z0 * this.width + x0].vertex[0]) / TerrainConsts.TERRAIN_WIDTH_SCALE;
	var zInter = (position[2] - this.vertices[z0 * this.width + x0].vertex[2]) / TerrainConsts.TERRAIN_DEPTH_SCALE;

	return  ( (1 - xInter) * this.vertices[z0 * this.width + x0].vertex[1] + xInter * this.vertices[z0 * this.width + x1].vertex[1] ) * (1 - zInter) + 
			( (1 - xInter) * this.vertices[z1 * this.width + x0].vertex[1] + xInter * this.vertices[z1 * this.width + x1].vertex[1] ) * zInter;
};

HeightMap.prototype.getIndexCount = function() {
	return this.indexCount;
};

HeightMap.prototype.getMapHeight = function() {
	return this.height;
};

HeightMap.prototype.getMapWidth = function() {
	return this.width;
};

HeightMap.prototype.render = function() {
};

/**
	@private
*/
HeightMap.prototype.computeBTangents = function() {
	var w = this.width;
	var h = this.height;

	var neighborsV = new Array(6);
	var neighborsN = new Array(6);
	var vec1 = [0, 0, 0];
	var vec2 = [0, 0, 0];
	var tangent = [0, 0, 0];

	for(var y=0; y<h; y++) {
		for(var x=0; x<w; x++) {
			var index = y * w + x;
			var x1 = sglClamp(x - 1, 0, w - 1);
			var x2 = sglClamp(x + 1, 0, w - 1);
			var y1 = sglClamp(y - 1, 0, h - 1);
			var y2 = sglClamp(y + 1, 0, h - 1);

			neighborsV[0] = this.vertices[y1 * w + x ].vertex;
			neighborsV[1] = this.vertices[y  * w + x1].vertex;
			neighborsV[2] = this.vertices[y2 * w + x1].vertex;
			neighborsV[3] = this.vertices[y2 * w + x ].vertex;
			neighborsV[4] = this.vertices[y  * w + x2].vertex;
			neighborsV[5] = this.vertices[y1 * w + x2].vertex;

			copyV3(vec1, neighborsV[0]);
			sglSelfSubV3(vec1, this.vertices[index].vertex);
			copyV3(vec2, neighborsV[1]);
			sglSelfSubV3(vec2, this.vertices[index].vertex);
			neighborsN[0] = sglCrossV3(vec1, vec2);

			copyV3(vec1, neighborsV[1]);
			sglSelfSubV3(vec1, this.vertices[index].vertex);
			copyV3(vec2, neighborsV[2]);
			sglSelfSubV3(vec2, this.vertices[index].vertex);
			neighborsN[1] = sglCrossV3(vec1, vec2);

			copyV3(vec1, neighborsV[2]);
			sglSelfSubV3(vec1, this.vertices[index].vertex);
			copyV3(vec2, neighborsV[3]);
			sglSelfSubV3(vec2, this.vertices[index].vertex);
			neighborsN[2] = sglCrossV3(vec1, vec2);

			copyV3(vec1, neighborsV[3]);
			sglSelfSubV3(vec1, this.vertices[index].vertex);
			copyV3(vec2, neighborsV[4]);
			sglSelfSubV3(vec2, this.vertices[index].vertex);
			neighborsN[3] = sglCrossV3(vec1, vec2);
			copyV3(tangent, vec2);

			copyV3(vec1, neighborsV[4]);
			sglSelfSubV3(vec1, this.vertices[index].vertex);
			copyV3(vec2, neighborsV[5]);
			sglSelfSubV3(vec2, this.vertices[index].vertex);
			neighborsN[4] = sglCrossV3(vec1, vec2);

			copyV3(vec1, neighborsV[5]);
			sglSelfSubV3(vec1, this.vertices[index].vertex);
			copyV3(vec2, neighborsV[0]);
			sglSelfSubV3(vec2, this.vertices[index].vertex);
			neighborsN[5] = sglCrossV3(vec1, vec2);

			sglSelfAddV3(neighborsN[0], neighborsN[1]);
			sglSelfAddV3(neighborsN[0], neighborsN[2]);
			sglSelfAddV3(neighborsN[0], neighborsN[3]);
			sglSelfAddV3(neighborsN[0], neighborsN[4]);
			sglSelfAddV3(neighborsN[0], neighborsN[5]);

			this.vertices[index].normal = sglNormalizedV3(neighborsN[0]);
			this.vertices[index].binormal = sglSelfNormalizeV3(sglCrossV3(tangent, neighborsN[0]));
			this.vertices[index].tangent = sglSelfNormalizeV3(sglCrossV3(neighborsN[0], this.vertices[index].binormal));
		}
	}
};
