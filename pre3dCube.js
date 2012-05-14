
// https://github.com/deanm/pre3d

/*
TODO:
 - border 	: ajouter une bordure noire autour de chaque piece
 - arrondit : arrondir les coins du cube
 - anim 	: afficher/gerer la liste des mouvements + play/lecture/prev/next
 - colors	: rendre plus clair les couleurs. gerer les ombres/lumieres
 - mouse 	: gerer des mouvements de pieces avec la souris
 - pop 		: fonction pour poper le cube + unpop/reassemble
*/

(function () {
	
	/* == RubikCube == */
	var RubikCube = function (dom_obj_name, nb_pieces_width, piece_width) {
		var pieces 				= [];
		var animations_queue	= [];
		var mouvements_done		= [];
		var animations_running 	= false;
		var display_axes		= false;
		
		var cube_config = {
			nb_pieces_width	: nb_pieces_width || 3,
			piece_width		: piece_width || .4,
			colors			: [
				new Pre3d.RGBA(1, 0, 0, 1),			// red
				new Pre3d.RGBA(0, 0, 1, 1),			// blue
				new Pre3d.RGBA(1, .5, 0, 1),		// orange
				new Pre3d.RGBA(0, 1, 0, 1), 		// green
				new Pre3d.RGBA(1, 1, 0, 1),			// yellow
				new Pre3d.RGBA(1, 1, 1, 1),			// black.white
			],
		};
		
		var dom_obj = document.getElementById(dom_obj_name);
		if (dom_obj.tagName == 'CANVAS') {
			var screen_canvas = dom_obj;
		}else{
			var canvas = document.createElement('canvas');
			canvas.setAttribute('height', '150');
			canvas.setAttribute('width', '150');
			dom_obj.appendChild(canvas);
			dom_obj.style.textAlign = 'center';
			var screen_canvas = canvas;
		}
		var renderer = new Pre3d.Renderer(screen_canvas);
		
		
		var resetCube = function () {
			pieces 				= [];
			animations_queue	= [];
			mouvements_done		= [];
			animations_running 	= false;
		
			buildCube();
			renderCubeDemoCamera();
			renderCube();
		};
		
		
		var buildCube = function () {
			// creer et attache les 26 pieces au cube
			
			for (var x=0; x<cube_config.nb_pieces_width; x++) {
				var position_x = x - (cube_config.nb_pieces_width/2);
				
				for (var y=0; y<cube_config.nb_pieces_width; y++) {
					var position_y = y - (cube_config.nb_pieces_width/2);
					
					for (var z=0; z<cube_config.nb_pieces_width; z++) {
						var position_z = z - (cube_config.nb_pieces_width/2);
						if (z > 0 && y > 0 && x > 0 && z < cube_config.nb_pieces_width-1 && y < cube_config.nb_pieces_width-1 && x < cube_config.nb_pieces_width-1) continue;
						//console.log("tr", position_x, position_y, position_z);
						
						
						var piece = new RubikPiece(x, y, z, cube_config);
						piece.setFacesColors();
						piece.build();
						piece.translate(position_x, position_y, position_z);
						pieces.push(piece);
					}
					
				}
			}
			
			renderer.camera.focal_length = 1/cube_config.nb_pieces_width * 17;
			//renderer.fill_rgba = new Pre3d.RGBA(.5, .5, .5, 1);
			
		};
		
		
		var renderCube = function () {

			// (re)draw the pieces
			var piece, piece_infos;
			
			renderer.quad_callback = function (quad_face, quad_index, shape) {
				return piece.setFaceColorCallback(renderer, quad_face, quad_index, shape);
			}
			
			var nb_pieces = pieces.length;
			for (var i = 0; i < nb_pieces; i++) {
				piece			= pieces[i];
				piece_geometry 	= piece.geometry();
				
				renderer.fill_rgba = piece_geometry.color;
				renderer.transform = piece_geometry.trans;
				renderer.bufferShape(piece_geometry.shape);
			}
			
			
			// (re)draw the background
			if (true) {
				renderer.ctx.setFillColor(1, 1, 1, 1);
			}else{
				renderer.ctx.setFillColor(0, 0, 0, 1);
			}
			renderer.drawBackground();

			
			// draw axes
			if (display_axes) {
				var axes =  [
					{ //axis
						shape: Pre3d.ShapeUtils.makeBox(10, 0.01, 0.01),
						color: new Pre3d.RGBA(1, 1, 1, 0.5),
						trans: new Pre3d.Transform()
					},
					{//axis
						shape: Pre3d.ShapeUtils.makeBox(0.01, 10, 0.01),
						color: new Pre3d.RGBA(1, 1, 1, 0.5),
						trans: new Pre3d.Transform()
					},
					{//axis
						shape: Pre3d.ShapeUtils.makeBox(0.01, 0.01, 10),
						color: new Pre3d.RGBA(1, 1, 1, 0.5),
						trans: new Pre3d.Transform()
					}
				];
				renderer.quad_callback = null;
				for (var i = 0; i < axes.length; ++i) {
					var axe = axes[i];
					renderer.fill_rgba = axe.color;
					renderer.transform = axe.trans;
					renderer.bufferShape(axe.shape);
				}
			}
			
			// draw pieces
			renderer.drawBuffer();
			renderer.emptyBuffer();
			
		}
		
		
		var renderCubeDemoCamera = function () {
			DemoUtils.autoCamera(renderer, 0, 0, -40, 0.50, -0.7, 0, renderCube);
		};
		
		
		
		var layers_piece_callback = {
			up		: function (piece, nb_layer, offset) {return (piece.position.y >= cube_config.nb_pieces_width-nb_layer-offset && piece.position.y < cube_config.nb_pieces_width-offset);},
			down	: function (piece, nb_layer, offset) {return (piece.position.y < nb_layer + offset && piece.position.y >= offset);},
			left	: function (piece, nb_layer, offset) {return (piece.position.x < nb_layer + offset && piece.position.x >= offset);},
			right	: function (piece, nb_layer, offset) {return (piece.position.x >= cube_config.nb_pieces_width-nb_layer-offset && piece.position.x < cube_config.nb_pieces_width-offset);},
			front	: function (piece, nb_layer, offset) {return (piece.position.z >= cube_config.nb_pieces_width-nb_layer-offset && piece.position.z < cube_config.nb_pieces_width-offset);},
			back	: function (piece, nb_layer, offset) {return (piece.position.z < nb_layer + offset && piece.position.z >= offset);},
		};
		
		
		var getLayerPieces = function (layer_name, nb_layer, offset) {
			nb_layer = nb_layer || 1;
			offset = offset || 0;
			
			var return_pieces = [];
			var layer_callback = layers_piece_callback[layer_name];
			if (layer_callback) {
				for (var i=0, l=pieces.length; i<l; i++) {
					if (layer_callback(pieces[i], nb_layer, offset)) return_pieces.push(pieces[i]);
				}
			}else{
				// unlnown layer
			}
			return return_pieces;
		}
		
		
		
		/* ######### ROTATIONS ######### */

		var rotations = {
			"L":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('left', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: old_position.x, y: cube_config.nb_pieces_width-1 - old_position.z, z: old_position.y }; },
				updateRender	: function (move_pieces, anim_duration, nb_move)	{ rotatePieceAnim(move_pieces, anim_duration, nb_move*Math.PI/2, 0, 0); },
			},
			"L'":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('left', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: old_position.x, y: old_position.z, z: cube_config.nb_pieces_width-1 - old_position.y }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, nb_move*-Math.PI/2, 0, 0); },
			},
			"R":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('right', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: old_position.x, y: old_position.z, z: cube_config.nb_pieces_width-1 - old_position.y }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, nb_move*-Math.PI/2, 0, 0); },
			},
			"R'":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('right', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: old_position.x, y: cube_config.nb_pieces_width-1 - old_position.z, z: old_position.y }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, nb_move*Math.PI/2, 0, 0); },
			},
			
			"U":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('up', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: cube_config.nb_pieces_width-1 - old_position.z, y: old_position.y, z: old_position.x }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, nb_move*-Math.PI/2, 0); },
			},
			"U'":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('up', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: old_position.z, y: old_position.y, z: cube_config.nb_pieces_width-1 - old_position.x }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, nb_move*Math.PI/2, 0); },
			},
			"D":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('down', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: old_position.z, y: old_position.y, z: cube_config.nb_pieces_width-1 - old_position.x }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, nb_move*Math.PI/2, 0); },
			},
			"D'":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('down', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: cube_config.nb_pieces_width-1 - old_position.z, y: old_position.y, z: old_position.x }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, nb_move*-Math.PI/2, 0); },
			},
			
			"F":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('front', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: old_position.y, y: cube_config.nb_pieces_width-1 - old_position.x, z: old_position.z }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, 0, nb_move*-Math.PI/2); },
			},
			"F'":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('front', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: cube_config.nb_pieces_width-1 - old_position.y, y: old_position.x, z: old_position.z }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, 0, nb_move*Math.PI/2); },
			},
			"B":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('back', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: cube_config.nb_pieces_width-1 - old_position.y, y: old_position.x, z: old_position.z }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, 0, nb_move*Math.PI/2); },
			},
			"B'":  {
				getPieces		: function (nb_layer, offset) 	{ return getLayerPieces('back', nb_layer, offset); },
				updateMatrix	: function (old_position) 		{ return { x: old_position.y, y: cube_config.nb_pieces_width-1 - old_position.x, z: old_position.z }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, 0, nb_move*-Math.PI/2); },
			},
			
			"x":  {
				getPieces		: function () 					{ return pieces; },
				updateMatrix	: function (old_position) 		{ return { x: old_position.x, y: old_position.z, z: cube_config.nb_pieces_width-1 - old_position.y }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, nb_move*-Math.PI/2, 0, 0); },
			},
			"x'":  {
				getPieces		: function () 					{ return pieces; },
				updateMatrix	: function (old_position) 		{ return { x: old_position.x, y: cube_config.nb_pieces_width-1 - old_position.z, z: old_position.y }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, nb_move*Math.PI/2, 0, 0); },
			},
			"y":  {
				getPieces		: function () 					{ return pieces; },
				updateMatrix	: function (old_position) 		{ return { x: cube_config.nb_pieces_width-1 - old_position.z, y: old_position.y, z: old_position.x }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, nb_move*-Math.PI/2, 0); },
			},
			"y'":  {
				getPieces		: function () 					{ return pieces; },
				updateMatrix	: function (old_position) 		{ return { x: old_position.z, y: old_position.y, z: cube_config.nb_pieces_width-1 - old_position.x }; },
				updateRender	: function (move_pieces, anim_duration, nb_move) 	{ rotatePieceAnim(move_pieces, anim_duration, 0, nb_move*Math.PI/2, 0); },
			},
			"z":  {
				getPieces		: function () 					{ return pieces; },
				updateMatrix	: function (old_position) 		{ return { x: old_position.y, y: cube_config.nb_pieces_width-1 - old_position.x, z: old_position.z }; },
				updateRender	: function (move_pieces, anim_duration, nb_move)	{ rotatePieceAnim(move_pieces, anim_duration, 0, 0, nb_move*-Math.PI/2); },
			},
			"z'":  {
				getPieces		: function () 					{ return pieces; },
				updateMatrix	: function (old_position) 		{ return { x: cube_config.nb_pieces_width-1 - old_position.y, y: old_position.x, z: old_position.z }; },
				updateRender	: function (move_pieces, anim_duration, nb_move)	{ rotatePieceAnim(move_pieces, anim_duration, 0, 0, nb_move*Math.PI/2); },
			},
			
		};
		
		
		var rotatePiece = function (piece, rotate_x, rotate_y, rotate_z) {
			var piece_info = piece.geometry();
			
			renderer.transform = piece_info.trans;
			//renderer.transform.reset();
			if (rotate_x !== undefined && rotate_x != 0) renderer.transform.rotateX(rotate_x);
			if (rotate_y !== undefined && rotate_y != 0) renderer.transform.rotateY(rotate_y);
			if (rotate_z !== undefined && rotate_z != 0) renderer.transform.rotateZ(rotate_z);
			renderer.bufferShape(piece_info.shape);
		};
		
	
		var rotatePieceAnim = function (move_pieces, duration, rotate_x, rotate_y, rotate_z) {
			var nb_pieces			= move_pieces.length;
			var nb_frames_per_sec 	= 20;
			var nb_frames 			= nb_frames_per_sec * duration / 1000;
			var index_frames 		= 0;
			var rotate_x_tmp = (rotate_x / nb_frames);
			var rotate_y_tmp = (rotate_y / nb_frames);
			var rotate_z_tmp = (rotate_z / nb_frames);
			
			
			function animLoop() {
				for (var i=0; i<nb_pieces; i++) {
					rotatePiece(move_pieces[i], rotate_x_tmp, rotate_y_tmp, rotate_z_tmp);
				}
				renderCube();
				renderCube();
				if (index_frames < nb_frames-1) {
					// continue...
					index_frames++;
					setTimeout(animLoop, duration/nb_frames);
				}else{
					// finish
					
					// run others/next animations
					animations_running = false;
					runAnimations();
				}
			}
			
			animLoop();
		};
		
		var runAnimations = function () {
			if (animations_running) return;
			var anim;
			if (anim = animations_queue.shift()) {
				animations_running = true;
				anim();
			}
		};
		
		
		var doCubeMouvements = function (mouvements) {
			if (typeof(mouvements) == "string") {
				mouvements = mouvements.split(" ");
			}
			for (var i=0, l=mouvements.length; i<l; i++) {
				doCubeMouvement(mouvements[i]);
			}
		}
		
		var doCubeMouvement = function (move_name, nb_layer, offset) {
			var move_pieces = [];
			var anim_duration = 300;
			
			var nb_move = 1;
			if (move_name.substr(-1) == 2) {
				nb_move = 2;
				move_name = move_name.substr(0, move_name.length-1);
			}
			if (move_name.substr(0, 1) == "M") {
				move_name = move_name.substr(1);
				offset = 1;
			}
			if (move_name.substr(0, 1) == "N") {
				move_name = move_name.substr(1);
				offset = 1;
			}
			if (move_name.substr(0, 1) == "T") {
				move_name = move_name.substr(1);
				nb_layer = 2;
			}
			
			
			var mouvement = rotations[move_name];
			if (mouvement) {
				animations_queue.push(function () { mouvement.updateRender(move_pieces, anim_duration, nb_move) });
				
				var move_pieces = mouvement.getPieces(nb_layer, offset);
				
				for (var i=0, l=move_pieces.length; i<l; i++) {
					var piece = move_pieces[i];
					var new_position = piece.position;
					for (var j=0; j<nb_move; j++) {
						new_position = mouvement.updateMatrix(new_position);
					}
					piece.position = new_position;
				}
				
				runAnimations();
				mouvements_done.push([mouvement, nb_move, nb_layer, offset]);
				
			}else{
				// unknown mouvement
			}
			
		};
		
		
		function scrambleCube(auto_reverse) {
			
			var available_mouvements = ["U", "D", "L", "R", "F", "B", "B'", "F'", "R'", "L'", "D'", "U'"];
			//var available_mouvements = ["U", "R", "F", "D", "B", "B'", "D'", "F'", "R'", "U'"]; // OK
			//var available_mouvements = ["R", "D", "D'", "L"];
			var nb_avail_move = available_mouvements.length;
			var nb_move = 30;
			var last_index_avail_move = -1;
			var moves = [];
			
			for (var i=0; i<nb_move; i++) {
				var nb_layer = Math.floor((Math.random()*(cube_config.nb_pieces_width-1)+1));
				var offset = Math.floor((Math.random()*(cube_config.nb_pieces_width-nb_layer)));
				
				var index_avail_move = Math.floor((Math.random()*(nb_avail_move)));
				//var tmp_moves = available_mouvements.splice(XXXX);
				doCubeMouvement(available_mouvements[index_avail_move], nb_layer, offset);
				moves.push([index_avail_move, nb_layer, offset]);
				last_index_avail_move = index_avail_move;
			}
			if (auto_reverse) {
				for (var i=nb_move-1; i>=0; i--) {
					var index_avail_move = nb_avail_move-1 - moves[i][0];
					
					doCubeMouvement(available_mouvements[index_avail_move], moves[i][1], moves[i][2]);
					last_index_avail_move = index_avail_move;
				}
			}
			
		}
		
		
		/* ######### TESTS ######### */
		
		function test1() {
			doCubeMouvements("R L' U D' F' B R L'");
		}
		
		function test2() {
			doCubeMouvements("R2 L'2 U2 D'2 F2 B'2");
		}
		
		function test3() {
			var moves = prompt('moves to do ?', "MR'2 ML2 MU2 MD'2 MF2 MB'2");
			if (moves) {
				doCubeMouvements(moves);
			}
		}
		function test4() {
			doCubeMouvements("TU TB2 TL TD · TF TB' · TL' · TU' TD · TR TL' · TF' TD2 TR' ");
		}
		
		
		
		// init
		resetCube();
		
		// RubikCube return
		return {
			move		: doCubeMouvement,
			scramble	: scrambleCube,
			reset		: resetCube,
			test1		: test1,
			test2		: test2,
			test3		: test3,
			test4		: test4,
		};
	}
	
	
	
	/* == RubikPiece == */
	var RubikPiece = function (x, y, z, cube_config) {
		var _piece 	= this;
		var shape 	= null;
		var color 	= null;
		var trans 	= null;
	
		var colors 				= cube_config.colors;
		var position 			= {x:x, y:y, z:z};
		var size_factor 		= 2.5;
		var piece_width_full 	= cube_config.piece_width + .1;
		var faces_colors 		= [];
		var default_color 		= new Pre3d.RGBA(.1, .1, .1, 1);
		
		var buildPiece = function (x, y, z) {
			shape = Pre3d.ShapeUtils.makeCube(cube_config.piece_width * size_factor);
			//Pre3d.ShapeUtils.averageSmooth(shape, .5);
			
		}
		
		var translatePiece = function (translate_x, translate_y, translate_z) {
			if (trans === null) {
				trans = new Pre3d.Transform();
			}
			trans.translate((translate_x+piece_width_full/1) * size_factor, (translate_y+piece_width_full/1) * size_factor, (translate_z+piece_width_full/1) * size_factor);
		}
		
		/*
		var setPieceColor = function (r, g, b, t) {
			color = new Pre3d.RGBA(r, g, b, t);
		}
		*/
		
		var setFacesColors = function () {
			faces_colors = [];
			for (var quad_index=0; quad_index<6; quad_index++) {
				var color = colors[quad_index];
				
				if (quad_index == 0 && position.x < cube_config.nb_pieces_width - 1) color = default_color;
				if (quad_index == 1 && position.z < cube_config.nb_pieces_width - 1) color = default_color;
				if (quad_index == 2 && position.x > 0) color = default_color;
				if (quad_index == 3 && position.z > 0) color = default_color;
				if (quad_index == 4 && position.y < cube_config.nb_pieces_width - 1) color = default_color;
				if (quad_index == 5 && position.y > 0) color = default_color;
				
				faces_colors[quad_index] = color;
			}
		};
		
		var setFaceColorCallback = function (renderer, quad_face, quad_index, shape) {
			renderer.fill_rgba = faces_colors[quad_index];
			return false;
		};
		
		// RubikPiece return
		return {
			position			: position,
			faces_colors 		: faces_colors,
			build				: buildPiece,
			translate			: translatePiece,
			setFaceColorCallback: setFaceColorCallback,
			setFacesColors 		: setFacesColors,
			geometry			: function () { return {shape:shape, color:color, trans:trans} },
		};
	}
	
	if (window.RubikCube === undefined) window.RubikCube = RubikCube;
	
})();