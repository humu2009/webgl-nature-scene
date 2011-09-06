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


GrassCell = function(gl) {
	this.gl = gl;
	this.blockCount = 0;
	this.indexCount = 0;
	this.mesh = null;
	this.triangleCount = 0;
	this.verticalBounds = [10000, -10000];
};

GrassCell.prototype.setup = function(heightmap, offset, random, coverage) {
	var w = heightmap.getMapWidth();
	var h = heightmap.getMapHeight();
	var heightmapVertices = heightmap.getVertexStream();

	var randomData = getImageData(random);
	var coverageData = getImageData(coverage);
	if(!randomData || !coverageData)
		return;

	var endX = TerrainConsts.TILE_COLUMN_COUNT - 1;
	var endY = TerrainConsts.TILE_ROW_COUNT - 1;

	this.blockCount = 0;
	for(var y=0; y<endY; y++) {
		for(var x=0; x<endX; x++) {
			var index = (y + offset[1]) * w + (x + offset[0]);
			var height = heightmapVertices[index].vertex[1];
			if(height > TerrainConsts.GRASS_LOWER_THRESHOLD && height < TerrainConsts.GRASS_UPPER_THRESHOLD)
				this.blockCount++;
		}
	}

	if(this.blockCount == 0)
		return;

	var minHeight = 10000;
	var maxHeight = -10000;

	this.indexCount = this.blockCount * 18;
	var indices = new Uint16Array(this.indexCount);
	var vertices = new Float32Array(this.blockCount * 12 * 3);
	var normals = new Float32Array(this.blockCount * 12 * 3);
	var binormals = new Float32Array(this.blockCount * 12 * 3);
	var tangents = new Float32Array(this.blockCount * 12 * 3);
	var offsets = new Float32Array(this.blockCount * 12 * 3);
	var uvJitters = new Float32Array(this.blockCount * 12 * 3);

	var rnd = [0, 0, 0, 0];
	var vertexOffset = [0, 0, 0];
	var texCoord = [0, 0, 0, 0];

	var yRotation60 = sglRotationAngleAxisM4V(sglDegToRad(60), [0, 1, 0]);

	var indexOffset = 0;
	var ii = 0;
	var vi = 0;
	var ti = 0;
	var ni = 0;
	var bi = 0;
	var tti = 0;
	var oi = 0;
	var vertex = [0, 0, 0];
	for(var y=0; y<endY; y++) {
		for(var x=0; x<endX; x++) {
			var index = (y + offset[1]) * w + (x + offset[0]);

			var ri = index * 4;
			assignV4( rnd,	randomData[ri    ] / 255, 
							randomData[ri + 1] / 255, 
							randomData[ri + 2] / 255, 
							randomData[ri + 3] / 255 );

			copyV3(vertexOffset, heightmapVertices[index].vertex);
			if(vertexOffset[1] > TerrainConsts.GRASS_LOWER_THRESHOLD && vertexOffset[1] < TerrainConsts.GRASS_UPPER_THRESHOLD) {
				assignV4(texCoord, 0, 0, 0.25, 1);
				vertexOffset[0] += (rnd[0] - 0.5) * TerrainConsts.TERRAIN_WIDTH_SCALE;
				vertexOffset[2] += (rnd[1] - 0.5) * TerrainConsts.TERRAIN_DEPTH_SCALE;

				var randHeight = TerrainConsts.GRASS_HEIGHT + rnd[2] * TerrainConsts.GRASS_HEIGHT_OFFSET;
				rnd[3] = coverageData[index * 4] / 255;
				var jitter = sglClamp(rnd[3], 0.2, 1);

				vertexOffset[1] = heightmap.getHeight(vertexOffset) - 2;

				if(vertexOffset[1] < minHeight)
					minHeight = vertexOffset[1];
				if(vertexOffset[1] + randHeight > maxHeight)
					maxHeight = vertexOffset[1] + randHeight;

				if(rnd[3] > 0.25 && rnd[3] <= 0.5) {
					texCoord[0] += 0.25;
					texCoord[2] += 0.25;
				}
				else if(rnd[3] > 0.5 && rnd[3] <= 0.75) {
					texCoord[0] += 0.5;
					texCoord[2] += 0.5;
				}
				else if(rnd[3] > 0.75) {
					texCoord[0] += 0.75;
					texCoord[2] += 0.75;
				}

				var randYRotation = sglRotationAngleAxisM4V(sglDegToRad(rnd[3] * 360), [0, 1, 0]);

				assignV3(vertex, -TerrainConsts.GRASS_WIDTH, 0, 0);
				vertex = sglMulM4V3(randYRotation, vertex, 1);
				vertices[vi++] = vertex[0];
				vertices[vi++] = vertex[1];
				vertices[vi++] = vertex[2];

				assignV3(vertex, TerrainConsts.GRASS_WIDTH, 0, 0);
				vertex = sglMulM4V3(randYRotation, vertex, 1);
				vertices[vi++] = vertex[0];
				vertices[vi++] = vertex[1];
				vertices[vi++] = vertex[2];

				assignV3(vertex, TerrainConsts.GRASS_WIDTH, randHeight, 0);
				vertex = sglMulM4V3(randYRotation, vertex, 1);
				vertices[vi++] = vertex[0];
				vertices[vi++] = vertex[1];
				vertices[vi++] = vertex[2];

				assignV3(vertex, -TerrainConsts.GRASS_WIDTH, randHeight, 0);
				vertex = sglMulM4V3(randYRotation, vertex, 1);
				vertices[vi++] = vertex[0];
				vertices[vi++] = vertex[1];
				vertices[vi++] = vertex[2];

				uvJitters[ti++] = texCoord[0];
				uvJitters[ti++] = texCoord[1];
				uvJitters[ti++] = jitter;
				uvJitters[ti++] = texCoord[2];
				uvJitters[ti++] = texCoord[1];
				uvJitters[ti++] = jitter;
				uvJitters[ti++] = texCoord[2];
				uvJitters[ti++] = texCoord[3];
				uvJitters[ti++] = jitter;
				uvJitters[ti++] = texCoord[0];
				uvJitters[ti++] = texCoord[3];
				uvJitters[ti++] = jitter;

				for(var i=4; i<12; i++) {
					var k = vi - 12;
					assignV3(vertex, vertices[k], vertices[k + 1], vertices[k + 2]);
					vertex = sglMulM4V3(yRotation60, vertex, 1);
					vertices[vi++] = vertex[0];
					vertices[vi++] = vertex[1];
					vertices[vi++] = vertex[2];

					var l = ti - 12;
					uvJitters[ti++] = uvJitters[l    ];
					uvJitters[ti++] = uvJitters[l + 1];
					uvJitters[ti++] = uvJitters[l + 2];
				}

				for(var i=0; i<12; i++) {
					var v = heightmapVertices[index];

					var n = v.normal;
					normals[ni++] = n[0];
					normals[ni++] = n[1];
					normals[ni++] = n[2];

					var b = v.binormal;
					binormals[bi++] = b[0];
					binormals[bi++] = b[1];
					binormals[bi++] = b[2];

					var tt = v.tangent;
					tangents[tti++] = tt[0];
					tangents[tti++] = tt[1];
					tangents[tti++] = tt[2];

					offsets[oi++] = vertexOffset[0];
					offsets[oi++] = vertexOffset[1];
					offsets[oi++] = vertexOffset[2];
				}

				indices[ii++] = indexOffset;
				indices[ii++] = indexOffset + 1;
				indices[ii++] = indexOffset + 3;
				indices[ii++] = indexOffset + 1;
				indices[ii++] = indexOffset + 2;
				indices[ii++] = indexOffset + 3;

				indices[ii++] = indexOffset + 4;
				indices[ii++] = indexOffset + 5;
				indices[ii++] = indexOffset + 7;
				indices[ii++] = indexOffset + 5;
				indices[ii++] = indexOffset + 6;
				indices[ii++] = indexOffset + 7;

				indices[ii++] = indexOffset + 8;
				indices[ii++] = indexOffset + 9;
				indices[ii++] = indexOffset + 11;
				indices[ii++] = indexOffset + 9;
				indices[ii++] = indexOffset + 10;
				indices[ii++] = indexOffset + 11;

				indexOffset += 12;
			}
		}
	}

	this.mesh = new SglMeshGL(this.gl);
	this.mesh.addVertexAttribute('position', 3, vertices);
	this.mesh.addVertexAttribute('normal', 3, normals);
	this.mesh.addVertexAttribute('binormal', 3, binormals);
	this.mesh.addVertexAttribute('tangent', 3, tangents);
	this.mesh.addVertexAttribute('uvJitter', 3, uvJitters);
	this.mesh.addVertexAttribute('offset', 3, offsets);
	this.mesh.addIndexedPrimitives('triangles', this.gl.TRIANGLES, indices);
	this.triangleCount = indices.length / 3;

	this.verticalBounds = [minHeight, maxHeight];
};

GrassCell.prototype.getVerticalBounds = function() {
	return this.verticalBounds;
};

GrassCell.prototype.render = function(renderer) {
	if(this.blockCount > 0) {
		renderer.renderMeshPrimitives(this.mesh, 'triangles');
	}

	return this.triangleCount;
};

GrassCell.prototype.getBlockCount = function() {
	return this.blockCount;
};
