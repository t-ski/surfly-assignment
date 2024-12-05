<script setup>
import { ref } from 'vue';

// TODO: Allow draw settings
// Include settings in messages to replicate styles
const drawingSetting = {
	stroke: 20
};
// Local drawing data
const drawing = [];

const canvas = ref();
const isDrawing = ref(false);
const users = ref([]);


// Replicate drawings on sync message
WS_CLIENT.onMessage((data) => {
	if(data.command !== "sync") return;
	
	try {
		replicateDrawings(data.payload);
	} catch {}
});


// Draw locally, push updated data
// TODO: Improve: only push delta
function draw(e) {
	if(!isDrawing.value) return;

	drawing.push([
		e.clientX, e.clientY - canvas.value.getBoundingClientRect().top
	]);

	WS_CLIENT.push("sync", drawing);
};

// Draw all drawings upon data has changed
function replicateDrawings(drawings = []) {
	const canvasEl = canvas.value;
	const size = canvasEl.getBoundingClientRect();
	canvasEl.width = size.width;
	canvasEl.height = size.height;

	const context = canvasEl.getContext("2d");
	context.clearRect(0, 0, canvasEl.width, canvasEl.height);

	drawings
	.reverse()
	.forEach((drawing) => {
		// TODO: Draw line between points to have actual stroke
		context.fillStyle = drawing.color;
		drawing
			.points
			.forEach((p, i) => {
				context.beginPath();
				context.arc(p[0], p[1], drawingSetting.stroke, 0, 2 * Math.PI);
				context.fill();
			});
	});

	// Filter data to show user compoennts in navigation
	users.value = drawings
		.map((drawing) => {
			return {
				name: drawing.color
			};
		});
}

// TODO: Improve: Sync viewports (?)
</script>


<template>
	<!-- eslint-disable vue/no-multiple-template-root -->
	<header class="section header">
		<div class="wrapper wrapper--s flex_across">
			<a class="flex_horizontal--s" href="/">
				<img src="/logo.svg" height="28">
				<strong>Collaborative Drawing</strong>
			</a>
			<div class="flex_horizontal--s">
				<div class="user padding--xs" v-for="user in users">
					<span>{{ user.name }}</span>
				</div>
			</div>
		</div>
	</header>
	<main>
		<canvas id="draw" ref="canvas" @mousedown="isDrawing = true" @mouseup="isDrawing = false" @mousemove="draw"></canvas>
	</main>
</template>


<style scoped sass>
#draw {
	width: 100%;
	height: 100%;
}

.user {
	background-color: var(--color-bg-light);
	border-radius: 0.3rem;
}
</style>