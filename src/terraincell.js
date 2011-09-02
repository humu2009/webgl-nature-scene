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


TerrainCell = function(gl) {
	this.gl = gl;
	this.mesh = null;
	this.triangleCount = 0;
	this.verticalBounds = [20000, -20000];
};

TerrainCell.prototype.setup = function(heightmap, start) {
	var w = heightmap.getMapWidth();
	var h = heightmap.getMapHeight();
	var heightmapVertices = heightmap.getVertexStream();
	var minHeight = 20000;
	var maxHeight = -20000;

	var vertices = new Float32Array(TerrainConsts.TILE_COUNT * 3);
	var normals = new Float32Array(TerrainConsts.TILE_COUNT * 3);
	var uvs = new Float32Array(TerrainConsts.TILE_COUNT * 2);

	var startX = start[0];
	var endX = startX + TerrainConsts.TILE_COLUMN_COUNT;
	var startY = start[1];
	var endY = startY + TerrainConsts.TILE_ROW_COUNT;

	var vi = 0;
	var ni = 0;
	var ti = 0;
	for(var y=startY; y<endY; y++) {
		var yy = sglClamp(y, 0, h - 1);
		for(var x=startX; x<endX; x++) {
			var xx = sglClamp(x, 0, w - 1);

			var index = yy * w + xx;

			var newHeight = heightmapVertices[index].vertex[1];
			if(newHeight < minHeight)
				minHeight = newHeight;
			if(newHeight > maxHeight)
				maxHeight = newHeight;

			var v = heightmapVertices[index].vertex;
			vertices[vi    ] = v[0];
			vertices[vi + 1] = v[1];
			vertices[vi + 2] = v[2];
			vi += 3;

			var n = heightmapVertices[index].normal;
			normals[ni    ] = n[0];
			normals[ni + 1] = n[1];
			normals[ni + 2] = n[2];
			ni += 3;

			var t = heightmapVertices[index].uv;
			uvs[ti    ] = t[0];
			uvs[ti + 1] = t[1];
			ti += 2;
		}
	}

	if(!TerrainCell.indices)
		TerrainCell.computeIndices();

	this.mesh = new SglMeshGL(this.gl);
	this.mesh.addVertexAttribute('position', 3, vertices);
	this.mesh.addVertexAttribute('normal', 3, normals);
	this.mesh.addVertexAttribute('texCoord0', 2, uvs);
	this.mesh.addIndexedPrimitives('triangles', this.gl.TRIANGLES, TerrainCell.indices);
	this.triangleCount = vertices.length / 3;
	
	this.verticalBounds = [minHeight, maxHeight];
};

TerrainCell.prototype.getVerticalBounds = function() {
	return this.verticalBounds;
};

TerrainCell.prototype.render = function(renderer) {
	renderer.renderMeshPrimitives(this.mesh, 'triangles');
	return this.triangleCount;
};

/**
	@private
*/
TerrainCell.computeIndices = function() {
	TerrainCell.indices = new Uint16Array((TerrainConsts.TILE_ROW_COUNT - 1) * (TerrainConsts.TILE_COLUMN_COUNT - 1) * 6);

	var endX = TerrainConsts.TILE_COLUMN_COUNT - 1;
	var endY = TerrainConsts.TILE_ROW_COUNT - 1;
	var index = 0;
	for(var y=0; y<endY; y++) {
		for(var x=0; x<endX; x++) {
			TerrainCell.indices[index++] = (y    ) * TerrainConsts.TILE_COLUMN_COUNT + x;
			TerrainCell.indices[index++] = (y + 1) * TerrainConsts.TILE_COLUMN_COUNT + x;
			TerrainCell.indices[index++] = (y    ) * TerrainConsts.TILE_COLUMN_COUNT + x + 1;

			TerrainCell.indices[index++] = (y + 1) * TerrainConsts.TILE_COLUMN_COUNT + x;
			TerrainCell.indices[index++] = (y + 1) * TerrainConsts.TILE_COLUMN_COUNT + x + 1;
			TerrainCell.indices[index++] = (y    ) * TerrainConsts.TILE_COLUMN_COUNT + x + 1;
		}
	}
};

TerrainCell.indices = null;
