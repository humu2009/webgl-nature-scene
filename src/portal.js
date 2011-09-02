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


Portal = function(gl) {
	this.gl = gl;
	this.aabb = new SglBox3;
	this.center = [0, 0, 0];
	this.terrainCell = new TerrainCell(gl);
	this.grassCell = new GrassCell(gl);
	this.boundingBox = null;
	this.visibility = true;
	this.zSortValue = 0;
};

Portal.RenderTokens = {
	AABB:		1, 
	GRASS:		2, 
	TERRAIN:	3
};

Portal.prototype.setup = function(heightmap, offset, random, coverage) {
	this.terrainCell.setup(heightmap, offset);
	this.grassCell.setup(heightmap, offset, random, coverage);

	var vbounds0 = this.terrainCell.getVerticalBounds();
	var vbounds1 = this.grassCell.getVerticalBounds();
	var minHeight = Math.min(vbounds0[0], vbounds1[0]);
	var maxHeight = Math.max(vbounds0[1], vbounds1[1]);

	this.aabb.setup(	[ (-TerrainConsts.TERRAIN_X_OFFSET + offset[0]) * TerrainConsts.TERRAIN_WIDTH_SCALE, 
						  minHeight, 
						  (-TerrainConsts.TERRAIN_Z_OFFSET + offset[1]) * TerrainConsts.TERRAIN_DEPTH_SCALE ], 
						[ (-TerrainConsts.TERRAIN_X_OFFSET - 1 + offset[0] + TerrainConsts.TILE_COLUMN_COUNT) * TerrainConsts.TERRAIN_WIDTH_SCALE, 
						  maxHeight, 
						  (-TerrainConsts.TERRAIN_Z_OFFSET - 1 + offset[1] + TerrainConsts.TILE_ROW_COUNT) * TerrainConsts.TERRAIN_DEPTH_SCALE ] );
	copyV3(this.center, this.aabb.center);

	this.buildBoundingBox();
};

/**
	@private
*/
Portal.prototype.buildBoundingBox = function() {
	var aabbMin = this.aabb.min;
	var aabbMax = this.aabb.max;

	var boxVertices = new Float32Array(8 * 3);
	boxVertices[0 ] = aabbMin[0];  boxVertices[1 ] = aabbMin[1];  boxVertices[2 ] = aabbMin[2];
	boxVertices[3 ] = aabbMax[0];  boxVertices[4 ] = aabbMin[1];  boxVertices[5 ] = aabbMin[2];
	boxVertices[6 ] = aabbMax[0];  boxVertices[7 ] = aabbMax[1];  boxVertices[8 ] = aabbMin[2];
	boxVertices[9 ] = aabbMin[0];  boxVertices[10] = aabbMax[1];  boxVertices[11] = aabbMin[2];
	boxVertices[12] = aabbMin[0];  boxVertices[13] = aabbMin[1];  boxVertices[14] = aabbMax[2];
	boxVertices[15] = aabbMax[0];  boxVertices[16] = aabbMin[1];  boxVertices[17] = aabbMax[2];
	boxVertices[18] = aabbMax[0];  boxVertices[19] = aabbMax[1];  boxVertices[20] = aabbMax[2];
	boxVertices[21] = aabbMin[0];  boxVertices[22] = aabbMax[1];  boxVertices[23] = aabbMax[2];

	var boxIndices = new Uint16Array(12 * 2);
	boxIndices[0 ] = 0;  boxIndices[1 ] = 1;
	boxIndices[2 ] = 1;  boxIndices[3 ] = 2;
	boxIndices[4 ] = 2;  boxIndices[5 ] = 3;
	boxIndices[6 ] = 3;  boxIndices[7 ] = 0;
	boxIndices[8 ] = 4;  boxIndices[9 ] = 5;
	boxIndices[10] = 5;  boxIndices[11] = 6;
	boxIndices[12] = 6;  boxIndices[13] = 7;
	boxIndices[14] = 7;  boxIndices[15] = 4;
	boxIndices[16] = 0;  boxIndices[17] = 4;
	boxIndices[18] = 1;  boxIndices[19] = 5;
	boxIndices[20] = 2;  boxIndices[21] = 6;
	boxIndices[22] = 3;  boxIndices[23] = 7;

	this.boundingBox = new SglMeshGL(this.gl);
	this.boundingBox.addVertexAttribute('position', 3, boxVertices);
	this.boundingBox.addIndexedPrimitives('edges', this.gl.LINES, boxIndices);
};

Portal.prototype.getAABB = function() {
	return this.aabb;
};

Portal.prototype.getTerrainCell = function() {
	return this.terrainCell;
};

Portal.prototype.getGrassCell = function() {
	return this.grassCell;
};

Portal.prototype.render = function(renderer, token) {
	var triangleCount = 0;

	switch(token) {
	case Portal.RenderTokens.TERRAIN:
		triangleCount = this.terrainCell.render(renderer);
		break;
	case Portal.RenderTokens.GRASS:
		triangleCount = this.grassCell.render(renderer);
		break;
	case Portal.RenderTokens.AABB:
		renderer.renderMeshPrimitives(this.boundingBox, 'edges');
		break;
	default:
		break;
	}

	return triangleCount;
};

Portal.prototype.testVisibility = function(frustum) {
	this.visibility = frustum.boxVisibility(this.aabb.min, this.aabb.max) != SGL_OUTSIDE_FRUSTUM;
	return this.visibility;
};

Portal.prototype.isVisible = function() {
	return this.visibility;
};

Portal.prototype.computeZSortValue = function(transformMatrix) {
	//this.zSortValue = sglMulM4V3(transformMatrix, this.center, 1)[2];
	//return this.zSortValue;

	var c = sglMulM4V3(transformMatrix, this.center, 1);
	this.zSortValue = -(c[0] * c[0] + c[2] * c[2]);
	return this.zSortValue;
};

Portal.prototype.getZSortValue = function() {
	return this.zSortValue;
};
