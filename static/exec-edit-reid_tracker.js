import utils from './utils.js';

export default {
	data: function() {
		return {
			node: null,
			velocitySteps: 5,
			minIOU: 0.1,
			maxAge: 10,
			weight: 1.0,

			addCategoryInput: '',
		};
	},
	created: function() {
		const nodeID = this.$route.params.nodeid;
		utils.request(this, 'GET', '/exec-nodes/'+nodeID, null, (node) => {
			this.node = node;
			try {
				let s = JSON.parse(this.node.Params);
				this.velocitySteps = s.Simple.VelocitySteps;
				this.minIOU = s.Simple.MinIOU;
				this.maxAge = s.Simple.MaxAge;
				this.weight = s.Weight;
			} catch(e) {}
		});
	},
	methods: {
		save: function() {
			let params = JSON.stringify({
				Simple: {
					VelocitySteps: parseInt(this.velocitySteps),
					MinIOU: parseFloat(this.minIOU),
					MaxAge: parseInt(this.maxAge),
				},
				Weight: parseFloat(this.weight),
			});
			utils.request(this, 'POST', '/exec-nodes/'+this.node.ID, JSON.stringify({
				Params: params,
			}));
		},
	},
	template: `
<div class="small-container m-2">
	<template v-if="node != null">
		<div class="form-group row">
			<label class="col-sm-2 col-form-label">Velocity Steps</label>
			<div class="col-sm-10">
				<input v-model="velocitySteps" type="text" class="form-control">
			</div>
		</div>
		<div class="form-group row">
			<label class="col-sm-2 col-form-label">Minimum IOU</label>
			<div class="col-sm-10">
				<input v-model="minIOU" type="text" class="form-control">
			</div>
		</div>
		<div class="form-group row">
			<label class="col-sm-2 col-form-label">Maximum Age</label>
			<div class="col-sm-10">
				<input v-model="maxAge" type="text" class="form-control">
			</div>
		</div>
		<div class="form-group row">
			<label class="col-sm-2 col-form-label">Re-identification weight</label>
			<div class="col-sm-10">
				<input v-model="weight" type="text" class="form-control">
			</div>
		</div>
		<button v-on:click="save" type="button" class="btn btn-primary">Save</button>
	</template>
</div>
	`,
};
